import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { retryWithBackoff } from "@red-cup-engineering/javascript-node-services-section/retry";

const CENSUS_SCHEMAS = new Set(["migration-census/v1", "enumerated-migration-census/v1"]);
const DISPOSITION_SCHEMA = "content-migration-disposition/v1";
const SHA256 = /^[a-f0-9]{64}$/u;
const TRANSIENT_CODES = new Set(["upload-recovery-exhausted",
  "rclone-command-failed", "credential-unavailable", "ECONNRESET", "ECONNREFUSED",
  "EHOSTUNREACH", "ENETUNREACH", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_SOCKET"]);
const DEFAULT_RETRY_POLICY = Object.freeze({ maxAttempts: 8, baseDelayMilliseconds: 2_000,
  maximumDelayMilliseconds: 300_000 });

function compareText(left, right) { return left < right ? -1 : left > right ? 1 : 0; }

function within(path, parent) {
  const difference = relative(parent, path);
  return difference === "" || (!difference.startsWith(`..${sep}`) && difference !== ".."
    && !isAbsolute(difference));
}

function requiredObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} is required`);
  return value;
}

function requiredText(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${label} is required`);
  return value;
}

function jsonSafe(value, seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("migration evidence contains a non-finite number");
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((entry) => jsonSafe(entry, seen));
  if (!value || typeof value !== "object") throw new TypeError("migration evidence is not JSON-safe");
  if (seen.has(value)) throw new TypeError("migration evidence contains a cycle");
  seen.add(value);
  const output = {};
  for (const key of Object.keys(value).sort(compareText)) {
    if (value[key] !== undefined) output[key] = jsonSafe(value[key], seen);
  }
  seen.delete(value);
  return output;
}

async function* bytes(source) {
  if (typeof source === "string" || source instanceof Uint8Array) { yield Buffer.from(source); return; }
  if (source?.getReader) {
    const reader = source.getReader();
    try { for (;;) { const item = await reader.read(); if (item.done) break; yield Buffer.from(item.value); } }
    finally { reader.releaseLock(); }
    return;
  }
  if (source?.[Symbol.asyncIterator]) { for await (const chunk of source) yield Buffer.from(chunk); return; }
  if (source?.[Symbol.iterator]) { for (const chunk of source) yield Buffer.from(chunk); return; }
  throw new TypeError("storage returned an unreadable object body");
}

function remoteCommitment(value, label) {
  if (!value || value.deleted || !SHA256.test(value.sha256)
    || !Number.isSafeInteger(value.byteLength) || value.byteLength < 0) {
    throw new Error(`${label} lacks a valid SHA-256 and byte-length commitment`);
  }
  return value;
}

function assertCommitment(value, file, label) {
  const commitment = remoteCommitment(value, label);
  if (commitment.sha256 !== file.sha256 || commitment.byteLength !== file.byteLength) {
    throw new Error(`${label} does not match census bytes for ${file.path}`);
  }
  return commitment;
}

function statWitness(stat) {
  return { byteLength: Number(stat.size), modifiedNanoseconds: stat.mtimeNs.toString(),
    changedNanoseconds: stat.ctimeNs.toString(), device: stat.dev.toString(), inode: stat.ino.toString() };
}

function sameWitness(left, right) {
  return Object.keys(left).every((key) => left[key] === right[key]);
}

function coordinate(bucket, key) { return `${bucket.length}:${bucket}${key}`; }

function dispositionCoordinate(record) {
  const destination = record?.destination ?? record?.remote;
  return typeof destination?.bucket === "string" && typeof destination?.key === "string"
    ? { bucket: destination.bucket, key: destination.key } : null;
}

function recordHash(record) { return record?.source?.sha256 ?? record?.sha256 ?? null; }

