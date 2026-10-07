import { normalizeTufteModel, findGrid, emitTufteEvent, hasTufteClass, findTufteTile } from "./tufte-browser.mjs";

const record = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};

/**
 * Describe the authored topology TUFTE can guarantee independently of a
 * particular viewport: tile membership, semantic placement, form ownership,
 * and reading-order adjacency. Measured pixel geometry belongs to the browser
 * and is not guessed here.
 */
export function describeTufteTopology(model = {}) {
  const projection = normalizeTufteModel(model);
  const nodes = Object.freeze(projection.tiles.map((tile, index) => Object.freeze({
    id: tile.id,
    index,
    role: tile.role,
    side: tile.side,
    span: tile.span,
    formId: tile.form?.id,
    previousId: projection.tiles[index - 1]?.id ?? null,
    nextId: projection.tiles[index + 1]?.id ?? null,
  })));
  const edges = Object.freeze(nodes.slice(0, -1).map((node, index) => Object.freeze({
    kind: "reading-next",
    from: node.id,
    to: nodes[index + 1].id,
  })));
  return Object.freeze({
    kind: "tufte.topology",
    revision: projection.revision,
    ...(projection.tick !== undefined ? { tick: projection.tick } : {}),
    nodes,
    edges,
  });
}

function result(kind, operation, projection, reason) {
  return Object.freeze({
    kind,
    operation: Object.freeze({ ...operation }),
    ...(reason ? { reason } : {}),
    projection,
    topology: describeTufteTopology(projection),
  });
}

/**
 * Deterministically reduce one user-authored tiling operation into a new
 * projection. Reordering changes both visual source order and the governed
 * reading/tab order; resizing changes the semantic grid span. Invalid input
 * is data (`tufte.topology.refusal`), never an implicit clamp or thrown UI
 * exception.
 */
export function reduceTufteTopology(model = {}, candidate = {}) {
  const projection = normalizeTufteModel(model);
  const operation = record(candidate);
  const id = typeof operation.id === "string" ? operation.id : "";
  const index = projection.tiles.findIndex((tile) => tile.id === id);
  if (index === -1) return result("tufte.topology.refusal", operation, projection, "unknown-tile");

  if (operation.kind === "resize") {
    if (!Number.isInteger(operation.span) || operation.span < 2 || operation.span > 12) {
      return result("tufte.topology.refusal", operation, projection, "invalid-span");
    }
    const tiles = projection.tiles.map((tile) => tile.id === id ? { ...tile, span: operation.span } : tile);
    const next = normalizeTufteModel({ ...projection, tiles });
    return result("tufte.topology.receipt", operation, next);
  }

  if (operation.kind === "move") {
    const afterId = operation.afterId === null ? null : typeof operation.afterId === "string" ? operation.afterId : undefined;
    if (afterId === undefined) return result("tufte.topology.refusal", operation, projection, "invalid-anchor");
    if (afterId === id) return result("tufte.topology.refusal", operation, projection, "self-anchor");
    if (afterId !== null && !projection.tiles.some((tile) => tile.id === afterId)) {
      return result("tufte.topology.refusal", operation, projection, "unknown-anchor");
    }
    const tiles = [...projection.tiles];
    const [tile] = tiles.splice(index, 1);
    const insertionIndex = afterId === null ? 0 : tiles.findIndex((item) => item.id === afterId) + 1;
    tiles.splice(insertionIndex, 0, tile);
    const next = normalizeTufteModel({ ...projection, tiles });
    return result("tufte.topology.receipt", operation, next);
  }

  return result("tufte.topology.refusal", operation, projection, "unsupported-operation");
}

// ---------------------------------------------------------------------------
// Workspace: the split-tree tiling layout -- the tiling-window-manager model
// (i3/bspwm), not a responsive reflow. Pure data: `{kind:"split", direction,
// children, sizes}` nodes whose leaves are `{kind:"pane", tile}` references
// into a projection. DOM-free and deterministic; browser and server renderer
// consume the same geometry, which is what makes the layout server-first.
// ---------------------------------------------------------------------------

/** The smallest share of its parent split any pane may hold. */
export const TUFTE_WORKSPACE_MIN_SHARE = 0.05;

const EPS = 1e-6;

const round6 = (value) => Math.round(value * 1e6) / 1e6;

function normalizeSizes(sizes, count) {
  const raw = Array.isArray(sizes) ? sizes : [];
  let values = [];
  for (let index = 0; index < count; index += 1) {
    const candidate = Number(raw[index]);
    values.push(Number.isFinite(candidate) && candidate > 0 ? candidate : NaN);
  }
  if (values.some(Number.isNaN)) values = values.map(() => 1);
  let total = values.reduce((sum, value) => sum + value, 0);
  values = values.map((value) => value / total);
  const floor = Math.min(TUFTE_WORKSPACE_MIN_SHARE, 1 / count);
  const clamped = values.map((value) => Math.max(floor, value));
  total = clamped.reduce((sum, value) => sum + value, 0);
  return clamped.map((value) => round6(value / total));
}

