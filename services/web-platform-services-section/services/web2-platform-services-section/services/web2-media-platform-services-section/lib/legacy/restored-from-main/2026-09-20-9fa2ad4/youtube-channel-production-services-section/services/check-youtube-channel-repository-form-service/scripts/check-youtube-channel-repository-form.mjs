#!/usr/bin/env node
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

const PRODUCTION_PACKAGE_NAME = "@red-cup-engineering/youtube-channel-production-services-section";
const EXACT_SEMVER_PATTERN = /^\d+\.\d+\.\d+(-[0-9A-Za-z-.]+)?(\+[0-9A-Za-z-.]+)?$/u;
const ADMITTED_ROOT_FILES = new Set([
  "README.md",
  "package.json",
  "package-lock.json",
  ".npmrc",
  ".gitignore",
  "LICENSE",
  "channel-spec.json",
  "Dockerfile",
]);
const ADMITTED_PREFIXES = ["content/", "data/records/", "data/logs/", "data/state/", "test/"];
const VENDORED_DIRECTORY_NAMES = ["vendor", "packages", "lib"];
const PIPELINE_DIRECTORY_NAMES = ["src", "scripts"];

function isExactVersion(range) {
  return typeof range === "string" && EXACT_SEMVER_PATTERN.test(range);
}

function isAdmittedEntry(entry) {
  if (ADMITTED_ROOT_FILES.has(entry)) return true;
  if (ADMITTED_PREFIXES.some((prefix) => entry.startsWith(prefix))) return true;
  if (entry.startsWith(".github/workflows/") && entry.endsWith(".yml")) return true;
  return false;
}

function pipelineCopyViolations(entries) {
  const violations = [];
  for (const entry of entries) {
    if (entry.endsWith("/")) continue;
    if (PIPELINE_DIRECTORY_NAMES.some((dir) => entry.startsWith(`${dir}/`))) {
      violations.push({
        rule: "pipeline-copy",
        path: entry,
        message: `${entry} is pipeline source; a channel's behaviour is its spec, not its own code`,
      });
    }
  }
  return violations;
}

function vendoredCodeViolations(entries) {
  const violations = [];
  for (const name of VENDORED_DIRECTORY_NAMES) {
    const marker = `${name}/`;
    if (entries.some((entry) => entry === marker || entry.startsWith(marker))) {
      violations.push({
        rule: "vendored-code",
        path: marker,
        message: `${marker} is vendored code; a channel depends on the production program instead of vendoring`,
      });
    }
  }
  return violations;
}

function looseDependencyViolations(packageJson) {
  const violations = [];
  for (const field of ["dependencies", "devDependencies"]) {
    const map = packageJson[field];
    if (typeof map !== "object" || map === null) continue;
    for (const [name, range] of Object.entries(map)) {
      if (!isExactVersion(range)) {
        violations.push({
          rule: "loose-dependency",
          path: "package.json",
          message: `${name} is pinned to "${range}", not an exact version`,
        });
      }
    }
  }
  return violations;
}

function productionDependencyRange(packageJson) {
  const dependencies = packageJson.dependencies;
  if (typeof dependencies !== "object" || dependencies === null) return undefined;
  return dependencies[PRODUCTION_PACKAGE_NAME];
}

function missingProductionDependencyViolation(packageJson) {
  if (isExactVersion(productionDependencyRange(packageJson))) return null;
  return {
    rule: "missing-production-dependency",
    path: "package.json",
    message: `package.json does not depend on ${PRODUCTION_PACKAGE_NAME} at an exact version`,
  };
}

function missingSpecViolation(entries) {
  if (entries.includes("channel-spec.json")) return null;
  return {
    rule: "missing-spec",
    path: "channel-spec.json",
    message: "channel-spec.json is absent; a channel's behaviour is the spec the production program validates",
  };
}

/**
 * Checks one already-listed YouTube channel repository against the admitted form: a channel parameterizes youtube-channel-production-services-section and carries no pipeline copy, vendored code, or loose dependency of its own.
 * @param {object} request A record with `path` (repository root, repo-relative), `entries` (relative paths under it, directories carrying a trailing "/", with `node_modules/` and `.git/` already excluded by the caller), and `packageJson` (already-parsed package.json).
 * @returns {object} A YoutubeChannelRepositoryForm record: `type`, `version: 1`, `path`, `conformant` (boolean), `violations` (array of `{rule, path, message}`), `allowed` (the entries admitted), `dependsOnProductionProgram` (boolean).
 * @throws {TypeError} When `path` is not a non-empty string, `entries` is not an array of strings, or `packageJson` is not a plain object.
 */
export function checkYoutubeChannelRepositoryForm(request) {
  const path = request?.path;
  if (typeof path !== "string" || path.length === 0) throw new TypeError("path must be a non-empty string");
  const entries = request?.entries;
  if (!Array.isArray(entries) || !entries.every((entry) => typeof entry === "string")) {
    throw new TypeError("entries must be an array of strings");
  }
  const packageJson = request?.packageJson;
  if (typeof packageJson !== "object" || packageJson === null || Array.isArray(packageJson)) {
    throw new TypeError("packageJson must be a plain object");
  }

  const violations = [
    ...pipelineCopyViolations(entries),
    ...vendoredCodeViolations(entries),
    ...looseDependencyViolations(packageJson),
  ];
  const missingProduction = missingProductionDependencyViolation(packageJson);
  if (missingProduction !== null) violations.push(missingProduction);
  const missingSpec = missingSpecViolation(entries);
  if (missingSpec !== null) violations.push(missingSpec);

  return {
    type: "YoutubeChannelRepositoryForm",
    version: 1,
    path,
    conformant: violations.length === 0,
    violations,
    allowed: entries.filter(isAdmittedEntry),
    dependsOnProductionProgram: isExactVersion(productionDependencyRange(packageJson)),
  };
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "check-youtube-channel-repository-form", description: "Checks one already-listed YouTube channel repository against the admitted form: a channel parameterizes youtube-channel-production-services-section and carries no pipeline copy, vendored code, or loose dependency of its own.", operation: checkYoutubeChannelRepositoryForm }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
