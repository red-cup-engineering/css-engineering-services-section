import { join } from "node:path";

import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";
import { alpacaCredentials } from "@red-cup-engineering/alpaca-services-section/guards";
import { allocateMandatePortfolio } from "@red-cup-engineering/mandate-portfolio-allocation-service";
import { formAggressivePortfolioIntent } from "@red-cup-engineering/alpha-portfolio-order-intent-service";
import { createLiveExecutionAndReconciliationProvider, createPaperExecutionAndReconciliationProvider } from "@red-cup-engineering/brokerage-execution-transport-service";
import { formPrincipalBrokerageContract, grantBrokerageAuthority } from "@red-cup-engineering/principal-brokerage-interface";
import { sizePosition } from "@red-cup-engineering/position-sizing-service/sleeve";
import { measureReturnRiskFeatures } from "@red-cup-engineering/alpaca-services-section/return-risk-feature-measure";
import { normalizeAlpacaSnapshot, reconcileSnapshots } from "@red-cup-engineering/account-evidence-reconciliation-service";

import { loadBeliefOrRefuse } from "./belief-gate.mjs";
import { loadTournamentSelection } from "./tournament-gate.mjs";
import { loadMandate } from "./mandate-gate.mjs";
import { createAlpacaVenueAuthority } from "./venue-authority.mjs";

const PRINCIPAL = "urn:principal:esther-davis";
const CONTRACT_VALID_MINUTES = 15;
const contractScopes = (mode) => Object.freeze(["account:read", "activities:read", "orders:intent", `orders:${mode}`, "orders:read", "positions:read"].sort());
const grantScopes = (mode) => Object.freeze(["account:read", "activities:read", `orders:${mode}`, "orders:read", "positions:read"].sort());

/**
 * Content-addresses one pipeline-stage value, for reconciliation "expected"/"observed" evidence citations.
 * @param {unknown} value
 * @returns {string}
 */
function digest(value) {
  return identifyJsonSemanticContent({ objectKind: "brokerage.alpaca-esther-paper-trading-loop.pipeline", value, witnessRoot: EMPTY_WITNESS_ROOT }).id;
}

const finite = (value, label) => {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new TypeError(`pipeline: ${label} must be a finite number, got ${JSON.stringify(value)}`);
  return n;
};

/**
 * Builds the "expected" post-trade snapshot from the pre-trade snapshot
 * and the raw order's own reported fill, so `reconcileSnapshots` checks
 * the account endpoint's own reported post-trade numbers against what
 * the order record itself implies happened -- a real cross-check even
 * though both ultimately originate at the same venue (the same shape
 * `account-evidence-reconciliation-service` uses generally).
 * @param {object} params
 * @param {object} params.preAccount Raw pre-trade `/v2/account` payload.
 * @param {object[]} params.prePositions Raw pre-trade `/v2/positions` payload.
 * @param {string} params.symbol
 * @param {object|null} params.rawOrder Raw order payload from `getOrderByClientOrderId`, or null when not yet observed.
 * @returns {{account: object, positions: object[], filled: boolean}}
 */
function expectedPostTradeState({ preAccount, prePositions, symbol, rawOrder }) {
  const filled = rawOrder?.status === "filled" && Number.isFinite(Number(rawOrder.filled_qty)) && Number.isFinite(Number(rawOrder.filled_avg_price));
  if (!filled) return { account: preAccount, positions: prePositions, filled: false };
  const filledQty = Number(rawOrder.filled_qty), filledPrice = Number(rawOrder.filled_avg_price), filledNotional = filledQty * filledPrice;
  const existing = prePositions.find((p) => p.symbol === symbol);
  const existingQty = existing ? Number(existing.qty ?? existing.quantity) : 0;
  const existingMarketValue = existing ? Number(existing.market_value) : 0;
  const expectedPosition = {
    symbol,
    qty: existingQty + filledQty,
    market_value: existingMarketValue + filledNotional,
    avg_entry_price: (existingMarketValue + filledNotional) / (existingQty + filledQty),
  };
  const account = { ...preAccount, cash: Number(preAccount.cash) - filledNotional, equity: Number(preAccount.equity), buying_power: Number(preAccount.buying_power) - filledNotional };
  const positions = [...prePositions.filter((p) => p.symbol !== symbol), expectedPosition];
  return { account, positions, filled: true };
}

