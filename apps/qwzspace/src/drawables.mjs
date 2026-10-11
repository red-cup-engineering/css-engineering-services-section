// drawables — the procedural vector registry. The house runs zero raster image assets and zero asset
// pipeline BY DOCTRINE (see the solitaire service's `cards-svg.mjs`: card art is a handful of SVG
// path strings recolored via CSS custom properties, never a `.png`). This module generalizes that
// exact pattern to a game-agnostic registry: `registerDrawable(name, spec)` stores a small, pure
// vector description; `resolveSprite(name, params)` resolves it (parametrized) into a flat array of
// primitive SHAPE OPS — plain data (circles/rects/polygons/paths, with color/gradient fills), never
// functions, never a canvas, never a `<img>` — so it stays backend-agnostic (Canvas2D today, an
// SVG/DOM or abrash-billboard backend later, per the spatial-backend seam) and trivially serializable
// (a shape-ops array survives `JSON.stringify` round-trip, same as a frameOps() array does).
//
// A `spec.build(params)` function is allowed to be a real JS function (unlike the ops it returns) —
// purity here means "no Math.random, no wall clock, no external state," not "must be JSON itself."
// Two calls with the same params must return the SAME shapes, always — that IS the determinism bar
// (see `tests/prove-drawables.mjs`'s property test), just like `project()`'s own.
//
// "currentColor" — any shape's `fill`/`stroke` may be the literal string "currentColor", meaning
// "substitute the caller's tint at resolve time" (falling back to the drawable's own `defaults.color`
// when no tint was supplied). This is the data-pipeline equivalent of cards-svg's CSS custom
// properties: one vector definition, recolored per instance, never re-exported per theme.

function isPlainObject(v) {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function deepCloneShape(shape) {
  const out = { ...shape };
  if (Array.isArray(shape.points)) out.points = shape.points.map((p) => [...p]);
  if (Array.isArray(shape.ops)) out.ops = shape.ops.map((op) => [...op]);
  if (isPlainObject(shape.fill)) out.fill = { ...shape.fill, stops: (shape.fill.stops ?? []).map((s) => [...s]) };
  if (isPlainObject(shape.stroke)) out.stroke = { ...shape.stroke, stops: (shape.stroke.stops ?? []).map((s) => [...s]) };
  return out;
}

function resolveColorValue(value, tint, fallbackColor) {
  if (value === "currentColor") return tint ?? fallbackColor ?? "#888888";
  if (isPlainObject(value)) {
    // a gradient descriptor: recolor any of ITS stops that are themselves "currentColor".
    return { ...value, stops: (value.stops ?? []).map(([offset, color]) => [offset, color === "currentColor" ? (tint ?? fallbackColor ?? "#888888") : color]) };
  }
  return value;
}

function recolorShape(shape, tint, fallbackColor) {
  const out = deepCloneShape(shape);
  if (out.fill !== undefined) out.fill = resolveColorValue(out.fill, tint, fallbackColor);
  if (out.stroke !== undefined) out.stroke = resolveColorValue(out.stroke, tint, fallbackColor);
  return out;
}

// createDrawableRegistry — an isolated registry instance. The package ships one DEFAULT instance
// (below, pre-seeded with the standard library) for convenience, but tests and multi-theme games
// that want a private, uncontaminated set of names use this directly.
export function createDrawableRegistry() {
  const registry = new Map();

  function register(name, spec) {
    if (typeof name !== "string" || !name) throw new TypeError("drawables: registerDrawable(name, spec) requires a non-empty string name");
    if (!spec || typeof spec.build !== "function") throw new TypeError(`drawables: registerDrawable("${name}", spec) requires spec.build(params) to be a function`);
    registry.set(name, { defaults: isPlainObject(spec.defaults) ? { ...spec.defaults } : {}, build: spec.build });
    return name;
  }
  function get(name) {
    return registry.get(name) ?? null;
  }
  function has(name) {
    return registry.has(name);
  }
  function list() {
    return [...registry.keys()].sort();
  }
  // resolveSprite — pure (given a pure `build`): merges the drawable's own defaults with the caller's
  // params, builds the shape list, then recolors any "currentColor" placeholder with `tint`. Returns
  // a frozen, independent copy every call — the caller may freely mutate what it gets back (it is
  // ALREADY a fresh array), but never sees the registry's own stored shapes.
  function resolveSprite(name, params = {}, tint) {
    const spec = registry.get(name);
    if (!spec) return resolveSprite(MISSING_DRAWABLE_NAME, params, tint ?? "#ff00ff");
    const merged = { ...spec.defaults, ...params };
    const shapes = spec.build(merged) ?? [];
    const fallbackColor = typeof merged.color === "string" ? merged.color : (spec.defaults.color ?? "#888888");
    return shapes.map((shape) => recolorShape(shape, tint, fallbackColor));
  }

  return { register, get, has, list, resolveSprite };
}

const MISSING_DRAWABLE_NAME = "__missing__";
const defaultRegistry = createDrawableRegistry();

// registerDrawable/getDrawable/hasDrawable/listDrawables/resolveSprite — convenience wrappers over
// the package's shared default registry (what every standard-library drawable below registers into,
// and what render-2d.mjs resolves against unless a caller supplies its own registry).
export function registerDrawable(name, spec) {
  return defaultRegistry.register(name, spec);
}
export function getDrawable(name) {
  return defaultRegistry.get(name);
}
export function hasDrawable(name) {
  return defaultRegistry.has(name);
}
export function listDrawables() {
  return defaultRegistry.list();
}
export function resolveSprite(name, params = {}, tint) {
  return defaultRegistry.resolveSprite(name, params, tint);
}
export function getDefaultDrawableRegistry() {
  return defaultRegistry;
}

// === standard library — a small proof set, every one built from primitive shape ops + trig, no
// raster, no randomness (params fully determine the result) =====================================

function regularPolygonPoints(count, radius, rotation = -Math.PI / 2) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const a = rotation + (i / count) * Math.PI * 2;
    points.push([Math.cos(a) * radius, Math.sin(a) * radius]);
  }
  return points;
}

