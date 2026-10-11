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

/**
 * Pure evaluation: given current equity, the account's own last-close
 * equity, and the prior persisted high-water mark, compute drawdown and
 * daily-loss fractions and whether either trips the kill switch.
 *
 * Returns the *effective* (possibly ratcheted-up) high-water mark alongside
 * the reading so callers can persist it without recomputing.
 */
export function evaluateKillSwitch({ equity, lastEquity, priorHighWaterMark }) {
  if (!Number.isFinite(equity) || equity <= 0) {
    throw new Error(`kill-switch-invalid-equity:${equity}`);
  }
  const baselineHighWaterMark = Number.isFinite(priorHighWaterMark) && priorHighWaterMark > 0
    ? priorHighWaterMark
    : equity;
  const effectiveHighWaterMark = Math.max(baselineHighWaterMark, equity);
  const drawdownPct = effectiveHighWaterMark > 0
    ? (effectiveHighWaterMark - equity) / effectiveHighWaterMark
    : 0;

  const hasLastEquity = Number.isFinite(lastEquity) && lastEquity > 0;
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

  return {
    equity,
    lastEquity: hasLastEquity ? lastEquity : null,
    priorHighWaterMark: baselineHighWaterMark,
    highWaterMark: effectiveHighWaterMark,
    drawdownPct,
    dailyPnlPct,
    dailyLossPct,
    tripped: drawdownTripped || dailyLossTripped,
    reasons,
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
