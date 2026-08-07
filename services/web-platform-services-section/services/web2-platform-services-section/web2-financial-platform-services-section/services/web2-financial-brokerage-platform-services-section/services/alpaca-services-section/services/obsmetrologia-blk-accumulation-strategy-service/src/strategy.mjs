import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

const identified = (value) => Object.freeze({ id: identifyJsonSemanticContent({ objectKind: "brokerage.obsmetrologia-blk-accumulation-strategy.record", value, witnessRoot: EMPTY_WITNESS_ROOT }).id, ...value });
const HORIZONS = Object.freeze([5, 20, 60, 120]);
const finite = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label}-invalid`);
  return number;
};

function normalizeBars(raw, symbol, asOf) {
  if (!Array.isArray(raw) || raw.length < 121) throw new RangeError(`${symbol}-history-insufficient`);
  const bars = raw.map((bar) => {
    const at = Date.parse(bar?.at);
    const close = finite(bar?.close, `${symbol}-close`);
    if (!Number.isFinite(at) || at > asOf || close <= 0) throw new TypeError(`${symbol}-bar-invalid`);
    return { at, close };
  });
  for (let index = 1; index < bars.length; index += 1) {
    if (bars[index - 1].at >= bars[index].at) throw new TypeError(`${symbol}-bars-not-strictly-causal`);
  }
  return bars;
}

function aligned(blk, spy) {
  const spyByTime = new Map(spy.map((bar) => [bar.at, bar]));
  const pairs = blk.flatMap((bar) => spyByTime.has(bar.at)
    ? [{ at: bar.at, blk: bar.close, spy: spyByTime.get(bar.at).close }]
    : []);
  if (pairs.length < 121) throw new RangeError("aligned-history-insufficient");
  return pairs;
}

const periodReturn = (pairs, horizon, field) => {
  const last = pairs.at(-1)[field];
  const prior = pairs.at(-(horizon + 1))[field];
  return last / prior - 1;
};
function annualizedVolatility(pairs, field, days = 60) {
  const returns = [];
  for (let index = pairs.length - days; index < pairs.length; index += 1) {
    returns.push(Math.log(pairs[index][field] / pairs[index - 1][field]));
  }
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0)
    / Math.max(1, returns.length - 1);
  return Math.sqrt(variance * 252);
}
const movingAverage = (pairs, field, days) =>
  pairs.slice(-days).reduce((sum, pair) => sum + pair[field], 0) / days;
const maximumDrawdown = (pairs, field, days = 120) => {
  let peak = 0;
  let drawdown = 0;
  for (const pair of pairs.slice(-days)) {
    peak = Math.max(peak, pair[field]);
    drawdown = Math.max(drawdown, peak > 0 ? 1 - pair[field] / peak : 0);
  }
  return drawdown;
};

function evidencePatches(pairs) {
  const latest = pairs.at(-1);
  const volatility = annualizedVolatility(pairs, "blk");
  return HORIZONS.map((horizon) => {
    const absolute = periodReturn(pairs, horizon, "blk");
    const relative = absolute - periodReturn(pairs, horizon, "spy");
    const trend = latest.blk / movingAverage(pairs, "blk", horizon) - 1;
    const threshold = Math.max(0.0025, volatility * Math.sqrt(horizon / 252) * 0.15);
    const bullish = [];
    const bearish = [];
    if (absolute > threshold) bullish.push("absolute-return");
    else if (absolute < -threshold) bearish.push("absolute-return");
    if (relative > threshold) bullish.push("spy-relative-return");
    else if (relative < -threshold) bearish.push("spy-relative-return");
    if (trend > threshold / 2) bullish.push("trend-closure");
    else if (trend < -threshold / 2) bearish.push("trend-closure");
    if (volatility < 0.35) bullish.push("healthy-volatility");
    else bearish.push("volatility-stress");
    return Object.freeze({
      horizon,
      observedAt: new Date(latest.at).toISOString(),
      absoluteReturn: absolute,
      relativeReturn: relative,
      trend,
      threshold,
      bullish: Object.freeze(bullish),
      bearish: Object.freeze(bearish),
    });
  });
}

function nerve(patches, polarity) {
  const members = patches
    .map((patch) => ({ horizon: patch.horizon, cells: new Set(patch[polarity]) }))
    .filter(({ cells }) => cells.size > 0);
  const adjacency = members.map(() => new Set());
  let cells = 0;
  for (let left = 0; left < members.length; left += 1) {
    for (let right = left + 1; right < members.length; right += 1) {
      if ([...members[left].cells].some((cell) => members[right].cells.has(cell))) {
        adjacency[left].add(right);
        adjacency[right].add(left);
        cells += 1;
      }
    }
  }
  let components = 0;
  const visited = new Set();
  for (let start = 0; start < members.length; start += 1) {
    if (visited.has(start)) continue;
    components += 1;
    const stack = [start];
    while (stack.length) {
      const node = stack.pop();
      if (visited.has(node)) continue;
      visited.add(node);
      stack.push(...adjacency[node]);
    }
  }
  const entities = members.length;
  const h0 = components;
  const h1 = Math.max(0, cells - (entities - components));
  return Object.freeze({
    entities,
    cells,
    components,
    h0,
    h1,
    antiLandauerBits: h0,
    landauerBits: h1,
    netCharge: h0 - h1,
    eulerCharacteristic: entities - cells,
    patches: Object.freeze(members.map(({ horizon, cells: set }) =>
      Object.freeze({ horizon, evidenceCells: Object.freeze([...set].sort()) }))),
  });
}

function prefixCharges(patches, polarity) {
  return patches.map((_, index) => nerve(patches.slice(0, index + 1), polarity).netCharge);
}
function closureRegime(patches, polarity) {
  const charges = prefixCharges(patches, polarity);
  const finalPatch = patches.at(-1)[polarity];
  const previousCells = new Set(patches.slice(0, -1).flatMap((patch) => patch[polarity]));
  const finiteBase = finalPatch.every((cell) => previousCells.has(cell)) &&
    charges.slice(-3).every((charge) => charge === charges.at(-1));
  const deltas = charges.slice(1).map((charge, index) => charge - charges[index]);
  const scottContinuous = deltas.every((delta) => delta >= -1) &&
    patches.every((patch, index) => index === 0 ||
      Date.parse(patches[index - 1].observedAt) <= Date.parse(patch.observedAt));
  const countableCofinality = new Set(charges).size <= HORIZONS.length;
  const regime = finiteBase
    ? "strict"
    : scottContinuous
      ? "scott"
      : countableCofinality
        ? "transfiniteBounded"
        : "aperiodic";
  return Object.freeze({
    regime,
    corner: {
      strict: "potential",
      scott: "active",
      transfiniteBounded: "stable",
      aperiodic: "absurd",
    }[regime],
    finiteBase,
    scottContinuous,
    countableCofinality,
    prefixCharges: Object.freeze(charges),
    applicationClaim: "empirical-proxy-not-a-proof-of-market-equivalence",
  });
}

export function evaluateBlkAccumulationStrategy({
  blkBars,
  spyBars,
  asOf,
  cash,
  currentBlkMarketValue = 0,
  scheduledContribution = 0,
  maximumOrderFraction = 0.25,
  volatilityTarget = 0.18,
  maximumDrawdown = 0.30,
  marketDataObservation = null,
} = {}) {
  const at = Date.parse(asOf);
  if (!Number.isFinite(at)) throw new TypeError("as-of-invalid");
  const pairs = aligned(
    normalizeBars(blkBars, "BLK", at),
    normalizeBars(spyBars, "SPY", at),
  );
  cash = finite(cash, "cash");
  currentBlkMarketValue = finite(currentBlkMarketValue, "current-blk-market-value");
  scheduledContribution = finite(scheduledContribution, "scheduled-contribution");
  maximumOrderFraction = finite(maximumOrderFraction, "maximum-order-fraction");
  volatilityTarget = finite(volatilityTarget, "volatility-target");
  maximumDrawdown = finite(maximumDrawdown, "maximum-drawdown");
  if (cash < 0 || currentBlkMarketValue < 0 || scheduledContribution < 0 ||
      maximumOrderFraction <= 0 || maximumOrderFraction > 1 ||
      volatilityTarget <= 0 || maximumDrawdown <= 0 || maximumDrawdown >= 1) {
    throw new RangeError("strategy-mandate-invalid");
  }

  const patches = evidencePatches(pairs);
  const bullishNerve = nerve(patches, "bullish");
  const bearishNerve = nerve(patches, "bearish");
  const bullishRegime = closureRegime(patches, "bullish");
  const bearishRegime = closureRegime(patches, "bearish");
  const directionalCharge = bullishNerve.netCharge - bearishNerve.netCharge;
  const volatility = annualizedVolatility(pairs, "blk");
  const drawdown = maximumDrawdownFn(pairs);
  const relative20 = patches.find(({ horizon }) => horizon === 20).relativeReturn;
  const relative60 = patches.find(({ horizon }) => horizon === 60).relativeReturn;
  const aperiodic = bullishRegime.regime === "aperiodic" ||
    bearishRegime.regime === "aperiodic";
  const active = bullishRegime.regime === "scott" &&
    directionalCharge > 0 && relative20 > 0 && relative60 > 0;
  const stableHold = currentBlkMarketValue > 0 &&
    bullishRegime.regime === "transfiniteBounded" && directionalCharge >= 0;
  const riskAllowed = drawdown <= maximumDrawdown && !aperiodic;
  const baseline = riskAllowed ? Math.min(cash, scheduledContribution) : 0;
  const confidence = Math.min(1, Math.max(0, directionalCharge) /
    Math.max(1, bullishNerve.h0 + bullishNerve.h1 + bearishNerve.h0 + bearishNerve.h1));
  const volScale = Math.min(1, volatilityTarget / Math.max(volatility, 0.01));
  const overlay = active && riskAllowed ? cash * maximumOrderFraction * confidence * volScale : 0;
  const notional = Math.max(0, Math.min(cash * maximumOrderFraction, baseline + overlay));
  const disposition = notional > 0 ? "accumulate" : stableHold ? "hold" : "no-order";
  return identified({
    type: "ObsmetrologiaBlkAccumulationStrategyReading",
    version: 1,
    asOf: new Date(at).toISOString(),
    instrument: "BLK",
    benchmark: "SPY",
    marketDataObservation,
    patches,
    bullishNerve,
    bearishNerve,
    bullishRegime,
    bearishRegime,
    directionalCharge,
    annualizedVolatility: volatility,
    trailingMaximumDrawdown: drawdown,
    relativeReturn20: relative20,
    relativeReturn60: relative60,
    policy: {
      style: "long-only-fractional-accumulation",
      baselineContribution: baseline,
      alphaOverlay: overlay,
      maximumOrderFraction,
      volatilityTarget,
      maximumDrawdown,
    },
    disposition,
    proposedNotional: notional,
    orderEffect: false,
    hypothesis: "Independent bullish topology minus cyclic contradiction predicts BLK excess return over SPY; Scott-active evidence earns an overlay while scheduled accumulation continues inside the drawdown mandate.",
    falsifiers: Object.freeze([
      "withheld BLK-minus-SPY net return is nonpositive after estimated costs",
      "deflated risk-adjusted performance is nonpositive across walk-forward folds",
      "topological charge adds no out-of-sample information beyond ordinary relative momentum",
      "aperiodic or contradictory regimes experience materially worse drawdown than refusal",
    ]),
    alphaEstablished: false,
    profitabilityEstablished: false,
    liveReadinessEstablished: false,
  });
}

function maximumDrawdownFn(pairs) {
  return maximumDrawdown(pairs, "blk", 120);
}

export const strategyInternals = Object.freeze({
  evidencePatches,
  nerve,
  closureRegime,
});
