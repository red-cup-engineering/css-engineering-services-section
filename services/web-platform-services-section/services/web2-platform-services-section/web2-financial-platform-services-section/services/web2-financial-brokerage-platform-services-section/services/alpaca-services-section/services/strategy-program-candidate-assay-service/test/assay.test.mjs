import assert from "node:assert/strict";
import test from "node:test";
import { assayStrategyProgram } from "../src/assay.mjs";

test("admits a pure generated decision function and refuses ambient authority", () => {
  const good = assayStrategyProgram({ authorActor: "urn:provider:one", source: "export function decide(input) { const score = input.features.BLK[0] * 2; return { scores: { BLK: score } }; }" });
  assert.equal(good.admitted, true);
  const bad = assayStrategyProgram({ authorActor: "urn:provider:one", source: "export async function decide(input) { return fetch(input.url); }" });
  assert.equal(bad.admitted, false);
  assert.ok(bad.problems.some((value) => value.includes("fetch")));
  const random = assayStrategyProgram({ authorActor: "urn:provider:one", source: "export function decide(input) { return { scores: { BLK: Math.random() + input.x } }; }" });
  assert.equal(random.admitted, false);
  assert.ok(random.problems.includes("forbidden-call:Math.random"));
});
