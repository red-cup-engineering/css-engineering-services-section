import assert from "node:assert/strict";
import test from "node:test";

import { admitUniformResourceName } from "../src/uniform-resource-name-admission-service.mjs";

test("admits a plain URN and splits NID/NSS", () => {
  const admission = admitUniformResourceName("urn:isbn:0451450523");
  assert.equal(admission.ok, true);
  assert.equal(admission.nid, "isbn");
  assert.equal(admission.nss, "0451450523");
  assert.equal(admission.rComponent, null);
  assert.equal(admission.qComponent, null);
  assert.equal(admission.fComponent, null);
});

test("admits an NSS that itself contains a colon (NSS legally contains colons)", () => {
  const admission = admitUniformResourceName("urn:example:a123,z456:namespace:with:colons");
  assert.equal(admission.ok, true);
  assert.equal(admission.nid, "example");
  assert.equal(admission.nss, "a123,z456:namespace:with:colons");
});

test("admits the scheme literal case-insensitively", () => {
  const admission = admitUniformResourceName("URN:Example:foo");
  assert.equal(admission.ok, true);
  assert.equal(admission.nid, "Example");
});

test("admits r-component, q-component, and f-component together", () => {
  const admission = admitUniformResourceName("urn:example:a123?+rcomp?=qcomp#frag");
  assert.equal(admission.ok, true);
  assert.equal(admission.nss, "a123");
  assert.equal(admission.rComponent, "rcomp");
  assert.equal(admission.qComponent, "qcomp");
  assert.equal(admission.fComponent, "frag");
});

test("admits a lone '?' as a literal character inside an r-component without it being mistaken for the q-component introducer", () => {
  const admission = admitUniformResourceName("urn:example:a123?+part1?part2?=qcomp");
  assert.equal(admission.ok, true);
  assert.equal(admission.rComponent, "part1?part2");
  assert.equal(admission.qComponent, "qcomp");
});

test("admits a q-component with no preceding r-component", () => {
  const admission = admitUniformResourceName("urn:example:a123?=qcomp");
  assert.equal(admission.ok, true);
  assert.equal(admission.rComponent, null);
  assert.equal(admission.qComponent, "qcomp");
});

test("admits an empty f-component (fragment may be empty)", () => {
  const admission = admitUniformResourceName("urn:example:a123#");
  assert.equal(admission.ok, true);
  assert.equal(admission.fComponent, "");
});

test("admits a percent-encoded NSS", () => {
  const admission = admitUniformResourceName("urn:example:a%20b");
  assert.equal(admission.ok, true);
  assert.equal(admission.nss, "a%20b");
});

test("refuses a string with no urn: scheme", () => {
  const admission = admitUniformResourceName("not-a-urn:example:foo");
  assert.equal(admission.ok, false);
  assert.equal(admission.rule, "assigned-name");
});

test("refuses an NID shorter than two characters", () => {
  const admission = admitUniformResourceName("urn:a:foo");
  assert.equal(admission.ok, false);
  assert.equal(admission.rule, "NID");
});

test("refuses an NID longer than 32 characters", () => {
  const longNid = "a".repeat(33);
  const admission = admitUniformResourceName(`urn:${longNid}:foo`);
  assert.equal(admission.ok, false);
  assert.equal(admission.rule, "NID");
});

test("refuses an NID with no closing colon", () => {
  const admission = admitUniformResourceName("urn:example");
  assert.equal(admission.ok, false);
  assert.equal(admission.rule, "NID");
});

test("refuses an empty NSS", () => {
  const admission = admitUniformResourceName("urn:example:");
  assert.equal(admission.ok, false);
  assert.equal(admission.rule, "NSS");
});

test("refuses a malformed percent-encoded triple", () => {
  const admission = admitUniformResourceName("urn:example:a%2gz");
  assert.equal(admission.ok, false);
  assert.equal(admission.rule, "pct-encoded");
});

test("refuses an r-component introducer with nothing after it", () => {
  const admission = admitUniformResourceName("urn:example:a123?+");
  assert.equal(admission.ok, false);
  assert.equal(admission.rule, "r-component");
});

test("refuses trailing garbage after a well-formed namestring", () => {
  const admission = admitUniformResourceName("urn:example:a123 trailing");
  assert.equal(admission.ok, false);
  assert.equal(admission.rule, "namestring");
});

test("refuses a non-string input", () => {
  const admission = admitUniformResourceName(42);
  assert.equal(admission.ok, false);
  assert.equal(admission.rule, "namestring");
});
