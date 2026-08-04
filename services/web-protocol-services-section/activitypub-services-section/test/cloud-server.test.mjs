import assert from "node:assert/strict";
import test from "node:test";
import { serveCloudActivityPubProvider } from "../src/cloud-server.mjs";

test("cloud server injects network custody, durable queue, and its private consumer route", async () => {
  const calls = [];
  const queue = { consume: (request) => new Response(request.url), listen: async () => {} };
  const provider = { federation: { startQueue: async () => {} } };
  const running = await serveCloudActivityPubProvider({
    environment: {
      ACTIVITYPUB_IDENTIFIER: "codex",
      ACTIVITYPUB_ACTOR_NAME: "Codex",
      ACTIVITYPUB_ACTOR_SUMMARY: "Cloud ActivityPub face",
      ACTIVITYPUB_KEYS_PATH: "/secrets/activitypub/keys.json",
    },
    runtime: { origin: "https://bare-cedar-fog.561.group", targetUrl: "https://bare-cedar-fog.561.group/_private/activitypub-worker", queue },
    custody: { kv: { get() {} }, inbox: { retain() {} } },
    serve: async (options) => { calls.push(options); return { provider }; },
  });
  assert.equal(running.provider, provider);
  assert.equal(calls[0].identifier, "codex");
  assert.equal(calls[0].queue, queue);
  assert.equal(calls[0].workerRoute.path, "/_private/activitypub-worker");
  assert.equal((await calls[0].listOutbox()).items.length, 0);
});
