const finite = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number) || Object.is(number, -0)) throw new TypeError(`${label}-invalid`);
  return number;
};
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

export function replayTransactionCosts({ periods, transactionCostBps, periodsPerYear = 52 } = {}) {
  if (!Array.isArray(periods) || periods.length < 2) throw new TypeError("replay-periods-required");
  const bps = finite(transactionCostBps, "transaction-cost-bps");
  if (bps < 0) throw new RangeError("negative-transaction-cost-refused");
  let prior = {}, equity = 1, peak = 1, maximumDrawdown = 0, totalTurnover = 0, totalCosts = 0;
  const path = periods.map((period) => {
    if (!period?.weights || !period?.realizedReturns) throw new TypeError("replay-period-invalid");
    const entities = [...new Set([...Object.keys(period.weights), ...Object.keys(period.realizedReturns)])];
    const turnover = entities.reduce((sum, entity) => sum + Math.abs(finite(period.weights[entity] ?? 0, "weight") - finite(prior[entity] ?? 0, "prior-weight")), 0);
    const grossReturn = entities.reduce((sum, entity) => sum + finite(period.weights[entity] ?? 0, "weight") * finite(period.realizedReturns[entity] ?? 0, "realized-return"), 0);
    const cost = turnover * bps / 10_000, netReturn = grossReturn - cost;
    equity *= 1 + netReturn; peak = Math.max(peak, equity); maximumDrawdown = Math.max(maximumDrawdown, 1 - equity / peak);
    totalTurnover += turnover; totalCosts += cost; prior = period.weights;
    return Object.freeze({ at: period.at, grossReturn, turnover, cost, netReturn, equity });
  });
  const returns = path.map(({ netReturn }) => netReturn), average = mean(returns);
  const deviation = Math.sqrt(returns.reduce((sum, value) => sum + (value - average) ** 2, 0) / Math.max(1, returns.length - 1));
  return Object.freeze({ type: "TransactionCostReplay", version: 1, path: Object.freeze(path), metrics: Object.freeze({ periods: path.length, totalReturn: equity - 1, annualizedReturn: equity ** (periodsPerYear / path.length) - 1, annualizedVolatility: deviation * Math.sqrt(periodsPerYear), informationRatio: deviation > 0 ? average / deviation * Math.sqrt(periodsPerYear) : 0, maximumDrawdown, turnover: totalTurnover, costs: totalCosts }), alphaEstablished: false, effect: "replay-only" });
}
