import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { each } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { JOURNAL_TYPE, journal } from "../src/run-loop.mjs";

test("journal() round-trips a full evaluation decision through the house journal (unmodified behavior, post dependency-pin bump)", () => {
  const root = mkdtempSync(join(tmpdir(), "alpaca-esther-paper-redistributor-loop-"));
  try {
    journal(
      {
        type: "evaluation",
        phase: "bootstrap",
        trancheNumber: 1,
        disposition: "orders-placed",
        equity: 100000,
        currentWeights: { SPY: 0, QQQ: 0, TLT: 0, GLD: 0, BIL: 0 },
        drift: { SPY: -0.1 },
        orders: [{ symbol: "SPY", side: "buy", notional: "10000.00" }],
        responses: [{ symbol: "SPY", status: 200, ok: true }],
      },
      { root },
    );

    const rows = [...each(root, JOURNAL_TYPE)];
    assert.equal(rows.length, 1);
    const [row] = rows;
    assert.equal(row.record.type, "evaluation");
    assert.equal(row.record.phase, "bootstrap");
    assert.equal(row.record.disposition, "orders-placed");
    assert.equal(row.record.orders[0].symbol, "SPY");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("journal() round-trips a guard-refused no-op decision", () => {
  const root = mkdtempSync(join(tmpdir(), "alpaca-esther-paper-redistributor-loop-"));
  try {
    journal({ type: "guard-refused", reason: "no-paper-credentials" }, { root });
    const rows = [...each(root, JOURNAL_TYPE)];
    assert.equal(rows.length, 1);
    assert.equal(rows[0].record.type, "guard-refused");
    assert.equal(rows[0].record.reason, "no-paper-credentials");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
