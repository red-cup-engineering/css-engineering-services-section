import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:net";
import test from "node:test";
import { generateActorKeyMaterial } from "../src/keys.mjs";
import { MemoryKvStore } from "../src/runtime-adapters.mjs";
import { serveActivityPubProvider } from "../src/server.mjs";

async function freePort() {
  const socket = createServer();
  await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
  const selected = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return selected;
}

test("the public provider package serves one actor and refuses unsigned delivery", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "activitypub-provider-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const keyPath = path.join(directory, "keys.json");
  await writeFile(keyPath, JSON.stringify(await generateActorKeyMaterial()), { mode: 0o600 });
  const items = [];
  const inbox = {
    async retain(arrival) { items.unshift(arrival.jsonLd); },
    async list({ cursor, limit }) {
      const offset = cursor === undefined ? 0 : Number(cursor);
      const page = items.slice(offset, offset + limit);
      return { items: page, totalItems: items.length, ...(offset + page.length < items.length ? { nextCursor: String(offset + page.length) } : {}) };
    },
  };
  const service = await serveActivityPubProvider({
    origin: "https://receiver.example",
    identifier: "receiver",
    actorName: "Receiver",
    summary: "Independent receiver test.",
    keyPath,
    bearerToken: "bounded-test-token-with-at-least-32-characters",
    hostname: "127.0.0.1",
    port: await freePort(),
    kv: new MemoryKvStore(),
    inbox,
    inboxIndex: inbox,
    testOnlyInProcess: true,
  });
  t.after(() => service.close());
  const actor = await service.provider.fetch(new Request("https://receiver.example/actors/receiver", { headers: { accept: "application/activity+json" } }));
  assert.equal(actor.status, 200);
  assert.equal((await actor.json()).inbox, "https://receiver.example/actors/receiver/inbox");
  const refused = await service.provider.fetch(new Request("https://receiver.example/actors/receiver/inbox", {
    method: "POST",
    headers: { "content-type": "application/activity+json" },
    body: JSON.stringify({ "@context": "https://www.w3.org/ns/activitystreams", id: "https://sender.example/activities/1", type: "Create", actor: "https://sender.example/actor", to: "https://receiver.example/actors/receiver", object: { type: "Note" } }),
  }));
  assert.equal(refused.status, 401);
});
