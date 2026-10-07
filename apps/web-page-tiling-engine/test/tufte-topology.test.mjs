import assert from "node:assert/strict";
import test from "node:test";
import { describeTufteTopology, reduceTufteTopology } from "../src/tufte-topology.mjs";

const model = {
  revision: "r7",
  tiles: [
    { id: "question", title: "Question", span: 8, form: { id: "ask", action: "ask", fields: [{ name: "query" }] } },
    { id: "sources", title: "Sources", side: "right", span: 4 },
    { id: "notes", title: "Notes", span: 12 },
  ],
};

test("describeTufteTopology makes adjacency, semantic placement, and form ownership inspectable", () => {
  const topology = describeTufteTopology(model);
  assert.equal(topology.kind, "tufte.topology");
  assert.deepEqual(topology.edges, [
    { kind: "reading-next", from: "question", to: "sources" },
    { kind: "reading-next", from: "sources", to: "notes" },
  ]);
  assert.equal(topology.nodes[0].formId, "ask");
  assert.equal(topology.nodes[1].side, "right");
  assert.ok(Object.isFrozen(topology.nodes));
});

test("reduceTufteTopology moves a tile by semantic anchor and updates governed reading order", () => {
  const result = reduceTufteTopology(model, { kind: "move", id: "notes", afterId: null });
  assert.equal(result.kind, "tufte.topology.receipt");
  assert.deepEqual(result.projection.tiles.map((tile) => tile.id), ["notes", "question", "sources"]);
  assert.deepEqual(result.topology.edges[0], { kind: "reading-next", from: "notes", to: "question" });
});

test("reduceTufteTopology resizes within the real 12-track tiling contract", () => {
  const result = reduceTufteTopology(model, { kind: "resize", id: "sources", span: 6 });
  assert.equal(result.kind, "tufte.topology.receipt");
  assert.equal(result.projection.tiles.find((tile) => tile.id === "sources").span, 6);
  assert.equal(result.topology.nodes.find((tile) => tile.id === "sources").span, 6);
});

test("reduceTufteTopology refuses invalid user operations as data without mutating the projection", () => {
  const badSpan = reduceTufteTopology(model, { kind: "resize", id: "sources", span: 99 });
  assert.equal(badSpan.kind, "tufte.topology.refusal");
  assert.equal(badSpan.reason, "invalid-span");
  assert.equal(badSpan.projection.tiles.find((tile) => tile.id === "sources").span, 4);

  const selfMove = reduceTufteTopology(model, { kind: "move", id: "sources", afterId: "sources" });
  assert.equal(selfMove.reason, "self-anchor");
});

// ---- Workspace: the split-tree tiling layout ----

import {
  normalizeTufteWorkspace,
  computeTufteWorkspaceGeometry,
  describeTufteWorkspace,
  reduceTufteWorkspace,
  applyTufteWorkspace,
  connectTufteWorkspace,
  TUFTE_WORKSPACE_MIN_SHARE,
} from "../src/tufte-topology.mjs";
import { buildFakeTufteRoot, createFakeDocument } from "./fake-dom.mjs";

const mudModel = {
  revision: "tick-9",
  tiles: [
    { id: "status", title: "Status" },
    { id: "transcript", title: "Transcript" },
    { id: "command", title: "Command" },
    { id: "room", title: "Room" },
  ],
};

const mudWorkspace = {
  split: "row",
  sizes: [0.7, 0.3],
  children: [
    { split: "column", sizes: [0.8, 0.2], children: ["transcript", "command"] },
    { split: "column", sizes: [0.3, 0.7], children: ["status", "room"] },
  ],
};

test("normalizeTufteWorkspace accepts authored shorthand and produces a frozen normal form", () => {
  const workspace = normalizeTufteWorkspace(mudWorkspace, mudModel);
  assert.equal(workspace.kind, "tufte.workspace");
  assert.equal(workspace.root.kind, "split");
  assert.equal(workspace.root.direction, "row");
  assert.equal(workspace.root.children[0].children[0].tile, "transcript");
  assert.ok(Object.isFrozen(workspace.root));
  const sum = workspace.root.sizes.reduce((total, size) => total + size, 0);
  assert.ok(Math.abs(sum - 1) < 1e-4);
});

