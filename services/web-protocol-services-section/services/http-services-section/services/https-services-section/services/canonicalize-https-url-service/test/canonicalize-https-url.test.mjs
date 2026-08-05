import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalizeHttpsUrl,
  HttpsUrlCanonicalizationRefusal,
} from "../scripts/canonicalize-https-url.mjs";

test("canonicalizes an eligible HTTPS URL", () => {
  assert.equal(
    canonicalizeHttpsUrl("https://Example.COM:443/mcp?one=two"),
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
      () => canonicalizeHttpsUrl(target),
      (error) => error instanceof HttpsUrlCanonicalizationRefusal,
      target,
    );
  }
});

test("can require a DNS host at boundaries that refuse every literal IP", () => {
  assert.throws(
    () => canonicalizeHttpsUrl("https://8.8.8.8/", "resourceUrl", { requireDns: true }),
    /public HTTPS DNS host/u,
  );
});
