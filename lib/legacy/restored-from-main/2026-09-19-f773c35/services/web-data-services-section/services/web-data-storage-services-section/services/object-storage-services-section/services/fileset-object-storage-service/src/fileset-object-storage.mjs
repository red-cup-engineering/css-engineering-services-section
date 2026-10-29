import { createHash, randomUUID } from "node:crypto";

const PAYLOAD_PROFILE = "org.red-cup-engineering.intact-payload.v1";
const COMMIT_PROFILE = "org.red-cup-engineering.object-key-commit.v2";
const HEAD_PROFILE = "org.red-cup-engineering.object-key-head.v2";
const UPLOAD_PROFILE = "org.red-cup-engineering.multipart-upload.v2";
const DEFAULT_CHUNK_BYTES = 8 * 1024 * 1024;

export class ObjectStorageError extends Error {
  constructor(code, message) { super(message); this.name = "ObjectStorageError"; this.code = code; }
}

function requiredCustody(value) {
  for (const operation of ["putImmutable", "get", "head", "putCurrent", "deleteCurrent", "list",
    "stage", "getStaged", "promoteStaged", "deleteStaged"]) {
    if (typeof value?.[operation] !== "function") throw new TypeError(`custody.${operation} is required`);
  }
  return value;
}

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) throw new RangeError(`${label} must be one positive safe integer`);
  return value;
}

function bucketName(value) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/u.test(value))
    throw new ObjectStorageError("InvalidBucketName", "bucket must be one lowercase DNS-style name");
  return value;
}

function objectKey(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0") || Buffer.byteLength(value) > 1024)
    throw new ObjectStorageError("InvalidObjectKey", "object key must contain 1 through 1024 UTF-8 bytes");
  return value;
}

