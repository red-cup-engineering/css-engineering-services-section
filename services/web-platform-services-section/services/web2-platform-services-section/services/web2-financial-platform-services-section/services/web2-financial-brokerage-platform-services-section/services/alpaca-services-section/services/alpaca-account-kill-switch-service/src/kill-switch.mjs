// Shared PAPER-ONLY kill-switch module.
//
// Pure risk math (evaluateKillSwitch) is separated from state I/O and from
// systemd effects so it can be unit-tested without touching the filesystem
// or a real service manager. The two threshold constants below are the
// entire risk policy: nothing else in this file adjusts them.
//
// Drawdown is measured against a persisted high-water mark of account
// equity (data/state/high-water-mark.json), which this module both reads
// and ratchets upward -- it only ever moves up (to a new high) or stays put;
// it never repairs downward on its own. Daily loss is measured against
// Alpaca's own `last_equity` field (equity as of the prior trading day's
// close), which Alpaca already computes for exactly this purpose, so no
// second state file is needed to track "today's starting equity".

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const DRAWDOWN_TRIP_THRESHOLD = 0.10; // 10%
export const DAILY_LOSS_TRIP_THRESHOLD = 0.03; // 3%

// Alpaca resets a paper account's equity to a round starting figure (its
// dashboard default is $100,000) whenever the operator resets the paper
// account. That reset is a bookkeeping discontinuity, not a trading loss --
// a persisted high-water mark from before the reset makes the very next
// reading look like a catastrophic drawdown (see the 2026-07-23 incident:
// priorHighWaterMark 200000, equity 100014.23, read as a 49.993% drawdown).
// PAPER_ACCOUNT_RESET_BASELINE is that known reset figure; RESET_TOLERANCE
// is how close current equity must land to it (as a fraction of the
// baseline) to be treated as a reset rather than a real loss -- tight
// enough (2%) that a coincidental real drawdown landing near $100k from a
// higher high-water mark still trips, since 2% is a fifth of the 10%
// drawdown threshold itself.
export const PAPER_ACCOUNT_RESET_BASELINE = 100_000;
export const PAPER_ACCOUNT_RESET_TOLERANCE = 0.02; // 2% of the baseline

/**
 * True when current equity lands within tolerance of the configured paper
 * reset baseline while the prior high-water mark sits meaningfully above
 * it -- the signature of an account reset (e.g. equity landing near $100k
 * after a high-water mark left over from a higher pre-reset balance, such
 * as the $200k -> ~$100k halving on 2026-07-23) rather than of the account
 * having actually traded down to that level.
 */
export function isAccountResetDiscontinuity({
  equity,
  priorHighWaterMark,
  baseline = PAPER_ACCOUNT_RESET_BASELINE,
  tolerance = PAPER_ACCOUNT_RESET_TOLERANCE,
}) {
  if (!Number.isFinite(equity) || !Number.isFinite(priorHighWaterMark) || priorHighWaterMark <= 0) {
    return false;
  }
  const withinBaselineTolerance = Math.abs(equity - baseline) <= baseline * tolerance;
  const priorMarkAboveBaseline = priorHighWaterMark > baseline * (1 + tolerance);
  return withinBaselineTolerance && priorMarkAboveBaseline;
}

/**
 * Pure evaluation: given current equity, the account's own last-close
 * equity, and the prior persisted high-water mark, compute drawdown and
 * daily-loss fractions and whether either trips the kill switch.
 *
 * Returns the *effective* (possibly ratcheted-up, or reset-rebaselined)
 * high-water mark alongside the reading so callers can persist it without
 * recomputing. When an account-reset discontinuity is detected (see
 * isAccountResetDiscontinuity), the high-water mark is rebaselined to
 * current equity instead of measuring drawdown against the stale
 * pre-reset mark, and the daily-loss leg (which would suffer the identical
 * false positive against a pre-reset lastEquity) is skipped for this
 * reading too.
 */
