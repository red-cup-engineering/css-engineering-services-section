// prove-project-spectacle — the v2 scene-description contract (layer/scale/rotation/opacity/tint/
// sprite/text/spriteParams/textStyle), proven BACKWARD COMPATIBLE with v1: a scene built from
// entities that never set any new field must carry none of those keys and must sort in the EXACT
// same order project() always produced (this is the literal regression proof render-2d.mjs's own
// header and tests/prove-render-2d-regression.mjs depend on further downstream).

import { ok, eq, done } from "./_harness.mjs";
import { project, sceneEquals, mergeSceneLayer, SCENE_VERSION, LAYER_ORDER } from "../src/project.mjs";
import { test } from "node:test";

test("prove-project-spectacle", async () => {

// === backward compatibility: a v1-shaped scene carries NONE of the new keys =====================
{
  const scene = project({ entities: [{ id: "b1", x: 1, y: 2, kind: "actor", name: "bob" }, { id: "a1", x: 0, y: 0 }] }, 5);
  eq(scene.version, SCENE_VERSION, "project() now stamps the scene with a version marker");
  for (const key of ["layer", "scale", "rotation", "opacity", "tint", "sprite", "spriteParams", "text", "textStyle"]) {
    ok(!(key in scene.entries[0]) && !(key in scene.entries[1]), `a v1-shaped entity's projected entry never carries "${key}"`);
  }
  eq(scene.entries[0].id, "a1", "v1 sort order (by id) is unchanged when no entry uses layer/z");
}

// === new fields are carried through ONLY when the source entity sets them =======================
{
  const scene = project(
    {
      entities: [
        { id: "e1", x: 0, y: 0, layer: "fx", scale: 2, rotation: 1.2, opacity: 0.5, tint: "#ff0000", sprite: "coin", spriteParams: { radius: 9 } },
        { id: "e2", x: 0, y: 0, text: "GO", textStyle: { align: "center" } },
      ],
    },
    1,
  );
  const e1 = scene.entries.find((e) => e.id === "e1");
  eq(e1.layer, "fx", "layer carried through");
  eq(e1.scale, 2, "scale carried through");
  eq(e1.rotation, 1.2, "rotation carried through");
  eq(e1.opacity, 0.5, "opacity carried through");
  eq(e1.tint, "#ff0000", "tint carried through");
  eq(e1.sprite, "coin", "sprite carried through");
  eq(e1.spriteParams, { radius: 9 }, "spriteParams carried through as a copy");
  const e2 = scene.entries.find((e) => e.id === "e2");
  eq(e2.text, "GO", "text carried through");
  eq(e2.textStyle, { align: "center" }, "textStyle carried through as a copy");
  ok(!("sprite" in e2), "an entity that never set sprite never gets one");
}

// opacity clamps to [0,1]; out-of-range inputs never propagate.
{
  const scene = project({ entities: [{ id: "a", x: 0, y: 0, opacity: 3 }, { id: "b", x: 0, y: 0, opacity: -1 }] }, 1);
  eq(scene.entries.find((e) => e.id === "a").opacity, 1, "opacity clamps above 1");
  eq(scene.entries.find((e) => e.id === "b").opacity, 0, "opacity clamps below 0");
}

// === layer + z ordering =============================================================================
{
  // deliberately out-of-order input: overlay before backdrop before pieces, and within "pieces" a
  // higher z should still sort after a lower one, matching the "read/sort on the ALREADY-EXISTING z
  // field, plus the new named-layer concept" design.
  const scene = project(
    {
      entities: [
        { id: "hud", x: 0, y: 0, layer: "overlay" },
        { id: "back", x: 0, y: 0, layer: "backdrop" },
        { id: "tall", x: 0, y: 0, z: 5 },
        { id: "short", x: 0, y: 0, z: 1 },
        { id: "fx1", x: 0, y: 0, layer: "fx" },
      ],
    },
    1,
  );
  eq(scene.entries.map((e) => e.id), ["back", "short", "tall", "fx1", "hud"], "entries sort by (layer bucket, then z, then id)");
}

// an unknown layer name still sorts deterministically (does not throw, does not collide with a known
// bucket's rank).
{
  const scene = project({ entities: [{ id: "x", x: 0, y: 0, layer: "mystery-layer" }, { id: "y", x: 0, y: 0 }] }, 1);
  ok(Array.isArray(scene.entries) && scene.entries.length === 2, "an unregistered layer name is accepted, not rejected");
}

// === determinism: project() is still pure with the new fields in play ============================
{
  const roomState = { entities: [{ id: "z1", x: 1, y: 1, scale: 1.5, tint: "#abcdef" }] };
  ok(sceneEquals(project(roomState, 3), project(roomState, 3)), "project() stays a pure function of its inputs with v2 fields present");
}

// === mergeSceneLayer — pure, non-mutating, re-sorts by the same rule =============================
{
  const scene = project({ entities: [{ id: "p1", x: 0, y: 0 }] }, 4);
  const before = JSON.stringify(scene);
  const merged = mergeSceneLayer(scene, [{ id: "fx1", x: 5, y: 5, layer: "fx", kind: "particle", role: "particle", z: 0, yaw: 0, label: "fx1" }]);
  eq(JSON.stringify(scene), before, "mergeSceneLayer never mutates the scene it was given");
  eq(merged.entries.map((e) => e.id), ["p1", "fx1"], "fx-layer entries sort after the default pieces layer");
  eq(merged.tick, scene.tick, "mergeSceneLayer preserves the scene's own tick");
}

eq(Object.keys(LAYER_ORDER).sort(), ["backdrop", "board", "fx", "overlay", "pieces"], "LAYER_ORDER names the five documented buckets");

done("prove-project-spectacle");
});
