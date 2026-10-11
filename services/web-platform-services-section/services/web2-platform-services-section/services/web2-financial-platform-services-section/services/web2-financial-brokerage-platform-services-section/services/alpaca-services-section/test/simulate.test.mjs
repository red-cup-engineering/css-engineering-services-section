import assert from "node:assert/strict";
import test from "node:test";
import { simulateEventDrivenExecution } from "../scripts/simulate.mjs";

const period = (at, weights, returns, volume = 1_000_000) => ({ at, outcomeAt: `${at}+1`, weights, realizedReturns: returns, market: Object.fromEntries(Object.keys(returns).map((entity) => [entity, { open: 100, price: 101, volume }])) });

test("models partial fills, nonlinear impact, latency, spread, and position drift", () => {
  const result = simulateEventDrivenExecution({ initialCapital: 1_000_000, periods: [period("t0", { AAA: 1 }, { AAA: 0.1 }, 1_000), period("t1", { AAA: 0 }, { AAA: 0 }, 1_000)], execution: { maximumParticipationRate: 0.1, spreadBps: 4, impactBpsAtFullParticipation: 40, latencyFractionOfBar: 0.5 } });
  assert.ok(result.metrics.fillRate < 0.2);
  assert.ok(result.metrics.unfilledNotional > 0);
  assert.ok(result.metrics.spreadCost > 0 && result.metrics.impactCost > 0 && result.metrics.latencyCost > 0);
  assert.notEqual(result.path[0].endingWeights.AAA, 1);
  assert.equal(result.effect, "execution-simulation-only");
});

test("execution reality can make a higher-gross, high-turnover strategy worse", () => {
  const market = { AAA: { open: 100, price: 101, volume: 10_000 } };
  const fast = simulateEventDrivenExecution({ initialCapital: 100_000, periods: [{ at: "t0", weights: { AAA: 1 }, realizedReturns: { AAA: 0.02 }, market }, { at: "t1", weights: { AAA: 0 }, realizedReturns: { AAA: 0 }, market }, { at: "t2", weights: { AAA: 1 }, realizedReturns: { AAA: 0.02 }, market }, { at: "t3", weights: { AAA: 0 }, realizedReturns: { AAA: 0 }, market }], execution: { spreadBps: 100, impactBpsAtFullParticipation: 500, maximumParticipationRate: 0.1, latencyFractionOfBar: 1 } });
  const patient = simulateEventDrivenExecution({ initialCapital: 100_000, periods: [{ at: "t0", weights: { AAA: 0.25 }, realizedReturns: { AAA: 0.01 }, market }, { at: "t1", weights: { AAA: 0.25 }, realizedReturns: { AAA: 0.01 }, market }, { at: "t2", weights: { AAA: 0.25 }, realizedReturns: { AAA: 0.01 }, market }, { at: "t3", weights: { AAA: 0.25 }, realizedReturns: { AAA: 0.01 }, market }], execution: { spreadBps: 100, impactBpsAtFullParticipation: 500, maximumParticipationRate: 0.1, latencyFractionOfBar: 1 } });
  assert.ok(fast.metrics.totalReturn < patient.metrics.totalReturn);
  assert.ok(fast.metrics.costs > patient.metrics.costs);
});
