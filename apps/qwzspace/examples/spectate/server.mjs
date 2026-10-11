// Spectate composes Qwzspace's room and replay effects with the canonical web
// application. Abrash remains server-rendered because its renderer needs Node
// capabilities; static files, SSE framing, request dispatch, and listener
// lifetime come from the shared web stack.

import { fileURLToPath } from "node:url";
import path from "node:path";

import { createRoom } from "@red-cup-engineering/feltos/operations";
import { replay } from "@red-cup-engineering/computer-content-graph-engineering-services-section/operations-graph";
import { project } from "@red-cup-engineering/html-structural-projection-service";
import { connectRoom } from "@red-cup-engineering/qwzspace/client-node";
import { startNativeApplication } from "@red-cup-engineering/computer-web-server/native-application";
import { staticFiles } from "@red-cup-engineering/computer-web-server/static";
import { sseCommentFrame, sseEventFrame, sseHeaders } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/server-sent-event";

import { createDemoWorld } from "@red-cup-engineering/qwzspace/demo-world";
import { spawnBots } from "./shared/bots.mjs";
import { frameToWire } from "./shared/spectate-render.mjs";
import { createBackend as createAbrashBackend } from "./shared/create-abrash-backend.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.join(__dirname, "web");
const QWZSPACE_SRC = path.join(__dirname, "node_modules", "@red-cup-engineering", "qwzspace", "src");
const ABRASH_SRC = path.join(__dirname, "node_modules", "@red-cup-engineering", "abrash", "src");
const FRAME_WIDTH = 320;
const FRAME_HEIGHT = 200;
const FRAME_MAXDIST = 40;
const DEFAULT_INTERVAL_MS = 150;

