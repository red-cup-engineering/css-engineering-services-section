import assert from "node:assert/strict";
import test from "node:test";

import { exchangeBoundedActivityPubA2a } from "../src/exchange.mjs";

test("one bounded A2A exchange retains only a credential resource reference and hashes an oversized body", async () => {
  const result = await exchangeBoundedActivityPubA2a({
    protocol: "a2a-jsonrpc",
    endpoint: "https://union.example/a2a",
    body: { jsonrpc: "2.0", method: "message/send" },
    authentication: "activitypub-bearer",
    maximumResponseBytes: 1024,
  }, {
    credentialResource: async () => ({ reference: "env:ACTIVITYPUB_INBOX_BEARER_TOKEN_FILE", token: "not-in-result" }),
    fetcher: async (_endpoint, init) => {
      assert.equal(init.headers.authorization, "Bearer not-in-result");
      assert.equal(init.headers["a2a-version"], "1.0");
      return new Response("x".repeat(2048), { status: 202, headers: { "content-type": "text/plain" } });
    },
  });
  assert.equal(result.type, "BoundedActivityPubA2aExchange");
  assert.equal(result.state, "exchanged");
  assert.equal(result.authentication.credentialResource, "env:ACTIVITYPUB_INBOX_BEARER_TOKEN_FILE");
  assert.equal(JSON.stringify(result).includes("not-in-result"), false);
  assert.equal(result.response.truncated, true);
  assert.match(result.response.digest, /^sha256:/u);
});

test("the operation refuses non-HTTPS endpoints before a request can escape", async () => {
  await assert.rejects(exchangeBoundedActivityPubA2a({ protocol: "activitypub", endpoint: "http://invalid.example/inbox", body: {} }), /HTTPS/u);
});