/**
 * Runs one trading cycle, live or paper as the credentials are, through the full pipeline: belief record
 * (refuses on absence or a fired falsifier) -> the tournament's latest
 * record (an honest holdout-vs-baseline judgment, never validation
 * alone; a hold intent when no strategy has established alpha) ->
 * mandate allocation -> position sizing (`size-position`, sleeve read
 * from the mandate) -> order intent (`alpha-portfolio-order-intent-service`)
 * -> execution transport through the pluggable venue adapter on the
 * credentials' own host -> independent witness -> account-evidence
 * reconciliation of the account's fills against the intent.
 * @param {object} params
 * @param {NodeJS.ProcessEnv} params.env Process environment (credential guards read from this).
 * @param {string} params.dataRoot Directory holding the belief/mandate/tournament record files.
 * @param {string} [params.booksDataRoot] Directory `brokerage-independent-witness-and-books` journals into; required unless `venueAuthority` is injected.
 * @param {object} [params.venueAuthority] Pre-built `{adapter, registerExecutionRecords, recordOutcomeWitness}`, for tests; built via `createAlpacaVenueAuthority` otherwise.
 * @param {() => string} [params.clock]
 * @returns {Promise<object>} the frozen cycle outcome (disposition, intent-or-hold, sizing, execution receipt, witness, reconciliation).
 * @throws {Error} when a guard, the belief record, or the mandate/tournament record files refuse.
 */
