// render-text — the text tier: a SceneDescription read the way a MUD says a room. It draws the same
// projection as the canvas2d and webgl tiers (a spatial backend under the same contract), so a
// screen reader, a telnet client and a 3D view never disagree about what is here.

import { bearing, distance, nearestCompass } from "@red-cup-engineering/feltos/geometry";

const NOT_HELD = new Set(["room", "exit"]);

const listed = (entries) => entries.map(({ id, label }) => ({ id, label }));

function sentence(words) {
  if (words.length === 0) return "";
  if (words.length === 1) return words[0];
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

/** The structured reading of a scene at the text tier: the room, what is here, what the actor
 *  carries, what it can see further off (with a compass direction and distance), and the exits. */
export function textView(scene) {
  const entries = scene?.entries ?? [];
  const placeId = scene?.place?.id ?? null;
  const actor = scene?.actor ?? null;
  const self = entries.find((entry) => entry.id === actor) ?? null;
  const room = entries.find((entry) => entry.id === placeId) ?? null;
  const things = entries.filter((entry) => !NOT_HELD.has(entry.kind) && entry.id !== actor);
  const here = things.filter((entry) => entry.holder === placeId);
  const carried = things.filter((entry) => entry.holder === actor);
  const afar = things
    .filter((entry) => entry.holder !== placeId && entry.holder !== actor && entry.placed && self?.placed)
    .map((entry) => {
      const from = [self.x, self.y, self.z], to = [entry.x, entry.y, entry.z];
      return { id: entry.id, label: entry.label, direction: nearestCompass(bearing(from, to)), distance: Math.round(distance(from, to)) };
    });
  const exits = entries.filter((entry) => entry.kind === "exit").map(({ id, label, destination }) => ({ id, label, destination }));
  const environment = scene?.environment ?? null;
  return {
    room: room === null ? (scene?.place ? { id: placeId, label: scene.place.name } : null) : { id: room.id, label: room.label },
    description: scene?.place?.description ?? "",
    here: listed(here),
    carried: listed(carried),
    afar,
    exits,
    conditions: environment ? { phase: environment.phase, tide: environment.tide, weather: environment.weather?.kind ?? null } : null,
  };
}

/** The text tier's lines for a scene. */
export function textLines(scene) {
  const view = textView(scene);
  const lines = [];
  if (view.room) lines.push(view.room.label);
  if (view.description) lines.push(view.description);
  if (view.here.length) lines.push(`Here: ${sentence(view.here.map(({ label }) => label))}.`);
  if (view.carried.length) lines.push(`You carry ${sentence(view.carried.map(({ label }) => label))}.`);
  if (view.afar.length) lines.push(`Further off: ${sentence(view.afar.map(({ label, direction, distance: metres }) => `${label} (${direction}, ${metres} m)`))}.`);
  lines.push(view.exits.length ? `Exits: ${sentence(view.exits.map(({ label }) => label))}.` : "No obvious exits.");
  const conditions = view.conditions;
  if (conditions?.phase) lines.push(`It is ${conditions.phase}; the tide is ${conditions.tide ?? "unknown"}; the weather is ${conditions.weather ?? "unknown"}.`);
  return lines;
}

/** A spatial backend that writes each frame's lines to `write(lines, scene)`. */
export function createBackend({ write } = {}) {
  if (typeof write !== "function") throw new TypeError("render-text: createBackend({ write }) requires a write(lines) function");
  return {
    render(scene) {
      write(textLines(scene), scene);
    },
  };
}
