import assert from "node:assert/strict";
import test from "node:test";

import {
  extractRmnPart,
  rawNi,
  RMN_MEDIA_TYPE,
  rmnPart,
} from "../src/rmn-part.mjs";

const bytes = Buffer.from("canonical RMN bytes", "utf8");

test("RMN part uses the canonical byte-only NI service", () => {
  const part = rmnPart(bytes, "claim.rmn.cbor");
  assert.equal(part.mediaType, RMN_MEDIA_TYPE);
  assert.equal(part.metadata.ni, "ni:///sha-256;0QTHhHsZe2J_qCcg-IDVYnICT7F24Eks97YpSJzrp3Y");
  assert.equal(rawNi(bytes), part.metadata.ni);
  assert.deepEqual(extractRmnPart([part]), {
    bytes,
    ni: part.metadata.ni,
    filename: "claim.rmn.cbor",
  });
});

test("RMN part verification refuses changed bytes", () => {
  const part = rmnPart(bytes);
  const changed = structuredClone(part);
  changed.content.value = Buffer.from("changed", "utf8");
  assert.throws(() => extractRmnPart([changed]), /do not match/u);
});

test("RMN part verification refuses a non-canonical NI spelling", () => {
  const part = rmnPart(bytes);
  const changed = structuredClone(part);
  changed.metadata.ni = `${part.metadata.ni.slice(0, -1)}B`;
  assert.throws(() => extractRmnPart([changed]), /canonical RFC 6920/u);
});

test("RMN part verification requires exactly one raw RMN candidate", () => {
  assert.throws(() => extractRmnPart([]), /exactly one/u);
  const part = rmnPart(bytes);
  assert.throws(() => extractRmnPart([part, part]), /exactly one/u);
});

test("rawNi refuses implicit text at the packet boundary", () => {
  assert.throws(() => rawNi("canonical RMN bytes"), /Uint8Array/u);
});
