import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  DAILY_LOSS_TRIP_THRESHOLD,
  DRAWDOWN_TRIP_THRESHOLD,
  PAPER_ACCOUNT_RESET_BASELINE,
  PAPER_ACCOUNT_RESET_TOLERANCE,
  evaluateKillSwitch,
  isAccountResetDiscontinuity,
  loadHighWaterMark,
  saveHighWaterMark,
  writeTrippedRecord,
} from "../src/kill-switch.mjs";

test("first observation initializes the high-water mark from current equity and never trips", () => {
  const reading = evaluateKillSwitch({ equity: 100, lastEquity: 100, priorHighWaterMark: null });
  assert.equal(reading.highWaterMark, 100);
  assert.equal(reading.drawdownPct, 0);
  assert.equal(reading.tripped, false);
});

test("drawdown exactly at the 10% threshold does not trip; just over it does", () => {
  const atThreshold = evaluateKillSwitch({ equity: 90, lastEquity: 90, priorHighWaterMark: 100 });
  assert.equal(atThreshold.drawdownPct, DRAWDOWN_TRIP_THRESHOLD);
  assert.equal(atThreshold.tripped, false);

  const overThreshold = evaluateKillSwitch({ equity: 89.9, lastEquity: 89.9, priorHighWaterMark: 100 });
  assert.ok(overThreshold.drawdownPct > DRAWDOWN_TRIP_THRESHOLD);
  assert.equal(overThreshold.tripped, true);
  assert.match(overThreshold.reasons[0], /drawdown/u);
});

test("daily loss exactly at the 3% threshold does not trip; just over it does", () => {
  const atThreshold = evaluateKillSwitch({ equity: 97, lastEquity: 100, priorHighWaterMark: 100 });
  assert.equal(atThreshold.dailyLossPct, DAILY_LOSS_TRIP_THRESHOLD);
  assert.equal(atThreshold.tripped, false);

  const overThreshold = evaluateKillSwitch({ equity: 96.9, lastEquity: 100, priorHighWaterMark: 100 });
  assert.ok(overThreshold.dailyLossPct > DAILY_LOSS_TRIP_THRESHOLD);
  assert.equal(overThreshold.tripped, true);
  assert.match(overThreshold.reasons.join(";"), /daily loss/u);
});

test("a new equity high ratchets the high-water mark up and resets drawdown to zero", () => {
  const reading = evaluateKillSwitch({ equity: 150, lastEquity: 140, priorHighWaterMark: 100 });
  assert.equal(reading.highWaterMark, 150);
  assert.equal(reading.drawdownPct, 0);
  assert.equal(reading.tripped, false);
});

test("a gain day never trips on the daily-loss leg", () => {
  const reading = evaluateKillSwitch({ equity: 200, lastEquity: 100, priorHighWaterMark: 100 });
  assert.equal(reading.dailyLossPct, 0);
  assert.equal(reading.tripped, false);
});

test("invalid equity refuses rather than silently evaluating", () => {
  assert.throws(() => evaluateKillSwitch({ equity: 0, lastEquity: 100, priorHighWaterMark: 100 }), /invalid-equity/u);
  assert.throws(() => evaluateKillSwitch({ equity: NaN, lastEquity: 100, priorHighWaterMark: 100 }), /invalid-equity/u);
});

test("high-water mark state round-trips through disk and is missing (null) before first write", () => {
  const dir = mkdtempSync(join(tmpdir(), "kill-switch-state-"));
  const path = join(dir, "high-water-mark.json");
  try {
    assert.equal(loadHighWaterMark(path), null);
    saveHighWaterMark(path, 123.45, { asOf: "2026-07-23T00:00:00.000Z" });
    assert.equal(loadHighWaterMark(path), 123.45);
    const onDisk = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(onDisk.highWaterMark, 123.45);
    assert.equal(onDisk.asOf, "2026-07-23T00:00:00.000Z");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the 2026-07-23 incident (200000 -> 100014.23) is detected as a paper-account reset, not a trip", () => {
  const reading = evaluateKillSwitch({ equity: 100014.23, lastEquity: null, priorHighWaterMark: 200000 });
  assert.equal(reading.resetDetected, true);
  assert.equal(reading.tripped, false);
  assert.equal(reading.drawdownPct, 0);
  assert.equal(reading.highWaterMark, 100014.23);
  assert.equal(reading.reasons.length, 0);
  assert.match(reading.notes[0], /account-reset discontinuity/u);
});

test("isAccountResetDiscontinuity is true only when equity is near the baseline and the prior mark sits above it", () => {
  assert.equal(
    isAccountResetDiscontinuity({ equity: 100014.23, priorHighWaterMark: 200000 }),
    true,
  );
  assert.equal(
    isAccountResetDiscontinuity({ equity: PAPER_ACCOUNT_RESET_BASELINE, priorHighWaterMark: PAPER_ACCOUNT_RESET_BASELINE }),
    false,
    "no prior mark above baseline -- nothing to reset away from",
  );
  assert.equal(
    isAccountResetDiscontinuity({ equity: 80000, priorHighWaterMark: 200000 }),
    false,
    "equity far from the baseline is a real drawdown, not a reset",
  );
});

test("a reset discontinuity also suppresses the daily-loss leg against a stale pre-reset lastEquity", () => {
  const reading = evaluateKillSwitch({ equity: 100014.23, lastEquity: 200000, priorHighWaterMark: 200000 });
  assert.equal(reading.resetDetected, true);
  assert.equal(reading.dailyLossPct, 0);
  assert.equal(reading.lastEquity, null);
  assert.equal(reading.tripped, false);
});

test("a real drawdown that happens to land just outside reset tolerance still trips", () => {
  const justOutsideTolerance = PAPER_ACCOUNT_RESET_BASELINE * (1 + PAPER_ACCOUNT_RESET_TOLERANCE + 0.10);
  const reading = evaluateKillSwitch({ equity: justOutsideTolerance, lastEquity: justOutsideTolerance, priorHighWaterMark: 200000 });
  assert.equal(reading.resetDetected, false);
  assert.equal(reading.tripped, true);
});

test("tripped records are written both timestamped and as latest.json", () => {
  const dir = mkdtempSync(join(tmpdir(), "kill-switch-tripped-"));
  try {
    const record = { timestamp: "2026-07-23T15:00:00.000Z", outcome: "tripped", reasons: ["test"] };
    const path = writeTrippedRecord(dir, record);
    assert.equal(JSON.parse(readFileSync(path, "utf8")).outcome, "tripped");
    assert.equal(JSON.parse(readFileSync(join(dir, "latest.json"), "utf8")).outcome, "tripped");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
