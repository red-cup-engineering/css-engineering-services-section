/**
 * analysis/closure-rule-system - finite immediate-consequence operators.
 *
 * Executable shadow of RelMath.Closure.ClosureRuleSystem. Rules are represented
 * as positive finite threshold antecedents over FOUR-valued valuation cells, with
 * one consequent that raises a cell by knowledge join.
 */
import {
  chargeValue,
  chargeValueName,
  chargeValueNames,
  joinKnowledgeValue,
  type ChargeValueName,
} from "../../bilattice-charge.mjs";
import {
  readValuationFiber,
  valuationFiberCarrier,
  valuationLeqKnowledge,
  valuationKnowledgeJoin,
  type ValuationFiberCarrier,
} from "../../index.mjs";

export interface ClosureRuleCondition {
  readonly cell: string;
  readonly atLeast: ChargeValueName;
}

export interface ClosureRuleConsequent {
  readonly cell: string;
  readonly charge: ChargeValueName;
}

export interface ClosureRuleCarrier {
  readonly kind: "closureRule.rule.carrier";
  readonly name: string;
  readonly antecedent: readonly ClosureRuleCondition[];
  readonly consequent: ClosureRuleConsequent;
}

export interface ClosureRuleSystemCarrier {
  readonly kind: "closureRule.system.carrier";
  readonly cells: readonly string[];
  readonly rules: readonly ClosureRuleCarrier[];
}

export interface ClosureRuleReceipt {
  readonly kind: "closureRule.system.receipt:witness";
  readonly system: ClosureRuleSystemCarrier;
  readonly seed: ValuationFiberCarrier;
  readonly orbit: readonly ValuationFiberCarrier[];
  readonly closed: ValuationFiberCarrier;
  readonly fixed: true;
  readonly inflationary: true;
  readonly monotone: true;
  readonly ruleRespecting: true;
  readonly leastClosed: true;
  readonly lfp: true;
  readonly firedAtSeed: readonly string[];
}

const unique = (items: readonly string[]): boolean => new Set(items).size === items.length;

const freezeRecord = <T,>(record: Record<string, T>): Readonly<Record<string, T>> => Object.freeze({ ...record });

const knowledgeLeqValue = (left: ChargeValueName, right: ChargeValueName): boolean =>
  chargeValueName(joinKnowledgeValue(chargeValue(left), chargeValue(right))) === right;

const knowledgeJoinValueName = (left: ChargeValueName, right: ChargeValueName): ChargeValueName =>
  chargeValueName(joinKnowledgeValue(chargeValue(left), chargeValue(right)));

const sameFiber = (left: ValuationFiberCarrier, right: ValuationFiberCarrier): boolean =>
  left.points.length === right.points.length
  && left.points.every((point, index) => point === right.points[index] && readValuationFiber(left, point) === readValuationFiber(right, point));

function requireChargeValue(value: ChargeValueName, caller: string): void {
  if (!chargeValueNames.includes(value)) throw new TypeError(`${caller}: ${value} is not a FOUR charge value`);
}

function requireCell(cells: readonly string[], cell: string, caller: string): void {
  if (!cells.includes(cell)) throw new TypeError(`${caller}: cell ${cell} is not in the finite carrier`);
}

export function closureRule(
  name: string,
  antecedent: readonly ClosureRuleCondition[],
  consequent: ClosureRuleConsequent,
): ClosureRuleCarrier {
  for (const condition of antecedent) requireChargeValue(condition.atLeast, "closureRule");
  requireChargeValue(consequent.charge, "closureRule");
  return Object.freeze({
    kind: "closureRule.rule.carrier" as const,
    name,
    antecedent: Object.freeze(antecedent.map((condition) => Object.freeze({ ...condition }))),
    consequent: Object.freeze({ ...consequent }),
  });
}

export const alwaysRule = (cell: string, charge: ChargeValueName): ClosureRuleCarrier =>
  closureRule(`always:${cell}:${charge}`, [], { cell, charge });

export function closureRuleSystem(cells: readonly string[], rules: readonly ClosureRuleCarrier[]): ClosureRuleSystemCarrier {
  if (cells.length === 0) throw new RangeError("closureRuleSystem: carrier must be nonempty");
  if (!unique(cells)) throw new TypeError("closureRuleSystem: duplicate cells are not a finite carrier");
  for (const rule of rules) {
    requireCell(cells, rule.consequent.cell, "closureRuleSystem");
    for (const condition of rule.antecedent) requireCell(cells, condition.cell, "closureRuleSystem");
  }
  return Object.freeze({
    kind: "closureRule.system.carrier" as const,
    cells: Object.freeze([...cells]),
    rules: Object.freeze([...rules]),
  });
}

export function knowledgeLeastValuation(cells: readonly string[]): ValuationFiberCarrier {
  return valuationFiberCarrier(cells, Object.fromEntries(cells.map((cell) => [cell, "absurd"])));
}

export function valuation(cells: readonly string[], values: Readonly<Record<string, ChargeValueName>>): ValuationFiberCarrier {
  const filled: Record<string, ChargeValueName> = {};
  for (const cell of cells) {
    const value = values[cell] ?? "absurd";
    requireChargeValue(value, "closureRule.valuation");
    filled[cell] = value;
  }
  return valuationFiberCarrier(cells, freezeRecord(filled));
}

