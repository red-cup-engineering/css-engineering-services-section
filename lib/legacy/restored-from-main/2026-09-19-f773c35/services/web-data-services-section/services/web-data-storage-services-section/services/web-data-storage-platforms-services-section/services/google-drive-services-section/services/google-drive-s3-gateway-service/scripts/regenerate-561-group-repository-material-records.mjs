#!/usr/bin/env node

import { resolve } from "node:path";

import { generateRepositoryMaterialRecords } from "../src/repository-material-record-generator.mjs";

const DEFAULT_RECORDS = "lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/web-services-section/services/web-data-services-section/services/web-data-storage-services-section/services/web-data-storage-platforms-services-section/services/google-drive-services-section/data/records";
const arguments_ = new Set(process.argv.slice(2));
const known = new Set(["--dry-run", "--write"]);
for (const argument of arguments_) if (!known.has(argument)) throw new Error(`unknown argument: ${argument}`);
if (arguments_.has("--dry-run") && arguments_.has("--write")) throw new Error("choose either --dry-run or --write");

const workspaceRoot = resolve(process.env.INFO_WORKSPACE_ROOT ?? process.cwd());
const outputDirectory = resolve(workspaceRoot, process.env.REPOSITORY_MATERIAL_RECORDS_DIRECTORY ?? DEFAULT_RECORDS);
const write = arguments_.has("--write");
let observedFiles = 0;
const result = await generateRepositoryMaterialRecords({
  workspaceRoot,
  outputDirectory,
  write,
  onEntryObserved: async ({ observedFiles: count, totalFiles, path }) => {
    observedFiles = count;
    if (observedFiles % 1_000 === 0) process.stderr.write(`${JSON.stringify({ event: "repository-census-progress", observedFiles, totalFiles, path })}\n`);
  },
});

process.stdout.write(`${JSON.stringify({
  status: write ? "repository-material-record-set-published" : "dry-run-complete",
  write,
  outputDirectory,
  observedFiles,
  ...result.manifest.summary,
  dispositionSummary: result.manifest.dispositionSummary,
  artifacts: result.artifacts,
}, null, 2)}\n`);
