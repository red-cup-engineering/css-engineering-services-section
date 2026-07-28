import assert from "node:assert/strict";
import test from "node:test";

import {
  admitPublicHttpsUrl,
  PublicHttpsUrlRefusal,
} from "../src/admit-public-https-url.mjs";

test("admits and canonicalizes a public HTTPS URL", () => {
  assert.equal(
    admitPublicHttpsUrl("https://Example.COM:443/mcp?one=two"),
    "https://example.com/mcp?one=two",
  );
});

test("refuses credentials, local names, and private or disguised literal addresses", () => {
  for (const target of [
    "https://user:pass@example.com/",
    "https://localhost/",
    "https://127.0.0.1/",
    "https://[::1]/",
    "https://[::ffff:127.0.0.1]/",
    "https://[2002:7f00:1::]/",
  ]) {
    assert.throws(
      () => admitPublicHttpsUrl(target),
      (error) => error instanceof PublicHttpsUrlRefusal,
      target,
    );
  }
});

test("can require a DNS host at boundaries that refuse every literal IP", () => {
  assert.throws(
    () => admitPublicHttpsUrl("https://8.8.8.8/", "resourceUrl", { requireDns: true }),
    /public HTTPS DNS host/u,
  );
});
