/** Compose Qwzspace's single-writer tick with canonical Web application routes. */
import { createWebApplication } from "@red-cup-engineering/computer-web-platform/application";
import { sseCommentFrame, sseEventFrame, sseHeaders } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/server-sent-event";
import { createIntentQueue } from "./intent-queue.mjs";
import { createSnapshotManager } from "./snapshot-manager.mjs";
import { createBroadcastHub } from "./broadcast-hub.mjs";
import { startTickDriver } from "./tick-driver.mjs";
import { attach as wsAttach, wsClient } from "./http-ws-server.mjs";
import { encode } from "@red-cup-engineering/computer-networking-engineering-services-section/qwzspace/protocol";

const encoder = new TextEncoder();
const sseFrame = (value, pack) => encoder.encode(sseEventFrame({ data: typeof value === "string" ? value : encode(value, { pack }) }));
const sseComment = (value) => encoder.encode(sseCommentFrame(value));

/**
 * Build one realtime capability: its queue, settled snapshots, broadcast hub and
 * HTTP/WebSocket projections all share the same tick state. `transport` selects
 * the public projections: `sse`, `ws`, or `both`.
 */
export function createServer({
  transport = "sse",
  runTick,
  subjectsOf,
  snapOf,
  validate,
  interest = null,
  bootstrap = null,
  intervalMs = 200,
  heartbeatMs = 15_000,
  onJoin = null,
  pack = false,
  eventsPath = "/events",
  actPath = "/act",
  healthPath = "/health",
  autoStart = false,
} = {}) {
  if (typeof runTick !== "function") throw new TypeError("create-server: runTick is required");
  if (!["sse", "ws", "both"].includes(transport)) throw new TypeError(`create-server: unknown transport "${transport}" (use "sse", "ws", or "both")`);

  const queue = createIntentQueue({ validate });
  const snapshot = createSnapshotManager({ subjectsOf, snapOf, interest });
  const hub = createBroadcastHub();
  const perSubscriber = interest != null;
  let tick = 0;
  let running = null;
  const tickNow = () => tick;

  async function step() {
    const next = tick + 1;
    const intents = queue.drain();
    const result = (await runTick(next, intents)) ?? {};
    tick = next;
    if (perSubscriber) {
      await snapshot.resettle(result.dirty ?? [], tick);
      hub.each((client, subscriber) => {
        if (!subscriber) return;
        const delta = subscriber.delta(tick, client.lastSeq ?? 0);
        if (delta.entities.length || delta.removed.length) hub.send(client, delta);
      });
    } else {
      const delta = await snapshot.resettle(result.dirty ?? [], tick);
      if (delta.entities.length || delta.removed.length) hub.broadcast(delta);
    }
    for (const event of result.events ?? []) hub.broadcast(event);
    return result;
  }

  async function start() {
    if (running) return running;
    const driver = await startTickDriver({ hub, snapshot, queue, runTick, bootstrap, intervalMs, heartbeatMs, perSubscriber });
    tick = driver.tickNow();
    running = Object.freeze({
      stop() { driver.stop(); running = null; },
      tickNow() { tick = driver.tickNow(); return tick; },
    });
    return running;
  }

  const api = { queue, snapshot, hub, step, start, tickNow, pack };
  const resources = [
    {
      match: actPath,
      methods: ["POST"],
      body: { maxBytes: 64 * 1024 },
      handler: async ({ input }) => queue.push(await input.json()) ? new Response(null, { status: 204 }) : new Response(null, { status: 400 }),
    },
    {
      match: healthPath,
      methods: ["GET"],
      handler: () => Response.json({ status: "ok", tick: tickNow(), subscribers: hub.size() }),
    },
  ];
  if (transport === "sse" || transport === "both") {
    resources.unshift({
      match: eventsPath,
      methods: ["GET"],
      handler: ({ request }) => {
        let remove = () => {};
        const body = new ReadableStream({
          start(controller) {
            const client = {
              lastSeq: 0,
              send(value) { try { controller.enqueue(sseFrame(value, pack)); return true; } catch { return false; } },
              heartbeat() { try { controller.enqueue(sseComment("ping")); return true; } catch { return false; } },
            };
            remove = hub.add(client);
            const subscriber = snapshot.subscribe?.(client);
            if (subscriber) hub.bind(client, subscriber);
            client.send(subscriber ? subscriber.full(tickNow()) : snapshot.full(tickNow()));
            request.signal.addEventListener("abort", remove, { once: true });
          },
          cancel() { remove(); },
        });
        return new Response(body, { headers: sseHeaders() });
      },
    });
  }
  api.app = createWebApplication({ resources });
  api.ready = (async () => { await snapshot.bootstrap(tick); if (autoStart) await start(); })();

  if (transport === "ws" || transport === "both") {
    api.attach = (httpServer) => wsAttach(httpServer, (conn) => {
      const client = wsClient(conn, { pack });
      const remove = hub.add(client);
      const subscriber = snapshot.subscribe?.(conn);
      if (subscriber) hub.bind(client, subscriber);
      if (typeof onJoin === "function") onJoin(conn, { hub, queue, snapshot, client, tickNow });
      else conn.onMessage = (text) => { try { queue.push(JSON.parse(text)); } catch {} };
      conn.onClose = remove;
      hub.send(client, subscriber ? subscriber.full(tickNow()) : snapshot.full(tickNow()));
    });
  }
  return Object.freeze(api);
}
