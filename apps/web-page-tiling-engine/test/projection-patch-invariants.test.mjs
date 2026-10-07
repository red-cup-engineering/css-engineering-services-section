import assert from "node:assert/strict";
import test from "node:test";

import {
  applyTufteProjectionPatch,
  diffTufteProjection,
  normalizeTufteModel,
} from "../src/tufte-browser.mjs";
import { buildFakeTufteRoot, createFakeDocument } from "./fake-dom.mjs";

function permutations(values) {
  if (values.length === 0) return [[]];
  return values.flatMap((value, index) => permutations(values.toSpliced(index, 1))
    .map((tail) => [value, ...tail]));
}

function arrangements(values) {
  const results = [[]];
  for (let length = 1; length <= values.length; length += 1) {
    for (const ordered of permutations(values)) results.push(ordered.slice(0, length));
  }
  return results.filter((order, index, all) =>
    all.findIndex((candidate) => candidate.join("\0") === order.join("\0")) === index);
}

test("diff/apply preserves the exact authored order across structural changes", () => {
  globalThis.document = createFakeDocument();
  const previousOrders = permutations(["a", "b", "c"]);
  const nextOrders = arrangements(["a", "b", "c", "x", "y"]);

  for (const previousOrder of previousOrders) {
    for (const nextOrder of nextOrders) {
      const previous = normalizeTufteModel({ tiles: previousOrder.map((id) => ({ id })) });
      const next = normalizeTufteModel({ tiles: nextOrder.map((id) => ({ id })) });
      const { root, grid } = buildFakeTufteRoot(previous.tiles);
      const survivingNodes = new Map(previousOrder
        .filter((id) => nextOrder.includes(id))
        .map((id) => [id, grid.querySelector(`#${id}`)]));

      applyTufteProjectionPatch(root, diffTufteProjection(previous, next));

      assert.deepEqual(
        grid.children.map((element) => element.id),
        nextOrder,
        `${previousOrder.join(",") || "<empty>"} -> ${nextOrder.join(",") || "<empty>"}`,
      );
      for (const [id, node] of survivingNodes) {
        assert.equal(grid.querySelector(`#${id}`), node, `surviving tile ${id} retains DOM identity`);
      }
    }
  }
});

test("diff/apply treats html and content as one body representation", () => {
  globalThis.document = createFakeDocument();
  const previous = normalizeTufteModel({
    tiles: [{ id: "body", html: "<strong>trusted</strong>", content: "safe fallback" }],
  });
  const next = normalizeTufteModel({
    tiles: [{ id: "body", content: "safe fallback" }],
  });
  const { root, grid } = buildFakeTufteRoot(previous.tiles);

  const patches = diffTufteProjection(previous, next);
  assert.deepEqual(patches, [{
    op: "update",
    id: "body",
    changed: { html: undefined, content: "safe fallback" },
  }]);

  applyTufteProjectionPatch(root, patches);
  assert.equal(grid.querySelector("#body").querySelector(".tufte-tile-body").innerHTML, "<p>safe fallback</p>");
});

test("body reconciliation preserves the selected representation for every transition", () => {
  globalThis.document = createFakeDocument();
  const cases = [
    {
      name: "content to html",
      previous: { content: "old" },
      next: { html: "<em>new</em>", content: "fallback" },
      expected: "<em>new</em>",
    },
    {
      name: "content to intentionally empty html",
      previous: { content: "old" },
      next: { html: "", content: "must not render" },
      expected: "",
    },
    {
      name: "html content changes while html remains selected",
      previous: { html: "<em>selected</em>", content: "old fallback" },
      next: { html: "<em>selected</em>", content: "new fallback" },
      expected: "<em>selected</em>",
    },
    {
      name: "html changes while content remains the fallback",
      previous: { html: "<em>old</em>", content: "fallback" },
      next: { html: "<em>new</em>", content: "fallback" },
      expected: "<em>new</em>",
    },
    {
      name: "html removed in favor of unchanged content",
      previous: { html: "<em>old</em>", content: "fallback" },
      next: { content: "fallback" },
      expected: "<p>fallback</p>",
    },
  ];

  for (const scenario of cases) {
    const previous = normalizeTufteModel({ tiles: [{ id: "body", ...scenario.previous }] });
    const next = normalizeTufteModel({ tiles: [{ id: "body", ...scenario.next }] });
    const { root, grid } = buildFakeTufteRoot(previous.tiles);
    applyTufteProjectionPatch(root, diffTufteProjection(previous, next));
    assert.equal(
      grid.querySelector("#body").querySelector(".tufte-tile-body").innerHTML,
      scenario.expected,
      scenario.name,
    );
  }
});

test("an inserted tile preserves intentionally empty html", () => {
  globalThis.document = createFakeDocument();
  const previous = normalizeTufteModel({ tiles: [] });
  const next = normalizeTufteModel({ tiles: [{ id: "empty", html: "", content: "must not render" }] });
  const { root, grid } = buildFakeTufteRoot([]);

  applyTufteProjectionPatch(root, diffTufteProjection(previous, next));

  assert.equal(grid.querySelector("#empty").querySelector(".tufte-tile-body").innerHTML, "");
});

test("a grid root owns its direct tiles and never redirects patches into a nested grid", () => {
  globalThis.document = createFakeDocument();
  const { grid: outerGrid } = buildFakeTufteRoot([{ id: "container", title: "Container" }, { id: "same", title: "Outer" }]);
  const { grid: innerGrid } = buildFakeTufteRoot([{ id: "same", title: "Inner" }]);
  outerGrid.querySelector("#container").querySelector(".tufte-tile-body").appendChild(innerGrid);

  applyTufteProjectionPatch(outerGrid, [{ op: "update", id: "same", changed: { title: "Updated outer" } }]);

  assert.equal(outerGrid.children[1].querySelector("h2").textContent, "Updated outer");
  assert.equal(innerGrid.children[0].querySelector("h2").textContent, "Inner");
});

test("an arbitrary root without a TUFTE grid is not a patch target", () => {
  globalThis.document = createFakeDocument();
  const arbitraryRoot = globalThis.document.createElement("aside");

  const result = applyTufteProjectionPatch(arbitraryRoot, [{
    op: "insert",
    id: "intruder",
    afterId: null,
    tile: normalizeTufteModel({ tiles: [{ id: "intruder" }] }).tiles[0],
  }]);

  assert.equal(result, null);
  assert.equal(arbitraryRoot.children.length, 0);
});

test("DOM reconciliation creates nodes in the target root's document realm", () => {
  const previousDocument = globalThis.document;
  const ownerDocument = createFakeDocument();
  const { root, grid } = buildFakeTufteRoot([]);
  root.ownerDocument = ownerDocument;
  grid.ownerDocument = ownerDocument;
  delete globalThis.document;

  try {
    const tile = normalizeTufteModel({ tiles: [{ id: "realm", title: "Local" }] }).tiles[0];
    applyTufteProjectionPatch(root, [{ op: "insert", id: "realm", afterId: null, tile }]);
    applyTufteProjectionPatch(root, [{ op: "update", id: "realm", changed: { eyebrow: "Local realm" } }]);

    const element = grid.children[0];
    assert.equal(element.ownerDocument, ownerDocument);
    assert.equal(element.querySelector(".tufte-eyebrow").ownerDocument, ownerDocument);
  } finally {
    globalThis.document = previousDocument;
  }
});
