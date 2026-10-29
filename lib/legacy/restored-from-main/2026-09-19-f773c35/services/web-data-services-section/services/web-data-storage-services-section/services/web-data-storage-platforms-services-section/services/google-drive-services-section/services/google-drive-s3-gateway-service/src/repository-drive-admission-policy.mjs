import {
  contentTypeForMigration,
  metadataForMigration,
  normalizeContentMigrationPath,
} from "./561-group-content-migration-policy.mjs";

const SERVICES_ROOT = "lib/emsenn/services/561-group/services/";
const PERSONAL_ROOT = `${SERVICES_ROOT}public-services-section/services/personal-services-section/services/emsenn-services-section/`;
const CANDIDATE_CLASSIFICATION = "drive-admission-review";
const ADMITTED_CLASSIFICATION = "repository-large-file-copy-admitted";

export const REPOSITORY_LARGE_FILE_THRESHOLD_BYTES = 10 * 1024 * 1024;
export const REPOSITORY_DRIVE_ADMISSION_POLICY_SCHEMA = "repository-drive-admission-policy/v1";

function admittedThreshold(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new RangeError("thresholdBytes must be a positive safe integer");
  return value;
}

function candidate(file) {
  if (!file || typeof file !== "object" || file.proposedDisposition?.classification !== CANDIDATE_CLASSIFICATION) {
    throw new Error("repository file is not in the Drive-admission review queue");
  }
  if (typeof file.path !== "string" || !Number.isSafeInteger(file.byteLength) || file.byteLength < 0
    || !/^[a-f0-9]{64}$/u.test(file.sha256 ?? "")) {
    throw new TypeError("repository Drive-admission candidate lacks a stable byte commitment");
  }
  return file;
}

/**
 * Settle every repository Drive-review candidate without confusing file type
 * with size. Only stable files at or above the explicit large-file threshold
 * are authorized for copy; no decision authorizes source retirement.
 */
export function decideRepositoryDriveAdmission(file, {
  thresholdBytes = REPOSITORY_LARGE_FILE_THRESHOLD_BYTES,
} = {}) {
  const offered = candidate(file);
  const threshold = admittedThreshold(thresholdBytes);
  if (offered.byteLength >= threshold) {
    return Object.freeze({
      classification: ADMITTED_CLASSIFICATION,
      basis: Object.freeze([
        `repository-review:${CANDIDATE_CLASSIFICATION}`,
        `size-at-least:${threshold}`,
        `material:${offered.materialFamily}`,
      ]),
      copyAuthorized: true,
      sourceRetirementAuthorized: false,
    });
  }
  const generated = offered.pathRoles?.includes("generated-material-candidate") ?? false;
  const classification = offered.repositoryRelation === "ignored" || generated
    ? "local-derived-or-runtime-review"
    : offered.repositoryRelation === "tracked"
      ? "git-retained-small"
      : "git-admission-review-small";
  return Object.freeze({
    classification,
    basis: Object.freeze([
      `repository-review:${CANDIDATE_CLASSIFICATION}`,
      `size-below:${threshold}`,
      `repository:${offered.repositoryRelation}`,
      ...(generated ? ["path-role:generated-material-candidate"] : []),
    ]),
    copyAuthorized: false,
    sourceRetirementAuthorized: false,
  });
}

function bucketFor(file) {
  if (file.path.startsWith(PERSONAL_ROOT)) return "emsenn-private";
  if (["audio", "image", "video"].includes(file.materialFamily)) return "561-group-media";
  if (file.materialFamily === "document") return "561-group-references";
  if (file.materialFamily === "structured-data") return "561-group-data";
  throw new Error(`admitted large-file material family has no Drive bucket: ${file.materialFamily}`);
}

function repositoryRelativePath(path) {
  return path.startsWith(SERVICES_ROOT) ? path.slice(SERVICES_ROOT.length) : path;
}

export function createRepositoryLargeFileMigrationPolicy({ admittedFiles } = {}) {
  if (!Array.isArray(admittedFiles) || admittedFiles.length === 0) {
    throw new TypeError("admittedFiles must be a non-empty array");
  }
  const admittedByPath = new Map();
  for (const file of admittedFiles) {
    if (file?.admission?.classification !== ADMITTED_CLASSIFICATION
      || file.admission.copyAuthorized !== true || file.admission.sourceRetirementAuthorized !== false) {
      throw new Error(`migration file lacks an admitted copy decision: ${file?.path ?? "(unknown)"}`);
    }
    const { path } = normalizeContentMigrationPath(file.path);
    if (admittedByPath.has(path)) throw new Error(`duplicate admitted source path: ${path}`);
    admittedByPath.set(path, file);
  }
  const claimedCoordinates = new Map();
  return Object.freeze({
    route(record) {
      const { path: sourcePath, separatorNormalizedPath } = normalizeContentMigrationPath(record?.path);
      const admitted = admittedByPath.get(sourcePath);
      if (!admitted || admitted.sha256 !== record.sha256 || admitted.byteLength !== record.byteLength
        || admitted.materialFamily !== record.materialFamily) {
        throw new Error(`source path is not committed by the repository large-file admission set: ${sourcePath}`);
      }
      const bucket = bucketFor(admitted);
      const key = `repository-large-files/${repositoryRelativePath(sourcePath)}`;
      const coordinate = `${bucket.length}:${bucket}${key}`;
      const prior = claimedCoordinates.get(coordinate);
      if (prior && prior !== separatorNormalizedPath) throw new Error(`normalized destination collision at ${bucket}/${key}`);
      claimedCoordinates.set(coordinate, separatorNormalizedPath);
      return Object.freeze({
        family: "repository-large-files",
        sourceRoot: null,
        relativePath: repositoryRelativePath(sourcePath),
        bucket,
        key,
        contentType: contentTypeForMigration(sourcePath, record.mediaTypeHint),
        metadata: metadataForMigration(sourcePath, record.mtime),
      });
    },
  });
}

export const REPOSITORY_DRIVE_ADMISSION_CLASSIFICATIONS = Object.freeze({
  candidate: CANDIDATE_CLASSIFICATION,
  admitted: ADMITTED_CLASSIFICATION,
});
