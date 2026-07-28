/**
 * analysis/continuum-colimit - finite Scott-colimit limit shape.
 *
 * Executable shadow for `RelMath.Lorentzian.ContinuumColimit`: over the finite
 * FOUR charge lattice, a directed sprinkling tower attains its knowledge join,
 * and any monotone integer functional reaches its join value at a stage. This
 * is the colimit shape, not the analytic Ricci-scalar magnitude.
 */
import {
  chargeValue,
  chargeValueName,
  joinKnowledgeValue,
  type ChargeValueName,
} from "../../bilattice-charge.mjs";
import {
  directedFamily,
  type DirectedChargeFamily,
} from "./scott-coalgebra.mjs";

export type ChargeFunctional = (value: ChargeValueName) => number;

export interface ChuMatrixCell {
  readonly point: string;
  readonly state: string;
  readonly charge: ChargeValueName;
}

export interface ActionJoinReceipt {
  readonly kind: "lorentzian.continuumColimit.actionJoin:witness";
  readonly family: DirectedChargeFamily;
  readonly joinValue: ChargeValueName;
  readonly stageValues: Readonly<Record<ChargeValueName, number>>;
  readonly joinFunctionalValue: number;
  readonly boundsEveryStage: true;
  readonly realizedAmongStages: true;
}

export interface ActionLimitAttainedReceipt {
  readonly kind: "lorentzian.continuumColimit.actionLimit:witness";
  readonly attainedAt: ChargeValueName;
  readonly value: number;
  readonly dominatesEveryStage: true;
  readonly finiteStageAttainment: true;
}

export interface ContinuumColimitReceipt {
  readonly kind: "lorentzian.continuumColimit:witness";
  readonly actionJoin: ActionJoinReceipt;
  readonly limit: ActionLimitAttainedReceipt;
  readonly scottColimitNotEpsilonDelta: true;
  readonly finiteCarrierForcesAttainment: true;
  readonly magnitudeBoundary: "metric Ricci-scalar contraction remains frontier";
}

export interface ChuInformationActionColimitReceipt {
  readonly kind: "lorentzian.chuActionColimit.receipt:witness";
  readonly sourceModule: "RelMath.Lorentzian.ChuActionColimit";
  readonly theorems: readonly [
    "RelMath.Lorentzian.ChuActionColimit.kContent_mono",
    "RelMath.Lorentzian.ChuActionColimit.observedKnowledge_mono",
    "RelMath.Lorentzian.ChuActionColimit.chu_info_action_continuum_attained",
    "RelMath.Lorentzian.ChuActionColimit.chu_action_colimit",
  ];
  readonly cells: readonly ChuMatrixCell[];
  readonly observedKnowledge: ChargeValueName;
  readonly observedKnowledgeContent: number;
  readonly actionJoin: ActionJoinReceipt;
  readonly contentMonotone: true;
  readonly observedKnowledgeMonotone: true;
  readonly continuumValueAttained: true;
  readonly boundary:
    "FOUR information action only; Mobius gravitational BD action remains proof-side frontier";
}

function knowledgeLeq(left: ChargeValueName, right: ChargeValueName): boolean {
  return chargeValueName(joinKnowledgeValue(chargeValue(left), chargeValue(right))) === right;
}

function assertMonotoneOnFamily(family: DirectedChargeFamily, functional: ChargeFunctional): void {
  for (const left of family.elems) {
    for (const right of family.elems) {
      if (knowledgeLeq(left, right) && functional(left) > functional(right)) {
        throw new TypeError("continuumColimit: expected a monotone charge functional on the directed family");
      }
    }
  }
}

export const chargeInformationRank: ChargeFunctional = (value) =>
  value === "absurd" ? 0 : value === "potential" || value === "active" ? 1 : 2;

export const kContent = chargeInformationRank;

function knowledgeSup(values: readonly ChargeValueName[]): ChargeValueName {
  return values.reduce<ChargeValueName>(
    (out, value) => chargeValueName(joinKnowledgeValue(chargeValue(out), chargeValue(value))),
    "absurd",
  );
}

export function observedKnowledge(cells: readonly ChuMatrixCell[]): ChargeValueName {
  return knowledgeSup(cells.map((cell) => cell.charge));
}

