#!/usr/bin/env node
// Esther Davis Alpaca account -- daily diversified-basket redistributor, live
// or paper as its credentials are. Sibling to alpaca-esther-paper-trading-loop;
// shares its credentials and trading-host access. Target basket (see
// ./target-basket.mjs for provenance): 40% SPY / 20% QQQ / 20% TLT / 10%
// GLD / 10% BIL, rebalanced when a symbol drifts past DRIFT_THRESHOLD,
// capped at TURNOVER_CAP_FRACTION equity turnover per run, bootstrapped
// over BOOTSTRAP_TRANCHES days -- see countCompletedBootstrapDays and
// buildTrades below for the exact bootstrap and rebalance mechanics.

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { semanticIdOf } from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";
import { formAggressivePortfolioIntent } from "@red-cup-engineering/alpha-portfolio-order-intent-service";
import { grantBrokerageAuthority, formPrincipalBrokerageContract } from "@red-cup-engineering/principal-brokerage-interface";
import { executeAuthorizedAlpacaIntent } from "@red-cup-engineering/alpaca-esther-paper-trading-loop/execute-authorized-intent";
import {
  alpacaCredentials,
  tradingFetch,
  verifyAccount,
} from "@red-cup-engineering/alpaca-services-section/guards";
import { TARGET_WEIGHTS, TARGET_SYMBOLS, scaleTargets } from "./target-basket.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const JOURNAL_ROOT = join(HERE, "..");
const BOOKS_DATA_ROOT = join(HERE, "..", "data", "state", "brokerage-book-state");
export const JOURNAL_OBJECT_KIND = "alpaca-esther-paper-redistributor-loop.decision";
export const JOURNAL_CATEGORY = "esther-redistributor.decision";
const PRINCIPAL = "urn:principal:esther-davis";
const accountReference = (mode) => `account:esther-${mode}-redistributor`;
const contractScopes = (mode) => Object.freeze(["account:read", "activities:read", "orders:intent", `orders:${mode}`, "orders:read", "positions:read"]);
const grantScopes = (mode) => Object.freeze(["account:read", "activities:read", `orders:${mode}`, "orders:read", "positions:read"]);
const intentId = semanticIdOf("brokerage.alpaca-esther-paper-redistributor.intent-evidence");

const DRIFT_THRESHOLD = 0.02; // 2% absolute, per symbol
const TURNOVER_CAP_FRACTION = 0.25; // 25% of equity, total per run
const BOOTSTRAP_TRANCHES = 4;
const MINIMUM_ORDER_NOTIONAL = 1.0; // refuse to place dust orders

/**
 * Append a decision record through the house semantic record journal.
 * @param {object} entry - Decision fields (type, phase, disposition, orders, responses, ...).
 * @param {object} [options]
 * @param {string} [options.root] - Journal root override, for tests.
 */
export function journal(entry, { root = JOURNAL_ROOT } = {}) {
  const recordedAt = new Date().toISOString();
  createSemanticRecordJournal({ root, objectKind: JOURNAL_OBJECT_KIND }).record({
    category: JOURNAL_CATEGORY,
    recordedAt,
    record: { timestamp: recordedAt, ...entry },
    told: { for: true, against: false },
  });
}

function chicagoDate(isoTimestamp) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(isoTimestamp));
}

