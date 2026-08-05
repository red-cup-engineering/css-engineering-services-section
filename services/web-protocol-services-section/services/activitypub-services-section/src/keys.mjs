#!/usr/bin/env node

import { exportJwk, generateCryptoKeyPair } from "@fedify/fedify";
import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";

export async function generateActorKeyMaterial() {
  const pairs = [
    await generateCryptoKeyPair("RSASSA-PKCS1-v1_5"),
    await generateCryptoKeyPair("Ed25519"),
  ];
  return Promise.all(pairs.map(async (pair) => Object.freeze({
    privateKey: await exportJwk(pair.privateKey),
    publicKey: await exportJwk(pair.publicKey),
  })));
}

async function main(argv) {
  const output = requiredOutput(argv[0]);
  const bearerTokenFlag = argv.indexOf("--inbox-bearer-token-file");
  const bearerTokenPath = bearerTokenFlag === -1 ? undefined : argv[bearerTokenFlag + 1];
  if (bearerTokenFlag !== -1 && (typeof bearerTokenPath !== "string" || bearerTokenPath.trim() === "")) {
    throw new TypeError("--inbox-bearer-token-file requires one new private file path");
  }
  const material = await generateActorKeyMaterial();
  await writeFile(output, `${JSON.stringify(material, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
  if (bearerTokenPath !== undefined) {
    await writeFile(bearerTokenPath, `${randomBytes(48).toString("base64url")}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
  }
  process.stdout.write(`${output}\n`);
}

function requiredOutput(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("usage: generate-activitypub-keys <new-key-file.json>");
  }
  return value;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
