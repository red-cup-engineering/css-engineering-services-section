import assert from "node:assert/strict";
import test from "node:test";
import { validateConsiderationPolicy } from "@red-cup-engineering/inference-work-lot-service/consideration";
import { loadForagingPolicy } from "../src/improvement-board-forager-service.mjs";
import { pendingSupplierSelfImprovement } from "../src/supplier-self-improvement.mjs";

test("the live self-improvement policy uses canonical settlement capabilities without price ceilings", () => {
  const policy = loadForagingPolicy().supplierSelfImprovementExecution;

  for (const considerationPolicy of [policy.acceptanceConsiderationPolicy, policy.implementationConsiderationPolicy]) {
    assert.equal(validateConsiderationPolicy(considerationPolicy), considerationPolicy);
    const obligation = considerationPolicy.acceptableAlternatives[0].obligations[0];
    assert.deepEqual(obligation.settlementCapabilities, ["urn:union:settlement-capability:direct-witness-v1"]);
    assert.equal(Object.hasOwn(obligation, "maximumAmount"), false);
    assert.equal(Object.hasOwn(obligation, "settlementAdapters"), false);
  }

  assert.equal(pendingSupplierSelfImprovement([], { policy }), null);
});
