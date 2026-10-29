import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canonicalJson,
  sha256Base64Url,
  contentId,
  recordIdentity,
  recordIdentityOrHash,
} from "../src/addressing/addressing.mjs";

// Independent (not-module-under-test) hex -> base64url conversion for the
// NIST known-answer vectors below, so those tests still check the digest
// bytes against an externally-known value rather than only checking
// self-consistency with sha256Base64Url's own encoding step.
function hexToBase64Url(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

test("canonicalJson sorts top-level object keys regardless of insertion order", () => {
  const a = { b: 1, a: 2, c: 3 };
  const b = { c: 3, a: 2, b: 1 };
  assert.equal(canonicalJson(a), canonicalJson(b));
  assert.equal(canonicalJson(a), '{"a":2,"b":1,"c":3}');
});

test("canonicalJson sorts keys at every nesting depth", () => {
  const nested = { z: { y: 1, x: { d: 4, c: 3 } }, a: 1 };
  const reordered = { a: 1, z: { x: { c: 3, d: 4 }, y: 1 } };
  assert.equal(canonicalJson(nested), canonicalJson(reordered));
  assert.equal(canonicalJson(nested), '{"a":1,"z":{"x":{"c":3,"d":4},"y":1}}');
});

test("canonicalJson preserves array element order (arrays are not sorted)", () => {
  assert.equal(canonicalJson([3, 1, 2]), "[3,1,2]");
  assert.equal(canonicalJson([1, 2, 3]) === canonicalJson([3, 2, 1]), false);
});

test("canonicalJson handles arrays of objects, sorting each object's keys", () => {
  const value = [
    { b: 1, a: 2 },
    { d: 3, c: 4 },
  ];
  assert.equal(canonicalJson(value), '[{"a":2,"b":1},{"c":4,"d":3}]');
});

test("canonicalJson round-trips unicode strings (including keys) without reordering surprises", () => {
  const value = { "éclair": "café", "日本": "😀" };
  const out = canonicalJson(value);
  const parsed = JSON.parse(out);
  assert.equal(parsed["éclair"], "café");
  assert.equal(parsed["日本"], "😀");
});

test("canonicalJson is stable for repeated calls on an equivalent structure", () => {
  const build = () => ({ id: 7, tags: ["b", "a"], meta: { z: 1, a: 2 } });
  assert.equal(canonicalJson(build()), canonicalJson(build()));
});

test("canonicalJson handles primitives", () => {
  assert.equal(canonicalJson(null), "null");
  assert.equal(canonicalJson(true), "true");
  assert.equal(canonicalJson(false), "false");
  assert.equal(canonicalJson(42), "42");
  assert.equal(canonicalJson("hi"), '"hi"');
  assert.equal(canonicalJson([]), "[]");
  assert.equal(canonicalJson({}), "{}");
});

test("canonicalJson throws TypeError on non-finite numbers", () => {
  assert.throws(() => canonicalJson(NaN), TypeError);
  assert.throws(() => canonicalJson(Infinity), TypeError);
  assert.throws(() => canonicalJson(-Infinity), TypeError);
  assert.throws(() => canonicalJson({ x: NaN }), TypeError);
});

test("canonicalJson throws TypeError on undefined, at top level and nested", () => {
  assert.throws(() => canonicalJson(undefined), TypeError);
  assert.throws(() => canonicalJson({ a: undefined }), TypeError);
  assert.throws(() => canonicalJson([1, undefined, 3]), TypeError);
});

test("canonicalJson throws TypeError on functions, symbols, and bigints", () => {
  assert.throws(() => canonicalJson(() => {}), TypeError);
  assert.throws(() => canonicalJson(Symbol("x")), TypeError);
  assert.throws(() => canonicalJson(10n), TypeError);
});

test("canonicalJson throws TypeError on non-plain-object instances (Date, Map, Set)", () => {
  assert.throws(() => canonicalJson(new Date()), TypeError);
  assert.throws(() => canonicalJson(new Map()), TypeError);
  assert.throws(() => canonicalJson(new Set()), TypeError);
});

test("sha256Base64Url matches the known NIST test vector for 'abc'", async () => {
  const hash = await sha256Base64Url("abc");
  assert.equal(hash, hexToBase64Url("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"));
});

test("sha256Base64Url matches the known vector for the empty string", async () => {
  const hash = await sha256Base64Url("");
  assert.equal(hash, hexToBase64Url("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"));
});

test("sha256Base64Url rejects non-string input", async () => {
  await assert.rejects(() => sha256Base64Url(123), TypeError);
  await assert.rejects(() => sha256Base64Url(null), TypeError);
});

test("contentId is stable across key-order variation and formatted as an ni: URI", async () => {
  const idA = await contentId({ b: 1, a: 2 });
  const idB = await contentId({ a: 2, b: 1 });
  assert.equal(idA, idB);
  assert.match(idA, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/);
});

test("contentId changes when the value's content changes", async () => {
  const idA = await contentId({ a: 1 });
  const idB = await contentId({ a: 2 });
  assert.notEqual(idA, idB);
});

test("contentId is consistent with sha256Base64Url(canonicalJson(value))", async () => {
  const value = { z: 1, a: [1, 2, 3] };
  const expected = `ni:///sha-256;${await sha256Base64Url(canonicalJson(value))}`;
  assert.equal(await contentId(value), expected);
});

test("recordIdentity prefers a declared id, formatted as id:<id>", () => {
  assert.equal(recordIdentity({ id: "abc123" }), "id:abc123");
  assert.equal(recordIdentity({ id: 42 }), "id:42");
});

test("recordIdentity returns null when id is absent, null, or undefined", () => {
  assert.equal(recordIdentity({}), null);
  assert.equal(recordIdentity({ id: null }), null);
  assert.equal(recordIdentity({ id: undefined }), null);
});

test("recordIdentity treats id 0 and empty-string id as present (only null/undefined are absent)", () => {
  assert.equal(recordIdentity({ id: 0 }), "id:0");
  assert.equal(recordIdentity({ id: "" }), "id:");
});

test("recordIdentity throws TypeError for a non-object record", () => {
  assert.throws(() => recordIdentity(null), TypeError);
  assert.throws(() => recordIdentity("not-a-record"), TypeError);
  assert.throws(() => recordIdentity(undefined), TypeError);
});

test("recordIdentityOrHash uses the declared id when present, never hashing", async () => {
  const identity = await recordIdentityOrHash({ id: "char-90000001", data: { any: "thing" } });
  assert.equal(identity, "id:char-90000001");
});

test("recordIdentityOrHash falls back to an rmn: content hash when id is absent", async () => {
  const record = { type: "EsiObservation", path: "/characters/1/", recordedAt: "2026-08-05T00:00:00Z" };
  const identity = await recordIdentityOrHash(record);
  assert.match(identity, /^rmn:[A-Za-z0-9_-]{43}$/);
  const expectedHash = await sha256Base64Url(canonicalJson(record));
  assert.equal(identity, `rmn:${expectedHash}`);
});

test("recordIdentityOrHash id precedence: two records with the same content but one has an id differ in identity", async () => {
  const withId = { id: "fixed-id", value: 1 };
  const withoutId = { value: 1 };
  const idA = await recordIdentityOrHash(withId);
  const idB = await recordIdentityOrHash(withoutId);
  assert.equal(idA, "id:fixed-id");
  assert.notEqual(idA, idB);
  assert.match(idB, /^rmn:/);
});

test("recordIdentityOrHash is deterministic for equivalent records regardless of key order", async () => {
  const recordA = { path: "/x/", type: "Observation" };
  const recordB = { type: "Observation", path: "/x/" };
  assert.equal(await recordIdentityOrHash(recordA), await recordIdentityOrHash(recordB));
});
