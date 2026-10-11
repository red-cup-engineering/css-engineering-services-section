// prove-wire-packing — entry packing end to end over real websockets: a room with `pack: true`
// really puts keyed groups on the wire (seen by a raw socket, not the SDK), the packaged client
// decodes them into the same world view a flat room produces, and the same session costs fewer
// bytes (measured through the room's own admin meters, which count the real encoding).

import http from "node:http";
import { test } from "node:test";
import { ok, eq, done } from "./_harness.mjs";
import { createRoom } from "../src/room.mjs";
import { connectRoom } from "../src/client-node.mjs";
import { attachRoomMeters } from "../src/admin.mjs";
import { createDemoWorld } from "./_demo-world.mjs";
import { PACKED_ENTRIES } from "@red-cup-engineering/computer-networking-engineering-services-section/qwzspace/protocol";

test("prove-wire-packing", async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const validate = createDemoWorld().validate;

  async function session(pack) {
    const room = createRoom({ id: `pack-${pack}`, world: createDemoWorld, validate, interest: () => true, intervalMs: 20, pack });
    eq(room.pack, pack, `the room reports pack=${pack}`);
    const meter = attachRoomMeters(room, { pollMs: 5 });
    const server = http.createServer();
    room.attach(server);
    await room.ready;
    await new Promise((res) => server.listen(0, "127.0.0.1", res));
    await wait(100); // this sandbox's listen->connect race, see tests/prove-client-node.mjs's header
    const url = `ws://127.0.0.1:${server.address().port}/`;
    room.start();

    const clients = [0, 1, 2].map((i) => connectRoom(url, { name: `bot-${i}` }));
    await wait(200);
    // A raw socket sees the actual frames -- the SDK's decode is not in the loop here.
    const frames = [];
    const raw = new WebSocket(url);
    raw.addEventListener("message", (ev) => frames.push(String(ev.data)));
    await new Promise((resolve, reject) => { raw.addEventListener("open", resolve); raw.addEventListener("error", reject); });
    raw.send(JSON.stringify({ k: "join", name: "watcher" }));
    await wait(100);
    for (let step = 0; step < 12; step++) {
      for (const client of clients) client.sendIntent("move", { dx: 1, dy: 0 });
      await wait(25);
    }
    await wait(120);
    const views = clients.map((client) => client.view.entities().length);
    const summary = meter.summary();
    for (const client of clients) client.close();
    raw.close();
    meter.stop();
    room.destroy();
    await new Promise((res) => server.close(res));
    return { frames, views, bytes: summary.wire.bytes, messages: summary.wire.messages };
  }

  const flat = await session(false);
  const packed = await session(true);
  const marker = `"${PACKED_ENTRIES}"`;
  ok(!flat.frames.some((frame) => frame.includes(marker)), "a room with pack off never puts keyed groups on the wire (the default is byte-identical to before)");
  ok(packed.frames.some((frame) => frame.includes(marker)), "a room with pack on really carries keyed groups on the wire, as a raw socket sees them");
  ok(flat.views.every((count) => count >= 4), `flat: every SDK client sees all four members (${flat.views.join("/")})`);
  ok(packed.views.every((count) => count >= 4), `packed: every SDK client decodes to the same complete world view (${packed.views.join("/")})`);
  ok(packed.bytes < flat.bytes, `the same session costs fewer measured wire bytes packed (${packed.bytes} B) than flat (${flat.bytes} B)`);
  console.log(`  · wire bytes flat ${flat.bytes} / packed ${packed.bytes} (${((1 - packed.bytes / flat.bytes) * 100).toFixed(1)}% fewer over ${flat.messages}/${packed.messages} messages)`);
  done("prove-wire-packing");
});
