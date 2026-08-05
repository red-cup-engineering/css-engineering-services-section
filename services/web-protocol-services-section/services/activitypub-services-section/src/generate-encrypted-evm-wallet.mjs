#!/usr/bin/env node

import { randomBytes } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { Wallet } from "ethers";

function required(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

/**
 * Generate one encrypted EVM identity without putting its password or private
 * key in shell syntax, argv, process output, or an environment variable.
 * Both outputs are create-only private files; a partial new pair is removed.
 */
export async function generateEncryptedEvmWallet({ keystorePath, passwordPath } = {}) {
  const selectedKeystore = required(keystorePath, "keystorePath");
  const selectedPassword = required(passwordPath, "passwordPath");
  if (selectedKeystore === selectedPassword) throw new TypeError("keystore and password paths must differ");
  const password = randomBytes(32).toString("base64url");
  const wallet = Wallet.createRandom();
  const encrypted = await wallet.encrypt(password);
  let wroteKeystore = false;
  let wrotePassword = false;
  try {
    await writeFile(selectedKeystore, `${encrypted}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
    wroteKeystore = true;
    await writeFile(selectedPassword, `${password}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
    wrotePassword = true;
  } catch (error) {
    if (wrotePassword) await unlink(selectedPassword).catch(() => undefined);
    if (wroteKeystore) await unlink(selectedKeystore).catch(() => undefined);
    throw error;
  }
  return Object.freeze({ address: wallet.address, keystorePath: selectedKeystore, passwordPath: selectedPassword });
}

async function main(argv) {
  const generated = await generateEncryptedEvmWallet({ keystorePath: argv[0], passwordPath: argv[1] });
  process.stdout.write(`${JSON.stringify(generated)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
