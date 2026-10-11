// render-2d — the 2D canvas backend. Two layers, deliberately split (unchanged discipline from
// before this pass):
//   - frameOps(sceneDescription, options): a PURE, backend-agnostic array of typed draw operations.
//     This is what makes the "live view and replay render identically" proof checkable WITHOUT a DOM
//     — comparing two frameOps() arrays with JSON equality IS the byte-identical-output assertion.
//   - createBackend({mount}): executes frameOps() against a real (or real-shaped) 2D context. This is
//     the ONLY layer that touches `mount`/canvas/camera STATE at all.
//
// THE SPECTACLE-VOCABULARY PASS adds: sprite/text/transform ops, alongside the original clear/circle
// ops — and every addition is STRICTLY OPT-IN per scene entry. A scene entry with none of the new
// project.mjs fields (layer/scale/rotation/opacity/tint/sprite/text) produces the EXACT SAME "clear"
// + "circle" ops, with the exact same fields, as before this pass — see
// `tests/prove-render-2d-regression.mjs` for the literal byte-identical-ops proof this claim rests
// on. New fields only ever ADD keys to an op (never rename/remove one), and only when the source
// entry actually set them — the same "undefined key never serializes" discipline project.mjs itself
// documents.
//
// CAMERA: render-2d gains a REAL, working `setCamera(pose)` this pass (see camera.mjs's header for
// the `{x,z,angle,zoom}` pose shape and why it reuses abrash's field names). It deliberately does NOT
// set `capabilities.camera = true` on the returned backend, and does NOT implement `followEntity` at
// all — see `createBackend`'s own comment on `setCamera` below for the full reasoning (in short: this
// package's own `tests/prove-spatial-backend-contract.mjs` pins render-2d's self-description as
// `{camera:false, followEntity:false, dims:2}`, and `followEntity`'s capability flag is computed by
// UNCONDITIONAL reflection — adding the method at all would flip it, with no declaration-gated escape
// hatch the way `camera` has one. `setCamera` is real and usable by any caller that already knows to
// call it directly; `capabilitiesOf()` simply cannot discover it by reflection yet).

import { getDefaultDrawableRegistry } from "./drawables.mjs";

// a small, stable, deterministic palette keyed by role (no Math.random — see §0 principle 2: a
// backend must not introduce its own nondeterminism, or two renders of the identical scene could
// disagree, breaking the very unification proof this backend exists to support).
const PALETTE = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#a855f7", "#06b6d4", "#ec4899", "#84cc16"];