function starPoints(spikes, outerRadius, innerRadius, rotation = -Math.PI / 2) {
  const points = [];
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const a = rotation + i * step;
    points.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return points;
}

// disc — the plain filled circle render-2d already drew for every entry before this pass, offered
// as a registered drawable so a caller can opt an entity INTO the sprite pipeline (tint/scale/
// rotation-aware) without leaving the vocabulary it already understood.
defaultRegistry.register("disc", {
  defaults: { radius: 16, color: "#3b82f6" },
  build: (p) => [{ type: "circle", cx: 0, cy: 0, r: p.radius, fill: "currentColor" }],
});

// chip — a poker-chip-style disc: an outer ring of edge ticks (regular polygon points as tick
// marks) around a plain inner disc, the generic "token" a board/card game reaches for constantly.
defaultRegistry.register("chip", {
  defaults: { radius: 18, tickCount: 10, color: "#dc2626", edgeColor: "#ffffff" },
  build: (p) => {
    const shapes = [{ type: "circle", cx: 0, cy: 0, r: p.radius, fill: "currentColor", stroke: p.edgeColor, lineWidth: 1.5 }];
    for (const [x, y] of regularPolygonPoints(p.tickCount, p.radius * 0.82)) {
      shapes.push({ type: "rect", x: x - 1.5, y: y - 4, w: 3, h: 8, fill: p.edgeColor });
    }
    shapes.push({ type: "circle", cx: 0, cy: 0, r: p.radius * 0.55, fill: "none", stroke: p.edgeColor, lineWidth: 1 });
    return shapes;
  },
});

