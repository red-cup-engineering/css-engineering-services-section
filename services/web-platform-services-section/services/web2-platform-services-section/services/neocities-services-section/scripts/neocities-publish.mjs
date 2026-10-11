#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertSitename, publishSite } from "../src/neocities.mjs";
import { readApiKey } from "./credentials.mjs";

const USAGE = "usage: neocities-publish <site-dir> [--dry-run] [--max-delete=N]\n"
  + "  <site-dir>/neocities.json: {\"sitename\": \"...\", \"source\": \"dist\", \"prune\": true, \"receipts\": \"data/records/deployments\"}";

export const DEFAULT_MAX_DELETE = 100;

/** A site binds itself to Neocities with neocities.json; paths in it are relative to the site directory. */
export async function readBinding(siteDir) {
  const binding = JSON.parse(await readFile(join(siteDir, "neocities.json"), "utf8"));
  return {
    sitename: assertSitename(binding.sitename),
    source: resolve(siteDir, binding.source ?? "dist"),
    prune: binding.prune ?? true,
    receipts: binding.receipts ? resolve(siteDir, binding.receipts) : null,
    maxDelete: binding.maxDelete ?? DEFAULT_MAX_DELETE,
  };
}

export const receiptName = (receipt) =>
  `${receipt.at.replace(/[-:]/gu, "").replace(/\.\d+Z$/u, "Z")}-${receipt.treeDigest.slice("sha256:".length, "sha256:".length + 12)}.json`;

export async function publish(args, { fetch: fetchImpl = fetch, env = process.env, output = process.stdout } = {}) {
  const [siteDir, ...flags] = args;
  if (!siteDir || flags.some((flag) => flag !== "--dry-run" && !/^--max-delete=\d+$/u.test(flag))) throw new Error(USAGE);
  const dryRun = flags.includes("--dry-run");
  const binding = await readBinding(resolve(siteDir));
  const maxDeleteFlag = flags.find((flag) => flag.startsWith("--max-delete="));
  const maxDelete = maxDeleteFlag ? Number(maxDeleteFlag.slice("--max-delete=".length)) : binding.maxDelete;
  const token = await readApiKey(binding.sitename, env);
  const receipt = await publishSite({ fetch: fetchImpl, token, sitename: binding.sitename, dir: binding.source, prune: binding.prune, dryRun, maxDelete });
  let stored = null;
  if (!dryRun && binding.receipts && (receipt.uploaded.length || receipt.deleted.length)) {
    await mkdir(binding.receipts, { recursive: true });
    stored = join(binding.receipts, receiptName(receipt));
    await writeFile(stored, `${JSON.stringify(receipt, null, 2)}\n`);
  }
  output.write(`${JSON.stringify({
    sitename: receipt.sitename,
    dryRun,
    treeDigest: receipt.treeDigest,
    upload: receipt.uploaded.map((file) => file.path),
    delete: receipt.deleted,
    unchanged: receipt.unchanged,
    verified: receipt.verified,
    receipt: stored,
  }, null, 2)}\n`);
  return receipt;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await publish(process.argv.slice(2));
  } catch (error) {
    console.error(error.message ?? error);
    process.exitCode = 1;
  }
}