async function replayResponse(url, { room, roomId, intervalMs }) {
  try {
    const backend = url.searchParams.get("backend") === "abrash" ? "abrash" : "2d";
    const unsafeRequested = url.searchParams.get("unsafe") === "1";
    const verify = await room.verify();
    const totalTicks = room.tickNow();
    const includeFrames = Boolean(verify.ok) || unsafeRequested;
    const frames = [];
    if (includeFrames) {
      const fresh = createDemoWorld();
      if (backend === "2d") {
        await replay(room.log.all(), {
          subjectsOf: fresh.subjectsOf, snapOf: fresh.snapOf, runTick: fresh.runTick, totalTicks,
          onTick(tick, fullFrame) {
            const scene = project(fullFrame, tick);
            frames.push({ tick: scene.tick, entities: scene.entries });
          },
        });
      } else {
        const abrashMount = {};
        const abrashBackend = createAbrashBackend({ mount: abrashMount, width: FRAME_WIDTH, height: FRAME_HEIGHT, maxDist: FRAME_MAXDIST });
        await replay(room.log.all(), {
          subjectsOf: fresh.subjectsOf, snapOf: fresh.snapOf, runTick: fresh.runTick, totalTicks,
          onTick(tick, fullFrame) {
            const scene = project(fullFrame, tick);
            abrashBackend.render(scene, scene.tick);
            frames.push(frameToWire(abrashMount.frame, scene.tick));
          },
        });
      }
    }
    return Response.json({ ok: true, roomId, backend, verified: Boolean(verify.ok), unsafe: !verify.ok && includeFrames, logHash: verify.logHash, intervalMs, totalTicks, frames }, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return Response.json({ ok: false, error: String(error?.message ?? error) }, { status: 500 });
  }
}

function abrashEventStream(signal, subscribers) {
  let remove = () => {};
  const body = new ReadableStream({
    start(controller) {
      subscribers.add(controller);
      controller.enqueue(sseCommentFrame("connected"));
      remove = () => subscribers.delete(controller);
      signal.addEventListener("abort", remove, { once: true });
    },
    cancel() { remove(); },
  });
  return new Response(body, { headers: sseHeaders() });
}

// The specialized effect: render one Node-only Abrash frame per new room tick,
// then fan that already-rendered frame to its Web-stream subscribers.
function startAbrashLiveLoop(room, subscribers, intervalMs) {
  const abrashMount = {};
  const abrashBackend = createAbrashBackend({ mount: abrashMount, width: FRAME_WIDTH, height: FRAME_HEIGHT, maxDist: FRAME_MAXDIST });
  let lastTick = -1;
  const timer = setInterval(() => {
    const tick = room.tickNow();
    if (tick === lastTick || subscribers.size === 0) return;
    lastTick = tick;
    const scene = project(room.snapshot.full(tick), tick);
    abrashBackend.render(scene, scene.tick);
    const frame = sseEventFrame({ data: JSON.stringify(frameToWire(abrashMount.frame, scene.tick)) });
    for (const controller of [...subscribers]) {
      try { controller.enqueue(frame); } catch { subscribers.delete(controller); }
    }
  }, Math.max(10, Math.floor(intervalMs / 4)));
  timer.unref?.();
  return () => clearInterval(timer);
}

function spectateApplication(room, context) {
  const web = staticFiles({ root: WEB_ROOT, cacheControl: "no-store" });
  const qwzspace = staticFiles({ root: QWZSPACE_SRC, basePath: "/qwzspace", cacheControl: "no-store" });
  const abrash = staticFiles({ root: ABRASH_SRC, basePath: "/abrash", cacheControl: "no-store" });
  return {
    resources: [
      { match: "/live/abrash-frames", methods: ["GET"], handler: ({ signal }) => abrashEventStream(signal, context.subscribers) },
      { match: (pathname) => pathname.startsWith("/replay/") ? {} : false, methods: ["GET"], handler: ({ url }) => replayResponse(url, context) },
      { match: (pathname) => pathname.startsWith("/qwzspace/") ? {} : false, methods: ["GET", "HEAD"], handler: qwzspace },
      { match: (pathname) => pathname.startsWith("/abrash/") ? {} : false, methods: ["GET", "HEAD"], handler: abrash },
      { match: () => ({}), methods: ["GET", "HEAD"], handler: web },
    ],
  };
}

export async function startSpectateServer({
  port = 0,
  host = "127.0.0.1",
  botCount = 20,
  seed = 561,
  intervalMs = DEFAULT_INTERVAL_MS,
  roomId = "spectate-arena",
} = {}) {
  const room = createRoom({
    id: roomId,
    world: createDemoWorld,
    validate: createDemoWorld().validate,
    interest: () => true,
    intervalMs,
    ringBufferTicks: 300,
    resumeGraceTicks: 300,
  });
  const subscribers = new Set();
  const context = { room, roomId, intervalMs, subscribers };
  const application = spectateApplication(room, context);
  await room.ready;
  const running = await startNativeApplication(application, { port, host });
  room.attach(running.server);
  const url = `ws://${host}:${running.port}/`;
  room.start();
  const stopAbrashLoop = startAbrashLiveLoop(room, subscribers, intervalMs);
  const bots = spawnBots(connectRoom, url, botCount, seed);
  let closed = false;
  async function close() {
    if (closed) return;
    closed = true;
    stopAbrashLoop();
    for (const bot of bots) bot.close();
    for (const controller of subscribers) { try { controller.close(); } catch {} }
    subscribers.clear();
    room.stop();
    room.destroy();
    await running.close();
  }
  return { httpServer: running.server, room, roomId, url, host, port: running.port, intervalMs, subscribers, bots, close };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const port = Number(process.env.PORT) || 8787;
  const botCount = Number(process.env.SPECTATE_BOTS) || 20;
  startSpectateServer({ port, botCount })
    .then(({ url, port: actualPort, roomId }) => {
      console.log(`spectate: room "${roomId}" running, ${botCount} bots, tick=${DEFAULT_INTERVAL_MS}ms`);
      console.log(`spectate: ws  ${url}`);
      console.log(`spectate: web http://127.0.0.1:${actualPort}/`);
    })
    .catch((e) => {
      console.error("spectate: failed to start —", e);
      process.exit(1);
    });
}
