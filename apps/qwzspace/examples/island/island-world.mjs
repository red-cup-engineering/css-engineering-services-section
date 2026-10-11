// island-world — a small FeltOS island for the webgl tier's demo: a content-addressed heightfield, a
// quay, a lane, a cottage and a summit with extent, things posed on the ground, and two people.
// Everything is deterministic: the same island, the same frames, on every run.

import { createEngine, join } from "@red-cup-engineering/feltos/engine";
import { defineGame } from "@red-cup-engineering/feltos/game";
import { heightAt } from "@red-cup-engineering/feltos/geometry";
import { createPerceptionFrameType, PerceptionClockType, buildPerceptionFrame } from "@red-cup-engineering/feltos/perception-frame";
import { clockReport, initializeClock } from "@red-cup-engineering/feltos/world-clock";
import { addressOf, memoryAssets } from "../../src/assets.mjs";

export const KIND = "qwzspace.island-demo";
const FRAME_TYPE = createPerceptionFrameType(KIND, PerceptionClockType);

// A 2.4 km square of sea with one hill in it, the shore about a kilometre out.
export const LAYOUT = Object.freeze({ origin: [-1200, -1200], spacing: 25, columns: 97, rows: 97 });

function islandHeights() {
  const { origin, spacing, columns, rows } = LAYOUT;
  const heights = new Float32Array(columns * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
    const x = origin[0] + i * spacing, y = origin[1] + j * spacing;
    const r = Math.hypot(x * 1.15, y);
    heights[j * columns + i] = 150 * Math.exp(-((r / 600) ** 2)) - 10 + 6 * Math.sin(x / 97) * Math.cos(y / 131) * Math.min(1, r / 300);
  }
  return heights;
}

const heights = islandHeights();
export const heightfieldBytes = new Uint8Array(heights.buffer.slice(0));
const ground = (x, y) => Math.round(heightAt(heights, LAYOUT, x, y) * 100) / 100;

const box = (x0, y0, x1, y1, rise, extra = {}) => {
  const floor = Math.min(ground(x0, y0), ground(x1, y0), ground(x1, y1), ground(x0, y1), ground((x0 + x1) / 2, (y0 + y1) / 2)) - 1;
  const top = Math.max(ground(x0, y0), ground(x1, y0), ground(x1, y1), ground(x0, y1)) + rise;
  return { footprint: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z: [floor, top], ...extra };
};
const posed = (location, name, description, x, y, heading = 0) => ({ name, description, location, pose: { position: [x, y, ground(x, y)], heading } });

export const game = defineGame({
  id: "qwzspace.island",
  name: "The Island",
  start: "quay",
  capabilities: ["feltos.space"],
  rooms: {
    quay: { name: "The Quay", description: "Tarred planks over the shingle; the sea slaps at the piles.", exits: { north: "lane" }, region: { body: box(-60, -1010, 60, -930, 10) } },
    lane: { name: "The Lane", description: "A sunken lane climbs between banks of gorse.", exits: { south: "quay", east: "cottage", north: "summit" }, region: { body: box(-12, -930, 12, -500, 10) } },
    cottage: { name: "The Cottage", description: "Whitewashed walls, a peat fire, a low door.", exits: { west: "lane" }, region: { body: box(12, -780, 40, -756, 4), enclosed: true } },
    summit: { name: "The Summit", description: "Wind and heather; the whole island below.", exits: { south: "lane" }, region: { body: box(-60, -60, 60, 60, 10) } },
  },
  things: {
    skiff: posed("quay", "skiff", "A clinker-built skiff on a running line.", 35, -995, 100),
    pots: posed("quay", "lobster pots", "A stack of withy pots.", -40, -945, 0),
    lantern: posed("quay", "lantern", "A storm lantern on a bollard.", 10, -935, 0),
    cart: posed("lane", "handcart", "A two-wheeled handcart.", 0, -820, 10),
    cairn: posed("summit", "cairn", "A cairn of grey stones.", 0, 0, 0),
  },
  assertions: [
    { subject: "skiff", predicate: "drawable", object: "vessel" },
    { subject: "cart", predicate: "drawable", object: "vehicle" },
  ],
});

/** The island's static description every client may hold: tide, terrain by address, the map. */
export function islandDescription() {
  return {
    tide: { levels: { meanHighWater: 1.3 } },
    terrain: { address: addressOf(heightfieldBytes), ...LAYOUT },
    places: Object.fromEntries(Object.entries(game.rooms).map(([id, room]) => [id, { name: room.name, region: room.region }])),
  };
}

/** The island's assets, by content address. */
export const islandAssets = () => memoryAssets([heightfieldBytes]);

/** Alice's perception frame at a world time, optionally under a chosen weather. */
export function islandFrame({ time = 9, weather = null } = {}) {
  let engine = join(join(createEngine(game), "alice"), "bob");
  engine = { ...engine, world: initializeClock(engine.world, { seed: "island", time: Math.trunc(time) }) };
  const report = clockReport(engine.world);
  return buildPerceptionFrame({
    frameType: FRAME_TYPE,
    kind: KIND,
    world: engine.world,
    actor: "alice",
    tick: Math.trunc(time),
    clock: { ...report, time, weather: weather ?? report.weather },
    affordancesFor: () => [],
  });
}