function retryPolicy(value = DEFAULT_RETRY_POLICY) {
  requiredObject(value, "retryPolicy");
  const policy = { maxAttempts: value.maxAttempts ?? DEFAULT_RETRY_POLICY.maxAttempts,
    baseDelayMilliseconds: value.baseDelayMilliseconds ?? DEFAULT_RETRY_POLICY.baseDelayMilliseconds,
    maximumDelayMilliseconds: value.maximumDelayMilliseconds ?? DEFAULT_RETRY_POLICY.maximumDelayMilliseconds };
  if (!Number.isSafeInteger(policy.maxAttempts) || policy.maxAttempts < 1 || policy.maxAttempts > 100) {
    throw new RangeError("retryPolicy.maxAttempts must be 1 through 100");
  }
  for (const name of ["baseDelayMilliseconds", "maximumDelayMilliseconds"]) {
    if (!Number.isSafeInteger(policy[name]) || policy[name] < 0 || policy[name] > 3_600_000) {
      throw new RangeError(`retryPolicy.${name} must be 0 through 3600000`);
    }
  }
  if (policy.maximumDelayMilliseconds < policy.baseDelayMilliseconds) {
    throw new RangeError("retryPolicy.maximumDelayMilliseconds must not be less than its base delay");
  }
  return Object.freeze(policy);
}

function transientFailure(error) {
  const status = Number(error?.evidence?.status);
  if (status === 408 || status === 429 || status >= 500
    || (status === 403 && error?.code === "provider-refused")) return true;
  const code = error?.code ?? error?.cause?.code;
  return error?.retryable === true || TRANSIENT_CODES.has(code);
}

function priorTransferSatisfies(record, item, head, verificationPolicy) {
  if (record?.schemaVersion !== DISPOSITION_SCHEMA || record.status !== "verified"
    || record.sourcePath !== item.file.path || record.source?.sha256 !== item.file.sha256
    || record.source?.byteLength !== item.file.byteLength
    || record.destination?.bucket !== item.destination.bucket || record.destination?.key !== item.destination.key
    || record.remote?.sha256 !== head.sha256 || record.remote?.byteLength !== head.byteLength
    || (record.remote?.generation ?? null) !== (head.generation ?? null)) return false;
  const priorVerification = record.remote?.evidence?.verificationPolicy;
  if (verificationPolicy === "full-readback") {
    const priorReadback = record.remote?.evidence?.readback;
    if (priorVerification !== "full-readback" || priorReadback?.sha256 !== item.file.sha256
      || priorReadback?.byteLength !== item.file.byteLength) return false;
  }
  return true;
}

function priorDispositionSatisfies(record, item, head, verificationPolicy, projectionPhase) {
  return priorTransferSatisfies(record, item, head, verificationPolicy)
    && (projectionPhase !== "inline" || record.projection?.status === "projected");
}

/**
 * Move a completed census into object storage without mutating its source tree.
 * The verification policy is deliberately mandatory: callers must choose whether
 * a remote commitment is enough or every payload is read back and hashed.
 */
