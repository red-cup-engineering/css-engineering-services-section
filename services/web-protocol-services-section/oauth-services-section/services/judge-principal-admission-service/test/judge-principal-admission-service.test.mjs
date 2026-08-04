import assert from "node:assert/strict";
import test from "node:test";

import { judgePrincipalAdmission, resolveAdmissionPolicy } from "../src/judge-principal-admission-service.mjs";

test("resolveAdmissionPolicy: an explicit admitEmail predicate wins over everything else", () => {
  const admit = resolveAdmissionPolicy({ admitEmail: (email) => email === "explicit@example.com", allowedEmail: "other@example.com" });
  assert.equal(admit("explicit@example.com"), true);
  assert.equal(admit("other@example.com"), false);
});

test("resolveAdmissionPolicy: falls back to a case-insensitive single allowedEmail", () => {
  const admit = resolveAdmissionPolicy({ allowedEmail: "Person@Example.com" });
  assert.equal(admit("person@example.com"), true);
  assert.equal(admit("PERSON@EXAMPLE.COM"), true);
  assert.equal(admit("someone-else@example.com"), false);
});

test("resolveAdmissionPolicy: admits everyone when neither is given (open multi-user policy)", () => {
  const admit = resolveAdmissionPolicy({});
  assert.equal(admit("anyone@example.com"), true);
});

test("judgePrincipalAdmission: refuses an unverified email before consulting the policy", () => {
  const result = judgePrincipalAdmission({ email: "person@example.com", emailVerified: false }, () => true);
  assert.deepEqual(result, { admitted: false, reason: "email not verified" });
});

test("judgePrincipalAdmission: refuses a verified email the policy does not admit", () => {
  const result = judgePrincipalAdmission({ email: "person@example.com", emailVerified: true }, () => false);
  assert.deepEqual(result, { admitted: false, reason: "account not authorized" });
});

test("judgePrincipalAdmission: admits a verified email the policy admits", () => {
  const result = judgePrincipalAdmission({ email: "person@example.com", emailVerified: true }, () => true);
  assert.deepEqual(result, { admitted: true, email: "person@example.com" });
});
