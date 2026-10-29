#!/usr/bin/env node
/**
 * @module record-receipt
 * Records one production-stage receipt into the channel's own semantic
 * record journal (`@red-cup-engineering/semantic-record-journal-service`)
 * under `<CHANNEL_STATE_ROOT>` -- the single custody point every other
 * stage's receipt goes through.
 */
import { readFile, writeFile } from "node:fs/promises";
import { createSemanticRecordJournal } from "@red-cup-engineering/semantic-record-journal-service";
import { runJsonMain } from "@red-cup-engineering/javascript-file-main-guard-service";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";

export const OBJECT_KIND = "youtube-channel-production";

/**
 * @param {string} root
 * @returns {ReturnType<typeof createSemanticRecordJournal>}
 */
export function createChannelJournal(root) {
  return createSemanticRecordJournal({ root, objectKind: OBJECT_KIND });
}

/**
 * @param {{root: string, category: string, record: object, recordedAt?: string, charge?: {support: boolean, refutation: boolean}, relation?: object}} options
 * @returns {object} the journal's record-appended admission
 */
export function recordChannelReceipt({ root, category, record, recordedAt = new Date().toISOString(), charge = { support: true, refutation: false }, relation }) {
  return createChannelJournal(root).record({ category, record, recordedAt, charge, ...(relation ? { relation } : {}) });
}


async function main({ argv }) {
  const root = argument("--root", argv);
  const category = argument("--category", argv);
  const recordPath = argument("--record", argv);
  const outPath = argument("--out", argv);
  if (!root || !category || !recordPath) throw new Error("usage: record-receipt.mjs --root <dir> --category <name> --record <path.json> [--out <path>] [--now <iso>]");
  const record = JSON.parse(await readFile(recordPath, "utf8"));
  const admission = recordChannelReceipt({ root, category, record, recordedAt: argument("--now", argv) });
  if (outPath) await writeFile(outPath, `${JSON.stringify(admission, null, 2)}\n`, "utf8");
  return admission;
}

runJsonMain(main, import.meta.url);
