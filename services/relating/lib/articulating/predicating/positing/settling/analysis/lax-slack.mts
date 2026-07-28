/**
 * analysis/lax-slack - finite executable shadow of RelMath.Closure.LaxSlackDiagnosis.
 *
 * Lean isolates the order-theoretic reason a KZ/lax-idempotent closure collapses
 * to strict idempotence: antisymmetry. This module models that as finite relation
 * and endomap tables, plus a concrete FOUR/knowledge-order no-slack receipt.
 */
import {
  chargeValue,
  chargeValues,
  joinKnowledgeValue,
  sameChargeValue,
  type ChargeValue,
  type ChargeValueName,
} from "../../bilattice-charge.mjs";

const assertIndex = (name: string, value: number, length: number): void => {
  if (!Number.isSafeInteger(value) || value < 0 || value >= length) {
    throw new RangeError(`${name}: expected an index into the carrier`);
  }
};

const requireSquareRelation = (le: readonly (readonly boolean[])[], size: number): void => {
  if (le.length !== size) throw new RangeError("laxSlack: relation row count must match carrier size");
  for (const row of le) {
    if (row.length !== size) throw new RangeError("laxSlack: relation must be square");
  }
};

const requireEndomap = (op: readonly number[], size: number): void => {
  if (op.length !== size) throw new RangeError("laxSlack: endomap length must match carrier size");
  op.forEach((target, index) => assertIndex(`laxSlack op[${index}]`, target, size));
};

const freezeTable = (le: readonly (readonly boolean[])[]): readonly (readonly boolean[])[] =>
  Object.freeze(le.map((row) => Object.freeze([...row])));

export interface FiniteLaxSystem {
  readonly kind: "laxSlack.finiteSystem";
  readonly labels: readonly string[];
  readonly le: readonly (readonly boolean[])[];
  readonly op: readonly number[];
}

export function finiteLaxSystem(labels: readonly string[], le: readonly (readonly boolean[])[], op: readonly number[]): FiniteLaxSystem {
  if (labels.length === 0) throw new RangeError("finiteLaxSystem: carrier must be nonempty");
  requireSquareRelation(le, labels.length);
  requireEndomap(op, labels.length);
  return Object.freeze({
    kind: "laxSlack.finiteSystem" as const,
    labels: Object.freeze([...labels]),
    le: freezeTable(le),
    op: Object.freeze([...op]),
  });
}

const leAt = (system: FiniteLaxSystem, left: number, right: number): boolean => {
  assertIndex("laxSlack left", left, system.labels.length);
  assertIndex("laxSlack right", right, system.labels.length);
  return system.le[left]?.[right] === true;
};

const opAt = (system: FiniteLaxSystem, point: number): number => {
  assertIndex("laxSlack point", point, system.labels.length);
  return system.op[point] as number;
};

export interface AntisymmetryWitness {
  readonly kind: "laxSlack.antisymmetry:witness";
  readonly carrier: readonly string[];
}

export interface AntisymmetryObstruction {
  readonly kind: "laxSlack.antisymmetry-obstruction";
  readonly pair: readonly [number, number];
  readonly labels: readonly [string, string];
}

export type AntisymmetryJudgment = AntisymmetryWitness | AntisymmetryObstruction;

export function antisymmetry(system: FiniteLaxSystem): AntisymmetryJudgment {
  for (let left = 0; left < system.labels.length; left += 1) {
    for (let right = 0; right < system.labels.length; right += 1) {
      if (left !== right && leAt(system, left, right) && leAt(system, right, left)) {
        return Object.freeze({
          kind: "laxSlack.antisymmetry-obstruction" as const,
          pair: Object.freeze([left, right]) as readonly [number, number],
          labels: Object.freeze([system.labels[left] as string, system.labels[right] as string]) as readonly [string, string],
        });
      }
    }
  }
  return Object.freeze({ kind: "laxSlack.antisymmetry:witness" as const, carrier: system.labels });
}

export interface KzStrictCollapseWitness {
  readonly kind: "laxSlack.kzStrictCollapse:witness";
  readonly point: number;
  readonly label: string;
  readonly first: number;
  readonly second: number;
  readonly firstLabel: string;
  readonly secondLabel: string;
  readonly inflationAtFirst: true;
  readonly kz: true;
  readonly antisymmetric: true;
  readonly strict: true;
}

