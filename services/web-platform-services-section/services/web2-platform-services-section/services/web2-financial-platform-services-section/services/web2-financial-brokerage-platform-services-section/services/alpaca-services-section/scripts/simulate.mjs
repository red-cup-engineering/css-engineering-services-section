const finite = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number) || Object.is(number, -0)) throw new TypeError(`${label}-invalid`);
  return number;
};
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

export function simulateEventDrivenExecution({ periods, initialCapital = 100_000, execution = {}, periodsPerYear = 52 } = {}) {
  if (!Array.isArray(periods) || periods.length < 2) throw new TypeError("execution-periods-required");
  let equity = finite(initialCapital, "initial-capital");
  if (equity <= 0) throw new RangeError("positive-initial-capital-required");
  const spreadBps = finite(execution.spreadBps ?? 2, "spread-bps");
  const impactBpsAtFullParticipation = finite(execution.impactBpsAtFullParticipation ?? 25, "impact-bps");
  const maximumParticipationRate = finite(execution.maximumParticipationRate ?? 0.1, "maximum-participation-rate");
  const latencyFractionOfBar = finite(execution.latencyFractionOfBar ?? 0.1, "latency-fraction-of-bar");
  const minimumOrderNotional = finite(execution.minimumOrderNotional ?? 1, "minimum-order-notional");
  if (spreadBps < 0 || impactBpsAtFullParticipation < 0 || maximumParticipationRate <= 0 || maximumParticipationRate > 1 || latencyFractionOfBar < 0 || latencyFractionOfBar > 1 || minimumOrderNotional < 0) throw new RangeError("execution-policy-invalid");

  let weights = {};
  let peak = equity;
  let maximumDrawdown = 0;
  let desiredNotionalTotal = 0;
  let filledNotionalTotal = 0;
  let spreadCostTotal = 0;
  let impactCostTotal = 0;
  let latencyCostTotal = 0;
  const path = periods.map((period) => {
    if (!period?.weights || !period?.realizedReturns || !period?.market) throw new TypeError("execution-period-invalid");
    const startingEquity = equity;
    const entities = [...new Set([...Object.keys(weights), ...Object.keys(period.weights), ...Object.keys(period.realizedReturns)])].sort();
    const orders = [];
    const executedWeights = { ...weights };
    for (const entity of entities) {
      const currentWeight = finite(weights[entity] ?? 0, `${entity}-current-weight`);
      const targetWeight = finite(period.weights[entity] ?? 0, `${entity}-target-weight`);
      const deltaWeight = targetWeight - currentWeight;
      const desiredNotional = Math.abs(deltaWeight) * startingEquity;
      if (desiredNotional < minimumOrderNotional) continue;
      const market = period.market[entity];
      const price = finite(market?.price, `${entity}-price`);
      const open = finite(market?.open ?? price, `${entity}-open`);
      const volume = finite(market?.volume, `${entity}-volume`);
      if (price <= 0 || open <= 0 || volume < 0) throw new RangeError("execution-market-domain-invalid");
      const availableNotional = price * volume * maximumParticipationRate;
      const filledNotional = Math.min(desiredNotional, availableNotional);
      const fillFraction = desiredNotional === 0 ? 0 : filledNotional / desiredNotional;
      const participation = price * volume === 0 ? 0 : filledNotional / (price * volume);
      const spreadCost = filledNotional * spreadBps / 20_000;
      const impactCost = filledNotional * impactBpsAtFullParticipation * Math.sqrt(participation / maximumParticipationRate) / 10_000;
      const latencyCost = filledNotional * Math.abs(price / open - 1) * latencyFractionOfBar;
      executedWeights[entity] = currentWeight + deltaWeight * fillFraction;
      desiredNotionalTotal += desiredNotional;
      filledNotionalTotal += filledNotional;
      spreadCostTotal += spreadCost;
      impactCostTotal += impactCost;
      latencyCostTotal += latencyCost;
      orders.push(Object.freeze({ entity, side: deltaWeight > 0 ? "buy" : "sell", desiredNotional, filledNotional, unfilledNotional: desiredNotional - filledNotional, fillFraction, participation, spreadCost, impactCost, latencyCost }));
    }
    const executionCost = orders.reduce((sum, order) => sum + order.spreadCost + order.impactCost + order.latencyCost, 0);
    const grossPnl = entities.reduce((sum, entity) => sum + startingEquity * finite(executedWeights[entity] ?? 0, `${entity}-executed-weight`) * finite(period.realizedReturns[entity] ?? 0, `${entity}-realized-return`), 0);
    equity = startingEquity + grossPnl - executionCost;
    if (!Number.isFinite(equity) || equity <= 0) throw new RangeError("execution-equity-exhausted");
    weights = Object.fromEntries(entities.map((entity) => {
      const endingNotional = startingEquity * finite(executedWeights[entity] ?? 0, `${entity}-executed-weight`) * (1 + finite(period.realizedReturns[entity] ?? 0, `${entity}-realized-return`));
      return [entity, endingNotional / equity];
    }));
    peak = Math.max(peak, equity);
    maximumDrawdown = Math.max(maximumDrawdown, 1 - equity / peak);
    return Object.freeze({ at: period.at, outcomeAt: period.outcomeAt, startingEquity, endingEquity: equity, grossReturn: grossPnl / startingEquity, executionCost, netReturn: (equity - startingEquity) / startingEquity, orders: Object.freeze(orders), endingWeights: Object.freeze(weights) });
  });
  const returns = path.map(({ netReturn }) => netReturn);
  const average = mean(returns);
  const deviation = Math.sqrt(returns.reduce((sum, value) => sum + (value - average) ** 2, 0) / Math.max(1, returns.length - 1));
  return Object.freeze({ type: "EventDrivenExecutionSimulation", version: 1, execution: Object.freeze({ spreadBps, impactBpsAtFullParticipation, maximumParticipationRate, latencyFractionOfBar, minimumOrderNotional }), path: Object.freeze(path), metrics: Object.freeze({ periods: path.length, totalReturn: equity / initialCapital - 1, annualizedReturn: (equity / initialCapital) ** (periodsPerYear / path.length) - 1, annualizedVolatility: deviation * Math.sqrt(periodsPerYear), informationRatio: deviation > 0 ? average / deviation * Math.sqrt(periodsPerYear) : 0, maximumDrawdown, turnover: filledNotionalTotal / initialCapital, costs: (spreadCostTotal + impactCostTotal + latencyCostTotal) / initialCapital, desiredNotional: desiredNotionalTotal, filledNotional: filledNotionalTotal, unfilledNotional: desiredNotionalTotal - filledNotionalTotal, fillRate: desiredNotionalTotal === 0 ? 1 : filledNotionalTotal / desiredNotionalTotal, spreadCost: spreadCostTotal, impactCost: impactCostTotal, latencyCost: latencyCostTotal }), finalWeights: Object.freeze(weights), alphaEstablished: false, effect: "execution-simulation-only" });
}
