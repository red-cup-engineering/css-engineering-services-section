import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createR2OnchainExternalBodyStore } from "../src/onchain-r2-external-body.mjs";

test("R2 external-body adapter uses a proof-carrying content path and refuses locator or byte substitution", async () => {
  const configuration = { accountId: "account", bucket: "bucket", token: "token" };
  const objects = new Map();
  const remoteClient = {
    async get(key) { return objects.has(key) ? { body: objects.get(key) } : null; },
    async putCurrent(key, value) { objects.set(key, Buffer.from(value.body)); return { conflict: false }; },
  };
  const store = createR2OnchainExternalBodyStore(configuration, { client: remoteClient });
  const body = Buffer.from("external body");
  const digest = `0x${createHash("sha256").update(body).digest("hex")}`;
  const stored = await store.put({ body, digest, mediaType: "application/json" });
  assert.match(stored.locator, /activitypub-services-section%2Fonchain-data-resource-service%2Fexternal-bodies%2Fsha256/u);
  assert.deepEqual((await store.get({ locator: stored.locator, digest })).body, body);
  await assert.rejects(store.get({ locator: "https://foreign.example/object", digest }), /outside the configured R2 custody boundary/u);
  objects.set([...objects.keys()][0], Buffer.from("substitution"));
  await assert.rejects(store.get({ locator: stored.locator, digest }), /does not match its onchain digest/u);
});
