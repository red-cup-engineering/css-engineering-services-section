#!/usr/bin/env node

import { serveActivityPubProvider } from "@red-cup-engineering/activitypub-services-section/server";
import { createSupplierActivityPubCallbacks } from "./activitypub-face.mjs";
import { foragingReadLedger } from "./improvement-board-forager-service.mjs";

function required(name) { const value = process.env[name]; if (typeof value !== "string" || !value) throw new Error(`${name} is required`); return value; }

export async function serveSupplierActivityPubFace(options = {}) {
  const origin = options.origin ?? required("ACTIVITYPUB_ORIGIN"), identifier = options.identifier ?? required("ACTIVITYPUB_IDENTIFIER");
  const agentCard = options.agentCard ?? required("SUPPLIER_ACTIVITYPUB_AGENT_CARD");
  const callbacks = createSupplierActivityPubCallbacks({ origin, identifier, agentCard, ledger: options.ledger ?? foragingReadLedger(options) });
  return serveActivityPubProvider({ ...options, origin, identifier, listOutbox: callbacks.listOutbox, onActivity: callbacks.onActivity });
}

if (import.meta.url === `file://${process.argv[1]}`) serveSupplierActivityPubFace().catch((error) => { process.stderr.write(`${error.stack ?? error}\n`); process.exitCode = 1; });
