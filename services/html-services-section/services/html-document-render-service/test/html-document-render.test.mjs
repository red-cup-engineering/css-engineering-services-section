import assert from "node:assert/strict";
import test from "node:test";
import {
  htmlCarrierOf,
  buildHtmlDocumentPlan,
  renderHtmlDocument,
} from "../dist/index.mjs";
import {
  intZero,
  intOne,
} from "@lenticule-science/articulating/predicating/positing/settling/analysis/exact-number";

// A minimal but structurally-complete settled Document fixture, in the same
// shape the house test suite for html-file-codec-service (the package this
// module was extracted from) hand-builds -- htmlCarrierOf only reads
// addresses/order/references/valuationSites off it, never the fixed-point
// machinery that would normally produce one.
function fixtureDocument(addressKeys, { order = [], references = [] } = {}) {
  return Object.freeze({
    kind: "settledDocument.fixedPoint",
    source: {},
    fixedPoint: {},
    reading: {},
    addresses: Object.freeze(addressKeys.map((key) => ({ kind: "settledDocument.address", key, cell: {} }))),
    order: Object.freeze(order.map(([before, after]) => ({ kind: "settledDocument.order", before, after }))),
    references: Object.freeze(references.map(([from, to]) => ({
      kind: "settledDocument.reference", from, to, predicate: {},
    }))),
    valuationSites: Object.freeze(addressKeys.map((key) => ({
      kind: "settledDocument.valuationSite", address: key, value: "potential", meme: {},
    }))),
  });
}

const PROFILE = Object.freeze({
  kind: "rendering.profile",
  name: "fixture-profile",
  allowedElements: ["div", "p", "span", "a"],
  allowedStyleBehavior: ["static"],
  allowedCompletionRegimes: ["ordinal.closure.regime.finite"],
  obligations: [],
  preservationLaws: [
    "preserve-addresses", "preserve-order", "preserve-references",
    "preserve-valuation-sites", "carrier-not-document", "css-settles",
  ],
});

function buildTree() {
  const document = fixtureDocument(["root", "child1", "child2"], {
    order: [["root", "child1"], ["child1", "child2"]],
  });
  const nodes = [
    {
      kind: "rendering.htmlCarrier.node",
      nodeId: "root",
      element: "div",
      semanticAddress: "root",
      children: ["child1", "child2"],
    },
    {
      kind: "rendering.htmlCarrier.node",
      nodeId: "child1",
      element: "p",
      semanticAddress: "child1",
      text: "Hello, world!",
    },
    {
      kind: "rendering.htmlCarrier.node",
      nodeId: "child2",
      element: "span",
      semanticAddress: "child2",
      html: "<strong>trusted</strong>",
    },
  ];
  const carrier = htmlCarrierOf(document, nodes);
  assert.equal(carrier.kind, "rendering.htmlCarrier", "fixture carrier must be admitted");
  return carrier;
}

test("renders a complete HTML document string containing the carrier tree's own text/html content", () => {
  const carrier = buildTree();
  const system = Object.freeze({
    kind: "rendering.css.system",
    carrier,
    completionRegime: "ordinal.closure.regime.finite",
    declarations: [
      { kind: "rendering.css.declaration", nodeId: "root", property: "display", value: "block" },
      { kind: "rendering.css.declaration", nodeId: "child1", property: "color", value: "crimson" },
    ],
  });
  const fiber = buildHtmlDocumentPlan(PROFILE, carrier, system, "static");
  assert.equal(fiber.kind, "rendering.profile_forms_render_fiber:witness");

  const doc = renderHtmlDocument(fiber, { title: "Fixture Title" });
  const html = doc.html;

  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<title>Fixture Title<\/title>/);
  // resolved CSS text lands in the document's <style> (sites sort by nodeId, so "child1" precedes "root")
  assert.match(html, /<style>\[data-render-node="child1"\]\{color:crimson\}\n\[data-render-node="root"\]\{display:block\}<\/style>/);
  // the carrier tree's content is present: escaped text and trusted html, nested inside their parent
  assert.match(html, /<div data-render-node="root"><p data-render-node="child1">Hello, world!<\/p><span data-render-node="child2"><strong>trusted<\/strong><\/span><\/div>/);
});

test("escapes text content but passes through the trusted html field raw", () => {
  const document = fixtureDocument(["root"]);
  const nodes = [{
    kind: "rendering.htmlCarrier.node",
    nodeId: "root",
    element: "div",
    semanticAddress: "root",
    text: "<script>evil()</script> & friends",
  }];
  const carrier = htmlCarrierOf(document, nodes);
  const system = Object.freeze({
    kind: "rendering.css.system", carrier,
    completionRegime: "ordinal.closure.regime.finite", declarations: [],
  });
  const fiber = buildHtmlDocumentPlan(PROFILE, carrier, system, "static");
  const html = renderHtmlDocument(fiber).html;
  assert.match(html, /&lt;script&gt;evil\(\)&lt;\/script&gt; &amp; friends/);
  assert.doesNotMatch(html, /<script>evil\(\)<\/script>/);
});

