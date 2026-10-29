import { createHash } from "node:crypto";
import { open, lstat, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

const CENSUS_SCHEMA = "migration-census/v1";
const DISPOSITION_SCHEMA = "content-migration-disposition/v1";
const SHA256 = /^[a-f0-9]{64}$/u;

const PERSONAL_MEDIA = "lib/emsenn/services/561-group/services/public-services-section/services/personal-services-section/services/emsenn-services-section/content/media";
export const DEFAULT_PROTECTED_RETIREMENT_PATHS = Object.freeze([
  `${PERSONAL_MEDIA}/images/emsenn-logo.svg`,
  `${PERSONAL_MEDIA}/images/og-image.svg`,
  `${PERSONAL_MEDIA}/images/photographs/2023/10/14/2023-10-14-lycoperdon-perlatum.org`,
  `${PERSONAL_MEDIA}/images/photographs/img.bib`,
]);

function compareText(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
function coordinate(bucket, key) { return `${bucket.length}:${bucket}${key}`; }
function within(path, parent) {
  const difference = relative(parent, path);
  return difference === "" || (!difference.startsWith(`..${sep}`) && difference !== ".." && !isAbsolute(difference));
}
function witness(stat) {
  return { byteLength: Number(stat.size), modifiedNanoseconds: stat.mtimeNs.toString(),
    changedNanoseconds: stat.ctimeNs.toString(), device: stat.dev.toString(), inode: stat.ino.toString() };
}
function sameWitness(left, right) { return Object.keys(left).every((key) => left[key] === right[key]); }
function requiredRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} is required`);
  return value;
}
function commitmentMatches(value, file) {
  return value && value.sha256 === file.sha256 && value.byteLength === file.byteLength;
}

async function verifyLocalFile(path, file, realWorkspaceRoot) {
  const offered = await lstat(path, { bigint: true });
  if (!offered.isFile() || offered.isSymbolicLink()) throw new Error(`retirement source is not a regular file: ${file.path}`);
  const resolved = await realpath(path);
  if (!within(resolved, realWorkspaceRoot)) throw new Error(`retirement source resolves outside the workspace: ${file.path}`);
  const handle = await open(path, "r");
  try {
    const before = witness(await handle.stat({ bigint: true }));
    if (before.byteLength !== file.byteLength) throw new Error(`local byte length changed after census: ${file.path}`);
    const hash = createHash("sha256");
    for await (const chunk of handle.createReadStream({ autoClose: false })) hash.update(chunk);
    const sha256 = hash.digest("hex");
    const afterHandle = witness(await handle.stat({ bigint: true }));
    const afterPath = witness(await lstat(path, { bigint: true }));
    if (!sameWitness(before, afterHandle) || !sameWitness(before, afterPath)) {
      throw new Error(`local file changed during retirement audit: ${file.path}`);
    }
    if (sha256 !== file.sha256) throw new Error(`local SHA-256 changed after census: ${file.path}`);
    return { sha256, byteLength: before.byteLength, filesystemWitness: before };
  } finally { await handle.close(); }
}

/**
 * Prove which local paths are eligible for a later, separate retirement action.
 * This function has no deletion, move, Git, or remote-storage capability.
 */
export async function createContentRetirementAudit({ census: offeredCensus, dispositions,
  workspaceRoot: offeredWorkspaceRoot, route, protectedPaths = DEFAULT_PROTECTED_RETIREMENT_PATHS,
  now = () => new Date() } = {}) {
  const census = requiredRecord(offeredCensus, "census");
  if (census.schemaVersion !== CENSUS_SCHEMA || !Array.isArray(census.files)) {
    throw new TypeError(`census must use ${CENSUS_SCHEMA}`);
  }
  if (census.pathMode !== "workspace-relative" && census.pathMode !== "absolute") {
    throw new TypeError('census.pathMode must be "workspace-relative" or "absolute"');
  }
  if (!Array.isArray(dispositions)) throw new TypeError("dispositions must be an array");
  if (typeof route !== "function") throw new TypeError("route is required");
  if (!Array.isArray(protectedPaths) || protectedPaths.some((path) => typeof path !== "string")) {
    throw new TypeError("protectedPaths must be an array of source paths");
  }
  if ((census.unstableFiles?.length ?? 0) !== 0) throw new Error("census contains unstable files and cannot authorize retirement");

  const workspaceRoot = resolve(String(offeredWorkspaceRoot ?? ""));
  const realWorkspaceRoot = await realpath(workspaceRoot);
  const filesByPath = new Map();
  for (const file of census.files) {
    if (!file || typeof file.path !== "string" || !SHA256.test(file.sha256)
      || !Number.isSafeInteger(file.byteLength) || file.byteLength < 0) throw new Error("census contains an invalid file record");
    if (filesByPath.has(file.path)) throw new Error(`census source-path collision: ${file.path}`);
    filesByPath.set(file.path, file);
  }

  const latestBySource = new Map();
  for (const disposition of dispositions) {
    if (!disposition || typeof disposition.sourcePath !== "string") throw new Error("disposition lacks sourcePath");
    if (!filesByPath.has(disposition.sourcePath)) throw new Error(`disposition path is outside the census: ${disposition.sourcePath}`);
    latestBySource.set(disposition.sourcePath, disposition);
  }
  const missing = [...filesByPath.keys()].filter((path) => !latestBySource.has(path));
  if (missing.length > 0) throw new Error(`retirement coverage is incomplete: ${missing.length} census path(s) lack dispositions; first: ${missing[0]}`);

  const claimedCoordinates = new Map();
  const admitted = [];
  for (const file of [...census.files].sort((left, right) => compareText(left.path, right.path))) {
    const disposition = latestBySource.get(file.path);
    if (disposition.schemaVersion !== DISPOSITION_SCHEMA || disposition.status !== "verified"
      || !commitmentMatches(disposition.source, file) || !commitmentMatches(disposition.remote, file)) {
      throw new Error(`latest disposition does not match census bytes: ${file.path}`);
    }
    if (disposition.remote?.evidence?.verificationPolicy !== "full-readback"
      || !commitmentMatches(disposition.remote?.evidence?.readback, file)) {
      throw new Error(`latest disposition lacks matching full-readback evidence: ${file.path}`);
    }
    const destination = route(file);
    if (disposition.destination?.bucket !== destination.bucket || disposition.destination?.key !== destination.key) {
      throw new Error(`latest disposition has the wrong destination: ${file.path}`);
    }
    const destinationCoordinate = coordinate(destination.bucket, destination.key);
    const prior = claimedCoordinates.get(destinationCoordinate);
    if (prior && prior !== file.path) throw new Error(`destination collision between ${prior} and ${file.path}`);
    claimedCoordinates.set(destinationCoordinate, file.path);
    admitted.push({ file, disposition, destination });
  }

  const protectedSet = new Set(protectedPaths);
  const entries = [];
  for (const { file, destination } of admitted) {
    const localPath = census.pathMode === "absolute" ? resolve(file.path) : resolve(workspaceRoot, file.path);
    if (!within(localPath, workspaceRoot)) throw new Error(`census path escapes the workspace: ${file.path}`);
    const local = await verifyLocalFile(localPath, file, realWorkspaceRoot);
    const protectedSourceAsset = protectedSet.has(file.path);
    entries.push({
      sourcePath: file.path,
      classification: protectedSourceAsset ? "protected-source-asset" : "bulk-content",
      retirementEligible: !protectedSourceAsset,
      source: { sha256: file.sha256, byteLength: file.byteLength },
      destination: { bucket: destination.bucket, key: destination.key },
      local,
      remoteReadback: { sha256: file.sha256, byteLength: file.byteLength },
    });
  }
  const protectedEntries = entries.filter(({ retirementEligible }) => !retirementEligible);
  const retirementEntries = entries.filter(({ retirementEligible }) => retirementEligible);
  const auditedAt = now();
  if (!(auditedAt instanceof Date) || !Number.isFinite(auditedAt.valueOf())) throw new TypeError("now must return a valid Date");
  const manifest = {
    schemaVersion: "content-retirement-audit/v1",
    auditedAt: auditedAt.toISOString(),
    actionPerformed: false,
    completeCoverage: true,
    census: { files: entries.length, byteLength: entries.reduce((total, entry) => total + entry.source.byteLength, 0) },
    retirement: { files: retirementEntries.length,
      byteLength: retirementEntries.reduce((total, entry) => total + entry.source.byteLength, 0), entries: retirementEntries },
    protected: { files: protectedEntries.length,
      byteLength: protectedEntries.reduce((total, entry) => total + entry.source.byteLength, 0), entries: protectedEntries },
  };
  JSON.stringify(manifest);
  return manifest;
}