function normalizeNode(candidate, known, placed) {
  const node = typeof candidate === "string" ? { tile: candidate } : record(candidate);
  if (typeof node.tile === "string") {
    if (!known.has(node.tile) || placed.has(node.tile)) return null;
    placed.add(node.tile);
    return { kind: "pane", tile: node.tile };
  }
  const rawDirection = node.direction ?? node.split;
  const direction = rawDirection === "column" ? "column" : "row";
  const rawChildren = Array.isArray(node.children) ? node.children : [];
  const rawSizes = Array.isArray(node.sizes) ? node.sizes : [];
  const children = [];
  const sizes = [];
  for (const [index, childCandidate] of rawChildren.entries()) {
    const child = normalizeNode(childCandidate, known, placed);
    if (child === null) continue;
    children.push(child);
    sizes.push(rawSizes[index]);
  }
  if (children.length === 0) return null;
  if (children.length === 1) return children[0];
  return { kind: "split", direction, children, sizes: normalizeSizes(sizes, children.length) };
}

function freezeNode(node) {
  if (node.kind === "pane") return Object.freeze({ ...node });
  return Object.freeze({
    kind: "split",
    direction: node.direction,
    children: Object.freeze(node.children.map(freezeNode)),
    sizes: Object.freeze([...node.sizes]),
  });
}

/**
 * Adopt panes with no existing seat as trailing children of `root`, in
 * reading order -- so a tile that arrives unplaced (a fresh projection tile,
 * a tile relocated out of another workspace) is never invisible. Shared by
 * normalizeTufteWorkspace (unplaced-tile adoption) and reduceTufteWorkspaces
 * (move-to-workspace's destination).
 */
function adoptPanes(root, panes) {
  if (!panes.length) return root;
  if (root === null) {
    return panes.length === 1 ? panes[0] : { kind: "split", direction: "column", children: panes, sizes: normalizeSizes([], panes.length) };
  }
  const children = root.kind === "split" && root.direction === "column" ? [...root.children, ...panes] : [root, ...panes];
  const priorSizes = root.kind === "split" && root.direction === "column" ? [...root.sizes] : [1];
  const share = 1 / children.length;
  const priorTotal = 1 - share * panes.length;
  const sizes = [...priorSizes.map((size) => size * priorTotal), ...panes.map(() => share)];
  return { kind: "split", direction: "column", children, sizes: normalizeSizes(sizes, children.length) };
}

/**
 * Normalize an authored workspace against a projection. Every pane names a
 * distinct tile the projection has (first placement wins, unknown drop);
 * empty splits drop, single-child splits collapse; sizes are positive, at
 * least TUFTE_WORKSPACE_MIN_SHARE, and sum to 1 per split; unplaced tiles
 * are adopted as trailing panes in reading order, so a receipt inserting a
 * new tile is never invisible. Absent input yields one reading-order column.
 */
export function normalizeTufteWorkspace(workspace = {}, model = {}) {
  const projection = normalizeTufteModel(model);
  const known = new Set(projection.tiles.map((tile) => tile.id));
  const placed = new Set();
  const input = record(workspace);
  let root = normalizeNode(input.root ?? input, known, placed);
  const unplaced = projection.tiles.map((tile) => tile.id).filter((id) => !placed.has(id));
  if (unplaced.length) {
    root = adoptPanes(root, unplaced.map((tile) => ({ kind: "pane", tile })));
  }
  // Fullscreen is an overlay on the value, never a tree mutation: the split
  // tree underneath is untouched, so `restore` is exact by construction. It
  // only survives normalization while it names a tile the projection has --
  // after adoption every known tile is seated, so membership is the check.
  const fullscreen = typeof input.fullscreen === "string" && root !== null && known.has(input.fullscreen) ? input.fullscreen : null;
  return Object.freeze({
    kind: "tufte.workspace",
    root: root === null ? null : freezeNode(root),
    ...(fullscreen ? { fullscreen } : {}),
  });
}

function walkGeometry(node, rect, path, panes, splitters) {
  if (node.kind === "pane") {
    panes.push({ tile: node.tile, path, rect });
    return;
  }
  const horizontal = node.direction === "row";
  let offset = 0;
  for (const [index, child] of node.children.entries()) {
    const size = node.sizes[index];
    const childRect = horizontal
      ? { x: round6(rect.x + offset * rect.width), y: rect.y, width: round6(size * rect.width), height: rect.height }
      : { x: rect.x, y: round6(rect.y + offset * rect.height), width: rect.width, height: round6(size * rect.height) };
    walkGeometry(child, childRect, [...path, index], panes, splitters);
    offset += size;
    if (index < node.children.length - 1) {
      const before = round6(offset - size);
      splitters.push({
        id: `${path.length ? path.join(".") : "root"}:${index}`,
        path,
        index,
        axis: node.direction,
        boundary: round6(offset),
        min: round6(before + TUFTE_WORKSPACE_MIN_SHARE),
        max: round6(offset + node.sizes[index + 1] - TUFTE_WORKSPACE_MIN_SHARE),
        parentRect: rect,
        rect: horizontal
          ? { x: round6(rect.x + offset * rect.width), y: rect.y, width: 0, height: rect.height }
          : { x: rect.x, y: round6(rect.y + offset * rect.height), width: rect.width, height: 0 },
      });
    }
  }
}

function trackIndex(cuts, value) {
  for (const [index, cut] of cuts.entries()) if (Math.abs(cut - value) < EPS) return index;
  return -1;
}

