import { resolve } from "node:path";
import { createBrokerageMarketEventRecorder, createBrokerageOutcomeWitnessRecorder } from "@red-cup-engineering/brokerage-independent-witness-and-books";
import { createUnionMarketState, serveUnionBrokerageActivityPub } from "@red-cup-engineering/union-brokerage-products-market-border/activitypub-runtime";
import { formUnionBrokerageOffer } from "@red-cup-engineering/union-brokerage-products-market-border";
import { createUnionConsiderationSettlementProvider } from "@red-cup-engineering/alpaca-services-section/settlement-provider";
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { createBrokerageProductProviders, indexBrokerageProvidersByService } from "./market-runtime.mjs";

const required = (env, name) => { const value = env[name]; if (typeof value !== "string" || value.trim() === "") throw new Error(`${name} is required`); return value; };
const prices = Object.freeze({ "issuer-evidence-packet": "0.25", "aggressive-alpha-research-packet": "1.00", "obsmetrologia-blk-topological-accumulation": "3.00", "paper-portfolio-and-order-intents": "2.00", "account-normalization-and-reconciliation": "0.50", "venue-adapter-read": "0.01", "execution-transport": "0.02" });
export function formFederationUnionOffers({ providers, validUntil }) {
  return Object.freeze(Object.entries(providers).filter(([service, provider]) => prices[service] && typeof provider === "function").map(([service, provider]) => formUnionBrokerageOffer({ provider: provider.originatingActor, service,
    price: { asset: "urn:iso:currency:USDC", unit: "USDC", amount: prices[service] }, validUntil, terms: { delivery: "content-addressed-product-plus-independent-witness", settlement: "exact-grant-no-conversion" } })));
}
export async function createFederationUnionRuntime(env = process.env, dependencies = {}) {
  const recordSettlement = dependencies.recordSettlement ?? (dependencies.consumeUnionGrant ? createBrokerageMarketEventRecorder({ originatingActor: "urn:ame:union-consideration-settlement-service", nodeId: "union-consideration-settlement-service" }, env) : undefined);
  const settlementProvider = dependencies.settlementProvider ?? (dependencies.consumeUnionGrant ? createUnionConsiderationSettlementProvider({ consumeGrant: dependencies.consumeUnionGrant, recordSettlement }) : undefined);
  if (typeof settlementProvider !== "function") throw new Error("an explicit Union consideration settlement provider is required");
  const products = dependencies.providers ?? createBrokerageProductProviders({ alpacaRead: dependencies.alpacaRead, alpacaReadPreflight: dependencies.alpacaReadPreflight, paperReadService: dependencies.paperReadService, marketDataService: dependencies.marketDataService,
    resolveExecutionRecords: dependencies.resolveExecutionRecords, executionAdapter: dependencies.executionAdapter, executionClock: dependencies.executionClock }), providers = indexBrokerageProvidersByService(products);
  const offers = formFederationUnionOffers({ providers, validUntil: required(env, "BROKERAGE_UNION_OFFERS_VALID_UNTIL") });
  const recordDelivery = dependencies.recordDelivery ?? createBrokerageOutcomeWitnessRecorder(env), recordEvent = dependencies.recordEvent ?? createBrokerageMarketEventRecorder({ originatingActor: "urn:ame:union-brokerage-products-market-border", nodeId: "union-brokerage-products-market-border" }, env);
  return serveUnionBrokerageActivityPub({ origin: required(env, "BROKERAGE_UNION_ACTIVITYPUB_ORIGIN"), identifier: required(env, "BROKERAGE_UNION_ACTIVITYPUB_IDENTIFIER"), actorName: required(env, "BROKERAGE_UNION_ACTIVITYPUB_NAME"),
    summary: "The Union market face for witnessed brokerage API products under exact consideration grants.", agentCard: required(env, "BROKERAGE_UNION_A2A_AGENT_CARD"),
    keyPath: required(env, "BROKERAGE_UNION_ACTIVITYPUB_KEYS_PATH"), activityPubStatePath: required(env, "BROKERAGE_UNION_ACTIVITYPUB_STATE_PATH"), bearerTokenPath: required(env, "BROKERAGE_UNION_ACTIVITYPUB_BEARER_TOKEN_FILE"),
    state: createUnionMarketState({ stateRoot: required(env, "BROKERAGE_UNION_MARKET_STATE_ROOT") }), offers, providers, settle: settlementProvider, recordDelivery, recordEvent,
    hostname: env.HOST ?? "127.0.0.1", port: Number(env.PORT) || undefined }, { serveProvider: dependencies.serveProvider, deliver: dependencies.deliver });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // No default consumeUnionGrant is supplied here on purpose: this federation never
  // fabricates settlement. Wire a real settlement adapter via dependencies before
  // this can serve a live Union market face.
  const runtime = await createFederationUnionRuntime();
  const actorId = runtime.actor?.id ?? runtime.identifier ?? "union actor";
  const stateRoot = required(process.env, "BROKERAGE_UNION_MARKET_STATE_ROOT");
  const journal = createSemanticRecordJournal({ root: resolve(stateRoot), objectKind: "brokerage-control.union-runtime.server-event" });
  journal.record({
    category: "brokerage-control.union-runtime.serving",
    recordedAt: new Date().toISOString(),
    record: { actorId, origin: process.env.BROKERAGE_UNION_ACTIVITYPUB_ORIGIN },
    told: { for: true, against: false },
  });
  console.log(`brokerage-control union market runtime serving as ${actorId}`);
}
