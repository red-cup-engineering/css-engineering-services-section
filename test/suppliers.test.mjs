import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { assignmentSetToStylesheet, visualValuationDeclarations } from "@red-cup-engineering/css-engineering-services-section/css-cascade";

import { deriveTypographyValuation } from "@red-cup-engineering/css-engineering-services-section/typography";

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

test("a supported reading keeps its type weights and exact golden-ratio scale", () => {
  const cell = { subject: "Pantry", predicate: "score", object: 42, for: ["turn"], against: [] };
  const readings = deriveTypographyValuation([cell]);
  assert.deepEqual(readings.map(({ fiber, type }) => [fiber.locus.role, type.weight]), [
    ["subject", 700], ["predicate", 600], ["object", 400],
  ]);
  for (const { type } of readings) {
    assert.equal(type.style, "roman");
    assert.equal(type.scaleStep.radicand, 5);
    assert.equal(String(type.scaleStep.unit.num), "1");
    assert.equal(String(type.scaleStep.unit.den), "2");
    assert.deepEqual(type.scaleStep.root, type.scaleStep.unit);
  }
});
