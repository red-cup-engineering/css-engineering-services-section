import { ok, eq, done } from "./_harness.mjs";
import { project, sceneEquals } from "../src/project.mjs";
import { test } from "node:test";

test("prove-project", async () => {
// project() is a pure function: same input, same output, every call.
{
  const roomState = { entities: [{ id: "b1", x: 1, y: 2, kind: "actor", name: "bob" }, { id: "a1", x: 0, y: 0, kind: "actor" }] };
  const s1 = project(roomState, 5);
  const s2 = project(roomState, 5);
  ok(sceneEquals(s1, s2), "project() is a pure function of its inputs — identical call, identical output");
  eq(s1.tick, 5, "the SceneDescription carries the requested tick");
}

// entries are stably sorted by id — not dependent on the input array's own order.
{
  const forward = project({ entities: [{ id: "a1", x: 0, y: 0 }, { id: "b1", x: 1, y: 1 }] }, 1);
  const backward = project({ entities: [{ id: "b1", x: 1, y: 1 }, { id: "a1", x: 0, y: 0 }] }, 1);
  ok(sceneEquals(forward, backward), "project() output does not depend on input entity array order");
  eq(forward.entries[0].id, "a1", "entries are sorted by id");
}

// non-numeric/missing fields coerce to safe defaults rather than propagating NaN/undefined.
{
  const scene = project({ entities: [{ id: "x1", x: "not-a-number", kind: "weird" }] }, 0);
  eq(scene.entries[0].x, 0, "a non-numeric x coerces to 0 rather than NaN");
  eq(scene.entries[0].role, "weird", "role falls back to kind when the entity has no explicit role");
}

// accepts a bare array too (an InterpolationBuffer.sample() result), not only a {entities} wrapper.
{
  const scene = project([{ id: "a1", x: 3, y: 4 }], 2);
  eq(scene.entries.length, 1, "project() accepts a bare entity array directly");
  eq(scene.entries[0].x, 3, "the bare-array path projects the same fields as the wrapped path");
}

// sceneEquals genuinely distinguishes different scenes (not vacuously true).
{
  const a = project({ entities: [{ id: "a1", x: 0, y: 0 }] }, 1);
  const b = project({ entities: [{ id: "a1", x: 1, y: 0 }] }, 1);
  ok(!sceneEquals(a, b), "sceneEquals correctly reports two genuinely different scenes as unequal");
}

done("prove-project");
});
