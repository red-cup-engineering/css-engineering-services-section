import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { MemoryKvStore } from "@fedify/fedify";
import { semanticBytes } from "@red-cup-engineering/rmn-semantic-conformance";
import { encodeRelationalValue } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { rawNi } from "@red-cup-engineering/a2a-rmn-part-service";
import { createActivityPubProvider, importActorKeyPairs } from "../src/provider.mjs";
import { ACTIVITYSTREAMS_PUBLIC, extractRmnActivity, projectRmnActivity } from "../src/rmn-activity.mjs";
import { generateActorKeyMaterial } from "../src/keys.mjs";
import { loadActivityPubOutbox, serveActivityPubProvider } from "../src/server.mjs";
import { deliverFromEnvironment } from "../src/deliver.mjs";

async function fixture() {
  return createActivityPubProvider({
    identifier: "metroplat",
    actorName: "Test Settlement",
    summary: "A sovereign settlement hiring an ActivityPub face.",
    keyPairs: await importActorKeyPairs(await generateActorKeyMaterial()),
    kv: new MemoryKvStore(),
    onActivity: async () => { throw new Error("unsigned activity reached the customer"); },
    authorizeInbox: ({ request }) => request.headers.get("authorization") === "Bearer test-client-token-with-at-least-32-characters",
    listInbox: async () => ({ items: [], totalItems: 0 }),
    listOutbox: async () => ({ items: [] }),
  });
}

function networkAdapters() {
  const items = [];
  return {
    kv: new MemoryKvStore(),
    inbox: {
      async retain(arrival) { items.unshift(arrival.jsonLd); },
      async list({ cursor, limit }) {
        const offset = cursor === undefined ? 0 : Number(cursor);
        const page = items.slice(offset, offset + limit);
        const nextOffset = offset + page.length;
        return { items: page, totalItems: items.length, ...(nextOffset < items.length ? { nextCursor: String(nextOffset) } : {}) };
      },
    },
  };
}

test("Fedify derives WebFinger, actor, outbox, and NodeInfo from one customer contract", async () => {
  const provider = await fixture();
  const webfinger = await provider.fetch(new Request(
    "https://example.test/.well-known/webfinger?resource=acct:metroplat@example.test",
    { headers: { accept: "application/jrd+json" } },
  ));
  assert.equal(webfinger.status, 200);
  assert.equal((await webfinger.json()).links[0].href, "https://example.test/actors/metroplat");

  const actor = await provider.fetch(new Request("https://example.test/actors/metroplat", {
    headers: { accept: "application/activity+json" },
  }));
  assert.equal(actor.status, 200);
  const actorDocument = await actor.json();
  assert.equal(actorDocument.type, "Service");
  assert.equal(actorDocument.inbox, "https://example.test/actors/metroplat/inbox");
  assert.equal(actorDocument.endpoints.sharedInbox, "https://example.test/inbox");
  assert.equal(actorDocument.assertionMethod.length, 2);

  const outbox = await provider.fetch(new Request("https://example.test/actors/metroplat/outbox", {
    headers: { accept: "application/activity+json" },
  }));
  assert.equal(outbox.status, 200);
  assert.equal((await outbox.json()).type, "OrderedCollection");

  const nodeInfo = await provider.fetch(new Request("https://example.test/nodeinfo/2.1", {
    headers: { accept: "application/json" },
  }));
  assert.equal(nodeInfo.status, 200);
  assert.deepEqual((await nodeInfo.json()).protocols, ["activitypub"]);
});

test("a customer may bind the actor to one stable cell identity and sovereign controller", async () => {
  const cell = `ni:///sha-256;${"A".repeat(43)}`;
  const controller = "did:pkh:eip155:5615610:0x1111111111111111111111111111111111111111";
  const provider = createActivityPubProvider({
    identifier: "bound-cell",
    actorName: "Bound Cell",
    summary: "A cell with explicit identity bindings.",
    cell,
    controller,
    keyPairs: await importActorKeyPairs(await generateActorKeyMaterial()),
    kv: new MemoryKvStore(),
    onActivity: async () => {},
    authorizeInbox: async () => false,
    listInbox: async () => ({ items: [], totalItems: 0 }),
    listOutbox: async () => ({ items: [] }),
  });
  const response = await provider.fetch(new Request("https://example.test/actors/bound-cell", {
    headers: { accept: "application/activity+json" },
  }));
  const actor = await response.json();
  assert.deepEqual(actor.attachment.map(({ name, value }) => ({ name, value })), [
    { name: "Capability Cell", value: cell },
    { name: "Controller", value: controller },
  ]);
  const brokenKeyPairs = await importActorKeyPairs(await generateActorKeyMaterial());
  assert.throws(() => createActivityPubProvider({
    identifier: "broken",
    actorName: "Broken",
    summary: "Missing controller.",
    cell,
    keyPairs: brokenKeyPairs,
    onActivity: async () => {},
    authorizeInbox: async () => false,
    listInbox: async () => ({ items: [], totalItems: 0 }),
    listOutbox: async () => ({ items: [] }),
  }), /controller/u);
});

