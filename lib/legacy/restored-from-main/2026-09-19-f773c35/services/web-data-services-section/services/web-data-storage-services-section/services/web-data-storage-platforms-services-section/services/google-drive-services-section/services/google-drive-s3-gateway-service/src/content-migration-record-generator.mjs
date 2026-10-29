import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

import { CONTENT_MIGRATION_SOURCE_ROOTS } from "./561-group-content-migration-policy.mjs";
import { createMigrationCensus } from "./migration-census.mjs";
import { createNearDuplicateCandidateReport } from "./near-duplicate-candidates.mjs";

const RECORD_SET_SCHEMA = "content-migration-record-set/v1";
const DEFAULT_NAMES = Object.freeze({
  census: "2026-08-20-content-migration-census.json.gz",
  candidates: "2026-08-20-near-duplicate-candidates.json.gz",
  manifest: "2026-08-20-content-migration-record-set.json",
});

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const SHA256 = /^[a-f0-9]{64}$/u;

function safeName(value, label) {
  if (typeof value !== "string" || value.length === 0 || basename(value) !== value
    || value === "." || value === ".." || value.includes("\0")) {
    throw new TypeError(`${label} must be one plain filename`);
  }
  return value;
}

async function atomicReplace(path, bytes) {
  const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } catch (error) {
    await handle.close();
    const { rm } = await import("node:fs/promises");
    await rm(temporary, { force: true });
    throw error;
  }
  await handle.close();
  await rename(temporary, path);
}

function retainedArtifact(name, content) {
  // A fixed gzip header and level make identical JSON yield identical bytes.
  const compressed = gzipSync(content, { level: 9, mtime: 0 });
  return Object.freeze({ name, content, compressed,
    contentSha256: sha256(content), gzipSha256: sha256(compressed) });
}

/**
 * Rebuild the closed 561 Group content census and its advisory candidate report.
 *
 * Dry-run is the default. A write publishes both gzip members first, then
 * atomically replaces a small manifest that commits to both byte sequences.
 * Readers can therefore reject an interrupted two-file replacement by checking
 * the manifest hashes; no filesystem offers one atomic rename for two files.
 */
export async function generateContentMigrationRecords({
  workspaceRoot = process.cwd(),
  outputDirectory,
  write = false,
  names = DEFAULT_NAMES,
  sources = CONTENT_MIGRATION_SOURCE_ROOTS,
  candidateOptions,
  onFileHashed,
} = {}) {
  const workspace = resolve(workspaceRoot);
  if (typeof outputDirectory !== "string" || outputDirectory.length === 0) {
    throw new TypeError("outputDirectory is required");
  }
  if (typeof write !== "boolean") throw new TypeError("write must be boolean");
  if (!Array.isArray(sources) || sources.length === 0) throw new TypeError("sources must be a non-empty array");
  const filenames = {
    census: safeName(names?.census, "names.census"),
    candidates: safeName(names?.candidates, "names.candidates"),
    manifest: safeName(names?.manifest, "names.manifest"),
  };
  if (new Set(Object.values(filenames)).size !== 3) throw new RangeError("record filenames must be distinct");

  const sourceRoots = sources.map((source) => {
    if (typeof source?.root !== "string" || source.root.length === 0) {
      throw new TypeError("every source requires a root");
    }
    return resolve(workspace, source.root);
  });
  const census = await createMigrationCensus({
    sourceRoots,
    pathMode: "workspace-relative",
    workspaceRoot: workspace,
    onFileHashed,
  });
  if (census.unstableFiles.length > 0 || census.nonRegularEntries.length > 0
    || census.excludedEntries.length > 0) {
    throw new Error("record generation refuses unstable, non-regular, or excluded entries");
  }
  const expectedRoots = sources.map(({ root }) => root).sort();
  if (JSON.stringify(census.sourceRoots) !== JSON.stringify(expectedRoots)) {
    throw new Error("census roots do not exactly match the closed source policy");
  }

  const candidates = createNearDuplicateCandidateReport(census, candidateOptions);
  const censusArtifact = retainedArtifact(filenames.census, jsonBytes(census));
  const candidateArtifact = retainedArtifact(filenames.candidates, jsonBytes(candidates));
  const manifest = Object.freeze({
    schemaVersion: RECORD_SET_SCHEMA,
    sourceRoots: census.sourceRoots,
    census: {
      filename: censusArtifact.name,
      schemaVersion: census.schemaVersion,
      contentSha256: censusArtifact.contentSha256,
      gzipSha256: censusArtifact.gzipSha256,
      gzipByteLength: censusArtifact.compressed.length,
    },
    candidates: {
      filename: candidateArtifact.name,
      schemaVersion: candidates.schemaVersion,
      sourceCensusContentSha256: censusArtifact.contentSha256,
      contentSha256: candidateArtifact.contentSha256,
      gzipSha256: candidateArtifact.gzipSha256,
      gzipByteLength: candidateArtifact.compressed.length,
    },
    summary: {
      regularFileCount: census.summary.regularFileCount,
      totalBytes: census.summary.totalBytes,
      uniquePayloadBytes: census.summary.uniquePayloadBytes,
      redundantBytes: census.summary.redundantBytes,
      exactDuplicateGroupCount: census.exactDuplicateGroups.length,
      nearDuplicateCandidateCount: candidates.summary.candidateCount,
    },
  });
  const manifestBytes = jsonBytes(manifest);

  if (write) {
    const directory = resolve(outputDirectory);
    await mkdir(directory, { recursive: true });
    await atomicReplace(resolve(directory, censusArtifact.name), censusArtifact.compressed);
    await atomicReplace(resolve(directory, candidateArtifact.name), candidateArtifact.compressed);
    // This is the commit point. A missing or hash-mismatched manifest is not a record set.
    await atomicReplace(resolve(directory, filenames.manifest), manifestBytes);
  }

  return Object.freeze({
    write,
    outputDirectory: resolve(outputDirectory),
    manifest,
    artifacts: Object.freeze({
      census: Object.freeze({ filename: censusArtifact.name, contentSha256: censusArtifact.contentSha256,
        gzipSha256: censusArtifact.gzipSha256, gzipByteLength: censusArtifact.compressed.length }),
      candidates: Object.freeze({ filename: candidateArtifact.name,
        contentSha256: candidateArtifact.contentSha256, gzipSha256: candidateArtifact.gzipSha256,
        gzipByteLength: candidateArtifact.compressed.length }),
      manifest: Object.freeze({ filename: filenames.manifest, byteLength: manifestBytes.length,
        sha256: sha256(manifestBytes) }),
    }),
  });
}

