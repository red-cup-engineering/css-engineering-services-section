/**
 * analysis/lambek-calculus - finite Lambek algebra law receipts.
 *
 * Executable shadow of RelMath.Order.LambekCalculus. A finite Lambek algebra is
 * represented by a lattice table, a possibly noncommutative product table, and
 * left/right residual tables satisfying the two bi-residuation adjunctions.
 */
import {
  lattice,
  type FiniteLatticeSystem,
  type LatticeObstruction,
} from "./order-infra.mjs";

const assertIndex = (name: string, value: number, length: number): void => {
  if (!Number.isSafeInteger(value) || value < 0 || value >= length) {
    throw new RangeError(`${name}: expected an index into the carrier`);
  }
};

const freezeTable = (table: readonly (readonly number[])[]): readonly (readonly number[])[] =>
  Object.freeze(table.map((row) => Object.freeze([...row])));

const requireBinaryTable = (name: string, table: readonly (readonly number[])[], size: number): void => {
  if (table.length !== size) throw new RangeError(`${name}: table row count must match carrier size`);
  table.forEach((row, left) => {
    if (row.length !== size) throw new RangeError(`${name}: table must be square`);
    row.forEach((target, right) => assertIndex(`${name}[${left}][${right}]`, target, size));
  });
};

export interface FiniteLambekAlgebraSystem {
  readonly kind: "lambek.finiteAlgebraSystem";
  readonly lattice: FiniteLatticeSystem;
  readonly unit: number;
  readonly dot: readonly (readonly number[])[];
  readonly lres: readonly (readonly number[])[];
  readonly rres: readonly (readonly number[])[];
}

export interface LambekLawsWitness {
  readonly kind: "lambek.laws:witness";
  readonly carrier: readonly string[];
  readonly unit: number;
  readonly unitLabel: string;
  readonly lattice: true;
  readonly monoid: true;
  readonly leftBiResiduation: true;
  readonly rightBiResiduation: true;
  readonly modusPonensLeft: true;
  readonly modusPonensRight: true;
  readonly fusionMonotoneLeft: true;
  readonly fusionMonotoneRight: true;
  readonly residualMonotone: true;
  readonly residualAntitone: true;
  readonly unitResiduals: true;
  readonly commutative: boolean;
  readonly residualsCoincideWhenCommutative: boolean;
  readonly singleImplicationWhenCommutative: boolean;
}

export interface LambekLawsObstruction {
  readonly kind: "lambek.laws-obstruction";
  readonly reason:
    | "lattice"
    | "dot.assoc"
    | "dot.unit.left"
    | "dot.unit.right"
    | "leftBiResiduation"
    | "rightBiResiduation"
    | "modusPonens.left"
    | "modusPonens.right"
    | "fusion.mono.left"
    | "fusion.mono.right"
    | "lres.mono.right"
    | "lres.antitone.left"
    | "rres.mono.left"
    | "rres.antitone.right"
    | "lres.unit"
    | "rres.unit"
    | "commutativeCollapse.residuals"
    | "commutativeCollapse.singleImplication";
  readonly lattice?: LatticeObstruction;
  readonly indices?: readonly number[];
  readonly labels?: readonly string[];
  readonly left?: number | boolean | undefined;
  readonly right?: number | boolean | undefined;
}

export type LambekLawsJudgment = LambekLawsWitness | LambekLawsObstruction;

export function finiteLambekAlgebraSystem(
  latticeSystem: FiniteLatticeSystem,
  unit: number,
  dot: readonly (readonly number[])[],
  lres: readonly (readonly number[])[],
  rres: readonly (readonly number[])[],
): FiniteLambekAlgebraSystem {
  assertIndex("finiteLambekAlgebraSystem unit", unit, latticeSystem.labels.length);
  requireBinaryTable("finiteLambekAlgebraSystem dot", dot, latticeSystem.labels.length);
  requireBinaryTable("finiteLambekAlgebraSystem lres", lres, latticeSystem.labels.length);
  requireBinaryTable("finiteLambekAlgebraSystem rres", rres, latticeSystem.labels.length);
  return Object.freeze({
    kind: "lambek.finiteAlgebraSystem" as const,
    lattice: latticeSystem,
    unit,
    dot: freezeTable(dot),
    lres: freezeTable(lres),
    rres: freezeTable(rres),
  });
}

