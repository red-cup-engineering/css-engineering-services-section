#!/usr/bin/env node

import { mkdir, open, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createContentAddressedObjectStorage } from "@red-cup-engineering/fileset-object-storage-service";
import { createGoogleDriveObjectCustody } from "@red-cup-engineering/google-drive-object-custody-service";
import { create561GroupContentMigrationPolicy } from "../src/561-group-content-migration-policy.mjs";
import { readCommittedMigrationCensus } from "../src/content-migration-record-generator.mjs";
import { runContentMigration } from "../src/content-migration-runner.mjs";
import { createGoogleDriveLibraryProjector } from "../src/google-drive-library-projector.mjs";
import { readMigrationJournal } from "../src/migration-journal.mjs";
import { createRcloneGoogleAccessTokenProvider } from "../src/rclone-google-access-token.mjs";

const RECORDS = "lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/web-services-section/services/web-data-services-section/services/web-data-storage-services-section/services/web-data-storage-platforms-services-section/services/google-drive-services-section/data/records";
const DEFAULT_CENSUS = `${RECORDS}/2026-08-20-content-migration-census.json.gz`;
const DEFAULT_RECORD_SET = `${RECORDS}/2026-08-20-content-migration-record-set.json`;
const DEFAULT_JOURNAL = `${RECORDS}/2026-08-20-content-migration-dispositions.jsonl`;

function required(environment, name) {
  const value = environment[name];
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) throw new Error(`${name} is required`);
  return value;
}

function boundedInteger(environment, name, fallback, minimum, maximum) {
  const offered = environment[name];
  if (offered === undefined) return fallback;
  const value = Number(offered);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} through ${maximum}`);
  }
  return value;
}

const workspaceRoot = resolve(process.env.INFO_WORKSPACE_ROOT ?? process.cwd());
const rootFolderId = required(process.env, "GOOGLE_DRIVE_S3_ROOT_FOLDER_ID");
const verificationPolicy = required(process.env, "CONTENT_MIGRATION_VERIFICATION_POLICY");
const recordSetPath = resolve(workspaceRoot, process.env.CONTENT_MIGRATION_RECORD_SET_PATH ?? DEFAULT_RECORD_SET);
const journalPath = resolve(workspaceRoot, process.env.CONTENT_MIGRATION_JOURNAL_PATH ?? DEFAULT_JOURNAL);
const compactPath = journalPath.replace(/\.jsonl$/u, ".json");
const projectionPhase = process.env.CONTENT_MIGRATION_PROJECTION_PHASE ?? "deferred";
if (projectionPhase !== "inline" && projectionPhase !== "deferred") {
  throw new Error('CONTENT_MIGRATION_PROJECTION_PHASE must be "inline" or "deferred"');
}
const retryPolicy = {
  maxAttempts: boundedInteger(process.env, "CONTENT_MIGRATION_RETRY_MAX_ATTEMPTS", 8, 1, 100),
  baseDelayMilliseconds: boundedInteger(process.env, "CONTENT_MIGRATION_RETRY_BASE_DELAY_MILLISECONDS", 2_000, 0, 3_600_000),
  maximumDelayMilliseconds: boundedInteger(process.env, "CONTENT_MIGRATION_RETRY_MAXIMUM_DELAY_MILLISECONDS", 300_000, 0, 3_600_000),
};
const minimumRequestIntervalMilliseconds = boundedInteger(process.env,
  "GOOGLE_DRIVE_MIN_REQUEST_INTERVAL_MILLISECONDS", 1_100, 0, 60_000);
const accessTokenProvider = createRcloneGoogleAccessTokenProvider({
  remote: process.env.GOOGLE_DRIVE_RCLONE_REMOTE ?? "gdrive:",
  requireDedicatedClient: true,
});
const custody = createGoogleDriveObjectCustody({ rootFolderId, accessTokenProvider,
  uploadChunkBytes: Number(process.env.GOOGLE_DRIVE_UPLOAD_CHUNK_BYTES ?? 8 * 1024 * 1024),
  minimumRequestIntervalMilliseconds });
const storage = createContentAddressedObjectStorage({ custody });
const libraryProjector = projectionPhase === "inline"
  ? createGoogleDriveLibraryProjector({ custody, storage, rootFolderId }) : null;
const policy = create561GroupContentMigrationPolicy();
const committedRecords = await readCommittedMigrationCensus({ manifestPath: recordSetPath });
const census = committedRecords.census;
const censusPath = resolve(dirname(recordSetPath), committedRecords.evidence.censusFilename ?? DEFAULT_CENSUS);
const journalState = await readMigrationJournal(journalPath, { repairTrailingPartial: true });
const existingDispositions = journalState.records;

process.stderr.write(`${JSON.stringify({ event: "migration-started", censusPath, journalPath,
  recordSetPath, censusContentSha256: committedRecords.evidence.censusContentSha256,
  censusSources: census.files?.length ?? null, existingJournalRecords: existingDispositions.length,
  journalRecovery: journalState.recovery, verificationPolicy, projectionPhase, retryPolicy,
  minimumRequestIntervalMilliseconds,
  sourceRetirementAuthorized: false })}\n`);

await mkdir(dirname(journalPath), { recursive: true });
const journal = await open(journalPath, "a");
let dispositions;
try {
  if (journalState.recovery?.action === "completed-missing-newline") {
    await journal.appendFile("\n"); await journal.sync();
  }
  dispositions = await runContentMigration({ census, workspaceRoot, storage, libraryProjector,
    route: (file) => policy.route(file), existingDispositions, verificationPolicy, projectionPhase, retryPolicy,
    onDisposition: async (record) => {
      await journal.appendFile(`${JSON.stringify(record)}\n`);
      await journal.sync();
    },
    onProgress: async (event) => process.stderr.write(`${JSON.stringify(event)}\n`),
  });
} finally { await journal.close(); }

const complete = { schemaVersion: "content-migration-disposition-set/v1", censusPath,
  verificationPolicy, projectionPhase, completedAt: new Date().toISOString(), sourceRetirementAuthorized: false,
  dispositions };
const temporaryPath = `${compactPath}.tmp-${process.pid}`;
await writeFile(temporaryPath, `${JSON.stringify(complete, null, 2)}\n`, { flag: "wx" });
await rename(temporaryPath, compactPath);
process.stdout.write(`${JSON.stringify({ status: "migration-verified", sources: dispositions.length,
  compactPath, journalPath, sourceRetirementAuthorized: false })}\n`);
