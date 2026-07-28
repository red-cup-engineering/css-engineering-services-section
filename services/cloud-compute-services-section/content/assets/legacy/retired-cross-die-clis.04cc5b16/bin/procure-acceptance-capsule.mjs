#!/usr/bin/env node
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { procureAcceptanceCapsule } from "../src/acceptance-procurement.mjs";
import { loadExtendedJson } from "../src/extended-json.mjs";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  process.stderr.write("usage: procure-acceptance-capsule input.json output.json\n");
  process.exit(2);
}
const target = resolve(outputPath);
if (existsSync(target)) throw new Error(`acceptance procurement output already exists: ${target}`);
const input = loadExtendedJson(resolve(inputPath));
const settlement = await procureAcceptanceCapsule(input);
mkdirSync(dirname(target), { recursive: true });
const temporary = `${target}.temporary-${process.pid}`;
writeFileSync(temporary, JSON.stringify(settlement, null, 2) + "\n", { flag: "wx", mode: 0o600 });
renameSync(temporary, target);
process.stdout.write(JSON.stringify({ id: settlement.id, supplier: settlement.supplier, capsuleDigest: settlement.capsule.digest, output: target, resourceAccount: settlement.resourceAccount }) + "\n");