/**
 * Flatten a workspace into renderable geometry: unit-square rectangles per
 * pane, one shared CSS grid (tracks are the sorted unique cut lines, so any
 * split tree renders as a single flat grid with the tiles' DOM order
 * untouched -- reading order, tab order, and the patch model all hold under
 * arbitrary visual arrangement), and one splitter per interior edge.
 */
export function computeTufteWorkspaceGeometry(workspace = {}, model = {}) {
  const normalized = normalizeTufteWorkspace(workspace, model);
  const panes = [];
  const splitters = [];
  const hidden = [];
  if (normalized.root) walkGeometry(normalized.root, { x: 0, y: 0, width: 1, height: 1 }, [], panes, splitters);
  if (normalized.fullscreen) {
    // One pane takes the whole surface; every other pane is hidden rather
    // than squeezed, and no interior edge remains to resize. The tree (and so
    // every pane's path) is untouched underneath -- the i3/sway fullscreen
    // model, where restore returns the exact prior arrangement.
    const kept = panes.find((pane) => pane.tile === normalized.fullscreen);
    for (const pane of panes) if (pane !== kept) hidden.push(pane.tile);
    panes.length = 0;
    splitters.length = 0;
    panes.push({ tile: kept.tile, path: kept.path, rect: { x: 0, y: 0, width: 1, height: 1 } });
  }
  const xCuts = [0, 1];
  const yCuts = [0, 1];
  for (const pane of panes) {
    for (const cut of [pane.rect.x, round6(pane.rect.x + pane.rect.width)]) {
      if (trackIndex(xCuts, cut) === -1) xCuts.push(cut);
    }
    for (const cut of [pane.rect.y, round6(pane.rect.y + pane.rect.height)]) {
      if (trackIndex(yCuts, cut) === -1) yCuts.push(cut);
    }
  }
  xCuts.sort((a, b) => a - b);
  yCuts.sort((a, b) => a - b);
  const columns = xCuts.slice(1).map((cut, index) => round6(cut - xCuts[index]));
  const rows = yCuts.slice(1).map((cut, index) => round6(cut - yCuts[index]));
  const placedPanes = panes.map((pane) => Object.freeze({
    tile: pane.tile,
    path: Object.freeze([...pane.path]),
    rect: Object.freeze({ ...pane.rect }),
    area: Object.freeze({
      column: Object.freeze([trackIndex(xCuts, pane.rect.x) + 1, trackIndex(xCuts, round6(pane.rect.x + pane.rect.width)) + 1]),
      row: Object.freeze([trackIndex(yCuts, pane.rect.y) + 1, trackIndex(yCuts, round6(pane.rect.y + pane.rect.height)) + 1]),
    }),
  }));
  return Object.freeze({
    kind: "tufte.workspace.geometry",
    workspace: normalized,
    ...(normalized.fullscreen ? { fullscreen: normalized.fullscreen } : {}),
    columns: Object.freeze(columns),
    rows: Object.freeze(rows),
    panes: Object.freeze(placedPanes),
    hidden: Object.freeze(hidden),
    splitters: Object.freeze(splitters.map((splitter) => Object.freeze({
      ...splitter,
      path: Object.freeze([...splitter.path]),
      parentRect: Object.freeze({ ...splitter.parentRect }),
      rect: Object.freeze({ ...splitter.rect }),
    }))),
  });
}

const overlaps = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0) > EPS;

/**
 * Describe the spatial topology a workspace realizes: which panes share a
 * real edge, along which axis. Edges are directed reading-direction pairs
 * (`from` is the left/upper pane) -- exactly what directional keyboard
 * arrangement needs to resolve "the neighbor to my right".
 */
export function describeTufteWorkspace(workspace = {}, model = {}) {
  const projection = normalizeTufteModel(model);
  const geometry = computeTufteWorkspaceGeometry(workspace, model);
  const edges = [];
  for (const a of geometry.panes) {
    for (const b of geometry.panes) {
      if (a === b) continue;
      if (Math.abs(a.rect.x + a.rect.width - b.rect.x) < EPS
        && overlaps(a.rect.y, a.rect.y + a.rect.height, b.rect.y, b.rect.y + b.rect.height)) {
        edges.push({ kind: "adjacent", axis: "row", from: a.tile, to: b.tile });
      }
      if (Math.abs(a.rect.y + a.rect.height - b.rect.y) < EPS
        && overlaps(a.rect.x, a.rect.x + a.rect.width, b.rect.x, b.rect.x + b.rect.width)) {
        edges.push({ kind: "adjacent", axis: "column", from: a.tile, to: b.tile });
      }
    }
  }
  edges.sort((a, b) => a.from === b.from ? (a.to < b.to ? -1 : 1) : (a.from < b.from ? -1 : 1));
  return Object.freeze({
    kind: "tufte.workspace.topology",
    revision: projection.revision,
    workspace: geometry.workspace,
    panes: geometry.panes,
    edges: Object.freeze(edges.map((edge) => Object.freeze(edge))),
  });
}

function nodeAt(root, path) {
  let node = root;
  for (const index of path) {
    if (!node || node.kind !== "split" || !node.children[index]) return null;
    node = node.children[index];
  }
  return node;
}

function rebuildAt(root, path, replace) {
  if (path.length === 0) return replace(root);
  const [head, ...rest] = path;
  return {
    ...root,
    children: root.children.map((child, index) => index === head ? rebuildAt(child, rest, replace) : child),
  };
}

