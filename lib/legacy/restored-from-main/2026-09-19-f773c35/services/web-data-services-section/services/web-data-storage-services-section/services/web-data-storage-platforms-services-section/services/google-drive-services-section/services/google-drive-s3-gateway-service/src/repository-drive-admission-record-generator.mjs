import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, open, readFile, rename, lstat } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

import { contentTypeForMigration } from "./561-group-content-migration-policy.mjs";
import {
  decideRepositoryDriveAdmission,
  REPOSITORY_DRIVE_ADMISSION_CLASSIFICATIONS,
  REPOSITORY_DRIVE_ADMISSION_POLICY_SCHEMA,
  REPOSITORY_LARGE_FILE_THRESHOLD_BYTES,
} from "./repository-drive-admission-policy.mjs";
import { readCommittedRepositoryMaterialCensus } from "./repository-material-record-generator.mjs";

const RECORD_SET_SCHEMA = "repository-drive-admission-record-set/v1";
const DECISIONS_SCHEMA = "repository-drive-admission-decisions/v1";
const CENSUS_SCHEMA = "enumerated-migration-census/v1";
const SHA256 = /^[a-f0-9]{64}$/u;
const DEFAULT_NAMES = Object.freeze({
  decisions: "2026-08-20-repository-drive-admission-decisions.json.gz",
  census: "2026-08-20-repository-large-file-migration-census.json.gz",
  manifest: "2026-08-20-repository-drive-admission-record-set.json",
});

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

function safeName(value, label) {
  if (typeof value !== "string" || value.length === 0 || basename(value) !== value
    || value === "." || value === ".." || value.includes("\0")) {
    throw new TypeError(`${label} must be one plain filename`);
  }
  return value;
}

function within(path, parent) {
  const difference = relative(parent, path);
  return difference === "" || (!difference.startsWith(`..${sep}`) && difference !== ".." && !isAbsolute(difference));
}

async function atomicReplace(path, bytes) {
  const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
  const handle = await open(temporary, "wx", 0o600);
  try { await handle.writeFile(bytes); await handle.sync(); }
  catch (error) {
    await handle.close();
    const { rm } = await import("node:fs/promises");
    await rm(temporary, { force: true });
    throw error;
  }
  await handle.close();
  await rename(temporary, path);
}

function stableWitness(stat) {
  return Object.freeze({
    byteLength: Number(stat.size),
    modifiedNanoseconds: stat.mtimeNs.toString(),
    changedNanoseconds: stat.ctimeNs.toString(),
    device: stat.dev.toString(),
    inode: stat.ino.toString(),
  });
}

function sameWitness(left, right) {
  return Object.keys(left).every((key) => left[key] === right[key]);
}

async function verifyFile(workspace, file) {
  const path = resolve(workspace, file.path);
  if (!within(path, workspace)) throw new RangeError(`admitted source lies outside workspace: ${file.path}`);
  const beforeStat = await lstat(path, { bigint: true });
  if (!beforeStat.isFile()) throw new Error(`admitted source is not a regular file: ${file.path}`);
  const before = stableWitness(beforeStat);
  if (before.byteLength !== file.byteLength) throw new Error(`admitted source changed size: ${file.path}`);
  const hash = createHash("sha256"); let byteLength = 0;
  for await (const chunk of createReadStream(path)) { hash.update(chunk); byteLength += chunk.length; }
  const after = stableWitness(await lstat(path, { bigint: true }));
  if (!sameWitness(before, after) || byteLength !== file.byteLength || hash.digest("hex") !== file.sha256) {
    throw new Error(`admitted source changed after the repository census: ${file.path}`);
  }
  return Object.freeze({
    path: file.path,
    byteLength: file.byteLength,
    sha256: file.sha256,
    extension: file.extension,
    mediaTypeHint: contentTypeForMigration(file.path, null),
    mtime: file.mtime,
    materialFamily: file.materialFamily,
    repositoryRelation: file.repositoryRelation,
    admission: file.admission,
  });
}

