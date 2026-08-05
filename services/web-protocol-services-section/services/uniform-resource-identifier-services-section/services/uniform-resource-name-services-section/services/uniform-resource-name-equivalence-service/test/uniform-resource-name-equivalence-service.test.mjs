import assert from "node:assert/strict";
import test from "node:test";

import { areUniformResourceNamesEquivalent } from "../src/uniform-resource-name-equivalence-service.mjs";

test("an identical URN is equivalent to itself", () => {
  const result = areUniformResourceNamesEquivalent("urn:isbn:0451450523", "urn:isbn:0451450523");
  assert.equal(result.ok, true);
  assert.equal(result.equivalent, true);
});

test("NID is compared case-insensitively", () => {
  const result = areUniformResourceNamesEquivalent("urn:ISBN:0451450523", "urn:isbn:0451450523");
  assert.equal(result.ok, true);
  assert.equal(result.equivalent, true);
});

test("NSS is compared case-sensitively", () => {
  const result = areUniformResourceNamesEquivalent("urn:example:Foo", "urn:example:foo");
  assert.equal(result.ok, true);
  assert.equal(result.equivalent, false);
});

test("percent-encoded hex digits are normalized to uppercase before NSS comparison", () => {
  const result = areUniformResourceNamesEquivalent("urn:example:a%2fb", "urn:example:a%2Fb");
  assert.equal(result.ok, true);
  assert.equal(result.equivalent, true);
});

test("percent-encoded octets are compared, never decoded, so %2F and a literal slash differ", () => {
  const result = areUniformResourceNamesEquivalent("urn:example:a%2Fb", "urn:example:a/b");
  assert.equal(result.ok, true);
  assert.equal(result.equivalent, false);
});

test("r-component is excluded from equivalence", () => {
  const result = areUniformResourceNamesEquivalent("urn:example:a123?+left", "urn:example:a123?+right");
  assert.equal(result.ok, true);
  assert.equal(result.equivalent, true);
});

test("q-component is excluded from equivalence", () => {
  const result = areUniformResourceNamesEquivalent("urn:example:a123?=left", "urn:example:a123?=right");
  assert.equal(result.ok, true);
  assert.equal(result.equivalent, true);
});

test("f-component is excluded from equivalence", () => {
  const result = areUniformResourceNamesEquivalent("urn:example:a123#left", "urn:example:a123#right");
  assert.equal(result.ok, true);
  assert.equal(result.equivalent, true);
});

test("different NIDs are not equivalent", () => {
  const result = areUniformResourceNamesEquivalent("urn:isbn:0451450523", "urn:issn:0451450523");
  assert.equal(result.ok, true);
  assert.equal(result.equivalent, false);
});

test("refuses when the left side does not admit as a URN", () => {
  const result = areUniformResourceNamesEquivalent("not-a-urn", "urn:example:foo");
  assert.equal(result.ok, false);
  assert.equal(result.side, "left");
});

test("refuses when the right side does not admit as a URN", () => {
  const result = areUniformResourceNamesEquivalent("urn:example:foo", "not-a-urn");
  assert.equal(result.ok, false);
  assert.equal(result.side, "right");
});
