// proof — first-principles verification of the taxonomy Chu space.

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildTaxonomy, members, membersWithContested, termsOf, termsByPredicate, related } from "../src/index.mjs";

// three subjects bearing tags/categories; one with a contested tag.
const ALGEBRAS = [
  {
    subject: "chanterelle",
    affirmed: [{ predicate: "tag", object: "mycology", citation: "a" }, { predicate: "category", object: "edible", citation: "b" }],
    denied: [],
    contradicted: [{ predicate: "tag", object: "rare", affirmedBy: "c", deniedBy: "d" }],
  },
  {
    subject: "morel",
    affirmed: [{ predicate: "tag", object: "mycology", citation: "e" }, { predicate: "category", object: "edible", citation: "f" }],
    denied: [],
    contradicted: [],
  },
  {
    subject: "oak",
    affirmed: [{ predicate: "tag", object: "botany", citation: "g" }],
    denied: [{ predicate: "category", object: "edible", citation: "h" }],
    contradicted: [],
  },
];

test("a taxonomy IS a Chu space: subjects × terms", () => {
  const tax = buildTaxonomy(ALGEBRAS);
  assert.equal(tax.subjects.length, 3);
  // terms: tag:mycology, category:edible, tag:rare, tag:botany — only taxonomy predicates counted.
  assert.ok(tax.terms.some((t) => t.predicate === "tag" && t.object === "mycology"));
  assert.ok(!tax.terms.some((t) => t.predicate === "edibility"), "non-taxonomy predicates excluded");
});

test("members(term) = the archive member set (affirming subjects)", () => {
  const tax = buildTaxonomy(ALGEBRAS);
  assert.deepEqual(members(tax, { predicate: "tag", object: "mycology" }).sort(), ["chanterelle", "morel"]);
  assert.deepEqual(members(tax, { predicate: "category", object: "edible" }).sort(), ["chanterelle", "morel"]);
  assert.deepEqual(members(tax, { predicate: "tag", object: "botany" }), ["oak"]);
});

test("a denied membership is not in the archive; a contested one is reported as ⊤", () => {
  const tax = buildTaxonomy(ALGEBRAS);
  // oak DENIES category:edible → not a member.
  assert.ok(!members(tax, { predicate: "category", object: "edible" }).includes("oak"));
  // chanterelle's tag:rare is contradicted → shown as contested, not silently dropped.
  const rare = membersWithContested(tax, { predicate: "tag", object: "rare" });
  assert.deepEqual(rare, [{ subject: "chanterelle", contested: true }]);
});

test("termsOf(subject) = the dual read (the terms a subject bears)", () => {
  const tax = buildTaxonomy(ALGEBRAS);
  const terms = termsOf(tax, "morel").map((t) => `${t.predicate}:${t.object}`).sort();
  assert.deepEqual(terms, ["category:edible", "tag:mycology"]);
});

test("related(subject) ranks by shared-term overlap", () => {
  const tax = buildTaxonomy(ALGEBRAS);
  const rel = related(tax, "chanterelle");
  assert.equal(rel[0].subject, "morel", "morel shares tag:mycology + category:edible");
  assert.equal(rel[0].shared, 2);
  assert.ok(!rel.some((r) => r.subject === "oak"), "oak shares no affirmed term with chanterelle");
});

test("termsByPredicate groups the axes", () => {
  const tax = buildTaxonomy(ALGEBRAS);
  const byPred = termsByPredicate(tax);
  assert.ok(byPred.has("tag") && byPred.has("category"));
  assert.equal(byPred.get("category").length, 1, "one category term: edible");
});
