#!/usr/bin/env node

import { Activity } from "@fedify/vocab";
import { OnchainResourceClient, createOnchainActivityPubAdapters, loadOnchainWallet } from "./onchain.mjs";
import { serveActivityPubProvider } from "./server.mjs";

const ACTIVITYSTREAMS_CONTEXT = "https://www.w3.org/ns/activitystreams";
const ACTIVITYSTREAMS_PUBLIC = "https://www.w3.org/ns/activitystreams#Public";

function required(name) {
  const value = process.env[name];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

/**
 * Project one public ActivityStreams Create announcing one settled ERC-5219
 * commitment: the transaction that retained a verified arrival in the actor's
 * onchain inbox custody. This is the pulse write path onto the actor's own
 * onchain outbox collection.
 */
export function settlementPulseActivity({ origin, actor, chain, settlement, announced }) {
  if (typeof settlement?.transaction !== "string" || typeof settlement?.digest !== "string") {
    throw new Error("onchain inbox custody returned no settlement receipt");
  }
  const blockHash = typeof settlement.blockHash === "string" ? settlement.blockHash : settlement.transaction;
  const coordinate = Number.isSafeInteger(settlement.transactionIndex) ? settlement.transactionIndex : 0;
  return Object.freeze({
    "@context": ACTIVITYSTREAMS_CONTEXT,
    id: new URL(`/activities/${encodeURIComponent(chain)}/${blockHash.slice(2).toLowerCase()}/${coordinate}`, origin).href,
    type: "Create",
    actor: new URL(`/actors/${actor}`, origin).href,
    to: ACTIVITYSTREAMS_PUBLIC,
    published: new Date().toISOString(),
    object: Object.freeze({
      type: "Document",
      mediaType: "application/json",
      name: "SettlementPulseCommitment",
      content: JSON.stringify({
        type: "SettlementPulseCommitment",
        chain,
        transactionHash: settlement.transaction,
        blockNumber: settlement.blockNumber,
        blockHash,
        sha256Digest: settlement.digest,
        announcedActivity: announced ?? null,
      }),
    }),
  });
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
  const client = new OnchainResourceClient({ contractAddress: required("ONCHAIN_RESOURCE_CONTRACT"), wallet });
  const adapters = createOnchainActivityPubAdapters({ client, actor });
  return serveActivityPubProvider({
    ...adapters,
    onActivity: async (arrival) => {
      await adapters.outbox.publish(settlementPulseActivity({
        origin,
        actor,
        chain,
        settlement: arrival.settlement,
        announced: arrival.jsonLd?.id ?? null,
      }));
    },
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
    cell: required("ACTIVITYPUB_CELL_ID"),
    controller: `did:pkh:eip155:${required("EVM_CHAIN_ID")}:${wallet.address}`,
    hostname: process.env.HOST ?? "127.0.0.1",
    port: Number(process.env.PORT ?? "15625"),
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