export function evaluateKillSwitch({
  equity,
  lastEquity,
  priorHighWaterMark,
  paperResetBaseline = PAPER_ACCOUNT_RESET_BASELINE,
  paperResetTolerance = PAPER_ACCOUNT_RESET_TOLERANCE,
}) {
  if (!Number.isFinite(equity) || equity <= 0) {
    throw new Error(`kill-switch-invalid-equity:${equity}`);
  }
  const baselineHighWaterMark = Number.isFinite(priorHighWaterMark) && priorHighWaterMark > 0
    ? priorHighWaterMark
    : equity;

  const resetDetected = isAccountResetDiscontinuity({
    equity,
    priorHighWaterMark: baselineHighWaterMark,
    baseline: paperResetBaseline,
    tolerance: paperResetTolerance,
  });

  const effectiveHighWaterMark = resetDetected
    ? equity
    : Math.max(baselineHighWaterMark, equity);
  const drawdownPct = !resetDetected && effectiveHighWaterMark > 0
    ? (effectiveHighWaterMark - equity) / effectiveHighWaterMark
    : 0;

  const hasLastEquity = !resetDetected && Number.isFinite(lastEquity) && lastEquity > 0;
  const dailyPnlPct = hasLastEquity ? (equity - lastEquity) / lastEquity : 0;
  const dailyLossPct = dailyPnlPct < 0 ? -dailyPnlPct : 0;

  const drawdownTripped = drawdownPct > DRAWDOWN_TRIP_THRESHOLD;
  const dailyLossTripped = dailyLossPct > DAILY_LOSS_TRIP_THRESHOLD;

  const reasons = [];
  if (drawdownTripped) {
    reasons.push(`drawdown ${(drawdownPct * 100).toFixed(3)}% exceeds ${(DRAWDOWN_TRIP_THRESHOLD * 100).toFixed(0)}% high-water-mark limit`);
  }
  if (dailyLossTripped) {
    reasons.push(`daily loss ${(dailyLossPct * 100).toFixed(3)}% exceeds ${(DAILY_LOSS_TRIP_THRESHOLD * 100).toFixed(0)}% day-start-equity limit`);
  }

  const notes = [];
  if (resetDetected) {
    notes.push(
      `account-reset discontinuity: equity ${equity.toFixed(2)} landed within ${(paperResetTolerance * 100).toFixed(0)}% of the ` +
      `configured paper reset baseline ${paperResetBaseline.toFixed(2)} while the prior high-water mark was ${baselineHighWaterMark.toFixed(2)}; ` +
      "rebaselined instead of tripping",
    );
  }

  return {
    equity,
    lastEquity: hasLastEquity ? lastEquity : null,
    priorHighWaterMark: baselineHighWaterMark,
    highWaterMark: effectiveHighWaterMark,
    drawdownPct,
    dailyPnlPct,
    dailyLossPct,
    resetDetected,
    tripped: drawdownTripped || dailyLossTripped,
    reasons,
    notes,
  };
}

/** Load the persisted high-water mark, or null if it has never been written. */
export function loadHighWaterMark(path) {
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw);
    const value = Number(parsed?.highWaterMark);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

/** Persist the high-water mark. Initializes the file the first time it is called. */
export function saveHighWaterMark(path, highWaterMark, { asOf = new Date().toISOString() } = {}) {
  mkdirSync(dirname(path), { recursive: true });
  const body = { highWaterMark, asOf };
  writeFileSync(path, `${JSON.stringify(body, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  return body;
}

/** Append (and also point a stable "latest") a tripped-record JSON file. */
export function writeTrippedRecord(directory, record) {
  mkdirSync(directory, { recursive: true });
  const stamp = record.timestamp.replace(/[:.]/gu, "-");
  const path = `${directory}/${stamp}.json`;
  const body = `${JSON.stringify(record, null, 2)}\n`;
  writeFileSync(path, body, { encoding: "utf8", mode: 0o600 });
  writeFileSync(`${directory}/latest.json`, body, { encoding: "utf8", mode: 0o600 });
  return path;
}
