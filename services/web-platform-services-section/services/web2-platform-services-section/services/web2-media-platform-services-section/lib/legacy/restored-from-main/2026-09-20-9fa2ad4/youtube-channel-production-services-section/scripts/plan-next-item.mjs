#!/usr/bin/env node
/**
 * @module plan-next-item
 * Chooses the channel's next production topic and its release slot:
 * `selectNextTopic` over an admitted screening ledger, then
 * `nextReleaseSlot` for the winning candidate.
 */
import { readFile, writeFile } from "node:fs/promises";
import { runJsonMain } from "@red-cup-engineering/javascript-file-main-guard-service";
import { validateChannelSpec, selectNextTopic, nextReleaseSlot } from "../src/youtube-channel-production.mjs";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";

/**
 * @param {{spec: object, ledger: object, demand?: object, inventory?: object[], claimed?: string[], now: string}} options
 * @returns {{type: "PlannedItem", channel: string, dedupeKey: string, item: object, civilDay: string, plannedPublishAt: string, reason: string, rankedAt: string}}
 */
export function planNextItem({ spec, ledger, demand, inventory = [], claimed = [], now }) {
  const validSpec = validateChannelSpec(spec);
  const { chosen, rankedAt } = selectNextTopic(validSpec, { ledger, demand, inventory, now });
  const slot = nextReleaseSlot(validSpec, claimed, now);
  return Object.freeze({
    type: "PlannedItem",
    channel: validSpec.id,
    dedupeKey: chosen.dedupeKey,
    item: chosen.item,
    reason: chosen.reason,
    civilDay: slot.civilDay,
    plannedPublishAt: slot.plannedPublishAt,
    rankedAt,
  });
}


async function main({ argv }) {
  const specPath = argument("--spec", argv);
  const ledgerPath = argument("--ledger", argv);
  const outPath = argument("--out", argv);
  if (!specPath || !ledgerPath || !outPath) throw new Error("usage: plan-next-item.mjs --spec <path> --ledger <path> --out <path> [--demand <path>] [--inventory <path>] [--claimed <path>] [--now <iso>]");
  const spec = JSON.parse(await readFile(specPath, "utf8"));
  const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
  const demandPath = argument("--demand", argv);
  const inventoryPath = argument("--inventory", argv);
  const claimedPath = argument("--claimed", argv);
  const demand = demandPath ? JSON.parse(await readFile(demandPath, "utf8")) : undefined;
  const inventory = inventoryPath ? JSON.parse(await readFile(inventoryPath, "utf8")) : [];
  const claimed = claimedPath ? JSON.parse(await readFile(claimedPath, "utf8")) : [];
  const now = argument("--now", argv) ?? new Date().toISOString();
  const planned = planNextItem({ spec, ledger, demand, inventory, claimed, now });
  await writeFile(outPath, `${JSON.stringify(planned, null, 2)}\n`, "utf8");
  return planned;
}

runJsonMain(main, import.meta.url);
