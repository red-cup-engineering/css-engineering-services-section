import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createChannelJournal, recordChannelReceipt } from "../scripts/record-receipt.mjs";

test("recordChannelReceipt writes a record queryable by category", async () => {
  const root = await mkdtemp(join(tmpdir(), "record-receipt-test-"));
  try {
    const record = { type: "FixtureReceipt", dedupeKey: "doi:a" };
    const admission = recordChannelReceipt({ root, category: "fixture.receipt", record, recordedAt: "2026-09-02T00:00:00.000Z" });
    assert.match(admission.id, /^ni:\/\/\/sha-256;/);
    const journal = createChannelJournal(root);
    const rows = journal.query({ category: "fixture.receipt" });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].record.dedupeKey, "doi:a");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