export function antecedentHolds(rule: ClosureRuleCarrier, carrier: ValuationFiberCarrier): boolean {
  return rule.antecedent.every((condition) =>
    knowledgeLeqValue(condition.atLeast, readValuationFiber(carrier, condition.cell)),
  );
}

export function ruleFire(rule: ClosureRuleCarrier, carrier: ValuationFiberCarrier): ValuationFiberCarrier {
  if (!antecedentHolds(rule, carrier)) return knowledgeLeastValuation(carrier.points);
  return valuation(carrier.points, { [rule.consequent.cell]: rule.consequent.charge });
}

export function fire(system: ClosureRuleSystemCarrier, carrier: ValuationFiberCarrier): ValuationFiberCarrier {
  let fired = knowledgeLeastValuation(system.cells);
  for (const rule of system.rules) fired = valuationKnowledgeJoin(fired, ruleFire(rule, carrier));
  return fired;
}

export function tstep(system: ClosureRuleSystemCarrier, carrier: ValuationFiberCarrier): ValuationFiberCarrier {
  return valuationKnowledgeJoin(carrier, fire(system, carrier));
}

export function closureOrbit(
  system: ClosureRuleSystemCarrier,
  seed: ValuationFiberCarrier,
  maxSteps = Math.max(4, system.cells.length * chargeValueNames.length + system.rules.length + 1),
): readonly ValuationFiberCarrier[] {
  const orbit: ValuationFiberCarrier[] = [seed];
  let current = seed;
  for (let step = 0; step < maxSteps; step += 1) {
    const next = tstep(system, current);
    orbit.push(next);
    if (sameFiber(next, current)) break;
    current = next;
  }
  return Object.freeze(orbit);
}

export function clS(system: ClosureRuleSystemCarrier, seed: ValuationFiberCarrier): ValuationFiberCarrier {
  const orbit = closureOrbit(system, seed);
  return orbit[orbit.length - 1] as ValuationFiberCarrier;
}

function* valuationRecords(cells: readonly string[], index = 0, record: Record<string, ChargeValueName> = {}): Generator<Readonly<Record<string, ChargeValueName>>> {
  if (index === cells.length) {
    yield freezeRecord(record);
    return;
  }
  const cell = cells[index] as string;
  for (const value of chargeValueNames) {
    record[cell] = value;
    yield* valuationRecords(cells, index + 1, record);
  }
  delete record[cell];
}

function allValuations(cells: readonly string[]): readonly ValuationFiberCarrier[] {
  return Object.freeze([...valuationRecords(cells)].map((values) => valuation(cells, values)));
}

function ruleRespecting(system: ClosureRuleSystemCarrier, carrier: ValuationFiberCarrier): boolean {
  return system.rules.every((rule) =>
    !antecedentHolds(rule, carrier)
    || knowledgeLeqValue(rule.consequent.charge, readValuationFiber(carrier, rule.consequent.cell)),
  );
}

function checkMonotone(system: ClosureRuleSystemCarrier): boolean {
  const all = allValuations(system.cells);
  return all.every((left) => all.every((right) =>
    !valuationLeqKnowledge(left, right) || valuationLeqKnowledge(tstep(system, left), tstep(system, right)),
  ));
}

function checkLeastClosed(system: ClosureRuleSystemCarrier, seed: ValuationFiberCarrier, closed: ValuationFiberCarrier): boolean {
  if (system.cells.length > 4) {
    throw new RangeError("closureRuleReceipt: exhaustive least-closed check is limited to at most 4 cells");
  }
  return allValuations(system.cells).every((candidate) =>
    !(valuationLeqKnowledge(seed, candidate) && sameFiber(tstep(system, candidate), candidate))
    || valuationLeqKnowledge(closed, candidate),
  );
}

export function firedRuleNames(system: ClosureRuleSystemCarrier, carrier: ValuationFiberCarrier): readonly string[] {
  return Object.freeze(system.rules.filter((rule) => antecedentHolds(rule, carrier)).map((rule) => rule.name));
}

export function closureRuleReceipt(system: ClosureRuleSystemCarrier, seed: ValuationFiberCarrier): ClosureRuleReceipt {
  const orbit = closureOrbit(system, seed);
  const closed = orbit[orbit.length - 1] as ValuationFiberCarrier;
  const fixed = sameFiber(tstep(system, closed), closed);
  const inflationary = valuationLeqKnowledge(seed, closed);
  const monotone = checkMonotone(system);
  const respecting = ruleRespecting(system, closed);
  const leastClosed = checkLeastClosed(system, seed, closed);
  if (!fixed || !inflationary || !monotone || !respecting || !leastClosed) {
    throw new TypeError("closureRuleReceipt: finite immediate-consequence laws failed");
  }
  return Object.freeze({
    kind: "closureRule.system.receipt:witness" as const,
    system,
    seed,
    orbit,
    closed,
    fixed: true as const,
    inflationary: true as const,
    monotone: true as const,
    ruleRespecting: true as const,
    leastClosed: true as const,
    lfp: true as const,
    firedAtSeed: firedRuleNames(system, seed),
  });
}

export function alwaysRuleReceipt(cell = "cell", charge: ChargeValueName = "potential"): ClosureRuleReceipt {
  const system = closureRuleSystem([cell], [alwaysRule(cell, charge)]);
  return closureRuleReceipt(system, knowledgeLeastValuation(system.cells));
}

export const consequentJoin = (current: ChargeValueName, consequent: ChargeValueName): ChargeValueName =>
  knowledgeJoinValueName(current, consequent);
