import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveNodeStyles,
  cascadeSettling,
  completionRegimeOf,
  checkStyleResolutionSettled,
  checkClassMapsValid,
  classByNodeId,
  cssTextFromResolvedStyles,
  nodeIdSet,
  firstDuplicate,
} from "../src/css-style-resolution.mjs";
import {
  intZero,
  intOne,
} from "@red-cup-engineering/computer-data-engineering-services-section/number/exact-number";

// A three-node carrier tree: a > b, a > c (parentage is not modeled by this
// package at all -- CssCarrierNode carries only a nodeId -- so "inheritance"
// below is tested as an observed ABSENCE, not simulated).
const carrier = Object.freeze({
  nodes: Object.freeze([
    { nodeId: "a" },
    { nodeId: "b" },
    { nodeId: "c" },
  ]),
});

function system(declarations, extra = {}) {
  return Object.freeze({
    kind: "rendering.css.system",
    carrier,
    declarations: Object.freeze(declarations),
    ...extra,
  });
}

test("cascade resolves by explicit priority, not by any selector specificity", () => {
  // Two declarations target the same node+property. The lower-priority one
  // arrived later in source order -- under real CSS specificity/!important
  // rules a later same-specificity rule would win, but here the declaration
  // was authored as "low priority", so priority strictly dominates order.
  const sys = system([
    { kind: "rendering.css.declaration", nodeId: "a", property: "color", value: "red", priority: 0, sourceOrder: 5 },
    { kind: "rendering.css.declaration", nodeId: "a", property: "color", value: "blue", priority: 1, sourceOrder: 0 },
  ]);
  const valuation = resolveNodeStyles(sys);
  assert.equal(valuation.sites.length, 1);
  assert.equal(valuation.sites[0].value, "blue", "higher priority must win regardless of source order");
});

test("cascade breaks equal-priority ties by later source order (last-declared wins)", () => {
  const sys = system([
    { kind: "rendering.css.declaration", nodeId: "a", property: "color", value: "red", priority: 0, sourceOrder: 0 },
    { kind: "rendering.css.declaration", nodeId: "a", property: "color", value: "green", priority: 0, sourceOrder: 1 },
  ]);
  const valuation = resolveNodeStyles(sys);
  assert.equal(valuation.sites.length, 1);
  assert.equal(valuation.sites[0].value, "green");
});

test("declarations are addressed by explicit nodeId, not by CSS-selector matching or inheritance", () => {
  // Only node "a" gets a declaration. Nodes "b" and "c" -- even though they
  // would be children of "a" in a real DOM/cascade -- receive nothing: the
  // package performs no parent-to-child property inheritance because
  // CssCarrierNode has no parent/child relation for it to walk.
  const sys = system([
    { kind: "rendering.css.declaration", nodeId: "a", property: "color", value: "red" },
  ]);
  const valuation = resolveNodeStyles(sys);
  assert.deepEqual(valuation.sites.map((s) => s.nodeId), ["a"]);
  assert.equal(valuation.sites.some((s) => s.nodeId === "b" || s.nodeId === "c"), false,
    "no inheritance: siblings/children never receive a parent's declared value");
});

test("declarations for a nodeId outside the carrier are dropped from the settled valuation", () => {
  const sys = system([
    { kind: "rendering.css.declaration", nodeId: "ghost", property: "color", value: "red" },
    { kind: "rendering.css.declaration", nodeId: "b", property: "color", value: "green" },
  ]);
  const valuation = resolveNodeStyles(sys);
  assert.deepEqual(valuation.sites.map((s) => s.nodeId), ["b"]);
});

test("sites are sorted deterministically by nodeId then property", () => {
  const sys = system([
    { kind: "rendering.css.declaration", nodeId: "c", property: "color", value: "1" },
    { kind: "rendering.css.declaration", nodeId: "a", property: "z-index", value: "2" },
    { kind: "rendering.css.declaration", nodeId: "a", property: "color", value: "3" },
  ]);
  const valuation = resolveNodeStyles(sys);
  assert.deepEqual(
    valuation.sites.map((s) => `${s.nodeId}.${s.property}`),
    ["a.color", "a.z-index", "c.color"],
  );
});

test("checkStyleResolutionSettled certifies idempotent closure and re-derives the same sites", () => {
  const sys = system([
    { kind: "rendering.css.declaration", nodeId: "a", property: "color", value: "red", priority: 0, sourceOrder: 0 },
    { kind: "rendering.css.declaration", nodeId: "b", property: "display", value: "block", priority: 0, sourceOrder: 0 },
  ]);
  const witness = checkStyleResolutionSettled(sys);
  assert.equal(witness.kind, "rendering.css_settles_to_valuation:witness");
  assert.equal(witness.cascadeClosed, true);
  assert.equal(witness.idempotent, true);
  assert.deepEqual(
    witness.valuation.sites.map(({ nodeId, property, value }) => [nodeId, property, value]),
    [["a", "color", "red"], ["b", "display", "block"]],
  );
});

