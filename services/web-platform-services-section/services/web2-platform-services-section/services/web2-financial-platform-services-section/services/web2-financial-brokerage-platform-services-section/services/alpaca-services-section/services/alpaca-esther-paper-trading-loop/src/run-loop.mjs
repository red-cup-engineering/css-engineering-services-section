#!/usr/bin/env node
// Esther Davis Alpaca account -- standing order loop, live or paper as its credentials are.
// One cycle trades through the full pipeline (belief -> tournament ->
// mandate -> size-position -> order intent -> execution transport ->
// venue adapter -> witness -> reconciliation) via ./pipeline.mjs.

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { semanticIdOf } from "@red-cup-engineering/computer-content-engineering-services-section/semantic-content-identity";
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { alpacaCredentials, tradingFetch } from "@red-cup-engineering/alpaca-services-section/guards";

import { runTradingCycle } from "./pipeline.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const JOURNAL_ROOT = join(HERE, "..");
const DATA_ROOT = join(HERE, "..", "data", "records");
const BOOKS_DATA_ROOT = join(HERE, "..", "data", "state", "brokerage-books");
export const JOURNAL_OBJECT_KIND = "alpaca-esther-paper-trading-loop.decision";
export const JOURNAL_CATEGORY = "esther-trading.decision";
const relationalId = semanticIdOf("brokerage.alpaca-esther-paper-trading-loop.record");

/**
 * Emit a decision receipt on stdout (content-addressed, unchanged) and
 * additionally append it as a witnessed decision record through the house
 * semantic record journal.
 * @param {object} entry - Decision fields (guard, disposition, cycle, ...).
 * @param {object} [options]
 * @param {string} [options.root] - Journal root override, for tests.
 * @returns {object} The frozen stdout receipt.
 */
export function journal(entry, { root = JOURNAL_ROOT } = {}) {
  const body = Object.freeze({
    type: "AlpacaTradingDecisionReceipt",
    version: 2,
    observedAt: new Date().toISOString(),
    persistentVoxelState: false,
    ...entry,
  });
  const receipt = Object.freeze({ id: relationalId(body), ...body });
  process.stdout.write(`${JSON.stringify(receipt)}\n`);

  const recordedAt = new Date().toISOString();
  createSemanticRecordJournal({ root, objectKind: JOURNAL_OBJECT_KIND }).record({
    category: JOURNAL_CATEGORY,
    recordedAt,
    record: { timestamp: recordedAt, ...receipt },
    told: { for: true, against: false },
  });

  return receipt;
}

async function main() {
  const env = process.env;

  let credentials;
  try {
    credentials = alpacaCredentials(env);
  } catch (error) {
    journal({ guard: "refused", reason: error.message, disposition: null });
    console.error(`REFUSED: ${error.message}`);
    process.exit(1);
  }

  let clockCheck;
  try {
    clockCheck = await tradingFetch(credentials, "GET", "/v2/clock");
  } catch (error) {
    journal({ guard: "passed", disposition: "clock-read-error", reason: error.message });
    console.error(`clock read failed: ${error.message}`);
    process.exit(1);
  }
  if (!clockCheck.ok) {
    journal({ guard: "passed", disposition: "clock-read-refused", reason: `status:${clockCheck.status}` });
    console.error(`clock read refused: ${clockCheck.status}`);
    process.exit(1);
  }
  if (!clockCheck.body?.is_open) {
    journal({ guard: "passed", disposition: "market-closed" });
    console.log(`Market closed (next_open=${clockCheck.body?.next_open ?? "unknown"}); exiting cleanly.`);
    process.exit(0);
  }

  let outcome;
  try {
    outcome = await runTradingCycle({ env, dataRoot: DATA_ROOT, booksDataRoot: BOOKS_DATA_ROOT });
  } catch (error) {
    journal({ guard: "refused", reason: error.message, disposition: null });
    console.error(`REFUSED: ${error.message}`);
    process.exit(1);
  }

  journal({ guard: "passed", venue: `alpaca-trading-${credentials.mode}`, disposition: outcome.disposition, cycle: outcome });
  if (outcome.disposition === "hold") {
    console.log(`Hold: ${outcome.holdIntent.reason}`);
  } else {
    console.log(`Placed ${credentials.mode} order for ${outcome.intent.symbol} notional ${outcome.intent.notional} -> venue status ${outcome.receipt.orderVenueStatus}`);
  }
  process.exit(0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    journal({ guard: "error", reason: error?.message ?? String(error), disposition: null });
    console.error(error);
    process.exit(1);
  });
}
