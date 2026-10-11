// prove-tween — presentation-effect easing: determinism, the "both present" blend, enter/exit, and
// the explicit "this module never touches x/y/z/yaw" boundary tween.mjs's header commits to.

import { ok, eq, done } from "./_harness.mjs";
import { interpolateScene, applyPositions, easingFn, listEasings, lerpColor } from "../src/tween.mjs";
import { test } from "node:test";

function scene(tick, entries) {
  return { tick, entries, version: 2 };
}

test("prove-tween", async () => {

// === easing library sanity ==========================================================================
for (const name of listEasings()) {
  ok(Math.abs(easingFn(name)(0)) < 1e-9, `${name}(0) === 0`);
  ok(Math.abs(easingFn(name)(1) - 1) < 1e-9, `${name}(1) === 1`);
}
eq(easingFn("linear")(0.5), 0.5, "linear(0.5) === 0.5");
eq(easingFn("does-not-exist")(0.5), 0.5, "an unknown easing name falls back to linear");

// === determinism: same inputs, identical output, every call ======================================
{
  const a = scene(1, [{ id: "e1", x: 0, y: 0, z: 0, yaw: 0, kind: "k", role: "k", label: "e1", scale: 1, opacity: 1 }]);
  const b = scene(2, [{ id: "e1", x: 10, y: 0, z: 0, yaw: 0, kind: "k", role: "k", label: "e1", scale: 2, opacity: 0.5 }]);
  const r1 = interpolateScene(a, b, 0.5, { easing: "linear" });
  const r2 = interpolateScene(a, b, 0.5, { easing: "linear" });
  eq(r1, r2, "interpolateScene is a pure function of its arguments");
}

// === position (x/y/z/yaw) is NEVER computed here — passed through from nextScene =================
{
  const a = scene(1, [{ id: "e1", x: 0, y: 0, z: 0, yaw: 0, kind: "k", role: "k", label: "e1" }]);
  const b = scene(2, [{ id: "e1", x: 99, y: 42, z: 7, yaw: 1.5, kind: "k", role: "k", label: "e1" }]);
  const mid = interpolateScene(a, b, 0.5);
  const e1 = mid.entries[0];
  eq([e1.x, e1.y, e1.z, e1.yaw], [99, 42, 7, 1.5], "position fields come straight from nextScene, never averaged");
}

// === scale/rotation/opacity DO blend, using the requested easing =================================
{
  const a = scene(1, [{ id: "e1", x: 0, y: 0, z: 0, yaw: 0, kind: "k", role: "k", label: "e1", scale: 0, rotation: 0, opacity: 0 }]);
  const b = scene(2, [{ id: "e1", x: 0, y: 0, z: 0, yaw: 0, kind: "k", role: "k", label: "e1", scale: 2, rotation: 4, opacity: 1 }]);
  const mid = interpolateScene(a, b, 0.5, { easing: "linear" }).entries[0];
  eq(mid.scale, 1, "scale blends linearly at alpha=0.5");
  eq(mid.rotation, 2, "rotation blends linearly at alpha=0.5");
  eq(mid.opacity, 0.5, "opacity blends linearly at alpha=0.5");
}

// per-entity easing override wins over the global default.
{
  const a = scene(1, [{ id: "e1", x: 0, y: 0, z: 0, yaw: 0, kind: "k", role: "k", label: "e1", scale: 0 }]);
  const b = scene(2, [{ id: "e1", x: 0, y: 0, z: 0, yaw: 0, kind: "k", role: "k", label: "e1", scale: 1 }]);
  const withOverride = interpolateScene(a, b, 0.5, { easing: "linear", perEntityEasing: { e1: "easeInCubic" } }).entries[0];
  eq(withOverride.scale, easingFn("easeInCubic")(0.5), "perEntityEasing overrides the default easing for that one entity");
}

// === tint blends via hex color lerp, discretely switches for non-hex values ======================
{
  eq(lerpColor("#000000", "#ffffff", 0.5), "#808080", "hex tint colors blend numerically");
  eq(lerpColor("red", "blue", 0.2), "red", "non-hex colors fall back to a discrete switch before the midpoint");
  eq(lerpColor("red", "blue", 0.8), "blue", "non-hex colors fall back to a discrete switch after the midpoint");
}

// === enter: an entity present only in nextScene animates in from opts.enter.from =================
{
  const a = scene(1, []);
  const b = scene(2, [{ id: "new1", x: 5, y: 5, z: 0, yaw: 0, kind: "k", role: "k", label: "new1", scale: 1, opacity: 1 }]);
  const start = interpolateScene(a, b, 0, { enter: { from: { scale: 0, opacity: 0 } } }).entries[0];
  eq([start.scale, start.opacity], [0, 0], "at alpha=0, an entering entity starts fully at opts.enter.from");
  const end = interpolateScene(a, b, 1, { enter: { from: { scale: 0, opacity: 0 } } }).entries[0];
  eq([end.scale, end.opacity], [1, 1], "at alpha=1, an entering entity reaches its real target values");
}

// === exit: an entity present only in prevScene fades out and is DROPPED once alpha reaches 1 =====
{
  const a = scene(1, [{ id: "gone1", x: 5, y: 5, z: 0, yaw: 0, kind: "k", role: "k", label: "gone1", scale: 1, opacity: 1 }]);
  const b = scene(2, []);
  const start = interpolateScene(a, b, 0, {}).entries[0];
  eq([start.scale, start.opacity], [1, 1], "at alpha=0, an exiting entity is still fully visible");
  const mid = interpolateScene(a, b, 0.5, {}).entries[0];
  ok(mid.opacity < 1 && mid.opacity > 0, "midway through its exit, opacity is between the start and opts.exit.to defaults");
  const end = interpolateScene(a, b, 1, {});
  eq(end.entries.length, 0, "once alpha reaches 1, the exited entity is dropped from the scene entirely");
}

// === sceneEquals-style ordering: output is sorted the same way project() sorts ====================
{
  const a = scene(1, [
    { id: "z9", x: 0, y: 0, z: 0, yaw: 0, kind: "k", role: "k", label: "z9" },
    { id: "a1", x: 0, y: 0, z: 0, yaw: 0, kind: "k", role: "k", label: "a1" },
  ]);
  const b = scene(2, [
    { id: "z9", x: 0, y: 0, z: 0, yaw: 0, kind: "k", role: "k", label: "z9" },
    { id: "a1", x: 0, y: 0, z: 0, yaw: 0, kind: "k", role: "k", label: "a1" },
  ]);
  const out = interpolateScene(a, b, 0.5);
  eq(out.entries.map((e) => e.id), ["a1", "z9"], "interpolateScene sorts its output by id, same as project()");
}

// === applyPositions — the explicit composition seam with buffer-sampled positions =================
{
  const presented = scene(2, [{ id: "e1", x: 1, y: 1, z: 0, yaw: 0, kind: "k", role: "k", label: "e1", scale: 1.4, opacity: 0.8 }]);
  const before = JSON.stringify(presented);
  const positioned = applyPositions(presented, [{ id: "e1", x: 50, y: 60, z: 2, yaw: 0.3 }]);
  eq(JSON.stringify(presented), before, "applyPositions never mutates the scene it was given");
  const e1 = positioned.entries[0];
  eq([e1.x, e1.y, e1.z, e1.yaw], [50, 60, 2, 0.3], "applyPositions overlays position from the supplied entities");
  eq([e1.scale, e1.opacity], [1.4, 0.8], "applyPositions leaves presentation fields (scale/opacity) untouched");
  const untouched = applyPositions(presented, []);
  eq(untouched.entries[0].x, 1, "an entity absent from positionEntities keeps its own existing position");
}

done("prove-tween");
});
