import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readMigrationJournal } from "../src/migration-journal.mjs";

test("reads complete journal records and a missing journal", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "migration-journal-"));
  t.after(() => rm(directory, { recursive: true }));
  const path = join(directory, "records.jsonl");
  assert.deepEqual(await readMigrationJournal(path), { records: [], recovery: null });
  await writeFile(path, "{\"n\":1}\n{\"n\":2}\n");
  assert.deepEqual(await readMigrationJournal(path), { records: [{ n: 1 }, { n: 2 }], recovery: null });
});

test("repairs only an unterminated trailing partial record", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "migration-journal-"));
  t.after(() => rm(directory, { recursive: true }));
  const path = join(directory, "records.jsonl");
  await writeFile(path, "{\"n\":1}\n{\"secretlyIncomplete\":");
  const result = await readMigrationJournal(path, { repairTrailingPartial: true });
  assert.deepEqual(result.records, [{ n: 1 }]);
  assert.equal(result.recovery.action, "discarded-trailing-partial");
  assert.equal(await readFile(path, "utf8"), "{\"n\":1}\n");
});

test("admits a complete final record missing only its newline without rewriting it", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "migration-journal-"));
  t.after(() => rm(directory, { recursive: true }));
  const path = join(directory, "records.jsonl");
  await writeFile(path, "{\"n\":1}\n{\"n\":2}");
  const result = await readMigrationJournal(path, { repairTrailingPartial: true });
  assert.deepEqual(result.records, [{ n: 1 }, { n: 2 }]);
  assert.equal(result.recovery.action, "completed-missing-newline");
});

test("fails closed on corruption in a terminated journal", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "migration-journal-"));
  t.after(() => rm(directory, { recursive: true }));
  const path = join(directory, "records.jsonl");
  await writeFile(path, "{\"n\":1}\nnot-json\n");
  await assert.rejects(readMigrationJournal(path, { repairTrailingPartial: true }), /line 2 is invalid JSON/u);
});
