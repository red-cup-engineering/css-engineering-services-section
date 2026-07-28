#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { prepareAcceptanceCapsule } from "../src/acceptance-capsule.mjs";
import { loadExtendedJson } from "../src/extended-json.mjs";

const [inputPath, journalPath, supplierJobId, outputPath] = process.argv.slice(2);
if (!inputPath || !journalPath || !supplierJobId || !outputPath) {
  process.stderr.write("usage: seal-acceptance-candidate input.json broker-journal.json supplier-job-id output.json\n");
  process.exit(2);
}
const target = resolve(outputPath);
if (existsSync(target)) throw new Error(`acceptance settlement output already exists: ${target}`);
const input = loadExtendedJson(resolve(inputPath));
const records = readFileSync(resolve(journalPath), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)).filter((record) => record.id === supplierJobId && typeof record.text === "string");
if (!records.length) throw new Error(`no completed supplier record found: ${supplierJobId}`);
const supplierRecord = records.at(-1), supplied = JSON.parse(supplierRecord.text);
const capsule = await prepareAcceptanceCapsule({ ...input, artifacts: [supplied.artifact] });
const settlement = {
  type: "AcceptanceProcurementSettlement",
  id: input.id,
  supplier: { jobId: supplierRecord.id, endpoint: supplierRecord.endpoint || null, rationale: supplied.rationale },
  refusedCandidates: [],
  capsule,
  resourceAccount: { supplierJobs: 1, supplierAttempts: supplierRecord.attempts?.length || 0, usefulSupplierCompletions: 1, directInteractiveModelCalls: 0, resumedFromDurableSupplierRecord: true },
};
mkdirSync(dirname(target), { recursive: true });
const temporary = `${target}.temporary-${process.pid}`;
writeFileSync(temporary, JSON.stringify(settlement, null, 2) + "\n", { flag: "wx", mode: 0o600 });
renameSync(temporary, target);
process.stdout.write(JSON.stringify({ id: settlement.id, supplier: settlement.supplier, capsuleDigest: capsule.digest, output: target, resourceAccount: settlement.resourceAccount }) + "\n");
