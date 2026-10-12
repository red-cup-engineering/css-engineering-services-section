import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { each } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { JOURNAL_TYPE, journal } from "../src/run-loop.mjs";

test("journal() writes a witnessed decision record carrying the cycle disposition", () => {
  const root = mkdtempSync(join(tmpdir(), "alpaca-esther-paper-trading-loop-"));
  try {
    const receipt = journal(
      { guard: "passed", disposition: "hold", cycle: { disposition: "hold", holdIntent: { reason: "test" } } },
      { root },
    );

    assert.equal(receipt.disposition, "hold");

    const rows = [...each(root, JOURNAL_TYPE)];
    assert.equal(rows.length, 1);
    const [row] = rows;
    assert.equal(row.record.disposition, "hold");
    assert.equal(row.record.cycle.holdIntent.reason, "test");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("journal() still writes the unchanged content-addressed stdout receipt shape", () => {
  const root = mkdtempSync(join(tmpdir(), "alpaca-esther-paper-trading-loop-"));
  try {
    const receipt = journal({ guard: "passed", disposition: "hold" }, { root });
    assert.equal(receipt.type, "AlpacaTradingDecisionReceipt");
    assert.ok(receipt.id.startsWith("ni:///sha-256;"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("every current call-site disposition round-trips through the witnessed journal", () => {
  const root = mkdtempSync(join(tmpdir(), "alpaca-esther-paper-trading-loop-"));
  try {
    const dispositions = ["clock-read-error", "clock-read-refused", "market-closed", "hold", "order"];
    for (const disposition of dispositions) {
      journal({ guard: "passed", disposition }, { root });
    }
    const rows = [...each(root, JOURNAL_TYPE)];
    assert.equal(rows.length, dispositions.length);
    assert.deepEqual(rows.map((row) => row.record.disposition).sort(), [...dispositions].sort());
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
