import assert from "node:assert/strict";
import test from "node:test";

import { registerOAuthClient } from "../src/register-oauth-client-service.mjs";

test("mints a client_id, a client_secret, and fixed grant/response types", () => {
  const client = registerOAuthClient({ redirect_uris: ["https://app.example/cb"], client_name: "Test App" });
  assert.match(client.client_id, /^client_/);
  assert.ok(client.client_secret.length > 0);
  assert.deepEqual(client.redirect_uris, ["https://app.example/cb"]);
  assert.equal(client.client_name, "Test App");
  assert.deepEqual(client.grant_types, ["authorization_code", "refresh_token"]);
  assert.deepEqual(client.response_types, ["code"]);
  assert.equal(client.token_endpoint_auth_method, "none");
  assert.equal(client.client_secret_expires_at, 0);
  assert.ok(Number.isInteger(client.client_id_issued_at));
});

test("coerces non-array or missing redirect_uris to an empty array", () => {
  assert.deepEqual(registerOAuthClient({}).redirect_uris, []);
  assert.deepEqual(registerOAuthClient({ redirect_uris: "not-an-array" }).redirect_uris, []);
});

test("coerces every redirect_uri entry to a string and leaves client_name undefined when absent or non-string", () => {
  const client = registerOAuthClient({ redirect_uris: [1, "https://a", null], client_name: 42 });
  assert.deepEqual(client.redirect_uris, ["1", "https://a", "null"]);
  assert.equal(client.client_name, undefined);
});

test("two registrations mint distinct client_id and client_secret values", () => {
  const a = registerOAuthClient({});
  const b = registerOAuthClient({});
  assert.notEqual(a.client_id, b.client_id);
  assert.notEqual(a.client_secret, b.client_secret);
});