test("normalizeTufteWorkspace survives a JSON round-trip unchanged", () => {
  const workspace = normalizeTufteWorkspace(mudWorkspace, mudModel);
  const again = normalizeTufteWorkspace(JSON.parse(JSON.stringify(workspace)), mudModel);
  assert.deepEqual(again, workspace);
});

test("normalizeTufteWorkspace drops unknown panes, collapses single-child splits, adopts unplaced tiles", () => {
  const workspace = normalizeTufteWorkspace(
    { split: "row", children: [{ split: "column", children: ["transcript", "ghost"] }, "command"] },
    mudModel,
  );
  const json = JSON.stringify(workspace);
  assert.doesNotMatch(json, /ghost/);
  // transcript's column collapsed to a bare pane; status and room adopted.
  assert.match(json, /"status"/);
  assert.match(json, /"room"/);
  assert.equal(workspace.root.direction, "column");
});

test("absent workspace input is the reading-order column", () => {
  const workspace = normalizeTufteWorkspace(undefined, mudModel);
  assert.equal(workspace.root.direction, "column");
  assert.deepEqual(workspace.root.children.map((child) => child.tile), ["status", "transcript", "command", "room"]);
});

test("computeTufteWorkspaceGeometry flattens any split tree onto one grid with real edges", () => {
  const geometry = computeTufteWorkspaceGeometry(mudWorkspace, mudModel);
  assert.equal(geometry.kind, "tufte.workspace.geometry");
  assert.equal(geometry.panes.length, 4);
  // Non-aligned nested cuts: 2 columns, and rows for the union of 0.8 and 0.3 cuts.
  assert.equal(geometry.columns.length, 2);
  assert.equal(geometry.rows.length, 3);
  const transcript = geometry.panes.find((pane) => pane.tile === "transcript");
  assert.deepEqual(transcript.area.column, [1, 2]);
  assert.deepEqual(transcript.area.row, [1, 3]);
  // One splitter per interior edge: root, left column, right column.
  assert.equal(geometry.splitters.length, 3);
  const rootSplitter = geometry.splitters.find((splitter) => splitter.id === "root:0");
  assert.equal(rootSplitter.axis, "row");
  assert.ok(Math.abs(rootSplitter.boundary - 0.7) < 1e-4);
});

test("describeTufteWorkspace exposes directed spatial adjacency for keyboard arrangement", () => {
  const topology = describeTufteWorkspace(mudWorkspace, mudModel);
  assert.equal(topology.kind, "tufte.workspace.topology");
  const right = topology.edges.filter((edge) => edge.axis === "row" && edge.from === "transcript").map((edge) => edge.to);
  assert.ok(right.includes("status") || right.includes("room"));
  const below = topology.edges.find((edge) => edge.axis === "column" && edge.from === "transcript");
  assert.equal(below.to, "command");
});

test("reduceTufteWorkspace resize moves one boundary and receipts the new workspace", () => {
  const result = reduceTufteWorkspace(mudWorkspace, mudModel, { kind: "resize", path: [], index: 0, boundary: 0.5 });
  assert.equal(result.kind, "tufte.workspace.receipt");
  assert.ok(Math.abs(result.workspace.root.sizes[0] - 0.5) < 1e-4);
  assert.ok(Math.abs(result.workspace.root.sizes[1] - 0.5) < 1e-4);
});

test("reduceTufteWorkspace refuses a boundary that starves a pane below the minimum share", () => {
  const result = reduceTufteWorkspace(mudWorkspace, mudModel, { kind: "resize", path: [], index: 0, boundary: TUFTE_WORKSPACE_MIN_SHARE / 2 });
  assert.equal(result.kind, "tufte.workspace.refusal");
  assert.equal(result.reason, "invalid-boundary");
});

test("reduceTufteWorkspace swap exchanges two panes' tiles in place", () => {
  const result = reduceTufteWorkspace(mudWorkspace, mudModel, { kind: "swap", id: "status", withId: "room" });
  assert.equal(result.kind, "tufte.workspace.receipt");
  assert.deepEqual(result.workspace.root.children[1].children.map((child) => child.tile), ["room", "status"]);
});

test("reduceTufteWorkspace move re-seats a pane against a named edge, splitting along its axis", () => {
  const result = reduceTufteWorkspace(mudWorkspace, mudModel, { kind: "move", id: "status", targetId: "transcript", edge: "top" });
  assert.equal(result.kind, "tufte.workspace.receipt");
  const geometry = result.geometry;
  const status = geometry.panes.find((pane) => pane.tile === "status");
  const transcript = geometry.panes.find((pane) => pane.tile === "transcript");
  assert.ok(status.rect.y < transcript.rect.y);
  assert.ok(Math.abs(status.rect.x - transcript.rect.x) < 1e-6);
});