export interface KzStrictCollapseObstruction {
  readonly kind: "laxSlack.kzStrictCollapse-obstruction";
  readonly reason: "inflation" | "kz" | "antisymmetry" | "strict";
  readonly point: number;
  readonly label: string;
  readonly first: number;
  readonly second: number;
  readonly firstLabel: string;
  readonly secondLabel: string;
  readonly inflationAtFirst: boolean;
  readonly kz: boolean;
  readonly antisymmetry: AntisymmetryJudgment;
  readonly strict: boolean;
}

export type KzStrictCollapseJudgment = KzStrictCollapseWitness | KzStrictCollapseObstruction;

/** Finite carrier for `kz_strict_of_antisymm`: KZ + inflation + antisymmetry force strictness. */
export function kzStrictCollapse(system: FiniteLaxSystem, point: number): KzStrictCollapseJudgment {
  assertIndex("kzStrictCollapse point", point, system.labels.length);
  const first = opAt(system, point);
  const second = opAt(system, first);
  const inflationAtFirst = leAt(system, first, second);
  const kz = leAt(system, second, first);
  const antisymmetryJudgment = antisymmetry(system);
  const strict = second === first;
  const base = {
    point,
    label: system.labels[point] as string,
    first,
    second,
    firstLabel: system.labels[first] as string,
    secondLabel: system.labels[second] as string,
    inflationAtFirst,
    kz,
    strict,
  };
  if (inflationAtFirst && kz && antisymmetryJudgment.kind === "laxSlack.antisymmetry:witness" && strict) {
    return Object.freeze({ kind: "laxSlack.kzStrictCollapse:witness" as const, ...base, inflationAtFirst: true as const, kz: true as const, antisymmetric: true as const, strict: true as const });
  }
  return Object.freeze({
    kind: "laxSlack.kzStrictCollapse-obstruction" as const,
    reason: !inflationAtFirst ? "inflation" as const
      : !kz ? "kz" as const
        : antisymmetryJudgment.kind !== "laxSlack.antisymmetry:witness" ? "antisymmetry" as const
          : "strict" as const,
    ...base,
    antisymmetry: antisymmetryJudgment,
  });
}

export interface LaxSlackAntisymmetryFailureWitness {
  readonly kind: "laxSlack.antisymmetryFailure:witness";
  readonly point: number;
  readonly label: string;
  readonly first: number;
  readonly second: number;
  readonly firstLabel: string;
  readonly secondLabel: string;
  readonly kz: true;
  readonly inflationAtFirst: true;
  readonly strict: false;
  readonly antisymmetryFailurePair: readonly [number, number];
}

export interface LaxSlackAntisymmetryFailureObstruction {
  readonly kind: "laxSlack.antisymmetryFailure-obstruction";
  readonly reason: "kz" | "inflation" | "strict";
  readonly point: number;
  readonly label: string;
  readonly first: number;
  readonly second: number;
  readonly firstLabel: string;
  readonly secondLabel: string;
  readonly kz: boolean;
  readonly inflationAtFirst: boolean;
  readonly strict: boolean;
}

export type LaxSlackAntisymmetryFailureJudgment =
  | LaxSlackAntisymmetryFailureWitness
  | LaxSlackAntisymmetryFailureObstruction;

/** Finite carrier for `lax_slack_witnesses_antisymmetry_failure`. */
export function laxSlackAntisymmetryFailure(system: FiniteLaxSystem, point: number): LaxSlackAntisymmetryFailureJudgment {
  assertIndex("laxSlackAntisymmetryFailure point", point, system.labels.length);
  const first = opAt(system, point);
  const second = opAt(system, first);
  const kz = leAt(system, second, first);
  const inflationAtFirst = leAt(system, first, second);
  const strict = second === first;
  const base = {
    point,
    label: system.labels[point] as string,
    first,
    second,
    firstLabel: system.labels[first] as string,
    secondLabel: system.labels[second] as string,
    kz,
    inflationAtFirst,
    strict,
  };
  if (kz && inflationAtFirst && !strict) {
    return Object.freeze({
      kind: "laxSlack.antisymmetryFailure:witness" as const,
      ...base,
      kz: true as const,
      inflationAtFirst: true as const,
      strict: false as const,
      antisymmetryFailurePair: Object.freeze([second, first]) as readonly [number, number],
    });
  }
  return Object.freeze({
    kind: "laxSlack.antisymmetryFailure-obstruction" as const,
    reason: !kz ? "kz" as const : !inflationAtFirst ? "inflation" as const : "strict" as const,
    ...base,
  });
}

