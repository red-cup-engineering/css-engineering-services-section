import assert from "node:assert/strict";

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createPrincipalRegistry,
  hashPrincipalSecret,
  normalizeHumanUsername,
  readPrincipalsFile,
  verifyPrincipalSecret,
  writePrincipalsFile,
} from "../src/admission/principals.mjs";

test("OPS_MCP_ALLOWED_EMAIL bootstraps admission even with no principals.json", () => {
  const registry = createPrincipalRegistry({ allowedEmail: "operator@example.invalid" });
  assert.equal(registry.isEmailAdmitted("Operator@Example.invalid"), true);
  assert.equal(registry.isEmailAdmitted("other@example.invalid"), false);
});

test("principals.json adds further email principals alongside the bootstrap email", () => {
  const registry = createPrincipalRegistry({
    allowedEmail: "operator@example.invalid",
    principals: [{ kind: "email", email: "second@example.invalid" }, { kind: "email", email: "gone@example.invalid", revoked: true }],
  });
  assert.equal(registry.isEmailAdmitted("operator@example.invalid"), true);
  assert.equal(registry.isEmailAdmitted("second@example.invalid"), true);
  assert.equal(registry.isEmailAdmitted("gone@example.invalid"), false, "a revoked address is refused");
});

test("principals.json admits a hive account principal, case-insensitively, and refuses a revoked one", () => {
  const registry = createPrincipalRegistry({
    principals: [
      { kind: "hive", account: "emsenn0" },
      { kind: "hive", account: "revoked-account", revoked: true },
    ],
  });
  assert.equal(registry.isHiveAdmitted("emsenn0"), true);
  assert.equal(registry.isHiveAdmitted("EMSENN0"), true, "hive accounts are admitted case-insensitively");
  assert.equal(registry.isHiveAdmitted("revoked-account"), false, "a revoked hive account is refused");
  assert.equal(registry.isHiveAdmitted("unknown"), false);
});

test("hashPrincipalSecret + verifyPrincipalSecret round-trip and refuse a wrong secret", () => {
  const { secretSalt, secretHash } = hashPrincipalSecret("correct horse battery staple");
  assert.equal(verifyPrincipalSecret("correct horse battery staple", secretSalt, secretHash), true);
  assert.equal(verifyPrincipalSecret("wrong", secretSalt, secretHash), false);
});

test("human password principals verify case-insensitively, and nothing else becomes one", () => {
  const { secretSalt, secretHash } = hashPrincipalSecret("correct horse battery staple");
  const registry = createPrincipalRegistry({ principals: [{ kind: "human", username: "emsenn", secretSalt, secretHash }] });
  assert.equal(registry.verifyHumanPassword("Emsenn", "correct horse battery staple"), true);
  assert.equal(registry.verifyHumanPassword("emsenn", "a wrong password here"), false);
  assert.equal(registry.verifyHumanPassword("not a username", "ops-unknown-password-principal"), false, "the dummy comparison never becomes an admitted principal");
  assert.throws(() => normalizeHumanUsername("machine credential"));
});

test("a registry built over a stateDir admits a principal added to principals.json without being recreated (hot reload, no restart)", () => {
  const dir = mkdtempSync(join(tmpdir(), "ops-mcp-principals-reload-"));
  try {
    const registry = createPrincipalRegistry({ stateDir: dir });
    assert.equal(registry.isEmailAdmitted("late@example.invalid"), false, "not yet admitted before principals.json exists");

    writePrincipalsFile(dir, [{ kind: "email", email: "late@example.invalid" }]);
    assert.equal(
      registry.isEmailAdmitted("late@example.invalid"),
      true,
      "the same registry instance sees the new principal on the next decision",
    );

    writePrincipalsFile(dir, [{ kind: "email", email: "late@example.invalid", revoked: true }]);
    assert.equal(registry.isEmailAdmitted("late@example.invalid"), false, "a revocation is picked up on the very next decision, no restart");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a registry built over a stateDir reuses its memoized view when principals.json's (mtimeMs, size) is unchanged", () => {
  const dir = mkdtempSync(join(tmpdir(), "ops-mcp-principals-stable-"));
  try {
    writePrincipalsFile(dir, [{ kind: "email", email: "steady@example.invalid" }]);
    const registry = createPrincipalRegistry({ stateDir: dir });
    assert.equal(registry.isEmailAdmitted("steady@example.invalid"), true);
    // Rewrite the exact same bytes: (mtimeMs, size) can coincide with the
    // prior stat, in which case the memo is served rather than re-read --
    // either way the decision stays correct.
    writePrincipalsFile(dir, [{ kind: "email", email: "steady@example.invalid" }]);
    assert.equal(registry.isEmailAdmitted("steady@example.invalid"), true);
    assert.equal(registry.isEmailAdmitted("other@example.invalid"), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("readPrincipalsFile reads [] for a missing file and round-trips through writePrincipalsFile", () => {
  const dir = mkdtempSync(join(tmpdir(), "ops-mcp-principals-"));
  try {
    assert.deepEqual(readPrincipalsFile(dir), []);
    const entries = [{ kind: "email", email: "third@example.invalid" }];
    writePrincipalsFile(dir, entries);
    assert.deepEqual(readPrincipalsFile(dir), entries);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
