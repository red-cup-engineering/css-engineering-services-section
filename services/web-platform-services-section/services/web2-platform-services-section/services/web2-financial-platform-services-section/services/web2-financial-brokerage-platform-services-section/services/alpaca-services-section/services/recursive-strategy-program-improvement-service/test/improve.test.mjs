import assert from "node:assert/strict";
import test from "node:test";
import { createRecursiveStrategyProgramImprovement } from "@red-cup-engineering/recursive-strategy-program-improvement-service";

const ni = (letter) => `ni:///sha-256;${letter.repeat(43)}`;
test("generated successor advances only after replay, tournament, review, and paper promotion", async () => {
  const source = "export function decide(input) { return { scores: { BLK: input.x } }; }";
  const improve = createRecursiveStrategyProgramImprovement({
    synthesizePopulation: async () => ({ candidates: [{ index: 0, provider: "urn:author:one", candidate: { strategySource: source } }], residues: [] }),
    assayProgram: async () => ({ type: "StrategyProgramStaticAssay", source: ni("d"), admitted: true }),
    replayProgram: async () => ({ type: "DeterministicStrategyProgramReplay", output: { scores: { BLK: 1 } } }),
    evaluateProgram: async () => ({ type: "PurgedMultiRegimeEvaluation", holdoutScore: 1 }),
    selectTournamentWinner: async () => ({ type: "GeneratedStrategyTournamentResult", improvementEstablished: true, winnerIndex: 0 }),
    reviewProgram: async () => ({ approved: true, reviewerActor: "urn:reviewer:other" }),
    recordGeneration: async ({ generation }) => ({ id: `urn:generation:${generation}` }),
    promotePaperProgram: async ({ candidate }) => ({ candidate: candidate.id, paperPromotionEstablished: true, liveReadinessEstablished: false })
  });
  const result = await improve({
    customerActor: "urn:customer:test", incumbent: { id: ni("a"), source: "old" }, contextProduct: ni("b"), acceptanceSuite: ni("c"),
    maximumGenerations: 1, populationSize: 1, maxTokensPerCandidate: 1024, evidenceFacts: [{}],
    allowedFeatureDependencies: [], failureHistory: [], replayProbe: { x: 1 }
  });
  assert.equal(result.lineageHead, ni("d"));
  assert.equal(result.orderExecutionEstablished, false);
  assert.equal(result.promotion.paperPromotionEstablished, true);
});
