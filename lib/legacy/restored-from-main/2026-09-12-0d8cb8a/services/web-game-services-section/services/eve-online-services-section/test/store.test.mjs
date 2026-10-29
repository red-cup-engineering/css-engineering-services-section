import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { createStore } from "../src/db/store.mjs";
import { createFakeD1 } from "./fake-d1.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");
// Every landed migration, in order — matches how a real D1 database
// accumulates schema (migrations are forward-only append, per
// 0001_init.sql / 0002_ai_provider.sql's own comments).
const MIGRATION_SQL = [
  readFileSync(path.join(MIGRATIONS_DIR, "0001_init.sql"), "utf8"),
  readFileSync(path.join(MIGRATIONS_DIR, "0002_ai_provider.sql"), "utf8"),
].join("\n");

async function makeStore() {
  const d1 = createFakeD1();
  await d1.exec(MIGRATION_SQL);
  return { d1, store: createStore(d1) };
}

test("createStore rejects a non-D1 argument", () => {
  assert.throws(() => createStore(null), TypeError);
  assert.throws(() => createStore({}), TypeError);
});

test("getUserByCharacterId returns null when absent, then the created user after createUser", async () => {
  const { store } = await makeStore();
  assert.equal(await store.getUserByCharacterId(90000001), null);

  const created = await store.createUser({ characterId: 90000001, characterName: "Morgan Sennhauser" });
  assert.equal(created.characterId, 90000001);
  assert.equal(created.characterName, "Morgan Sennhauser");
  assert.equal(typeof created.id, "number");
  assert.equal(typeof created.createdAt, "string");

  const found = await store.getUserByCharacterId(90000001);
  assert.deepEqual(found, created);
});

test("createUser rejects invalid input", async () => {
  const { store } = await makeStore();
  await assert.rejects(() => store.createUser({ characterId: -1, characterName: "x" }), TypeError);
  await assert.rejects(() => store.createUser({ characterId: 1, characterName: "" }), TypeError);
  await assert.rejects(() => store.createUser(null), TypeError);
});

test("createUser rejects a duplicate character_id", async () => {
  const { store } = await makeStore();
  await store.createUser({ characterId: 90000001, characterName: "Morgan" });
  await assert.rejects(() => store.createUser({ characterId: 90000001, characterName: "Someone Else" }));
});

test("getUserByCharacterId validates its argument", async () => {
  const { store } = await makeStore();
  await assert.rejects(() => store.getUserByCharacterId(0), TypeError);
  await assert.rejects(() => store.getUserByCharacterId("90000001"), TypeError);
});

test("saveEsiTokens / getEsiTokens round-trip and upsert on save again", async () => {
  const { store } = await makeStore();
  const user = await store.createUser({ characterId: 90000001, characterName: "Morgan" });

  assert.equal(await store.getEsiTokens(user.id), null);

  await store.saveEsiTokens({
    userId: user.id,
    accessTokenSealed: "sealed-access-1",
    refreshTokenSealed: "sealed-refresh-1",
    expiresAt: 1000,
    scopes: ["esi-wallet.read_character_wallet.v1", "esi-skills.read_skills.v1"],
  });

  let tokens = await store.getEsiTokens(user.id);
  assert.equal(tokens.accessTokenSealed, "sealed-access-1");
  assert.equal(tokens.expiresAt, 1000);
  assert.deepEqual(tokens.scopes, ["esi-wallet.read_character_wallet.v1", "esi-skills.read_skills.v1"]);

  // Save again (token refresh) — must upsert in place, not duplicate/error.
  await store.saveEsiTokens({
    userId: user.id,
    accessTokenSealed: "sealed-access-2",
    refreshTokenSealed: "sealed-refresh-2",
    expiresAt: 2000,
    scopes: ["esi-wallet.read_character_wallet.v1"],
  });

  tokens = await store.getEsiTokens(user.id);
  assert.equal(tokens.accessTokenSealed, "sealed-access-2");
  assert.equal(tokens.expiresAt, 2000);
  assert.deepEqual(tokens.scopes, ["esi-wallet.read_character_wallet.v1"]);
});

