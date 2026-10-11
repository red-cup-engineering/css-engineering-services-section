// prove-client-node — Node's built-in RFC 6455 client (through client-node.mjs) exercised for real: a real
// handshake against a real http-ws-server.mjs server, masked frames sent, unmasked frames received.
// (The end-to-end Room session lives in its own file, prove-client-node-room.mjs, deliberately — this
// sandbox's networking only reliably permits ONE listening server per node process: a second
// `http.createServer().listen()` in the same process, after the first is closed, gets a spurious
// ECONNREFUSED even though `.listening` reports true, confirmed with a raw `net.connect` — a sandbox
// artifact unrelated to this package's code, worked around by giving each server its own process,
// which `npm test`'s runner already does naturally.
//
// SECOND, RELATED sandbox artifact this file also works around: even the FIRST server in a fresh
// process can occasionally be connected-to before this sandbox's own network layer has finished
// making the just-opened port reachable — `server.listen()`'s callback and `.address().port` both
// report success, yet an immediate connect can get a genuine ECONNREFUSED. A short pause between
// listen() resolving and the first connect attempt (below) eliminates it in practice. Node's native WebSocket supplies the error/close lifecycle.

import http from "node:http";
import { ok, eq, done } from "./_harness.mjs";
import { attach } from "../src/http-ws-server.mjs";
import { NodeWebSocket } from "../src/client-node.mjs";
import { test } from "node:test";

test("prove-client-node", async () => {
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// a connection that fails BEFORE ever reaching 'upgrade' (nothing listening) must fire BOTH onerror
// and onclose — matching real WebSocket platform semantics, and load-bearing for client.mjs's
// reconnect logic, which only schedules a retry from onclose (see client-node.mjs's own comment on
// this fix — a genuine bug this test caught: without it, a transient early connect failure would
// permanently strand a createRealtimeClient instance).
{
  const refused = new NodeWebSocket("ws://127.0.0.1:1/"); // port 1: nothing ever listens there
  let gotError = false;
  let gotClose = false;
  refused.onerror = () => (gotError = true);
  refused.onclose = () => (gotClose = true);
  await wait(300);
  ok(gotError, "a failed connection fires onerror");
  ok(gotClose, "a failed connection ALSO fires onclose (matching native WebSocket semantics)");
  eq(refused.readyState, 3, "readyState ends at CLOSED (3), not stuck at CONNECTING (0)");
}

const server = http.createServer();
const received = [];
attach(server, (conn) => {
  conn.onMessage = (text) => {
    received.push(text);
    conn.send(`echo:${text}`);
  };
});
await new Promise((res) => server.listen(0, "127.0.0.1", res));
await wait(100); // see this sandbox's listen->connect race, documented at the top of this file
const port = server.address().port;

const ws = new NodeWebSocket(`ws://127.0.0.1:${port}/`);
const messages = [];
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = (e) => reject(new Error(e.message));
});
ok(true, "NodeWebSocket completes a real RFC 6455 handshake against http-ws-server.mjs");
eq(ws.readyState, 1, "readyState is OPEN after a successful handshake");

await new Promise((resolve) => {
  ws.onmessage = (ev) => {
    messages.push(ev.data);
    resolve();
  };
  ws.send({ message: "hello from node client" });
});
eq(received[0], '{"message":"hello from node client"}', "NodeWebSocket preserves object-to-JSON sends through the native client");
eq(messages[0], 'echo:{"message":"hello from node client"}', "the native client received the server frame");

// a large (>65535 byte) message exercises the 64-bit extended length path both directions.
const big = "y".repeat(70000);
await new Promise((resolve) => {
  ws.onmessage = (ev) => {
    messages.push(ev.data);
    resolve();
  };
  ws.send(big);
});
eq(received[1].length, 70000, "a large (>65535 byte) client->server frame round-trips at full length");
eq(messages[1], `echo:${big}`, "a large server->client echo round-trips at full length");

let closed = false;
ws.onclose = () => (closed = true);
ws.close();
await wait(60);
ok(closed, "close() cleanly closes the connection");

server.close();

done("prove-client-node");
});
