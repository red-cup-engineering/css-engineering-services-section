import assert from "node:assert/strict";
import test from "node:test";
import { createX402BrokerageBorder } from "../src/http-border.mjs";
import { createStrategySynthesisProvider } from "../src/strategy-synthesis-provider.mjs";

const ni = (letter) => `ni:///sha-256;${letter.repeat(43)}`;
const request = {
  customerActor: "urn:customer:x402-assay", contextProduct: ni("a"), incumbentProgram: ni("b"), acceptanceSuite: ni("c"),
  abi: "export function decide(input) -> plain JSON target scores or weights", populationSize: 1, maxTokensPerCandidate: 512,
  maximumWallClockMs: 60_000, generation: 1, evidenceFacts: ["bounded"], allowedFeatureDependencies: ["momentum"], failureHistory: [],
};

test("settled x402 strategy request crosses dispatch validation and static assay", async () => {
  const strategy = createStrategySynthesisProvider({}, { strategySynthesis: async () => ({
    type: "StrategyProgramPopulation", version: 1, contextProduct: ni("a"), incumbentProgram: ni("b"), generation: 1,
    candidates: [{ index: 0, provider: "urn:provider:x402", receipt: ni("r"), candidate: {
      strategySource: "export function decide(input) { return { score: Math.max(-1, Math.min(1, input.momentum)) }; }",
      falsifiers: ["costs erase signal", "drawdown exceeds mandate"],
    } }], residues: [], providerDistinct: true, executionEstablished: false, promotionEstablished: false,
    effect: "untrusted-generated-programs-only",
  }) });
  const border = createX402BrokerageBorder({
    payTo: "0xreceiver", facilitator: "https://facilitator.invalid", verifyAndSettle: async () => ({ success: true, transaction: "0xtx", settledAt: "2026-08-03T00:00:00Z" }),
    providers: { "strategy-program-synthesis": strategy },
  });
  const response = await border({ path: "/v1/strategies/synthesize", headers: { "payment-signature": "paid" }, body: request });
  assert.equal(response.status, 200);
  assert.equal(response.body.output.candidates[0].staticAssay.admitted, true);
  assert.match(response.body.output.id, /^ni:\/\/\/sha-256;/u);
  assert.equal(response.body.receipt.service, "strategy-program-synthesis");
});