const meetAt = (system: FiniteLambekAlgebraSystem, left: number, right: number): number =>
  system.lattice.meet[left]?.[right] as number;

const leAt = (system: FiniteLambekAlgebraSystem, left: number, right: number): boolean =>
  meetAt(system, left, right) === left;

const dotAt = (system: FiniteLambekAlgebraSystem, left: number, right: number): number =>
  system.dot[left]?.[right] as number;

const lresAt = (system: FiniteLambekAlgebraSystem, left: number, right: number): number =>
  system.lres[left]?.[right] as number;

const rresAt = (system: FiniteLambekAlgebraSystem, numerator: number, denominator: number): number =>
  system.rres[numerator]?.[denominator] as number;

const obstruction = (
  reason: LambekLawsObstruction["reason"],
  system: FiniteLambekAlgebraSystem,
  indices: readonly number[],
  left?: number | boolean,
  right?: number | boolean,
): LambekLawsObstruction => Object.freeze({
  kind: "lambek.laws-obstruction" as const,
  reason,
  indices: Object.freeze([...indices]),
  labels: Object.freeze(indices.map((index) => system.lattice.labels[index] as string)),
  left,
  right,
});

const isCommutative = (system: FiniteLambekAlgebraSystem): boolean =>
  system.lattice.labels.every((_, a) => system.lattice.labels.every((__, b) => dotAt(system, a, b) === dotAt(system, b, a)));

