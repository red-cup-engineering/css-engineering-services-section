import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createVirtualsLiteBrokerageClient, createVirtualsPhasedJobHandler, createVirtualsRuntimeState, ensureVirtualsBrokerageOfferings, VIRTUALS_LITE_API_ORIGIN } from "../services/virtuals-brokerage-products-border/src/virtuals-lite-runtime.mjs";
import { createFederationVirtualsRuntime } from "../src/virtuals-runtime.mjs";

const WALLET = "0x0000000000000000000000000000000000000042", PRODUCT = "issuer-evidence-packet", NAME = `Brokerage API: ${PRODUCT}`;
const request = { ticker: "NVDA", issuer: "NVIDIA Corporation", asOf: "2026-07-22T22:20:00.000Z", sources: [{ uri: "urn:filing", observedAt: "2026-07-22T20:00:00.000Z", digest: "sha256:filing" }], claims: [{ statement: "Observation", sourceDigests: ["sha256:filing"] }] };
const envelope = (phase, overrides = {}) => ({ id: "42", phase, price: 0.25, providerAddress: WALLET, requiredFunds: false, memoToSign: "present",
  memos: [{ nextPhase: 1, content: JSON.stringify({ name: NAME, priceType: "fixed", requirement: { request } }) }], ...overrides });
const provider = Object.assign(async (input) => ({ id: "sha256:issuer-output", type: "IssuerEvidencePacket", ticker: input.ticker }), {
  originatingActor: "urn:ame:issuer-research-media-service", preflight: async (input) => { if (!input.issuer) throw new TypeError("issuer-required"); },
  externalEvidence: (input) => input.sources.map(({ uri, digest }) => ({ uri, digest })),
});

test("Virtuals client holds its API key inside the official ACP transport", async () => {
  let observed; const client = createVirtualsLiteBrokerageClient({ apiKey: "private-api-key-value", fetchImpl: async (url, options) => { observed = { url, options }; return { ok: true, text: async () => "{}" }; } });
  await client.me(); assert.equal(observed.url, `${VIRTUALS_LITE_API_ORIGIN}/acp/me`); assert.equal(observed.options.headers["x-api-key"], "private-api-key-value");
  assert.equal(client.apiKey, undefined); assert.throws(() => createVirtualsLiteBrokerageClient({ apiKey: "private-api-key-value", apiOrigin: "https://example.invalid" }), /configuration-invalid/u);
});

test("Virtuals publication verifies a federation-owned profile and publishes only available providers", async () => {
  const published = [], client = { me: async () => ({ data: { name: "Brokerage Federation", walletAddress: WALLET, jobs: [] } }), publishOffering: async (value) => { published.push(value); return {}; } };
  const receipt = await ensureVirtualsBrokerageOfferings({ client, operatorName: "Brokerage Federation", operatorWallet: WALLET, providers: { [PRODUCT]: provider } });
  assert.equal(receipt.dispositions.find(({ product }) => product === PRODUCT).disposition, "published"); assert.equal(published.length, 1); assert.equal(published[0].name, NAME); assert.equal(published[0].requiredFunds, false);
  await assert.rejects(() => ensureVirtualsBrokerageOfferings({ client: { ...client, me: async () => ({ data: { name: "Yanagi", walletAddress: WALLET } }) }, operatorName: "Brokerage Federation", operatorWallet: WALLET, providers: { [PRODUCT]: provider } }), /identity-mismatch/u);
});