function removePane(node, tile) {
  if (node.kind === "pane") return node.tile === tile ? null : node;
  const children = [];
  const sizes = [];
  for (const [index, child] of node.children.entries()) {
    const kept = removePane(child, tile);
    if (kept === null) continue;
    children.push(kept);
    sizes.push(node.sizes[index]);
  }
  if (children.length === 0) return null;
  if (children.length === 1) return children[0];
  return { ...node, children, sizes: normalizeSizes(sizes, children.length) };
}

function replacePane(node, tile, replacement) {
  if (node.kind === "pane") return node.tile === tile ? replacement : node;
  return { ...node, children: node.children.map((child) => replacePane(child, tile, replacement)) };
}

function paneExists(node, tile) {
  if (!node) return false;
  if (node.kind === "pane") return node.tile === tile;
  return node.children.some((child) => paneExists(child, tile));
}

function workspaceResult(kind, operation, workspace, model, reason) {
  return Object.freeze({
    kind,
    operation: Object.freeze({ ...operation }),
    ...(reason ? { reason } : {}),
    workspace,
    geometry: computeTufteWorkspaceGeometry(workspace, model),
  });
}

const WORKSPACE_EDGES = new Set(["left", "right", "top", "bottom"]);

/**
 * Deterministically reduce one user tiling operation into a new workspace.
 * Three operations cover full arrangement power: `resize` moves one interior
 * boundary within its split (split path + boundary index + new boundary as a
 * fraction of the parent's extent); `swap` exchanges two panes' tiles;
 * `move` re-seats a pane against a named edge of another pane, splitting
 * along the axis the edge implies. Two more cover the fullscreen overlay
 * every reference tiling window manager ships: `fullscreen` collapses one
 * pane to the whole surface (the tree underneath is untouched), `restore`
 * lifts it, reproducing the prior value exactly. Invalid input is a refusal
 * with the same data shape as a receipt, never a clamp or a throw.
 */
export function reduceTufteWorkspace(workspace = {}, model = {}, candidate = {}) {
  const normalized = normalizeTufteWorkspace(workspace, model);
  const operation = record(candidate);
  const root = normalized.root;

  const refuse = (reason) => workspaceResult("tufte.workspace.refusal", operation, normalized, model, reason);
  // Arrangement operations keep whatever fullscreen overlay the value carries
  // (normalization drops it if the tile is gone); only fullscreen/restore set it.
  const accept = (nextRoot, fullscreen = normalized.fullscreen ?? null) => workspaceResult(
    "tufte.workspace.receipt",
    operation,
    normalizeTufteWorkspace({ root: nextRoot, ...(fullscreen ? { fullscreen } : {}) }, model),
    model,
  );

  if (root === null) return refuse("empty-workspace");

  if (operation.kind === "fullscreen") {
    const id = typeof operation.id === "string" ? operation.id : "";
    if (!paneExists(root, id)) return refuse("unknown-tile");
    if (normalized.fullscreen === id) return refuse("already-fullscreen");
    return accept(root, id);
  }

  if (operation.kind === "restore") {
    if (!normalized.fullscreen) return refuse("not-fullscreen");
    return accept(root, null);
  }

  if (operation.kind === "resize") {
    const path = Array.isArray(operation.path) && operation.path.every((index) => Number.isInteger(index) && index >= 0)
      ? operation.path
      : null;
    if (path === null) return refuse("invalid-path");
    const split = nodeAt(root, path);
    if (!split || split.kind !== "split") return refuse("unknown-split");
    const index = operation.index;
    if (!Number.isInteger(index) || index < 0 || index >= split.children.length - 1) return refuse("invalid-index");
    const before = split.sizes.slice(0, index).reduce((sum, value) => sum + value, 0);
    const pairEnd = before + split.sizes[index] + split.sizes[index + 1];
    const boundary = Number(operation.boundary);
    const min = before + TUFTE_WORKSPACE_MIN_SHARE;
    const max = pairEnd - TUFTE_WORKSPACE_MIN_SHARE;
    if (!Number.isFinite(boundary) || boundary < min - EPS || boundary > max + EPS) return refuse("invalid-boundary");
    const clamped = Math.min(max, Math.max(min, boundary));
    const nextRoot = rebuildAt(root, path, (node) => ({
      ...node,
      sizes: node.sizes.map((size, at) => at === index
        ? round6(clamped - before)
        : at === index + 1
        ? round6(pairEnd - clamped)
        : size),
    }));
    return accept(nextRoot);
  }

  if (operation.kind === "swap") {
    const id = typeof operation.id === "string" ? operation.id : "";
    const withId = typeof operation.withId === "string" ? operation.withId : "";
    if (!paneExists(root, id)) return refuse("unknown-tile");
    if (id === withId) return refuse("self-swap");
    if (!paneExists(root, withId)) return refuse("unknown-target");
    const marker = { kind: "pane", tile: " swap" };
    let nextRoot = replacePane(root, id, marker);
    nextRoot = replacePane(nextRoot, withId, { kind: "pane", tile: id });
    nextRoot = replacePane(nextRoot, " swap", { kind: "pane", tile: withId });
    return accept(nextRoot);
  }

  if (operation.kind === "move") {
    const id = typeof operation.id === "string" ? operation.id : "";
    const targetId = typeof operation.targetId === "string" ? operation.targetId : "";
    if (!paneExists(root, id)) return refuse("unknown-tile");
    if (id === targetId) return refuse("self-target");
    if (!paneExists(root, targetId)) return refuse("unknown-target");
    if (!WORKSPACE_EDGES.has(operation.edge)) return refuse("invalid-edge");
    const without = removePane(root, id);
    if (without === null || !paneExists(without, targetId)) return refuse("unknown-target");
    const moved = { kind: "pane", tile: id };
    const target = { kind: "pane", tile: targetId };
    const direction = operation.edge === "left" || operation.edge === "right" ? "row" : "column";
    const children = operation.edge === "left" || operation.edge === "top" ? [moved, target] : [target, moved];
    const nextRoot = replacePane(without, targetId, { kind: "split", direction, children, sizes: [0.5, 0.5] });
    return accept(nextRoot);
  }

  return refuse("unsupported-operation");
}