function readPriorJournalEntries() {
  return createSemanticRecordJournal({ root: JOURNAL_ROOT, objectKind: JOURNAL_OBJECT_KIND })
    .query({ category: JOURNAL_CATEGORY })
    .map((row) => row.record);
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

  let credentials;
  try {
    credentials = alpacaCredentials(env);
  } catch (error) {
    journal({ type: "guard-refused", reason: error.message });
    console.error(`REFUSED: ${error.message}`);
    process.exit(1);
  }

  let account;
  try {
    account = await verifyAccount(credentials);
  } catch (error) {
    journal({ type: "guard-refused", reason: error.message });
    console.error(`REFUSED: ${error.message}`);
    process.exit(1);
  }

  let clockCheck;
  try {
    clockCheck = await tradingFetch(credentials, "GET", "/v2/clock");
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

  const { mode, key, secret } = credentials;
  const venue = `alpaca-trading-${mode}`;
  const ACCOUNT_REFERENCE = accountReference(mode);
  const CONTRACT_SCOPES = contractScopes(mode);
  const GRANT_SCOPES = grantScopes(mode);
  const positionsResp = await tradingFetch(credentials, "GET", "/v2/positions");
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
    const orderNotional = Number(Math.abs(notional).toFixed(2));
    const side = notional > 0 ? "buy" : "sell";
    const now = new Date().toISOString();
    const validUntil = new Date(Date.parse(now) + 15 * 60_000).toISOString();
    const aggregateLimit = Number((Object.values(effectiveTargets).reduce((sum, weight) => sum + weight, 0) * equity).toFixed(2));
    const contract = formPrincipalBrokerageContract({
      principal: PRINCIPAL,
      venue,
      accountReference: ACCOUNT_REFERENCE,
      capital: { amount: equity, currency: "USD" },
      risk: {
        maximumLossAmount: orderNotional,
        maximumOrderNotional: orderNotional,
        maximumAggregateNotional: aggregateLimit,
        concentrationLimit: effectiveTargets[symbol],
        leverageLimit: 1,
        shorting: false,
      },
      scopes: CONTRACT_SCOPES,
      validUntil,
    });
    const authorityGrant = grantBrokerageAuthority({
      contract,
      adapter: venue,
      credentialReference: `credential:${ACCOUNT_REFERENCE}:${venue}`,
      scopes: GRANT_SCOPES,
      validUntil,
    });
    const evidencePacket = Object.freeze({
      type: "IssuerEvidencePacket",
      id: intentId({ phase, symbol, side, orderNotional, equity, effectiveTargets, currentWeights, turnoverCap, now }),
    });
    const intent = formAggressivePortfolioIntent({
      contract,
      evidencePackets: [evidencePacket],
      symbol,
      side,
      notional: orderNotional,
      maximumLoss: orderNotional,
      thesis: `Restore ${symbol} toward its ${Number(effectiveTargets[symbol] * 100).toFixed(2)}% ${phase} basket weight.`,
      falsifier: `The venue's current ${symbol} position or account capacity no longer admits this rebalance.`,
      liquidityPremise: "Alpaca accepts the bounded market order and reports a current tradable account.",
      executionPremise: `The total run turnover remains within the ${Number(TURNOVER_CAP_FRACTION * 100)}% equity cap and the order is admitted from just-in-time broker observations.`,
      scenarios: [
        { name: "bounded-order-loss", pnl: -orderNotional },
        { name: "no-fill-or-neutral-rebalance", pnl: 0 },
      ],
    });
    orders.push({ symbol, side, notional: orderNotional, contract: contract.id, authorityGrant: authorityGrant.id, intent: intent.id });
    try {
      const execution = await executeAuthorizedAlpacaIntent({ contract, authorityGrant, intent, key, secret, booksDataRoot: BOOKS_DATA_ROOT });
      const placementStatus = execution.receipt.placementStatus;
      const placed = Number.isInteger(placementStatus) && placementStatus >= 200 && placementStatus < 300;
      responses.push({ symbol, status: placementStatus ?? null, ok: placed, execution });
      if (placed) {
        console.log(`Placed contract-bound ${mode} order ${symbol} ${side} ${orderNotional} -> venue status ${placementStatus}`);
      } else {
        console.error(`contract-bound order did not reach the venue for ${symbol}: ${execution.receipt.pendingReason ?? "placement-not-observed"}`);
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

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    journal({ type: "error", reason: error?.message ?? String(error) });
    console.error(error);
    process.exit(1);
  });
}
