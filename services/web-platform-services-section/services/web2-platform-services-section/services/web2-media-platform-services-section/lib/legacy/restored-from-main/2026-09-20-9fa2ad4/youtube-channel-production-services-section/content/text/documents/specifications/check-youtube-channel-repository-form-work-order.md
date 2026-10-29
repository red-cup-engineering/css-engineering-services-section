# check-youtube-channel-repository-form
## Requirements
- `pipeline-copy-flagged`: The operation reports one `pipeline-copy` violation row per file entry (an entry not ending in `/`) whose path starts with `src/` or `scripts/` — a channel carries no source of its own; its behaviour is its spec.
- `vendored-code-flagged`: The operation reports one `vendored-code` violation row per named directory (`vendor/`, `packages/`, `lib/`) that has any entry at or under it, `path` set to the directory marker (`vendor/`, `packages/`, or `lib/`) — one row per directory regardless of how many files it holds.
- `missing-production-dependency-flagged`: When `packageJson.dependencies` carries no exact-version entry for `@red-cup-engineering/youtube-channel-production-services-section`, the operation reports one `missing-production-dependency` violation row.
- `missing-spec-flagged`: When `entries` carries no `channel-spec.json` entry, the operation reports one `missing-spec` violation row.
- `loose-dependency-flagged`: The operation reports one `loose-dependency` violation row per entry of `packageJson.dependencies` and `packageJson.devDependencies` whose version string is not an exact SemVer release, `path` set to `package.json` — this fires for the production dependency too when its own pin is a range, alongside `missing-production-dependency-flagged`.
- `depends-on-production-program-reported`: `dependsOnProductionProgram` is `true` exactly when `packageJson.dependencies` carries the production package at an exact version, independent of any other violation.
- `allowed-entries-reported`: `allowed` lists every entry of `entries` matched by the admitted form: `README.md`, `package.json`, `package-lock.json`, `.npmrc`, `.gitignore`, `LICENSE`, `channel-spec.json`, `Dockerfile`, any entry under `content/`, `data/records/`, `data/logs/`, `data/state/`, or `test/`, and any `.github/workflows/*.yml` entry.
- `conformant-when-no-violations`: `conformant` is `true` exactly when `violations` is empty.
- `record-shape`: The operation returns exactly `type: "YoutubeChannelRepositoryForm"`, `version: 1`, `path`, `conformant`, `violations`, `allowed`, `dependsOnProductionProgram`.
- `pure-check`: The operation performs no filesystem access; it reads only `path`, `entries`, and `packageJson`, already supplied on its request.
## Prohibitions
- `malformed-path-refusal`: The operation must refuse (throw `TypeError`) a request whose `path` is not a non-empty string.
- `malformed-entries-refusal`: The operation must refuse a request whose `entries` is not an array of strings.
- `malformed-package-json-refusal`: The operation must refuse a request whose `packageJson` is not a plain object.
## Laws
- `fabricate-do-not-hand-write` | 561 Group working discipline, dispatch-agents skill | 2026-09-04 | .claude/skills/dispatch-agents/SKILL.md | Applies to this operation's own birth. | This gate operation is fabricated through the jsnode fabrication line from this work order, never hand-written, so the gate that refuses a regrown pipeline copy does not itself start as an exception to the rule it enforces.
- `primitives-exist-once` | 561 Group working discipline | 2026-08-30 | CLAUDE.md | Applies to every `pipeline-copy` and `vendored-code` violation this operation reports. | A channel repository carrying its own `src/`, `scripts/`, `vendor/`, `packages/`, or `lib/` is the exact regrowth this law forbids: the production pipeline exists once, in youtube-channel-production-services-section, and a channel parameterizes it rather than forking it.
## Standards
- `node-esm-operation` | Node.js | v24.2.0+ | https://nodejs.org/docs/v24/api/esm.html | Applies to the .mjs operation and its import.meta.main guard. | The package uses one executable ESM operation source file.
- `semver-exact-release-form` | Semantic Versioning | 2.0.0 | https://semver.org/spec/v2.0.0.html | Applies to `missing-production-dependency-flagged`, `loose-dependency-flagged`, and `depends-on-production-program-reported`. | An exact version is a full MAJOR.MINOR.PATCH release (with an optional pre-release or build metadata suffix), never a range operator (`^`, `~`, `*`, `x`, comparator ranges, tags like `latest`).
## Open questions
- `unlisted-entry-rule` [nonblocking]: An entry outside the admitted form that matches none of the five named violation kinds (a stray root file that is neither pipeline, vendored, nor a dependency concern) produces no violation row in this first version; the work order enforces the admitted-entries list only through the five named violation kinds, and a general catch-all rule is a gap for a later version if the first real run over the five channel repositories surfaces such an entry.
## Package
```json
{"packageName":"@red-cup-engineering/check-youtube-channel-repository-form-service","packageVersion":"0.1.0","license":"MIT","dependencies":{},"devDependencies":{}}
```
## Operation
```mjs path=scripts/check-youtube-channel-repository-form.mjs
#!/usr/bin/env node

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
  if (process.argv.includes("--help")) {
    process.stdout.write(
      "checkYoutubeChannelRepositoryForm — Checks one already-listed YouTube channel repository against the admitted form: a channel parameterizes youtube-channel-production-services-section and carries no pipeline copy, vendored code, or loose dependency of its own.\n",
    );
  } else {
    let text = "";
    for await (const chunk of process.stdin) text += chunk;
    for (const line of text.split("\n")) {
      if (line.length > 0) process.stdout.write(`${JSON.stringify(checkYoutubeChannelRepositoryForm(JSON.parse(line)))}\n`);
    }
  }
}
```
## Tests
```mjs path=test/check-youtube-channel-repository-form.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { checkYoutubeChannelRepositoryForm } from "../scripts/check-youtube-channel-repository-form.mjs";

test("a conformant channel reports no violations", () => {
  const result = checkYoutubeChannelRepositoryForm({
    path: "public-ecological-youtube-services",
    entries: [
      "README.md",
      "package.json",
      "channel-spec.json",
      "content/curriculum/course.json",
      "Dockerfile",
      ".github/workflows/test-and-produce.yml",
      "data/records/",
    ],
    packageJson: {
      dependencies: { "@red-cup-engineering/youtube-channel-production-services-section": "0.1.1" },
    },
  });
  assert.equal(result.type, "YoutubeChannelRepositoryForm");
  assert.equal(result.version, 1);
  assert.equal(result.conformant, true);
  assert.deepEqual(result.violations, []);
  assert.equal(result.dependsOnProductionProgram, true);
});

test("today's business-education channel reports one row per pipeline file, one per vendored directory, missing dependency, and missing spec", () => {
  const result = checkYoutubeChannelRepositoryForm({
    path: "business-education-youtube-services-section",
    entries: [
      "src/channel.mjs",
      "src/inventory.mjs",
      "scripts/scheduled-production.mjs",
      "vendor/",
      "packages/",
    ],
    packageJson: { dependencies: {} },
  });
  assert.equal(result.conformant, false);
  const byRule = (rule) => result.violations.filter((v) => v.rule === rule);
  assert.equal(byRule("pipeline-copy").length, 3);
  assert.equal(byRule("vendored-code").length, 2);
  assert.equal(byRule("missing-production-dependency").length, 1);
  assert.equal(byRule("missing-spec").length, 1);
  assert.equal(result.violations.length, 7);
  assert.equal(result.dependsOnProductionProgram, false);
});

test("refuses a malformed request whose entries is not an array", () => {
  assert.throws(
    () => checkYoutubeChannelRepositoryForm({ path: "x", entries: "src", packageJson: {} }),
    TypeError,
  );
});

test("refuses a non-empty-string path", () => {
  assert.throws(() => checkYoutubeChannelRepositoryForm({ path: "", entries: [], packageJson: {} }), TypeError);
});

test("refuses a non-object packageJson", () => {
  assert.throws(() => checkYoutubeChannelRepositoryForm({ path: "x", entries: [], packageJson: null }), TypeError);
  assert.throws(() => checkYoutubeChannelRepositoryForm({ path: "x", entries: [], packageJson: [] }), TypeError);
});

test("flags a loose-dependency range alongside missing-production-dependency when the production pin is a range", () => {
  const result = checkYoutubeChannelRepositoryForm({
    path: "x",
    entries: ["channel-spec.json"],
    packageJson: {
      dependencies: { "@red-cup-engineering/youtube-channel-production-services-section": "^0.1.0" },
    },
  });
  const byRule = (rule) => result.violations.filter((v) => v.rule === rule);
  assert.equal(byRule("loose-dependency").length, 1);
  assert.equal(byRule("missing-production-dependency").length, 1);
  assert.equal(result.dependsOnProductionProgram, false);
});

test("reports devDependencies looseness too", () => {
  const result = checkYoutubeChannelRepositoryForm({
    path: "x",
    entries: ["channel-spec.json"],
    packageJson: {
      dependencies: { "@red-cup-engineering/youtube-channel-production-services-section": "0.1.1" },
      devDependencies: { "some-tool": "latest" },
    },
  });
  const byRule = (rule) => result.violations.filter((v) => v.rule === rule);
  assert.equal(byRule("loose-dependency").length, 1);
  assert.equal(result.conformant, false);
});

test("allowed lists only the entries matched by the admitted form", () => {
  const result = checkYoutubeChannelRepositoryForm({
    path: "x",
    entries: ["README.md", "src/channel.mjs", "content/a.json", "notes.txt"],
    packageJson: { dependencies: {} },
  });
  assert.deepEqual(result.allowed, ["README.md", "content/a.json"]);
});
```
## Examples
```json name="a conformant channel"
{"input":{"path":"public-ecological-youtube-services","entries":["README.md","package.json","channel-spec.json","content/curriculum/course.json","Dockerfile",".github/workflows/test-and-produce.yml","data/records/"],"packageJson":{"dependencies":{"@red-cup-engineering/youtube-channel-production-services-section":"0.1.1"}}},"output":{"type":"YoutubeChannelRepositoryForm","version":1,"path":"public-ecological-youtube-services","conformant":true,"violations":[],"allowed":["README.md","package.json","channel-spec.json","content/curriculum/course.json","Dockerfile",".github/workflows/test-and-produce.yml","data/records/"],"dependsOnProductionProgram":true}}
```
```json name="today's business-education channel"
{"input":{"path":"business-education-youtube-services-section","entries":["src/channel.mjs","src/inventory.mjs","scripts/scheduled-production.mjs","vendor/","packages/"],"packageJson":{"dependencies":{}}},"output":{"type":"YoutubeChannelRepositoryForm","version":1,"path":"business-education-youtube-services-section","conformant":false,"violations":[{"rule":"pipeline-copy","path":"src/channel.mjs","message":"src/channel.mjs is pipeline source; a channel's behaviour is its spec, not its own code"},{"rule":"pipeline-copy","path":"src/inventory.mjs","message":"src/inventory.mjs is pipeline source; a channel's behaviour is its spec, not its own code"},{"rule":"pipeline-copy","path":"scripts/scheduled-production.mjs","message":"scripts/scheduled-production.mjs is pipeline source; a channel's behaviour is its spec, not its own code"},{"rule":"vendored-code","path":"vendor/","message":"vendor/ is vendored code; a channel depends on the production program instead of vendoring"},{"rule":"vendored-code","path":"packages/","message":"packages/ is vendored code; a channel depends on the production program instead of vendoring"},{"rule":"missing-production-dependency","path":"package.json","message":"package.json does not depend on @red-cup-engineering/youtube-channel-production-services-section at an exact version"},{"rule":"missing-spec","path":"channel-spec.json","message":"channel-spec.json is absent; a channel's behaviour is the spec the production program validates"}],"allowed":[],"dependsOnProductionProgram":false}}
```
## Traceability
- `pipeline-copy-flagged` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `node-esm-operation`
- `vendored-code-flagged` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `primitives-exist-once`, `node-esm-operation`
- `missing-production-dependency-flagged` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `semver-exact-release-form`
- `missing-spec-flagged` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `loose-dependency-flagged` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `semver-exact-release-form`
- `depends-on-production-program-reported` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `semver-exact-release-form`
- `allowed-entries-reported` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `conformant-when-no-violations` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `record-shape` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `pure-check` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `node-esm-operation`
- `malformed-path-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `fabricate-do-not-hand-write`
- `malformed-entries-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `fabricate-do-not-hand-write`
- `malformed-package-json-refusal` -> projection `jsnode-operation-package`; acceptance `jsnode-package-assays`; constraints `fabricate-do-not-hand-write`