// ---------------------------------------------------------------------------
// Workspaces: a named, switchable set of workspace split-trees -- the plural
// layer i3/sway/Hyprland/bspwm/xmonad all ship above one arrangement (the
// existing single-tree `tufte.workspace` above stays exactly that: one
// arrangement's layout tree). Every tile in the projection is seated in
// exactly one named workspace across the whole set; `switch` moves the
// active name (creating it if absent, matching i3's `workspace <name>`
// convention); `move` relocates one tile to a named workspace, creating it
// if absent. Still plain, frozen data reduced by pure functions -- DOM-free,
// zero new dependencies, the same receipt-or-refusal grammar as
// reduceTufteWorkspace.
// ---------------------------------------------------------------------------

const DEFAULT_WORKSPACE_NAME = "main";

function workspaceName(value, index) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length ? trimmed : `workspace-${index + 1}`;
}

/** Extract a workspace's node input, accepting a bare node, `{root}`, or a full `TufteWorkspace`. */
function nodeInputOf(candidate) {
  if (typeof candidate === "string") return candidate;
  const input = record(candidate);
  return input.root !== undefined ? input.root : candidate;
}

/**
 * Normalize an authored named set of workspaces against a projection. Every
 * tile is placed in exactly one workspace (first placement across the whole
 * set wins, the same rule normalizeTufteWorkspace applies within one tree);
 * tiles left unplaced are adopted as trailing panes of the active workspace.
 * `active` always names a real entry, defaulting to the first named (or a
 * lone `"main"`, holding the reading-order column, when none is authored).
 */
export function normalizeTufteWorkspaces(set = {}, model = {}) {
  const projection = normalizeTufteModel(model);
  const known = new Set(projection.tiles.map((tile) => tile.id));
  const placed = new Set();
  const input = record(set);
  const rawEntries = record(input.workspaces);
  const names = [];
  const roots = new Map();
  for (const [index, rawName] of Object.keys(rawEntries).entries()) {
    const name = workspaceName(rawName, index);
    if (roots.has(name)) continue;
    names.push(name);
    roots.set(name, normalizeNode(nodeInputOf(rawEntries[rawName]), known, placed));
  }
  if (names.length === 0) {
    names.push(DEFAULT_WORKSPACE_NAME);
    roots.set(DEFAULT_WORKSPACE_NAME, null);
  }
  const active = typeof input.active === "string" && names.includes(input.active) ? input.active : names[0];
  const unplaced = projection.tiles.map((tile) => tile.id).filter((id) => !placed.has(id));
  if (unplaced.length) {
    roots.set(active, adoptPanes(roots.get(active), unplaced.map((tile) => ({ kind: "pane", tile }))));
  }
  const workspaces = {};
  for (const name of names) {
    const root = roots.get(name);
    workspaces[name] = Object.freeze({ kind: "tufte.workspace", root: root === null ? null : freezeNode(root) });
  }
  return Object.freeze({
    kind: "tufte.workspaces",
    active,
    workspaces: Object.freeze(workspaces),
  });
}

function workspacesResult(kind, operation, set, model, reason) {
  const activeWorkspace = set.workspaces[set.active] ?? { root: null };
  return Object.freeze({
    kind,
    operation: Object.freeze({ ...operation }),
    ...(reason ? { reason } : {}),
    workspaceSet: set,
    geometry: computeTufteWorkspaceGeometry(activeWorkspace, model),
  });
}

/**
 * Deterministically reduce one user operation into a new workspace set.
 * `switch` changes the active named workspace, creating it first if absent
 * (i3's `workspace <name>` create-or-switch convention). `move` relocates
 * one tile from whichever workspace currently holds it to a named
 * workspace, creating that workspace if absent and appending the tile as a
 * trailing pane -- the same adoption rule an unplaced tile gets within one
 * workspace. Invalid input is a refusal with the same data shape as a
 * receipt, never a throw.
 */
