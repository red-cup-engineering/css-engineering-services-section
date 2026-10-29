import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { checkYoutubeChannelRepositoryForm } from "../scripts/check-youtube-channel-repository-form.mjs";

const examples = [
  {
    "type": "JavascriptNodeOperationExample",
    "name": "a conformant channel",
    "input": {
      "path": "public-ecological-youtube-services",
      "entries": [
        "README.md",
        "package.json",
        "channel-spec.json",
        "content/curriculum/course.json",
        "Dockerfile",
        ".github/workflows/test-and-produce.yml",
        "data/records/"
      ],
      "packageJson": {
        "dependencies": {
          "@red-cup-engineering/youtube-channel-production-services-section": "0.1.1"
        }
      }
    },
    "output": {
      "type": "YoutubeChannelRepositoryForm",
      "version": 1,
      "path": "public-ecological-youtube-services",
      "conformant": true,
      "violations": [],
      "allowed": [
        "README.md",
        "package.json",
        "channel-spec.json",
        "content/curriculum/course.json",
        "Dockerfile",
        ".github/workflows/test-and-produce.yml",
        "data/records/"
      ],
      "dependsOnProductionProgram": true
    }
  },
  {
    "type": "JavascriptNodeOperationExample",
    "name": "today's business-education channel",
    "input": {
      "path": "business-education-youtube-services-section",
      "entries": [
        "src/channel.mjs",
        "src/inventory.mjs",
        "scripts/scheduled-production.mjs",
        "vendor/",
        "packages/"
      ],
      "packageJson": {
        "dependencies": {}
      }
    },
    "output": {
      "type": "YoutubeChannelRepositoryForm",
      "version": 1,
      "path": "business-education-youtube-services-section",
      "conformant": false,
      "violations": [
        {
          "rule": "pipeline-copy",
          "path": "src/channel.mjs",
          "message": "src/channel.mjs is pipeline source; a channel's behaviour is its spec, not its own code"
        },
        {
          "rule": "pipeline-copy",
          "path": "src/inventory.mjs",
          "message": "src/inventory.mjs is pipeline source; a channel's behaviour is its spec, not its own code"
        },
        {
          "rule": "pipeline-copy",
          "path": "scripts/scheduled-production.mjs",
          "message": "scripts/scheduled-production.mjs is pipeline source; a channel's behaviour is its spec, not its own code"
        },
        {
          "rule": "vendored-code",
          "path": "vendor/",
          "message": "vendor/ is vendored code; a channel depends on the production program instead of vendoring"
        },
        {
          "rule": "vendored-code",
          "path": "packages/",
          "message": "packages/ is vendored code; a channel depends on the production program instead of vendoring"
        },
        {
          "rule": "missing-production-dependency",
          "path": "package.json",
          "message": "package.json does not depend on @red-cup-engineering/youtube-channel-production-services-section at an exact version"
        },
        {
          "rule": "missing-spec",
          "path": "channel-spec.json",
          "message": "channel-spec.json is absent; a channel's behaviour is the spec the production program validates"
        }
      ],
      "allowed": [],
      "dependsOnProductionProgram": false
    }
  }
];

for (const example of examples) {
  test(example.name, async () => {
    const importedOutput = await checkYoutubeChannelRepositoryForm(example.input);
    assert.deepEqual(importedOutput, example.output);
    const command = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/check-youtube-channel-repository-form.mjs", import.meta.url))], {
      input: JSON.stringify(example.input) + "\n",
      encoding: "utf8",
    });
    assert.equal(command.status, 0, command.stderr);
    const commandOutput = JSON.parse(command.stdout.trim());
    assert.deepEqual(commandOutput, example.output);
    assert.deepEqual(commandOutput, importedOutput);
  });
}