test("reduceTufteWorkspace refuses unknown tiles, self targets, and bad edges as data", () => {
  assert.equal(reduceTufteWorkspace(mudWorkspace, mudModel, { kind: "swap", id: "ghost", withId: "room" }).reason, "unknown-tile");
  assert.equal(reduceTufteWorkspace(mudWorkspace, mudModel, { kind: "move", id: "room", targetId: "room", edge: "left" }).reason, "self-target");
  assert.equal(reduceTufteWorkspace(mudWorkspace, mudModel, { kind: "move", id: "room", targetId: "status", edge: "sideways" }).reason, "invalid-edge");
  assert.equal(reduceTufteWorkspace(mudWorkspace, mudModel, { kind: "levitate" }).reason, "unsupported-operation");
});

// ---- Workspaces: a named, switchable set of workspace split-trees ----

import { normalizeTufteWorkspaces, reduceTufteWorkspaces } from "../src/tufte-topology.mjs";

const workspaceSet = {
  active: "chat",
  workspaces: {
    chat: { split: "column", children: ["transcript", "command"] },
    side: { split: "column", children: ["status", "room"] },
  },
};

test("normalizeTufteWorkspaces creates a lone default 'main' workspace holding the reading-order column when absent", () => {
  const set = normalizeTufteWorkspaces(undefined, mudModel);
  assert.equal(set.kind, "tufte.workspaces");
  assert.equal(set.active, "main");
  assert.deepEqual(Object.keys(set.workspaces), ["main"]);
  assert.deepEqual(set.workspaces.main.root.children.map((child) => child.tile), ["status", "transcript", "command", "room"]);
});

test("normalizeTufteWorkspaces places every tile in exactly one named workspace, first placement wins", () => {
  const set = normalizeTufteWorkspaces(workspaceSet, mudModel);
  assert.equal(set.active, "chat");
  assert.deepEqual(Object.keys(set.workspaces), ["chat", "side"]);
  assert.deepEqual(set.workspaces.chat.root.children.map((child) => child.tile), ["transcript", "command"]);
  assert.deepEqual(set.workspaces.side.root.children.map((child) => child.tile), ["status", "room"]);
  assert.ok(Object.isFrozen(set.workspaces.chat));
});

test("normalizeTufteWorkspaces adopts a tile unplaced by any named workspace into the active workspace", () => {
  const set = normalizeTufteWorkspaces(
    { active: "chat", workspaces: { chat: { split: "column", children: ["transcript"] } } },
    mudModel,
  );
  // status, command, and room are unplaced by the sole authored workspace,
  // and adopted after transcript in the projection's own reading order.
  assert.deepEqual(set.workspaces.chat.root.children.map((child) => child.tile), ["transcript", "status", "command", "room"]);
});

test("normalizeTufteWorkspaces survives a JSON round-trip unchanged", () => {
  const set = normalizeTufteWorkspaces(workspaceSet, mudModel);
  const again = normalizeTufteWorkspaces(JSON.parse(JSON.stringify(set)), mudModel);
  assert.deepEqual(again, set);
});

test("reduceTufteWorkspaces switch creates-or-switches the active workspace, matching i3's `workspace <name>` convention", () => {
  const toExisting = reduceTufteWorkspaces(workspaceSet, mudModel, { kind: "switch", name: "side" });
  assert.equal(toExisting.kind, "tufte.workspaces.receipt");
  assert.equal(toExisting.workspaceSet.active, "side");
  assert.deepEqual(Object.keys(toExisting.workspaceSet.workspaces), ["chat", "side"]);

  const toNew = reduceTufteWorkspaces(workspaceSet, mudModel, { kind: "switch", name: "logs" });
  assert.equal(toNew.workspaceSet.active, "logs");
  assert.deepEqual(Object.keys(toNew.workspaceSet.workspaces), ["chat", "side", "logs"]);
  assert.equal(toNew.workspaceSet.workspaces.logs.root, null);
});