test("saveEsiTokens validates its argument", async () => {
  const { store } = await makeStore();
  const user = await store.createUser({ characterId: 90000001, characterName: "Morgan" });
  await assert.rejects(
    () =>
      store.saveEsiTokens({
        userId: user.id,
        accessTokenSealed: "",
        refreshTokenSealed: "sealed-refresh-1",
        expiresAt: 1000,
        scopes: ["esi-wallet.read_character_wallet.v1"],
      }),
    TypeError
  );
  await assert.rejects(
    () =>
      store.saveEsiTokens({
        userId: user.id,
        accessTokenSealed: "sealed-access-1",
        refreshTokenSealed: "sealed-refresh-1",
        expiresAt: 1000,
        scopes: [],
      }),
    TypeError
  );
});

test("saveGeminiKey / getSettings round-trip, defaults model, and clears with null", async () => {
  const { store } = await makeStore();
  const user = await store.createUser({ characterId: 90000001, characterName: "Morgan" });

  assert.equal(await store.getSettings(user.id), null);

  await store.saveGeminiKey({ userId: user.id, geminiKeySealed: "sealed-key-1" });
  let settings = await store.getSettings(user.id);
  assert.equal(settings.geminiKeySealed, "sealed-key-1");
  assert.equal(settings.geminiModel, "gemini-2.5-flash");

  await store.saveGeminiKey({ userId: user.id, geminiKeySealed: "sealed-key-2", geminiModel: "gemini-2.5-pro" });
  settings = await store.getSettings(user.id);
  assert.equal(settings.geminiKeySealed, "sealed-key-2");
  assert.equal(settings.geminiModel, "gemini-2.5-pro");

  await store.saveGeminiKey({ userId: user.id, geminiKeySealed: null });
  settings = await store.getSettings(user.id);
  assert.equal(settings.geminiKeySealed, null);
});

test("observations: getFreshObservation returns null when absent, fresh row when unexpired, null when expired", async () => {
  const { store } = await makeStore();
  const user = await store.createUser({ characterId: 90000001, characterName: "Morgan" });
  const query = {
    userId: user.id,
    kind: "esi",
    path: "/characters/1/wallet/",
    paramsJson: JSON.stringify({}),
  };

  assert.equal(await store.getFreshObservation({ ...query, now: 5000 }), null);

  await store.saveObservation({
    userId: user.id,
    kind: "esi",
    path: "/characters/1/wallet/",
    paramsJson: JSON.stringify({}),
    status: 200,
    bodyJson: JSON.stringify(123.45),
    expiresAt: 10000,
    recordedAt: 5000,
  });

  const fresh = await store.getFreshObservation({ ...query, now: 9999 });
  assert.ok(fresh);
  assert.equal(fresh.bodyJson, JSON.stringify(123.45));
  assert.equal(fresh.expiresAt, 10000);

  const expired = await store.getFreshObservation({ ...query, now: 10001 });
  assert.equal(expired, null);

  // now === expiresAt is still fresh (expired means strictly expires_at < now).
  const boundary = await store.getFreshObservation({ ...query, now: 10000 });
  assert.ok(boundary);
});

test("getFreshObservation treats a null expires_at as never-expiring", async () => {
  const { store } = await makeStore();
  const user = await store.createUser({ characterId: 90000001, characterName: "Morgan" });
  await store.saveObservation({
    userId: user.id,
    kind: "esi",
    path: "/characters/1/clones/",
    paramsJson: JSON.stringify({}),
    status: 200,
    bodyJson: "{}",
    expiresAt: null,
    recordedAt: 1,
  });
  const row = await store.getFreshObservation({
    userId: user.id,
    kind: "esi",
    path: "/characters/1/clones/",
    paramsJson: JSON.stringify({}),
    now: 999999999,
  });
  assert.ok(row);
  assert.equal(row.expiresAt, null);
});

test("getFreshObservation picks the most recently recorded matching observation", async () => {
  const { store } = await makeStore();
  const user = await store.createUser({ characterId: 90000001, characterName: "Morgan" });
  const base = {
    userId: user.id,
    kind: "esi",
    path: "/characters/1/skills/",
    paramsJson: JSON.stringify({}),
    status: 200,
    expiresAt: 100000,
  };
  await store.saveObservation({ ...base, bodyJson: '"old"', recordedAt: 100 });
  await store.saveObservation({ ...base, bodyJson: '"new"', recordedAt: 200 });

  const row = await store.getFreshObservation({
    userId: user.id,
    kind: "esi",
    path: "/characters/1/skills/",
    paramsJson: JSON.stringify({}),
    now: 500,
  });
  assert.equal(row.bodyJson, '"new"');
});