export function reduceTufteWorkspaces(set = {}, model = {}, candidate = {}) {
  const normalized = normalizeTufteWorkspaces(set, model);
  const operation = record(candidate);

  const refuse = (reason) => workspacesResult("tufte.workspaces.refusal", operation, normalized, model, reason);
  const accept = (workspaces, active) => workspacesResult(
    "tufte.workspaces.receipt",
    operation,
    normalizeTufteWorkspaces({ active, workspaces }, model),
    model,
  );

  if (operation.kind === "switch") {
    if (typeof operation.name !== "string" || !operation.name.trim()) return refuse("invalid-name");
    const name = operation.name.trim();
    const workspaces = { ...normalized.workspaces };
    if (!workspaces[name]) workspaces[name] = { root: null };
    return accept(workspaces, name);
  }

  if (operation.kind === "move") {
    const id = typeof operation.id === "string" ? operation.id : "";
    if (typeof operation.to !== "string" || !operation.to.trim()) return refuse("invalid-target");
    const to = operation.to.trim();
    const from = Object.entries(normalized.workspaces).find(([, workspace]) => paneExists(workspace.root, id))?.[0];
    if (!from) return refuse("unknown-tile");
    if (from === to) return refuse("already-there");
    const workspaces = { ...normalized.workspaces };
    workspaces[from] = { root: removePane(workspaces[from].root, id) };
    const targetRoot = workspaces[to]?.root ?? null;
    workspaces[to] = { root: adoptPanes(targetRoot, [{ kind: "pane", tile: id }]) };
    return accept(workspaces, normalized.active);
  }

  return refuse("unsupported-operation");
}

// ---- Workspace applied to the live DOM ----

const WORKSPACE_TRACK = (size) => `${Math.round(size * 10000) / 10000}fr`;
const WORKSPACE_PCT = (value) => `${Math.round(value * 10000) / 100}%`;

function domTileModel(grid) {
  const tiles = [];
  for (const child of grid?.children ?? []) {
    if (hasTufteClass(child, "tufte-tile") && child.id) tiles.push({ id: child.id });
  }
  return { tiles };
}

/**
 * Realize a workspace on the live grid: set the shared track template, place
 * each tile by grid-area, and reconcile one splitter element per interior
 * edge (WAI-ARIA window-splitter semantics). The DOM order of tiles is never
 * touched -- reading order, tab order, and the patch model stay intact under
 * any arrangement. Idempotent; safe to call after every patch.
 */
export function applyTufteWorkspace(root, workspace = {}) {
  const grid = findGrid(root);
  if (!grid) return null;
  const ownerDocument = grid.ownerDocument ?? root?.ownerDocument ?? globalThis.document;
  const geometry = computeTufteWorkspaceGeometry(workspace, domTileModel(grid));
  grid.classList?.add?.("tufte-workspace");
  grid.setAttribute("data-tufte-workspace", JSON.stringify(geometry.workspace));
  grid.style?.setProperty?.("grid-template-columns", geometry.columns.map(WORKSPACE_TRACK).join(" "));
  grid.style?.setProperty?.("grid-template-rows", geometry.rows.map(WORKSPACE_TRACK).join(" "));
  const areaFor = new Map(geometry.panes.map((pane) => [pane.tile, pane.area]));
  const hiddenTiles = new Set(geometry.hidden);
  for (const child of grid.children ?? []) {
    if (!hasTufteClass(child, "tufte-tile")) continue;
    const area = areaFor.get(child.id);
    if (area) child.style?.setProperty?.("grid-area", `${area.row[0]} / ${area.column[0]} / ${area.row[1]} / ${area.column[1]}`);
    // The `hidden` attribute (not a class) so assistive technology skips a
    // pane fullscreen has covered, the same way it is skipped visually.
    if (hiddenTiles.has(child.id)) child.setAttribute("hidden", "");
    else child.removeAttribute?.("hidden");
  }
  if (geometry.fullscreen) grid.setAttribute("data-tufte-fullscreen", geometry.fullscreen);
  else grid.removeAttribute?.("data-tufte-fullscreen");
  const existing = new Map();
  for (const element of grid.querySelectorAll?.(".tufte-splitter") ?? []) {
    existing.set(element.getAttribute?.("data-tufte-splitter"), element);
  }
  for (const splitter of geometry.splitters) {
    let element = existing.get(splitter.id);
    if (element) existing.delete(splitter.id);
    else {
      element = ownerDocument.createElement("div");
      element.className = "tufte-splitter";
      element.setAttribute("role", "separator");
      element.setAttribute("tabindex", "0");
      element.setAttribute("aria-label", "Resize panes");
      element.setAttribute("data-tufte-splitter", splitter.id);
      grid.appendChild(element);
    }
    const vertical = splitter.axis === "row";
    element.setAttribute("aria-orientation", vertical ? "vertical" : "horizontal");
    element.setAttribute("aria-valuemin", String(Math.round(splitter.min * 100)));
    element.setAttribute("aria-valuemax", String(Math.round(splitter.max * 100)));
    element.setAttribute("aria-valuenow", String(Math.round(splitter.boundary * 100)));
    element.style?.setProperty?.("left", WORKSPACE_PCT(splitter.rect.x));
    element.style?.setProperty?.("top", WORKSPACE_PCT(splitter.rect.y));
    element.style?.setProperty?.("height", vertical ? WORKSPACE_PCT(splitter.rect.height) : "");
    element.style?.setProperty?.("width", vertical ? "" : WORKSPACE_PCT(splitter.rect.width));
  }
  for (const element of existing.values()) element.remove?.();
  return Object.freeze({ workspace: geometry.workspace, geometry });
}

