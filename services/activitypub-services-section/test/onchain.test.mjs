import assert from "node:assert/strict";
import test from "node:test";
import {
  createOnchainInbox,
  createOnchainKvStore,
  createOnchainMessageQueue,
  createOnchainOutbox,
} from "../src/onchain.mjs";
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

test("onchain queue settles the presently observed pending work", async () => {
  const client = new FakeResourceClient();
  const queue = createOnchainMessageQueue({ client, actor: "settlement-pulse", name: "inbox" });
  await queue.enqueue({ type: "inbox", id: "one" });
  assert.deepEqual(await queue.getDepth(), { queued: 1 });
  await queue.listen((message) => {
    assert.equal(message.id, "one");
  });
  assert.deepEqual(await queue.getDepth(), { queued: 0 });
});