test("reduceTufteWorkspaces switch refuses an invalid name as data", () => {
  assert.equal(reduceTufteWorkspaces(workspaceSet, mudModel, { kind: "switch", name: "" }).reason, "invalid-name");
  assert.equal(reduceTufteWorkspaces(workspaceSet, mudModel, { kind: "switch", name: 7 }).reason, "invalid-name");
});

test("reduceTufteWorkspaces move relocates a tile to a named workspace, creating it if absent", () => {
  const result = reduceTufteWorkspaces(workspaceSet, mudModel, { kind: "move", id: "status", to: "logs" });
  assert.equal(result.kind, "tufte.workspaces.receipt");
  const set = result.workspaceSet;
  assert.deepEqual(set.workspaces.side.root, { kind: "pane", tile: "room" });
  assert.deepEqual(set.workspaces.logs.root, { kind: "pane", tile: "status" });
  // The active workspace is unchanged by a move.
  assert.equal(set.active, "chat");
});

test("reduceTufteWorkspaces move refuses an unknown tile, a same-workspace target, and an invalid target name", () => {
  assert.equal(reduceTufteWorkspaces(workspaceSet, mudModel, { kind: "move", id: "ghost", to: "side" }).reason, "unknown-tile");
  assert.equal(reduceTufteWorkspaces(workspaceSet, mudModel, { kind: "move", id: "status", to: "side" }).reason, "already-there");
  assert.equal(reduceTufteWorkspaces(workspaceSet, mudModel, { kind: "move", id: "status", to: "" }).reason, "invalid-target");
});

test("reduceTufteWorkspaces refuses unsupported operations as data", () => {
  assert.equal(reduceTufteWorkspaces(workspaceSet, mudModel, { kind: "levitate" }).reason, "unsupported-operation");
});

// ---- Workspace applied to the fake DOM ----

function workspaceRoot() {
  const { root, grid } = buildFakeTufteRoot(mudModel.tiles);
  const ownerDocument = createFakeDocument();
  root.ownerDocument = ownerDocument;
  grid.ownerDocument = ownerDocument;
  return { root, grid };
}

test("applyTufteWorkspace places tiles by grid-area and reconciles splitter elements, never touching DOM order", () => {
  const { root, grid } = workspaceRoot();
  const state = applyTufteWorkspace(root, mudWorkspace);
  assert.equal(state.workspace.kind, "tufte.workspace");
  assert.deepEqual(grid.children.filter((child) => child.classList.contains("tufte-tile")).map((child) => child.id),
    ["status", "transcript", "command", "room"]);
  const transcript = grid.children.find((child) => child.id === "transcript");
  assert.equal(transcript.style.getPropertyValue("grid-area"), "1 / 1 / 3 / 2");
  const splitters = grid.querySelectorAll(".tufte-splitter");
  assert.equal(splitters.length, 3);
  const rootSplitter = splitters.find((element) => element.getAttribute("data-tufte-splitter") === "root:0");
  assert.equal(rootSplitter.getAttribute("role"), "separator");
  assert.equal(rootSplitter.getAttribute("aria-orientation"), "vertical");
  assert.equal(rootSplitter.getAttribute("aria-valuenow"), "70");
  // Idempotent: a second apply reuses the same splitter elements.
  applyTufteWorkspace(root, mudWorkspace);
  assert.equal(grid.querySelectorAll(".tufte-splitter").length, 3);
});

test("connectTufteWorkspace: arrow keys on a focused splitter resize through the reducer and emit a receipt", () => {
  const { root, grid } = workspaceRoot();
  const events = [];
  root.addEventListener("tufte:workspace", (event) => events.push(event.detail));
  const handle = connectTufteWorkspace(root, { workspace: mudWorkspace });
  const splitter = grid.querySelectorAll(".tufte-splitter").find((element) => element.getAttribute("data-tufte-splitter") === "root:0");
  // Fake keyboard event: plain object dispatch through the grid listener.
  const event = { type: "keydown", key: "ArrowLeft", target: splitter, preventDefault() { this.defaultPrevented = true; }, bubbles: true };
  splitter.dispatchEvent(event);
  const receipt = events.find((detail) => detail?.kind === "tufte.workspace.receipt");
  assert.ok(receipt, "a resize receipt must be emitted");
  assert.equal(receipt.operation.kind, "resize");
  assert.ok(Math.abs(handle.workspace().root.sizes[0] - 0.675) < 1e-3);
  assert.equal(splitter.getAttribute("aria-valuenow"), "68");
  handle.disconnect();
});

