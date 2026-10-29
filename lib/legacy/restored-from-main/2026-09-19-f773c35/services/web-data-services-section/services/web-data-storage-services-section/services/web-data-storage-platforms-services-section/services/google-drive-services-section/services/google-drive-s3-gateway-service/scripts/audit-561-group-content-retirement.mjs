#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { create561GroupContentMigrationPolicy } from "../src/561-group-content-migration-policy.mjs";
import { createContentRetirementAudit } from "../src/content-retirement-audit.mjs";
import { readMigrationJournal } from "../src/migration-journal.mjs";

const RECORDS = "lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/web-services-section/services/web-data-services-section/services/web-data-storage-services-section/services/web-data-storage-platforms-services-section/services/google-drive-services-section/data/records";
const DEFAULT_CENSUS = `${RECORDS}/2026-08-20-content-migration-census.json.gz`;
const DEFAULT_JOURNAL = `${RECORDS}/2026-08-20-content-migration-dispositions.jsonl`;

async function readCensus(path) {
  const retained = await readFile(path);
  return JSON.parse((path.endsWith(".gz") ? gunzipSync(retained) : retained).toString("utf8"));
}

try {
  const workspaceRoot = resolve(process.env.INFO_WORKSPACE_ROOT ?? process.cwd());
  const censusPath = resolve(workspaceRoot, process.env.CONTENT_MIGRATION_CENSUS_PATH ?? DEFAULT_CENSUS);
  const journalPath = resolve(workspaceRoot, process.env.CONTENT_MIGRATION_JOURNAL_PATH ?? DEFAULT_JOURNAL);
  const census = await readCensus(censusPath);
  const journal = await readMigrationJournal(journalPath);
  const policy = create561GroupContentMigrationPolicy();
  const manifest = await createContentRetirementAudit({ census, dispositions: journal.records,
    workspaceRoot, route: (file) => policy.route(file) });
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`retirement audit refused: ${error.message}\n`);
  process.exitCode = 1;
}