async function mapConcurrent(values, concurrency, operation) {
  const output = new Array(values.length); let cursor = 0;
  async function worker() {
    for (;;) {
      const index = cursor; cursor += 1;
      if (index >= values.length) return;
      output[index] = await operation(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return output;
}

function summarize(items, classification) {
  const grouped = new Map();
  for (const item of items) {
    const key = classification(item); const value = grouped.get(key) ?? { fileCount: 0, byteLength: 0 };
    value.fileCount += 1; value.byteLength += item.byteLength; grouped.set(key, value);
  }
  return [...grouped.entries()].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([name, value]) => Object.freeze({ classification: name, ...value }));
}

function duplicates(files) {
  const byHash = new Map();
  for (const file of files) { const group = byHash.get(file.sha256) ?? []; group.push(file); byHash.set(file.sha256, group); }
  return [...byHash.entries()].filter(([, group]) => group.length > 1)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([digest, group]) => Object.freeze({ sha256: digest, byteLength: group[0].byteLength,
      paths: group.map(({ path }) => path).sort(), redundantCopies: group.length - 1,
      redundantBytes: group[0].byteLength * (group.length - 1) }));
}

function retainedArtifact(name, value) {
  const content = jsonBytes(value); const compressed = gzipSync(content, { level: 9, mtime: 0 });
  return Object.freeze({ name, content, compressed, contentSha256: sha256(content), gzipSha256: sha256(compressed) });
}

export async function generateRepositoryDriveAdmissionRecords({
  workspaceRoot = process.cwd(),
  repositoryMaterialManifestPath,
  outputDirectory,
  write = false,
  names = DEFAULT_NAMES,
  thresholdBytes = REPOSITORY_LARGE_FILE_THRESHOLD_BYTES,
  hashConcurrency = 8,
  onFileVerified = async () => {},
} = {}) {
  const workspace = resolve(workspaceRoot);
  if (typeof repositoryMaterialManifestPath !== "string" || repositoryMaterialManifestPath.length === 0) {
    throw new TypeError("repositoryMaterialManifestPath is required");
  }
  if (typeof outputDirectory !== "string" || outputDirectory.length === 0) throw new TypeError("outputDirectory is required");
  if (typeof write !== "boolean") throw new TypeError("write must be boolean");
  if (!Number.isSafeInteger(hashConcurrency) || hashConcurrency < 1 || hashConcurrency > 32) {
    throw new RangeError("hashConcurrency must be 1 through 32");
  }
  const filenames = {
    decisions: safeName(names?.decisions, "names.decisions"),
    census: safeName(names?.census, "names.census"),
    manifest: safeName(names?.manifest, "names.manifest"),
  };
  if (new Set(Object.values(filenames)).size !== 3) throw new RangeError("record filenames must be distinct");
  const source = await readCommittedRepositoryMaterialCensus({ manifestPath: repositoryMaterialManifestPath });
  const candidates = source.census.files.filter(({ proposedDisposition }) =>
    proposedDisposition.classification === REPOSITORY_DRIVE_ADMISSION_CLASSIFICATIONS.candidate);
  const decisionEntries = candidates.map((file) => Object.freeze({
    path: file.path, byteLength: file.byteLength, sha256: file.sha256, materialFamily: file.materialFamily,
    repositoryRelation: file.repositoryRelation, pathRoles: file.pathRoles,
    decision: decideRepositoryDriveAdmission(file, { thresholdBytes }),
  }));
  const decisionSummary = summarize(decisionEntries, ({ decision }) => decision.classification);
  const decisions = Object.freeze({
    schemaVersion: DECISIONS_SCHEMA,
    policy: Object.freeze({ schemaVersion: REPOSITORY_DRIVE_ADMISSION_POLICY_SCHEMA,
      candidateClassification: REPOSITORY_DRIVE_ADMISSION_CLASSIFICATIONS.candidate, thresholdBytes }),
    sourceRepositoryMaterialCensus: Object.freeze({
      manifestFilename: basename(resolve(repositoryMaterialManifestPath)),
      contentSha256: source.evidence.censusContentSha256,
      gzipSha256: source.evidence.censusGzipSha256,
    }),
    copyAuthorized: true,
    sourceRetirementAuthorized: false,
    summary: Object.freeze({ reviewCandidateCount: decisionEntries.length,
      reviewCandidateBytes: decisionEntries.reduce((sum, entry) => sum + entry.byteLength, 0),
      decisionSummary }),
    decisions: decisionEntries,
  });
  const decisionsArtifact = retainedArtifact(filenames.decisions, decisions);
  const admittedCandidates = candidates.filter((file) =>
    decideRepositoryDriveAdmission(file, { thresholdBytes }).copyAuthorized)
    .map((file) => Object.freeze({ ...file, admission: decideRepositoryDriveAdmission(file, { thresholdBytes }) }));
  let completed = 0;
  const files = await mapConcurrent(admittedCandidates, hashConcurrency, async (file) => {
    const verified = await verifyFile(workspace, file); completed += 1;
    await onFileVerified(Object.freeze({ completed, total: admittedCandidates.length, path: file.path }));
    return verified;
  });
  files.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const exactDuplicateGroups = duplicates(files);
  const totalBytes = files.reduce((sum, file) => sum + file.byteLength, 0);
  const redundantBytes = exactDuplicateGroups.reduce((sum, group) => sum + group.redundantBytes, 0);
  const census = Object.freeze({
    schemaVersion: CENSUS_SCHEMA,
    pathMode: "workspace-relative",
    workspaceRoot: workspace,
    selection: Object.freeze({ decisionsContentSha256: decisionsArtifact.contentSha256,
      policySchemaVersion: REPOSITORY_DRIVE_ADMISSION_POLICY_SCHEMA,
      thresholdBytes,
      copyAuthorized: true,
      sourceRetirementAuthorized: false }),
    files,
    exactDuplicateGroups,
    unstableFiles: Object.freeze([]),
    nonRegularEntries: Object.freeze([]),
    excludedEntries: Object.freeze([]),
    summary: Object.freeze({ regularFileCount: files.length, unstableFileCount: 0,
      nonRegularEntryCount: 0, excludedEntryCount: 0, totalBytes,
      uniquePayloadBytes: totalBytes - redundantBytes, redundantBytes }),
  });
  const censusArtifact = retainedArtifact(filenames.census, census);
  const manifest = Object.freeze({
    schemaVersion: RECORD_SET_SCHEMA,
    copyAuthorized: true,
    sourceRetirementAuthorized: false,
    sourceRepositoryMaterialCensus: decisions.sourceRepositoryMaterialCensus,
    decisions: Object.freeze({ filename: filenames.decisions, schemaVersion: DECISIONS_SCHEMA,
      contentSha256: decisionsArtifact.contentSha256, gzipSha256: decisionsArtifact.gzipSha256,
      gzipByteLength: decisionsArtifact.compressed.length }),
    census: Object.freeze({ filename: filenames.census, schemaVersion: CENSUS_SCHEMA,
      contentSha256: censusArtifact.contentSha256, gzipSha256: censusArtifact.gzipSha256,
      gzipByteLength: censusArtifact.compressed.length }),
    summary: Object.freeze({ ...census.summary, reviewCandidateCount: decisions.summary.reviewCandidateCount,
      reviewCandidateBytes: decisions.summary.reviewCandidateBytes, decisionSummary }),
  });
  const manifestBytes = jsonBytes(manifest);
  if (write) {
    const directory = resolve(outputDirectory); await mkdir(directory, { recursive: true });
    await atomicReplace(resolve(directory, filenames.decisions), decisionsArtifact.compressed);
    await atomicReplace(resolve(directory, filenames.census), censusArtifact.compressed);
    await atomicReplace(resolve(directory, filenames.manifest), manifestBytes);
  }
  return Object.freeze({ write, outputDirectory: resolve(outputDirectory), manifest,
    artifacts: Object.freeze({
      decisions: Object.freeze({ filename: filenames.decisions, contentSha256: decisionsArtifact.contentSha256,
        gzipSha256: decisionsArtifact.gzipSha256, gzipByteLength: decisionsArtifact.compressed.length }),
      census: Object.freeze({ filename: filenames.census, contentSha256: censusArtifact.contentSha256,
        gzipSha256: censusArtifact.gzipSha256, gzipByteLength: censusArtifact.compressed.length }),
      manifest: Object.freeze({ filename: filenames.manifest, sha256: sha256(manifestBytes), byteLength: manifestBytes.length }),
    }) });
}

async function readArtifact(directory, commitment, schemaVersion, label) {
  const filename = safeName(commitment?.filename, `${label}.filename`);
  if (commitment?.schemaVersion !== schemaVersion || !SHA256.test(commitment.contentSha256)
    || !SHA256.test(commitment.gzipSha256) || !Number.isSafeInteger(commitment.gzipByteLength)
    || commitment.gzipByteLength < 1) throw new Error(`${label} commitment is invalid`);
  const compressed = await readFile(resolve(directory, filename));
  if (compressed.length !== commitment.gzipByteLength || sha256(compressed) !== commitment.gzipSha256) {
    throw new Error(`retained ${label} does not match its gzip commitment`);
  }
  let content;
  try { content = gunzipSync(compressed); } catch { throw new Error(`retained ${label} is not valid gzip`); }
  if (sha256(content) !== commitment.contentSha256) throw new Error(`expanded ${label} does not match its content commitment`);
  let value;
  try { value = JSON.parse(content.toString("utf8")); } catch { throw new Error(`expanded ${label} is invalid JSON`); }
  if (value?.schemaVersion !== schemaVersion) throw new Error(`expanded ${label} uses the wrong schema`);
  return Object.freeze({ filename, value: Object.freeze(value) });
}

export async function readCommittedRepositoryDriveAdmission({ manifestPath } = {}) {
  if (typeof manifestPath !== "string" || manifestPath.length === 0 || manifestPath.includes("\0")) {
    throw new TypeError("manifestPath is required");
  }
  const absoluteManifest = resolve(manifestPath); const directory = dirname(absoluteManifest);
  let manifest;
  try { manifest = JSON.parse((await readFile(absoluteManifest)).toString("utf8")); }
  catch { throw new Error("repository Drive-admission manifest is invalid JSON"); }
  if (manifest?.schemaVersion !== RECORD_SET_SCHEMA || manifest.copyAuthorized !== true
    || manifest.sourceRetirementAuthorized !== false) throw new Error("repository Drive-admission manifest is invalid");
  const sourceManifestPath = resolve(directory,
    safeName(manifest.sourceRepositoryMaterialCensus?.manifestFilename, "sourceRepositoryMaterialCensus.manifestFilename"));
  const source = await readCommittedRepositoryMaterialCensus({ manifestPath: sourceManifestPath });
  if (source.evidence.censusContentSha256 !== manifest.sourceRepositoryMaterialCensus.contentSha256
    || source.evidence.censusGzipSha256 !== manifest.sourceRepositoryMaterialCensus.gzipSha256) {
    throw new Error("repository Drive-admission source census commitment changed");
  }
  const retainedDecisions = await readArtifact(directory, manifest.decisions, DECISIONS_SCHEMA, "repository Drive-admission decisions");
  const retainedCensus = await readArtifact(directory, manifest.census, CENSUS_SCHEMA, "repository large-file migration census");
  const decisions = retainedDecisions.value; const census = retainedCensus.value;
  const thresholdBytes = decisions.policy?.thresholdBytes;
  if (decisions.policy?.schemaVersion !== REPOSITORY_DRIVE_ADMISSION_POLICY_SCHEMA
    || decisions.policy?.candidateClassification !== REPOSITORY_DRIVE_ADMISSION_CLASSIFICATIONS.candidate
    || !Number.isSafeInteger(thresholdBytes) || thresholdBytes < 1
    || decisions.copyAuthorized !== true || decisions.sourceRetirementAuthorized !== false
    || census.selection?.copyAuthorized !== true || census.selection?.sourceRetirementAuthorized !== false
    || census.selection?.policySchemaVersion !== decisions.policy.schemaVersion
    || census.selection?.thresholdBytes !== thresholdBytes
    || census.selection?.decisionsContentSha256 !== manifest.decisions.contentSha256
    || JSON.stringify(decisions.summary?.decisionSummary) !== JSON.stringify(manifest.summary?.decisionSummary)
    || decisions.summary?.reviewCandidateCount !== manifest.summary?.reviewCandidateCount
    || decisions.summary?.reviewCandidateBytes !== manifest.summary?.reviewCandidateBytes
    || census.summary?.regularFileCount !== manifest.summary?.regularFileCount
    || census.summary?.totalBytes !== manifest.summary?.totalBytes
    || census.summary?.uniquePayloadBytes !== manifest.summary?.uniquePayloadBytes
    || census.summary?.redundantBytes !== manifest.summary?.redundantBytes) {
    throw new Error("repository Drive-admission records contradict their manifest");
  }
  const sourceCandidates = source.census.files.filter(({ proposedDisposition }) =>
    proposedDisposition.classification === REPOSITORY_DRIVE_ADMISSION_CLASSIFICATIONS.candidate);
  const sourceByPath = new Map(sourceCandidates.map((file) => [file.path, file]));
  const decisionByPath = new Map();
  if (!Array.isArray(decisions.decisions) || decisions.decisions.length !== sourceCandidates.length) {
    throw new Error("repository Drive-admission decisions do not cover the source review queue");
  }
  for (const entry of decisions.decisions) {
    const sourceFile = sourceByPath.get(entry?.path);
    if (!sourceFile || decisionByPath.has(entry.path)
      || entry.byteLength !== sourceFile.byteLength || entry.sha256 !== sourceFile.sha256
      || entry.materialFamily !== sourceFile.materialFamily || entry.repositoryRelation !== sourceFile.repositoryRelation
      || JSON.stringify(entry.pathRoles) !== JSON.stringify(sourceFile.pathRoles)
      || JSON.stringify(entry.decision) !== JSON.stringify(decideRepositoryDriveAdmission(sourceFile, { thresholdBytes }))) {
      throw new Error(`repository Drive-admission decision contradicts source evidence: ${entry?.path ?? "(unknown)"}`);
    }
    decisionByPath.set(entry.path, entry);
  }
  const admittedPaths = new Set([...decisionByPath.values()]
    .filter(({ decision }) => decision.copyAuthorized).map(({ path }) => path));
  if (!Array.isArray(census.files) || admittedPaths.size !== census.files.length
    || census.files.some((file) => {
      const sourceFile = sourceByPath.get(file.path); const decision = decisionByPath.get(file.path);
      return !admittedPaths.has(file.path) || !sourceFile || !decision
        || file.sha256 !== sourceFile.sha256 || file.byteLength !== sourceFile.byteLength
        || file.materialFamily !== sourceFile.materialFamily
        || JSON.stringify(file.admission) !== JSON.stringify(decision.decision);
    })) {
    throw new Error("repository large-file census does not exactly match admitted decisions");
  }
  return Object.freeze({ manifest: Object.freeze(manifest), decisions, census,
    evidence: Object.freeze({ manifestPath: absoluteManifest,
      decisionsFilename: retainedDecisions.filename, decisionsContentSha256: manifest.decisions.contentSha256,
      censusFilename: retainedCensus.filename, censusContentSha256: manifest.census.contentSha256,
      censusGzipSha256: manifest.census.gzipSha256 }) });
}

export { DEFAULT_NAMES as REPOSITORY_DRIVE_ADMISSION_RECORD_NAMES };
