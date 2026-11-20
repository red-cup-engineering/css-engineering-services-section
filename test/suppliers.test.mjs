import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { assignmentSetToStylesheet, visualValuationDeclarations } from "@red-cup-engineering/css-engineering-services-section/css-cascade";

test("equal structured predicates share a CSS rule group while each locus retains its reading", () => {
  const valuation = [
    { subject: "Pantry", predicate: { mode: "score" }, object: 42, for: ["turn"], against: [] },
    { subject: "Depot", predicate: { mode: "score" }, object: 14, for: [], against: ["turn"] },
  ];
  const declarations = visualValuationDeclarations(valuation);
  assert.deepEqual([...new Set(declarations.map(d => d.locus))], ["Depot", "Pantry"]);
  assert.equal(new Set(declarations.map(d => d.fiber)).size, 1);
  const stylesheet = assignmentSetToStylesheet(valuation);
  assert.equal(createHash("sha256").update(stylesheet).digest("hex"), "62ce09883f261ce4269b29117bc44d6b31236b23f4e58a245cd6fa166f2d53f2");
});
