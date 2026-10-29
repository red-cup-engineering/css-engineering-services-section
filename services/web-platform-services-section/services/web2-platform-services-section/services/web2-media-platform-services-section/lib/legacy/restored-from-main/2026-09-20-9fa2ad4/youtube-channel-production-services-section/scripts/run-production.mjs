#!/usr/bin/env node
/**
 * @module run-production
 * The channel-production runner: gate on activation and OAuth secrets,
 * plan the next item, acquire, generate, render, thumbnail, publish, and
 * record a receipt per stage into the channel's journal under `dataRoot`.
 * Planning and publishing are idempotent against that journal.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { runJsonMain } from "@red-cup-engineering/javascript-file-main-guard-service";
import { validateChannelSpec } from "../src/youtube-channel-production.mjs";
import { resolveChannelSecrets } from "../src/google-oauth.mjs";
import { planNextItem } from "./plan-next-item.mjs";
import { acquireSources } from "./acquire-sources.mjs";
import { generateVideoScript } from "./generate-script.mjs";
import { renderChannelVideo } from "./render-video.mjs";
import { makeChannelThumbnail } from "./make-thumbnail.mjs";
import { publishChannelVideo } from "./publish-video.mjs";
import { createChannelJournal } from "./record-receipt.mjs";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";

function turnFor(dedupeKey) {
  return createHash("sha256").update(dedupeKey).digest("hex").slice(0, 32);
}

function existingByDedupeKey(journal, category, dedupeKey) {
  return journal.query({ category }).map((row) => row.record).find((record) => record.dedupeKey === dedupeKey);
}

function record(journal, category, value, at) {
  journal.record({ category, record: value, recordedAt: at, charge: { support: true, refutation: false } });
  return value;
}

/**
 * @param {{spec: object, activation: {youtubeWrites: string}, ledger: object, dataRoot: string, workRoot: string, demand?: object, mailto?: string, now?: string, environment?: NodeJS.ProcessEnv, fetchImpl?: typeof fetch, uploadFetch?: typeof fetch, generateExecute?: Function, renderExecute?: Function, thumbnailGenerate?: Function, publishPoll?: object}} options
 * @returns {Promise<object>} the full run's stage-by-stage summary
 * @throws {Error} when activation refuses writes, OAuth secrets are absent, or any stage fails
 */
export async function runChannelProduction({
  spec, activation, ledger, dataRoot, workRoot, demand, mailto, now = new Date().toISOString(),
  environment = process.env, fetchImpl = fetch, uploadFetch = fetch,
  generateExecute, renderExecute, thumbnailGenerate, publishPoll,
} = {}) {
  const validSpec = validateChannelSpec(spec);
  if (activation?.youtubeWrites !== "granted") throw new Error(`channel ${validSpec.id} production requires activation.youtubeWrites === "granted"`);
  resolveChannelSecrets(validSpec.secrets, environment);
  if (!dataRoot) throw new Error("runChannelProduction requires an explicit dataRoot (CHANNEL_STATE_ROOT)");
  if (!workRoot) throw new Error("runChannelProduction requires an explicit workRoot (CHANNEL_WORK_ROOT)");
  await mkdir(dataRoot, { recursive: true });
  await mkdir(workRoot, { recursive: true });

  const journal = createChannelJournal(dataRoot);
  const publicationCategory = `${validSpec.id}.publication-receipt`;
  const inventory = journal.query({ category: publicationCategory }).map((row) => ({ dedupeKey: row.record.dedupeKey }));
  const claimed = journal.query({ category: publicationCategory }).map((row) => row.record.civilDay);

  const plannedItem = planNextItem({ spec: validSpec, ledger, demand, inventory, claimed, now });
  const already = existingByDedupeKey(journal, publicationCategory, plannedItem.dedupeKey);
  if (already) return { status: "already-published", plannedItem, publicationReceipt: already };
  record(journal, `${validSpec.id}.planned-item`, plannedItem, now);
  const turn = turnFor(plannedItem.dedupeKey);

  const sourceBundleCategory = `${validSpec.id}.source-bundle`;
  const sourceBundle = existingByDedupeKey(journal, sourceBundleCategory, plannedItem.dedupeKey)
    ?? record(journal, sourceBundleCategory, { ...(await acquireSources({ spec: validSpec, item: plannedItem.item, root: workRoot, fetchImpl, mailto })), dedupeKey: plannedItem.dedupeKey }, now);

  const scriptCategory = `${validSpec.id}.generated-script`;
  const scriptRecord = existingByDedupeKey(journal, scriptCategory, plannedItem.dedupeKey)
    ?? record(journal, scriptCategory, {
      ...(await generateVideoScript({ spec: validSpec, sourceBundle, receiptRoot: join(dataRoot, "runtime", "inference-receipts"), turn, execute: generateExecute })).script,
      dedupeKey: plannedItem.dedupeKey,
    }, now);

  const rendered = await renderChannelVideo({ spec: validSpec, script: scriptRecord, workDirectory: join(workRoot, turn), execute: renderExecute });
  record(journal, `${validSpec.id}.rendered-video`, { dedupeKey: plannedItem.dedupeKey, sha256: rendered.sha256, byteLength: rendered.byteLength, planDigest: rendered.planDigest, provenanceDigest: rendered.provenanceDigest }, now);

  const thumbnail = await makeChannelThumbnail({ spec: validSpec, script: scriptRecord, generate: thumbnailGenerate });
  record(journal, `${validSpec.id}.thumbnail`, { dedupeKey: plannedItem.dedupeKey, provider: thumbnail.provider, sha256: thumbnail.sha256, byteLength: thumbnail.byteLength }, now);

  const videoBytes = await readFile(rendered.artifactPath);
  const publicationReceipt = await publishChannelVideo({
    spec: validSpec, videoBytes, thumbnailBytes: thumbnail.buffer,
    metadata: { title: scriptRecord.title, description: scriptRecord.description, tags: scriptRecord.tags },
    plannedPublishAt: plannedItem.plannedPublishAt, environment, fetchImpl, uploadFetch, poll: publishPoll,
  });
  record(journal, publicationCategory, { ...publicationReceipt, dedupeKey: plannedItem.dedupeKey, civilDay: plannedItem.civilDay }, now);

  return { status: "published", plannedItem, sourceBundle, script: scriptRecord, rendered, thumbnail: { provider: thumbnail.provider, sha256: thumbnail.sha256 }, publicationReceipt };
}


async function main({ argv }) {
  const specPath = argument("--spec", argv);
  const activationPath = argument("--activation", argv);
  const ledgerPath = argument("--ledger", argv);
  const dataRoot = argument("--data-root", argv) ?? process.env.CHANNEL_STATE_ROOT;
  const workRoot = argument("--work-root", argv) ?? process.env.CHANNEL_WORK_ROOT;
  const outPath = argument("--out", argv);
  if (!specPath || !activationPath || !ledgerPath || !dataRoot || !workRoot) {
    throw new Error("usage: run-production.mjs --spec <path> --activation <path> --ledger <path> [--data-root <dir>] [--work-root <dir>] [--out <path>]");
  }
  const spec = JSON.parse(await readFile(specPath, "utf8"));
  const activation = JSON.parse(await readFile(activationPath, "utf8"));
  const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
  const result = await runChannelProduction({ spec, activation, ledger, dataRoot, workRoot, mailto: argument("--mailto", argv) });
  if (outPath) await writeFile(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
}

runJsonMain(main, import.meta.url);
