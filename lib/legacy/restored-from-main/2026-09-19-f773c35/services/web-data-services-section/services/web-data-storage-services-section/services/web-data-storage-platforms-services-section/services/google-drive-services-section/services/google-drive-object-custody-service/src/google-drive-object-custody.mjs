import { createHash } from "node:crypto";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const QUANTUM = 256 * 1024;
const DEFAULT_UPLOAD_CHUNK_BYTES = 8 * 1024 * 1024;
const FILE_FIELDS = "id,name,description,size,mimeType,md5Checksum,sha256Checksum,version,modifiedTime,parents,shortcutDetails,trashed,appProperties";
const DRIVE_FOLDER_MEDIA_TYPE = "application/vnd.google-apps.folder";
const DRIVE_SHORTCUT_MEDIA_TYPE = "application/vnd.google-apps.shortcut";

export class GoogleDriveCustodyError extends Error {
  constructor(code, message, evidence = {}) {
    super(message); this.name = "GoogleDriveCustodyError"; this.code = code; this.evidence = evidence;
  }
}

function finite(value, maximum = 16384) {
  return typeof value === "string" && value.length > 0 && value.length <= maximum && !value.includes("\0");
}

function requiredRoot(value) {
  if (!finite(value, 512)) throw new TypeError("rootFolderId is required");
  return value;
}

function uploadQuantum(value) {
  if (!Number.isSafeInteger(value) || value < QUANTUM || value % QUANTUM !== 0) {
    throw new RangeError("uploadChunkBytes must be a positive multiple of 256 KiB");
  }
  return value;
}

function requestInterval(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 60_000) {
    throw new RangeError("minimumRequestIntervalMilliseconds must be between 0 and 60000");
  }
  return value;
}

function providerRateLimited(document) {
  const indicators = new Set(["rateLimitExceeded", "userRateLimitExceeded", "RATE_LIMIT_EXCEEDED", "RESOURCE_EXHAUSTED"]);
  const pending = [document];
  while (pending.length > 0) {
    const value = pending.pop();
    if (typeof value === "string" && indicators.has(value)) return true;
    if (Array.isArray(value)) pending.push(...value);
    else if (value && typeof value === "object") pending.push(...Object.values(value));
  }
  return false;
}

function providerClassifications(body) {
  let document;
  try { document = JSON.parse(body.toString("utf8")); } catch { return []; }
  const classifications = new Set(), pending = [document];
  while (pending.length > 0) {
    const value = pending.pop();
    if (Array.isArray(value)) { pending.push(...value); continue; }
    if (!value || typeof value !== "object") continue;
    for (const [key, nested] of Object.entries(value)) {
      if ((key === "reason" || key === "status" || key === "domain")
        && typeof nested === "string" && /^[A-Za-z][A-Za-z0-9_.-]{0,127}$/u.test(nested)) {
        classifications.add(`${key}:${nested}`);
      } else if (nested && typeof nested === "object") pending.push(nested);
    }
  }
  return [...classifications].sort();
}

function objectKey(value) {
  if (!finite(value, 2048)) throw new TypeError("physical object key must be finite");
  return value;
}

const digest = (value) => createHash("sha256").update(value).digest("hex");
const keyHash = (key) => digest(Buffer.from(key));
const encodedKey = (key) => Buffer.from(key).toString("base64url");
const validSha256 = (value) => typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);

function payloadDeclaration(value) {
  if (!value || !Number.isSafeInteger(value.byteLength) || value.byteLength < 0 || !validSha256(value.sha256)
    || !finite(value.mediaType, 255)) throw new TypeError("Drive custody value declaration is invalid");
  return value;
}

function catalogRecordDeclaration(offeredValue) {
  const value = payloadDeclaration(offeredValue);
  if (value.mediaType !== "application/json"
    || (typeof value.body !== "string" && !(value.body instanceof Uint8Array))) {
    throw new TypeError("catalog record must be materialized application/json bytes");
  }
  const body = Buffer.from(value.body);
  if (body.length !== value.byteLength || digest(body) !== value.sha256) {
    throw new GoogleDriveCustodyError("catalog-record-commitment-mismatch",
      "materialized catalog record does not match its byte commitment");
  }
  let document;
  try { document = JSON.parse(body.toString("utf8")); } catch {
    throw new TypeError("catalog record body must contain valid JSON");
  }
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new TypeError("catalog record body must contain one JSON object");
  }
  return Object.freeze({ ...value, body });
}

function multipartRelatedBody(metadataDocument, value) {
  const metadataBytes = Buffer.from(JSON.stringify(metadataDocument));
  let ordinal = 0, boundary;
  do {
    boundary = `rce_${digest(Buffer.concat([metadataBytes, value.body, Buffer.from(String(ordinal))]))}`;
    ordinal += 1;
  } while (metadataBytes.includes(boundary) || value.body.includes(boundary));
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`),
    metadataBytes,
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: ${value.mediaType}\r\n\r\n`),
    value.body,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return { boundary, body };
}

function decodedKey(file) {
  const match = /^rce-object-key:([A-Za-z0-9_-]+)$/u.exec(file.description ?? "");
  if (!match) throw new GoogleDriveCustodyError("foreign-object", "managed Drive file lacks its reversible key commitment", { fileId: file.id });
  const key = Buffer.from(match[1], "base64url").toString("utf8");
  if (keyHash(key) !== file.appProperties?.rceKeyHash) {
    throw new GoogleDriveCustodyError("key-commitment-mismatch", "managed Drive file key commitment is invalid", { fileId: file.id });
  }
  return key;
}

