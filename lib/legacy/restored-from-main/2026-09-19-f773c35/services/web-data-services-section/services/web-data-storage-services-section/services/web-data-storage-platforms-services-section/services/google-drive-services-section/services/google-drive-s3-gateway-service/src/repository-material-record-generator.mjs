import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

import { createRepositoryMaterialCensus } from "./repository-material-census.mjs";

const RECORD_SET_SCHEMA = "repository-material-record-set/v1";
const CENSUS_SCHEMA = "repository-material-census/v1";
const SHA256 = /^[a-f0-9]{64}$/u;
const DEFAULT_NAMES = Object.freeze({
  census: "2026-08-20-repository-material-census.json.gz",
  manifest: "2026-08-20-repository-material-record-set.json",
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

function workspacePath(workspace, path) {
  const difference = relative(workspace, path);
  if (difference === "" || difference === ".." || difference.startsWith(`..${sep}`) || isAbsolute(difference)) {
    throw new RangeError(`record output lies outside the workspace: ${path}`);
  }
  return difference.split(sep).join("/");
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

/**
 * Build a complete working-tree census as a record set distinct from the
 * closed Drive-migration census. No proposed disposition authorizes action.
 */
export async function generateRepositoryMaterialRecords({
  workspaceRoot = process.cwd(),
  outputDirectory,
  write = false,
  names = DEFAULT_NAMES,
  gitState,
  hashConcurrency,
  onEntryObserved,
} = {}) {
  const workspace = resolve(workspaceRoot);
  if (typeof outputDirectory !== "string" || outputDirectory.length === 0) throw new TypeError("outputDirectory is required");
  if (typeof write !== "boolean") throw new TypeError("write must be boolean");
  const filenames = {
    census: safeName(names?.census, "names.census"),
    manifest: safeName(names?.manifest, "names.manifest"),
  };
  if (filenames.census === filenames.manifest) throw new RangeError("record filenames must be distinct");
  const directory = resolve(outputDirectory);
  const censusPath = resolve(directory, filenames.census);
  const manifestPath = resolve(directory, filenames.manifest);
  const selfExcludedPaths = [workspacePath(workspace, censusPath), workspacePath(workspace, manifestPath)].sort();
  const census = await createRepositoryMaterialCensus({
    workspaceRoot: workspace,
    gitState,
    selfExcludedPaths,
    ...(hashConcurrency === undefined ? {} : { hashConcurrency }),
    onEntryObserved,
  });
  if (!census.summary.completeEnumeration) {
    throw new Error(`repository material census is incomplete: ${census.summary.unstableFileCount} unstable, ${census.summary.unreadableEntryCount} unreadable`);
  }
  const content = jsonBytes(census);
  const compressed = gzipSync(content, { level: 9, mtime: 0 });
  const manifest = Object.freeze({
    schemaVersion: RECORD_SET_SCHEMA,
    actionAuthorized: false,
    census: {
      filename: filenames.census,
      schemaVersion: census.schemaVersion,
      contentSha256: sha256(content),
      gzipSha256: sha256(compressed),
      gzipByteLength: compressed.length,
    },
    selfReferenceBoundary: census.selfReferenceBoundary,
    gitObservation: {
      head: census.gitObservation.head,
      branch: census.gitObservation.branch,
    },
    summary: census.summary,
    dispositionSummary: census.dispositionSummary,
    materialFamilySummary: census.materialFamilySummary,
    repositoryRelationSummary: census.repositoryRelationSummary,
  });
  const manifestBytes = jsonBytes(manifest);
  if (write) {
    await mkdir(directory, { recursive: true });
    await atomicReplace(censusPath, compressed);
    await atomicReplace(manifestPath, manifestBytes);
  }
  return Object.freeze({
    write,
    outputDirectory: directory,
    manifest,
    artifacts: Object.freeze({
      census: Object.freeze({ filename: filenames.census, contentSha256: manifest.census.contentSha256,
        gzipSha256: manifest.census.gzipSha256, gzipByteLength: manifest.census.gzipByteLength }),
      manifest: Object.freeze({ filename: filenames.manifest, sha256: sha256(manifestBytes), byteLength: manifestBytes.length }),
    }),
  });
}

export async function readCommittedRepositoryMaterialCensus({ manifestPath } = {}) {
  if (typeof manifestPath !== "string" || manifestPath.length === 0 || manifestPath.includes("\0")) {
    throw new TypeError("manifestPath is required");
  }
  const retainedManifest = await readFile(resolve(manifestPath));
  let manifest;
  try { manifest = JSON.parse(retainedManifest.toString("utf8")); }
  catch { throw new Error("repository material record-set manifest is invalid JSON"); }
  if (manifest?.schemaVersion !== RECORD_SET_SCHEMA || manifest.actionAuthorized !== false
    || manifest.census?.schemaVersion !== CENSUS_SCHEMA || !Array.isArray(manifest.selfReferenceBoundary)) {
    throw new Error("repository material record-set manifest is invalid");
  }
  const filename = safeName(manifest.census.filename, "manifest.census.filename");
  if (!SHA256.test(manifest.census.gzipSha256) || !SHA256.test(manifest.census.contentSha256)
    || !Number.isSafeInteger(manifest.census.gzipByteLength) || manifest.census.gzipByteLength < 1) {
    throw new Error("repository material census commitment is invalid");
  }
  const retainedCensus = await readFile(resolve(dirname(resolve(manifestPath)), filename));
  if (retainedCensus.length !== manifest.census.gzipByteLength || sha256(retainedCensus) !== manifest.census.gzipSha256) {
    throw new Error("retained repository material census does not match its gzip commitment");
  }
  let content;
  try { content = gunzipSync(retainedCensus); }
  catch { throw new Error("retained repository material census is not valid gzip"); }
  if (sha256(content) !== manifest.census.contentSha256) throw new Error("expanded repository material census does not match its content commitment");
  let census;
  try { census = JSON.parse(content.toString("utf8")); }
  catch { throw new Error("expanded repository material census is invalid JSON"); }
  if (census?.schemaVersion !== CENSUS_SCHEMA || census.actionAuthorized !== false
    || JSON.stringify(census.selfReferenceBoundary) !== JSON.stringify(manifest.selfReferenceBoundary)
    || JSON.stringify(census.summary) !== JSON.stringify(manifest.summary)
    || JSON.stringify(census.dispositionSummary) !== JSON.stringify(manifest.dispositionSummary)
    || JSON.stringify(census.materialFamilySummary) !== JSON.stringify(manifest.materialFamilySummary)
    || JSON.stringify(census.repositoryRelationSummary) !== JSON.stringify(manifest.repositoryRelationSummary)) {
    throw new Error("expanded repository material census contradicts its record-set manifest");
  }
  return Object.freeze({ manifest: Object.freeze(manifest), census: Object.freeze(census),
    evidence: Object.freeze({ manifestPath: resolve(manifestPath), censusFilename: filename,
      censusContentSha256: manifest.census.contentSha256, censusGzipSha256: manifest.census.gzipSha256 }) });
}

export { DEFAULT_NAMES as REPOSITORY_MATERIAL_RECORD_NAMES };