export async function runTradingCycle({ env, dataRoot, booksDataRoot, venueAuthority: injectedVenueAuthority, clock = () => new Date().toISOString() }) {
  const { mode, key, secret } = alpacaCredentials(env);
  const venue = `alpaca-trading-${mode}`;
  const ACCOUNT_REFERENCE = `account:esther-${mode}`;
  const CONTRACT_SCOPES = contractScopes(mode);
  const GRANT_SCOPES = grantScopes(mode);

  const { belief } = loadBeliefOrRefuse(join(dataRoot, "2026-09-05-esther-blk-permanent-claim-belief-record.json"));
  const tournament = loadTournamentSelection(join(dataRoot, "2026-09-05-blk-strategy-tournament-record.json"));
  const mandate = loadMandate(join(dataRoot, "2026-09-05-esther-blk-accumulation-mandate-record.json"));
  const symbol = belief.affectedEntities[0].identifier;

  const now = clock();
  const validUntil = new Date(Date.parse(now) + CONTRACT_VALID_MINUTES * 60_000).toISOString();

  // A first, unauthenticated-by-any-grant probe is impossible by design (every
  // read below goes through the authority-custody/adapter path); the contract's
  // own capital/risk figures are provisional until the pre-trade read confirms them.
  const provisionalContract = formPrincipalBrokerageContract({
    principal: PRINCIPAL, venue, accountReference: ACCOUNT_REFERENCE,
    capital: { amount: 1, currency: "USD" }, risk: { maximumLossAmount: 1, maximumOrderNotional: 1, maximumAggregateNotional: 1, concentrationLimit: mandate.maximumWeight, leverageLimit: mandate.leverageLimit, shorting: mandate.shorting },
    scopes: CONTRACT_SCOPES, validUntil,
  });
  const credentialReference = `credential:${ACCOUNT_REFERENCE}:${venue}`;
  const provisionalGrant = grantBrokerageAuthority({ contract: provisionalContract, adapter: venue, credentialReference, scopes: GRANT_SCOPES, validUntil });

  const authority = injectedVenueAuthority ?? createAlpacaVenueAuthority({ mode, key, secret, principal: PRINCIPAL, accountReference: ACCOUNT_REFERENCE, contract: provisionalContract, authorityGrant: { ...provisionalGrant, credentialReference }, booksDataRoot, clock });

  const preAccountReceipt = await authority.adapter.readAccount({ grant: provisionalGrant, now });
  const prePositionsReceipt = await authority.adapter.listPositions({ grant: provisionalGrant, now });
  const preAccount = preAccountReceipt.payload, prePositions = prePositionsReceipt.payload ?? [];
  const equity = finite(preAccount.equity, "equity");
  const currentPosition = prePositions.find((p) => p.symbol === symbol);
  const currentBlkMarketValue = currentPosition ? finite(currentPosition.market_value, "position-market-value") : 0;

  if (!tournament.alphaEstablished || tournament.todaysWeight !== 1) {
    const holdIntentBody = { type: "AlpacaEstherPaperTradingHoldIntent", version: 1, symbol, reason: !tournament.alphaEstablished ? tournament.reason : "tournament-selected strategy signals flat today", tournamentWinner: tournament.winnerId, observedAt: now };
    const holdIntent = Object.freeze({ id: digest(holdIntentBody), ...holdIntentBody });
    const witness = await authority.recordOutcomeWitness({ originatingActor: "urn:ame:alpaca-esther-paper-trading-loop", inputs: [belief, tournament.record], output: holdIntent, externalEvidence: [{ uri: `urn:brokerage:hold:${holdIntent.id}`, digest: holdIntent.id }], observedAt: now });
    const postAccountReceipt = await authority.adapter.readAccount({ grant: provisionalGrant, now });
    const postPositionsReceipt = await authority.adapter.listPositions({ grant: provisionalGrant, now });
    const expected = normalizeAlpacaSnapshot({ accountReference: ACCOUNT_REFERENCE, observedAt: now, source: { uri: `urn:brokerage:${mode}-account-read:${preAccountReceipt.id}`, digest: preAccountReceipt.id }, account: preAccount, positions: prePositions });
    const observed = normalizeAlpacaSnapshot({ accountReference: ACCOUNT_REFERENCE, observedAt: now, source: { uri: `urn:brokerage:${mode}-account-read:${postAccountReceipt.id}`, digest: postAccountReceipt.id }, account: postAccountReceipt.payload, positions: postPositionsReceipt.payload ?? [] });
    const reconciliation = reconcileSnapshots({ expected, observed });
    return Object.freeze({ disposition: "hold", holdIntent, witness, reconciliation, observedAt: now });
  }

  const targetWeight = allocateMandatePortfolio({
    scores: { [symbol]: finite(tournament.record.entries.find((e) => e.id === tournament.winnerId).holdout.annualizedSharpe, "winner-holdout-sharpe") || 1e-9 },
    uncertainty: {}, currentWeights: { [symbol]: equity > 0 ? currentBlkMarketValue / equity : 0 }, mandate,
  }).weights[symbol];

  const mandateHeadroom = Math.max(0, targetWeight * equity - currentBlkMarketValue);
  const winnerHoldout = tournament.record.entries.find((e) => e.id === tournament.winnerId).holdout;
  const closes = tournament.bars.map((b) => b.c), volumes = tournament.bars.map((b) => b.v);
  const volatility = measureReturnRiskFeatures({ entityValues: closes, benchmarkValues: closes, volumes, referenceValues: closes, index: closes.length - 1 }).features.volatility20Annualized;

  const riskCapital = mandateHeadroom.toFixed(2);
  const survivalCapital = Math.max(0, equity - mandateHeadroom).toFixed(2);
  const sizing = sizePosition({ edge: { drift: winnerHoldout.cagr, volatility, riskFreeRate: 0 }, sleeve: { riskCapital, survivalCapital }, liabilityBeyondStake: false });

  if (!sizing.admitted || Number(sizing.stake) <= 0) {
    const holdIntentBody = { type: "AlpacaEstherPaperTradingHoldIntent", version: 1, symbol, reason: sizing.admitted ? "sized-stake-non-positive" : `sizing-refused:${sizing.reason}`, tournamentWinner: tournament.winnerId, observedAt: now };
    const holdIntent = Object.freeze({ id: digest(holdIntentBody), ...holdIntentBody });
    const witness = await authority.recordOutcomeWitness({ originatingActor: "urn:ame:alpaca-esther-paper-trading-loop", inputs: [belief, tournament.record], output: holdIntent, externalEvidence: [{ uri: `urn:brokerage:hold:${holdIntent.id}`, digest: holdIntent.id }], observedAt: now });
    const postAccountReceipt = await authority.adapter.readAccount({ grant: provisionalGrant, now });
    const postPositionsReceipt = await authority.adapter.listPositions({ grant: provisionalGrant, now });
    const expected = normalizeAlpacaSnapshot({ accountReference: ACCOUNT_REFERENCE, observedAt: now, source: { uri: `urn:brokerage:${mode}-account-read:${preAccountReceipt.id}`, digest: preAccountReceipt.id }, account: preAccount, positions: prePositions });
    const observed = normalizeAlpacaSnapshot({ accountReference: ACCOUNT_REFERENCE, observedAt: now, source: { uri: `urn:brokerage:${mode}-account-read:${postAccountReceipt.id}`, digest: postAccountReceipt.id }, account: postAccountReceipt.payload, positions: postPositionsReceipt.payload ?? [] });
    const reconciliation = reconcileSnapshots({ expected, observed });
    return Object.freeze({ disposition: "hold", holdIntent, sizing, witness, reconciliation, observedAt: now });
  }

  const notional = Number(Number(sizing.stake).toFixed(2));
  const capital = Object.freeze({ amount: equity, currency: "USD" });
  // The order is only the headroom to reach the mandate target; the contract's
  // aggregate limit is the resulting sleeve, including the position already
  // held at the broker.  Treating the incremental order as the whole portfolio
  // made an otherwise compliant second purchase fail the execution admission.
  const risk = Object.freeze({ maximumLossAmount: notional, maximumOrderNotional: notional, maximumAggregateNotional: Number((targetWeight * equity).toFixed(2)), concentrationLimit: mandate.maximumWeight, leverageLimit: mandate.leverageLimit, shorting: mandate.shorting });
  const contract = formPrincipalBrokerageContract({ principal: PRINCIPAL, venue, accountReference: ACCOUNT_REFERENCE, capital, risk, scopes: CONTRACT_SCOPES, validUntil });
  const authorityGrant = grantBrokerageAuthority({ contract, adapter: venue, credentialReference, scopes: GRANT_SCOPES, validUntil });
  const boundAuthority = injectedVenueAuthority ?? createAlpacaVenueAuthority({ mode, key, secret, principal: PRINCIPAL, accountReference: ACCOUNT_REFERENCE, contract, authorityGrant: { ...authorityGrant, credentialReference }, booksDataRoot, clock });

  const evidencePacket = Object.freeze({ id: digest({ belief: belief.id, tournament: tournament.record.id, mandate: mandate.id, sizing }), type: "IssuerEvidencePacket" });
  const intent = formAggressivePortfolioIntent({
    contract, evidencePackets: [evidencePacket], symbol, side: "buy", notional, maximumLoss: notional,
    thesis: belief.proposition, falsifier: belief.falsifier,
    liquidityPremise: mode === "live" ? "Live execution against the funded Alpaca account." : "Paper execution; no live venue effect.", executionPremise: `Tournament winner ${tournament.winnerId} signals long today; sized ${sizing.regime} at Kelly fraction ${sizing.fraction.toFixed(4)} against the mandate-bounded sleeve.`,
    scenarios: [{ name: "sleeve-loss", pnl: -notional }, { name: "edge-realized", pnl: notional * Math.max(0, winnerHoldout.cagr) }],
  });

  boundAuthority.registerExecutionRecords({ contract, authorityGrant: { ...authorityGrant, credentialReference }, intent, revocation: null });
  const resolveRecords = async () => ({ contract, authorityGrant: { ...authorityGrant, credentialReference }, intent, revocation: null });
  const execute = mode === "live"
    ? createLiveExecutionAndReconciliationProvider({ resolveLiveExecutionRecords: resolveRecords, adapter: boundAuthority.adapter, clock })
    : createPaperExecutionAndReconciliationProvider({ resolvePaperExecutionRecords: resolveRecords, adapter: boundAuthority.adapter, clock });
  const receipt = await execute({ contractReference: contract.id, authorityGrantReference: authorityGrant.id, intentReference: intent.id });

  const witness = await boundAuthority.recordOutcomeWitness({ originatingActor: "urn:ame:alpaca-esther-paper-trading-loop", inputs: [belief, tournament.record, mandate, intent], output: receipt, externalEvidence: execute.externalEvidence({ contractReference: contract.id, authorityGrantReference: authorityGrant.id, intentReference: intent.id }, receipt), observedAt: receipt.observedAt });

  const postOrderReceipt = await boundAuthority.adapter.getOrderByClientOrderId({ grant: { ...authorityGrant, credentialReference }, clientOrderId: receipt.clientOrderId, now: receipt.observedAt });
  const postAccountReceipt = await boundAuthority.adapter.readAccount({ grant: { ...authorityGrant, credentialReference }, now: receipt.observedAt });
  const postPositionsReceipt = await boundAuthority.adapter.listPositions({ grant: { ...authorityGrant, credentialReference }, now: receipt.observedAt });
  const rawOrder = postOrderReceipt.status === 200 ? postOrderReceipt.payload : null;
  const predicted = expectedPostTradeState({ preAccount, prePositions, symbol, rawOrder });
  const expected = normalizeAlpacaSnapshot({ accountReference: ACCOUNT_REFERENCE, observedAt: receipt.observedAt, source: { uri: `urn:brokerage:order-read:${postOrderReceipt.id ?? "unavailable"}`, digest: postOrderReceipt.id ?? digest(rawOrder) }, account: predicted.account, positions: predicted.positions, orders: rawOrder ? [rawOrder] : [] });
  const observed = normalizeAlpacaSnapshot({ accountReference: ACCOUNT_REFERENCE, observedAt: receipt.observedAt, source: { uri: `urn:brokerage:${mode}-account-read:${postAccountReceipt.id}`, digest: postAccountReceipt.id }, account: postAccountReceipt.payload, positions: postPositionsReceipt.payload ?? [], orders: rawOrder ? [rawOrder] : [] });
  const reconciliation = reconcileSnapshots({ expected, observed });

  return Object.freeze({ disposition: "order", mode, intent, sizing, receipt, witness, reconciliation, observedAt: receipt.observedAt });
}
