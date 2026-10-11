#!/usr/bin/env node
// Esther Davis Alpaca paper account -- standing PAPER-ONLY order loop.
//
// PAPER-ONLY GUARD DESIGN (all three are independent and all must pass):
//   1. TRADING_HOST below is a literal constant, not read from env or
//      config, so no environment drift can point this process at a live
//      venue. Every outbound URL is rebuilt from this constant and
//      re-checked (protocol + hostname) immediately before use.
//   2. Before doing anything else, the process environment is scanned for
//      any key that looks like an Alpaca *live* trading credential
//      (matches /ALPACA/i and /LIVE/i). If one is present -- even unused --
//      the run refuses and exits nonzero. This mirrors the federation's own
//      convention (see brokerage-authority-custody-service) that live
//      Alpaca credentials are handled out-of-band from env vars entirely.
//   3. After (1)+(2) pass, GET /v2/account is called against the
//      hard-coded paper host and the returned account_number is checked
//      against Alpaca's paper-account prefix ("PA..."). Any failure to
//      authenticate, or an account number that doesn't carry that prefix,
//      refuses and exits nonzero.
//
// These three guards now live in ../../alpaca-paper-trading-guards-service
// (extracted unmodified) so that every standing loop against this account,
// including alpaca-esther-paper-redistributor-loop, enforces the identical
// refusal behavior from one shared place.
//
// STRATEGY REUSE: the trading signal is exactly
// obsmetrologia-blk-accumulation-strategy-service's evaluateBlkAccumulationStrategy
// (BLK vs SPY, long-only fractional accumulation), imported unmodified, with
// its own defaults (maximumOrderFraction=0.25, volatilityTarget=0.18,
// maximumDrawdown=0.30, scheduledContribution=0 -- none of these are
// overridden here because no scheduled-contribution mandate has been
// configured anywhere in the repo for this account). Market data reuses
// alpaca-market-data-read-service's readDailyBars unmodified.
//
// SIZING OVERLAY: on top of the strategy's own proposedNotional, this loop
// applies a hard conservative cap of 5% of current account equity per
// order, and refuses to open a new symbol position once the account already
// holds MAX_OPEN_POSITIONS distinct symbols. This is a live-loop-side
// defense-in-depth overlay, not a change to the strategy's own math.
//
// RECEIPT: every decision (trade or no-trade) is emitted once as a content-addressed
// JSON record on stdout. The ephemeral runner retains no restorable voxel state.

import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { evaluateBlkAccumulationStrategy } from "@rsc-quiescent/obsmetrologia-blk-accumulation-strategy-service";
import { createAlpacaHistoricalBarsService } from "@rsc-quiescent/alpaca-market-data-read-service";
import {
  refuseUnlessNoLiveCredentialPresent,
  requirePaperCredentials,
  tradingFetch,
  verifyPaperAccount,
} from "@rsc-quiescent/alpaca-paper-trading-guards-service";

const SYMBOL = "BLK";
const BENCHMARK = "SPY";
const MAX_POSITION_FRACTION_OF_EQUITY = 0.05;
const MAX_OPEN_POSITIONS = 10;
const HISTORY_LOOKBACK_DAYS = 400;
const relationalId = (value) => identifyJsonSemanticContent({ objectKind: "brokerage.alpaca-esther-paper-trading-loop.record", value, witnessRoot: EMPTY_WITNESS_ROOT }).id;

function journal(entry) {
  const body = Object.freeze({
    type: "AlpacaPaperTradingDecisionReceipt",
    version: 2,
    observedAt: new Date().toISOString(),
    venue: "alpaca-trading-paper",
    paperOnly: true,
    persistentVoxelState: false,
    ...entry,
  });
  const receipt = Object.freeze({ id: relationalId(body), ...body });
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
  return receipt;
}

