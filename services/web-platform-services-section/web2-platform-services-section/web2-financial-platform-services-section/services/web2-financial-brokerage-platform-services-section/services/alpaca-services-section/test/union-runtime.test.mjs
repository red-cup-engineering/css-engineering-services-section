import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createFederationUnionRuntime, formFederationUnionOffers } from "../src/union-runtime.mjs";
import { createBrokerageProductProviders, indexBrokerageProvidersByService } from "../src/market-runtime.mjs";

const envAt = (root) => ({ BROKERAGE_UNION_ACTIVITYPUB_ORIGIN: "https://brokerage.example", BROKERAGE_UNION_ACTIVITYPUB_IDENTIFIER: "market", BROKERAGE_UNION_ACTIVITYPUB_NAME: "Brokerage Federation",
  BROKERAGE_UNION_A2A_AGENT_CARD: "https://brokerage.example/.well-known/agent-card.json", BROKERAGE_UNION_ACTIVITYPUB_KEYS_PATH: join(root, "keys.json"),
  BROKERAGE_UNION_ACTIVITYPUB_STATE_PATH: join(root, "activitypub.jsonl"), BROKERAGE_UNION_ACTIVITYPUB_BEARER_TOKEN_FILE: join(root, "bearer-token"),
  BROKERAGE_UNION_MARKET_STATE_ROOT: join(root, "market"), BROKERAGE_UNION_OFFERS_VALID_UNTIL: "2030-01-01T00:00:00.000Z" });

test("Union formation publishes every presently deliverable product at exact USDC prices", () => {
  const providers = indexBrokerageProvidersByService(createBrokerageProductProviders());
  const offers = formFederationUnionOffers({ providers, validUntil: "2030-01-01T00:00:00.000Z" });
  assert.deepEqual(offers.map(({ service }) => service), ["issuer-evidence-packet", "aggressive-alpha-research-packet", "paper-portfolio-and-order-intents", "account-normalization-and-reconciliation"]);
  assert.deepEqual(offers.map(({ price }) => price.amount), ["0.25", "1.00", "2.00", "0.50"]);
  assert.ok(offers.every(({ price, conversionRate }) => price.asset === "urn:iso:currency:USDC" && price.unit === "USDC" && conversionRate === null));
});

test("Union runtime hires the ActivityPub provider and refuses ambient settlement authority", async () => {
  const root = mkdtempSync(join(tmpdir(), "union-runtime-"));
  try {
    await assert.rejects(() => createFederationUnionRuntime(envAt(root), {}), /explicit Union consideration settlement provider/u);
    let providerOptions;
    const runtime = await createFederationUnionRuntime(envAt(root), { settlementProvider: async () => ({ success: true }),
      recordDelivery: async () => ({ witness: { id: "sha256:witness" } }), recordEvent: async () => ({}),
      serveProvider: async (options) => { providerOptions = options; return { provider: { actor: "market" }, close: async () => {} }; }, deliver: async () => ({ delivered: true }) });
    assert.equal(providerOptions.origin, "https://brokerage.example"); assert.equal(providerOptions.identifier, "market");
    assert.equal(typeof providerOptions.onActivity, "function"); assert.equal(typeof providerOptions.listOutbox, "function");
    assert.equal(runtime.marketState.root, join(root, "market")); assert.equal((await runtime.callbacks.listOutbox({})).items.length, 4);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