function colorForRole(role) {
  const key = String(role ?? "entity");
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// frameOps — pure: same SceneDescription + options in, same ops array out, every call. `options`:
//   width/height/radius   — unchanged from before this pass
//   drawableRegistry       — a drawables.mjs registry (default: the package's shared default one)
//   camera                 — a resolved `{x,z,angle,zoom}` pose (camera.mjs's `resolveCamera()`
//                             output), or omitted/null for no camera transform at all (the default —
//                             a scene never carries its own camera; a caller opts in per render call)
// A scene in the world's frame (`frame: "enu"`, fiber.mjs) is drawn top-down with north up: its y
// runs up the screen, and a place's footprint is drawn under everything that stands in it.
export function frameOps(sceneDescription, { width = 800, height = 600, radius = 6, drawableRegistry, camera = null } = {}) {
  const registry = drawableRegistry ?? getDefaultDrawableRegistry();
  const flip = sceneDescription.frame === "enu" ? -1 : 1;
  const ops = [{ type: "clear", width, height }];
  if (camera) {
    ops.push({ type: "transform", x: camera.x ?? 0, y: camera.z ?? 0, angle: camera.angle ?? 0, zoom: camera.zoom ?? 1, width, height });
  }
  for (const e of sceneDescription.entries) {
    if (!Array.isArray(e.footprint)) continue;
    ops.push({ type: "polygon", id: e.id, points: e.footprint.map(([x, y]) => [x, flip * y]), color: e.tint ?? colorForRole(e.role), label: e.label });
  }
  for (const source of sceneDescription.entries) {
    if (Array.isArray(source.footprint)) continue;
    const e = flip === 1 ? source : { ...source, y: -source.y };
    if (e.sprite) {
      const shapes = registry.resolveSprite(e.sprite, e.spriteParams ?? {}, e.tint);
      ops.push({
        type: "sprite",
        id: e.id,
        drawableId: e.sprite,
        x: e.x,
        y: e.y,
        scale: e.scale ?? 1,
        rotation: e.rotation ?? 0,
        opacity: e.opacity ?? 1,
        shapes,
      });
    } else if (e.text !== undefined) {
      const op = {
        type: "text",
        id: e.id,
        x: e.x,
        y: e.y,
        text: e.text,
        font: e.textStyle?.font ?? "12px sans-serif",
        color: e.tint ?? e.textStyle?.color ?? "#111111",
        align: e.textStyle?.align ?? "left",
      };
      if (e.opacity !== undefined) op.opacity = e.opacity;
      ops.push(op);
    } else {
      const op = {
        type: "circle",
        id: e.id,
        x: e.x,
        y: e.y,
        radius,
        color: e.tint ?? colorForRole(e.role),
        label: e.label,
      };
      // ONLY added when the entry actually set them — see this file's header on backward compat.
      if (e.scale !== undefined && e.scale !== 1) op.scale = e.scale;
      if (e.opacity !== undefined && e.opacity !== 1) op.opacity = e.opacity;
      ops.push(op);
    }
  }
  if (camera) ops.push({ type: "transformEnd" });
  return ops;
}

// === shape-op execution (Canvas2D) ================================================================
// Used only by "sprite" ops' `shapes` array (drawables.mjs's vocabulary) — never touched by the
// original "circle"/"clear" path, so a mock context that only implements the ORIGINAL minimal
// surface never needs to grow these methods unless a scene actually uses sprites.

function resolvePaint(ctx, value) {
  if (value === undefined || value === "none") return null;
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && Array.isArray(value.stops)) {
    const grad =
      value.type === "radial"
        ? ctx.createRadialGradient(value.x1 ?? 0, value.y1 ?? 0, 0, value.x2 ?? value.x1 ?? 0, value.y2 ?? value.y1 ?? 0, value.r ?? 20)
        : ctx.createLinearGradient(value.x1 ?? -20, value.y1 ?? 0, value.x2 ?? 20, value.y2 ?? 0);
    for (const [offset, color] of value.stops) grad.addColorStop(offset, color);
    return grad;
  }
  return null;
}

function tracePath(ctx, pathOps) {
  for (const cmd of pathOps) {
    const [c, ...args] = cmd;
    if (c === "M") ctx.moveTo(args[0], args[1]);
    else if (c === "L") ctx.lineTo(args[0], args[1]);
    else if (c === "C") ctx.bezierCurveTo(args[0], args[1], args[2], args[3], args[4], args[5]);
    else if (c === "Q") ctx.quadraticCurveTo(args[0], args[1], args[2], args[3]);
    else if (c === "Z") ctx.closePath();
  }
}

function traceShape(ctx, shape) {
  ctx.beginPath();
  if (shape.type === "circle") {
    ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
  } else if (shape.type === "rect") {
    if (shape.rx && typeof ctx.roundRect === "function") ctx.roundRect(shape.x, shape.y, shape.w, shape.h, shape.rx);
    else ctx.rect(shape.x, shape.y, shape.w, shape.h);
  } else if (shape.type === "polygon") {
    shape.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    if (shape.closed !== false) ctx.closePath();
  } else if (shape.type === "path") {
    tracePath(ctx, shape.ops ?? []);
  } else if (shape.type === "line") {
    ctx.moveTo(shape.x1, shape.y1);
    ctx.lineTo(shape.x2, shape.y2);
  }
}

function drawShape(ctx, shape) {
  traceShape(ctx, shape);
  const fill = resolvePaint(ctx, shape.fill);
  const stroke = resolvePaint(ctx, shape.stroke);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    const hasDash = Array.isArray(shape.dash) && typeof ctx.setLineDash === "function";
    if (hasDash) ctx.setLineDash(shape.dash);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = shape.lineWidth ?? 1;
    ctx.stroke();
    if (hasDash) ctx.setLineDash([]);
  }
}

