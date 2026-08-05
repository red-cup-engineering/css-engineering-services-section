import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import {
  isNiUri,
  makeNiUri,
  niUriDigest,
  niUriDigestBytes,
  verifyNiUri,
} from "../src/ni-uri.mjs";

function sha256sumBase64url(bytes) {
  const hex = execFileSync("sha256sum", { input: bytes })
    .toString("utf8")
    .split(/\s+/u)[0];
  return Buffer.from(hex, "hex").toString("base64url");
}

test("makeNiUri round-trips against an independent sha256sum digest", () => {
  const bytes = Buffer.from("the quick brown fox", "utf8");
  const expectedDigest = sha256sumBase64url(bytes);
  assert.equal(makeNiUri(bytes), `ni:///sha-256;${expectedDigest}`);
});

test("makeNiUri of empty bytes matches the well-known empty SHA-256 digest", () => {
  // sha256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85
  // base64url of that digest:
  assert.equal(
    makeNiUri(Buffer.alloc(0)),
    "ni:///sha-256;47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU",
  );
});

test("isNiUri accepts only the RFC 6920 sha-256 form", () => {
  const uri = makeNiUri(Buffer.from("abc"));
  assert.equal(isNiUri(uri), true);
  assert.equal(isNiUri("ni:///sha-256;too-short"), false);
  assert.equal(isNiUri("ni:///sha-1;abcdef"), false);
  assert.equal(isNiUri(42), false);
});

test("isNiUri rejects a non-canonical base64url spelling of the same digest", () => {
  const canonical = makeNiUri(Buffer.alloc(0));
  const nonCanonical = `${canonical.slice(0, -1)}V`;
  assert.equal(
    Buffer.from(niUriDigest(canonical), "base64url").equals(
      Buffer.from(nonCanonical.slice("ni:///sha-256;".length), "base64url"),
    ),
    true,
  );
  assert.equal(isNiUri(nonCanonical), false);
  assert.throws(() => niUriDigest(nonCanonical), /invalid sha-256 ni URI/);
});

test("niUriDigest extracts the base64url digest and refuses malformed input", () => {
  const uri = makeNiUri(Buffer.from("abc"));
  assert.equal(uri, `ni:///sha-256;${niUriDigest(uri)}`);
  assert.equal(niUriDigestBytes(uri).toString("base64url"), niUriDigest(uri));
  assert.throws(() => niUriDigest("not-a-ni-uri"), /invalid sha-256 ni URI/);
});

test("verifyNiUri binds exact bytes to their canonical name", () => {
  const bytes = Buffer.from("abc");
  const uri = makeNiUri(bytes);
  assert.equal(verifyNiUri(bytes, uri), true);
  assert.equal(verifyNiUri(Buffer.from("abd"), uri), false);
  assert.equal(verifyNiUri(bytes, "not-a-ni-uri"), false);
});

test("makeNiUri admits byte strings, not implicit text or arbitrary carriers", () => {
  assert.equal(makeNiUri(new Uint8Array([97, 98, 99])), makeNiUri(Buffer.from("abc")));
  assert.throws(() => makeNiUri("abc"), /must be a Uint8Array/);
  assert.throws(() => makeNiUri([97, 98, 99]), /must be a Uint8Array/);
});
