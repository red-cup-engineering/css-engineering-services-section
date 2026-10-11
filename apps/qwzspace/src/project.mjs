// project — THE RENDERER's scene projection contract (spec §8): `project(roomState, tick) ->
// SceneDescription`. This is the seam §9's unification proof rests on: the SAME call, given EITHER a
// live room's snapshot cache (`server.snapshot.full(tick)`) OR a `replay(...)`'d one
// (`replayed.full(tick)`) — both have the identical `{ type, tick, entities }` shape, because
// replay.mjs's snapshot-manager IS the same snapshot-manager.mjs a live room uses — MUST produce
// byte-identical output. That is only possible because this function touches NOTHING but its two
// arguments: no socket, no clock, no room, no backend. Determinism check (§8's own): call it twice
// with the same inputs and diff the JSON.
//
// Input: exactly what a client already receives over the wire, or what a room's cache holds — the
// entries a `snapOf`/interest-filtered view produces (§1, §5). This module invents no new data
// source.
//
// Output: a backend-neutral SceneDescription. Entries carry a `role`/`kind` pair as a light nod to
// TUFTE's own role/span vocabulary (per the spec's explicit "echoing TUFTE... since both fibers read
// house doc conventions") — this is NOT a real TUFTE integration (that would mean reading and
// depending on TUFTE's actual source, out of this spec's scope); it is only field-naming courtesy so
// a future renderer shared between the two fibers would not have to rename anything.

import { clamp01 } from "./clamp.mjs";

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}


// SCENE_VERSION — bumped for the "spectacle vocabulary" pass (layer/scale/rotation/opacity/tint/
// sprite/text on entries). This is a MARKER, not a gate: nothing in this package refuses an
// unversioned or v1-shaped scene — old callers that never read `.version` are unaffected, and every
// v1 field (id/kind/role/x/y/z/yaw/label) is still produced exactly as before, in the same order.
export const SCENE_VERSION = 2;

// LAYER_ORDER — the named-layer z-buckets a scene entry may opt into via `layer`. Coarse ordering
// (which bucket draws over which); WITHIN a layer (or for entries with no layer at all — everything
// built before this pass), `z` is the fine-grained depth already carried by room state (a real
// spatial coordinate, not a rendering afterthought — see the header note this pass added: render-2d
// never read it before, so nothing before this changed based on it either).
export const LAYER_ORDER = Object.freeze({ backdrop: 0, board: 1, pieces: 2, fx: 3, overlay: 4 });
const DEFAULT_LAYER_RANK = LAYER_ORDER.pieces;

function layerRank(layer) {
  if (layer === undefined) return DEFAULT_LAYER_RANK;
  return Object.prototype.hasOwnProperty.call(LAYER_ORDER, layer) ? LAYER_ORDER[layer] : DEFAULT_LAYER_RANK + 0.5;
}

// project — pure. `roomState` is anything with an `.entities` array (a snapshot-manager full/delta
// frame, an InterpolationBuffer.sample() array wrapped as `{entities}`, or a replay's `.full()`).
export function project(roomState, tick) {
  const entities = Array.isArray(roomState) ? roomState : (roomState?.entities ?? []);
  const entries = entities.map((e) => {
    const entry = {
      id: String(e.id),
      kind: e.kind ?? "entity",
      role: e.role ?? e.kind ?? "entity",
      x: num(e.x),
      y: num(e.y),
      z: num(e.z),
      yaw: num(e.yaw),
      label: e.name ?? e.label ?? String(e.id),
    };
    // v2 presentation fields — added to the entry ONLY when the source entity actually specifies
    // them. `JSON.stringify` drops a key whose value is never set at all (as opposed to `null`),
    // so a v1-shaped entity (nothing below ever present) projects to EXACTLY the v1 entry shape —
    // this is the whole backward-compatibility mechanism, not a special case bolted on top of it.
    if (e.layer !== undefined) entry.layer = String(e.layer);
    if (e.scale !== undefined) entry.scale = num(e.scale, 1);
    if (e.rotation !== undefined) entry.rotation = num(e.rotation, 0);
    if (e.opacity !== undefined) entry.opacity = clamp01(num(e.opacity, 1));
    if (e.tint !== undefined) entry.tint = String(e.tint);
    if (e.sprite !== undefined) entry.sprite = String(e.sprite);
    if (e.spriteParams && typeof e.spriteParams === "object") entry.spriteParams = { ...e.spriteParams };
    if (e.text !== undefined) entry.text = String(e.text);
    if (e.textStyle && typeof e.textStyle === "object") entry.textStyle = { ...e.textStyle };
    return entry;
  });
  // stable order: (layer bucket, then z depth, then id) so two structurally-identical entity sets
  // never disagree on array order purely because of Map/object iteration order — a real determinism
  // hazard §0 principle 2 warns about. For every entity that never sets `layer` (z defaults to 0 via
  // `num()` above for ALL entities, always did), every entry's layer-rank AND z tie, so this sorts
  // by id alone — byte-identical to the pre-v2 order for any scene that uses none of the new fields.
  entries.sort((a, b) => {
    const la = layerRank(a.layer);
    const lb = layerRank(b.layer);
    if (la !== lb) return la - lb;
    if (a.z !== b.z) return a.z - b.z;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return { tick: Math.trunc(num(tick)), entries, version: SCENE_VERSION };
}

// mergeSceneLayer — pure: returns a NEW SceneDescription with `extraEntries` (already SceneEntry-
// shaped — e.g. particles.mjs's `sampleEffect(...).entries`, or a celebration's overlay entries)
// folded in and the whole set re-sorted by the same (layer, z, id) rule `project()` uses. Never
// mutates `scene` or `extraEntries`. This is how particle/fx/overlay layers become "just more scene
// entries" instead of a parallel rendering path render-2d would need special-cased ops for.
export function mergeSceneLayer(scene, extraEntries = []) {
  const entries = [...(scene?.entries ?? []), ...extraEntries.map((e) => ({ ...e }))];
  entries.sort((a, b) => {
    const la = layerRank(a.layer);
    const lb = layerRank(b.layer);
    if (la !== lb) return la - lb;
    const za = num(a.z);
    const zb = num(b.z);
    if (za !== zb) return za - zb;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return { ...scene, entries };
}

// sceneEquals — byte-identical comparison of two SceneDescriptions, the literal check §9's
// prove-unification.mjs runs (live-derived vs replay-derived project() output).
export function sceneEquals(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