test("connectTufteWorkspace: Alt+Shift+Arrow inside a tile swaps it with its spatial neighbor", () => {
  const { root, grid } = workspaceRoot();
  const handle = connectTufteWorkspace(root, { workspace: mudWorkspace });
  const command = grid.children.find((child) => child.id === "command");
  const event = { type: "keydown", key: "ArrowUp", altKey: true, shiftKey: true, target: command, preventDefault() {}, bubbles: true };
  command.dispatchEvent(event);
  const left = handle.workspace().root.children[0];
  assert.deepEqual(left.children.map((child) => child.tile), ["command", "transcript"]);
  handle.disconnect();
});

test("connectTufteWorkspace: Alt+Arrow (no Shift) inside a tile focuses its spatial neighbor without changing the workspace", () => {
  const { root, grid } = workspaceRoot();
  const events = [];
  root.addEventListener("tufte:workspace", (event) => events.push(event.detail));
  const handle = connectTufteWorkspace(root, { workspace: mudWorkspace });
  const before = JSON.stringify(handle.workspace());
  const command = grid.children.find((child) => child.id === "command");
  const transcript = grid.children.find((child) => child.id === "transcript");
  const event = { type: "keydown", key: "ArrowUp", altKey: true, target: command, preventDefault() { this.defaultPrevented = true; }, bubbles: true };
  command.dispatchEvent(event);
  assert.equal(transcript.focused, true);
  assert.equal(command.focused, undefined);
  assert.equal(event.defaultPrevented, true);
  assert.equal(JSON.stringify(handle.workspace()), before, "focus movement changes no workspace data");
  assert.equal(events.length, 0, "focus movement emits no tufte:workspace event");
  handle.disconnect();
});

test("connectTufteWorkspace: Alt+Arrow toward a tile with no spatial neighbor does nothing", () => {
  const { root, grid } = workspaceRoot();
  const handle = connectTufteWorkspace(root, { workspace: mudWorkspace });
  const transcript = grid.children.find((child) => child.id === "transcript");
  const event = { type: "keydown", key: "ArrowLeft", altKey: true, target: transcript, preventDefault() { this.defaultPrevented = true; }, bubbles: true };
  transcript.dispatchEvent(event);
  assert.notEqual(event.defaultPrevented, true);
  assert.equal(transcript.focused, undefined);
  handle.disconnect();
});

test("connectTufteWorkspace: refusals are emitted as data and change nothing", () => {
  const { root } = workspaceRoot();
  const events = [];
  root.addEventListener("tufte:workspace", (event) => events.push(event.detail));
  const handle = connectTufteWorkspace(root, { workspace: mudWorkspace });
  const before = JSON.stringify(handle.workspace());
  const result = handle.arrange({ kind: "swap", id: "status", withId: "status" });
  assert.equal(result.kind, "tufte.workspace.refusal");
  assert.equal(result.reason, "self-swap");
  assert.equal(JSON.stringify(handle.workspace()), before);
  assert.ok(events.some((detail) => detail?.kind === "tufte.workspace.refusal"));
  handle.disconnect();
});

// ---- Fullscreen and restore: an overlay on the value, never a tree mutation ----

import { createTufteWorkspaceHistory } from "../src/tufte-topology.mjs";
import { renderTufteFragment } from "../src/tufte-rendering.mjs";

test("reduceTufteWorkspace fullscreen collapses one pane to the whole surface, hides the rest, and restore reproduces the prior value exactly", () => {
  const before = normalizeTufteWorkspace(mudWorkspace, mudModel);
  const full = reduceTufteWorkspace(before, mudModel, { kind: "fullscreen", id: "transcript" });
  assert.equal(full.kind, "tufte.workspace.receipt");
  assert.equal(full.workspace.fullscreen, "transcript");
  assert.deepEqual(full.workspace.root, before.root, "fullscreen leaves the split tree untouched");
  assert.equal(full.geometry.fullscreen, "transcript");
  assert.deepEqual(full.geometry.panes.map((pane) => pane.tile), ["transcript"]);
  assert.deepEqual(full.geometry.panes[0].rect, { x: 0, y: 0, width: 1, height: 1 });
  assert.deepEqual(full.geometry.panes[0].path, [0, 0], "the pane keeps its path in the untouched tree");
  assert.deepEqual([...full.geometry.hidden].sort(), ["command", "room", "status"]);
  assert.equal(full.geometry.splitters.length, 0, "no interior edge remains to resize");
  assert.deepEqual(full.geometry.columns, [1]);
  assert.deepEqual(full.geometry.rows, [1]);
  assert.equal(describeTufteWorkspace(full.workspace, mudModel).edges.length, 0);

  const restored = reduceTufteWorkspace(full.workspace, mudModel, { kind: "restore" });
  assert.equal(restored.kind, "tufte.workspace.receipt");
  assert.deepEqual(restored.workspace, before, "restore reproduces the pre-fullscreen workspace value exactly");
  assert.deepEqual(restored.geometry.hidden, []);
  assert.equal(restored.geometry.splitters.length, 3);
});

