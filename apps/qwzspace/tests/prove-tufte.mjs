import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createTufteRoomModel,
  normalizeTufteRoomProjection,
  renderTufteRoomDocument,
} from "../src/tufte.mjs";

const room = {
  title: "Harbor",
  tick: 7,
  entries: [{ id: "quay", name: "Harbor Quay" }],
  leadingTiles: [{ id: "status", title: "Status", content: "Connected" }],
  tileForEntry: (entry) => ({ id: entry.id, title: entry.name, content: "A live room." }),
};

test("TUFTE is QwzSpace's document projection boundary", () => {
  const model = createTufteRoomModel(room);
  assert.equal(model.tick, 7);
  assert.deepEqual(model.tiles.map((tile) => tile.id), ["status", "quay"]);
  const projection = normalizeTufteRoomProjection(room);
  assert.equal(projection.kind, "tufte.projection");
  assert.equal(projection.revision, "tick-7");
  assert.equal(projection.tiles[1].title, "Harbor Quay");
});

test("QwzSpace renders a useful server-first TUFTE document", () => {
  const html = renderTufteRoomDocument(room);
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /data-tufte/);
  assert.match(html, /Harbor Quay/);
});

test("the consuming game must own its domain-to-tile mapping", () => {
  assert.throws(() => createTufteRoomModel({ entries: [] }), /tileForEntry/);
});