// card-back — a generic face-down card: rounded rect + inset + lattice, the same silhouette
// cards-svg.mjs already ships for solitaire, generalized here (no suit/rank knowledge) so ANY game
// wanting a face-down card token gets it without depending on a card game's own module.
defaultRegistry.register("card-back", {
  defaults: { width: 48, height: 68, color: "#1e3a8a" },
  build: (p) => {
    const w = p.width;
    const h = p.height;
    const shapes = [
      { type: "rect", x: -w / 2, y: -h / 2, w, h, rx: 5, fill: "currentColor", stroke: "#0b1e4d", lineWidth: 1.5 },
      { type: "rect", x: -w / 2 + 4, y: -h / 2 + 4, w: w - 8, h: h - 8, rx: 3, fill: "none", stroke: "#0b1e4d", lineWidth: 1 },
    ];
    const cols = 4;
    for (let i = 1; i < cols; i++) {
      const x = -w / 2 + 4 + ((w - 8) / cols) * i;
      shapes.push({ type: "line", x1: x, y1: -h / 2 + 5, x2: x, y2: h / 2 - 5, stroke: "#0b1e4d", lineWidth: 0.5 });
    }
    return shapes;
  },
});

// star — an n-pointed star polygon, the classic "achievement/rating/burst" glyph.
defaultRegistry.register("star", {
  defaults: { spikes: 5, outerRadius: 16, innerRadius: 7, color: "#f59e0b" },
  build: (p) => [{ type: "polygon", points: starPoints(p.spikes, p.outerRadius, p.innerRadius), fill: "currentColor", closed: true }],
});

// coin — a disc with an inner ring and a cross-glint highlight, distinct from "chip" (no edge
// ticks) — the stock reward/pickup token for anything from a platformer to a slots celebration.
defaultRegistry.register("coin", {
  defaults: { radius: 14, color: "#facc15", ringColor: "#a16207" },
  build: (p) => [
    { type: "circle", cx: 0, cy: 0, r: p.radius, fill: "currentColor", stroke: p.ringColor, lineWidth: 1.5 },
    { type: "circle", cx: 0, cy: 0, r: p.radius * 0.62, fill: "none", stroke: p.ringColor, lineWidth: 1 },
    { type: "path", ops: [["M", -p.radius * 0.3, -p.radius * 0.3], ["L", p.radius * 0.15, p.radius * 0.15]], stroke: "#ffffff", lineWidth: 1.5 },
  ],
});

// gem — a faceted octagon with two internal facet lines, the generic "valuable" glyph.
defaultRegistry.register("gem", {
  defaults: { radius: 15, color: "#06b6d4", facetColor: "#0e7490" },
  build: (p) => {
    const pts = regularPolygonPoints(8, p.radius, -Math.PI / 8);
    return [
      { type: "polygon", points: pts, fill: "currentColor", stroke: p.facetColor, lineWidth: 1, closed: true },
      { type: "line", x1: pts[0][0], y1: pts[0][1], x2: pts[4][0], y2: pts[4][1], stroke: p.facetColor, lineWidth: 0.75 },
      { type: "line", x1: pts[2][0], y1: pts[2][1], x2: pts[6][0], y2: pts[6][1], stroke: p.facetColor, lineWidth: 0.75 },
    ];
  },
});

// tile — a generic rounded board tile/backdrop panel.
defaultRegistry.register("tile", {
  defaults: { width: 40, height: 40, radius: 6, color: "#e5e7eb" },
  build: (p) => [{ type: "rect", x: -p.width / 2, y: -p.height / 2, w: p.width, h: p.height, rx: p.radius, fill: "currentColor", stroke: "#9ca3af", lineWidth: 1 }],
});

// ring — an unfilled circle outline, used by particles.mjs's "shockwave" preset and generally handy
// wherever a shape needs only an edge (a selection halo, a glow envelope, an expanding pulse).
defaultRegistry.register("ring", {
  defaults: { radius: 16, color: "#ffffff", lineWidth: 2 },
  build: (p) => [{ type: "circle", cx: 0, cy: 0, r: p.radius, fill: "none", stroke: "currentColor", lineWidth: p.lineWidth }],
});

// __missing__ — the escape-hatch placeholder: any `resolveSprite(name, ...)` for an unregistered
// name resolves to this rather than throwing (a render loop should degrade visibly, not crash), a
// small dashed magenta box in the classic "missing asset" idiom.
defaultRegistry.register(MISSING_DRAWABLE_NAME, {
  defaults: { size: 20 },
  build: (p) => [{ type: "rect", x: -p.size / 2, y: -p.size / 2, w: p.size, h: p.size, fill: "none", stroke: "#ff00ff", lineWidth: 2, dash: [4, 3] }],
});