test("reduceTufteWorkspace refuses fullscreen on an unknown or already-fullscreen tile, and restore when nothing is fullscreen, as data", () => {
  assert.equal(reduceTufteWorkspace(mudWorkspace, mudModel, { kind: "fullscreen", id: "ghost" }).reason, "unknown-tile");
  assert.equal(reduceTufteWorkspace(mudWorkspace, mudModel, { kind: "restore" }).reason, "not-fullscreen");
  const full = reduceTufteWorkspace(mudWorkspace, mudModel, { kind: "fullscreen", id: "room" }).workspace;
  const again = reduceTufteWorkspace(full, mudModel, { kind: "fullscreen", id: "room" });
  assert.equal(again.kind, "tufte.workspace.refusal");
  assert.equal(again.reason, "already-fullscreen");
  assert.deepEqual(again.workspace, full);
});

test("a fullscreen workspace survives a JSON round-trip, keeps its overlay through arrangement operations, and drops it when the tile leaves the projection", () => {
  const full = reduceTufteWorkspace(mudWorkspace, mudModel, { kind: "fullscreen", id: "room" }).workspace;
  assert.deepEqual(normalizeTufteWorkspace(JSON.parse(JSON.stringify(full)), mudModel), full);
  const swapped = reduceTufteWorkspace(full, mudModel, { kind: "swap", id: "room", withId: "status" });
  assert.equal(swapped.kind, "tufte.workspace.receipt");
  assert.equal(swapped.workspace.fullscreen, "room", "arranging underneath keeps the overlay");
  const smaller = { ...mudModel, tiles: mudModel.tiles.filter((tile) => tile.id !== "room") };
  assert.equal(normalizeTufteWorkspace(full, smaller).fullscreen, undefined, "an overlay naming a departed tile is dropped, never dangling");
});

test("applyTufteWorkspace hides every tile but the fullscreen one with the hidden attribute, names it on the grid, and restores them", () => {
  const { root, grid } = workspaceRoot();
  const full = reduceTufteWorkspace(mudWorkspace, mudModel, { kind: "fullscreen", id: "transcript" }).workspace;
  applyTufteWorkspace(root, full);
  assert.equal(grid.getAttribute("data-tufte-fullscreen"), "transcript");
  const tiles = grid.children.filter((child) => child.classList.contains("tufte-tile"));
  assert.deepEqual(tiles.map((child) => child.id), ["status", "transcript", "command", "room"], "DOM order is untouched under fullscreen");
  assert.deepEqual(tiles.map((child) => child.hasAttribute("hidden")), [true, false, true, true]);
  assert.equal(grid.children.find((child) => child.id === "transcript").style.getPropertyValue("grid-area"), "1 / 1 / 2 / 2");
  assert.equal(grid.querySelectorAll(".tufte-splitter").length, 0);
  applyTufteWorkspace(root, mudWorkspace);
  assert.equal(grid.getAttribute("data-tufte-fullscreen"), null);
  assert.deepEqual(tiles.map((child) => child.hasAttribute("hidden")), [false, false, false, false]);
  assert.equal(grid.querySelectorAll(".tufte-splitter").length, 3);
});

test("renderTufteFragment renders a fullscreen workspace server-first: covered tiles carry hidden, the grid names the fullscreen tile, no splitters", () => {
  const html = renderTufteFragment({ ...mudModel, workspace: { ...mudWorkspace, fullscreen: "transcript" } });
  assert.match(html, /data-tufte-fullscreen="transcript"/);
  assert.match(html, /<section class="tufte-tile" id="status" hidden /);
  assert.match(html, /<section class="tufte-tile" id="room" hidden /);
  assert.doesNotMatch(html, /id="transcript" hidden/);
  assert.doesNotMatch(html, /tufte-splitter/);
  assert.ok(html.indexOf('id="status"') < html.indexOf('id="transcript"'), "reading order is still the authored order");
  const plain = renderTufteFragment({ ...mudModel, workspace: mudWorkspace });
  assert.doesNotMatch(plain, / hidden /);
  assert.doesNotMatch(plain, /data-tufte-fullscreen/);
});