/**
 * Opens the record-set commit point and admits its census only after both the
 * retained gzip bytes and expanded JSON match the manifest commitments.
 */
export async function readCommittedMigrationCensus({ manifestPath } = {}) {
  if (typeof manifestPath !== "string" || manifestPath.length === 0 || manifestPath.includes("\0")) {
    throw new TypeError("manifestPath is required");
  }
  const retainedManifest = await readFile(resolve(manifestPath));
  let manifest;
  try { manifest = JSON.parse(retainedManifest.toString("utf8")); }
  catch { throw new Error("content migration record-set manifest is invalid JSON"); }
  if (manifest?.schemaVersion !== RECORD_SET_SCHEMA || !Array.isArray(manifest.sourceRoots)
    || manifest.sourceRoots.length === 0 || manifest.census?.schemaVersion !== "migration-census/v1") {
    throw new Error("content migration record-set manifest is invalid");
  }
  const filename = safeName(manifest.census.filename, "manifest.census.filename");
  if (!SHA256.test(manifest.census.gzipSha256) || !SHA256.test(manifest.census.contentSha256)
    || !Number.isSafeInteger(manifest.census.gzipByteLength) || manifest.census.gzipByteLength < 1) {
    throw new Error("content migration census commitment is invalid");
  }
  const retainedCensus = await readFile(resolve(dirname(resolve(manifestPath)), filename));
  if (retainedCensus.length !== manifest.census.gzipByteLength
    || sha256(retainedCensus) !== manifest.census.gzipSha256) {
    throw new Error("retained migration census does not match its gzip commitment");
  }
  let content;
  try { content = gunzipSync(retainedCensus); }
  catch { throw new Error("retained migration census is not valid gzip"); }
  if (sha256(content) !== manifest.census.contentSha256) {
    throw new Error("expanded migration census does not match its content commitment");
  }
  let census;
  try { census = JSON.parse(content.toString("utf8")); }
  catch { throw new Error("expanded migration census is invalid JSON"); }
  if (census?.schemaVersion !== manifest.census.schemaVersion
    || JSON.stringify(census.sourceRoots) !== JSON.stringify(manifest.sourceRoots)
    || census.summary?.regularFileCount !== manifest.summary?.regularFileCount
    || census.summary?.totalBytes !== manifest.summary?.totalBytes
    || census.summary?.uniquePayloadBytes !== manifest.summary?.uniquePayloadBytes
    || census.summary?.redundantBytes !== manifest.summary?.redundantBytes
    || census.exactDuplicateGroups?.length !== manifest.summary?.exactDuplicateGroupCount) {
    throw new Error("expanded migration census contradicts its record-set manifest");
  }
  return Object.freeze({ manifest: Object.freeze(manifest), census: Object.freeze(census),
    evidence: Object.freeze({ manifestPath: resolve(manifestPath), censusFilename: filename,
      censusContentSha256: manifest.census.contentSha256,
      censusGzipSha256: manifest.census.gzipSha256 }) });
}

export { DEFAULT_NAMES as CONTENT_MIGRATION_RECORD_NAMES };
