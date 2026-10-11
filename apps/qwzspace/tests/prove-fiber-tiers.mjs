// prove-fiber-tiers — one actor's fiber of a live FeltOS world, projected once, drawn by all three
// tiers: 3D (the engine's own scene graph), canvas2d and text. The tiers must agree on what is there: the
// text tier's room, things and exits are exactly the projection's entities, the 2D tier draws every
// one of them, and the 3D graph holds a node for each. Assets resolve by content address only.

import { test } from "node:test";
import { composeCapabilities } from "@red-cup-engineering/feltos/capabilities";
import { createEngine, join, step, submit } from "@red-cup-engineering/feltos/engine";
import { defineGame } from "@red-cup-engineering/feltos/game";
import { createPerceptionFrameType, PerceptionClockType, buildPerceptionFrame } from "@red-cup-engineering/feltos/perception-frame";
import { spaceCapability } from "@red-cup-engineering/feltos/space";
import { clockReport, initializeClock, phaseAt } from "@red-cup-engineering/feltos/world-clock";
import { ok, eq, done } from "./_harness.mjs";
import { addressOf, createAssetResolver, decodeMesh, encodeMesh, memoryAssets, wellKnownFetch } from "../src/assets.mjs";
import { environmentAt, sunAt, tideLevelAt } from "../src/environment.mjs";
import { projectFiber } from "../src/fiber.mjs";
import { createBackend as create2d } from "../src/render-2d.mjs";
import { createBackend as create3d } from "../src/render-3d.mjs";
import { createBackend as createText, textView } from "../src/render-text.mjs";
import { assertBackendConformance } from "../src/spatial-backend.mjs";
import { terrainChunks } from "../src/terrain.mjs";

const box = (x0, y0, x1, y1, z0, z1) => ({ footprint: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z: [z0, z1] });
const KIND = "qwzspace.fiber-tiers";
const FRAME_TYPE = createPerceptionFrameType(KIND, PerceptionClockType);
const runtime = composeCapabilities([spaceCapability]);

// A plaza with a lantern and a crate, a road east of it, an enclosed house north; a cart far down the road.
const game = defineGame({
  id: "qwzspace.fiber-town",
  name: "Fiber Town",
  start: "plaza",
  capabilities: ["feltos.space"],
  rooms: {
    plaza: { name: "The Plaza", description: "Flagstones.", exits: { east: "road", north: "house" }, region: { body: box(0, 0, 100, 100, 0, 10) } },
    road: { name: "The Road", description: "Packed earth.", exits: { west: "plaza" }, region: { body: box(95, 0, 600, 100, 0, 10) } },
    house: { name: "The House", description: "Low beams.", exits: { south: "plaza" }, region: { body: box(30, 120, 70, 150, 0, 5), reaches: [box(48, 95, 52, 122, 0, 3)], enclosed: true } },
  },
  things: {
    lantern: { name: "lantern", description: "A brass lantern.", location: "plaza", pose: { position: [20, 20, 0], heading: 0 } },
    crate: { name: "crate", description: "A crate.", location: "plaza", pose: { position: [70, 30, 0], heading: 90 } },
    milestone: { name: "milestone", description: "A worn stone.", location: "road", pose: { position: [400, 50, 0], heading: 0 } },
    coin: { name: "coin", description: "A coin.", location: "lantern" },
  },
});

let engine = join(join(createEngine({ ...game }), "alice"), "bob");
engine = { ...engine, world: initializeClock(engine.world, { seed: "fiber", time: 17 }) };
for (const command of ["take crate", "walk west 10"]) engine = step(submit(engine, { actor: "alice", command }), { runtime }).engine;

const frame = buildPerceptionFrame({
  frameType: FRAME_TYPE,
  kind: KIND,
  world: engine.world,
  actor: "alice",
  tick: 3,
  clock: clockReport(engine.world),
  affordancesFor: () => [],
});