function objectMetadata(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("object metadata must be a record");
  const output = {}; let bytes = 0;
  for (const [offeredName, offeredValue] of Object.entries(value)) {
    const name = offeredName.toLowerCase(), text = String(offeredValue);
    if (!/^[a-z0-9][a-z0-9_.-]{0,127}$/u.test(name) || text.includes("\r") || text.includes("\n"))
      throw new ObjectStorageError("InvalidRequest", "object metadata name or value is invalid");
    bytes += Buffer.byteLength(name) + Buffer.byteLength(text);
    if (bytes > 8192) throw new ObjectStorageError("InvalidRequest", "object metadata exceeds 8 KiB");
    output[name] = text;
  }
  return Object.freeze(Object.fromEntries(Object.entries(output).sort(([a], [b]) => a.localeCompare(b))));
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

const jsonBytes = (value) => Buffer.from(stable(value));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const quoted = (value) => `"${value}"`;
const unquote = (value) => typeof value === "string" ? value.replace(/^"|"$/gu, "") : value;
const segment = (value) => Buffer.from(value).toString("base64url");
const headKey = (bucket, key) => `heads/${segment(bucket)}/${sha256(Buffer.from(key))}.json`;
const uploadKey = (bucket, uploadId) => `uploads/${segment(bucket)}/${uploadId}.json`;
const payloadKey = (digest) => `payloads/sha256/${digest.slice(0, 2)}/${digest}`;
const commitKey = (digest) => `commits/sha256/${digest.slice(0, 2)}/${digest}.json`;

async function* sourceBytes(source) {
  if (typeof source === "string" || source instanceof Uint8Array) { yield Buffer.from(source); return; }
  if (source?.getReader) {
    const reader = source.getReader();
    try { for (;;) { const { done, value } = await reader.read(); if (done) break; yield Buffer.from(value); } }
    finally { reader.releaseLock(); }
    return;
  }
  if (source?.[Symbol.asyncIterator]) { for await (const value of source) yield Buffer.from(value); return; }
  if (source?.[Symbol.iterator]) { for (const value of source) yield Buffer.from(value); return; }
  throw new TypeError("object body must be bytes, text, a readable stream, or an iterable of bytes");
}

async function collect(source, maximumBytes) {
  const chunks = []; let length = 0;
  for await (const chunk of sourceBytes(source)) {
    length += chunk.length;
    if (length > maximumBytes) throw new Error("physical custody object exceeded its declared bound");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, length);
}

function declaredValue(body, mediaType) {
  return Object.freeze({ body, byteLength: body.length, mediaType, sha256: sha256(body) });
}

function checksumMatches(offered, digest) {
  return offered === undefined || offered === digest || offered === Buffer.from(digest, "hex").toString("base64");
}

export function createFilesetObjectStorage({ custody: offeredCustody,
  chunkBytes: offeredChunkBytes = DEFAULT_CHUNK_BYTES, clock = () => new Date(), uuid = randomUUID } = {}) {
  const custody = requiredCustody(offeredCustody);
  const putImmutableCatalogRecord = (custody.putImmutableCatalogRecord ?? custody.putImmutable).bind(custody);
  const putCurrentCatalogRecord = (custody.putCurrentCatalogRecord ?? custody.putCurrent).bind(custody);
  // This compatibility setting bounds control records; it does not bound or split payloads.
  const chunkBytes = positiveInteger(offeredChunkBytes, "chunkBytes");
  let mutationTail = Promise.resolve();
  const mutate = async (operation) => {
    const prior = mutationTail; let release;
    mutationTail = new Promise((resolve) => { release = resolve; });
    await prior;
    try { return await operation(); } finally { release(); }
  };

  async function readJson(key, maximumBytes = Math.max(chunkBytes, 1024 * 1024)) {
    const retained = await custody.get(key);
    if (!retained) return null;
    const body = await collect(retained.body, maximumBytes);
    try { return { value: JSON.parse(body.toString("utf8")), etag: retained.etag }; }
    catch { throw new Error(`custody object ${key} is not JSON`); }
  }

  async function putImmutableCommit(value) {
    const body = jsonBytes(value), digest = sha256(body), key = commitKey(digest);
    await putImmutableCatalogRecord(key, declaredValue(body, "application/json"));
    return key;
  }

  async function readHead(bucket, key) {
    const retained = await readJson(headKey(bucket, key));
    if (!retained) return null;
    if (retained.value?.profile !== HEAD_PROFILE || retained.value.bucket !== bucket || retained.value.key !== key)
      throw new Error("object head coordinate does not match its content");
    return Object.freeze({ ...retained.value, custodyEtag: retained.etag });
  }

  async function retainPayload(body, contentType = "application/octet-stream", checksumSha256) {
    const staged = await custody.stage({ body: sourceBytes(body), mediaType: contentType });
    try {
      if (!checksumMatches(checksumSha256, staged.sha256))
        throw new ObjectStorageError("BadDigest", "supplied SHA-256 does not match object bytes");
      const key = payloadKey(staged.sha256);
      await custody.promoteStaged(staged.stageId, { key, sha256: staged.sha256, md5: staged.md5,
        byteLength: staged.byteLength, mediaType: contentType });
      return Object.freeze({ profile: PAYLOAD_PROFILE, key, sha256: staged.sha256, md5: staged.md5,
        byteLength: staged.byteLength, mediaType: contentType });
    } finally { await custody.deleteStaged(staged.stageId); }
  }

  async function advanceHead({ bucket, key, payload, contentType, metadata, previous, deleted = false,
    etag: offeredEtag, ifMatch, ifNoneMatch, recordedAt = clock().toISOString() }) {
    const present = previous && !previous.deleted ? previous : null;
    if (ifNoneMatch === "*" && present) throw new ObjectStorageError("PreconditionFailed", "object already exists");
    if (ifMatch !== undefined && (!present || unquote(ifMatch) !== present.etag))
      throw new ObjectStorageError("PreconditionFailed", "object ETag did not match");
    const generation = (previous?.generation ?? 0) + 1;
    const etag = deleted ? null : (offeredEtag ?? payload.md5);
    const retainedMetadata = deleted ? null : objectMetadata(metadata);
    const commit = Object.freeze({ profile: COMMIT_PROFILE, bucket, key, generation, deleted,
      payloadKey: deleted ? null : payload.key, byteLength: deleted ? 0 : payload.byteLength,
      sha256: deleted ? null : payload.sha256, etag,
      contentType: deleted ? null : contentType, metadata: retainedMetadata,
      previousCommitKey: previous?.commitKey ?? null, recordedAt });
    const commitReference = await putImmutableCommit(commit);
    const head = Object.freeze({ profile: HEAD_PROFILE, bucket, key, generation, deleted,
      payloadKey: commit.payloadKey, byteLength: commit.byteLength, sha256: commit.sha256, etag,
      contentType: commit.contentType, metadata: commit.metadata,
      commitKey: commitReference, recordedAt });
    const body = jsonBytes(head);
    const result = await putCurrentCatalogRecord(headKey(bucket, key), declaredValue(body, "application/json"),
      previous ? { expectedEtag: previous.custodyEtag } : { ifNoneMatch: true });
    if (result.conflict) throw new ObjectStorageError("OperationAborted", "object head changed concurrently");
    return head;
  }

  async function putObject({ bucket: offeredBucket, key: offeredKey, body,
    contentType = "application/octet-stream", metadata, ifMatch, ifNoneMatch, checksumSha256 } = {}) {
    const bucket = bucketName(offeredBucket), key = objectKey(offeredKey);
    const payload = await retainPayload(body, contentType, checksumSha256);
    return mutate(async () => {
      const previous = await readHead(bucket, key);
      const head = await advanceHead({ bucket, key, payload, contentType, metadata, previous, ifMatch, ifNoneMatch });
      return Object.freeze({ bucket, key, etag: quoted(head.etag), sha256: head.sha256,
        byteLength: head.byteLength, generation: head.generation });
    });
  }

  async function copyObject({ sourceBucket: offeredSourceBucket, sourceKey: offeredSourceKey,
    bucket: offeredBucket, key: offeredKey, metadata, contentType, ifMatch, ifNoneMatch } = {}) {
    const sourceBucket = bucketName(offeredSourceBucket), sourceKey = objectKey(offeredSourceKey);
    const bucket = bucketName(offeredBucket), key = objectKey(offeredKey);
    return mutate(async () => {
      const source = await readHead(sourceBucket, sourceKey);
      if (!source || source.deleted) return null;
      const previous = await readHead(bucket, key);
      const payload = Object.freeze({ key: source.payloadKey, sha256: source.sha256,
        md5: source.etag, byteLength: source.byteLength });
      const head = await advanceHead({ bucket, key, payload, previous, ifMatch, ifNoneMatch,
        contentType: contentType ?? source.contentType, metadata: metadata ?? source.metadata });
      return Object.freeze({ bucket, key, etag: quoted(head.etag), sha256: head.sha256,
        byteLength: head.byteLength, generation: head.generation });
    });
  }

  async function headObject({ bucket: offeredBucket, key: offeredKey } = {}) {
    const bucket = bucketName(offeredBucket), key = objectKey(offeredKey), head = await readHead(bucket, key);
    if (!head || head.deleted) return null;
    return Object.freeze({ bucket, key, etag: quoted(head.etag), sha256: head.sha256,
      byteLength: head.byteLength, contentType: head.contentType, generation: head.generation,
      modifiedTime: head.recordedAt, metadata: head.metadata ?? {} });
  }

  async function getObject({ bucket: offeredBucket, key: offeredKey, range } = {}) {
    const bucket = bucketName(offeredBucket), key = objectKey(offeredKey), head = await readHead(bucket, key);
    if (!head || head.deleted) return null;
    const start = range?.start ?? 0, endExclusive = range?.endExclusive ?? head.byteLength;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(endExclusive) || start < 0
      || (head.byteLength === 0 ? range !== undefined : endExclusive <= start || start >= head.byteLength))
      throw new ObjectStorageError("InvalidRange", "requested byte range is not satisfiable");
    const boundedEnd = Math.min(endExclusive, head.byteLength);
    const retained = await custody.get(head.payloadKey, range ? { range: { start, endExclusive: boundedEnd } } : {});
    if (!retained) throw new Error(`canonical payload ${head.payloadKey} is absent`);
    async function* output() { yield* sourceBytes(retained.body); }
    return Object.freeze({ bucket, key, etag: quoted(head.etag), sha256: head.sha256,
      byteLength: boundedEnd - start, objectByteLength: head.byteLength, contentType: head.contentType,
      metadata: head.metadata ?? {}, range: range ? Object.freeze({ start, endExclusive: boundedEnd }) : null,
      body: output() });
  }

  async function deleteObject({ bucket: offeredBucket, key: offeredKey, ifMatch } = {}) {
    const bucket = bucketName(offeredBucket), key = objectKey(offeredKey);
    return mutate(async () => {
      const previous = await readHead(bucket, key);
      if (!previous || previous.deleted) return Object.freeze({ bucket, key, deleted: false });
      await advanceHead({ bucket, key, previous, deleted: true, ifMatch });
      return Object.freeze({ bucket, key, deleted: true });
    });
  }

  async function listObjects({ bucket: offeredBucket, prefix = "", startAfter = "", maximum = 1000 } = {}) {
    const bucket = bucketName(offeredBucket);
    if (typeof prefix !== "string" || typeof startAfter !== "string") throw new TypeError("prefix and startAfter must be strings");
    if (!Number.isSafeInteger(maximum) || maximum < 1 || maximum > 1000) throw new RangeError("maximum must be 1 through 1000");
    const entries = await custody.list(`heads/${segment(bucket)}/`), values = [];
    for (const entry of entries) {
      const retained = await readJson(entry.key), head = retained?.value;
      if (head?.profile === HEAD_PROFILE && head.bucket === bucket && !head.deleted
        && head.key.startsWith(prefix) && head.key > startAfter) values.push(head);
    }
    values.sort((a, b) => a.key.localeCompare(b.key));
    const selected = values.slice(0, maximum), truncated = values.length > selected.length;
    return Object.freeze({ bucket, prefix, objects: selected.map((head) => Object.freeze({ key: head.key,
      etag: quoted(head.etag), sha256: head.sha256, byteLength: head.byteLength,
      contentType: head.contentType, modifiedTime: head.recordedAt })), truncated,
      nextStartAfter: truncated ? selected.at(-1).key : undefined });
  }

  async function createMultipartUpload({ bucket: offeredBucket, key: offeredKey, contentType, metadata } = {}) {
    const bucket = bucketName(offeredBucket), key = objectKey(offeredKey), uploadId = uuid();
    const state = Object.freeze({ profile: UPLOAD_PROFILE, bucket, key, uploadId,
      contentType: contentType ?? "application/octet-stream", metadata: objectMetadata(metadata),
      parts: {}, createdAt: clock().toISOString() });
    const body = jsonBytes(state), result = await putCurrentCatalogRecord(uploadKey(bucket, uploadId),
      declaredValue(body, "application/json"), { ifNoneMatch: true });
    if (result.conflict) throw new ObjectStorageError("OperationAborted", "multipart upload identity collided");
    return Object.freeze({ bucket, key, uploadId });
  }

  async function readUpload(bucket, uploadId) {
    if (typeof uploadId !== "string" || !/^[A-Za-z0-9_-]{8,128}$/u.test(uploadId))
      throw new ObjectStorageError("NoSuchUpload", "multipart upload identifier is invalid");
    const retained = await readJson(uploadKey(bucket, uploadId));
    if (!retained || retained.value?.profile !== UPLOAD_PROFILE || retained.value.bucket !== bucket)
      throw new ObjectStorageError("NoSuchUpload", "multipart upload does not exist");
    return Object.freeze({ ...retained.value, custodyEtag: retained.etag });
  }

  async function uploadPart({ bucket: offeredBucket, key: offeredKey, uploadId, partNumber, body, checksumSha256 } = {}) {
    const bucket = bucketName(offeredBucket), key = objectKey(offeredKey);
    if (!Number.isSafeInteger(partNumber) || partNumber < 1 || partNumber > 10000)
      throw new ObjectStorageError("InvalidPart", "part number must be 1 through 10000");
    const staged = await custody.stage({ body: sourceBytes(body), mediaType: "application/octet-stream" });
    if (!checksumMatches(checksumSha256, staged.sha256)) {
      await custody.deleteStaged(staged.stageId);
      throw new ObjectStorageError("BadDigest", "supplied part SHA-256 does not match part bytes");
    }
    try {
      return await mutate(async () => {
        const state = await readUpload(bucket, uploadId);
        if (state.key !== key) throw new ObjectStorageError("NoSuchUpload", "multipart key does not match upload");
        const replaced = state.parts[partNumber];
        const next = { ...state, parts: { ...state.parts, [partNumber]: { stageId: staged.stageId,
          sha256: staged.sha256, etag: staged.md5, byteLength: staged.byteLength } } };
        delete next.custodyEtag;
        const bytes = jsonBytes(next), result = await putCurrentCatalogRecord(uploadKey(bucket, uploadId),
          declaredValue(bytes, "application/json"), { expectedEtag: state.custodyEtag });
        if (result.conflict) throw new ObjectStorageError("OperationAborted", "multipart upload changed concurrently");
        if (replaced) await custody.deleteStaged(replaced.stageId);
        return Object.freeze({ bucket, key, uploadId, partNumber, etag: quoted(staged.md5) });
      });
    } catch (error) { await custody.deleteStaged(staged.stageId); throw error; }
  }

  async function completeMultipartUpload({ bucket: offeredBucket, key: offeredKey, uploadId, parts,
    ifMatch, ifNoneMatch } = {}) {
    const bucket = bucketName(offeredBucket), key = objectKey(offeredKey);
    if (!Array.isArray(parts) || parts.length === 0) throw new ObjectStorageError("InvalidPart", "completion requires parts");
    return mutate(async () => {
      const state = await readUpload(bucket, uploadId);
      if (state.key !== key) throw new ObjectStorageError("NoSuchUpload", "multipart key does not match upload");
      const ordered = []; let prior = 0;
      for (const requested of parts) {
        if (!Number.isSafeInteger(requested.partNumber) || requested.partNumber <= prior)
          throw new ObjectStorageError("InvalidPartOrder", "multipart parts must be in ascending order");
        prior = requested.partNumber;
        const retained = state.parts[requested.partNumber];
        if (!retained || unquote(requested.etag) !== retained.etag)
          throw new ObjectStorageError("InvalidPart", "multipart part ETag mismatch");
        ordered.push(retained);
      }
      async function* assembled() {
        for (const part of ordered) {
          const retained = await custody.getStaged(part.stageId);
          if (!retained) throw new Error("multipart staging part is absent");
          yield* sourceBytes(retained.body);
        }
      }
      const payload = await retainPayload(assembled(), state.contentType);
      const multipartDigest = createHash("md5").update(Buffer.concat(ordered.map((part) => Buffer.from(part.etag, "hex")))).digest("hex");
      const multipartEtag = `${multipartDigest}-${ordered.length}`;
      const previous = await readHead(bucket, key);
      const head = await advanceHead({ bucket, key, payload, previous, contentType: state.contentType,
        metadata: state.metadata, etag: multipartEtag, ifMatch, ifNoneMatch });
      const removed = await custody.deleteCurrent(uploadKey(bucket, uploadId), { expectedEtag: state.custodyEtag });
      if (removed.conflict) throw new ObjectStorageError("OperationAborted", "multipart upload changed concurrently");
      await Promise.all(ordered.map((part) => custody.deleteStaged(part.stageId)));
      return Object.freeze({ bucket, key, uploadId, etag: quoted(head.etag), sha256: head.sha256,
        byteLength: head.byteLength, generation: head.generation });
    });
  }

  async function abortMultipartUpload({ bucket: offeredBucket, key: offeredKey, uploadId } = {}) {
    const bucket = bucketName(offeredBucket), key = objectKey(offeredKey);
    return mutate(async () => {
      const state = await readUpload(bucket, uploadId);
      if (state.key !== key) throw new ObjectStorageError("NoSuchUpload", "multipart key does not match upload");
      const result = await custody.deleteCurrent(uploadKey(bucket, uploadId), { expectedEtag: state.custodyEtag });
      if (result.conflict) throw new ObjectStorageError("OperationAborted", "multipart upload changed concurrently");
      await Promise.all(Object.values(state.parts).map((part) => custody.deleteStaged(part.stageId)));
      return Object.freeze({ bucket, key, uploadId, aborted: true });
    });
  }

  return Object.freeze({ putObject, copyObject, getObject, headObject, deleteObject, listObjects,
    createMultipartUpload, uploadPart, completeMultipartUpload, abortMultipartUpload });
}

export const FILESET_OBJECT_STORAGE_DEFAULT_CHUNK_BYTES = DEFAULT_CHUNK_BYTES;
export const FILESET_OBJECT_PROFILE = PAYLOAD_PROFILE;
export const INTACT_PAYLOAD_PROFILE = PAYLOAD_PROFILE;
export const createContentAddressedObjectStorage = createFilesetObjectStorage;
