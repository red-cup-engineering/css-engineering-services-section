import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer as createNetServer } from "node:net";
import { createServer as createHttpServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { MemoryKvStore } from "@fedify/fedify";
import { generateActorKeyMaterial } from "@red-cup-engineering/activitypub-services-section/keys";
import { deliverFromEnvironment } from "@red-cup-engineering/activitypub-services-section/deliver";
import { createActivityPubOutboxStore } from "@red-cup-engineering/activitypub-services-section/outbox-store";
import { createFlatfileActivityPubRuntime } from "@red-cup-engineering/activitypub-services-section/flatfile-runtime";
import { createActivityPubServerEngine, serveActivityPubProvider } from "../src/server.mjs";

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

function followersAdapter() {
  const byIdentifier = new Map();
  return {
    async add({ identifier, actorId, inboxId, sharedInboxId }) {
      const map = byIdentifier.get(identifier) ?? new Map();
      map.set(actorId, { actorId, inboxId, sharedInboxId: sharedInboxId ?? null });
      byIdentifier.set(identifier, map);
    },
    async remove({ identifier, actorId }) {
      byIdentifier.get(identifier)?.delete(actorId);
    },
    async count({ identifier }) {
      return byIdentifier.get(identifier)?.size ?? 0;
    },
    async list({ identifier }) {
      return { items: [...(byIdentifier.get(identifier)?.values() ?? [])] };
    },
  };
}

async function unusedPort() {
  const socket = createNetServer();
  await new Promise((resolve, reject) => socket.once("error", reject).listen(0, "127.0.0.1", resolve));
  const address = socket.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

/** Poll `predicate` until it's true or `timeoutMs` elapses (queued deliveries land
 *  asynchronously once the queue worker picks them up, not synchronously with `publish`). */
async function waitFor(predicate, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("waitFor timed out");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

/** A raw (non-Fedify) HTTP server standing in for one remote follower's inbox: it accepts any
 *  POST and records the parsed body, unconditionally answering with `status` -- exactly what a
 *  broadcast-to-followers delivery targets, with no requirement that the recipient itself be
 *  another ActivityPub actor. */
async function fakeInboxServer({ status = 202 } = {}) {
  const received = [];
  let attempts = 0;
  const server = createHttpServer((request, response) => {
    attempts += 1;
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      try { received.push(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch { /* non-JSON attempt still counts */ }
      response.writeHead(status);
      response.end();
    });
  });
  const port = await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
  return {
    origin: `http://127.0.0.1:${port}`,
    inbox: `http://127.0.0.1:${port}/inbox`,
    received,
    attempts: () => attempts,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("the canonical Web engine preserves ActivityPub provider fallback and local policy routes", async () => {
  const delegated = [];
  const engine = createActivityPubServerEngine({
    provider: { fetch: async (request) => { delegated.push([request.method, new URL(request.url).pathname]); return new Response("provider", { status: 202 }); } },
    wellKnownResources: { "/.well-known/provider-card.json": { type: "ProviderCard", version: 1 } },
    workerRoute: { path: "/_private/test-worker", consume: async () => new Response(null, { status: 204 }) },
  });
  const document = await engine.fetch(new Request("https://activitypub.test/.well-known/provider-card.json"));
  assert.equal(document.status, 200);
  assert.deepEqual(await document.json(), { type: "ProviderCard", version: 1 });
  assert.equal((await engine.fetch(new Request("https://activitypub.test/.well-known/provider-card.json", { method: "POST" }))).status, 202);
  assert.equal((await engine.fetch(new Request("https://activitypub.test/_private/test-worker", { method: "POST" }))).status, 204);
  assert.equal((await engine.fetch(new Request("https://activitypub.test/_private/test-worker"))).status, 404);
  assert.equal((await engine.fetch(new Request("https://activitypub.test/actors/metroplat"))).status, 202);
  assert.deepEqual(delegated, [["POST", "/.well-known/provider-card.json"], ["GET", "/actors/metroplat"]]);
});

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

test("the ActivityPub listener serves injected generic well-known JSON without changing provider routes", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "activitypub-well-known-"));
  const keyPath = path.join(root, "keys.json");
  const port = await unusedPort();
  await writeFile(keyPath, JSON.stringify(await generateActorKeyMaterial()), { mode: 0o600 });
  let consumed = 0;
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
    workerRoute: { path: "/_private/test-worker", consume: async (request) => {
      consumed += 1;
      if (request.headers.get("authorization") !== "Bearer queue-verified") return new Response("queue authorization required", { status: 401 });
      if (request.headers.get("x-retry") === "true") return new Response("retry", { status: 503, headers: { "retry-after": "30" } });
      return new Response(null, { status: 204 });
    } },
    wellKnownResources: { "/.well-known/provider-card.json": { type: "ProviderCard", version: 1 } },
  });
  try {
    const document = await fetch(`http://127.0.0.1:${port}/.well-known/provider-card.json`);
    assert.equal(document.status, 200);
    assert.deepEqual(await document.json(), { type: "ProviderCard", version: 1 });
    const actor = await fetch(`http://127.0.0.1:${port}/actors/metroplat`, { headers: { accept: "application/activity+json" } });
    assert.equal(actor.status, 200);
    const refused = await fetch(`http://127.0.0.1:${port}/_private/test-worker`, { method: "POST" });
    assert.equal(refused.status, 401);
    assert.equal(consumed, 1);
    const delegated = await fetch(`http://127.0.0.1:${port}/_private/test-worker`, { method: "POST", headers: { authorization: "Bearer queue-verified" } });
    assert.equal(delegated.status, 204);
    const retry = await fetch(`http://127.0.0.1:${port}/_private/test-worker`, { method: "POST", headers: { authorization: "Bearer queue-verified", "x-retry": "true" } });
    assert.equal(retry.status, 503);
    assert.equal(retry.headers.get("retry-after"), "30");
    assert.equal(await retry.text(), "retry");
    const wrongMethod = await fetch(`http://127.0.0.1:${port}/_private/test-worker`);
    assert.equal(wrongMethod.status, 404);
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
    inboxIndex: receiverNetwork.inbox,
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

test("a signed Follow is verified, retained, recorded, and auto-accepted; the followers collection lists it; a signed Undo removes it", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "activitypub-follow-"));
  const fanPort = await unusedPort();
  const targetPort = await unusedPort();
  const fanOrigin = `http://127.0.0.1:${fanPort}`;
  const targetOrigin = `http://127.0.0.1:${targetPort}`;
  const fanMaterial = await generateActorKeyMaterial();
  const targetMaterial = await generateActorKeyMaterial();
  const fanKeys = path.join(root, "fan-keys.json");
  const targetKeys = path.join(root, "target-keys.json");
  await writeFile(fanKeys, JSON.stringify(fanMaterial), { mode: 0o600 });
  await writeFile(targetKeys, JSON.stringify(targetMaterial), { mode: 0o600 });

  const fanReceived = [];
  const targetReceived = [];
  const fanNetwork = networkAdapters();
  const targetNetwork = networkAdapters();
  const followers = followersAdapter();

  const fanService = await serveActivityPubProvider({
    origin: fanOrigin,
    identifier: "fan",
    actorName: "Fan",
    summary: "A follower actor.",
    keyPath: fanKeys,
    ...fanNetwork,
    testOnlyInProcess: true,
    hostname: "127.0.0.1",
    port: fanPort,
    allowPrivateAddress: true,
    bearerToken: "fan-test-client-token-at-least-32-characters",
    inboxIndex: fanNetwork.inbox,
    listOutbox: async () => ({ items: [] }),
    onActivity: async (arrival) => fanReceived.push(arrival.jsonLd),
  });
  const targetService = await serveActivityPubProvider({
    origin: targetOrigin,
    identifier: "target",
    actorName: "Target",
    summary: "An actor other accounts follow.",
    keyPath: targetKeys,
    ...targetNetwork,
    testOnlyInProcess: true,
    hostname: "127.0.0.1",
    port: targetPort,
    allowPrivateAddress: true,
    bearerToken: "target-test-client-token-at-least-32-characters",
    inboxIndex: targetNetwork.inbox,
    followers,
    listOutbox: async () => ({ items: [] }),
    onActivity: async (arrival) => targetReceived.push(arrival.jsonLd),
  });
  try {
    // The actor document advertises a real followers collection URL once a
    // followers adapter is configured.
    const actorResponse = await fetch(`${targetOrigin}/actors/target`, { headers: { accept: "application/activity+json" } });
    const actorDocument = await actorResponse.json();
    assert.equal(actorDocument.followers, `${targetOrigin}/actors/target/followers`);

    const followId = `${fanOrigin}/activities/follow-1`;
    const followActivity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: followId,
      type: "Follow",
      actor: `${fanOrigin}/actors/fan`,
      object: `${targetOrigin}/actors/target`,
    };
    const followReceipt = await deliverFromEnvironment(followActivity, {
      origin: fanOrigin,
      identifier: "fan",
      actorName: "Fan",
      summary: "A follower actor.",
      keyPath: fanKeys,
      recipient: `${targetOrigin}/actors/target`,
      inbox: `${targetOrigin}/actors/target/inbox`,
    });
    assert.equal(followReceipt.type, "Accept");
    assert.equal(followReceipt.object.delivered, true);

    // The target's own custody retained the verified Follow, exactly like
    // any other verified arrival.
    assert.equal(targetReceived.length, 1);
    assert.equal(targetReceived[0].type, "Follow");
    assert.equal(targetReceived[0].actor, `${fanOrigin}/actors/fan`);

    // The target recorded the follower and answered with a real Accept,
    // delivered back to the follower's own inbox.
    assert.equal(await followers.count({ identifier: "target" }), 1);
    assert.equal(fanReceived.length, 1);
    assert.equal(fanReceived[0].type, "Accept");
    assert.equal(fanReceived[0].actor, `${targetOrigin}/actors/target`);
    assert.equal(fanReceived[0].object.id, followId);

    // The followers collection reflects it: correct totalItems and a page
    // naming the follower by ID.
    const collectionResponse = await fetch(`${targetOrigin}/actors/target/followers`, { headers: { accept: "application/activity+json" } });
    assert.equal(collectionResponse.status, 200);
    const collection = await collectionResponse.json();
    assert.equal(collection.type, "OrderedCollection");
    assert.equal(collection.totalItems, 1);
    assert.deepEqual(collection.orderedItems, [`${fanOrigin}/actors/fan`]);

    // Undo{Follow}, signed by the same follower, removes the record.
    const undoActivity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: `${fanOrigin}/activities/undo-follow-1`,
      type: "Undo",
      actor: `${fanOrigin}/actors/fan`,
      object: followActivity,
    };
    const undoReceipt = await deliverFromEnvironment(undoActivity, {
      origin: fanOrigin,
      identifier: "fan",
      actorName: "Fan",
      summary: "A follower actor.",
      keyPath: fanKeys,
      recipient: `${targetOrigin}/actors/target`,
      inbox: `${targetOrigin}/actors/target/inbox`,
    });
    assert.equal(undoReceipt.object.delivered, true);
    assert.equal(await followers.count({ identifier: "target" }), 0);
    assert.equal(targetReceived.filter((activity) => activity.type === "Undo").length, 1);

    const afterUndoResponse = await fetch(`${targetOrigin}/actors/target/followers`, { headers: { accept: "application/activity+json" } });
    const afterUndo = await afterUndoResponse.json();
    assert.equal(afterUndo.totalItems, 0);
    assert.deepEqual(afterUndo.orderedItems ?? [], []);
  } finally {
    await Promise.all([fanService.close(), targetService.close()]);
    rmSync(root, { recursive: true, force: true });
  }
});

