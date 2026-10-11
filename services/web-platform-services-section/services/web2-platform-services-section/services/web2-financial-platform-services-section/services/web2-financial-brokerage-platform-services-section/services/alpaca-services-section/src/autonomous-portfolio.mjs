// One mandate-bound autonomous portfolio cycle.  The carrier is a current
// broker observation plus a principal contract; mode is recovered from the
// contract, never from a paper-only process guard.
import { formAggressivePortfolioIntent } from "@red-cup-engineering/alpha-portfolio-order-intent-service";

const finite = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label}-must-be-finite`);
  return number;
};
const positive = (value, label) => {
  const number = finite(value, label);
  if (number <= 0) throw new RangeError(`${label}-must-be-positive`);
  return number;
};
const text = (value, label) => {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label}-required`);
  return value.trim();
};

function venueMode(contract) {
  const match = /^alpaca-trading-(paper|live)$/u.exec(contract?.venue ?? "");
  if (!match) throw new TypeError("alpaca-paper-or-live-contract-required");
  return match[1];
}

function normalizedWeights(weights) {
  if (!weights || typeof weights !== "object" || Array.isArray(weights)) throw new TypeError("target-weights-required");
  const entries = Object.entries(weights).map(([symbol, weight]) => [text(symbol, "target-symbol").toUpperCase(), positive(weight, "target-weight")]);
  if (entries.length === 0) throw new TypeError("at-least-one-target-weight-required");
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  if (Math.abs(total - 1) > 1e-9) throw new RangeError("target-weights-must-sum-to-one");
  return Object.freeze(Object.fromEntries(entries));
}

function currentPositions(positions) {
  if (!Array.isArray(positions)) throw new TypeError("broker-positions-array-required");
  const values = new Map();
  for (const position of positions) {
    const symbol = text(position?.symbol, "broker-position-symbol").toUpperCase();
    const value = finite(position?.market_value ?? position?.marketValue, `broker-position-${symbol}-market-value`);
    values.set(symbol, (values.get(symbol) ?? 0) + value);
  }
  return values;
}

/**
 * Plan a bounded long-only rebalance from one observed broker account state.
 * A plan is a set of intents, not a venue effect.  It makes the per-cycle
 * turnover limit explicit instead of treating an ambient process-wide switch
 * as risk policy.
 */
export function planMandatedPortfolioRebalance({ contract, account, positions, targetWeights, driftTolerance, turnoverCapFraction, minimumOrderNotional = 1 }) {
  if (contract?.type !== "PrincipalBrokerageServiceContract") throw new TypeError("principal-brokerage-contract-required");
  venueMode(contract);
  const equity = positive(account?.equity, "broker-account-equity");
  const tolerance = finite(driftTolerance, "drift-tolerance");
  const turnoverCap = finite(turnoverCapFraction, "turnover-cap-fraction");
  const minimum = positive(minimumOrderNotional, "minimum-order-notional");
  if (tolerance < 0 || tolerance >= 1 || turnoverCap <= 0 || turnoverCap > 1) throw new RangeError("portfolio-rebalance-policy-out-of-range");
  const concentrationLimit = finite(contract?.risk?.concentrationLimit, "contract-concentration-limit");
  const perOrderLimit = positive(contract?.risk?.maximumOrderNotional, "contract-maximum-order-notional");
  const aggregateLimit = positive(contract?.risk?.maximumAggregateNotional, "contract-maximum-aggregate-notional");
  if (concentrationLimit <= 0 || concentrationLimit > 1) throw new RangeError("contract-concentration-limit-out-of-range");
  const targets = normalizedWeights(targetWeights);
  const held = currentPositions(positions);
  const rows = [];
  for (const [symbol, targetWeight] of Object.entries(targets)) {
    if (targetWeight > concentrationLimit) throw new RangeError(`target-${symbol}-exceeds-contract-concentration`);
    const currentValue = held.get(symbol) ?? 0;
    const currentWeight = currentValue / equity;
    const drift = currentWeight - targetWeight;
    if (Math.abs(drift) <= tolerance) continue;
    const rawNotional = Math.abs(drift * equity);
    const side = drift > 0 ? "sell" : "buy";
    // A long-only mandate may only reduce an actually held position.
    const notional = Math.min(side === "sell" ? Math.min(rawNotional, currentValue) : rawNotional, perOrderLimit);
    if (notional >= minimum) rows.push({ symbol, side, notional, currentWeight, targetWeight, drift });
  }
  const requestedTurnover = rows.reduce((sum, row) => sum + row.notional, 0);
  const turnoverLimit = Math.min(equity * turnoverCap, aggregateLimit);
  const scale = requestedTurnover > turnoverLimit && requestedTurnover > 0 ? turnoverLimit / requestedTurnover : 1;
  // Sell first: a completed disposal can make cash available to a later buy;
  // every individual placement is still re-admitted from fresh broker state.
  const intents = rows.map((row) => ({ ...row, notional: Number((row.notional * scale).toFixed(2)) }))
    .filter((row) => row.notional >= minimum)
    .sort((left, right) => (left.side === right.side ? left.symbol.localeCompare(right.symbol) : left.side === "sell" ? -1 : 1));
  return Object.freeze({
    type: "MandatedPortfolioRebalancePlan", version: 1, mode: venueMode(contract), equity,
    targetWeights: targets, driftTolerance: tolerance, turnoverCapFraction: turnoverCap,
    requestedTurnover, turnoverLimit, turnoverScale: scale, intents: Object.freeze(intents),
  });
}

