// fiber — one actor's fiber of a FeltOS world, projected to a SceneDescription every tier draws.
//
// A fiber is what a perception frame carries: the subjects the actor perceives, each with its
// settled cells and their FOUR evidence. The projection reads only that frame and the game's
// static world description (terrain, tides), never the world itself, so a client holding nothing
// but the frame it was sent draws exactly what the server would. The same scene goes to the webgl,
// canvas2d and text tiers; a weaker tier reads less of it, never something else.
//
// Coordinates stay in the world's frame (`frame: "enu"`): x east, y north, z up, in metres. Each
// backend maps that frame to its own device. `yaw` is the heading in radians clockwise from north.

import { isReading, sidesOfReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { COMPASS, bodyCentroid, segmentThroughPrism } from "@red-cup-engineering/feltos/geometry";
import { environmentAt } from "./environment.mjs";
import { SCENE_VERSION } from "./project.mjs";

export const SCENE_FRAME = "enu";

// The drawable a kind of subject is drawn as when it names none of its own. A subject's own
// `drawable` cell (a registry name or a content address) wins.
export const KIND_DRAWABLES = Object.freeze({
  actor: "figure",
  npc: "figure",
  thing: "item",
  vehicle: "vehicle",
  ship: "vessel",
  room: "place",
  exit: "exit",
});

const affirmed = (evidence) => isReading(evidence) && sidesOfReading(evidence)[0];
const isPoint = (point) => Array.isArray(point) && point.length === 3 && point.every(Number.isFinite);
const isPose = (pose) => pose !== null && typeof pose === "object" && isPoint(pose.position) && Number.isFinite(pose.heading);
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;

/** The affirmed facts of each subject in a frame: id -> predicate -> objects. */
function factsOf(frame) {
  const facts = new Map();
  for (const subject of frame?.subjects ?? []) {
    const own = new Map();
    for (const cell of subject.cells ?? []) {
      if (!affirmed(cell.evidence)) continue;
      if (!own.has(cell.predicate)) own.set(cell.predicate, []);
      own.get(cell.predicate).push(cell.object);
    }
    facts.set(subject.id, own);
  }
  return facts;
}

// A functional reading: the one affirmed object, or null when there is none or the fiber holds a
// contradiction (two affirmed objects), the same reading FeltOS's own `value` gives.
const one = (facts, id, predicate) => {
  const objects = facts.get(id)?.get(predicate);
  return objects?.length === 1 ? objects[0] : null;
};

/** Where a subject is in space, read inside the fiber the way FeltOS's worldPose reads the world:
 *  a place with extent holds its contents at their own poses; a posed holder carries what it holds;
 *  a room that is part of a vehicle goes where the vehicle goes. A subject whose holder lies beyond
 *  the fiber was glimpsed by sight, at its own pose. */
export function poseInFiber(facts, id, seen = new Set()) {
  if (seen.has(id) || !facts.has(id)) return null;
  seen.add(id);
  const own = one(facts, id, "pose");
  const holder = one(facts, id, "located-in");
  if (holder !== null && facts.has(holder) && one(facts, holder, "region") === null) return poseInFiber(facts, holder, seen);
  if (isPose(own)) return own;
  const whole = one(facts, id, "part-of");
  return whole === null ? null : poseInFiber(facts, whole, seen);
}

function floorCentroid(region) {
  const [x, y] = bodyCentroid(region);
  return [x, y, region.body.z[0]];
}

/** Where an exit stands: on the edge of the place's body along the exit's compass bearing, at the
 *  floor. An exit that is not a compass point (up, inside, a named place) stands where the way to
 *  its destination leaves the body, when the destination's extent is known: at the destination
 *  itself when it stands within the body, else at the body's centre. */
function exitPoint(region, direction, destination = null) {
  const centre = floorCentroid(region);
  const degrees = COMPASS[direction];
  if (degrees === undefined) {
    if (!destination?.body) return centre;
    const toward = floorCentroid(destination);
    const through = segmentThroughPrism(region.body, centre, toward);
    if (through === null) return centre;
    const t = Math.min(1, through[1]);
    return [centre[0] + t * (toward[0] - centre[0]), centre[1] + t * (toward[1] - centre[1]), t < 1 ? centre[2] : toward[2]];
  }
  const radians = degrees * Math.PI / 180;
  const [x0, y0, x1, y1] = region.body.footprint.reduce(([a, b, c, d], [x, y]) => [Math.min(a, x), Math.min(b, y), Math.max(c, x), Math.max(d, y)], [Infinity, Infinity, -Infinity, -Infinity]);
  const reach = Math.hypot(x1 - x0, y1 - y0);
  const far = [centre[0] + reach * Math.sin(radians), centre[1] + reach * Math.cos(radians), centre[2]];
  const through = segmentThroughPrism(region.body, centre, far);
  if (through === null) return centre;
  const t = through[1];
  return [centre[0] + t * (far[0] - centre[0]), centre[1] + t * (far[1] - centre[1]), centre[2]];
}

/** A subject's tint, a CSS colour every tier may draw it in instead of its role's. */
const tintOf = (value) => (typeof value === "string" && value.length > 0 ? value : null);

const labelOf = (facts, id) => {
  const name = one(facts, id, "name");
  return typeof name === "string" ? name : id;
};

const entryAt = (entry, [x, y, z], heading = 0) => ({ ...entry, x, y, z, yaw: heading * Math.PI / 180 });

function placeEntry(base, region) {
  return entryAt({
    ...base,
    placed: true,
    footprint: region.body.footprint.map((point) => [...point]),
    span: [...region.body.z],
    reaches: (region.reaches ?? []).map((prism) => ({ footprint: prism.footprint.map((point) => [...point]), span: [...prism.z] })),
    enclosed: region.enclosed === true,
  }, floorCentroid(region));
}

/** Project one fiber (a FeltOS perception frame) to a SceneDescription.
 *  `world` is the game's static description, every part optional:
 *    tide    — `{ levels: { meanHighWater } }`
 *    terrain — a content-addressed heightfield `{ address, origin, spacing, columns, rows }`
 *    places  — the public map: place id -> region (or `{ name, region, tint }`). Sight perceives what
 *              moves; the extent of places is scenery every client may hold, so a place the fiber
 *              does not carry is still drawn, from the map, as a mapped place. */
export function projectFiber(frame, world = {}) {
  const facts = factsOf(frame);
  const actor = frame?.actor ?? null;
  const placeId = frame?.place?.id ?? null;
  const placeRegion = placeId === null ? null : one(facts, placeId, "region");
  const actorPose = actor === null ? null : poseInFiber(facts, actor);
  const fallback = actorPose?.position ?? (placeRegion ? floorCentroid(placeRegion) : [0, 0, 0]);
  const entries = [];

  for (const id of [...facts.keys()].sort(compareText)) {
    const kind = one(facts, id, "kind") ?? "entity";
    const own = one(facts, id, "drawable");
    const base = {
      id,
      kind,
      role: id === actor ? "self" : id === placeId ? "here" : kind === "room" ? "place" : kind,
      label: labelOf(facts, id),
      drawable: typeof own === "string" ? own : (KIND_DRAWABLES[kind] ?? "item"),
      tint: tintOf(one(facts, id, "tint")),
    };
    const region = one(facts, id, "region");
    if (region !== null) {
      entries.push(placeEntry(base, region));
      continue;
    }
    const holder = one(facts, id, "located-in");
    const pose = poseInFiber(facts, id);
    entries.push(entryAt({ ...base, holder, placed: pose !== null }, pose?.position ?? fallback, pose?.heading ?? 0));
  }

  const mappedRegion = (mapped) => (mapped?.body ? mapped : mapped?.region?.body ? mapped.region : null);
  for (const [id, mapped] of Object.entries(world.places ?? {}).sort(([left], [right]) => compareText(left, right))) {
    if (facts.has(id)) continue;
    const region = mappedRegion(mapped);
    if (region === null) continue;
    const label = typeof mapped?.name === "string" ? mapped.name : id;
    entries.push(placeEntry({ id, kind: "room", role: "place", label, drawable: KIND_DRAWABLES.room, tint: tintOf(mapped?.tint), mapped: true }, region));
  }

  for (const direction of frame?.place?.exits ?? []) {
    const destination = one(facts, placeId, `exit:${direction}`);
    entries.push(entryAt({
      id: `${placeId}#${direction}`,
      kind: "exit",
      role: "exit",
      label: direction,
      drawable: KIND_DRAWABLES.exit,
      holder: placeId,
      destination,
      placed: placeRegion !== null,
    }, placeRegion ? exitPoint(placeRegion, direction, destination === null ? null : (one(facts, destination, "region") ?? mappedRegion(world.places?.[destination]))) : fallback, COMPASS[direction] ?? 0));
  }

  entries.sort((left, right) => compareText(left.id, right.id));
  return {
    tick: Math.trunc(Number(frame?.tick ?? 0)),
    version: SCENE_VERSION,
    frame: SCENE_FRAME,
    actor,
    place: frame?.place ? { id: placeId, name: frame.place.name, description: frame.place.description, exits: [...(frame.place.exits ?? [])] } : null,
    environment: environmentAt(frame?.clock, world),
    entries,
  };
}