async function* byteSource(source) {
  if (typeof source === "string" || source instanceof Uint8Array) { yield Buffer.from(source); return; }
  if (source?.getReader) {
    const reader = source.getReader();
    try { for (;;) { const { done, value } = await reader.read(); if (done) break; yield Buffer.from(value); } }
    finally { reader.releaseLock(); }
    return;
  }
  if (source?.[Symbol.asyncIterator]) { for await (const value of source) yield Buffer.from(value); return; }
  if (source?.[Symbol.iterator]) { for (const value of source) yield Buffer.from(value); return; }
  throw new TypeError("Drive upload body must be bytes or an iterable byte stream");
}

async function* uploadChunks(source, size) {
  let pending = Buffer.alloc(0);
  for await (const offered of byteSource(source)) {
    if (offered.length === 0) continue;
    pending = pending.length === 0 ? offered : Buffer.concat([pending, offered]);
    while (pending.length >= size) { yield pending.subarray(0, size); pending = pending.subarray(size); }
  }
  if (pending.length > 0) yield pending;
}

async function providerError(response, operation) {
  const body = Buffer.from(await response.arrayBuffer());
  throw new GoogleDriveCustodyError("provider-refused", `Google Drive ${operation} refused (${response.status})`,
    { status: response.status, statusText: response.statusText, bodySha256: digest(body),
      classifications: providerClassifications(body) });
}