/**
 * Compose Observe -> Plan -> Execute for a supplied, already-authorized
 * Alpaca account.  `executeIntent` is the venue boundary (normally
 * executeAuthorizedAlpacaIntent); it receives no policy bypass and selects
 * paper versus live solely from the principal contract and authority grant.
 */
export async function runMandatedPortfolioCycle({ contract, authorityGrant, observation, targetWeights, driftTolerance,
  turnoverCapFraction, evidencePacket, executeIntent, suspended = false, minimumOrderNotional = 1, clock = () => new Date().toISOString() } = {}) {
  if (contract?.type !== "PrincipalBrokerageServiceContract" || authorityGrant?.type !== "RevocableBrokerageAuthorityGrant") throw new TypeError("contract-and-authority-grant-required");
  const mode = venueMode(contract);
  if (authorityGrant.principalContract !== contract.id || authorityGrant.venue !== contract.venue || authorityGrant.adapter !== contract.venue || authorityGrant.revoked !== false) throw new TypeError("current-contract-bound-authority-required");
  if (!contract.scopes?.includes("orders:intent") || !authorityGrant.scopes?.includes(`orders:${mode}`)) throw new TypeError("mandated-portfolio-order-scopes-required");
  positive(contract?.risk?.maximumLossAmount, "contract-maximum-loss-amount");
  if (!evidencePacket || evidencePacket.type !== "IssuerEvidencePacket" || typeof evidencePacket.id !== "string" || evidencePacket.id === "") throw new TypeError("issuer-evidence-packet-required");
  if (typeof executeIntent !== "function") throw new TypeError("authorized-intent-executor-required");
  if (observation?.venue !== contract.venue || observation?.authorityGrant !== authorityGrant.id) throw new TypeError("current-contract-bound-broker-observation-required");
  const observedAt = text(observation?.observedAt ?? clock(), "observation-time");
  if (!Number.isFinite(Date.parse(observedAt))) throw new TypeError("observation-time-invalid");
  const plan = planMandatedPortfolioRebalance({ contract, account: observation.account, positions: observation.positions,
    targetWeights, driftTolerance, turnoverCapFraction, minimumOrderNotional });
  if (suspended) return Object.freeze({ type: "MandatedPortfolioCycle", version: 1, mode, observedAt, plan,
    disposition: "suspended-by-mandate", executions: Object.freeze([]), liveVenueEffect: false });
  const executions = [];
  for (const row of plan.intents) {
    const maximumLoss = Math.min(row.notional, contract.risk.maximumLossAmount);
    const intent = formAggressivePortfolioIntent({
      contract, evidencePackets: [evidencePacket], symbol: row.symbol, side: row.side, notional: row.notional, maximumLoss,
      thesis: `Restore ${row.symbol} from ${(row.currentWeight * 100).toFixed(2)}% toward ${(row.targetWeight * 100).toFixed(2)}% of the mandate.`,
      falsifier: `A current broker account or position observation does not admit the bounded ${row.side} order.`,
      liquidityPremise: "The selected Alpaca venue reports an active account and admits the market order.",
      executionPremise: "The order remains inside this mandate, its explicit turnover cap, and immediate broker capacity checks.",
      scenarios: [{ name: "declared-bounded-loss", pnl: -maximumLoss }, { name: "unfilled-or-neutral", pnl: 0 }],
    });
    try {
      const outcome = await executeIntent({ contract, authorityGrant, intent });
      executions.push(Object.freeze({ symbol: row.symbol, side: row.side, intent, outcome }));
    } catch (error) {
      executions.push(Object.freeze({ symbol: row.symbol, side: row.side, intent, error: error instanceof Error ? error.message : String(error) }));
    }
  }
  const effects = executions.filter((entry) => entry.outcome?.liveVenueEffect === true).length;
  return Object.freeze({ type: "MandatedPortfolioCycle", version: 1, mode, observedAt, plan,
    disposition: executions.length === 0 ? "within-rebalance-policy" : effects > 0 ? "live-effects-submitted" : "effects-submitted-or-pending",
    executions: Object.freeze(executions), liveVenueEffect: effects > 0 });
}

