#!/usr/bin/env node
/**
 * @module collect-analytics
 * Collects one closed audience-attention window from YouTube Analytics
 * for a channel, deduplicating against the channel's own journal so a
 * re-run of an already-observed window is a no-op.
 */
import { readFile, writeFile } from "node:fs/promises";
import { collectAudienceAttentionAnalytics, createAudienceAttentionAuthorizedFetch } from "@red-cup-engineering/youtube-services-section";
import { runJsonMain } from "@red-cup-engineering/javascript-file-main-guard-service";
import { validateChannelSpec } from "../src/youtube-channel-production.mjs";
import { digestValue, identifyValue } from "../src/receipts.mjs";
import { refreshAccessToken, resolveChannelSecrets } from "../src/google-oauth.mjs";
import { createChannelJournal } from "./record-receipt.mjs";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";

/**
 * @param {{spec: object, activation: {analyticsCollection: string}, root: string, window?: {startDate: string, endDate: string}, now?: Date, environment?: NodeJS.ProcessEnv, fetchImpl?: typeof fetch}} options
 * @returns {Promise<object>} `collectAudienceAttentionAnalytics`'s result
 */
export async function collectChannelAnalytics({ spec, activation, root, window, now = new Date(), environment = process.env, fetchImpl = fetch } = {}) {
  const validSpec = validateChannelSpec(spec);
  const credentials = resolveChannelSecrets(validSpec.secrets, environment);
  const accessToken = await refreshAccessToken(credentials, { fetchImpl });
  const authorizedFetch = createAudienceAttentionAuthorizedFetch(accessToken, fetchImpl);
  const journal = createChannelJournal(root);
  const rawCategory = `${validSpec.id}.youtube-analytics-raw-report`;
  const observationCategory = `${validSpec.id}.youtube-analytics-observation`;
  return collectAudienceAttentionAnalytics({
    activation, window, now, authorizedFetch, channel: validSpec.id,
    identify: identifyValue, digest: digestValue, rawCategory, observationCategory,
    queryRecords: async (category) => journal.query({ category }).map((row) => row.record),
    store: { record: async ({ category, recordedAt, record }) => journal.record({ category, recordedAt, record, charge: { support: true, refutation: false } }) },
  });
}


async function main({ argv }) {
  const specPath = argument("--spec", argv);
  const activationPath = argument("--activation", argv);
  const root = argument("--root", argv);
  const outPath = argument("--out", argv);
  if (!specPath || !activationPath || !root || !outPath) throw new Error("usage: collect-analytics.mjs --spec <path> --activation <path> --root <dir> --out <path> [--window <path>]");
  const spec = JSON.parse(await readFile(specPath, "utf8"));
  const activation = JSON.parse(await readFile(activationPath, "utf8"));
  const windowPath = argument("--window", argv);
  const window = windowPath ? JSON.parse(await readFile(windowPath, "utf8")) : undefined;
  const result = await collectChannelAnalytics({ spec, activation, root, window });
  await writeFile(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
}

runJsonMain(main, import.meta.url);
