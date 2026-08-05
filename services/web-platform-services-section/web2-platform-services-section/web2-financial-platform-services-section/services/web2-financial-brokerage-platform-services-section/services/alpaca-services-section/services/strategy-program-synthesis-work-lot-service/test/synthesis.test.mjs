import assert from "node:assert/strict";
import test from "node:test";
import { createStrategyProgramSynthesisMarket } from "../src/synthesis.mjs";
import { STRATEGY_PROGRAM_SYNTHESIS_CARRIER_ASSERTIONS, STRATEGY_PROGRAM_SYNTHESIS_REQUEST_CARRIER, validateStrategyProgramSynthesisResult } from "../src/schemas.mjs";

const ni = (letter) => `ni:///sha-256;${letter.repeat(43)}`;
test("contracts provider-distinct executable strategy candidates without accepting them", async () => {
  let call = 0;
  const lots = [];
  const synthesize = createStrategyProgramSynthesisMarket({ contractInference: async (lot) => {
    lots.push(lot);
    return ({
    result: {
      provider: { actor: `urn:provider:${++call}` },
      candidate: {
        strategySource: "export function decide(input) { return { scores: { BLK: input.features.momentum } }; }",
        falsifiers: ["fails untouched holdout", "fails under higher transaction costs"]
      }
    }
    });
  } });
  const result = await synthesize({
    customerActor: "urn:customer:test", contextProduct: ni("a"), incumbentProgram: ni("b"), acceptanceSuite: ni("c"),
    abi: "export function decide(input) -> plain JSON target scores or weights",
    populationSize: 2, maxTokensPerCandidate: 1024, generation: 1,
    evidenceFacts: [{ id: "fact:1", value: 1 }], allowedFeatureDependencies: ["momentum"], failureHistory: []
  });
  assert.equal(result.candidates.length, 2);
  assert.equal(result.providerDistinct, true);
  assert.equal(result.promotionEstablished, false);
  assert.equal(lots.length, 2);
  assert.ok(lots.every(({ enforceProviderSchema }) => enforceProviderSchema === true));
  assert.equal(validateStrategyProgramSynthesisResult(result).ok, true);
  assert.match(STRATEGY_PROGRAM_SYNTHESIS_REQUEST_CARRIER.identity.ni, /^ni:\/\/\/sha-256;/u);
  assert.ok(STRATEGY_PROGRAM_SYNTHESIS_CARRIER_ASSERTIONS.length > 50);
});

test("preserves the selected provider and settlement reason when synthesis produces residue", async () => {
  const synthesize = createStrategyProgramSynthesisMarket({ contractInference: async () => ({
    result: {
      outcome: "market-residue",
      disposition: "selected-provider-refused",
      provider: "urn:provider:refused",
      settlementResidues: [{
        provider: "urn:provider:refused",
        offer: "urn:offer:refused",
        disposition: "settlement-transport-refusal",
        reason: "provider relay exceeded its deadline",
      }],
    },
  }) });
  const result = await synthesize({
    customerActor: "urn:customer:test", contextProduct: ni("a"), incumbentProgram: ni("b"), acceptanceSuite: ni("c"),
    abi: "export function decide(input) -> plain JSON target scores or weights",
    populationSize: 1, maxTokensPerCandidate: 512, generation: 1,
    evidenceFacts: [{ id: "fact:1", value: 1 }], allowedFeatureDependencies: ["momentum"], failureHistory: []
  });
  assert.deepEqual(result.residues, [{
    index: 0,
    disposition: "selected-provider-refused",
    provider: "urn:provider:refused",
    settlementResidues: [{
      provider: "urn:provider:refused",
      offer: "urn:offer:refused",
      disposition: "settlement-transport-refusal",
      reason: "provider relay exceeded its deadline",
    }],
  }]);
});
