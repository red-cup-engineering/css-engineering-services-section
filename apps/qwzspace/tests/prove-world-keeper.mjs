import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "node:http";
import { keepWorld, TICKS_OWED_HEADER } from "../src/world-keeper.mjs";

// One host standing in for the durable world: it pays 20 ticks a visit out of what elapsed time owes,
// forgives past 60 owed, and reports what remains, as feltos world-host/worker does. `reports: false`
// stands in for a host that predates the header.
const host = { ticks: 0, owed: 0, reports: true };
let server;
let url;

before(async () => {
  server = createServer((_request, response) => {
    const pay = Math.min(host.owed, 20);
    host.ticks += pay;
    host.owed -= pay;
    response.writeHead(200, { "content-type": "application/json", ...(host.reports ? { [TICKS_OWED_HEADER]: String(host.owed) } : {}) });
    response.end(JSON.stringify({ present: { total: 0, names: [] } }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const absent = (elapsedTicks) => Object.assign(host, { ticks: 0, owed: Math.min(elapsedTicks, 60), reports: true });

test("a keeper visit pays a long absence down to nothing, with no hand on the world", async () => {
  absent(86_400);
  const result = await keepWorld({ url });
  assert.deepEqual({ visits: result.visits, owed: result.owed }, { visits: 3, owed: 0 });
  assert.equal(host.ticks, 60);
});

test("a world that owes nothing is visited once; a host that does not report owed time is visited once", async () => {
  absent(0);
  assert.equal((await keepWorld({ url })).visits, 1);
  absent(60);
  host.reports = false;
  const result = await keepWorld({ url });
  assert.deepEqual({ visits: result.visits, owed: result.owed }, { visits: 1, owed: null });
});

test("visits are bounded and an unreachable world is an error, not a silent success", async () => {
  absent(60);
  assert.equal((await keepWorld({ url, maxVisits: 2 })).owed, 20);
  await assert.rejects(keepWorld({ url: "http://x", fetch: async () => new Response("no", { status: 502 }) }), /502/);
});
