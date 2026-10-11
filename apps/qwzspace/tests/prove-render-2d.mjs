import { ok, eq, done } from "./_harness.mjs";
import { project } from "../src/project.mjs";
import { frameOps, createBackend } from "../src/render-2d.mjs";
import { test } from "node:test";

test("prove-render-2d", async () => {
// frameOps is pure and deterministic (no Math.random inside the backend — §0 principle 2 applies to
// backends too: two renders of the identical scene must draw identically, or §9's unification breaks).
{
  const scene = project({ entities: [{ id: "a1", x: 5, y: 6, kind: "actor", name: "alice" }] }, 3);
  const ops1 = frameOps(scene);
  const ops2 = frameOps(scene);
  eq(JSON.stringify(ops1), JSON.stringify(ops2), "frameOps() is a pure function — identical scene, identical ops");
  eq(ops1[0].type, "clear", "the first op is always a clear");
  eq(ops1[1].type, "circle", "one circle op per scene entry");
  eq(ops1[1].x, 5, "the circle op's x matches the projected entry's x");
  eq(ops1[1].label, "alice", "the circle op carries the entity's label");
}

// a minimal mock 2D context — just enough of CanvasRenderingContext2D's surface to prove createBackend
// drives it correctly, with NO real DOM/canvas (this environment is headless Node).
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
  eq(ops[0], "clearRect", "render() starts with a clearRect");
  const arcCalls = mount.ctx.calls.filter((c) => c.op === "arc");
  eq(arcCalls.length, 2, "render() draws one arc per scene entry");
  eq(arcCalls[0].args[0], 1, "the first entity's arc is centered at its projected x");

  // determinism: rendering the SAME scene twice against two FRESH mock canvases produces identical
  // call sequences (structurally — same op names/args in the same order).
  const mount2 = makeMockCanvas();
  const backend2 = createBackend({ mount: mount2, width: 400, height: 300 });
  backend2.render(scene);
  eq(JSON.stringify(mount.ctx.calls), JSON.stringify(mount2.ctx.calls), "render() is deterministic — identical scene, identical draw-call sequence");
}

// THE UNIFICATION SHAPE, at the renderer layer alone (the full room-level proof lives in
// prove-unification.mjs): the SAME backend, given two SEPARATELY-CONSTRUCTED but content-identical
// SceneDescriptions (standing in for "one from a live cache, one from a replay"), renders identically.
{
  const liveLikeScene = project({ entities: [{ id: "a1", x: 9, y: 9, kind: "actor" }] }, 7);
  const replayLikeScene = project({ entities: [{ id: "a1", x: 9, y: 9, kind: "actor" }] }, 7); // separately built
  const mA = makeMockCanvas();
  const mB = makeMockCanvas();
  createBackend({ mount: mA }).render(liveLikeScene);
  createBackend({ mount: mB }).render(replayLikeScene);
  eq(JSON.stringify(mA.ctx.calls), JSON.stringify(mB.ctx.calls), "the SAME backend renders two independently-constructed but content-identical scenes identically");
}

done("prove-render-2d");
});
