// prove-render-2d-spectacle — the NEW op vocabulary (sprite/text/transform) and the real camera this
// pass adds to render-2d's backend, executed against a mock Canvas2D context that implements the
// FULLER surface these new ops actually need (save/restore/translate/rotate/scale/rect/etc.) — the
// legacy-path mock stays minimal on purpose, see prove-render-2d-regression.mjs.

import { ok, eq, done } from "./_harness.mjs";
import { project } from "../src/project.mjs";
import { frameOps, createBackend } from "../src/render-2d.mjs";
import { resolveCamera } from "../src/camera.mjs";
import { assertBackendConformance, capabilitiesOf } from "../src/spatial-backend.mjs";
import { test } from "node:test";

function makeFullMockContext() {
  const calls = [];
  const record = (op) => (...args) => calls.push([op, ...args]);
  return {
    calls,
    clearRect: record("clearRect"),
    beginPath: record("beginPath"),
    arc: record("arc"),
    rect: record("rect"),
    roundRect: record("roundRect"),
    moveTo: record("moveTo"),
    lineTo: record("lineTo"),
    bezierCurveTo: record("bezierCurveTo"),
    closePath: record("closePath"),
    fill: record("fill"),
    stroke: record("stroke"),
    fillText: record("fillText"),
    save: record("save"),
    restore: record("restore"),
    translate: record("translate"),
    rotate: record("rotate"),
    scale: record("scale"),
    setLineDash: record("setLineDash"),
    createLinearGradient: () => ({ addColorStop: record("addColorStop") }),
    createRadialGradient: () => ({ addColorStop: record("addColorStop") }),
    font: "",
    textAlign: "",
    set fillStyle(v) {
      calls.push(["fillStyle", v]);
    },
    set strokeStyle(v) {
      calls.push(["strokeStyle", v]);
    },
    set lineWidth(v) {
      calls.push(["lineWidth", v]);
    },
    set globalAlpha(v) {
      calls.push(["globalAlpha", v]);
    },
  };
}
function makeFullMockCanvas() {
  const ctx = makeFullMockContext();
  return { getContext: () => ctx, ctx };
}

test("prove-render-2d-spectacle", async () => {

// === frameOps: a sprite entry resolves to a "sprite" op carrying baked, tinted shapes =============
{
  const scene = project({ entities: [{ id: "e1", x: 10, y: 20, sprite: "coin", tint: "#ffcc00", scale: 1.5, rotation: 0.2 }] }, 1);
  const ops = frameOps(scene);
  const spriteOp = ops.find((op) => op.type === "sprite");
  ok(spriteOp, "a sprite entry produces a sprite op");
  eq([spriteOp.x, spriteOp.y, spriteOp.scale, spriteOp.rotation, spriteOp.drawableId], [10, 20, 1.5, 0.2, "coin"], "the sprite op carries the entry's transform + drawable id");
  ok(Array.isArray(spriteOp.shapes) && spriteOp.shapes.length > 0, "the sprite op carries resolved (baked) shapes, not just a name to look up later");
}

// === frameOps: a text entry produces a "text" op, not a circle =====================================
{
  const scene = project({ entities: [{ id: "e1", x: 1, y: 2, text: "GO", tint: "#111", textStyle: { align: "center" } }] }, 1);
  const ops = frameOps(scene);
  ok(!ops.some((op) => op.type === "circle"), "an entry with text (no sprite) never falls back to the circle path");
  const textOp = ops.find((op) => op.type === "text");
  eq([textOp.text, textOp.color, textOp.align], ["GO", "#111", "center"], "the text op carries text/color/align");
}

// === frameOps: determinism holds with the new fields in play ======================================
{
  const scene = project({ entities: [{ id: "e1", x: 1, y: 1, sprite: "star", tint: "#0f0" }] }, 1);
  eq(JSON.stringify(frameOps(scene)), JSON.stringify(frameOps(scene)), "frameOps stays pure with sprite ops in the mix");
}

// === frameOps: camera transform wraps the frame only when a camera pose is supplied ===============
{
  const scene = project({ entities: [{ id: "e1", x: 1, y: 1 }] }, 1);
  const camera = resolveCamera({ x: 5, z: 5, zoom: 2 }, 1);
  const ops = frameOps(scene, { camera });
  eq(ops[0].type, "clear", "clear is always first, even with a camera");
  eq(ops[1].type, "transform", "a transform op follows immediately after clear when a camera is given");
  eq(ops[ops.length - 1].type, "transformEnd", "a transformEnd op closes the frame when a camera is given");
}

// === createBackend: setCamera drives a real save/translate/rotate/scale/restore around the frame ===
{
  const mount = makeFullMockCanvas();
  const backend = createBackend({ mount });
  backend.setCamera(resolveCamera({ x: 3, z: 4, zoom: 2 }, 0));
  const scene = project({ entities: [{ id: "a1", x: 0, y: 0 }] }, 1);
  backend.render(scene);
  const ops = mount.ctx.calls.map((c) => c[0]);
  ok(ops.includes("save") && ops.includes("restore"), "a set camera drives save()/restore() around the frame");
  ok(ops.indexOf("save") < ops.indexOf("beginPath") && ops.indexOf("restore") > ops.lastIndexOf("fill"), "save() wraps BEFORE drawing and restore() AFTER");
}

// setCamera(null) clears it back to no-camera.
{
  const mount = makeFullMockCanvas();
  const backend = createBackend({ mount });
  backend.setCamera({ x: 1, z: 1, zoom: 2 });
  backend.setCamera(null);
  const scene = project({ entities: [{ id: "a1", x: 0, y: 0 }] }, 1);
  backend.render(scene);
  ok(!mount.ctx.calls.some((c) => c[0] === "save"), "setCamera(null) removes the camera transform entirely");
}

// createBackend deliberately does NOT implement followEntity (see render-2d.mjs's own header) —
// spatial-backend's conformance check must still accept a backend with no followEntity at all.
{
  const mount = makeFullMockCanvas();
  const backend = createBackend({ mount });
  ok(typeof backend.followEntity !== "function", "render-2d's backend does not implement followEntity (a deliberate omission, not an oversight)");
}

// === createBackend: sprites actually draw through the shape vocabulary =============================
{
  const mount = makeFullMockCanvas();
  const backend = createBackend({ mount });
  const scene = project({ entities: [{ id: "s1", x: 5, y: 5, sprite: "chip", tint: "#dc2626" }] }, 1);
  backend.render(scene);
  const ops = mount.ctx.calls.map((c) => c[0]);
  ok(ops.includes("arc") && ops.includes("rect"), "the chip drawable's circle + rect tick-mark shapes both actually draw");
  ok(ops.includes("save") && ops.includes("restore"), "sprite rendering wraps in save()/restore() for its own transform");
}

// === still conforms to the spatial-backend contract, unchanged self-description ====================
{
  const mount = makeFullMockCanvas();
  const backend = createBackend({ mount });
  const scene = project({ entities: [{ id: "a1", x: 1, y: 1, sprite: "gem" }] }, 3);
  const report = assertBackendConformance(backend, scene, scene.tick);
  ok(report.ok, "render-2d with sprite/camera support still conforms to the spatial-backend contract");
  eq(capabilitiesOf(backend), { camera: false, followEntity: false, dims: 2 }, "capabilities self-description is UNCHANGED even though setCamera/followEntity are now real — see render-2d.mjs's header for why");
}

done("prove-render-2d-spectacle");
});
