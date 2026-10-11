// prove-render-2d-regression — the literal "old circle-only scenes still render identically" proof
// the spectacle-vocabulary pass promised (see render-2d.mjs's own header). Unlike
// tests/prove-render-2d.mjs (which checks internal self-consistency), this file pins the EXACT op
// shape and the EXACT canvas call sequence a v1-shaped scene produced BEFORE this pass, so a future
// change to the new sprite/text/camera paths that accidentally leaks into the legacy path fails here.

import { ok, eq, done } from "./_harness.mjs";
import { project } from "../src/project.mjs";
import { frameOps, createBackend } from "../src/render-2d.mjs";
import { test } from "node:test";

test("prove-render-2d-regression", async () => {

// === frameOps: the exact op shape, no new keys ever appear on a v1-shaped entry ==================
{
  const scene = project({ entities: [{ id: "a1", x: 5, y: 6, kind: "actor", name: "alice" }] }, 3);
  const ops = frameOps(scene);
  eq(ops.length, 2, "clear + one circle, nothing else");
  eq(ops[0], { type: "clear", width: 800, height: 600 }, "the clear op is byte-identical to before this pass");
  eq(
    ops[1],
    { type: "circle", id: "a1", x: 5, y: 6, radius: 6, color: ops[1].color, label: "alice" },
    "the circle op carries EXACTLY the pre-pass keys (id/x/y/radius/color/label) — no scale/opacity leaked in",
  );
  ok(!("scale" in ops[1]) && !("opacity" in ops[1]), "no default-valued scale/opacity key is ever added for a plain entity");
}

// === the ORIGINAL minimal mock context (exactly as tests/prove-render-2d.mjs defines it) — if the
// legacy path ever started calling save/restore/globalAlpha/etc., this mock would throw immediately
// since it implements none of those methods. ======================================================
function makeMockContext() {
  const calls = [];
  return {
    calls,
    clearRect: (...a) => calls.push({ op: "clearRect", args: a }),
    beginPath: () => calls.push({ op: "beginPath", args: [] }),
    arc: (...a) => calls.push({ op: "arc", args: a }),
    fill: () => calls.push({ op: "fill", args: [] }),
    fillText: (...a) => calls.push({ op: "fillText", args: a }),
    set fillStyle(v) {
      calls.push({ op: "fillStyle", args: [v] });
    },
  };
}
function makeMockCanvas() {
  const ctx = makeMockContext();
  return { getContext: () => ctx, ctx };
}

{
  const mount = makeMockCanvas();
  const backend = createBackend({ mount, width: 400, height: 300 });
  const scene = project({ entities: [{ id: "a1", x: 1, y: 2, kind: "actor" }, { id: "b1", x: 3, y: 4, kind: "npc" }] }, 1);
  backend.render(scene);

  const ops = mount.ctx.calls.map((c) => c.op);
  // each entity's label always resolves to a non-empty string (project()'s id fallback), so a
  // fillText call after each entity's fill() is the EXACT pre-pass behavior, not a new addition.
  eq(
    ops,
    ["clearRect", "beginPath", "arc", "fillStyle", "fill", "fillText", "beginPath", "arc", "fillStyle", "fill", "fillText"],
    "the EXACT pre-pass call sequence — no save/restore/globalAlpha calls leaked into the legacy path",
  );
}

// no camera set, no camera transform ops appear at all.
{
  const scene = project({ entities: [{ id: "a1", x: 1, y: 1 }] }, 1);
  const ops = frameOps(scene);
  ok(!ops.some((op) => op.type === "transform" || op.type === "transformEnd"), "no camera set -> no transform ops, ever");
}

done("prove-render-2d-regression");
});