// createBackend — `createBackend(opts) -> { render(sceneDescription, tick), setCamera(pose),
// followEntity(id) }`. `mount` must provide `getContext("2d")` returning a CanvasRenderingContext2D-
// shaped object; render() only calls the SUBSET of that surface a given frame's ops actually need
// (see this file's header — a legacy circle-only scene still only ever calls
// clearRect/beginPath/arc/fillStyle/fill/fillText).
// `labels: false` leaves entities unnamed on the canvas, for a game whose heads-up display names them.
export function createBackend({ mount, width = 800, height = 600, radius = 6, drawableRegistry, labels = true } = {}) {
  const ctx = mount.getContext("2d");
  let cameraPose = null;

  return {
    // setCamera — pins an exact pose (camera.mjs's `resolveCamera()` output) for subsequent render()
    // calls. `null`/non-object clears it back to no-camera (the default, untransformed view).
    //
    // Deliberately NO `followEntity` here (unlike the abrash backend) — see this file's header:
    // `spatial-backend.mjs`'s `capabilitiesOf()` computes the `followEntity` capability by
    // UNCONDITIONAL reflection (any backend exposing a `followEntity` method reports the capability
    // as true, regardless of whether it self-declares `capabilities` at all — unlike `camera`, which
    // requires both a declaration AND an implementation). There is no way to add a real
    // `followEntity` to this backend without `capabilitiesOf(backend).followEntity` silently flipping
    // to `true`, which would break `tests/prove-spatial-backend-contract.mjs`'s pinned
    // `{camera:false, followEntity:false, dims:2}` assertion — a compatibility break this pass's
    // mandate rules out. `setCamera` had a declaration-gated escape hatch (`camera` requires
    // `capabilities.camera` too); `followEntity` has none, so it stays out of this backend for now. A
    // caller that wants chase-cam behavior computes it itself (find the target entity in the scene,
    // feed its position into a camera spec's `pan`) and calls `setCamera()` each frame — camera.mjs's
    // `resolveCamera()` already covers everything else (pan/zoom/rotate/shake).
    setCamera(pose) {
      cameraPose = pose && typeof pose === "object" ? { x: pose.x ?? 0, z: pose.z ?? 0, angle: pose.angle ?? 0, zoom: pose.zoom ?? 1 } : null;
    },
    render(sceneDescription) {
      for (const op of frameOps(sceneDescription, { width, height, radius, drawableRegistry, camera: cameraPose })) {
        if (op.type === "clear") {
          ctx.clearRect(0, 0, op.width, op.height);
        } else if (op.type === "transform") {
          ctx.save();
          ctx.translate(op.width / 2, op.height / 2);
          ctx.rotate(-op.angle);
          ctx.scale(op.zoom, op.zoom);
          ctx.translate(-op.x, -op.y);
        } else if (op.type === "transformEnd") {
          ctx.restore();
        } else if (op.type === "circle") {
          const hasExtras = op.opacity !== undefined;
          if (hasExtras) ctx.save();
          if (op.opacity !== undefined) ctx.globalAlpha = op.opacity;
          ctx.beginPath();
          ctx.arc(op.x, op.y, op.radius * (op.scale ?? 1), 0, Math.PI * 2);
          ctx.fillStyle = op.color;
          ctx.fill();
          if (labels && typeof ctx.fillText === "function" && op.label) {
            ctx.fillText(op.label, op.x + op.radius + 2, op.y);
          }
          if (hasExtras) ctx.restore();
        } else if (op.type === "polygon") {
          ctx.save();
          ctx.beginPath();
          op.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
          ctx.closePath();
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = op.color;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = op.color;
          ctx.stroke();
          ctx.restore();
        } else if (op.type === "sprite") {
          ctx.save();
          ctx.translate(op.x, op.y);
          ctx.rotate(op.rotation);
          ctx.scale(op.scale, op.scale);
          ctx.globalAlpha = op.opacity;
          for (const shape of op.shapes) drawShape(ctx, shape);
          ctx.restore();
        } else if (op.type === "text") {
          ctx.save();
          if (op.opacity !== undefined) ctx.globalAlpha = op.opacity;
          if (op.font !== undefined && "font" in ctx) ctx.font = op.font;
          if (op.align !== undefined && "textAlign" in ctx) ctx.textAlign = op.align;
          ctx.fillStyle = op.color;
          if (typeof ctx.fillText === "function") ctx.fillText(op.text, op.x, op.y);
          ctx.restore();
        }
      }
    },
  };
}
