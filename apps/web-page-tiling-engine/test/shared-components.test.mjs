import test from "node:test";
import assert from "node:assert/strict";
import { fromSection, verifyPacket, markup } from "@red-cup-engineering/html-structural-projection-service";
import { renderTuftePacket, renderTufteFragment, renderTufteForm } from "../src/render-tufte-document.mjs";
import { renderTufteTileBody, normalizeTufteForm, normalizeTufteModel, diffTufteProjection } from "../src/tufte-browser.mjs";

test("server and browser consume one renderer for navigation, tables, forms, and values", () => {
  for (const tile of [
    { links: [{ href: "/object/a", label: "<A>" }] },
    { table: { columns: ["Name"], rows: [[{ href: "/object/a", label: "<A>" }]] } },
    { data: { id: "<A>", empty: [] } },
    { form: { action: "/invoke", fields: [{ name: "body", kind: "textarea" }] } },
  ]) {
    const model = normalizeTufteModel({ tiles: [tile] });
    assert.ok(renderTufteFragment(model).includes(renderTufteTileBody(model.tiles[0])));
    assert.doesNotMatch(renderTufteTileBody(tile), /<A>/);
  }
  assert.match(renderTufteForm(normalizeTufteForm({ action: "/invoke" })), /action="\/invoke"/);
  assert.throws(() => renderTufteTileBody({ links: [{ href: "javascript:alert(1)" }] }), /Unsupported/);
});

test("TUFTE carries the exact typed reading through the shared SHP codec", () => {
  const dataform = fromSection({ affirmed: [{ predicate: "record", object: { id: 42, empty: [] }, citation: "record:42" }] });
  const packet = renderTuftePacket(dataform, { source: "record:42" }, { title: "Record" });
  assert.equal(verifyPacket(packet), true);
  assert.match(packet.html, /data-tufte/);
  assert.deepEqual(markup(packet.html), dataform.cells);
});

test("changing a body component clears the previous representation", () => {
  const patch = diffTufteProjection({ tiles: [{ id: "a", table: { columns: [], rows: [] } }] },
    { tiles: [{ id: "a", links: [{ href: "/next", label: "Next" }] }] })[0];
  assert.equal(patch.changed.table, undefined);
  assert.deepEqual(patch.changed.links, [{ href: "/next", label: "Next" }]);
});
