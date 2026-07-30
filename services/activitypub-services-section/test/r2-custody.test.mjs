import assert from "node:assert/strict";
import test from "node:test";
import { createActivityPubR2Custody } from "../src/r2-custody.mjs";

function memoryClient() {
  const objects = new Map();
  const calls = [];
  return {
    calls,
    async get(key) {
      calls.push({ method: "get", key });
      const body = objects.get(key);
      return body === undefined ? null : { body };
    },
    async putCurrent(key, { body }) {
      calls.push({ method: "putCurrent", key });
      objects.set(key, Buffer.from(body));
      return {};
    },
    async list(prefix) {
      calls.push({ method: "list", prefix });
      return { keys: [...objects.keys()].filter((key) => key.startsWith(prefix)) };
    },
    object(key) { return objects.get(key); },
  };
}

test("R2 custody exports no scheduler, history scan, claim, lease, or polling surface", () => {
  const custody = createActivityPubR2Custody({ actor: "provider", client: memoryClient() });
  assert.deepEqual(Object.keys(custody).sort(), ["inbox", "kv"]);
  assert.equal("queue" in custody, false);
  assert.equal("list" in custody.inbox, false);
});

test("retaining one verified arrival is content-addressed immutable custody without a history scan", async () => {
  const client = memoryClient();
  const inbox = createActivityPubR2Custody({ actor: "provider", client }).inbox;
  const arrival = { recipient: "provider", jsonLd: { type: "Create", id: "https://remote.example/one", object: { id: "https://remote.example/object" } } };
  const receipt = await inbox.retain(arrival);
  assert.equal(receipt.type, "ActivityPubVerifiedArrivalReceipt");
  assert.match(receipt.bodySha256, /^[a-f0-9]{64}$/u);
  assert.equal(client.calls.some(({ method }) => method === "list"), false);
  const writes = client.calls.filter(({ method }) => method === "putCurrent");
  assert.equal(writes.length, 1);
  assert.match(writes[0].key, /\/verified-arrivals\/sha256\/[a-f0-9]{64}\.json$/u);
  const retained = JSON.parse(client.object(writes[0].key).toString("utf8"));
  assert.deepEqual(retained.activity, arrival.jsonLd);
  assert.deepEqual(retained.receipt, receipt);
});

test("the same verified arrival is deduplicated only when its immutable receipt bytes match", async () => {
  const client = memoryClient();
  const inbox = createActivityPubR2Custody({ actor: "provider", client }).inbox;
  const arrival = { recipient: "provider", jsonLd: { id: "https://remote.example/one", type: "Create" } };
  const first = await inbox.retain(arrival);
  const second = await inbox.retain({ recipient: "provider", jsonLd: { type: "Create", id: "https://remote.example/one" } });
  assert.deepEqual(second, first);
  assert.equal(client.calls.filter(({ method }) => method === "putCurrent").length, 1);
});

test("a verified receipt retrieves its immutable body directly without a history scan", async () => {
  const client = memoryClient();
  const inbox = createActivityPubR2Custody({ actor: "provider", client }).inbox;
  const arrival = { recipient: "provider", jsonLd: { id: "https://remote.example/one", type: "Create" } };
  const receipt = await inbox.retain(arrival);
  client.calls.length = 0;
  assert.deepEqual(await inbox.get(receipt), { activity: arrival.jsonLd, receipt });
  assert.deepEqual(client.calls.map(({ method }) => method), ["get"]);
});

test("immutable custody refuses a pre-existing different record at its content address", async () => {
  const client = memoryClient();
  const inbox = createActivityPubR2Custody({ actor: "provider", client }).inbox;
  const arrival = { recipient: "provider", jsonLd: { id: "https://remote.example/one", type: "Create" } };
  await inbox.retain(arrival);
  const key = client.calls.find(({ method }) => method === "putCurrent").key;
  client.object(key).fill(0);
  await assert.rejects(() => inbox.retain(arrival), /immutable ActivityPub custody record differs/u);
});
