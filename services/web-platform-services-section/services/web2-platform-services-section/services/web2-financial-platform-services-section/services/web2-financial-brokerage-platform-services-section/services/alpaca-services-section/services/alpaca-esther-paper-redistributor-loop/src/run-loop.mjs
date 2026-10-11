#!/usr/bin/env node
// Esther Davis Alpaca paper account -- daily diversified-basket redistributor.
//
// SIBLING to alpaca-esther-paper-trading-loop. Same account, same three
// PAPER-ONLY guards, reused unmodified from
// ../../alpaca-paper-trading-guards-service/src/guards.mjs (not
// reimplemented here):
//   1. hardcoded paper trading host + outbound-URL re-check
//   2. refusal if any Alpaca *_LIVE_* credential is present in the environment
//   3. GET /v2/account verification that account_number carries the "PA"
//      paper prefix
//
// DOCTRINE: see ./target-basket.mjs for provenance. No existing
// target-allocation/portfolio/benchmark doctrine was found in the
// federation or its obsmetrologia services, so this loop uses the plain
// diversified basket given directly by the leader: 40% SPY / 20% QQQ /
// 20% TLT / 10% GLD / 10% BIL.
//
// SCHEDULE: intended to run once daily at 09:05 America/Chicago (35 minutes
// after the 08:30 CT open, so the opening auction has settled). If the
// market is closed at run time (holiday, or the timer firing outside its
// window for any reason), this exits cleanly after journaling a
// market-closed no-op -- exactly like the sibling loop.
//
// BOOTSTRAP: on a fresh all-cash account, the full basket is not bought in
// one shot. Progress is derived from this loop's OWN journal (no separate
// state file): the number of distinct trading days on which a prior run
// reached a successful "evaluation" while in the "bootstrap" phase is
// counted; that count (0..4) determines this run's tranche number
// (count+1, capped at 4) and the *effective* target basket used for this
// run is the full basket scaled by tranche/4. Once 4 bootstrap trading
// days have completed, the loop permanently uses the full basket
// ("steady-state" phase) -- this also means a partially-filled bootstrap
// day still counts as long as evaluation was reached, so an account that
// never quite hits deposit money doesn't stall forever, but a hard
// evaluation failure (market data error, etc.) does NOT count and the same
// tranche is retried the next successful run.
//
// REBALANCE RULE (steady-state, and structurally also what drives each
// bootstrap tranche): compute current weights from live positions and
// equity; any basket symbol whose |current - effective target| exceeds the
// 2% absolute DRIFT_THRESHOLD is rebalanced. Total notional traded in one
// run is capped at TURNOVER_CAP_FRACTION (25%) of equity -- if the sum of
// desired trade notionals would exceed that, every desired trade is scaled
// down proportionally (direction preserved) so the cap holds exactly.
//
// ORDERS: marketable orders sized by notional, type "market" -- matching
// the sibling loop's own order type (day time_in_force, notional sizing).
//
// JOURNAL: every decision (guard refusal, market-closed no-op, or a full
// evaluation with its drift/orders/venue responses) is appended as one
// JSON line to data/journal/redistributor-decisions.ndjson. Append-only.

import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  refuseUnlessNoLiveCredentialPresent,
  requirePaperCredentials,
  tradingFetch,
  verifyPaperAccount,
} from "@rsc-quiescent/alpaca-paper-trading-guards-service";
import { TARGET_WEIGHTS, TARGET_SYMBOLS, scaleTargets } from "./target-basket.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const JOURNAL_DIR = join(HERE, "..", "data", "journal");
const JOURNAL_FILE = join(JOURNAL_DIR, "redistributor-decisions.ndjson");

const DRIFT_THRESHOLD = 0.02; // 2% absolute, per symbol
const TURNOVER_CAP_FRACTION = 0.25; // 25% of equity, total per run
const BOOTSTRAP_TRANCHES = 4;
const MINIMUM_ORDER_NOTIONAL = 1.0; // refuse to place dust orders

function journal(entry) {
  mkdirSync(JOURNAL_DIR, { recursive: true });
  const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry });
  appendFileSync(JOURNAL_FILE, `${line}\n`, { flag: "a" });
}

function chicagoDate(isoTimestamp) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(isoTimestamp));
}