test("classByNodeId + cssTextFromResolvedStyles: styled-by-class node gets a .class selector, others fall back to [data-render-node]", () => {
  const sys = system([
    { kind: "rendering.css.declaration", nodeId: "a", property: "color", value: "red" },
    { kind: "rendering.css.declaration", nodeId: "b", property: "color", value: "blue" },
  ], {
    classFactorMap: {
      kind: "rendering.css.classFactorMap",
      constraintGraph: Object.freeze([
        Object.freeze([intZero, intOne]),
        Object.freeze([intOne, intZero]),
      ]),
      nodeIds: ["a", "b"],
      classes: [0, 1],
      alphabet: ["cls-alpha", "cls-beta"],
    },
  });
  const witness = checkStyleResolutionSettled(sys);
  const classMap = classByNodeId(sys.classFactorMap);
  assert.equal(classMap.get("a"), "cls-alpha");
  assert.equal(classMap.get("b"), "cls-beta");
  const css = cssTextFromResolvedStyles(witness.valuation, sys.classFactorMap);
  assert.match(css, /\.cls-alpha\{color:red\}/);
  assert.match(css, /\.cls-beta\{color:blue\}/);
});

test("cssTextFromResolvedStyles without a classFactorMap falls back to a data-render-node attribute selector", () => {
  const sys = system([
    { kind: "rendering.css.declaration", nodeId: "a", property: "color", value: "red" },
  ]);
  const valuation = resolveNodeStyles(sys);
  const css = cssTextFromResolvedStyles(valuation);
  assert.equal(css, '[data-render-node="a"]{color:red}');
});

test("checkClassMapsValid admits a genuine proper coloring as a witness", () => {
  const classes = {
    kind: "rendering.css.classFactorMap",
    constraintGraph: Object.freeze([
      Object.freeze([intZero, intOne]),
      Object.freeze([intOne, intZero]),
    ]),
    nodeIds: ["a", "b"],
    classes: [0, 1],
    alphabet: ["cls-alpha", "cls-beta"],
  };
  const judgment = checkClassMapsValid(classes);
  assert.equal(judgment.kind, "rendering.css_classes_are_factor_maps:witness");
  assert.equal(judgment.finiteAlphabet, true);
});

test("checkClassMapsValid obstructs a non-proper coloring (adjacent nodes sharing a class)", () => {
  const classes = {
    kind: "rendering.css.classFactorMap",
    constraintGraph: Object.freeze([
      Object.freeze([intZero, intOne]),
      Object.freeze([intOne, intZero]),
    ]),
    nodeIds: ["a", "b"],
    classes: [0, 0], // adjacent nodes forced into the same class -- not proper
    alphabet: ["cls-alpha"],
  };
  const judgment = checkClassMapsValid(classes);
  assert.equal(judgment.kind, "rendering.css_classes_are_factor_maps-obstruction");
  assert.equal(judgment.reason, "not-factor-map");
});

test("checkClassMapsValid rejects structurally malformed class maps before touching graph coloring", () => {
  assert.equal(
    checkClassMapsValid({
      kind: "rendering.css.classFactorMap",
      constraintGraph: [],
      nodeIds: ["a", "b"],
      classes: [0],
      alphabet: ["x"],
    }).reason,
    "length-mismatch",
  );
  assert.equal(
    checkClassMapsValid({
      kind: "rendering.css.classFactorMap",
      constraintGraph: [],
      nodeIds: [],
      classes: [],
      alphabet: [],
    }).reason,
    "non-finite-alphabet",
  );
  assert.equal(
    checkClassMapsValid({
      kind: "rendering.css.classFactorMap",
      constraintGraph: Object.freeze([Object.freeze([intZero])]),
      nodeIds: ["a"],
      classes: [5],
      alphabet: ["only-one"],
    }).reason,
    "class-outside-alphabet",
  );
});

test("shared helpers nodeIdSet and firstDuplicate", () => {
  const ids = nodeIdSet(carrier.nodes);
  assert.equal(ids.has("a"), true);
  assert.equal(ids.has("z"), false);
  assert.equal(firstDuplicate(["x", "y", "x"]), "x");
  assert.equal(firstDuplicate(["x", "y"]), undefined);
});

test("a system's completion regime is read off its cascade's closure, never declared", () => {
  const declared = system([
    { kind: "rendering.css.declaration", nodeId: "a", property: "color", value: "red", priority: 0, sourceOrder: 0 },
    { kind: "rendering.css.declaration", nodeId: "a", property: "color", value: "blue", priority: 1, sourceOrder: 1 },
  ]);
  const settling = cascadeSettling(declared);
  assert.equal(settling.settledAt, 1);
  assert.equal(settling.regime, "strict");
  assert.equal(completionRegimeOf(declared), "strict");
  assert.equal(completionRegimeOf(system([])), "strict");
  assert.equal(checkStyleResolutionSettled(declared).completionRegime, "strict");
  assert.equal(Object.hasOwn(resolveNodeStyles(declared), "completionRegime"), false);
});