export function createGoogleDriveObjectCustody({ rootFolderId: offeredRootFolderId,
  accessTokenProvider, fetchImpl = globalThis.fetch,
  uploadChunkBytes: offeredUploadChunkBytes = DEFAULT_UPLOAD_CHUNK_BYTES,
  minimumRequestIntervalMilliseconds: offeredMinimumRequestIntervalMilliseconds = 0,
  wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  clock = Date.now } = {}) {
  const rootFolderId = requiredRoot(offeredRootFolderId);
  const rootHash = keyHash(rootFolderId);
  const chunkBytes = uploadQuantum(offeredUploadChunkBytes);
  const minimumRequestIntervalMilliseconds = requestInterval(offeredMinimumRequestIntervalMilliseconds);
  if (typeof accessTokenProvider !== "function") throw new TypeError("accessTokenProvider is required");
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl is required");
  if (typeof wait !== "function") throw new TypeError("wait must be a function");
  if (typeof clock !== "function") throw new TypeError("clock must be a function");

  let requestSchedule = Promise.resolve(), nextRequestAt = 0;
  async function paceRequest() {
    if (minimumRequestIntervalMilliseconds === 0) return () => {};
    let release;
    const predecessor = requestSchedule;
    requestSchedule = new Promise((resolve) => { release = resolve; });
    await predecessor;
    const now = Number(clock());
    if (!Number.isFinite(now)) { release(); throw new GoogleDriveCustodyError("invalid-clock", "Drive request clock returned no valid time"); }
    const delay = Math.max(0, nextRequestAt - now);
    if (delay > 0) await wait(delay);
    return () => {
      const startedAt = Number(clock());
      if (!Number.isFinite(startedAt)) { release(); throw new GoogleDriveCustodyError("invalid-clock", "Drive request clock returned no valid time"); }
      nextRequestAt = Math.max(nextRequestAt, startedAt) + minimumRequestIntervalMilliseconds;
      release();
    };
  }

  async function authorizedFetch(url, init = {}) {
    for (let attempt = 0; ; attempt += 1) {
      const recordRequestStart = await paceRequest();
      let responsePromise;
      try {
        const token = await accessTokenProvider();
        if (!finite(token)) throw new GoogleDriveCustodyError("credential-unavailable", "Google access token provider returned no token");
        responsePromise = fetchImpl(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
      } finally { recordRequestStart(); }
      const response = await responsePromise;
      let rateLimited = response.status === 429;
      if (response.status === 403) {
        try {
          const document = await response.clone().json();
          rateLimited = providerRateLimited(document);
        } catch { rateLimited = false; }
      }
      if (!rateLimited || attempt >= 8) return response;
      const retryAfter = Number(response.headers.get("retry-after"));
      const providerDelay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 0;
      const milliseconds = Math.max(providerDelay, Math.min(30_000, 500 * (2 ** attempt)));
      await wait(milliseconds);
    }
  }

  async function listFiles(query) {
    const output = []; let pageToken;
    do {
      const parameters = new URLSearchParams({ q: query, fields: `nextPageToken,files(${FILE_FIELDS})`, pageSize: "1000" });
      if (pageToken) parameters.set("pageToken", pageToken);
      const response = await authorizedFetch(`${DRIVE_API}/files?${parameters}`);
      if (!response.ok) await providerError(response, "list");
      const page = await response.json();
      if (!Array.isArray(page.files)) throw new GoogleDriveCustodyError("provider-invalid", "Google Drive list returned no file array");
      output.push(...page.files); pageToken = page.nextPageToken;
    } while (pageToken);
    return output;
  }

  async function locate(key) {
    const hash = keyHash(objectKey(key));
    const query = `'${rootFolderId.replaceAll("'", "\\'")}' in parents and trashed = false and appProperties has { key='rceKeyHash' and value='${hash}' }`;
    const candidates = (await listFiles(query)).filter((file) => decodedKey(file) === key);
    if (candidates.length > 1) throw new GoogleDriveCustodyError("ambiguous-key", "more than one Drive file claims the physical object key", { keyHash: hash, fileIds: candidates.map(({ id }) => id) });
    return candidates[0] ?? null;
  }

  async function fileMetadata(fileId) {
    if (!finite(fileId, 1024)) throw new TypeError("Drive file id is required");
    const parameters = new URLSearchParams({ fields: FILE_FIELDS });
    const response = await authorizedFetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?${parameters}`);
    if (response.status === 404) return null;
    if (!response.ok) await providerError(response, "metadata read");
    return response.json();
  }

  async function deleteFile(fileId, operation = "delete") {
    const response = await authorizedFetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}`, { method: "DELETE" });
    if (!response.ok && response.status !== 404) await providerError(response, operation);
    return response.status !== 404;
  }

  function normalized(file, body) {
    return Object.freeze({ id: file.id, etag: String(file.version), byteLength: Number(file.size),
      mediaType: file.mimeType ?? "application/octet-stream", sha256: file.appProperties?.rceSha256,
      md5: file.md5Checksum, modifiedTime: file.modifiedTime, ...(body === undefined ? {} : { body }) });
  }

  function metadata(key, value, { current, creating }) {
    return {
      name: `rce-${current ? "current" : "immutable"}-${keyHash(key).slice(0, 24)}`,
      description: `rce-object-key:${encodedKey(key)}`,
      appProperties: { rceKeyHash: keyHash(key), rceSha256: value.sha256, rceClass: current ? "current" : "immutable" },
      ...(creating ? { parents: [rootFolderId] } : {}),
    };
  }

  function assertCatalogRecordFile(file, key, value, current) {
    if (!finite(file?.id, 1024) || file.version === undefined
      || decodedKey(file) !== key || file.appProperties?.rceClass !== (current ? "current" : "immutable")
      || file.appProperties?.rceSha256 !== value.sha256 || file.sha256Checksum !== value.sha256
      || Number(file.size) !== value.byteLength || file.mimeType !== value.mediaType
      || !Array.isArray(file.parents) || !file.parents.includes(rootFolderId)) {
      throw new GoogleDriveCustodyError("provider-invalid",
        "Drive returned an invalid managed catalog record", { fileId: file?.id });
    }
    return file;
  }

  async function multipartCatalogRecordUpload({ file, key, value: offeredValue, current }) {
    const value = catalogRecordDeclaration(offeredValue);
    const creating = !file;
    const endpoint = creating ? `${DRIVE_UPLOAD_API}/files`
      : `${DRIVE_UPLOAD_API}/files/${encodeURIComponent(file.id)}`;
    const parameters = new URLSearchParams({ uploadType: "multipart", fields: FILE_FIELDS });
    const related = multipartRelatedBody(metadata(key, value, { current, creating }), value);
    const response = await authorizedFetch(`${endpoint}?${parameters}`, {
      method: creating ? "POST" : "PATCH",
      headers: { "content-type": `multipart/related; boundary=${related.boundary}`,
        "content-length": String(related.body.length) },
      body: related.body,
    });
    if (!response.ok) await providerError(response, "catalog record multipart upload");
    return assertCatalogRecordFile(await response.json(), key, value, current);
  }

  async function resumableUpload({ file, key, value: offeredValue, current, metadataDocument }) {
    const value = payloadDeclaration(offeredValue);
    const creating = !file;
    const method = creating ? "POST" : "PATCH";
    const endpoint = creating ? `${DRIVE_UPLOAD_API}/files` : `${DRIVE_UPLOAD_API}/files/${encodeURIComponent(file.id)}`;
    const parameters = new URLSearchParams({ uploadType: "resumable", fields: FILE_FIELDS });
    const initiation = await authorizedFetch(`${endpoint}?${parameters}`, {
      method,
      headers: { "content-type": "application/json; charset=UTF-8", "x-upload-content-type": value.mediaType,
        "x-upload-content-length": String(value.byteLength) },
      body: JSON.stringify(metadataDocument ?? metadata(key, value, { current, creating })),
    });
    if (!initiation.ok) await providerError(initiation, "resumable upload initiation");
    const session = initiation.headers.get("location");
    if (!finite(session, 8192)) throw new GoogleDriveCustodyError("provider-invalid", "Google Drive supplied no resumable session URI");

    async function recoverStaging(total, start, end) {
      const recovery = await authorizedFetch(session, { method: "PUT", headers: {
        "content-length": "0", "content-range": `bytes */${total}`,
      } });
      if (recovery.ok) return { completed: await recovery.json(), offset: end };
      if (recovery.status !== 308) await providerError(recovery, "payload staging recovery");
      const acknowledged = /^bytes=0-(\d+)$/u.exec(recovery.headers.get("range") ?? "");
      const recoveredOffset = acknowledged ? Number(acknowledged[1]) + 1 : 0;
      if (recoveredOffset < start || recoveredOffset > end) {
        throw new GoogleDriveCustodyError("provider-invalid", "Google Drive reported an impossible staging offset");
      }
      return { offset: recoveredOffset };
    }
    async function recover(session, total) {
      const response = await authorizedFetch(session, { method: "PUT", headers: {
        "content-length": "0", "content-range": `bytes */${total}`,
      } });
      if (response.ok) return { completed: await response.json(), offset: total };
      if (response.status !== 308) await providerError(response, "resumable upload recovery");
      const acknowledged = /^bytes=0-(\d+)$/u.exec(response.headers.get("range") ?? "");
      return { offset: acknowledged ? Number(acknowledged[1]) + 1 : 0 };
    }
    const observed = createHash("sha256"); let offset = 0, completed;
    if (value.byteLength === 0) {
      const response = await authorizedFetch(session, { method: "PUT", headers: {
        "content-length": "0", "content-range": "bytes */0",
      } });
      if (!response.ok) await providerError(response, "empty resumable upload completion");
      completed = await response.json();
    }
    for await (const chunk of uploadChunks(value.body, chunkBytes)) {
      const chunkStart = offset, end = chunkStart + chunk.length;
      if (end > value.byteLength) throw new GoogleDriveCustodyError("byte-length-mismatch", "upload body exceeded declared byte length");
      observed.update(chunk);
      let recoveries = 0;
      while (offset < end && !completed) {
        let response;
        try {
          const remainder = chunk.subarray(offset - chunkStart);
          response = await authorizedFetch(session, { method: "PUT", headers: {
            "content-length": String(remainder.length), "content-type": value.mediaType,
            "content-range": `bytes ${offset}-${end - 1}/${value.byteLength}`,
          }, body: remainder, duplex: "half" });
        } catch (error) {
          if (++recoveries > 5) throw new GoogleDriveCustodyError("upload-recovery-exhausted", "Google Drive upload recovery was exhausted");
          const recovered = await recover(session, value.byteLength);
          if (recovered.offset < chunkStart || recovered.offset > end) throw new GoogleDriveCustodyError("provider-invalid", "Google Drive reported an impossible upload offset");
          offset = recovered.offset; completed = recovered.completed; continue;
        }
        if (response.status >= 500) {
          if (++recoveries > 5) await providerError(response, "resumable upload chunk");
          const recovered = await recover(session, value.byteLength);
          if (recovered.offset < chunkStart || recovered.offset > end) throw new GoogleDriveCustodyError("provider-invalid", "Google Drive reported an impossible upload offset");
          offset = recovered.offset; completed = recovered.completed; continue;
        }
        if (end < value.byteLength) {
          if (response.status !== 308) await providerError(response, "resumable upload chunk");
          offset = end;
        } else {
          if (!response.ok) await providerError(response, "resumable upload completion");
          completed = await response.json(); offset = end;
        }
      }
    }
    const observedSha256 = observed.digest("hex");
    if (offset !== value.byteLength || observedSha256 !== value.sha256) {
      if (completed?.id) await deleteFile(completed.id, "invalid staged upload cleanup");
      throw new GoogleDriveCustodyError("digest-mismatch", "streamed upload did not match its declared length and SHA-256", { observedBytes: offset });
    }
    if (!completed?.id) throw new GoogleDriveCustodyError("provider-invalid", "Google Drive upload returned no file metadata");
    return completed;
  }

  function assertPayloadEvidence(file, { sha256, byteLength, expectedClass }) {
    if (file?.appProperties?.rceRootHash !== rootHash || file.appProperties?.rceSha256 !== sha256
      || file.appProperties?.rceClass !== expectedClass) {
      throw new GoogleDriveCustodyError("payload-commitment-mismatch", "Drive file lacks the expected private payload commitment",
        { fileId: file?.id, expectedClass, sha256 });
    }
    if (file.sha256Checksum !== sha256) {
      throw new GoogleDriveCustodyError("provider-checksum-mismatch", "Drive's authenticated checksum does not match the payload commitment",
        { fileId: file.id, sha256, providerSha256: file.sha256Checksum });
    }
    if (byteLength !== undefined && Number(file.size) !== byteLength) {
      throw new GoogleDriveCustodyError("payload-length-mismatch", "Drive payload length does not match its declaration",
        { fileId: file.id, byteLength, providerByteLength: Number(file.size) });
    }
    return file;
  }

  async function findPayload({ sha256, byteLength } = {}) {
    if (!validSha256(sha256)) throw new TypeError("payload sha256 is required");
    if (byteLength !== undefined && (!Number.isSafeInteger(byteLength) || byteLength < 0)) {
      throw new TypeError("payload byteLength must be a non-negative safe integer");
    }
    const query = `trashed = false and appProperties has { key='rceRootHash' and value='${rootHash}' } and appProperties has { key='rceClass' and value='payload' } and appProperties has { key='rceSha256' and value='${sha256}' }`;
    const candidates = await listFiles(query);
    for (const candidate of candidates) assertPayloadEvidence(candidate, { sha256, byteLength, expectedClass: "payload" });
    if (candidates.length > 1) {
      throw new GoogleDriveCustodyError("ambiguous-payload", "more than one canonical Drive payload claims the whole-file SHA-256",
        { sha256, fileIds: candidates.map(({ id }) => id) });
    }
    return candidates[0] ? normalized(candidates[0]) : null;
  }

  async function stage({ body, mediaType = "application/octet-stream", sha256: expectedSha256,
    byteLength: expectedByteLength } = {}) {
    if (!finite(mediaType, 255)) throw new TypeError("staged payload mediaType is invalid");
    if (expectedSha256 !== undefined && !validSha256(expectedSha256)) throw new TypeError("expected sha256 is invalid");
    if (expectedByteLength !== undefined && (!Number.isSafeInteger(expectedByteLength) || expectedByteLength < 0)) {
      throw new TypeError("expected byteLength is invalid");
    }
    const initiation = await authorizedFetch(`${DRIVE_UPLOAD_API}/files?${new URLSearchParams({ uploadType: "resumable", fields: FILE_FIELDS })}`, {
      method: "POST",
      headers: { "content-type": "application/json; charset=UTF-8", "x-upload-content-type": mediaType,
        ...(expectedByteLength === undefined ? {} : { "x-upload-content-length": String(expectedByteLength) }) },
      body: JSON.stringify({ name: "rce-staging-uncommitted", parents: [rootFolderId],
        appProperties: { rceRootHash: rootHash, rceClass: "payload-staging" } }),
    });
    if (!initiation.ok) await providerError(initiation, "payload staging initiation");
    const session = initiation.headers.get("location");
    if (!finite(session, 8192)) throw new GoogleDriveCustodyError("provider-invalid", "Google Drive supplied no resumable session URI");

    const sha = createHash("sha256"), md5 = createHash("md5");
    const chunks = uploadChunks(body, chunkBytes)[Symbol.asyncIterator]();
    let current = await chunks.next(), offset = 0, completed;
    if (current.done) {
      const response = await authorizedFetch(session, { method: "PUT", headers: {
        "content-length": "0", "content-range": "bytes */0",
      } });
      if (!response.ok) await providerError(response, "empty payload staging completion");
      completed = await response.json();
    }
    while (!current.done) {
      const next = await chunks.next();
      const chunk = current.value, start = offset, end = start + chunk.length;
      sha.update(chunk); md5.update(chunk);
      let sent = start, recoveries = 0;
      while (sent < end && !completed) {
        const final = next.done;
        let response;
        try {
          response = await authorizedFetch(session, { method: "PUT", headers: {
            "content-length": String(end - sent), "content-type": mediaType,
            "content-range": `bytes ${sent}-${end - 1}/${final ? end : "*"}`,
          }, body: chunk.subarray(sent - start), duplex: "half" });
        } catch {
          if (++recoveries > 5) throw new GoogleDriveCustodyError("upload-recovery-exhausted", "Google Drive staging recovery was exhausted");
          const recovered = await recoverStaging(final ? end : "*", start, end);
          sent = recovered.offset; completed = recovered.completed; continue;
        }
        if (response.status >= 500) {
          if (++recoveries > 5) await providerError(response, "payload staging chunk");
          const recovered = await recoverStaging(final ? end : "*", start, end);
          sent = recovered.offset; completed = recovered.completed;
          continue;
        }
        if (final) {
          if (!response.ok) await providerError(response, "payload staging completion");
          completed = await response.json();
        } else if (response.status !== 308) await providerError(response, "payload staging chunk");
        sent = end;
      }
      offset = end; current = next;
    }
    if (!completed?.id) throw new GoogleDriveCustodyError("provider-invalid", "Google Drive staging returned no file metadata");
    const observedSha256 = sha.digest("hex"), observedMd5 = md5.digest("hex");
    if ((expectedSha256 !== undefined && observedSha256 !== expectedSha256)
      || (expectedByteLength !== undefined && offset !== expectedByteLength)) {
      await deleteFile(completed.id, "invalid staged payload cleanup");
      throw new GoogleDriveCustodyError("digest-mismatch", "staged upload did not match its declared length or SHA-256",
        { observedBytes: offset, observedSha256 });
    }
    if (completed.sha256Checksum !== observedSha256 || (completed.md5Checksum && completed.md5Checksum !== observedMd5)
      || Number(completed.size) !== offset) {
      await deleteFile(completed.id, "provider checksum mismatch cleanup");
      throw new GoogleDriveCustodyError("provider-checksum-mismatch", "Drive's authenticated checksum or size does not match the staged bytes",
        { stagedFileId: completed.id, observedSha256, providerSha256: completed.sha256Checksum });
    }
    let committed;
    try {
      const response = await authorizedFetch(`${DRIVE_API}/files/${encodeURIComponent(completed.id)}?fields=${encodeURIComponent(FILE_FIELDS)}`, {
        method: "PATCH", headers: { "content-type": "application/json; charset=UTF-8" },
        body: JSON.stringify({ name: `rce-staging-${observedSha256.slice(0, 24)}`,
          description: `rce-payload-sha256:${observedSha256}`, appProperties: {
            rceRootHash: rootHash, rceSha256: observedSha256, rceClass: "payload-staging",
          } }),
      });
      if (!response.ok) await providerError(response, "staged payload commitment");
      committed = await response.json();
      assertPayloadEvidence(committed, { sha256: observedSha256, byteLength: offset, expectedClass: "payload-staging" });
    } catch (error) {
      await deleteFile(completed.id, "uncommitted staged payload cleanup");
      throw error;
    }
    return Object.freeze({ stageId: completed.id, sha256: observedSha256, md5: observedMd5,
      byteLength: offset, mediaType: committed.mimeType ?? mediaType });
  }

  async function getStaged(stageId, { range } = {}) {
    const file = await fileMetadata(stageId);
    if (!file) return null;
    const sha256 = file.appProperties?.rceSha256;
    assertPayloadEvidence(file, { sha256, byteLength: Number(file.size), expectedClass: "payload-staging" });
    const headers = range ? { Range: `bytes=${range.start}-${range.endExclusive - 1}` } : {};
    const response = await authorizedFetch(`${DRIVE_API}/files/${encodeURIComponent(stageId)}?alt=media`, { headers });
    if (response.status === 404) return null;
    if (!response.ok && response.status !== 206) await providerError(response, "staged payload download");
    return normalized(file, response.body ?? Buffer.from(await response.arrayBuffer()));
  }

  async function promoteStaged(stageId, { key, sha256, byteLength, mediaType } = {}) {
    key = objectKey(key);
    if (!validSha256(sha256) || !Number.isSafeInteger(byteLength) || byteLength < 0 || !finite(mediaType, 255)) {
      throw new TypeError("canonical payload declaration is invalid");
    }
    const expectedKey = `payloads/sha256/${sha256.slice(0, 2)}/${sha256}`;
    if (key !== expectedKey) throw new GoogleDriveCustodyError("noncanonical-payload-key", "payload key must be derived from its whole-file SHA-256",
      { key, expectedKey });
    const present = await findPayload({ sha256, byteLength });
    const staged = await fileMetadata(stageId);
    if (!staged) {
      if (present) return Object.freeze({ id: present.id, key, existed: true, promoted: false, sha256, byteLength, mediaType: present.mediaType });
      throw new GoogleDriveCustodyError("staging-missing", "staged Drive payload no longer exists", { stageId });
    }
    if (staged.appProperties?.rceClass === "payload") {
      assertPayloadEvidence(staged, { sha256, byteLength, expectedClass: "payload" });
      return Object.freeze({ id: staged.id, key, existed: false, promoted: false, sha256, byteLength, mediaType: staged.mimeType });
    }
    assertPayloadEvidence(staged, { sha256, byteLength, expectedClass: "payload-staging" });
    if (present) {
      await deleteStaged(stageId);
      return Object.freeze({ id: present.id, key, existed: true, promoted: false, sha256, byteLength, mediaType: present.mediaType });
    }
    const response = await authorizedFetch(`${DRIVE_API}/files/${encodeURIComponent(stageId)}?fields=${encodeURIComponent(FILE_FIELDS)}`, {
      method: "PATCH", headers: { "content-type": "application/json; charset=UTF-8" }, body: JSON.stringify({
        name: `sha256-${sha256}`, description: `rce-object-key:${encodedKey(key)}`, appProperties: {
          rceRootHash: rootHash, rceSha256: sha256, rceClass: "payload", rceKeyHash: keyHash(key),
        },
      }),
    });
    if (!response.ok) await providerError(response, "staged payload promotion");
    const promoted = await response.json();
    assertPayloadEvidence(promoted, { sha256, byteLength, expectedClass: "payload" });
    const canonical = await findPayload({ sha256, byteLength });
    if (canonical?.id !== stageId) throw new GoogleDriveCustodyError("ambiguous-payload", "Drive payload promotion did not produce one canonical payload", { sha256 });
    return Object.freeze({ id: stageId, key, existed: false, promoted: true, sha256, byteLength, mediaType: promoted.mimeType ?? mediaType });
  }

  async function deleteStaged(stageId) {
    const file = await fileMetadata(stageId);
    if (!file) return Object.freeze({ deleted: false });
    if (file.appProperties?.rceRootHash === rootHash && file.appProperties?.rceClass === "payload") {
      return Object.freeze({ deleted: false });
    }
    const sha256 = file.appProperties?.rceSha256;
    assertPayloadEvidence(file, { sha256, expectedClass: "payload-staging" });
    return Object.freeze({ deleted: await deleteFile(stageId, "staged payload deletion") });
  }

  function projectionDescription(projectionKey) {
    return `rce-projection-key:${encodedKey(objectKey(projectionKey))}`;
  }

  function decodedProjectionKey(file) {
    const match = /^rce-projection-key:([A-Za-z0-9_-]+)$/u.exec(file.description ?? "");
    if (!match) throw new GoogleDriveCustodyError("foreign-projection", "managed Drive shortcut lacks its reversible projection commitment", { fileId: file.id });
    const key = Buffer.from(match[1], "base64url").toString("utf8");
    if (keyHash(key) !== file.appProperties?.rceProjectionHash) {
      throw new GoogleDriveCustodyError("projection-commitment-mismatch", "managed Drive shortcut projection commitment is invalid", { fileId: file.id });
    }
    return key;
  }

  async function locateProjection(projectionKey, projectionClass, mediaType) {
    const hash = keyHash(objectKey(projectionKey));
    const query = `trashed = false and appProperties has { key='rceRootHash' and value='${rootHash}' } and appProperties has { key='rceClass' and value='${projectionClass}' } and appProperties has { key='rceProjectionHash' and value='${hash}' }`;
    const candidates = (await listFiles(query)).filter((file) => decodedProjectionKey(file) === projectionKey);
    for (const candidate of candidates) {
      if (candidate.mimeType !== mediaType) throw new GoogleDriveCustodyError("projection-type-mismatch",
        "managed Drive projection has the wrong provider MIME type", { fileId: candidate.id, projectionClass,
          expectedMediaType: mediaType, providerMediaType: candidate.mimeType });
    }
    if (candidates.length > 1) throw new GoogleDriveCustodyError("ambiguous-projection", "more than one Drive file claims the typed projection key",
      { projectionHash: hash, projectionClass, fileIds: candidates.map(({ id }) => id) });
    return candidates[0] ?? null;
  }

  async function createShortcut({ projectionKey, name, parentFolderId, targetFileId }) {
    const body = { name, mimeType: DRIVE_SHORTCUT_MEDIA_TYPE, parents: [parentFolderId],
      shortcutDetails: { targetId: targetFileId }, description: projectionDescription(projectionKey),
      appProperties: { rceRootHash: rootHash, rceClass: "shortcut-projection", rceProjectionHash: keyHash(projectionKey) } };
    const response = await authorizedFetch(`${DRIVE_API}/files?fields=${encodeURIComponent(FILE_FIELDS)}`, {
      method: "POST", headers: { "content-type": "application/json; charset=UTF-8" }, body: JSON.stringify(body),
    });
    if (!response.ok) await providerError(response, "shortcut creation");
    return response.json();
  }

  async function reconcileShortcut({ projectionKey, name, parentFolderId, targetFileId } = {}) {
    projectionKey = objectKey(projectionKey);
    if (!finite(name, 512) || !finite(parentFolderId, 1024) || !finite(targetFileId, 1024)) {
      throw new TypeError("shortcut name, parent folder id, and target file id are required");
    }
    const target = await fileMetadata(targetFileId);
    if (!target) throw new GoogleDriveCustodyError("payload-missing", "shortcut target does not exist", { targetFileId });
    const targetSha256 = target.appProperties?.rceSha256;
    try { assertPayloadEvidence(target, { sha256: targetSha256, byteLength: Number(target.size), expectedClass: "payload" }); }
    catch (error) { throw new GoogleDriveCustodyError("foreign-shortcut-target", "shortcut target is not a verified canonical payload in this custody root",
      { targetFileId, causeCode: error.code }); }
    const present = await locateProjection(projectionKey, "shortcut-projection", DRIVE_SHORTCUT_MEDIA_TYPE);
    if (present?.shortcutDetails?.targetId !== targetFileId) {
      if (present) await deleteFile(present.id, "stale shortcut projection removal");
      const created = await createShortcut({ projectionKey, name, parentFolderId, targetFileId });
      return Object.freeze({ id: created.id, created: true, replaced: Boolean(present), targetFileId });
    }
    const parents = Array.isArray(present.parents) ? present.parents : [];
    const move = !parents.includes(parentFolderId);
    const parameters = new URLSearchParams({ fields: FILE_FIELDS });
    if (move) {
      parameters.set("addParents", parentFolderId);
      if (parents.length > 0) parameters.set("removeParents", parents.join(","));
    }
    if (present.name === name && !move) return Object.freeze({ id: present.id, created: false, replaced: false, targetFileId });
    const response = await authorizedFetch(`${DRIVE_API}/files/${encodeURIComponent(present.id)}?${parameters}`, {
      method: "PATCH", headers: { "content-type": "application/json; charset=UTF-8" }, body: JSON.stringify({ name }),
    });
    if (!response.ok) await providerError(response, "shortcut projection reconciliation");
    return Object.freeze({ id: present.id, created: false, replaced: false, targetFileId });
  }

  async function reconcileFolder({ projectionKey, name, parentFolderId } = {}) {
    projectionKey = objectKey(projectionKey);
    if (!finite(name, 512) || !finite(parentFolderId, 1024)) {
      throw new TypeError("folder name and parent folder id are required");
    }
    if (parentFolderId !== rootFolderId) {
      const parent = await fileMetadata(parentFolderId);
      if (!parent || parent.mimeType !== DRIVE_FOLDER_MEDIA_TYPE || parent.appProperties?.rceRootHash !== rootHash
        || parent.appProperties?.rceClass !== "folder-projection") {
        throw new GoogleDriveCustodyError("foreign-folder-parent", "folder projection parent is not the custody root or a managed folder projection",
          { parentFolderId });
      }
      decodedProjectionKey(parent);
    }
    const present = await locateProjection(projectionKey, "folder-projection", DRIVE_FOLDER_MEDIA_TYPE);
    if (!present) {
      const body = { name, mimeType: DRIVE_FOLDER_MEDIA_TYPE, parents: [parentFolderId],
        description: projectionDescription(projectionKey), appProperties: {
          rceRootHash: rootHash, rceClass: "folder-projection", rceProjectionHash: keyHash(projectionKey),
        } };
      const response = await authorizedFetch(`${DRIVE_API}/files?fields=${encodeURIComponent(FILE_FIELDS)}`, {
        method: "POST", headers: { "content-type": "application/json; charset=UTF-8" }, body: JSON.stringify(body),
      });
      if (!response.ok) await providerError(response, "folder projection creation");
      const created = await response.json();
      const createdParents = Array.isArray(created.parents) ? created.parents : [];
      if (created.mimeType !== DRIVE_FOLDER_MEDIA_TYPE || created.appProperties?.rceRootHash !== rootHash
        || created.appProperties?.rceClass !== "folder-projection" || decodedProjectionKey(created) !== projectionKey
        || created.name !== name || createdParents.length !== 1 || createdParents[0] !== parentFolderId) {
        throw new GoogleDriveCustodyError("provider-invalid", "Drive returned an invalid managed folder projection", { fileId: created.id });
      }
      return Object.freeze({ id: created.id, created: true, renamed: false, moved: false, parentFolderId });
    }
    const parents = Array.isArray(present.parents) ? present.parents : [];
    const moved = !parents.includes(parentFolderId) || parents.length !== 1;
    const renamed = present.name !== name;
    if (!moved && !renamed) {
      return Object.freeze({ id: present.id, created: false, renamed: false, moved: false, parentFolderId });
    }
    const parameters = new URLSearchParams({ fields: FILE_FIELDS });
    if (moved) {
      parameters.set("addParents", parentFolderId);
      if (parents.length > 0) parameters.set("removeParents", parents.join(","));
    }
    const response = await authorizedFetch(`${DRIVE_API}/files/${encodeURIComponent(present.id)}?${parameters}`, {
      method: "PATCH", headers: { "content-type": "application/json; charset=UTF-8" }, body: JSON.stringify({ name }),
    });
    if (!response.ok) await providerError(response, "folder projection reconciliation");
    const reconciled = await response.json();
    const reconciledParents = Array.isArray(reconciled.parents) ? reconciled.parents : [];
    if (reconciled.mimeType !== DRIVE_FOLDER_MEDIA_TYPE || reconciled.appProperties?.rceRootHash !== rootHash
      || reconciled.appProperties?.rceClass !== "folder-projection" || decodedProjectionKey(reconciled) !== projectionKey
      || reconciled.name !== name || reconciledParents.length !== 1 || reconciledParents[0] !== parentFolderId) {
      throw new GoogleDriveCustodyError("provider-invalid", "Drive returned an invalid reconciled folder projection", { fileId: present.id });
    }
    return Object.freeze({ id: present.id, created: false, renamed, moved, parentFolderId });
  }

  async function putImmutable(key, value) {
    key = objectKey(key);
    const present = await locate(key);
    if (present) {
      if (present.appProperties?.rceClass !== "immutable" || present.appProperties?.rceSha256 !== value.sha256
        || Number(present.size) !== value.byteLength) {
        throw new GoogleDriveCustodyError("immutable-key-collision", "Drive immutable key already names different content");
      }
      return Object.freeze({ conflict: false, existed: true, etag: String(present.version) });
    }
    const file = await resumableUpload({ key, value, current: false });
    return Object.freeze({ conflict: false, existed: false, etag: String(file.version) });
  }

  async function putImmutableCatalogRecord(key, value) {
    key = objectKey(key); value = catalogRecordDeclaration(value);
    const present = await locate(key);
    if (present) {
      if (present.appProperties?.rceClass !== "immutable" || present.appProperties?.rceSha256 !== value.sha256
        || Number(present.size) !== value.byteLength) {
        throw new GoogleDriveCustodyError("immutable-key-collision", "Drive immutable key already names different content");
      }
      assertCatalogRecordFile(present, key, value, false);
      return Object.freeze({ conflict: false, existed: true, etag: String(present.version) });
    }
    const file = await multipartCatalogRecordUpload({ key, value, current: false });
    return Object.freeze({ conflict: false, existed: false, etag: String(file.version) });
  }

  async function head(key) {
    const file = await locate(objectKey(key));
    return file ? normalized(file) : null;
  }

  async function get(key, { range } = {}) {
    const file = await locate(objectKey(key));
    if (!file) return null;
    const headers = range ? { Range: `bytes=${range.start}-${range.endExclusive - 1}` } : {};
    const response = await authorizedFetch(`${DRIVE_API}/files/${encodeURIComponent(file.id)}?alt=media`, { headers });
    if (response.status === 404) return null;
    if (!response.ok && response.status !== 206) await providerError(response, "download");
    return normalized(file, response.body ?? Buffer.from(await response.arrayBuffer()));
  }

  async function putCurrent(key, value, { expectedEtag, ifNoneMatch = false } = {}) {
    key = objectKey(key);
    const present = await locate(key);
    if ((ifNoneMatch && present) || (expectedEtag !== undefined && String(present?.version) !== String(expectedEtag))) {
      return Object.freeze({ conflict: true, etag: present ? String(present.version) : null });
    }
    if (present && present.appProperties?.rceClass !== "current") {
      throw new GoogleDriveCustodyError("class-mismatch", "mutable coordinate is occupied by immutable content");
    }
    const file = await resumableUpload({ file: present, key, value, current: true });
    return Object.freeze({ conflict: false, etag: String(file.version) });
  }

  async function putCurrentCatalogRecord(key, value, { expectedEtag, ifNoneMatch = false } = {}) {
    key = objectKey(key); value = catalogRecordDeclaration(value);
    const present = await locate(key);
    if ((ifNoneMatch && present) || (expectedEtag !== undefined && String(present?.version) !== String(expectedEtag))) {
      return Object.freeze({ conflict: true, etag: present ? String(present.version) : null });
    }
    if (present && present.appProperties?.rceClass !== "current") {
      throw new GoogleDriveCustodyError("class-mismatch", "mutable coordinate is occupied by immutable content");
    }
    const file = await multipartCatalogRecordUpload({ file: present, key, value, current: true });
    return Object.freeze({ conflict: false, etag: String(file.version) });
  }

  async function deleteCurrent(key, { expectedEtag } = {}) {
    key = objectKey(key);
    const present = await locate(key);
    if (!present) return Object.freeze({ conflict: false, deleted: false });
    if (expectedEtag !== undefined && String(present.version) !== String(expectedEtag)) {
      return Object.freeze({ conflict: true, deleted: false, etag: String(present.version) });
    }
    if (present.appProperties?.rceClass !== "current") throw new GoogleDriveCustodyError("class-mismatch", "immutable content cannot be deleted as a current projection");
    return Object.freeze({ conflict: false, deleted: await deleteFile(present.id) });
  }

  async function list(prefix = "") {
    if (typeof prefix !== "string") throw new TypeError("prefix must be a string");
    const query = `'${rootFolderId.replaceAll("'", "\\'")}' in parents and trashed = false and appProperties has { key='rceClass' and value='current' }`;
    const files = await listFiles(query), output = [];
    for (const file of files) {
      const key = decodedKey(file);
      if (key.startsWith(prefix)) output.push(Object.freeze({ key, ...normalized(file) }));
    }
    return output.sort((left, right) => left.key.localeCompare(right.key));
  }

  return Object.freeze({ putImmutable, putImmutableCatalogRecord, get, head,
    putCurrent, putCurrentCatalogRecord, deleteCurrent, list,
    stage, getStaged, promoteStaged, deleteStaged,
    findPayload, reconcileFolder, reconcileShortcut });
}

export const GOOGLE_DRIVE_RESUMABLE_UPLOAD_QUANTUM_BYTES = QUANTUM;
export const GOOGLE_DRIVE_DEFAULT_UPLOAD_CHUNK_BYTES = DEFAULT_UPLOAD_CHUNK_BYTES;
