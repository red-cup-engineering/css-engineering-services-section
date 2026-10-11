import http from "node:http";
import net from "node:net";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { FrameDecoder } from "@red-cup-engineering/code-websocket-frame-service";
import { attach } from "../src/http-ws-server.mjs";
import { eq, ok, done } from "./_harness.mjs";

function connectWhenReady(port, attempts = 100) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, "127.0.0.1");
    socket.once("connect", () => resolve(socket));
    socket.once("error", (error) => {
      socket.destroy();
      if (error.code !== "ECONNREFUSED" || attempts === 0) reject(error);
      else setImmediate(() => resolve(connectWhenReady(port, attempts - 1)));
    });
  });
}

function masked(opcode, text, fin = true) {
  const payload = Buffer.from(text);
  const mask = randomBytes(4);
  const out = Buffer.allocUnsafe(6 + payload.length);
  out[0] = (fin ? 0x80 : 0) | opcode;
  out[1] = 0x80 | payload.length;
  mask.copy(out, 2);
  for (let i = 0; i < payload.length; i++) out[6 + i] = payload[i] ^ mask[i & 3];
  return out;
}

test("prove-http-ws-server", { timeout: 2000 }, async () => {
  const received = [];
  let peer = null;
  let resolveMessage;
  let resolveClose;
  const message = new Promise((resolve) => { resolveMessage = resolve; });
  const closed = new Promise((resolve) => { resolveClose = resolve; });
  const server = http.createServer();
  attach(server, (conn) => {
    peer = conn.socket;
    conn.onMessage = (text) => { received.push(text); resolveMessage(); };
    conn.onClose = resolveClose;
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  let socket;
  try {
    socket = await connectWhenReady(server.address().port);
    const decoder = new FrameDecoder();
    let upgraded = false;
    let resolveUpgrade;
    let resolvePong;
    const upgradedPromise = new Promise((resolve) => { resolveUpgrade = resolve; });
    const pong = new Promise((resolve) => { resolvePong = resolve; });
    socket.on("data", (chunk) => {
      if (!upgraded) {
        const marker = chunk.indexOf("\r\n\r\n");
        if (marker < 0) return;
        upgraded = true;
        resolveUpgrade();
        for (const frame of decoder.push(chunk.subarray(marker + 4))) if (frame.opcode === 0xA && frame.payload.toString() === "p") resolvePong();
      } else for (const frame of decoder.push(chunk)) if (frame.opcode === 0xA && frame.payload.toString() === "p") resolvePong();
    });
    const first = masked(0x1, "hel", false);
    socket.write(Buffer.concat([Buffer.from("GET / HTTP/1.1\r\nHost: localhost\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n"), first.subarray(0, 4)]));
    await upgradedPromise;
    ok(upgraded, "server accepts the upgrade and drains its initial head bytes");

    socket.write(Buffer.concat([first.subarray(4), masked(0x9, "p"), masked(0x0, "lo")]));
    await Promise.all([message, pong]);
    eq(received, ["hello"], "split chunks and a fragmented text message are reassembled once");
    ok(true, "server answers a masked ping with pong");

    socket.write(masked(0x8, ""));
    await closed;
    ok(true, "close frame closes the room connection exactly once");
    done("prove-http-ws-server");
  } finally {
    socket?.destroy();
    peer?.destroy();
    server.closeAllConnections();
    server.close();
    server.unref();
  }
});