export async function runContentMigration({ census: offeredCensus, workspaceRoot: offeredWorkspaceRoot,
  storage: offeredStorage, libraryProjector = null, route: offeredRoute,
  existingDispositions = [], verificationPolicy, onProgress = async () => {},
  onDisposition = async () => {}, projectionPhase = "inline",
  retryPolicy: offeredRetryPolicy = DEFAULT_RETRY_POLICY,
  wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds)) } = {}) {
  const census = requiredObject(offeredCensus, "census");
  if (!CENSUS_SCHEMAS.has(census.schemaVersion) || !Array.isArray(census.files)) {
    throw new TypeError(`census must use one of ${[...CENSUS_SCHEMAS].join(", ")}`);
  }
  if (census.pathMode !== "absolute" && census.pathMode !== "workspace-relative") {
    throw new TypeError('census.pathMode must be "absolute" or "workspace-relative"');
  }
  const storage = requiredObject(offeredStorage, "storage");
  for (const operation of ["putObject", "copyObject", "headObject", "getObject"]) {
    if (typeof storage[operation] !== "function") throw new TypeError(`storage.${operation} is required`);
  }
  if (typeof offeredRoute !== "function") throw new TypeError("route is required");
  if (!Array.isArray(existingDispositions)) throw new TypeError("existingDispositions must be an array");
  if (verificationPolicy !== "remote-commitment" && verificationPolicy !== "full-readback") {
    throw new TypeError('verificationPolicy must be "remote-commitment" or "full-readback"');
  }
  if (typeof onProgress !== "function") throw new TypeError("onProgress must be a function");
  if (typeof onDisposition !== "function") throw new TypeError("onDisposition must be a function");
  if (projectionPhase !== "inline" && projectionPhase !== "deferred") {
    throw new TypeError('projectionPhase must be "inline" or "deferred"');
  }
  if (typeof wait !== "function") throw new TypeError("wait must be a function");
  const admittedRetryPolicy = retryPolicy(offeredRetryPolicy);
  if (libraryProjector !== null && typeof libraryProjector?.reconcileObject !== "function") {
    throw new TypeError("libraryProjector.reconcileObject is required");
  }

  const workspaceRoot = resolve(requiredText(offeredWorkspaceRoot, "workspaceRoot"));
  const realWorkspaceRoot = await realpath(workspaceRoot);
  const files = [...census.files].sort((left, right) => compareText(left.path, right.path));
  const planned = [];
  const claimed = new Map();
  for (const file of files) {
    requiredText(file?.path, "census file path");
    if (!SHA256.test(file.sha256) || !Number.isSafeInteger(file.byteLength) || file.byteLength < 0) {
      throw new TypeError(`census file ${file.path} has an invalid byte commitment`);
    }
    const sourcePath = resolve(census.pathMode === "absolute" ? file.path : workspaceRoot, file.path);
    if (!within(sourcePath, workspaceRoot)) throw new RangeError(`census path lies outside workspaceRoot: ${file.path}`);
    const actualPath = await realpath(sourcePath);
    if (!within(actualPath, realWorkspaceRoot)) throw new RangeError(`census path resolves outside workspaceRoot: ${file.path}`);
    const present = await lstat(sourcePath, { bigint: true });
    if (!present.isFile()) throw new Error(`source is no longer a regular file: ${file.path}`);
    if (Number(present.size) !== file.byteLength) throw new Error(`source changed since census: ${file.path}`);
    const destination = requiredObject(await offeredRoute(file, census), `route for ${file.path}`);
    const bucket = requiredText(destination.bucket, `route bucket for ${file.path}`);
    const key = requiredText(destination.key, `route key for ${file.path}`);
    const identity = coordinate(bucket, key), prior = claimed.get(identity);
    if (prior && prior.sha256 !== file.sha256) {
      throw new Error(`route collision: ${bucket}/${key} is claimed by different SHA-256 payloads`);
    }
    claimed.set(identity, file);
    planned.push({ file, sourcePath, destination: { bucket, key,
      contentType: destination.contentType ?? file.mediaTypeHint ?? "application/octet-stream",
      metadata: destination.metadata ?? {} } });
  }

  const byHash = new Map();
  for (const item of planned) {
    const group = byHash.get(item.file.sha256) ?? [];
    group.push(item);
    byHash.set(item.file.sha256, group);
  }
  const priorByHash = new Map();
  const priorBySource = new Map();
  for (const record of existingDispositions) {
    const digest = recordHash(record), location = dispositionCoordinate(record);
    if (!SHA256.test(digest ?? "") || !location) continue;
    const locations = priorByHash.get(digest) ?? [];
    if (!locations.some(({ bucket, key }) => bucket === location.bucket && key === location.key)) locations.push(location);
    priorByHash.set(digest, locations);
    if (typeof record?.sourcePath === "string") priorBySource.set(record.sourcePath, record);
  }

  // The retry loop and its backoff delay are owned by the canonical
  // @red-cup-engineering/javascript-node-services-section/retry capability; this closure only
  // adapts one migration step's throwing `action(attempt)` to that capability's Result-shaped
  // operation contract and preserves this runner's onProgress event vocabulary unchanged.
  async function retrying(operation, action) {
    let attemptCount = 0;
    let pendingRetry = null; // {error, attempt} for the retry a canonical `delay` call is about to take
    const result = await retryWithBackoff({
      operation: async () => {
        attemptCount += 1;
        try { return { ok: true, value: await action(attemptCount) }; }
        catch (error) { return { ok: false, refusal: error }; }
      },
      isRetryable(error, attempt) {
        const retryable = transientFailure(error);
        if (retryable) pendingRetry = { error, attempt };
        return retryable;
      },
      maxAttempts: admittedRetryPolicy.maxAttempts,
      baseDelayMs: admittedRetryPolicy.baseDelayMilliseconds,
      backoffFactor: 2,
      maxDelayMs: admittedRetryPolicy.maximumDelayMilliseconds,
      delay: async (delayMilliseconds) => {
        const { error, attempt } = pendingRetry;
        await onProgress(jsonSafe({ event: "retry-scheduled", operation, attempt,
          nextAttempt: attempt + 1, delayMilliseconds,
          providerCode: typeof error?.code === "string" ? error.code : null,
          providerStatus: Number.isFinite(Number(error?.evidence?.status)) ? Number(error.evidence.status) : null }));
        await wait(delayMilliseconds);
      },
    });
    if (result.ok) return result.value;
    const { attempts, refusal: error } = result.refusal;
    if (transientFailure(error)) await onProgress(jsonSafe({ event: "retry-exhausted", operation, attempt: attempts }));
    throw error;
  }

  const dispositions = [];
  let completedSources = 0;
  for (const digest of [...byHash.keys()].sort(compareText)) {
    const group = byHash.get(digest);
    const canonical = group[0];
    let origin = null;
    const candidates = [...group.map(({ destination }) => destination), ...(priorByHash.get(digest) ?? [])];
    for (const candidate of candidates) {
      const head = await retrying("headObject", () => storage.headObject({ bucket: candidate.bucket, key: candidate.key }));
      if (head === null || head === undefined || head.deleted) continue;
      assertCommitment(head, canonical.file, `existing remote head ${candidate.bucket}/${candidate.key}`);
      origin = { bucket: candidate.bucket, key: candidate.key, head, resumed: true };
      break;
    }

    if (!origin) {
      const upload = await retrying("putObject", async (attempt) => {
        if (attempt > 1) {
          const retained = await storage.headObject({ bucket: canonical.destination.bucket, key: canonical.destination.key });
          if (retained && !retained.deleted) return { recoveredHead: assertCommitment(retained, canonical.file,
            `remote head after uncertain upload for ${canonical.file.path}`) };
        }
        const beforeStat = await lstat(canonical.sourcePath, { bigint: true });
        if (!beforeStat.isFile()) throw new Error(`source is no longer a regular file: ${canonical.file.path}`);
        const before = statWitness(beforeStat);
        if (before.byteLength !== canonical.file.byteLength) throw new Error(`source changed since census: ${canonical.file.path}`);
        const observed = createHash("sha256"); let observedBytes = 0;
        async function* witnessedBody() {
          for await (const chunk of createReadStream(canonical.sourcePath)) {
            observed.update(chunk); observedBytes += chunk.length; yield chunk;
          }
        }
        await onProgress(jsonSafe({ event: "upload-started", path: canonical.file.path,
          sha256: digest, byteLength: canonical.file.byteLength, attempt }));
        const result = await storage.putObject({ bucket: canonical.destination.bucket, key: canonical.destination.key,
          body: witnessedBody(), contentType: canonical.destination.contentType,
          metadata: canonical.destination.metadata, checksumSha256: digest });
        if (observedBytes !== canonical.file.byteLength || observed.digest("hex") !== digest) {
          throw new Error(`source bytes changed since census: ${canonical.file.path}`);
        }
        const after = statWitness(await lstat(canonical.sourcePath, { bigint: true }));
        if (!sameWitness(before, after)) throw new Error(`source changed during transfer: ${canonical.file.path}`);
        assertCommitment(result, canonical.file, `putObject result for ${canonical.file.path}`);
        return { result };
      });
      const result = upload.result;
      const head = upload.recoveredHead ?? assertCommitment(await retrying("headObject", () =>
        storage.headObject({ bucket: canonical.destination.bucket, key: canonical.destination.key })),
      canonical.file, `remote head for ${canonical.file.path}`);
      origin = { bucket: canonical.destination.bucket, key: canonical.destination.key,
        head, result, resumed: Boolean(upload.recoveredHead) };
    }

    for (const item of group) {
      const { bucket, key } = item.destination;
      let transferStatus;
      let mutation = null;
      let head = await retrying("headObject", () => storage.headObject({ bucket, key }));
      if (head && !head.deleted) {
        assertCommitment(head, item.file, `remote head ${bucket}/${key}`);
        transferStatus = bucket === origin.bucket && key === origin.key && !origin.resumed ? "uploaded" : "resumed";
        mutation = bucket === origin.bucket && key === origin.key ? origin.result ?? null : null;
      } else {
        mutation = await retrying("copyObject", async (attempt) => {
          if (attempt > 1) {
            const retained = await storage.headObject({ bucket, key });
            if (retained && !retained.deleted) return assertCommitment(retained, item.file,
              `remote head after uncertain copy for ${item.file.path}`);
          }
          return storage.copyObject({ sourceBucket: origin.bucket,
            sourceKey: origin.key, bucket, key, contentType: item.destination.contentType,
            metadata: item.destination.metadata });
        });
        assertCommitment(mutation, item.file, `copyObject result for ${item.file.path}`);
        head = await retrying("headObject", () => storage.headObject({ bucket, key }));
        assertCommitment(head, item.file, `remote head for ${item.file.path}`);
        transferStatus = "copied";
      }

      const prior = priorBySource.get(item.file.path);
      const retainedTransfer = priorTransferSatisfies(prior, item, head, verificationPolicy);
      let readback = null;
      if (verificationPolicy === "full-readback") {
        readback = retainedTransfer ? prior.remote.evidence.readback : await retrying("full-readback", async () => {
          const retained = await storage.getObject({ bucket, key });
          if (!retained) throw new Error(`full readback found no remote object for ${item.file.path}`);
          if (retained.sha256 !== undefined || retained.byteLength !== undefined) {
            assertCommitment({ sha256: retained.sha256 ?? head.sha256,
              byteLength: retained.objectByteLength ?? retained.byteLength }, item.file,
            `getObject commitment for ${item.file.path}`);
          }
          const hash = createHash("sha256"); let byteLength = 0;
          for await (const chunk of bytes(retained.body)) { hash.update(chunk); byteLength += chunk.length; }
          const witness = { sha256: hash.digest("hex"), byteLength };
          return assertCommitment(witness, item.file, `full readback for ${item.file.path}`);
        });
      }

      const retainedDisposition = priorDispositionSatisfies(prior, item, head, verificationPolicy, projectionPhase);
      let projection;
      if (projectionPhase === "deferred") projection = retainedDisposition && prior.projection?.status === "projected"
        ? prior.projection : { status: "deferred" };
      else if (retainedDisposition) projection = prior.projection;
      else projection = libraryProjector
        ? jsonSafe(await retrying("library-projection", () => libraryProjector.reconcileObject({ bucket, key })))
        : null;
      const disposition = jsonSafe({ schemaVersion: DISPOSITION_SCHEMA, status: "verified",
        transferStatus, sourcePath: item.file.path,
        source: { sha256: item.file.sha256, byteLength: item.file.byteLength },
        destination: { bucket, key, contentType: item.destination.contentType,
          metadata: item.destination.metadata }, canonicalSourcePath: canonical.file.path,
        remote: { sha256: head.sha256, byteLength: head.byteLength,
          generation: head.generation ?? null, etag: head.etag ?? null,
          evidence: { mutation, head, readback, verificationPolicy } }, projection });
      dispositions.push(disposition);
      if (!retainedDisposition) await onDisposition(disposition);
      completedSources += 1;
      await onProgress(jsonSafe({ event: "source-verified", path: item.file.path,
        bucket, key, sha256: digest, transferStatus,
        journalStatus: retainedDisposition ? "retained" : "appended",
        completedSources, totalSources: planned.length }));
    }
  }
  dispositions.sort((left, right) => compareText(left.sourcePath, right.sourcePath));
  return Object.freeze(dispositions.map((record) => Object.freeze(record)));
}

export function createContentMigrationRunner(options = {}) {
  return Object.freeze({ run: (input = {}) => runContentMigration({ ...options, ...input }) });
}