test("connectTufteWorkspace: Alt+F toggles fullscreen on the focused tile through the reducer, and a second Alt+F restores", () => {
  const { root, grid } = workspaceRoot();
  const events = [];
  root.addEventListener("tufte:workspace", (event) => events.push(event.detail));
  const handle = connectTufteWorkspace(root, { workspace: mudWorkspace });
  const transcript = grid.children.find((child) => child.id === "transcript");
  const press = (key) => transcript.dispatchEvent({ type: "keydown", key, altKey: true, target: transcript, preventDefault() { this.defaultPrevented = true; }, bubbles: true });
  press("f");
  assert.equal(handle.workspace().fullscreen, "transcript");
  assert.equal(grid.getAttribute("data-tufte-fullscreen"), "transcript");
  assert.equal(transcript.hasAttribute("hidden"), false);
  for (const id of ["status", "command", "room"]) assert.equal(grid.children.find((child) => child.id === id).hasAttribute("hidden"), true);
  assert.equal(events.at(-1).operation.kind, "fullscreen");
  press("F");
  assert.equal(handle.workspace().fullscreen, undefined);
  assert.equal(grid.getAttribute("data-tufte-fullscreen"), null);
  for (const id of ["status", "command", "room"]) assert.equal(grid.children.find((child) => child.id === id).hasAttribute("hidden"), false);
  assert.equal(events.at(-1).operation.kind, "restore");
  handle.disconnect();
});

// ---- Undo/redo: a bounded history of values, replayed through the same apply path ----

test("createTufteWorkspaceHistory records, undoes, redoes, bounds its depth, and clears redo on a new record", () => {
  const history = createTufteWorkspaceHistory({ limit: 2 });
  assert.equal(history.canUndo(), false);
  assert.equal(history.undo("now"), null);
  history.record("a");
  history.record("b");
  history.record("c");
  assert.deepEqual(history.depth(), { past: 2, future: 0 }, "the oldest entry beyond the limit is dropped");
  assert.equal(history.undo("d"), "c");
  assert.equal(history.undo("c"), "b");
  assert.equal(history.undo("b"), null);
  assert.equal(history.redo("b"), "c");
  history.record("c");
  assert.equal(history.canRedo(), false, "a new record clears the redo branch");
  history.clear();
  assert.deepEqual(history.depth(), { past: 0, future: 0 });
});

test("connectTufteWorkspace: undo and redo replay prior workspace values exactly through the same apply path", () => {
  const { root, grid } = workspaceRoot();
  const events = [];
  root.addEventListener("tufte:workspace", (event) => events.push(event.detail));
  const handle = connectTufteWorkspace(root, { workspace: mudWorkspace });
  const original = handle.workspace();
  handle.arrange({ kind: "resize", path: [], index: 0, boundary: 0.5 });
  const afterResize = handle.workspace();
  handle.arrange({ kind: "swap", id: "status", withId: "room" });
  assert.deepEqual(handle.history(), { past: 2, future: 0 });

  const undone = handle.undo();
  assert.equal(undone.kind, "tufte.workspace.receipt");
  assert.deepEqual(undone.operation, { kind: "undo" });
  assert.deepEqual(handle.workspace(), afterResize);
  handle.undo();
  assert.deepEqual(handle.workspace(), original, "two undos reproduce the original value exactly");
  assert.equal(grid.querySelectorAll(".tufte-splitter").find((element) => element.getAttribute("data-tufte-splitter") === "root:0").getAttribute("aria-valuenow"), "70", "the DOM was re-applied from the value");

  const exhausted = handle.undo();
  assert.equal(exhausted.kind, "tufte.workspace.refusal");
  assert.equal(exhausted.reason, "nothing-to-undo");
  assert.deepEqual(handle.workspace(), original);

  handle.redo();
  assert.deepEqual(handle.workspace(), afterResize);
  handle.arrange({ kind: "swap", id: "transcript", withId: "command" });
  assert.equal(handle.redo().reason, "nothing-to-redo", "a new change after undo discards the redo branch");
  assert.equal(events.filter((detail) => detail.operation?.kind === "undo").length, 3);
  handle.disconnect();
});

