import { createHttpServer } from "@red-cup-engineering/http-services-section/node-server";
// prove-admin — the read-only observability surface (Wave1 §3): attachRoomMeters + createAdminHandler
// exposing members/checkpoints/auditResults/queueDepth/wire counts/tick jitter as JSON and HTML, over
// a real node:http server (not a mocked req/res), with a REAL joined client (not a bare queue.push —
// room.members() is populated by the wire join flow, not by a domain-level presence.join intent; see
// room.mjs's finishJoin) so memberCount reflects something genuine, matching prove-room.mjs's own
// "not a mock transport" discipline.

import http from "node:http";
import { ok, eq, done } from "./_harness.mjs";
import { createRoom } from "../src/room.mjs";
import { attachRoomMeters, createAdminHandler } from "../src/admin.mjs";
import { createDemoWorld } from "./_demo-world.mjs";
import { test } from "node:test";

test("prove-admin", async () => {
async function wait(ms) {
  await new Promise((r) => setTimeout(r, ms));
}
function getJson(port, path) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: "127.0.0.1", port, path }, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
      })
      .on("error", reject);
  });
}
function connectClient(port) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/`);
    ws.addEventListener("open", () => resolve(ws));
    ws.addEventListener("error", reject);
  });
}

const validate = createDemoWorld().validate;
const room = createRoom({ id: "admin-room", world: createDemoWorld, validate, interest: () => true, intervalMs: 20 });
const meter = attachRoomMeters(room, { pollMs: 5 });
const rooms = new Map([[room.id, room]]);
const meters = new Map([[room.id, meter]]);
const handler = createAdminHandler({ rooms, meters, path: "/admin" });

const adminServer = createHttpServer({ handle: (req, res) => {
  if (handler(req, res)) return;
  res.writeHead(404).end();
} });
const roomServer = http.createServer(); // a REAL room transport, separate port, for the join below
room.attach(roomServer);
await room.ready;

try {
  await new Promise((res) => adminServer.listen(0, "127.0.0.1", res));
  await new Promise((res) => roomServer.listen(0, "127.0.0.1", res));
  await wait(100); // this sandbox's listen->connect race, see tests/prove-client-node.mjs's header
  const adminPort = adminServer.address().port;
  const roomPort = roomServer.address().port;
  room.start();

  // a request outside `path` is left completely untouched (`handler` returns false) so a caller can
  // compose this alongside its own routing — proven by getting a 404 from OUR fallback, not admin's.
  const outside = await getJson(adminPort, "/nope");
  eq(outside.status, 404, "a request outside the admin path is not handled by createAdminHandler at all");

  const client = await connectClient(roomPort);
  client.send(JSON.stringify({ k: "join", name: "watcher" }));
  await wait(60);

  const tickBefore = room.tickNow(); // the room auto-ticks the whole time (room.start(), above) — an
  // exact-equality check against a separately-read tickNow() after the HTTP round trip would be a
  // race (found the hard way: intervalMs:20 is fast enough for a real request to span a tick
  // boundary); tick is monotonic, so "at least what it was right before the request" is the honest,
  // race-free invariant to check instead.
  const listing = await getJson(adminPort, "/admin");
  eq(listing.status, 200, "GET /admin returns 200");
  ok(listing.headers["content-type"].includes("application/json"), "GET /admin defaults to JSON");
  const payload = JSON.parse(listing.body);
  eq(payload.rooms.length, 1, "the payload lists exactly the one tracked room");
  const summary = payload.rooms[0];
  eq(summary.id, "admin-room", "the summary is keyed by the room's own id");
  eq(summary.memberCount, 1, "memberCount reflects a REAL joined client, via the wire join flow");
  eq(summary.members[0].name, "watcher", "the member entry carries the name the client actually joined with");
  ok(summary.tick >= tickBefore, "tick reflects the room's own tickNow(), monotonically, not stale/rolled-back");
  ok(Array.isArray(summary.checkpoints), "checkpoints is present as an array (possibly empty)");
  ok(Array.isArray(summary.auditResults), "auditResults is present as an array (possibly empty)");
  ok(typeof summary.queueDepth === "number", "queueDepth is a number");
  ok(summary.wire && typeof summary.wire.messages === "number" && typeof summary.wire.bytes === "number", "wire counts are present from the attached meter");
  ok(summary.wire.messages > 0, "at least one real wire message (the join's snapshot) has been counted");
  ok(summary.tickJitter && typeof summary.tickJitter.samples === "number", "tick-jitter stats are present from the attached meter");

  const single = await getJson(adminPort, "/admin/admin-room");
  eq(JSON.parse(single.body).rooms.length, 1, "GET /admin/<id> narrows to exactly that one room");
  eq(JSON.parse(single.body).rooms[0].id, "admin-room", "the narrowed payload is the right room");

  const missing = await getJson(adminPort, "/admin/does-not-exist");
  eq(missing.status, 404, "GET /admin/<unknown-id> is a 404, not an empty 200");

  const html = await getJson(adminPort, "/admin?html");
  eq(html.status, 200, "GET /admin?html returns 200");
  ok(html.headers["content-type"].includes("text/html"), "the ?html form serves HTML, not JSON");
  ok(html.body.includes("admin-room"), "the HTML table includes the room's id");
  ok(html.body.includes("<table>"), "the HTML response is an actual table, not a JSON dump");

  client.close();
  await wait(30);
} finally {
  meter.stop();
  room.destroy();
  await new Promise((res) => adminServer.close(res));
  await new Promise((res) => roomServer.close(res));
}

done("prove-admin");
});
