import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { createBrokerageOutcomeWitnessRecorder } from "@red-cup-engineering/brokerage-independent-witness-and-books";

import { LOOP_RECORDS, loopRecordPath, runTradingCycle } from "../src/pipeline.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = join(HERE, "..");
const seed = (dataRoot, record, bytes = readFileSync(loopRecordPath(DATA_ROOT, record))) => {
  const path = loopRecordPath(dataRoot, record);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
};
const ENV = Object.freeze({ ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_KEY: "fake-key", ALPACA_ACCOUNT_ESTHER_PAPER_TRADING_SECRET: "fake-secret" });

/**
 * A deterministic fake Alpaca adapter that mutates its own tracked
 * account/position state exactly the way a real fill would, so the
 * pipeline's own predicted post-trade snapshot reconciles cleanly
 * against what this fake venue reports.
 */
function fakeAdapter({ startingEquity = 100_000, startingCash = 100_000 } = {}) {
  const state = { equity: startingEquity, cash: startingCash, positions: new Map() };
  const orders = new Map();
  const FILL_PRICE = 100;
  return {
    state,
    async readAccount() { return { id: "account-read", status: 200, payload: { cash: String(state.cash), equity: String(state.equity), buying_power: String(state.cash) } }; },
    async listPositions() { return { id: "positions-read", status: 200, payload: [...state.positions.values()] }; },
    async listActivities() { return { id: "activities-read", status: 200, payload: [] }; },
    async getOrderByClientOrderId({ clientOrderId }) {
      const order = orders.get(clientOrderId);
      return order ? { id: `order-read:${clientOrderId}`, status: 200, payload: order } : { status: 404, payload: null };
    },
    async placeOrder({ order }) {
      const filledQty = Number(order.notional) / FILL_PRICE;
      const filled = { ...order, id: "venue-order:1", status: "filled", filled_qty: String(filledQty), filled_avg_price: String(FILL_PRICE) };
      orders.set(order.client_order_id, filled);
      const existing = state.positions.get(order.symbol);
      const qty = (existing ? Number(existing.qty) : 0) + filledQty;
      const marketValue = (existing ? Number(existing.market_value) : 0) + Number(order.notional);
      state.positions.set(order.symbol, { symbol: order.symbol, qty: String(qty), market_value: String(marketValue), avg_entry_price: String(marketValue / qty) });
      state.cash -= Number(order.notional);
      return { id: "placement:1", status: 200, payload: filled };
    },
  };
}

async function witnessRecorder(root) {
  mkdirSync(root, { recursive: true });
  return createBrokerageOutcomeWitnessRecorder({ BROKERAGE_BOOKS_DATA_ROOT: root });
}

test("one cycle threads belief -> tournament -> mandate -> size-position -> order intent -> execution -> witness -> reconciliation and places a paper buy order", async () => {
  const root = mkdtempSync(join(tmpdir(), "alpaca-esther-paper-trading-loop-books-"));
  try {
    const adapter = fakeAdapter();
    const venueAuthority = { adapter, registerExecutionRecords() {}, recordOutcomeWitness: await witnessRecorder(root) };
    const outcome = await runTradingCycle({ env: ENV, dataRoot: DATA_ROOT, venueAuthority, clock: () => "2026-09-05T15:00:00.000Z" });

    assert.equal(outcome.disposition, "order");
    assert.equal(outcome.intent.type, "AggressiveBrokerageOrderIntent");
    assert.equal(outcome.intent.symbol, "BLK");
    assert.equal(outcome.intent.side, "buy");
    assert.ok(outcome.intent.notional > 0);
    assert.ok(outcome.intent.notional <= 100_000 * 0.05 + 1e-6, "notional stays within the mandate's 5% ceiling");
    assert.equal(outcome.sizing.admitted, true);
    assert.equal(outcome.receipt.type, "AlpacaPaperExecutionAndReconciliationReceipt");
    assert.equal(outcome.receipt.orderVenueStatus, "filled");
    assert.ok(outcome.witness.witness.id.startsWith("ni:///sha-256;"));
    assert.equal(outcome.reconciliation.type, "BrokerageAccountReconciliation");
    assert.equal(outcome.reconciliation.disposition, "reconciled");
    assert.equal(outcome.reconciliation.mismatchCount, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("cycle emits a hold intent, never a buy, when the tournament has not established alpha over the baseline", async () => {
  const dataRoot = mkdtempSync(join(tmpdir(), "alpaca-esther-paper-trading-loop-hold-data-"));
  const booksRoot = mkdtempSync(join(tmpdir(), "alpaca-esther-paper-trading-loop-hold-books-"));
  try {
    for (const record of [LOOP_RECORDS.belief, LOOP_RECORDS.mandate]) seed(dataRoot, record);
    const tournamentFile = JSON.parse(readFileSync(loopRecordPath(DATA_ROOT, LOOP_RECORDS.tournament), "utf8"));
    // Rig the selection so the validation winner does not beat buy-and-hold on holdout (the honest "alpha not established" case the task names).
    tournamentFile.record = { ...tournamentFile.record, selected: { ...tournamentFile.record.selected, selectedUsingValidationOnly: "macd", untouchedHoldout: { ...tournamentFile.record.selected.untouchedHoldout, macd: { metric: 0.1, maximumDrawdown: 0.01 }, "buy-and-hold": { metric: 0.5, maximumDrawdown: 0.01 } } } };
    // inputsDigest is left as-is on purpose: this rigged record's own request is unchanged, so the digest still matches and only the recomputed judgement (holdout comparison) differs from the on-disk selection.
    seed(dataRoot, LOOP_RECORDS.tournament, JSON.stringify(tournamentFile));

    const adapter = fakeAdapter();
    const venueAuthority = { adapter, registerExecutionRecords() {}, recordOutcomeWitness: await witnessRecorder(booksRoot) };
    const outcome = await runTradingCycle({ env: ENV, dataRoot, venueAuthority, clock: () => "2026-09-05T15:00:00.000Z" });

    assert.equal(outcome.disposition, "hold");
    assert.match(outcome.holdIntent.reason, /does not beat buy-and-hold/u);
    assert.equal(outcome.reconciliation.disposition, "reconciled");
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
    rmSync(booksRoot, { recursive: true, force: true });
  }
});

test("cycle refuses when the belief record's falsifier has fired", async () => {
  const dataRoot = mkdtempSync(join(tmpdir(), "alpaca-esther-paper-trading-loop-fired-"));
  try {
    for (const record of [LOOP_RECORDS.mandate, LOOP_RECORDS.tournament]) seed(dataRoot, record);
    const belief = JSON.parse(readFileSync(loopRecordPath(DATA_ROOT, LOOP_RECORDS.belief), "utf8"));
    seed(dataRoot, LOOP_RECORDS.belief, JSON.stringify({ ...belief, falsifierFired: true }));

    await assert.rejects(
      runTradingCycle({ env: ENV, dataRoot, venueAuthority: {}, clock: () => "2026-09-05T15:00:00.000Z" }),
      /belief-falsifier-fired:/u,
    );
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});

test("cycle refuses when the belief record is absent", async () => {
  const dataRoot = mkdtempSync(join(tmpdir(), "alpaca-esther-paper-trading-loop-missing-"));
  try {
    await assert.rejects(
      runTradingCycle({ env: ENV, dataRoot, venueAuthority: {}, clock: () => "2026-09-05T15:00:00.000Z" }),
      /belief-record-missing:/u,
    );
  } finally {
    rmSync(dataRoot, { recursive: true, force: true });
  }
});