/** Finite Lambek algebra law receipt, including derived laws and commutative collapse. */
export function laws(system: FiniteLambekAlgebraSystem): LambekLawsJudgment {
  const latticeJudgment = lattice(system.lattice);
  if (latticeJudgment.kind !== "orderInfra.lattice:witness") {
    return Object.freeze({
      kind: "lambek.laws-obstruction" as const,
      reason: "lattice" as const,
      lattice: latticeJudgment,
    });
  }

  const size = system.lattice.labels.length;
  for (let a = 0; a < size; a += 1) {
    if (dotAt(system, system.unit, a) !== a) return obstruction("dot.unit.left", system, [system.unit, a], dotAt(system, system.unit, a), a);
    if (dotAt(system, a, system.unit) !== a) return obstruction("dot.unit.right", system, [a, system.unit], dotAt(system, a, system.unit), a);
    for (let b = 0; b < size; b += 1) {
      for (let c = 0; c < size; c += 1) {
        if (dotAt(system, dotAt(system, a, b), c) !== dotAt(system, a, dotAt(system, b, c))) {
          return obstruction("dot.assoc", system, [a, b, c], dotAt(system, dotAt(system, a, b), c), dotAt(system, a, dotAt(system, b, c)));
        }
        const dotLe = leAt(system, dotAt(system, a, b), c);
        const leftResLe = leAt(system, b, lresAt(system, a, c));
        if (dotLe !== leftResLe) return obstruction("leftBiResiduation", system, [a, b, c], dotLe, leftResLe);
        const rightResLe = leAt(system, a, rresAt(system, c, b));
        if (dotLe !== rightResLe) return obstruction("rightBiResiduation", system, [a, b, c], dotLe, rightResLe);

        if (leAt(system, a, b) && !leAt(system, dotAt(system, a, c), dotAt(system, b, c))) {
          return obstruction("fusion.mono.left", system, [a, b, c], dotAt(system, a, c), dotAt(system, b, c));
        }
        if (leAt(system, a, b) && !leAt(system, dotAt(system, c, a), dotAt(system, c, b))) {
          return obstruction("fusion.mono.right", system, [c, a, b], dotAt(system, c, a), dotAt(system, c, b));
        }
        if (leAt(system, b, c) && !leAt(system, lresAt(system, a, b), lresAt(system, a, c))) {
          return obstruction("lres.mono.right", system, [a, b, c], lresAt(system, a, b), lresAt(system, a, c));
        }
        if (leAt(system, a, b) && !leAt(system, lresAt(system, b, c), lresAt(system, a, c))) {
          return obstruction("lres.antitone.left", system, [a, b, c], lresAt(system, b, c), lresAt(system, a, c));
        }
        if (leAt(system, a, b) && !leAt(system, rresAt(system, a, c), rresAt(system, b, c))) {
          return obstruction("rres.mono.left", system, [a, b, c], rresAt(system, a, c), rresAt(system, b, c));
        }
        if (leAt(system, b, c) && !leAt(system, rresAt(system, a, c), rresAt(system, a, b))) {
          return obstruction("rres.antitone.right", system, [a, b, c], rresAt(system, a, c), rresAt(system, a, b));
        }
      }
      if (!leAt(system, dotAt(system, a, lresAt(system, a, b)), b)) {
        return obstruction("modusPonens.left", system, [a, b], dotAt(system, a, lresAt(system, a, b)), b);
      }
      if (!leAt(system, dotAt(system, rresAt(system, a, b), b), a)) {
        return obstruction("modusPonens.right", system, [a, b], dotAt(system, rresAt(system, a, b), b), a);
      }
    }
    if (lresAt(system, system.unit, a) !== a) return obstruction("lres.unit", system, [system.unit, a], lresAt(system, system.unit, a), a);
    if (rresAt(system, a, system.unit) !== a) return obstruction("rres.unit", system, [a, system.unit], rresAt(system, a, system.unit), a);
  }

  const commutative = isCommutative(system);
  let residualsCoincideWhenCommutative = false;
  let singleImplicationWhenCommutative = false;
  if (commutative) {
    residualsCoincideWhenCommutative = system.lattice.labels.every((_, a) =>
      system.lattice.labels.every((__, c) => lresAt(system, a, c) === rresAt(system, c, a)),
    );
    if (!residualsCoincideWhenCommutative) return obstruction("commutativeCollapse.residuals", system, []);
    singleImplicationWhenCommutative = system.lattice.labels.every((_, a) =>
      system.lattice.labels.every((__, b) => system.lattice.labels.every((___, c) =>
        leAt(system, dotAt(system, a, b), c) === leAt(system, b, lresAt(system, a, c)),
      )),
    );
    if (!singleImplicationWhenCommutative) return obstruction("commutativeCollapse.singleImplication", system, []);
  }

  return Object.freeze({
    kind: "lambek.laws:witness" as const,
    carrier: system.lattice.labels,
    unit: system.unit,
    unitLabel: system.lattice.labels[system.unit] as string,
    lattice: true as const,
    monoid: true as const,
    leftBiResiduation: true as const,
    rightBiResiduation: true as const,
    modusPonensLeft: true as const,
    modusPonensRight: true as const,
    fusionMonotoneLeft: true as const,
    fusionMonotoneRight: true as const,
    residualMonotone: true as const,
    residualAntitone: true as const,
    unitResiduals: true as const,
    commutative,
    residualsCoincideWhenCommutative,
    singleImplicationWhenCommutative,
  });
}

export const trivialLambekAlgebra: FiniteLambekAlgebraSystem = finiteLambekAlgebraSystem(
  {
    kind: "orderInfra.finiteLatticeSystem" as const,
    labels: Object.freeze(["unit"]),
    meet: Object.freeze([Object.freeze([0])]),
    join: Object.freeze([Object.freeze([0])]),
  },
  0,
  [[0]],
  [[0]],
  [[0]],
);

export const booleanCommutativeLambekAlgebra: FiniteLambekAlgebraSystem = finiteLambekAlgebraSystem(
  {
    kind: "orderInfra.finiteLatticeSystem" as const,
    labels: Object.freeze(["false", "true"]),
    meet: Object.freeze([
      Object.freeze([0, 0]),
      Object.freeze([0, 1]),
    ]),
    join: Object.freeze([
      Object.freeze([0, 1]),
      Object.freeze([1, 1]),
    ]),
  },
  1,
  [
    [0, 0],
    [0, 1],
  ],
  [
    [1, 1],
    [0, 1],
  ],
  [
    [1, 0],
    [1, 1],
  ],
);