test("a published Create dereferences at its own id -- the same content the outbox collection embeds, from one shared source of truth", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "activitypub-publish-"));
  const keyPath = path.join(root, "keys.json");
  const port = await unusedPort();
  const origin = `http://127.0.0.1:${port}`;
  const identifier = "publisher";
  const bearerToken = "publisher-test-token-at-least-32-characters";
  await writeFile(keyPath, JSON.stringify(await generateActorKeyMaterial()), { mode: 0o600 });
  const outboxStore = await createActivityPubOutboxStore({ outboxPath: path.join(root, "outbox.json") });
  const service = await serveActivityPubProvider({
    origin,
    identifier,
    actorName: "Publisher",
    summary: "A publishing actor.",
    keyPath,
    kv: new MemoryKvStore(),
    inbox: { retain: async () => {} },
    testOnlyInProcess: true,
    hostname: "127.0.0.1",
    port,
    bearerToken,
    listOutbox: outboxStore.listOutbox,
    appendToOutbox: outboxStore.append,
    onActivity: async () => {},
  });
  try {
    const activityId = `${origin}/actors/${identifier}/posts/daily-2026-08-19`;
    const activity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: activityId,
      type: "Create",
      actor: `${origin}/actors/${identifier}`,
      to: ["https://www.w3.org/ns/activitystreams#Public"],
      object: {
        id: `${activityId}#note`,
        type: "Note",
        attributedTo: `${origin}/actors/${identifier}`,
        content: "<p>hello federation</p>",
        to: ["https://www.w3.org/ns/activitystreams#Public"],
      },
    };
    const publish = () => fetch(`${origin}/actors/${identifier}/outbox`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${bearerToken}` },
      body: JSON.stringify(activity),
    });

    // Unauthenticated publish is refused -- the same bearer credential that
    // gates a privileged read of this actor's own inbox gates this write.
    const refused = await fetch(`${origin}/actors/${identifier}/outbox`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(activity),
    });
    assert.equal(refused.status, 401);

    // Before publishing, the post's own id is exactly the 404 the runbook
    // documented: nothing has been added to the outbox yet.
    const before = await fetch(activityId, { headers: { accept: "application/activity+json" } });
    assert.equal(before.status, 404);

    const published = await publish();
    assert.equal(published.status, 201);
    const receipt = await published.json();
    assert.equal(receipt.appended, true);
    assert.equal(receipt.id, activityId);

    // Now a remote server resolving this id directly -- exactly what a
    // boost, quote, or reply fetch does -- gets the real object, not a 404.
    const fetched = await fetch(activityId, { headers: { accept: "application/activity+json" } });
    assert.equal(fetched.status, 200);
    assert.match(fetched.headers.get("content-type") ?? "", /json/u);
    const fetchedJson = await fetched.json();
    assert.equal(fetchedJson.id, activityId);
    assert.equal(fetchedJson.object.content, "<p>hello federation</p>");

    // The outbox collection embeds the identical entry: one source of
    // truth, not a second copy that could drift from what the object
    // dispatcher serves.
    const outboxResponse = await fetch(`${origin}/actors/${identifier}/outbox`, { headers: { accept: "application/activity+json" } });
    const outboxDocument = await outboxResponse.json();
    assert.equal(outboxDocument.totalItems, 1);
    assert.equal(outboxDocument.orderedItems.length, 1);
    assert.equal(outboxDocument.orderedItems[0].id, activityId);
    assert.equal(outboxDocument.orderedItems[0].object.content, fetchedJson.object.content);

    // Publishing the identical activity id again is an idempotent no-op,
    // not a duplicate outbox entry.
    const republished = await publish();
    assert.equal(republished.status, 200);
    assert.equal((await republished.json()).appended, false);
    const outboxAfterReplay = await fetch(`${origin}/actors/${identifier}/outbox`, { headers: { accept: "application/activity+json" } });
    assert.equal((await outboxAfterReplay.json()).totalItems, 1);

    // A Create authored by a different actor is refused outright, never
    // silently accepted into this actor's own outbox.
    const foreign = await fetch(`${origin}/actors/${identifier}/outbox`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${bearerToken}` },
      body: JSON.stringify({ ...activity, id: `${activityId}-foreign`, actor: `${origin}/actors/someone-else` }),
    });
    assert.equal(foreign.status, 422);
    assert.equal((await fetch(`${origin}/actors/${identifier}/outbox`, { headers: { accept: "application/activity+json" } }).then((r) => r.json())).totalItems, 1);

    // A postId that was never published still 404s -- the object
    // dispatcher only ever serves what the outbox store actually holds.
    const missing = await fetch(`${origin}/actors/${identifier}/posts/never-posted`, { headers: { accept: "application/activity+json" } });
    assert.equal(missing.status, 404);
  } finally {
    await service.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("a provider without an outbox store never exposes the publish route: POST to the outbox 404s, exactly the prior read-only behavior", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "activitypub-no-publish-"));
  const keyPath = path.join(root, "keys.json");
  const port = await unusedPort();
  const origin = `http://127.0.0.1:${port}`;
  await writeFile(keyPath, JSON.stringify(await generateActorKeyMaterial()), { mode: 0o600 });
  const service = await serveActivityPubProvider({
    origin,
    identifier: "readonly",
    actorName: "Readonly",
    summary: "A provider with no appendToOutbox.",
    keyPath,
    kv: new MemoryKvStore(),
    inbox: { retain: async () => {} },
    testOnlyInProcess: true,
    hostname: "127.0.0.1",
    port,
    bearerToken: "readonly-test-token-at-least-32-characters",
    listOutbox: async () => ({ items: [] }),
    onActivity: async () => {},
  });
  try {
    const response = await fetch(`${origin}/actors/readonly/outbox`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer readonly-test-token-at-least-32-characters" },
      body: JSON.stringify({ type: "Create" }),
    });
    assert.equal(response.status, 404);
  } finally {
    await service.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("publish broadcasts the Create to every recorded follower's inbox through Fedify's own fanout, isolating one erroring follower's delivery from the rest", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "activitypub-broadcast-"));
  const keyPath = path.join(root, "keys.json");
  const port = await unusedPort();
  const origin = `http://127.0.0.1:${port}`;
  const identifier = "publisher";
  const bearerToken = "publisher-broadcast-test-token-32-characters";
  await writeFile(keyPath, JSON.stringify(await generateActorKeyMaterial()), { mode: 0o600 });

  const outboxStore = await createActivityPubOutboxStore({ outboxPath: path.join(root, "outbox.json") });
  // A real durable flat-file queue -- the exact production shape (flatfile-runtime.mjs, wired the
  // same way local-server.mjs wires it) -- so this test exercises the actual per-inbox job
  // isolation and retry semantics of the delivery spool, not a stand-in for it.
  const runtime = createFlatfileActivityPubRuntime({
    stateDirectory: path.join(root, "state"),
    queueOptions: { pollInterval: 20 },
  });

  const goodFollower = await fakeInboxServer({ status: 202 });
  const badFollower = await fakeInboxServer({ status: 500 });

  const followersByIdentifier = new Map();
  // The same shape of adapter provider.mjs's own Follow/Accept handler
  // populates on a verified inbound Follow (already exercised end to end by
  // the Follow/Undo test above) -- seeded directly here since this test's
  // focus is fanout from an already-recorded followers set, not
  // re-deriving the Follow handshake.
  const followers = {
    async add({ identifier: forIdentifier, actorId, inboxId, sharedInboxId }) {
      const map = followersByIdentifier.get(forIdentifier) ?? new Map();
      map.set(actorId, { actorId, inboxId, sharedInboxId: sharedInboxId ?? null });
      followersByIdentifier.set(forIdentifier, map);
    },
    async remove({ identifier: forIdentifier, actorId }) { followersByIdentifier.get(forIdentifier)?.delete(actorId); },
    async count({ identifier: forIdentifier }) { return followersByIdentifier.get(forIdentifier)?.size ?? 0; },
    async list({ identifier: forIdentifier }) { return { items: [...(followersByIdentifier.get(forIdentifier)?.values() ?? [])] }; },
  };
  await followers.add({ identifier, actorId: `${goodFollower.origin}/actors/good`, inboxId: goodFollower.inbox });
  await followers.add({ identifier, actorId: `${badFollower.origin}/actors/bad`, inboxId: badFollower.inbox });

  const service = await serveActivityPubProvider({
    origin,
    identifier,
    actorName: "Publisher",
    summary: "A publishing actor with followers.",
    keyPath,
    kv: new MemoryKvStore(),
    inbox: { retain: async () => {} },
    testOnlyInProcess: true,
    hostname: "127.0.0.1",
    port,
    bearerToken,
    allowPrivateAddress: true,
    queue: runtime.queue,
    followers,
    listOutbox: outboxStore.listOutbox,
    appendToOutbox: outboxStore.append,
    onActivity: async () => {},
  });
  const controller = new AbortController();
  const queueTask = service.provider.federation.startQueue(undefined, { signal: controller.signal }).catch(() => {});
  try {
    const activityId = `${origin}/actors/${identifier}/posts/daily-2026-08-19`;
    const activity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: activityId,
      type: "Create",
      actor: `${origin}/actors/${identifier}`,
      to: ["https://www.w3.org/ns/activitystreams#Public"],
      cc: [`${origin}/actors/${identifier}/followers`],
      object: {
        id: `${activityId}#note`,
        type: "Note",
        attributedTo: `${origin}/actors/${identifier}`,
        content: "<p>hello followers</p>",
        to: ["https://www.w3.org/ns/activitystreams#Public"],
        cc: [`${origin}/actors/${identifier}/followers`],
      },
    };

    const published = await fetch(`${origin}/actors/${identifier}/outbox`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${bearerToken}` },
      body: JSON.stringify(activity),
    });
    assert.equal(published.status, 201);
    const receipt = await published.json();
    assert.equal(receipt.appended, true);
    assert.equal(receipt.broadcast, true);

    // Both followers' inboxes are reached; the bad one erroring on every
    // attempt neither blocks nor delays the good one's delivery -- each is
    // its own queued job.
    await waitFor(() => goodFollower.received.length >= 1 && badFollower.attempts() >= 1);

    assert.equal(goodFollower.received[0].id, activityId);
    assert.equal(goodFollower.received[0].actor, activity.actor);
    assert.equal(goodFollower.received[0].object.content, "<p>hello followers</p>");
    assert.ok(badFollower.attempts() >= 1);
  } finally {
    controller.abort();
    await queueTask;
    // The bad follower's most recent delivery attempt may have failed (by
    // design) a moment before the abort signal was observed, and its retry
    // bookkeeping write can still be in flight even after the queue's own
    // "stopped listening" resolves -- give it a beat before the SQLite
    // handle underneath it is closed, so that write lands rather than
    // racing a closed database and surfacing as an unhandled rejection.
    await new Promise((resolve) => setTimeout(resolve, 300));
    await service.close();
    runtime.close();
    await Promise.all([goodFollower.close(), badFollower.close()]);
    rmSync(root, { recursive: true, force: true });
  }
});
