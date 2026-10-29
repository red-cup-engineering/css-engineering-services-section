import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { sha256, sha256hex, sha1, sha1hex, strongEtag, uuid } from "../src/internal/hash.mts";

test("sha256hex matches node:crypto's own sha256 digest for the same input", () => {
  const expected = createHash("sha256").update("hello world").digest("hex");
  assert.equal(sha256hex("hello world"), expected);
});

test("sha256 returns the raw digest Buffer consistent with sha256hex", () => {
  const buf = sha256("hello world");
  assert.ok(Buffer.isBuffer(buf));
  assert.equal(buf.toString("hex"), sha256hex("hello world"));
});

test("sha1hex matches node:crypto's own sha1 digest for the same input", () => {
  const expected = createHash("sha1").update("hello world").digest("hex");
  assert.equal(sha1hex("hello world"), expected);
});

test("sha1 returns the raw digest Buffer consistent with sha1hex", () => {
  const buf = sha1("hello world");
  assert.ok(Buffer.isBuffer(buf));
  assert.equal(buf.toString("hex"), sha1hex("hello world"));
});

test("strongEtag wraps the SHA-1 hex digest of the content in quotes", () => {
  const etag = strongEtag("body content");
  assert.equal(etag, `"${sha1hex("body content")}"`);
  assert.match(etag, /^"[0-9a-f]{40}"$/);
});

test("strongEtag differs for different content and is stable for identical content", () => {
  assert.equal(strongEtag("a"), strongEtag("a"));
  assert.notEqual(strongEtag("a"), strongEtag("b"));
});

test("uuid produces distinct RFC 4122 v4-formatted identifiers", () => {
  const a = uuid();
  const b = uuid();
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.notEqual(a, b);
});
