import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  OnchainResourceClient,
  createOnchainInbox,
  createOnchainKvStore,
  createOnchainMessageQueue,
  createOnchainOutbox,
} from "../src/onchain.mjs";
import { createR2OnchainExternalBodyStore } from "../src/onchain-r2-external-body.mjs";
import { settlementPulseActivity } from "../src/onchain-server.mjs";

class FakeResourceClient {
  constructor() {
    this.resources = new Map();
  }

  key(path) {
    return JSON.stringify(path);
  }

  async get(path) {
    const body = this.resources.get(this.key(path));
    return body === undefined ? undefined : { body, mediaType: "application/json", version: 1 };
  }

  async put(path, body) {
    this.resources.set(this.key(path), body);
    return { transaction: "0x01", blockNumber: 1 };
  }
}

function transaction() {
  return {
    hash: "0xtx",
    async wait() { return { status: 1, blockNumber: 7, blockHash: "0xblock", index: 2 }; },
  };
}

function fakeContract() {
  let selected;
  const calls = [];
  return {
    calls,
    runner: {
      async getAddress() { return `0x${"1".repeat(40)}`; },
      provider: { async getTransactionCount() { return 3; } },
    },
    async writePrice() { return 5n; },
    async describe() {
      return selected ?? { controller: `0x${"0".repeat(40)}` };
    },
    async publishInline(resource, mediaType, body, payment) {
      calls.push({ method: "inline", resource, mediaType, body, payment });
      selected = {
        controller: `0x${"1".repeat(40)}`,
        version: 1n,
        externalBody: false,
        mediaType,
        body,
        locator: "",
        sha256Digest: `0x${createHash("sha256").update(body).digest("hex")}`,
      };
      return transaction();
    },
    async publishExternal(resource, mediaType, locator, sha256Digest, payment) {
      calls.push({ method: "external", resource, mediaType, locator, sha256Digest, payment });
      selected = {
        controller: `0x${"1".repeat(40)}`,
        version: 1n,
        externalBody: true,
        mediaType,
        body: "",
        locator,
        sha256Digest,
      };
      return transaction();
    },
  };
}

test("ERC-5219 custody keeps bounded values inline and externalizes larger values with exact digest verification", async () => {
  const contract = fakeContract();
  const remote = new Map();
  const externalBodies = {
    async put({ body, digest }) { remote.set(digest, Buffer.from(body)); return { locator: `https://custody.example/${digest}` }; },
    async get({ digest }) { return { body: remote.get(digest) }; },
  };
  const client = new OnchainResourceClient({ contract, externalBodies, inlineBodyLimitBytes: 4 });
  await client.put(["small"], "four");
  assert.equal(contract.calls[0].method, "inline");
  const settlement = await client.put(["large"], "five!");
  assert.equal(contract.calls[1].method, "external");
  assert.equal(contract.calls[1].sha256Digest, settlement.digest);
  assert.equal((await client.get(["large"])).body, "five!");
  remote.set(settlement.digest, Buffer.from("wrong"));
  await assert.rejects(client.get(["large"]), /does not match its onchain SHA-256 digest/u);
});

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

test("Fedify KV state is reconstructed from actor-owned ERC-5219 resources", async () => {
  const client = new FakeResourceClient();
  const first = createOnchainKvStore({ client, actor: "settlement-pulse" });
  await first.set(["fedify", "idempotence", "activity-1"], { received: true });
  assert.deepEqual(await first.get(["fedify", "idempotence", "activity-1"]), { received: true });

  const reconstructed = createOnchainKvStore({ client, actor: "settlement-pulse" });
  assert.deepEqual(await reconstructed.get(["fedify", "idempotence", "activity-1"]), { received: true });
  const listed = [];
  for await (const entry of reconstructed.list(["fedify", "idempotence"])) listed.push(entry);
  assert.equal(listed.length, 1);
  await reconstructed.delete(["fedify", "idempotence", "activity-1"]);
  assert.equal(await reconstructed.get(["fedify", "idempotence", "activity-1"]), undefined);
});

test("verified inbox activities persist in newest-first ActivityStreams order", async () => {
  const client = new FakeResourceClient();
  const inbox = createOnchainInbox({ client, actor: "settlement-pulse" });
  await inbox.retain({ jsonLd: { id: "https://remote.example/1", type: "Create" } });
  await inbox.retain({ jsonLd: { id: "https://remote.example/2", type: "Create" } });
  const page = await inbox.list({ limit: 1 });
  assert.equal(page.totalItems, 2);
  assert.equal(page.items[0].id, "https://remote.example/2");
  assert.equal(page.nextCursor, "1");
});

test("verified arrivals settle onchain and project one public outbox pulse", async () => {
  const client = new FakeResourceClient();
  const inbox = createOnchainInbox({ client, actor: "settlement-pulse" });
  const outbox = createOnchainOutbox({ client, actor: "settlement-pulse" });
  const settlement = await inbox.retain({ jsonLd: { id: "https://remote.example/1", type: "Create" } });
  assert.equal(settlement.transaction, "0x01");
  const activity = settlementPulseActivity({
    origin: "https://bare-cedar-fog.561.group",
    actor: "settlement-pulse",
    chain: "eip155:5615610",
    settlement: { ...settlement, digest: "0xab", blockHash: "0x02", transactionIndex: 3 },
    announced: "https://remote.example/1",
  });
  assert.equal(activity.type, "Create");
  assert.equal(activity.actor, "https://bare-cedar-fog.561.group/actors/settlement-pulse");
  assert.equal(activity.to, "https://www.w3.org/ns/activitystreams#Public");
  assert.equal(activity.id, "https://bare-cedar-fog.561.group/activities/eip155%3A5615610/02/3");
  const commitment = JSON.parse(activity.object.content);
  assert.equal(commitment.transactionHash, "0x01");
  assert.equal(commitment.sha256Digest, "0xab");
  assert.equal(commitment.announcedActivity, "https://remote.example/1");
  await outbox.publish(activity);
  const listed = await outbox.list({ limit: 10 });
  assert.equal(listed.totalItems, 1);
  assert.equal(listed.items[0].id, activity.id);
  await outbox.publish({ ...activity, published: "2026-07-27T00:00:00.000Z" });
  assert.equal((await outbox.list({ limit: 10 })).totalItems, 1);
});

test("onchain queue continuously settles work enqueued after its listener starts", async () => {
  const client = new FakeResourceClient();
  const queue = createOnchainMessageQueue({ client, actor: "settlement-pulse", name: "inbox", pollMilliseconds: 1 });
  const controller = new AbortController();
  const listening = queue.listen((message) => {
    assert.equal(message.id, "one");
    controller.abort();
  }, { signal: controller.signal });
  await queue.enqueue({ type: "inbox", id: "one" });
  assert.deepEqual(await queue.getDepth(), { queued: 1 });
  await listening;
  assert.deepEqual(await queue.getDepth(), { queued: 0 });
});