function readPriorJournalEntries() {
  let text;
  try {
    text = readFileSync(JOURNAL_FILE, "utf8");
  } catch {
    return [];
  }
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Count distinct America/Chicago trading days, strictly BEFORE today, on
 * which a prior run reached "evaluation" while bootstrapping. Excluding
 * today is what makes a second run on the same calendar day (retry, manual
 * re-trigger, timer firing twice) idempotent: it recomputes the same
 * tranche number instead of silently advancing the schedule.
 */
function countCompletedBootstrapDays(entries, today) {
  const days = new Set(
    entries
      .filter((e) => e.type === "evaluation" && e.phase === "bootstrap")
      .map((e) => chicagoDate(e.timestamp))
      .filter((day) => day !== today),
  );
  return days.size;
}

function computeCurrentWeights(positions, equity) {
  const bySymbol = new Map(positions.map((p) => [p.symbol, p]));
  return Object.fromEntries(
    TARGET_SYMBOLS.map((symbol) => {
      const position = bySymbol.get(symbol);
      const marketValue = position ? Number(position.market_value) : 0;
      return [symbol, equity > 0 ? marketValue / equity : 0];
    }),
  );
}

/** Build desired (uncapped) trade notionals per symbol from drift beyond DRIFT_THRESHOLD, then scale to the turnover cap. */
function buildTrades({ currentWeights, effectiveTargets, equity, positions }) {
  const bySymbol = new Map(positions.map((p) => [p.symbol, p]));
  const drift = {};
  const desiredNotional = {};
  for (const symbol of TARGET_SYMBOLS) {
    const current = currentWeights[symbol] ?? 0;
    const target = effectiveTargets[symbol] ?? 0;
    const symbolDrift = current - target;
    drift[symbol] = symbolDrift;
    if (Math.abs(symbolDrift) > DRIFT_THRESHOLD) {
      let notional = -symbolDrift * equity; // positive => buy, negative => sell
      if (notional < 0) {
        // Never propose selling more than the position is currently worth.
        const heldValue = Number(bySymbol.get(symbol)?.market_value ?? 0);
        notional = -Math.min(Math.abs(notional), heldValue);
      }
      desiredNotional[symbol] = notional;
    }
  }

  const totalDesiredTurnover = Object.values(desiredNotional).reduce((sum, n) => sum + Math.abs(n), 0);
  const turnoverCap = equity * TURNOVER_CAP_FRACTION;
  const scale = totalDesiredTurnover > turnoverCap && totalDesiredTurnover > 0 ? turnoverCap / totalDesiredTurnover : 1;

  const trades = Object.fromEntries(
    Object.entries(desiredNotional)
      .map(([symbol, notional]) => [symbol, notional * scale])
      .filter(([, notional]) => Math.abs(notional) >= MINIMUM_ORDER_NOTIONAL),
  );

  return { drift, desiredNotional, scale, turnoverCap, trades };
}

async function main() {
  const env = process.env;

  try {
    refuseUnlessNoLiveCredentialPresent(env);
  } catch (error) {
    journal({ type: "guard-refused", reason: error.message });
    console.error(`REFUSED: ${error.message}`);
    process.exit(1);
  }

  let key;
  let secret;
  try {
    ({ key, secret } = requirePaperCredentials(env));
  } catch (error) {
    journal({ type: "guard-refused", reason: error.message });
    console.error(`REFUSED: ${error.message}`);
    process.exit(1);
  }

  let account;
  try {
    account = await verifyPaperAccount(key, secret);
  } catch (error) {
    journal({ type: "guard-refused", reason: error.message });
    console.error(`REFUSED: ${error.message}`);
    process.exit(1);
  }

  let clockCheck;
  try {
    clockCheck = await tradingFetch(key, secret, "GET", "/v2/clock");
  } catch (error) {
    journal({ type: "clock-read-error", reason: error.message });
    console.error(`clock read failed: ${error.message}`);
    process.exit(1);
  }
  if (!clockCheck.ok) {
    journal({ type: "clock-read-refused", reason: `status:${clockCheck.status}`, response: clockCheck });
    console.error(`clock read refused: ${clockCheck.status}`);
    process.exit(1);
  }
  if (!clockCheck.body?.is_open) {
    journal({ type: "market-closed", marketOpen: false, clock: clockCheck.body });
    console.log(`Market closed (next_open=${clockCheck.body?.next_open ?? "unknown"}); exiting cleanly. Timer will fire again at the next scheduled 09:05 America/Chicago slot.`);
    process.exit(0);
  }

  const positionsResp = await tradingFetch(key, secret, "GET", "/v2/positions");
  if (!positionsResp.ok) {
    journal({ type: "positions-read-refused", reason: `status:${positionsResp.status}`, response: positionsResp });
    console.error(`positions read refused: ${positionsResp.status}`);
    process.exit(1);
  }
  const positions = Array.isArray(positionsResp.body) ? positionsResp.body : [];
  const equity = Number(account.equity);
  const cash = Number(account.cash);

  if (!Number.isFinite(equity) || equity <= 0) {
    journal({ type: "evaluation-refused", reason: `non-positive-equity:${account.equity}` });
    console.error(`refused: non-positive equity ${account.equity}`);
    process.exit(1);
  }

  const priorEntries = readPriorJournalEntries();
  const today = chicagoDate(new Date().toISOString());
  const bootstrapDaysCompleted = countCompletedBootstrapDays(priorEntries, today);
  const bootstrapping = bootstrapDaysCompleted < BOOTSTRAP_TRANCHES;
  const trancheNumber = bootstrapping ? Math.min(bootstrapDaysCompleted + 1, BOOTSTRAP_TRANCHES) : null;
  const phase = bootstrapping ? "bootstrap" : "steady-state";
  const effectiveTargets = bootstrapping ? scaleTargets(TARGET_WEIGHTS, trancheNumber / BOOTSTRAP_TRANCHES) : TARGET_WEIGHTS;

  const currentWeights = computeCurrentWeights(positions, equity);
  const { drift, desiredNotional, scale, turnoverCap, trades } = buildTrades({
    currentWeights,
    effectiveTargets,
    equity,
    positions,
  });

  const baseJournalFields = {
    type: "evaluation",
    phase,
    trancheNumber,
    bootstrapDaysCompletedBefore: bootstrapDaysCompleted,
    marketOpen: true,
    equity,
    cash,
    currentWeights,
    fullTargetWeights: TARGET_WEIGHTS,
    effectiveTargetWeights: effectiveTargets,
    drift,
    desiredNotional,
    turnoverCap,
    turnoverScale: scale,
  };

  if (Object.keys(trades).length === 0) {
    journal({ ...baseJournalFields, disposition: "no-drift", orders: [], responses: [] });
    console.log(`No rebalance needed (phase=${phase}${trancheNumber ? ` tranche=${trancheNumber}/${BOOTSTRAP_TRANCHES}` : ""}); all symbols within ${DRIFT_THRESHOLD * 100}% drift threshold.`);
    process.exit(0);
  }

  const orders = [];
  const responses = [];
  for (const [symbol, notional] of Object.entries(trades)) {
    const order = {
      symbol,
      side: notional > 0 ? "buy" : "sell",
      type: "market",
      time_in_force: "day",
      notional: Math.abs(notional).toFixed(2),
      client_order_id: `esther-redistributor-${symbol}-${Date.now()}`,
    };
    orders.push(order);
    try {
      const placement = await tradingFetch(key, secret, "POST", "/v2/orders", order);
      responses.push({ symbol, status: placement.status, ok: placement.ok, body: placement.body });
      if (placement.ok) {
        console.log(`Placed paper order ${JSON.stringify(order)} -> venue status ${placement.status}`);
      } else {
        console.error(`order placement refused by venue for ${symbol}: status=${placement.status}`);
      }
    } catch (error) {
      responses.push({ symbol, status: null, ok: false, error: error.message });
      console.error(`order transport failed for ${symbol}: ${error.message}`);
    }
  }

  const anyFailed = responses.some((r) => !r.ok);
  const anySucceeded = responses.some((r) => r.ok);
  const disposition = !anyFailed ? "orders-placed" : anySucceeded ? "orders-partially-placed" : "orders-failed";

  journal({ ...baseJournalFields, disposition, orders, responses });

  process.exit(anyFailed && !anySucceeded ? 1 : 0);
}

main().catch((error) => {
  journal({ type: "error", reason: error?.message ?? String(error) });
  console.error(error);
  process.exit(1);
});