async function main() {
  const env = process.env;

  try {
    refuseUnlessNoLiveCredentialPresent(env);
  } catch (error) {
    journal({ guard: "refused", reason: error.message, signal: null, order: null, response: null });
    console.error(`REFUSED: ${error.message}`);
    process.exit(1);
  }

  let key;
  let secret;
  try {
    ({ key, secret } = requirePaperCredentials(env));
  } catch (error) {
    journal({ guard: "refused", reason: error.message, signal: null, order: null, response: null });
    console.error(`REFUSED: ${error.message}`);
    process.exit(1);
  }

  let account;
  try {
    account = await verifyPaperAccount(key, secret);
  } catch (error) {
    journal({ guard: "refused", reason: error.message, signal: null, order: null, response: null });
    console.error(`REFUSED: ${error.message}`);
    process.exit(1);
  }

  let clockCheck;
  try {
    clockCheck = await tradingFetch(key, secret, "GET", "/v2/clock");
  } catch (error) {
    journal({ guard: "passed", disposition: "clock-read-error", reason: error.message, signal: null, order: null, response: null });
    console.error(`clock read failed: ${error.message}`);
    process.exit(1);
  }
  if (!clockCheck.ok) {
    journal({ guard: "passed", disposition: "clock-read-refused", reason: `status:${clockCheck.status}`, signal: null, order: null, response: clockCheck });
    console.error(`clock read refused: ${clockCheck.status}`);
    process.exit(1);
  }
  if (!clockCheck.body?.is_open) {
    journal({ guard: "passed", disposition: "market-closed", signal: null, order: null, response: { clock: clockCheck.body } });
    console.log(`Market closed (next_open=${clockCheck.body?.next_open ?? "unknown"}); exiting cleanly.`);
    process.exit(0);
  }

  const positionsResp = await tradingFetch(key, secret, "GET", "/v2/positions");
  if (!positionsResp.ok) {
    journal({ guard: "passed", disposition: "positions-read-refused", reason: `status:${positionsResp.status}`, signal: null, order: null, response: positionsResp });
    console.error(`positions read refused: ${positionsResp.status}`);
    process.exit(1);
  }
  const positions = Array.isArray(positionsResp.body) ? positionsResp.body : [];
  const openPositionSymbols = new Set(positions.map((p) => p.symbol));
  const blkPosition = positions.find((p) => p.symbol === SYMBOL);
  const currentBlkMarketValue = blkPosition ? Number(blkPosition.market_value) : 0;
  const equity = Number(account.equity);
  const cash = Number(account.cash);

  const recordObservation = async (event) => ({
    id: relationalId({ type: event?.type, valueId: event?.value?.id }),
    settlementState: "unsettled",
    requiredSettlement: "eip155:5615610",
  });
  const marketData = createAlpacaHistoricalBarsService(env, { recordObservation });
  const asOf = new Date().toISOString();
  const start = new Date(Date.parse(asOf) - HISTORY_LOOKBACK_DAYS * 86_400_000).toISOString();

  let observation;
  try {
    observation = await marketData.readDailyBars({ symbols: [SYMBOL, BENCHMARK], start, end: asOf, feed: "iex", adjustment: "all" });
  } catch (error) {
    journal({ guard: "passed", disposition: "market-data-failed", reason: error.message, signal: null, order: null, response: null });
    console.error(`market data read failed: ${error.message}`);
    process.exit(1);
  }

  let reading;
  try {
    reading = evaluateBlkAccumulationStrategy({
      blkBars: observation.bars[SYMBOL],
      spyBars: observation.bars[BENCHMARK],
      asOf,
      cash,
      currentBlkMarketValue,
      marketDataObservation: observation.id,
    });
  } catch (error) {
    journal({ guard: "passed", disposition: "strategy-refused", reason: error.message, signal: null, order: null, response: null });
    console.error(`strategy refused: ${error.message}`);
    process.exit(1);
  }

  const signalSummary = {
    instrument: reading.instrument,
    benchmark: reading.benchmark,
    disposition: reading.disposition,
    proposedNotional: reading.proposedNotional,
    directionalCharge: reading.directionalCharge,
    bullishRegime: reading.bullishRegime.regime,
    bearishRegime: reading.bearishRegime.regime,
    relativeReturn20: reading.relativeReturn20,
    relativeReturn60: reading.relativeReturn60,
    annualizedVolatility: reading.annualizedVolatility,
    trailingMaximumDrawdown: reading.trailingMaximumDrawdown,
    marketDataEvidence: {
      observation: observation.id,
      venueRequestId: observation.venueRequestId,
      independentBooksReceipt: observation.independentBooksReceipt.id,
      settlementState: observation.independentBooksReceipt.settlementState,
      requiredSettlement: observation.independentBooksReceipt.requiredSettlement,
    },
    policy: reading.policy,
  };

  const wouldOpenNewPosition = reading.disposition === "accumulate" && !openPositionSymbols.has(SYMBOL);
  const positionLimitBlocked = wouldOpenNewPosition && openPositionSymbols.size >= MAX_OPEN_POSITIONS;
  const conservativeCap = Number.isFinite(equity) ? equity * MAX_POSITION_FRACTION_OF_EQUITY : 0;
  const executedNotional = reading.disposition === "accumulate" && !positionLimitBlocked
    ? Math.max(0, Math.min(reading.proposedNotional, conservativeCap))
    : 0;

  if (reading.disposition !== "accumulate" || executedNotional <= 0) {
    const reason = positionLimitBlocked ? "open-position-limit-reached" : `strategy-disposition:${reading.disposition}`;
    journal({
      guard: "passed",
      disposition: positionLimitBlocked ? "no-order-position-limit" : reading.disposition,
      reason,
      signal: signalSummary,
      order: null,
      response: null,
    });
    console.log(`No order: disposition=${reading.disposition} proposedNotional=${reading.proposedNotional} reason=${reason}`);
    process.exit(0);
  }

  const order = {
    symbol: SYMBOL,
    side: "buy",
    type: "market",
    time_in_force: "day",
    notional: executedNotional.toFixed(2),
    client_order_id: `esther-blk-${Date.now()}`,
  };

  let placement;
  try {
    placement = await tradingFetch(key, secret, "POST", "/v2/orders", order);
  } catch (error) {
    journal({ guard: "passed", disposition: "order-transport-error", reason: error.message, signal: signalSummary, order, response: null });
    console.error(`order transport failed: ${error.message}`);
    process.exit(1);
  }

  journal({
    guard: "passed",
    disposition: "accumulate",
    signal: {
      ...signalSummary,
      executedNotional,
      cappedByConservativeOverlay: executedNotional < reading.proposedNotional,
    },
    order,
    response: { status: placement.status, body: placement.body },
  });

  if (!placement.ok) {
    console.error(`order placement refused by venue: status=${placement.status}`);
    process.exit(1);
  }
  console.log(`Placed paper order ${JSON.stringify(order)} -> venue status ${placement.status}`);
  process.exit(0);
}

main().catch((error) => {
  journal({ guard: "error", reason: error?.message ?? String(error), signal: null, order: null, response: null });
  console.error(error);
  process.exit(1);
});