const WORKSPACE_RESIZE_STEP = 0.025;
const ARROW_DIRECTIONS = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };

/** Resolve `tileId`'s spatial neighbor along `direction` from a workspace topology's directed adjacency edges. */
function neighborTile(topology, tileId, direction) {
  return direction === "right" ? topology.edges.find((edge) => edge.axis === "row" && edge.from === tileId)?.to
    : direction === "left" ? topology.edges.find((edge) => edge.axis === "row" && edge.to === tileId)?.from
    : direction === "down" ? topology.edges.find((edge) => edge.axis === "column" && edge.from === tileId)?.to
    : topology.edges.find((edge) => edge.axis === "column" && edge.to === tileId)?.from;
}

// ---- Workspace history: undo/redo over workspace values ----

/**
 * A bounded undo/redo history of workspace values. Because an arrangement is
 * a plain frozen value produced by pure reducers, undo is not a reverse
 * operation to compute: it is the prior value, re-applied through the same
 * `applyTufteWorkspace` path a fresh render or a persisted arrangement uses.
 * DOM-free, so a server or a test can drive it directly.
 */
export function createTufteWorkspaceHistory(options = {}) {
  const settings = record(options);
  const limit = Number.isInteger(settings.limit) && settings.limit > 0 ? settings.limit : 50;
  const past = [];
  const future = [];
  return Object.freeze({
    /** Record the value being left behind by an accepted change; clears redo. */
    record(workspace) {
      past.push(workspace);
      while (past.length > limit) past.shift();
      future.length = 0;
    },
    /** The value to return to, or null; `current` becomes redo-able. */
    undo(current) {
      if (!past.length) return null;
      future.push(current);
      return past.pop();
    },
    /** The value to advance to, or null; `current` becomes undo-able again. */
    redo(current) {
      if (!future.length) return null;
      past.push(current);
      return future.pop();
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    clear() { past.length = 0; future.length = 0; },
    depth: () => Object.freeze({ past: past.length, future: future.length }),
  });
}

/**
 * Connect user-driven tiling: pointer drag on splitters, arrow-key resize on
 * a focused splitter (Home/End to the extremes), and, from inside any tile,
 * the incumbents' own focus/move modifier split -- Alt+Arrow moves DOM focus
 * to the spatial neighbor without touching the workspace (i3/sway/Hyprland's
 * plain `focus <dir>`), Alt+Shift+Arrow swaps the tile with that neighbor,
 * Alt+F toggles the tile fullscreen (i3's `$mod+f`), Alt+Z undoes the last
 * arrangement change and Alt+Shift+Z redoes it (a pointer drag is one step).
 * Every arrangement-changing gesture routes through reduceTufteWorkspace, so
 * each change is a receipt (or refusal) emitted as a `tufte:workspace` event
 * -- inspectable, persistable data; focus movement changes no data and emits
 * no event. `options.storageKey` opts into localStorage persistence of the
 * arrangement; `options.history` (default on, `{limit}`; `false` disables)
 * bounds the undo history.
 */
export function connectTufteWorkspace(root = globalThis.document?.querySelector?.("[data-tufte]"), options = {}) {
  const settings = record(options);
  const grid = findGrid(root);
  if (!root || !grid) return Object.freeze({ disconnect() {} });
  const storageKey = typeof settings.storageKey === "string" ? settings.storageKey : "";
  const storage = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };

  let workspace = settings.workspace ?? null;
  if (!workspace) {
    const attribute = grid.getAttribute?.("data-tufte-workspace");
    if (attribute) { try { workspace = JSON.parse(attribute); } catch { workspace = null; } }
  }
  if (storageKey) {
    let stored = null;
    try { stored = storage()?.getItem?.(storageKey) ?? null; } catch { stored = null; }
    if (stored) { try { workspace = JSON.parse(stored); } catch { /* a corrupt stored arrangement falls back to the authored one */ } }
  }

  let state = applyTufteWorkspace(root, workspace ?? {});
  workspace = state?.workspace ?? null;
  const history = settings.history === false ? null : createTufteWorkspaceHistory(record(settings.history));

  const persist = () => {
    if (!storageKey || !workspace) return;
    try { storage()?.setItem?.(storageKey, JSON.stringify(workspace)); } catch { /* storage denied: arrangement stays session-local */ }
  };

  // Every accepted value -- from a gesture, undo, or redo -- lands through
  // this one path: the same apply a fresh page load or a persisted
  // arrangement takes. That is what makes undo a replay of a value, not a
  // second implementation of each operation in reverse.
  const commit = (result) => {
    workspace = result.workspace;
    state = applyTufteWorkspace(root, workspace);
    persist();
    settings.onArrange?.(result);
  };

  // `remember` is false only mid-drag: a pointer drag is many resize
  // receipts but one gesture, so one undo step (recorded on pointerup).
  const arrange = (operation, remember = true) => {
    const before = workspace;
    const result = reduceTufteWorkspace(workspace ?? {}, domTileModel(grid), operation);
    if (result.kind === "tufte.workspace.receipt") {
      if (remember) history?.record(before);
      commit(result);
    }
    emitTufteEvent(grid, "tufte:workspace", result);
    return result;
  };

  const travel = (kind) => {
    const model = domTileModel(grid);
    const operation = { kind };
    const target = history ? (kind === "undo" ? history.undo(workspace) : history.redo(workspace)) : null;
    const result = target
      ? workspaceResult("tufte.workspace.receipt", operation, normalizeTufteWorkspace(target, model), model)
      : workspaceResult("tufte.workspace.refusal", operation, normalizeTufteWorkspace(workspace ?? {}, model), model, history ? `nothing-to-${kind}` : "history-disabled");
    if (result.kind === "tufte.workspace.receipt") commit(result);
    emitTufteEvent(grid, "tufte:workspace", result);
    return result;
  };

  const splitterFor = (element) => {
    const id = element?.getAttribute?.("data-tufte-splitter");
    return state?.geometry.splitters.find((splitter) => splitter.id === id) ?? null;
  };

  const onKeydown = (event) => {
    const splitterElement = event.target?.closest?.(".tufte-splitter");
    if (splitterElement && root.contains(splitterElement)) {
      const splitter = splitterFor(splitterElement);
      if (!splitter) return;
      const vertical = splitter.axis === "row";
      let boundary = null;
      if (event.key === "Home") boundary = splitter.min;
      else if (event.key === "End") boundary = splitter.max;
      else if (event.key === (vertical ? "ArrowLeft" : "ArrowUp")) boundary = splitter.boundary - WORKSPACE_RESIZE_STEP;
      else if (event.key === (vertical ? "ArrowRight" : "ArrowDown")) boundary = splitter.boundary + WORKSPACE_RESIZE_STEP;
      if (boundary === null) return;
      event.preventDefault?.();
      arrange({ kind: "resize", path: [...splitter.path], index: splitter.index, boundary: Math.min(splitter.max, Math.max(splitter.min, boundary)) });
      return;
    }
    if (!event.altKey) return;
    const key = String(event.key ?? "").toLowerCase();
    if (key === "z") {
      event.preventDefault?.();
      travel(event.shiftKey ? "redo" : "undo");
      return;
    }
    const tile = event.target?.closest?.(".tufte-tile");
    if (!tile || !root.contains(tile) || !tile.id) return;
    if (key === "f") {
      event.preventDefault?.();
      arrange(workspace?.fullscreen === tile.id ? { kind: "restore" } : { kind: "fullscreen", id: tile.id });
      return;
    }
    const direction = ARROW_DIRECTIONS[event.key];
    if (!direction) return;
    const topology = describeTufteWorkspace(workspace ?? {}, domTileModel(grid));
    const neighbor = neighborTile(topology, tile.id, direction);
    if (!neighbor) return;
    event.preventDefault?.();
    if (event.shiftKey) {
      arrange({ kind: "swap", id: tile.id, withId: neighbor });
      return;
    }
    findTufteTile(grid, neighbor)?.focus?.();
  };

  let drag = null;
  const onPointerDown = (event) => {
    const element = event.target?.closest?.(".tufte-splitter");
    if (!element || !root.contains(element)) return;
    const splitter = splitterFor(element);
    if (!splitter || typeof grid.getBoundingClientRect !== "function") return;
    event.preventDefault?.();
    element.setPointerCapture?.(event.pointerId);
    drag = { splitter, gridRect: grid.getBoundingClientRect(), before: workspace };
  };
  const onPointerMove = (event) => {
    if (!drag) return;
    const { splitter, gridRect } = drag;
    const vertical = splitter.axis === "row";
    const start = vertical ? gridRect.left + splitter.parentRect.x * gridRect.width : gridRect.top + splitter.parentRect.y * gridRect.height;
    const extent = vertical ? splitter.parentRect.width * gridRect.width : splitter.parentRect.height * gridRect.height;
    if (!(extent > 0)) return;
    const pointer = vertical ? event.clientX : event.clientY;
    const boundary = Math.min(splitter.max, Math.max(splitter.min, (pointer - start) / extent));
    const result = arrange({ kind: "resize", path: [...splitter.path], index: splitter.index, boundary }, false);
    if (result.kind === "tufte.workspace.receipt") {
      const next = state?.geometry.splitters.find((candidate) => candidate.id === splitter.id);
      if (next) drag = { ...drag, splitter: next, gridRect };
    }
  };
  const onPointerUp = () => {
    if (drag && drag.before !== workspace) history?.record(drag.before);
    drag = null;
  };

  grid.addEventListener("keydown", onKeydown);
  grid.addEventListener("pointerdown", onPointerDown);
  grid.addEventListener("pointermove", onPointerMove);
  grid.addEventListener("pointerup", onPointerUp);
  grid.addEventListener("pointercancel", onPointerUp);

  return Object.freeze({
    arrange,
    undo: () => travel("undo"),
    redo: () => travel("redo"),
    history: () => history?.depth() ?? null,
    refresh() {
      state = applyTufteWorkspace(root, workspace ?? {});
      workspace = state?.workspace ?? workspace;
      return state;
    },
    workspace: () => workspace,
    topology: () => describeTufteWorkspace(workspace ?? {}, domTileModel(grid)),
    disconnect() {
      grid.removeEventListener("keydown", onKeydown);
      grid.removeEventListener("pointerdown", onPointerDown);
      grid.removeEventListener("pointermove", onPointerMove);
      grid.removeEventListener("pointerup", onPointerUp);
      grid.removeEventListener("pointercancel", onPointerUp);
    },
  });
}
