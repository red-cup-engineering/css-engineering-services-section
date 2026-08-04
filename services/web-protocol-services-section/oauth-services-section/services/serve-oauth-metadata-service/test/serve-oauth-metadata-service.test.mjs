import assert from "node:assert/strict";
import test from "node:test";

import { oauthAuthorizationServerMetadata, protectedResourceMetadata } from "../src/serve-oauth-metadata-service.mjs";

test("builds the RFC 8414 authorization server metadata document", () => {
  const doc = oauthAuthorizationServerMetadata("https://ops.561.group");
  assert.equal(doc.issuer, "https://ops.561.group");
  assert.equal(doc.authorization_endpoint, "https://ops.561.group/oauth/authorize");
  assert.equal(doc.token_endpoint, "https://ops.561.group/oauth/token");
  assert.equal(doc.revocation_endpoint, "https://ops.561.group/oauth/revoke");
  assert.equal(doc.registration_endpoint, "https://ops.561.group/oauth/register");
  assert.deepEqual(doc.scopes_supported, ["openid"]);
  assert.deepEqual(doc.response_types_supported, ["code"]);
  assert.deepEqual(doc.grant_types_supported, ["authorization_code", "refresh_token"]);
  assert.deepEqual(doc.code_challenge_methods_supported, ["S256"]);
  assert.deepEqual(doc.token_endpoint_auth_methods_supported, ["none", "client_secret_post"]);
});

test("builds the RFC 9728 protected resource metadata document, trimming a trailing slash off the issuer", () => {
  const doc = protectedResourceMetadata("https://ops.561.group/jsnode/mcp", "https://ops.561.group/");
  assert.deepEqual(doc, {
    resource: "https://ops.561.group/jsnode/mcp",
    authorization_servers: ["https://ops.561.group"],
  });
});
