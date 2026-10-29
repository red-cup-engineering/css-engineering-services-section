import assert from "node:assert/strict";
import { test } from "node:test";
import { encode, decode, base64urlEncode, base64urlDecode } from "../src/internal/base64url.mts";

test("encode/decode roundtrip a string", () => {
  const text = "hello, world! + / =";
  assert.equal(decode(encode(text)).toString(), text);
});

test("encode produces unpadded, URL-safe output (no '+', '/', or '=')", () => {
  // bytes chosen so plain base64 would include '+' and '/' and padding
  const bytes = Buffer.from([0xfb, 0xff, 0xbf, 0x00]);
  const encoded = encode(bytes);
  assert.equal(/[+/=]/.test(encoded), false);
  assert.deepEqual(decode(encoded), bytes);
});

test("encode accepts a Buffer or Uint8Array directly", () => {
  const bytes = new Uint8Array([1, 2, 3, 4]);
  assert.deepEqual(decode(encode(bytes)), Buffer.from(bytes));
  assert.deepEqual(decode(encode(Buffer.from(bytes))), Buffer.from(bytes));
});

test("base64urlEncode/base64urlDecode are exported aliases of encode/decode", () => {
  assert.equal(base64urlEncode, encode);
  assert.equal(base64urlDecode, decode);
});
