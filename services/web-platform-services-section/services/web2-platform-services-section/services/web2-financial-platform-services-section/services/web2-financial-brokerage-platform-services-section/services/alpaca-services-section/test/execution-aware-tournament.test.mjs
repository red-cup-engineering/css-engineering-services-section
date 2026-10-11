import assert from "node:assert/strict";
import test from "node:test";

import { simulateEventDrivenExecution } from "../scripts/simulate.mjs";
import { selectModelCandidate } from "@red-cup-engineering/model-tournament-service";

const market = { AAA: { open: 100, price: 101, volume: 10_000 } };
const execution = { spreadBps: 100, impactBpsAtFullParticipation: 500, maximumParticipationRate: 0.1, latencyFractionOfBar: 1 };
const simulate = (periods) => simulateEventDrivenExecution({ initialCapital: 100_000, periods, execution }).metrics;

test("the tournament rejects gross-return glamour when execution makes the patient strategy superior", () => {
  const fastPeriods = [
    { at: "t0", weights: { AAA: 1 }, realizedReturns: { AAA: 0.02 }, market },
    { at: "t1", weights: { AAA: 0 }, realizedReturns: { AAA: 0 }, market },
    { at: "t2", weights: { AAA: 1 }, realizedReturns: { AAA: 0.02 }, market },
    { at: "t3", weights: { AAA: 0 }, realizedReturns: { AAA: 0 }, market },
  ];
  const patientPeriods = [
    { at: "t0", weights: { AAA: 0.25 }, realizedReturns: { AAA: 0.01 }, market },
    { at: "t1", weights: { AAA: 0.25 }, realizedReturns: { AAA: 0.01 }, market },
    { at: "t2", weights: { AAA: 0.25 }, realizedReturns: { AAA: 0.01 }, market },
    { at: "t3", weights: { AAA: 0.25 }, realizedReturns: { AAA: 0.01 }, market },
  ];
  const grossFast = fastPeriods.reduce((sum, period) => sum + period.weights.AAA * period.realizedReturns.AAA, 0);
  const grossPatient = patientPeriods.reduce((sum, period) => sum + period.weights.AAA * period.realizedReturns.AAA, 0);
  const fast = simulate(fastPeriods);
  const patient = simulate(patientPeriods);
  assert.ok(grossFast > grossPatient);
  assert.ok(patient.informationRatio > fast.informationRatio);

  const result = selectModelCandidate({ candidates: [
    { id: "urn:strategy:fast", authorActor: "urn:actor:fast", validation: fast, holdout: fast },
    { id: "urn:strategy:patient", authorActor: "urn:actor:patient", validation: patient, holdout: patient },
  ], policy: { metric: "informationRatio", direction: "maximize", maximumHoldoutDrawdown: 1 } });
  assert.equal(result.selectedUsingValidationOnly, "urn:strategy:patient");
});
