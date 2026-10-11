import assert from "node:assert/strict";
import test from "node:test";
import { synthesizeBoundedStrategyProgram } from "../src/inference-market-runtime.mjs";

const ni = (letter) => `ni:///sha-256;${letter.repeat(43)}`;
const request = {
  customerActor: "urn:customer:test", contextProduct: ni("a"), incumbentProgram: ni("b"), acceptanceSuite: ni("c"),
  abi: "export function decide(input) -> plain JSON target scores or weights",
  populationSize: 1, maxTokensPerCandidate: 512, maximumWallClockMs: 60_000, generation: 1,
  evidenceFacts: ["momentum is permitted"], allowedFeatureDependencies: ["momentum"], failureHistory: [],
};
const population = (strategySource) => ({
  type: "StrategyProgramPopulation", version: 1, contextProduct: ni("a"), incumbentProgram: ni("b"), generation: 1,
  candidates: [{
    index: 0, provider: "urn:provider:author", receipt: ni("r"),
    candidate: { strategySource, falsifiers: ["costs erase the signal", "drawdown exceeds the mandate"] },
  }],
  residues: [], providerDistinct: true, executionEstablished: false, promotionEstablished: false,
  effect: "untrusted-generated-programs-only",
});

test("public foundry returns independently static-assayed candidate source", async () => {
  const synthesize = async () => population("export function decide(input) { return { score: Math.max(-1, Math.min(1, input.momentum)) }; }");
  const result = await synthesizeBoundedStrategyProgram(request, {}, { synthesize });
  assert.equal(result.candidates[0].staticAssay.admitted, true);
  assert.equal(result.candidates[0].staticAssay.authorActor, "urn:provider:author");
  assert.equal(result.candidates[0].staticAssay.executionEstablished, false);
});

test("public foundry refuses ambient-effect candidate source", async () => {
  const synthesize = async () => population("export function decide(input) { return fetch(input.url); }");
  await assert.rejects(synthesizeBoundedStrategyProgram(request, {}, { synthesize }), /strategy-program-static-assay-refused/u);
});

test("public foundry refuses a request over its budget before any synthesis", async () => {
  await assert.rejects(synthesizeBoundedStrategyProgram({ ...request, populationSize: 4 }, {}, { synthesize: async () => assert.fail("must not synthesize") }), /budget-exceeded/u);
});
