import assert from "node:assert/strict";
import test from "node:test";

import { actionFormHtml } from "@red-cup-engineering/relating/projections";

test("HTML action projection exposes predication generators without inventing settlement", () => {
  const html = actionFormHtml({
    name: "observe",
    href: "/observe",
    input: "application/json",
    output: "application/json",
    settlement: {
      kind: "relating.action.settlement-signature",
      regime: "strict-finite",
      closureRegime: "ordinal.closure.regime.finite",
      transport: "request-response",
      finality: "normal-form",
      continuation: "none",
      classification: {
        kind: "predication.settling.classification",
        cofinality: "predication.settling.cofinality.countable",
        limitStages: 0,
        nonScottFirings: 0,
      },
    },
  }, "");

  const encoded = html.match(/<script id="predication-generators" type="application\/json">([^<]+)<\/script>/)?.[1];
  assert.ok(encoded);
  const generators = JSON.parse(encoded);
  assert.equal(generators.kind, "predication.site");
  assert.equal(generators.cells.length > 0, true);
  assert.equal(Object.hasOwn(generators, "assignments"), false);
  assert.equal(Object.hasOwn(generators, "closureProfile"), false);
  assert.equal(html.includes("settledDocument"), false);
  assert.equal(html.includes("settlement.filtration"), false);
});
