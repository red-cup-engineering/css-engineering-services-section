import assert from "node:assert/strict";
import test from "node:test";
import { judgeCarrierComposition } from "../src/judgment.mjs";

test("witnesses one shared carrier locus", () => {
  const result = judgeCarrierComposition(
    { verb: "utter", codomain: "relating/articulating/utterance" },
    { verb: "articulate", domain: "relating/articulating/utterance" },
  );
  assert.equal(result.type, "CarrierCompositionWitness");
  assert.equal(result.locus, "relating/articulating/utterance");
  assert.deepEqual(result.commitment, {
    token: "relating/articulating/utterance",
    claim: { relation: "codomain-domain", producer: "utter", consumer: "articulate" },
  });
});

test("retains mismatch as a typed obstruction", () => {
  const result = judgeCarrierComposition(
    { verb: "utter", codomain: "carrier/a" },
    { verb: "settle", domain: "carrier/b" },
  );
  assert.equal(result.type, "CarrierCompositionObstruction");
  assert.equal(result.reason, "carrier-identity-mismatch");
  assert.equal(result.produced, "carrier/a");
  assert.equal(result.consumed, "carrier/b");
});

test("does not invent an absent carrier side", () => {
  const result = judgeCarrierComposition({ verb: "admit" }, { verb: "consume", domain: "carrier/b" });
  assert.equal(result.reason, "producer-codomain-absent");
});
