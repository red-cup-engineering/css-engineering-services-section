import assert from "node:assert/strict";
import { test } from "node:test";
import {
  chargeNameOfSides,
  chargeSidesOf,
  joinKnowledgeNames,
} from "../src/internal/charge-names.mts";

test("chargeNameOfSides maps each (truth, falsity) combination to its charge name", () => {
  assert.equal(chargeNameOfSides(false, false), "absurd");
  assert.equal(chargeNameOfSides(true, false), "potential");
  assert.equal(chargeNameOfSides(false, true), "active");
  assert.equal(chargeNameOfSides(true, true), "stable");
});

test("chargeSidesOf reads the canonical relating coordinates and inverts chargeNameOfSides", () => {
  const cases = [
    ["absurd", false, false],
    ["potential", true, false],
    ["active", false, true],
    ["stable", true, true],
  ] as const;

  for (const [name, truth, falsity] of cases) {
    assert.deepEqual(chargeSidesOf(name), [truth, falsity]);
    assert.equal(chargeNameOfSides(...chargeSidesOf(name)), name);
  }
});

test("joinKnowledgeNames of an empty iterable is absurd (no truth, no falsity)", () => {
  assert.equal(joinKnowledgeNames([]), "absurd");
});

test("joinKnowledgeNames ORs the truth/falsity sides of every name in the iterable", () => {
  // potential (T,F) joined with active (F,T) => stable (T,T)
  assert.equal(joinKnowledgeNames(["potential", "active"]), "stable");
  // potential joined with potential stays potential
  assert.equal(joinKnowledgeNames(["potential", "potential"]), "potential");
  // absurd contributes nothing
  assert.equal(joinKnowledgeNames(["absurd", "active"]), "active");
  // any name joined with stable stays stable
  assert.equal(joinKnowledgeNames(["potential", "stable"]), "stable");
});

test("joinKnowledgeNames accepts any Iterable, not just arrays", () => {
  function* gen() {
    yield "potential" as const;
    yield "active" as const;
  }
  assert.equal(joinKnowledgeNames(gen()), "stable");
});
