#!/usr/bin/env node

import { Activity } from "@fedify/vocab";
import { runMain } from "@red-cup-engineering/javascript-file-services-section/javascript-file-main-guard";
import {
  OnchainResourceClient,
  createOnchainActivityPubAdapters,
  loadOnchainWallet,
  settlementPulseActivity,
} from "@red-cup-engineering/activitypub-services-section/onchain";
import { createR2OnchainExternalBodyStore } from "./onchain-r2-external-body.mjs";
import { serveActivityPubProvider } from "./server.mjs";

function required(name) {
  const value = process.env[name];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

export async function main() {
  const wallet = await loadOnchainWallet({
    rpcUrl: required("EVM_RPC_URL"),
    keystorePath: required("EVM_KEYSTORE_PATH"),
    passwordPath: required("EVM_KEYSTORE_PASSWORD_PATH"),
  });
  const actor = required("ACTIVITYPUB_IDENTIFIER");
  const origin = required("ACTIVITYPUB_ORIGIN");
  const chain = `eip155:${required("EVM_CHAIN_ID")}`;
  const client = new OnchainResourceClient({
    contractAddress: required("ONCHAIN_RESOURCE_CONTRACT"),
    wallet,
    externalBodies: createR2OnchainExternalBodyStore(),
  });
  const adapters = createOnchainActivityPubAdapters({ client, actor });
  const announceSettlementPulse = process.env.ACTIVITYPUB_ANNOUNCE_SETTLEMENT_PULSE !== "false";
  return serveActivityPubProvider({
    ...adapters,
    ...(announceSettlementPulse ? { onActivity: async (arrival) => {
      await adapters.outbox.publish(settlementPulseActivity({
        origin,
        actor,
        chain,
        settlement: arrival.settlement,
        announced: arrival.jsonLd?.id ?? null,
      }));
    } } : {}),
    listOutbox: async ({ cursor }) => {
      const listed = await adapters.outbox.list({ cursor: cursor ?? undefined, limit: 100 });
      return {
        items: await Promise.all(listed.items.map((item) => Activity.fromJsonLd(item))),
        ...(listed.nextCursor === undefined ? {} : { nextCursor: listed.nextCursor }),
      };
    },
    origin,
    identifier: actor,
    actorName: required("ACTIVITYPUB_ACTOR_NAME"),
    summary: required("ACTIVITYPUB_ACTOR_SUMMARY"),
    keyPath: required("ACTIVITYPUB_KEYS_PATH"),
    bearerTokenPath: required("ACTIVITYPUB_INBOX_BEARER_TOKEN_FILE"),
    ...(process.env.ACTIVITYPUB_CELL_ID ? {
      cell: process.env.ACTIVITYPUB_CELL_ID,
      controller: `did:pkh:eip155:${required("EVM_CHAIN_ID")}:${wallet.address}`,
    } : {}),
    hostname: process.env.HOST ?? "127.0.0.1",
    port: Number(process.env.PORT ?? "15625"),
  });
}

await runMain(() => main(), { moduleUrl: import.meta.url, formatError: (error) => `${error instanceof Error ? error.stack : String(error)}\n`, exitCode: 1 });
