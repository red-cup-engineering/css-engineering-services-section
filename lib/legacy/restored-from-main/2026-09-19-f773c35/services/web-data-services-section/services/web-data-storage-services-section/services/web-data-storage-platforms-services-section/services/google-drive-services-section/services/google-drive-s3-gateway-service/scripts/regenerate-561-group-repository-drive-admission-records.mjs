#!/usr/bin/env node

import { resolve } from "node:path";

import { generateRepositoryDriveAdmissionRecords } from "../src/repository-drive-admission-record-generator.mjs";

const RECORDS = "lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/web-services-section/services/web-data-services-section/services/web-data-storage-services-section/services/web-data-storage-platforms-services-section/services/google-drive-services-section/data/records";
const argumentsSet = new Set(process.argv.slice(2));
if ([...argumentsSet].some((argument) => argument !== "--dry-run" && argument !== "--write")
  || (argumentsSet.has("--dry-run") && argumentsSet.has("--write"))) {
  throw new Error("usage: regenerate-561-group-repository-drive-admission-records [--dry-run|--write]");
}
const write = argumentsSet.has("--write");
const workspaceRoot = resolve(process.env.INFO_WORKSPACE_ROOT ?? process.cwd());
const outputDirectory = resolve(workspaceRoot, RECORDS);
const repositoryMaterialManifestPath = resolve(outputDirectory, "2026-08-20-repository-material-record-set.json");
const result = await generateRepositoryDriveAdmissionRecords({
  workspaceRoot,
  outputDirectory,
  repositoryMaterialManifestPath,
  write,
  onFileVerified: ({ completed, total, path }) => {
    if (completed % 10 === 0 || completed === total) {
      process.stderr.write(`${JSON.stringify({ event: "repository-drive-admission-progress", completed, total, path })}\n`);
    }
  },
});
process.stdout.write(`${JSON.stringify({
  status: write ? "repository-drive-admission-record-set-published" : "dry-run-complete",
  write,
  outputDirectory: result.outputDirectory,
  summary: result.manifest.summary,
  artifacts: result.artifacts,
}, null, 2)}\n`);
