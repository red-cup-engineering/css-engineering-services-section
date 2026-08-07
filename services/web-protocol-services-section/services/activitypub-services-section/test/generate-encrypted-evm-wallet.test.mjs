import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { Wallet } from "ethers";

import { generateEncryptedEvmWallet } from "../src/generate-encrypted-evm-wallet.mjs";

test("encrypted EVM identity generation is private, decryptable, and create-only", async () => {
  const root = await mkdtemp(join(tmpdir(), "union-evm-identity-"));
  const keystorePath = join(root, "wallet.json"), passwordPath = join(root, "wallet.password");
  try {
    const generated = await generateEncryptedEvmWallet({ keystorePath, passwordPath });
    const [keystore, password, keystoreStat, passwordStat] = await Promise.all([
      readFile(keystorePath, "utf8"), readFile(passwordPath, "utf8"), stat(keystorePath), stat(passwordPath),
    ]);
    assert.equal((keystoreStat.mode & 0o077), 0);
    assert.equal((passwordStat.mode & 0o077), 0);
    assert.equal((await Wallet.fromEncryptedJson(keystore, password.trim())).address, generated.address);
    await assert.rejects(generateEncryptedEvmWallet({ keystorePath, passwordPath }), /EEXIST/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