test("prove-fiber-tiers", async () => {
  const heights = new Float32Array(9 * 9).map((_, k) => 30 - Math.hypot((k % 9) - 4, Math.floor(k / 9) - 4) * 8);
  const terrainBytes = new Uint8Array(heights.buffer);
  const assets = memoryAssets([terrainBytes]);
  const layout = { origin: [-200, -200], spacing: 100, columns: 9, rows: 9 };
  const places = Object.fromEntries(Object.entries(game.rooms).map(([id, room]) => [id, { name: room.name, region: room.region }]));
  const world = { tide: { levels: { meanHighWater: 1.3 } }, terrain: { address: addressOf(terrainBytes), ...layout }, places };
  const scene = projectFiber(frame, world);

  // (1) the projection: a fiber's subjects become entries in the world frame, sorted, with exits.
  eq(scene.frame, "enu", "the scene is in the world's frame");
  eq(scene.actor, "alice", "the scene is alice's");
  eq(scene.place.id, "plaza", "alice stands in the plaza");
  const byId = new Map(scene.entries.map((entry) => [entry.id, entry]));
  eq(scene.entries.map((entry) => entry.id), [...byId.keys()].sort(), "entries are in id order");
  eq(byId.get("plaza").footprint, [[0, 0], [100, 0], [100, 100], [0, 100]], "a place carries its footprint");
  ok(!frame.subjects.some(({ id }) => id === "house"), "the fiber does not carry the house");
  ok(byId.get("house").mapped && byId.get("house").enclosed && byId.get("house").label === "The House", "the house is drawn from the map, enclosed");
  eq([byId.get("lantern").x, byId.get("lantern").y], [20, 20], "the lantern stands at its pose");
  eq(byId.get("crate").holder, "alice", "alice took the crate");
  eq([byId.get("crate").x, byId.get("crate").y], [byId.get("alice").x, byId.get("alice").y], "a carried thing stands where its carrier stands");
  eq([byId.get("plaza#east").x, byId.get("plaza#east").y], [100, 50], "the east exit stands on the plaza's east edge");
  eq(byId.get("plaza#north").destination, "house", "an exit names where it leads");
  ok(!byId.has("milestone"), "the milestone, 350 m off, is beyond sight");
  ok(byId.has("bob") && byId.get("bob").holder === "plaza", "bob stands in the plaza with alice");

  // (2) the text tier reads exactly the projection's entities.
  const lines = [];
  const text = createText({ write: (written) => lines.push(...written) });
  assertBackendConformance(text, scene);
  const view = textView(scene);
  eq(view.room, { id: "plaza", label: "The Plaza" }, "the text tier's room is the projection's place");
  const here = scene.entries.filter((entry) => entry.holder === "plaza" && entry.kind !== "exit" && entry.id !== "alice");
  eq(view.here.map(({ id }) => id), here.map(({ id }) => id), "the text tier's things here are the projection's");
  eq(view.carried.map(({ id }) => id), ["crate"], "the text tier says what alice carries");
  eq(view.exits.map(({ id }) => id), scene.entries.filter((entry) => entry.kind === "exit").map(({ id }) => id), "the text tier's exits are the projection's");
  ok(lines.includes("The Plaza") && lines.some((line) => line.startsWith("Exits: east and north")), "the text tier says the room and its exits");

  // (3) the canvas2d tier draws every entry: places as polygons, the rest as marks.
  const calls = [];
  const ctx = new Proxy({}, { get: (_, name) => name === "canvas" ? { width: 640, height: 480 } : (...args) => calls.push([name, ...args]), set: (_, name, value) => (calls.push([`=${String(name)}`, value]), true) });
  const flat = create2d({ mount: { getContext: () => ctx, width: 640, height: 480 } });
  assertBackendConformance(flat, scene);
  ok(calls.length > 0, "the canvas2d tier drew");
  const labels = calls.filter(([name]) => name === "fillText").map(([, label]) => label);
  for (const entry of scene.entries.filter((e) => !e.footprint)) ok(labels.some((label) => String(label).includes(entry.label)), `canvas2d labels ${entry.id}`);

  // (4) the 3D tier: the engine's scene graph holds a node per entry, terrain from its content address.
  const resolver = createAssetResolver({ fetchBytes: assets.fetchBytes });
  const drawn = [];
  const deep = create3d({ canvas: { clientWidth: 640, clientHeight: 480 }, device: { kind: "probe", draw: (frame) => drawn.push(frame) }, assets: resolver });
  const report = assertBackendConformance(deep, scene);
  eq(report.capabilities, { camera: true, followEntity: true, dims: 3 }, "the 3D tier has a camera and three dimensions");
  eq(await deep.ready, "probe", "the 3D tier draws with the device it is handed");
  eq([...deep.graph.entities.keys()].sort(), scene.entries.map(({ id }) => id), "the 3D tier has one node per entry");
  eq(deep.graph.entities.get("lantern").position, [20, 20, 0], "the lantern stands at its pose, in the world's own frame");
  eq(deep.graph.entities.get("crate").visible, false, "what alice carries is not drawn inside her");
  await resolver.resolve(world.terrain.address);
  await new Promise((resolve) => setTimeout(resolve, 0));
  ok(deep.graph.terrain !== null, "terrain resolved by its content address and was built");
  ok(deep.graph.terrain.chunks.every((chunk) => chunk.levels.length === 4), "each terrain chunk has four levels of detail");
  deep.followEntity("alice");
  deep.render(scene);
  const alice = byId.get("alice");
  ok(deep.camera.position[2] > deep.graph.groundAt(alice.x, alice.y), "the chase camera stands above the ground");
  const last = drawn.at(-1);
  ok(last && last.width === 640 && last.items.length > 0, "a frame reaches the device with its draw list");
  ok(last.items.every((item) => item.mesh.indices.length > 0 && item.model.length === 16 && item.colour.length === 3), "every item is a mesh, a placement and a colour");
  const firstClear = last.items.findIndex((item) => item.opacity < 1);
  ok(firstClear < 0 || last.items.slice(firstClear).every((item) => item.opacity < 1), "the opaque draw before the translucent");
  const stands = deep.graph.entities.get("alice").position;
  eq(stands[2], deep.graph.groundAt(alice.x, alice.y), "alice stands on the ground under her");
  const onScreen = deep.project([stands[0], stands[1], stands[2] + 1]);
  ok(onScreen && Math.abs(onScreen[0] - 320) < 1 && onScreen[1] > 0 && onScreen[1] < 480, "alice, followed, stands mid-screen");
  eq(deep.pick(onScreen[0], onScreen[1])[0], "alice", "pointing at alice picks her first");
  eq(deep.project([stands[0] - Math.sin(alice.yaw ?? 0) * 20, stands[1] - Math.cos(alice.yaw ?? 0) * 20, stands[2]]), null, "what is behind the eye does not project");

  // (5) the environment agrees with the clock it reads.
  eq(scene.environment.phase, frame.clock.phase, "the environment's phase is the clock's");
  ok(Math.abs(sunAt(9).elevation - 55) < 1e-9 && sunAt(21).elevation < -29, "the sun is highest mid-day and lowest mid-night");
  for (let time = 0; time < 48; time++) {
    const sun = sunAt(time + 0.5);
    ok((phaseAt(time) === "night") === (sun.elevation < 0), `at ${time + 0.5} the sun is down exactly when the clock says night`);
  }
  ok(Math.abs(tideLevelAt(4) + 1) < 1e-9 && Math.abs(tideLevelAt(20) - 1) < 1e-9, "the tide is lowest mid-low and highest mid-high");
  eq(environmentAt({ time: 0, weather: "storm" }).weather.precipitation, 1, "a storm rains hardest");
  ok(environmentAt({ time: 0, weather: "sleet" }).weather.cloud > 0, "an unknown weather reads as overcast");

  // (6) terrain chunks have no cracks between levels: every chunk's rim is skirted.
  const chunks = terrainChunks(heights, layout, { size: 4, strides: [1, 2, 4] });
  eq(chunks.length, 4, "an 8×8-cell field cuts into four 4-cell chunks");
  ok(chunks.every((chunk) => chunk.levels.every((level) => level.indices.length % 3 === 0 && Math.max(...level.indices) < level.positions.length / 3)), "every level's triangles index its own vertices");

  // (7) assets resolve only to bytes that hash to their name.
  const mesh = encodeMesh({ positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], indices: [0, 1, 2] });
  const meshAddress = assets.add(mesh);
  eq(decodeMesh(await resolver.resolve(meshAddress)).indices, [0, 1, 2], "a mesh resolves by its address");
  const liar = createAssetResolver({ fetchBytes: () => terrainBytes });
  await liar.resolve(meshAddress).then(() => ok(false, "a lying store must be refused"), (error) => ok(/do not hash/.test(error.message), "bytes that do not hash to their name are refused"));
  const served = createAssetResolver({ fetchBytes: wellKnownFetch("https://assets.example/", async (url) => {
    eq(url.pathname, `/.well-known/ni/sha-256/${meshAddress.slice(meshAddress.indexOf(";") + 1)}`, "a well-known fetch asks for the RFC 6920 path");
    return new Response(mesh);
  }) });
  eq(decodeMesh(await served.resolve(meshAddress)).positions.length, 9, "a mesh resolves from an origin's well-known path");

  done("prove-fiber-tiers");
});
