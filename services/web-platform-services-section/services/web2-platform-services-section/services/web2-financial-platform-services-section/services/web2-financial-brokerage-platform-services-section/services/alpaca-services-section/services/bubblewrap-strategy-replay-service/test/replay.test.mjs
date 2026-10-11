import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";
import { createBubblewrapStrategyReplay } from "../src/replay.mjs";

test("executes admitted generated code in a networkless deterministic sandbox", async (context) => {
  const replay = createBubblewrapStrategyReplay();
  const source = "export function decide(input) { return { scores: { BLK: input.x * 2 } }; }";
  const sourceId = identifyJsonSemanticContent({ objectKind: "rsc-quiescent.strategy-program-source", value: source, witnessRoot: EMPTY_WITNESS_ROOT }).token;
  const result = await replay({ source, staticAssay: { type: "StrategyProgramStaticAssay", source: sourceId, admitted: true }, input: { x: 3 } });
  if (result.type === "StrategyProgramReplayRefusal" && /operation not permitted|permission denied/iu.test(result.diagnostic)) return context.skip("user namespaces unavailable");
  assert.equal(result.type, "DeterministicStrategyProgramReplay");
  assert.deepEqual(result.output, { scores: { BLK: 6 } });
  assert.equal(result.network, false);
});
