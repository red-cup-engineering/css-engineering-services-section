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