test("saveObservation validates its argument", async () => {
  const { store } = await makeStore();
  const user = await store.createUser({ characterId: 90000001, characterName: "Morgan" });
  await assert.rejects(
    () =>
      store.saveObservation({
        userId: user.id,
        kind: "esi",
        path: "/x/",
        paramsJson: "{}",
        status: 200,
        bodyJson: "{}",
        expiresAt: "soon",
        recordedAt: 1,
      }),
    TypeError
  );
});

test("mcp tokens: mint, findUserByMcpTokenHash, list, and revoke", async () => {
  const { store } = await makeStore();
  const user = await store.createUser({ characterId: 90000001, characterName: "Morgan" });

  const minted = await store.mintMcpToken({ userId: user.id, tokenHash: "hash-abc", label: "laptop" });
  assert.equal(minted.userId, user.id);
  assert.equal(minted.label, "laptop");
  assert.equal(minted.revokedAt, null);

  const foundUser = await store.findUserByMcpTokenHash("hash-abc");
  assert.deepEqual(foundUser, user);

  assert.equal(await store.findUserByMcpTokenHash("no-such-hash"), null);

  let tokens = await store.listMcpTokens(user.id);
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].label, "laptop");
  assert.equal("tokenHash" in tokens[0], false);

  const revoked = await store.revokeMcpToken({ userId: user.id, id: minted.id });
  assert.equal(revoked, true);

  // Revoked tokens no longer resolve to a user.
  assert.equal(await store.findUserByMcpTokenHash("hash-abc"), null);

  // Revoking again (already revoked) reports false rather than throwing.
  const revokedAgain = await store.revokeMcpToken({ userId: user.id, id: minted.id });
  assert.equal(revokedAgain, false);

  // Revoking someone else's token id must not succeed.
  const otherUser = await store.createUser({ characterId: 90000002, characterName: "Someone Else" });
  const otherToken = await store.mintMcpToken({ userId: otherUser.id, tokenHash: "hash-xyz", label: "phone" });
  const wrongOwnerRevoke = await store.revokeMcpToken({ userId: user.id, id: otherToken.id });
  assert.equal(wrongOwnerRevoke, false);

  tokens = await store.listMcpTokens(user.id);
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].revokedAt !== null, true);
});

test("mintMcpToken rejects a duplicate token_hash", async () => {
  const { store } = await makeStore();
  const user = await store.createUser({ characterId: 90000001, characterName: "Morgan" });
  await store.mintMcpToken({ userId: user.id, tokenHash: "hash-abc", label: "laptop" });
  await assert.rejects(() => store.mintMcpToken({ userId: user.id, tokenHash: "hash-abc", label: "phone" }));
});

test("chat messages: appendChatMessage then getChatMessages in chronological order, respecting limit", async () => {
  const { store } = await makeStore();
  const user = await store.createUser({ characterId: 90000001, characterName: "Morgan" });

  await store.appendChatMessage({ userId: user.id, threadId: "t1", role: "user", contentJson: '"hi"' });
  await store.appendChatMessage({ userId: user.id, threadId: "t1", role: "model", contentJson: '"hello"' });
  await store.appendChatMessage({ userId: user.id, threadId: "t1", role: "user", contentJson: '"how are you"' });
  // Different thread must not leak in.
  await store.appendChatMessage({ userId: user.id, threadId: "t2", role: "user", contentJson: '"other thread"' });

  const all = await store.getChatMessages({ userId: user.id, threadId: "t1", limit: 50 });
  assert.deepEqual(
    all.map((m) => m.contentJson),
    ['"hi"', '"hello"', '"how are you"']
  );

  const limited = await store.getChatMessages({ userId: user.id, threadId: "t1", limit: 2 });
  // Most recent 2, still returned oldest-first.
  assert.deepEqual(
    limited.map((m) => m.contentJson),
    ['"hello"', '"how are you"']
  );
});

test("getChatMessages validates its argument", async () => {
  const { store } = await makeStore();
  await assert.rejects(() => store.getChatMessages({ userId: 1, threadId: "t1", limit: 0 }), TypeError);
  await assert.rejects(() => store.getChatMessages({ userId: 1, threadId: "", limit: 1 }), TypeError);
});