/**
 * Realize the portfolio cycle as a system loop over the existing principal
 * account reader, execution boundary, and independent record carrier.  It
 * deliberately owns neither credentials nor a direct HTTP client: custody and
 * mode-bound execution remain their respective narrow capabilities.
 */
export function createMandatedPortfolioService({ resolveMandate, readPrincipalAccount, executeAuthorizedIntent, recordCycle,
  clock = () => new Date().toISOString() } = {}) {
  if (typeof resolveMandate !== "function" || typeof readPrincipalAccount !== "function"
    || typeof executeAuthorizedIntent !== "function" || typeof recordCycle !== "function") {
    throw new TypeError("mandate-reader-executor-and-recorder-required");
  }
  return Object.freeze({
    async run() {
      // Resolve the mandate at the start of every round; a cached grant would
      // make a revocation or changed contract invisible to the system loop.
      const mandate = await resolveMandate();
      const contract = mandate?.contract, authorityGrant = mandate?.authorityGrant;
      if (!contract || !authorityGrant || !mandate?.targetWeights) throw new TypeError("current-mandate-contract-grant-and-targets-required");
      const rawObservation = await readPrincipalAccount({ authorityGrantReference: authorityGrant.id, at: clock() });
      if (rawObservation?.type !== "PrincipalAlpacaAccountObservationReceipt" || !rawObservation.independentBooksReceipt) {
        throw new TypeError("independently-recorded-principal-alpaca-observation-required");
      }
      const observation = Object.freeze({
        venue: rawObservation.venue, authorityGrant: rawObservation.authorityGrant, observedAt: rawObservation.observedAt,
        account: rawObservation.account?.payload, positions: rawObservation.positions?.payload,
      });
      const cycle = await runMandatedPortfolioCycle({
        contract, authorityGrant, observation, targetWeights: mandate.targetWeights,
        driftTolerance: mandate.driftTolerance, turnoverCapFraction: mandate.turnoverCapFraction,
        minimumOrderNotional: mandate.minimumOrderNotional, evidencePacket: mandate.evidencePacket,
        suspended: mandate.suspended === true, clock,
        executeIntent: ({ contract: boundContract, authorityGrant: boundGrant, intent }) => executeAuthorizedIntent({
          contract: boundContract, authorityGrant: boundGrant, intent,
        }),
      });
      const recordReceipt = await recordCycle({
        type: "mandated-portfolio-cycle-completed", mandate: mandate.id ?? null,
        observation: rawObservation.id, cycle, recordedAt: clock(),
      });
      if (!recordReceipt?.id && !recordReceipt?.graph && !recordReceipt?.recordReceipt) {
        throw new TypeError("mandated-portfolio-cycle-record-receipt-required");
      }
      return Object.freeze({ ...cycle, observation: rawObservation.id, recordReceipt });
    },
  });
}
