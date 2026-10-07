import assert from "node:assert/strict";
import test from "node:test";
import { renderTufteDocument } from "@red-cup-engineering/web-page-tiling-engine/rendering";
import { describeTufteTopology, reduceTufteWorkspace } from "@red-cup-engineering/web-page-tiling-engine/topology";

// Original request: ni:///sha-256;m9b4ptkSdxBtAgunq7WifA0mZEytLFDLnxdLb2P__7Y
// Operative requirements r1-r3; condition c1. Exact source/test receiving (r4/c2)
// is recorded by the independent receiver, not fabricated by the renderer.
// These are source-level checks. Real-browser and public-site acceptance remain
// separate from the existing fake-DOM keyboard tests and these HTML assertions.
const fixture = () => ({
  title: "Renderer qualification",
  revision: "web-estate-fixture-v1",
  tiles: [
    { id: "article", title: "Article", content: "A stable semantic cell." },
    { id: "inquiry", title: "Inquiry", form: {
      id: "inquiry-form", action: "/inquiry", revision: "form-v1",
      fields: [{ id: "question", name: "question", kind: "textarea", label: "Question", required: true }],
      submitters: [{ id: "send", label: "Send question", action: "/inquiry" }],
    } },
  ],
  workspace: { split: "row", children: ["article", "inquiry"], sizes: [0.6, 0.4] },
});

function freeze(value) {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

const tileIds = (html) => [...html.matchAll(/<section class="tufte-tile" id="([^"]+)"/g)].map((match) => match[1]);
const logicalTopology = (model) => {
  const topology = describeTufteTopology(model);
  return {
    identities: topology.nodes.map(({ id, formId }) => ({ id, formId })),
    readingOrder: topology.edges.filter(({ kind }) => kind === "reading-next"),
  };
};

test("web estate c1: identical structured inputs produce byte-identical semantic HTML without mutation", () => {
  const model = freeze(fixture());
  const options = freeze({ theme: "early-mac" });
  const before = JSON.stringify({ model, options });
  const first = renderTufteDocument(model, options);
  const second = renderTufteDocument(model, options);

  assert.equal(first, second);
  assert.equal(JSON.stringify({ model, options }), before);
  assert.deepEqual(tileIds(first), ["article", "inquiry"]);
  assert.match(first, /<a class="tufte-skip" href="#tufte-content">Skip to content<\/a>/);
  assert.match(first, /<main[^>]*tabindex="-1"[^>]*id="tufte-content"/);
  assert.match(first, /<section[^>]*id="article"[^>]*aria-labelledby="article-title"/);
  assert.match(first, /<h2 id="article-title">Article<\/h2>/);
  assert.match(first, /<label for="question">Question<\/label><textarea id="question" name="question" required/);
  assert.match(first, /role="separator" tabindex="0" aria-orientation="vertical"/);
  assert.match(first, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(first, /scroll-behavior:auto!important;animation-duration:\.01ms!important;transition-duration:\.01ms!important/);
});

test("web estate r2: geometry and design changes preserve semantic identities and authored order", () => {
  const original = freeze(fixture());
  const arranged = freeze({
    ...fixture(),
    workspace: { split: "column", children: ["inquiry", "article"], sizes: [0.25, 0.75] },
  });
  const plain = renderTufteDocument(original);
  const styled = renderTufteDocument(arranged, { theme: "early-mac" });

  assert.notEqual(plain, styled);
  assert.deepEqual(tileIds(plain), ["article", "inquiry"]);
  assert.deepEqual(tileIds(styled), tileIds(plain));
  assert.deepEqual(logicalTopology(arranged), logicalTopology(original));
  assert.match(plain, /aria-orientation="vertical"/);
  assert.match(styled, /aria-orientation="horizontal"/);
  assert.match(styled, /data-tufte-theme="early-mac"/);
});

test("web estate control: a document without workspace or theme retains the same semantic order", () => {
  const { workspace, ...model } = fixture();
  const html = renderTufteDocument(freeze(model));
  assert.deepEqual(tileIds(html), ["article", "inquiry"]);
  assert.doesNotMatch(html, /class="tufte-splitter"/);
  assert.equal(html, renderTufteDocument(model));
});

test("web estate refusal: an invalid workspace operation cannot mutate source identities", () => {
  const model = freeze(fixture());
  const before = JSON.stringify(model);
  const result = reduceTufteWorkspace(model.workspace, { kind: "fullscreen", id: "missing" }, model);
  assert.equal(result.kind, "tufte.workspace.refusal");
  assert.equal(JSON.stringify(model), before);
  assert.deepEqual(tileIds(renderTufteDocument(model)), ["article", "inquiry"]);
});