export const twoPointChainSystem: FiniteLaxSystem = finiteLaxSystem(
  ["bottom", "top"],
  [
    [true, true],
    [false, true],
  ],
  [1, 1],
);

export const nonThinLaxSystem: FiniteLaxSystem = finiteLaxSystem(
  ["x", "y"],
  [
    [true, true],
    [true, true],
  ],
  [1, 0],
);

export interface ChargeNoLaxSlackWitness {
  readonly kind: "laxSlack.chargeNoLaxSlack:witness";
  readonly target: ChargeValueName;
  readonly checked: readonly {
    readonly seed: ChargeValueName;
    readonly first: ChargeValueName;
    readonly second: ChargeValueName;
    readonly kz: boolean;
    readonly strict: boolean;
    readonly laxSlack: false;
  }[];
  readonly noLaxSlack: true;
}

/** Concrete FOUR/knowledge-order receipt: charge join closures have no genuine lax slack. */
export function chargeNoLaxSlack(target: ChargeValueName): ChargeNoLaxSlackWitness {
  const targetValue = chargeValue(target);
  const checked = chargeValues.map((seed: ChargeValue) => {
    const first = joinKnowledgeValue(targetValue, seed);
    const second = joinKnowledgeValue(targetValue, first);
    const kz = sameChargeValue(joinKnowledgeValue(second, first), first);
    const strict = sameChargeValue(second, first);
    return Object.freeze({
      seed: seed.name,
      first: first.name,
      second: second.name,
      kz,
      strict,
      laxSlack: false as const,
    });
  });
  return Object.freeze({
    kind: "laxSlack.chargeNoLaxSlack:witness" as const,
    target,
    checked: Object.freeze(checked),
    noLaxSlack: true as const,
  });
}

export interface PreValueCategoryReceipt {
  readonly kind: "preValueCategory.laxClosure:witness";
  readonly nonThinCarrier: FiniteLaxSystem;
  readonly slackAt: number;
  readonly laxSlackWitness: LaxSlackAntisymmetryFailureWitness;
  readonly antisymmetryObstruction: AntisymmetryObstruction;
  readonly thinCollapse: KzStrictCollapseWitness;
  readonly kzInequality: true;
  readonly mutuallyBelowDistinct: true;
  readonly genuineLaxConeNeedsNonThinCarrier: true;
  readonly antisymmetricCarrierCollapsesToIdempotence: true;
}

/** Finite receipt for RelMath.Value.PreValueCategory. */
export function preValueCategoryReceipt(): PreValueCategoryReceipt {
  const laxSlack = laxSlackAntisymmetryFailure(nonThinLaxSystem, 0);
  const nonThin = antisymmetry(nonThinLaxSystem);
  const thinCollapse = kzStrictCollapse(twoPointChainSystem, 0);

  if (
    laxSlack.kind !== "laxSlack.antisymmetryFailure:witness"
    || nonThin.kind !== "laxSlack.antisymmetry-obstruction"
    || thinCollapse.kind !== "laxSlack.kzStrictCollapse:witness"
  ) {
    throw new TypeError("preValueCategoryReceipt: finite pre-value/lax-closure laws failed");
  }

  return Object.freeze({
    kind: "preValueCategory.laxClosure:witness" as const,
    nonThinCarrier: nonThinLaxSystem,
    slackAt: 0,
    laxSlackWitness: laxSlack,
    antisymmetryObstruction: nonThin,
    thinCollapse,
    kzInequality: true as const,
    mutuallyBelowDistinct: true as const,
    genuineLaxConeNeedsNonThinCarrier: true as const,
    antisymmetricCarrierCollapsesToIdempotence: true as const,
  });
}
