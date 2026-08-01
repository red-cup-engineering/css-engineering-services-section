import assert from "node:assert/strict";
import test from "node:test";

import { renderUniformResourceName } from "../src/uniform-resource-name-rendering-service.mjs";

test("renders a plain NID/NSS pair", () => {
  const rendering = renderUniformResourceName({ nid: "isbn", nss: "0451450523" });
  assert.equal(rendering.ok, true);
  assert.equal(rendering.urn, "urn:isbn:0451450523");
});

test("renders all three optional components in order", () => {
  const rendering = renderUniformResourceName({
    nid: "example",
    nss: "a123",
    rComponent: "rcomp",
    qComponent: "qcomp",
    fComponent: "frag",
  });
  assert.equal(rendering.ok, true);
  assert.equal(rendering.urn, "urn:example:a123?+rcomp?=qcomp#frag");
});

test("preserves NID case rather than lowercasing it", () => {
  const rendering = renderUniformResourceName({ nid: "Example", nss: "foo" });
  assert.equal(rendering.ok, true);
  assert.equal(rendering.urn, "urn:Example:foo");
});

test("renders a shape matching what the admission service's success output would carry (nid/nss/rComponent/qComponent/fComponent, null-omittable)", () => {
  const admittedShape = { ok: true, nid: "example", nss: "a123", rComponent: "rcomp", qComponent: "qcomp", fComponent: "frag" };
  const rendered = renderUniformResourceName(admittedShape);
  assert.equal(rendered.ok, true);
  assert.equal(rendered.urn, "urn:example:a123?+rcomp?=qcomp#frag");
});

test("refuses a malformed NID", () => {
  const rendering = renderUniformResourceName({ nid: "a", nss: "foo" });
  assert.equal(rendering.ok, false);
  assert.equal(rendering.rule, "NID");
});

test("refuses an empty NSS", () => {
  const rendering = renderUniformResourceName({ nid: "example", nss: "" });
  assert.equal(rendering.ok, false);
  assert.equal(rendering.rule, "NSS");
});

test("refuses an rComponent containing the literal q-component introducer", () => {
  const rendering = renderUniformResourceName({ nid: "example", nss: "foo", rComponent: "a?=b" });
  assert.equal(rendering.ok, false);
  assert.equal(rendering.rule, "r-component");
});

test("refuses a qComponent containing the literal fragment introducer", () => {
  const rendering = renderUniformResourceName({ nid: "example", nss: "foo", qComponent: "a#b" });
  assert.equal(rendering.ok, false);
  assert.equal(rendering.rule, "q-component");
});

test("refuses a non-object input", () => {
  const rendering = renderUniformResourceName(null);
  assert.equal(rendering.ok, false);
  assert.equal(rendering.rule, "namestring");
});
