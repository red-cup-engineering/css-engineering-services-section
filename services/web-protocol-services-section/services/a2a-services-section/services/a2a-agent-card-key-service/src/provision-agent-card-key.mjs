#!/usr/bin/env node
import { generateKeyPair } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { exportJWK, exportPKCS8 } from "jose";

function value(flag) { const at = process.argv.indexOf(flag); return at < 0 ? undefined : process.argv[at + 1]; }
const privatePath = resolve(value("--signing-key") ?? ""), jwksPath = resolve(value("--jwks") ?? ""), kid = value("--kid");
if (!value("--signing-key") || !value("--jwks") || !kid) throw new Error("--signing-key, --jwks, and --kid are required");
for (const path of [privatePath, jwksPath]) {
  try { await stat(path); throw new Error(`refusing to replace existing ${path}`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const { privateKey, publicKey } = await new Promise((accept, reject) => generateKeyPair("ed25519", {}, (error, publicKey, privateKey) => error ? reject(error) : accept({ publicKey, privateKey })));
const publicJwk = { ...(await exportJWK(publicKey)), kid, alg: "EdDSA", use: "sig" };
await mkdir(dirname(privatePath), { recursive: true }); await mkdir(dirname(jwksPath), { recursive: true });
await writeFile(privatePath, await exportPKCS8(privateKey), { encoding: "utf8", mode: 0o600, flag: "wx" });
await writeFile(jwksPath, `${JSON.stringify({ keys: [publicJwk] })}\n`, { encoding: "utf8", mode: 0o644, flag: "wx" });
process.stdout.write(`${kid}\n`);
