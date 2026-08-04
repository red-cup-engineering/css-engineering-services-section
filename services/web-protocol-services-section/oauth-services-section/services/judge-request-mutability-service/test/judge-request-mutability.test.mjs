import assert from "node:assert/strict";
import test from "node:test";
import { judgeRequestMutability } from "../src/judge-request-mutability.mjs";

test("a read-only face refuses every mutating method before auth is considered", () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const refusal = judgeRequestMutability({ method, mutableFace: false });
    assert.equal(refusal.allowed, false);
    assert.equal(refusal.status, 403);
  }
});

test("reads pass on a read-only face; everything passes on the mutable face", () => {
  for (const method of ["GET", "HEAD", "OPTIONS", "get"]) {
    assert.deepEqual(judgeRequestMutability({ method, mutableFace: false }), { allowed: true });
  }
  for (const method of ["POST", "DELETE", "GET"]) {
    assert.deepEqual(judgeRequestMutability({ method, mutableFace: true }), { allowed: true });
  }
});
