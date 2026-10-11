// The island demo's client: fetch alice's perception frame and the island's description, project the
// fiber once, and draw it with the 3D tier, the text tier beside it as the supplement.

import { createAssetResolver, wellKnownFetch } from "../../../src/assets.mjs";
import { environmentAt } from "../../../src/environment.mjs";
import { projectFiber } from "../../../src/fiber.mjs";
import { createBackend } from "../../../src/render-3d.mjs";
import { createDevice, probeDrawing, selectRung } from "../../../src/scene-view.mjs";
import { createBackend as createTextBackend } from "../../../src/render-text.mjs";

const query = new URLSearchParams(location.search);
const time = Number(query.get("time") ?? 9);
const status = { ready: false, graphics: null, terrain: false, lines: [], error: null };
globalThis.island = status;
const panel = document.getElementById("text");

try {
  const [frame, world] = await Promise.all([
    fetch(`/frame.json?${new URLSearchParams({ time: String(time), ...(query.get("weather") ? { weather: query.get("weather") } : {}) })}`).then((r) => r.json()),
    fetch("/world.json").then((r) => r.json()),
  ]);
  const scene = projectFiber(frame, world);
  const assets = createAssetResolver({ fetchBytes: wellKnownFetch(location.origin) });
  // The ladder's 3D rungs, richest first: WebGPU, else WebGL2 (`webgl=1` asks for WebGL2 outright).
  const canvas = document.getElementById("view");
  const probe = await probeDrawing();
  const failed = [];
  let device = null;
  for (let rung = selectRung({ ...probe, requested: query.get("webgl") === "1" ? "webgl2" : null }); !device && /^web/.test(rung); rung = selectRung({ ...probe, requested: query.get("webgl") === "1" ? "webgl2" : null, failed })) {
    try {
      device = await createDevice(canvas, rung);
    } catch (error) {
      console.warn(`island: no ${rung} rung`, error);
    }
    if (!device) failed.push(rung);
  }
  const view = createBackend({ canvas, assets, device });
  const text = createTextBackend({
    write(lines) {
      status.lines = lines;
      panel.replaceChildren(...lines.map((line) => Object.assign(document.createElement("p"), { textContent: line })));
    },
  });
  text.render(scene);
  if (query.get("view") === "overview") view.setCamera({ x: 900, y: -1700, z: 420, heading: -28, pitch: -16 });

  status.graphics = await view.ready;
  await assets.resolve(world.terrain.address);
  const started = performance.now();
  const draw = () => {
    // Animating runs the sky and the tide on between frames; the fiber itself is the one sent.
    const now = query.get("animate") === "1" ? time + (performance.now() - started) / 1000 : time;
    view.render(now === time ? scene : { ...scene, environment: environmentAt({ ...frame.clock, time: now }, world) });
    status.terrain = view.graph.terrain !== null;
    status.ready = status.terrain;
    requestAnimationFrame(draw);
  };
  draw();
} catch (error) {
  const message = "The island could not be displayed.";
  status.lines = [message];
  panel.replaceChildren(Object.assign(document.createElement("p"), { textContent: message }));
  status.error = String(error?.stack ?? error);
  throw error;
}