test("class-factor-map assignment shows up both on the rendered node's class attribute and in the emitted CSS", () => {
  const document = fixtureDocument(["root", "child1"], { order: [["root", "child1"]] });
  const nodes = [
    { kind: "rendering.htmlCarrier.node", nodeId: "root", element: "div", semanticAddress: "root", children: ["child1"] },
    { kind: "rendering.htmlCarrier.node", nodeId: "child1", element: "p", semanticAddress: "child1", text: "styled" },
  ];
  const carrier = htmlCarrierOf(document, nodes);
  const system = Object.freeze({
    kind: "rendering.css.system", carrier,
    completionRegime: "ordinal.closure.regime.finite",
    declarations: [{ kind: "rendering.css.declaration", nodeId: "child1", property: "font-weight", value: "bold" }],
    classFactorMap: {
      kind: "rendering.css.classFactorMap",
      constraintGraph: Object.freeze([Object.freeze([intZero, intOne]), Object.freeze([intOne, intZero])]),
      nodeIds: ["root", "child1"],
      classes: [0, 1],
      alphabet: ["cls-root", "cls-child"],
    },
  });
  const fiber = buildHtmlDocumentPlan(PROFILE, carrier, system, "static");
  assert.equal(fiber.kind, "rendering.profile_forms_render_fiber:witness");
  const html = renderHtmlDocument(fiber).html;
  assert.match(html, /<p data-render-node="child1" class="cls-child">styled<\/p>/);
  assert.match(html, /<style>\.cls-child\{font-weight:bold\}<\/style>/);
});

test("root inference renders only nodes that are nobody's child when options.roots is omitted", () => {
  const document = fixtureDocument(["root", "child1"], { order: [["root", "child1"]] });
  const nodes = [
    { kind: "rendering.htmlCarrier.node", nodeId: "root", element: "div", semanticAddress: "root", children: ["child1"] },
    { kind: "rendering.htmlCarrier.node", nodeId: "child1", element: "p", semanticAddress: "child1", text: "leaf" },
  ];
  const carrier = htmlCarrierOf(document, nodes);
  const system = Object.freeze({
    kind: "rendering.css.system", carrier,
    completionRegime: "ordinal.closure.regime.finite", declarations: [],
  });
  const fiber = buildHtmlDocumentPlan(PROFILE, carrier, system, "static");
  const html = renderHtmlDocument(fiber).html;
  // child1 must appear exactly once, nested under root -- not rendered a second time as a top-level root
  const occurrences = html.split('data-render-node="child1"').length - 1;
  assert.equal(occurrences, 1);
});

test("explicit options.roots overrides inference and can render a subset of the tree", () => {
  const document = fixtureDocument(["root", "child1"], { order: [["root", "child1"]] });
  const nodes = [
    { kind: "rendering.htmlCarrier.node", nodeId: "root", element: "div", semanticAddress: "root", children: ["child1"] },
    { kind: "rendering.htmlCarrier.node", nodeId: "child1", element: "p", semanticAddress: "child1", text: "leaf" },
  ];
  const carrier = htmlCarrierOf(document, nodes);
  const system = Object.freeze({
    kind: "rendering.css.system", carrier,
    completionRegime: "ordinal.closure.regime.finite", declarations: [],
  });
  const fiber = buildHtmlDocumentPlan(PROFILE, carrier, system, "static");
  const html = renderHtmlDocument(fiber, { roots: ["child1"] }).html;
  assert.doesNotMatch(html, /data-render-node="root"/);
  assert.match(html, /data-render-node="child1"/);
});

test("htmlCarrierOf obstructs a duplicate nodeId and a document address missing from the node list", () => {
  const document = fixtureDocument(["root"]);
  const dup = htmlCarrierOf(document, [
    { kind: "rendering.htmlCarrier.node", nodeId: "root", element: "div", semanticAddress: "root" },
    { kind: "rendering.htmlCarrier.node", nodeId: "root", element: "div", semanticAddress: "root" },
  ]);
  assert.equal(dup.kind, "rendering.htmlCarrier-obstruction");
  assert.equal(dup.reason, "duplicate-node");

  const missing = htmlCarrierOf(document, []);
  assert.equal(missing.kind, "rendering.htmlCarrier-obstruction");
  assert.equal(missing.reason, "missing-address");
  assert.equal(missing.key, "root");
});

test("buildHtmlDocumentPlan obstructs an element the profile does not allow", () => {
  const document = fixtureDocument(["root"]);
  const carrier = htmlCarrierOf(document, [
    { kind: "rendering.htmlCarrier.node", nodeId: "root", element: "iframe", semanticAddress: "root" },
  ]);
  const system = Object.freeze({
    kind: "rendering.css.system", carrier,
    completionRegime: "ordinal.closure.regime.finite", declarations: [],
  });
  const judgment = buildHtmlDocumentPlan(PROFILE, carrier, system, "static");
  assert.equal(judgment.kind, "rendering.profile_forms_render_fiber-obstruction");
  assert.equal(judgment.reason, "element-not-allowed");
  assert.equal(judgment.key, "iframe");
});

test("renderCarrierNode throws on a cyclic carrier (a descendant referencing back up its own chain)", () => {
  // root -> child1 -> child2 -> child1: root is the sole inferred root (it is
  // nobody's child), so rendering begins and only hits the cycle two levels
  // down, inside child2 -> child1.
  const document = fixtureDocument(["root", "child1", "child2"], {
    order: [["root", "child1"], ["child1", "child2"], ["child2", "child1"]],
  });
  const nodes = [
    { kind: "rendering.htmlCarrier.node", nodeId: "root", element: "div", semanticAddress: "root", children: ["child1"] },
    { kind: "rendering.htmlCarrier.node", nodeId: "child1", element: "p", semanticAddress: "child1", children: ["child2"] },
    { kind: "rendering.htmlCarrier.node", nodeId: "child2", element: "span", semanticAddress: "child2", children: ["child1"] },
  ];
  const carrier = htmlCarrierOf(document, nodes);
  const system = Object.freeze({
    kind: "rendering.css.system", carrier,
    completionRegime: "ordinal.closure.regime.finite", declarations: [],
  });
  const fiber = buildHtmlDocumentPlan(PROFILE, carrier, system, "static");
  assert.throws(() => renderHtmlDocument(fiber), /cyclic carrier node/);
});
