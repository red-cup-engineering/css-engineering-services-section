import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createServer as createNetServer } from "node:net";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { serveLocalActivityPubProvider } from "../src/local-server.mjs";
import { generateActorKeyMaterial } from "@red-cup-engineering/activitypub-services-section/keys";

const here = path.dirname(fileURLToPath(import.meta.url));

async function unusedPort() {
  const socket = createNetServer();
  await new Promise((resolve, reject) => socket.once("error", reject).listen(0, "127.0.0.1", resolve));
  const address = socket.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

test("local server uses the listener-free constructor's provider in the generic Node server host", async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), "activitypub-local-server-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const keysPath = path.join(dir, "keys.json");
  await writeFile(keysPath, JSON.stringify(await generateActorKeyMaterial()));
  const calls = [];
  const queue = { listen: async () => {} };
  const running = await serveLocalActivityPubProvider({
    environment: { ACTIVITYPUB_IDENTIFIER: "codex", ACTIVITYPUB_ACTOR_NAME: "Codex", ACTIVITYPUB_ACTOR_SUMMARY: "Local ActivityPub face", ACTIVITYPUB_KEYS_PATH: keysPath },
    origin: "https://example.net",
    runtime: { database: { exec() {}, prepare: () => ({ get() {}, all() { return []; }, run() {} }) }, queue },
    custody: { kv: { get() {} }, inbox: { retain() {} }, inboxIndex: { list: async () => ({ items: [], totalItems: 0 }) } },
    serve: async (options) => { calls.push(options); return { provider: options.provider, close: async () => {} }; },
  });
  assert.equal(running.provider, calls[0].provider);
  assert.equal(calls[0].provider.identifier, "codex");
  assert.equal(calls[0].provider.federation !== undefined, true);
  assert.equal(typeof running.bearerToken, "string");
  assert.ok(running.bearerToken.length >= 32);
});

test("local server honors ACTIVITYPUB_OUTBOX_PATH from the environment: a customer-authored outbox file is actually served, not silently replaced with an empty one", async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), "activitypub-local-outbox-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const outboxPath = path.join(dir, "outbox.json");
  const keysPath = path.join(dir, "keys.json");
  await writeFile(keysPath, JSON.stringify(await generateActorKeyMaterial()));
  await writeFile(outboxPath, `${JSON.stringify([{
    "@context": "https://www.w3.org/ns/activitystreams",
    id: "https://example.net/actors/codex/posts/1",
    type: "Create",
    actor: "https://example.net/actors/codex",
    to: "https://www.w3.org/ns/activitystreams#Public",
    object: { id: "https://example.net/actors/codex/posts/1#note", type: "Note", attributedTo: "https://example.net/actors/codex", content: "hi" },
  }])}\n`);

  const calls = [];
  await serveLocalActivityPubProvider({
    environment: {
      ACTIVITYPUB_IDENTIFIER: "codex", ACTIVITYPUB_ACTOR_NAME: "Codex", ACTIVITYPUB_ACTOR_SUMMARY: "Local ActivityPub face",
      ACTIVITYPUB_KEYS_PATH: keysPath, ACTIVITYPUB_OUTBOX_PATH: outboxPath,
    },
    origin: "https://example.net",
    runtime: { database: { exec() {}, prepare: () => ({ get() {}, all() { return []; }, run() {} }) }, queue: { listen: async () => {} } },
    custody: { kv: { get() {} }, inbox: { retain() {} }, inboxIndex: { list: async () => ({ items: [], totalItems: 0 }) } },
    serve: async (options) => { calls.push(options); return { provider: options.provider, close: async () => {} }; },
  });
  const response = await calls[0].provider.fetch(new Request("https://example.net/actors/codex/outbox", { headers: { accept: "application/activity+json" } }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.orderedItems.length, 1);
  assert.equal(body.orderedItems[0].id, "https://example.net/actors/codex/posts/1");
});

test("the real local-server CLI never prints its bearer token to stdout or stderr; it persists 0600 in the state directory and reuses it across a restart", async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), "activitypub-local-boot-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const keysPath = path.join(dir, "keys.json");
  const statePath = path.join(dir, "fedify.sqlite");
  await writeFile(keysPath, JSON.stringify(await generateActorKeyMaterial()));
  const port = await unusedPort();
  const serverScript = path.join(here, "..", "src", "local-server.mjs");
  const environment = {
    ...process.env,
    ACTIVITYPUB_ORIGIN: `http://127.0.0.1:${port}`,
    ACTIVITYPUB_IDENTIFIER: "watcher",
    ACTIVITYPUB_ACTOR_NAME: "Watcher",
    ACTIVITYPUB_ACTOR_SUMMARY: "A boot-hygiene test actor.",
    ACTIVITYPUB_KEYS_PATH: keysPath,
    ACTIVITYPUB_SQLITE_PATH: statePath,
    HOST: "127.0.0.1",
    PORT: String(port),
  };

  async function boot() {
    const child = spawn(process.execPath, [serverScript], { env: environment });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`local-server did not print its boot line in time; stderr=${stderr}`)), 60000);
      const onData = () => {
        if (!stdout.includes("\n")) return;
        clearTimeout(timer);
        child.stdout.off("data", onData);
        resolve();
      };
      child.stdout.on("data", onData);
      child.once("error", (error) => { clearTimeout(timer); reject(error); });
      child.once("exit", (code) => { clearTimeout(timer); reject(new Error(`local-server exited early (code ${code}); stderr=${stderr}`)); });
    });
    child.kill("SIGTERM");
    await new Promise((resolve) => child.once("exit", resolve));
    return { line: stdout.trim().split("\n")[0], stdout, stderr };
  }

  const first = await boot();
  const booted = JSON.parse(first.line);
  assert.equal(booted.actor, `http://127.0.0.1:${port}/actors/watcher`);
  assert.equal(typeof booted.bearerTokenPath, "string");
  assert.equal(Object.hasOwn(booted, "bearerToken"), false);

  const tokenPath = booted.bearerTokenPath;
  const persistedToken = (await readFile(tokenPath, "utf8")).trim();
  assert.ok(persistedToken.length >= 32);
  assert.equal((await stat(tokenPath)).mode & 0o077, 0);

  assert.equal(first.stdout.includes(persistedToken), false);
  assert.equal(first.stderr.includes(persistedToken), false);

  // A second boot against the same state directory reuses the persisted
  // token — rotation is opt-in, not automatic on every boot — so a client
  // that captured it once keeps working across an ordinary restart.
  const second = await boot();
  const rebooted = JSON.parse(second.line);
  assert.equal(rebooted.bearerTokenPath, tokenPath);
  assert.equal((await readFile(tokenPath, "utf8")).trim(), persistedToken);
  assert.equal(second.stdout.includes(persistedToken), false);
  assert.equal(second.stderr.includes(persistedToken), false);
});
