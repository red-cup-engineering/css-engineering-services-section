#!/usr/bin/env node

import { resolve } from "node:path";

import { generateContentMigrationRecords } from "../src/content-migration-record-generator.mjs";

const DEFAULT_RECORDS = "lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/web-services-section/services/web-data-services-section/services/web-data-storage-services-section/services/web-data-storage-platforms-services-section/services/google-drive-services-section/data/records";

const arguments_ = new Set(process.argv.slice(2));
const known = new Set(["--dry-run", "--write"]);
for (const argument of arguments_) {
  if (!known.has(argument)) throw new Error(`unknown argument: ${argument}`);
}
if (arguments_.has("--dry-run") && arguments_.has("--write")) {
  throw new Error("choose either --dry-run or --write");
}

const workspaceRoot = resolve(process.env.INFO_WORKSPACE_ROOT ?? process.cwd());
const outputDirectory = resolve(workspaceRoot,
  process.env.CONTENT_MIGRATION_RECORDS_DIRECTORY ?? DEFAULT_RECORDS);
const write = arguments_.has("--write");
let hashedFiles = 0;
const result = await generateContentMigrationRecords({
  workspaceRoot,
  outputDirectory,
  write,
  onFileHashed: async ({ path }) => {
    hashedFiles += 1;
    if (hashedFiles % 100 === 0) process.stderr.write(`${JSON.stringify({ event: "census-progress", hashedFiles, path })}\n`);
  },
});

process.stdout.write(`${JSON.stringify({
  status: write ? "record-set-published" : "dry-run-complete",
  write,
  outputDirectory,
  ...result.manifest.summary,
  artifacts: result.artifacts,
}, null, 2)}\n`);

