import assert from "node:assert/strict";
import test from "node:test";

import { guardHttpRequest } from "../src/guard-http-request-service.mjs";

const validate = (token) => (token === "good-token" ? { email: "person@example.com" } : null);
const judge = (claims) => claims?.email === "person@example.com";

test("401s a request with no Authorization header", () => {
  const decision = guardHttpRequest({}, validate, judge);
  assert.equal(decision.status, 401);
  assert.equal(decision.claims, null);
  assert.ok(decision.challenge);
});

test("401s a non-Bearer Authorization header", () => {
  const decision = guardHttpRequest({ authorization: "Basic xyz" }, validate, judge);
  assert.equal(decision.status, 401);
});

test("403s a bearer token that validates but the judge refuses", () => {
  const badJudge = () => false;
  const decision = guardHttpRequest({ authorization: "Bearer good-token" }, validate, badJudge);
  assert.equal(decision.status, 403);
  assert.equal(decision.claims, null);
});

test("403s a bearer token the validate die does not recognize", () => {
  const decision = guardHttpRequest({ authorization: "Bearer wrong-token" }, validate, judge);
  assert.equal(decision.status, 403);
});

test("200s a bearer token that validates and the judge admits, returning its claims", () => {
  const decision = guardHttpRequest({ authorization: "Bearer good-token" }, validate, judge);
  assert.equal(decision.status, 200);
  assert.deepEqual(decision.claims, { email: "person@example.com" });
  assert.equal(decision.challenge, undefined);
});

test("reads a capitalized Authorization header too", () => {
  const decision = guardHttpRequest({ Authorization: "Bearer good-token" }, validate, judge);
  assert.equal(decision.status, 200);
});