test("connectTufteWorkspace: Alt+Z undoes and Alt+Shift+Z redoes from inside any tile", () => {
  const { root, grid } = workspaceRoot();
  const handle = connectTufteWorkspace(root, { workspace: mudWorkspace });
  const original = handle.workspace();
  handle.arrange({ kind: "swap", id: "status", withId: "room" });
  const swapped = handle.workspace();
  const command = grid.children.find((child) => child.id === "command");
  const undo = { type: "keydown", key: "z", altKey: true, target: command, preventDefault() { this.defaultPrevented = true; }, bubbles: true };
  command.dispatchEvent(undo);
  assert.equal(undo.defaultPrevented, true);
  assert.deepEqual(handle.workspace(), original);
  command.dispatchEvent({ type: "keydown", key: "Z", altKey: true, shiftKey: true, target: command, preventDefault() {}, bubbles: true });
  assert.deepEqual(handle.workspace(), swapped);
  handle.disconnect();
});

test("connectTufteWorkspace: history false disables undo as a named refusal", () => {
  const { root } = workspaceRoot();
  const handle = connectTufteWorkspace(root, { workspace: mudWorkspace, history: false });
  handle.arrange({ kind: "swap", id: "status", withId: "room" });
  assert.equal(handle.history(), null);
  assert.equal(handle.undo().reason, "history-disabled");
  handle.disconnect();
});

test("connectTufteWorkspace: a pointer drag on a splitter resizes through the reducer and is one undo step", () => {
  const { root, grid } = workspaceRoot();
  grid.getBoundingClientRect = () => ({ left: 100, top: 0, width: 1000, height: 500 });
  const events = [];
  root.addEventListener("tufte:workspace", (event) => events.push(event.detail));
  const handle = connectTufteWorkspace(root, { workspace: mudWorkspace });
  const original = handle.workspace();
  const splitter = grid.querySelectorAll(".tufte-splitter").find((element) => element.getAttribute("data-tufte-splitter") === "root:0");
  splitter.dispatchEvent({ type: "pointerdown", target: splitter, pointerId: 1, preventDefault() {}, bubbles: true });
  grid.dispatchEvent({ type: "pointermove", target: grid, clientX: 100 + 600, clientY: 10, bubbles: true });
  grid.dispatchEvent({ type: "pointermove", target: grid, clientX: 100 + 500, clientY: 10, bubbles: true });
  grid.dispatchEvent({ type: "pointerup", target: grid, bubbles: true });
  assert.ok(Math.abs(handle.workspace().root.sizes[0] - 0.5) < 1e-4);
  assert.equal(events.filter((detail) => detail.kind === "tufte.workspace.receipt").length, 2, "every pointer move is its own receipt");
  assert.deepEqual(handle.history(), { past: 1, future: 0 }, "but the drag is one gesture, so one undo step");
  handle.undo();
  assert.deepEqual(handle.workspace(), original);
  handle.disconnect();
});

test("connectTufteWorkspace: storageKey persists every accepted receipt and a fresh connection restores the same value, fullscreen included", () => {
  const store = new Map();
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true, writable: true,
    value: { getItem: (key) => (store.has(key) ? store.get(key) : null), setItem: (key, value) => store.set(key, String(value)) },
  });
  try {
    const first = workspaceRoot();
    const a = connectTufteWorkspace(first.root, { workspace: mudWorkspace, storageKey: "arrangement" });
    a.arrange({ kind: "resize", path: [], index: 0, boundary: 0.5 });
    a.arrange({ kind: "fullscreen", id: "room" });
    const persisted = a.workspace();
    a.disconnect();
    assert.deepEqual(JSON.parse(store.get("arrangement")), persisted);

    const second = workspaceRoot();
    const b = connectTufteWorkspace(second.root, { workspace: mudWorkspace, storageKey: "arrangement" });
    assert.deepEqual(b.workspace(), persisted, "the stored value wins over the authored one");
    assert.equal(second.grid.getAttribute("data-tufte-fullscreen"), "room");
    assert.equal(second.grid.children.find((child) => child.id === "status").hasAttribute("hidden"), true);
    b.disconnect();
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else delete globalThis.localStorage;
  }
});