/** A monotone functional commutes with the finite directed join. */
export function actionCommutesWithJoin(
  family: DirectedChargeFamily,
  functional: ChargeFunctional = chargeInformationRank,
): ActionJoinReceipt {
  assertMonotoneOnFamily(family, functional);
  const joinFunctionalValue = functional(family.sup);
  const stageValues = Object.freeze(Object.fromEntries(family.elems.map((stage) => [stage, functional(stage)]))) as Readonly<Record<ChargeValueName, number>>;
  const bounds = family.elems.every((stage) => functional(stage) <= joinFunctionalValue);
  const realized = family.elems.some((stage) => functional(stage) === joinFunctionalValue);
  if (!bounds || !realized) {
    throw new TypeError("continuumColimit.actionCommutesWithJoin: finite join value was not attained");
  }
  return Object.freeze({
    kind: "lorentzian.continuumColimit.actionJoin:witness" as const,
    family,
    joinValue: family.sup,
    stageValues,
    joinFunctionalValue,
    boundsEveryStage: true as const,
    realizedAmongStages: true as const,
  });
}

/** The continuum colimit value is reached at a finite stage of the tower. */
export function actionLimitAttained(join: ActionJoinReceipt): ActionLimitAttainedReceipt {
  return Object.freeze({
    kind: "lorentzian.continuumColimit.actionLimit:witness" as const,
    attainedAt: join.joinValue,
    value: join.joinFunctionalValue,
    dominatesEveryStage: true as const,
    finiteStageAttainment: true as const,
  });
}

/** Bundle the finite Scott-colimit reading of the continuum-limit shape. */
export function continuumColimitReceipt(
  family: DirectedChargeFamily = directedFamily(["absurd", "potential", "stable"]),
  functional: ChargeFunctional = chargeInformationRank,
): ContinuumColimitReceipt {
  const actionJoin = actionCommutesWithJoin(family, functional);
  return Object.freeze({
    kind: "lorentzian.continuumColimit:witness" as const,
    actionJoin,
    limit: actionLimitAttained(actionJoin),
    scottColimitNotEpsilonDelta: true as const,
    finiteCarrierForcesAttainment: true as const,
    magnitudeBoundary: "metric Ricci-scalar contraction remains frontier" as const,
  });
}

/** Bundle the Chu/FOUR information-action colimit over a finite reveal prefix. */
export function chuInformationActionColimitReceipt(
  cells: readonly ChuMatrixCell[] = Object.freeze([
    Object.freeze({ point: "p0", state: "s0", charge: "absurd" as const }),
    Object.freeze({ point: "p0", state: "s1", charge: "potential" as const }),
    Object.freeze({ point: "p1", state: "s1", charge: "stable" as const }),
  ]),
): ChuInformationActionColimitReceipt {
  if (cells.length === 0) throw new RangeError("chuInformationActionColimitReceipt: expected at least one revealed cell");
  const prefixes = cells.map((_cell, index) => observedKnowledge(cells.slice(0, index + 1)));
  const family = directedFamily(prefixes);
  const actionJoin = actionCommutesWithJoin(family, kContent);
  const observed = observedKnowledge(cells);
  const monotone = prefixes.every((left, index) =>
    prefixes.slice(index).every((right) => knowledgeLeq(left, right)));
  if (!monotone || actionJoin.joinValue !== observed) {
    throw new TypeError("chuInformationActionColimitReceipt: FOUR information action colimit laws failed");
  }
  return Object.freeze({
    kind: "lorentzian.chuActionColimit.receipt:witness" as const,
    sourceModule: "RelMath.Lorentzian.ChuActionColimit" as const,
    theorems: Object.freeze([
      "RelMath.Lorentzian.ChuActionColimit.kContent_mono",
      "RelMath.Lorentzian.ChuActionColimit.observedKnowledge_mono",
      "RelMath.Lorentzian.ChuActionColimit.chu_info_action_continuum_attained",
      "RelMath.Lorentzian.ChuActionColimit.chu_action_colimit",
    ] as const),
    cells: Object.freeze(cells.map((cell) => Object.freeze({ ...cell }))),
    observedKnowledge: observed,
    observedKnowledgeContent: kContent(observed),
    actionJoin,
    contentMonotone: true as const,
    observedKnowledgeMonotone: true as const,
    continuumValueAttained: actionJoin.realizedAmongStages,
    boundary: "FOUR information action only; Mobius gravitational BD action remains proof-side frontier" as const,
  });
}