test("an unsigned inbox POST is refused before the customer callback", async () => {
  const provider = await fixture();
  const response = await provider.fetch(new Request("https://example.test/actors/metroplat/inbox", {
    method: "POST",
    headers: { "content-type": "application/activity+json" },
    body: JSON.stringify({
      "@context": "https://www.w3.org/ns/activitystreams",
      id: "https://remote.test/activities/1",
      type: "Create",
      actor: "https://remote.test/actors/alice",
      object: { type: "Note", content: "unsigned" },
      to: "https://example.test/actors/metroplat",
    }),
  }));
  assert.equal(response.status, 401);
});

test("a standard ActivityStreams Link carries canonical RMN bytes and names the A2A task face", async () => {
  const encoded = encodeRelationalValue({ type: "TestOffer", sequence: 1 });
  const bytes = semanticBytes(["ascribe", encoded.type, encoded.term]);
  const projected = projectRmnActivity({ type: "Offer", origin: "https://supplier.example/", identifier: "supplier", recipient: "https://customer.example/actors/customer", objectBytes: bytes, agentCard: "https://supplier.example/.well-known/agent-card.json" });
  const transported = await (await import("@fedify/vocab")).Activity.fromJsonLd(projected).then((activity) => activity.toJsonLd({ format: "compact" }));
  const extracted = extractRmnActivity(transported, { expectedActor: "https://supplier.example/actors/supplier", expectedRecipient: "https://customer.example/actors/customer", expectedAgentCard: "https://supplier.example/.well-known/agent-card.json" });
  assert.deepEqual(extracted.objectBytes, bytes);
  assert.match(extracted.objectNi, /^ni:\/\/\/sha-256;/u);
  assert.equal(extracted.a2aMessage.role, "ROLE_AGENT");
  assert.equal(extracted.a2aMessage.parts.length, 1);
  assert.equal(extracted.a2aMessage.parts[0].metadata.ni, extracted.objectNi);
  assert.equal(JSON.stringify(transported).includes("embedded-in-a2a-data"), false);
  assert.equal(JSON.stringify(transported).includes("application/rmn+json"), false);
  assert.throws(() => extractRmnActivity({ ...transported, object: { ...transported.object, name: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" } }, { expectedActor: transported.actor, expectedRecipient: "https://customer.example/actors/customer" }), /do not match/);
});

test("the cone preserves only supplied real A2A extensions and forgets exactly to the same RMN bytes", () => {
  const encoded = encodeRelationalValue({ type: "CapabilityResult", reference: "urn:authority:one" });
  const bytes = semanticBytes(["ascribe", encoded.type, encoded.term]);
  const message = {
    messageId: "urn:a2a:capability-result:one",
    role: "ROLE_AGENT",
    parts: [{ raw: bytes.toString("base64"), metadata: { ni: rawNi(bytes) }, filename: "result.rmn.cbor", mediaType: "application/rmn+cbor" }],
    metadata: { capabilityOperation: { protocol: "captp", target: "urn:authority:one", method: "invoke", answer: "urn:answer:one" } },
    extensions: ["urn:captp:operation:v1"]
  };
  const projected = projectRmnActivity({ type: "Create", origin: "https://supplier.example/", identifier: "supplier", recipient: ACTIVITYSTREAMS_PUBLIC, objectBytes: bytes, agentCard: "https://supplier.example/.well-known/agent-card.json", a2aMessage: message });
  const extracted = extractRmnActivity(projected, { expectedActor: "https://supplier.example/actors/supplier", expectedRecipient: ACTIVITYSTREAMS_PUBLIC, expectedAgentCard: "https://supplier.example/.well-known/agent-card.json" });
  assert.deepEqual(extracted.objectBytes, bytes);
  assert.deepEqual(extracted.a2aMessage.metadata.capabilityOperation, message.metadata.capabilityOperation);
  assert.deepEqual(extracted.a2aMessage.extensions, message.extensions);
});

test("an addressed Create may carry one exact A2A ROLE_USER work message", () => {
  const encoded = encodeRelationalValue({ type: "CloudRunReconciliationRequest", sequence: 1 });
  const bytes = semanticBytes(["ascribe", encoded.type, encoded.term]);
  const message = {
    messageId: "urn:a2a:cloud-run-work:one", role: "ROLE_USER",
    parts: [{ raw: bytes.toString("base64"), metadata: { ni: rawNi(bytes) }, filename: "work.rmn.cbor", mediaType: "application/rmn+cbor" }],
    metadata: { optionalInnerCarriers: ["ucan", "x402", "captp"] }, extensions: ["urn:ucan:invocation:v1"],
  };
  const projected = projectRmnActivity({ type: "Create", origin: "https://customer.example/", identifier: "customer", recipient: "https://provider.example/actors/gcloud", objectBytes: bytes, agentCard: "https://customer.example/.well-known/agent-card.json", a2aMessage: message, a2aRole: "ROLE_USER" });
  const extracted = extractRmnActivity(projected, { expectedActor: "https://customer.example/actors/customer", expectedRecipient: "https://provider.example/actors/gcloud", expectedAgentCard: "https://customer.example/.well-known/agent-card.json" });
  assert.equal(extracted.a2aMessage.role, "ROLE_USER");
  assert.deepEqual(extracted.objectBytes, bytes);
  assert.deepEqual(extracted.a2aMessage.metadata.optionalInnerCarriers, ["ucan", "x402", "captp"]);
});

test("the generic provider loads a customer-authored durable outbox", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "activitypub-outbox-"));
  const outboxPath = path.join(root, "outbox.json");
  try {
    const projected = projectRmnActivity({
      type: "Offer",
      origin: "https://supplier.example/",
      identifier: "supplier",
      recipient: "https://www.w3.org/ns/activitystreams#Public",
      objectBytes: semanticBytes(["ascribe", encodeRelationalValue({ type: "TestOffer" }).type, encodeRelationalValue({ type: "TestOffer" }).term]),
      agentCard: "https://supplier.example/.well-known/agent-card.json",
    });
    await writeFile(outboxPath, `${JSON.stringify([projected])}\n`);
    const listOutbox = await loadActivityPubOutbox(outboxPath);
    assert.equal((await listOutbox({})).items.length, 1);
    assert.equal((await listOutbox({ cursor: "next" })).items.length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the client inbox pin is a private standard ActivityStreams collection", async () => {
  const provider = await fixture();
  const refused = await provider.fetch(new Request("https://example.test/actors/metroplat/inbox", {
    headers: { accept: "application/activity+json" },
  }));
  assert.equal(refused.status, 401);
  assert.match(refused.headers.get("www-authenticate"), /^Bearer /u);

  const admitted = await provider.fetch(new Request("https://example.test/actors/metroplat/inbox", {
    headers: { accept: "application/activity+json", authorization: "Bearer test-client-token-with-at-least-32-characters" },
  }));
  assert.equal(admitted.status, 200);
  const collection = await admitted.json();
  assert.equal(collection.type, "OrderedCollection");
  assert.equal(collection.totalItems, 0);
  assert.equal(collection.first, "https://example.test/actors/metroplat/inbox?page=true");
});

async function unusedPort() {
  const socket = createNetServer();
  await new Promise((resolve, reject) => socket.once("error", reject).listen(0, "127.0.0.1", resolve));
  const address = socket.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

test("the Node compatibility server requires injected network custody and supports bounded in-process tests", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "activitypub-provider-"));
  const keyPath = path.join(root, "keys.json");
  const port = await unusedPort();
  await writeFile(keyPath, JSON.stringify(await generateActorKeyMaterial()), { mode: 0o600 });
  const service = await serveActivityPubProvider({
    origin: `http://127.0.0.1:${port}`,
    identifier: "metroplat",
    actorName: "Test Settlement",
    summary: "A sovereign settlement hiring an ActivityPub face.",
    keyPath,
    ...networkAdapters(),
    testOnlyInProcess: true,
    hostname: "127.0.0.1",
    port,
    bearerToken: "persistent-test-client-token-32-characters",
    listOutbox: async () => ({ items: [] }),
  });
  try {
    const response = await fetch(`http://127.0.0.1:${port}/actors/metroplat`, {
      headers: { accept: "application/activity+json" },
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).id, `http://127.0.0.1:${port}/actors/metroplat`);
  } finally {
    await service.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("one customer-authored activity is signed, delivered, verified, and handed to the receiving customer", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "activitypub-delivery-"));
  const senderPort = await unusedPort();
  const receiverPort = await unusedPort();
  const senderOrigin = `http://127.0.0.1:${senderPort}`;
  const receiverOrigin = `http://127.0.0.1:${receiverPort}`;
  const senderMaterial = await generateActorKeyMaterial();
  const receiverMaterial = await generateActorKeyMaterial();
  const senderKeys = path.join(root, "sender-keys.json");
  const receiverKeys = path.join(root, "receiver-keys.json");
  const received = [];
  const senderNetwork = networkAdapters(), receiverNetwork = networkAdapters();
  await writeFile(senderKeys, JSON.stringify(senderMaterial), { mode: 0o600 });
  await writeFile(receiverKeys, JSON.stringify(receiverMaterial), { mode: 0o600 });
  const senderService = await serveActivityPubProvider({
    origin: senderOrigin,
    identifier: "clockkeeper",
    actorName: "ScheduleDelivery",
    summary: "A clocked pulse provider.",
    keyPath: senderKeys,
    ...senderNetwork,
    testOnlyInProcess: true,
    hostname: "127.0.0.1",
    port: senderPort,
    bearerToken: "sender-test-client-token-at-least-32-characters",
    listOutbox: async () => ({ items: [] }),
  });
  const receiverService = await serveActivityPubProvider({
    origin: receiverOrigin,
    identifier: "koios",
    actorName: "Koios News",
    summary: "A news enterprise receiving a clocked demand.",
    keyPath: receiverKeys,
    ...receiverNetwork,
    testOnlyInProcess: true,
    hostname: "127.0.0.1",
    port: receiverPort,
    allowPrivateAddress: true,
    bearerToken: "receiver-test-client-token-at-least-32-characters",
    listOutbox: async () => ({ items: [] }),
    onActivity: async (arrival) => received.push(arrival.jsonLd),
  });
  try {
    const activity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: `${senderOrigin}/activities/pulse-1`,
      type: "Create",
      actor: `${senderOrigin}/actors/clockkeeper`,
      target: `${receiverOrigin}/actors/koios`,
      object: { type: "Note", content: "pulse" },
    };
    const receipt = await deliverFromEnvironment(activity, {
      origin: senderOrigin,
      identifier: "clockkeeper",
      actorName: "ScheduleDelivery",
      summary: "A clocked pulse provider.",
      keyPath: senderKeys,
      recipient: `${receiverOrigin}/actors/koios`,
      inbox: `${receiverOrigin}/actors/koios/inbox`,
    });
    assert.equal(receipt.type, "Accept");
    assert.equal(receipt.object.delivered, true);
    assert.equal(received.length, 1);
    assert.equal(received[0].id, activity.id);
    assert.equal(received[0].actor, activity.actor);
    const rootResponse = await fetch(`${receiverOrigin}/actors/koios/inbox`, {
      headers: { accept: "application/activity+json", authorization: "Bearer receiver-test-client-token-at-least-32-characters" },
    });
    assert.equal(rootResponse.status, 200);
    const rootCollection = await rootResponse.json();
    assert.equal(rootCollection.type, "OrderedCollection");
    assert.equal(rootCollection.totalItems, 1);
    const pageResponse = await fetch(rootCollection.first, {
      headers: { accept: "application/activity+json", authorization: "Bearer receiver-test-client-token-at-least-32-characters" },
    });
    const page = await pageResponse.json();
    assert.equal(page.type, "OrderedCollectionPage");
    assert.equal(page.orderedItems[0].id, activity.id);
    assert.equal(page.orderedItems[0].actor, activity.actor);
  } finally {
    await Promise.all([senderService.close(), receiverService.close()]);
    rmSync(root, { recursive: true, force: true });
  }
});