test("phased Virtuals runtime preflights before acceptance and delivers one witnessed result", async () => {
  const root = mkdtempSync(join(tmpdir(), "brokerage-virtuals-")); try {
    let executions = 0, witnessRecords = 0; const countedProvider = Object.assign(async (input) => { executions += 1; return provider(input); }, { originatingActor: provider.originatingActor, preflight: provider.preflight, externalEvidence: provider.externalEvidence });
    const calls = [], client = { accept: async () => { calls.push("accept"); return { accepted: true }; }, requestPayment: async () => { calls.push("payment"); return { requested: true }; }, deliver: async (_id, value) => { calls.push("deliver"); assert.match(value.deliverable, /sha256:issuer-output/u); return { completed: true }; } };
    const state = createVirtualsRuntimeState({ stateRoot: root, now: () => "2026-07-22T22:20:00.000Z" });
    const handle = createVirtualsPhasedJobHandler({ client, state, operatorWallet: WALLET, providers: { [PRODUCT]: countedProvider }, recordDelivery: async ({ originatingActor }) => { witnessRecords += 1; return { witness: { id: "sha256:witness", originatingActor } }; } });
    assert.equal((await handle(envelope(0))).disposition, "payment-requested"); assert.deepEqual(calls, ["accept", "payment"]);
    const delivery = await handle(envelope(2)); assert.equal(delivery.witness, "sha256:witness"); assert.deepEqual(calls, ["accept", "payment", "deliver"]);
    const replay = await handle(envelope(2)); assert.equal(replay.replayedReceipt, true); assert.deepEqual(calls, ["accept", "payment", "deliver"]); assert.equal(executions, 1); assert.equal(witnessRecords, 1);
    assert.equal((await handle(envelope(4))).disposition, "terminal"); assert.equal((await handle(envelope(4))).disposition, "terminal");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("an interrupted Virtuals effect is never repeated ambiguously", async () => {
  const root = mkdtempSync(join(tmpdir(), "brokerage-virtuals-")); try {
    let accepts = 0; const state = createVirtualsRuntimeState({ stateRoot: root }), handle = createVirtualsPhasedJobHandler({ state, operatorWallet: WALLET, providers: { [PRODUCT]: provider }, recordDelivery: async () => ({}),
      client: { accept: async () => { accepts += 1; throw new Error("connection-lost-after-send"); }, requestPayment: async () => ({}), deliver: async () => ({}) } });
    await assert.rejects(() => handle(envelope(0)), /connection-lost/u); await assert.rejects(() => handle(envelope(0)), /effect-uncertain-refused/u); assert.equal(accepts, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("invalid Virtuals provider input is refused before job acceptance", async () => {
  const root = mkdtempSync(join(tmpdir(), "brokerage-virtuals-")); try {
    let accepted = false; const state = createVirtualsRuntimeState({ stateRoot: root }), handle = createVirtualsPhasedJobHandler({ state, operatorWallet: WALLET, providers: { [PRODUCT]: provider }, recordDelivery: async () => ({}), client: { accept: async () => { accepted = true; }, requestPayment: async () => ({}), deliver: async () => ({}) } });
    await assert.rejects(() => handle(envelope(0, { memos: [{ nextPhase: 1, content: JSON.stringify({ name: NAME, requirement: { request: { ticker: "NVDA" } } }) }] })), /issuer-required/u); assert.equal(accepted, false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("federation Virtuals composition publishes available products and connects the official socket with a separate identity", async () => {
  const root = mkdtempSync(join(tmpdir(), "brokerage-virtuals-")); try {
    const requests = [], handlers = new Map(), runtime = await createFederationVirtualsRuntime({ VIRTUALS_LITE_API_KEY: "private-api-key-value", BROKERAGE_VIRTUALS_OPERATOR_NAME: "Brokerage Federation",
      BROKERAGE_VIRTUALS_OPERATOR_WALLET: WALLET, BROKERAGE_VIRTUALS_STATE_ROOT: root }, {
      providers: { issuer: provider, alpha: provider, paperIntent: provider, reconcile: provider }, recordDelivery: async () => ({ witness: { id: "sha256:witness" } }), onEvent: async () => {},
      fetchImpl: async (url, options) => { requests.push({ url, options }); return { ok: true, text: async () => url.endsWith("/acp/me") ? JSON.stringify({ data: { name: "Brokerage Federation", walletAddress: WALLET, jobs: [] } }) : "{}" }; },
      ioFactory: (origin, options) => ({ origin, options, on: (event, handler) => handlers.set(event, handler), disconnect: () => handlers.clear() }),
    });
    assert.equal(runtime.publication.dispositions.filter(({ disposition }) => disposition === "published").length, 4);
    assert.equal(requests.filter(({ options }) => options.method === "POST").length, 4); assert.equal(handlers.has("onNewTask"), true); assert.equal(handlers.has("onEvaluate"), true); runtime.stop();
  } finally { rmSync(root, { recursive: true, force: true }); }
});
