/**
 * analysis/residuated-lattice - finite executable shadow of
 * RelMath.Order.ResiduatedLatticeStandalone.
 *
 * Lean proves the integral commutative residuated lattice laws abstractly over
 * a bounded lattice. This module checks the finite table version: bounded
 * lattice tables plus fusion/residual tables satisfy the commutative monoid
 * laws, residuation adjunction, integrality, and derived laws.
 */
import {
  boundedLattice,
  latticeOrder,
  type BoundedLatticeObstruction,
  type FiniteLatticeSystem,
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

const leAt = (system: FiniteResiduatedLatticeSystem, left: number, right: number): boolean =>
  system.lattice.meet[left]?.[right] === left;

const meetAt = (system: FiniteResiduatedLatticeSystem, left: number, right: number): number =>
  system.lattice.meet[left]?.[right] as number;

const fuseAt = (system: FiniteResiduatedLatticeSystem, left: number, right: number): number =>
  system.fuse[left]?.[right] as number;

const impAt = (system: FiniteResiduatedLatticeSystem, left: number, right: number): number =>
  system.imp[left]?.[right] as number;

export interface FiniteResiduatedLatticeSystem {
  readonly kind: "residuatedLattice.finiteSystem";
  readonly lattice: FiniteLatticeSystem;
  readonly top: number;
  readonly bot: number;
  readonly one: number;
  readonly fuse: readonly (readonly number[])[];
  readonly imp: readonly (readonly number[])[];
}

export function finiteResiduatedLatticeSystem(
  lattice: FiniteLatticeSystem,
  top: number,
  bot: number,
  one: number,
  fuse: readonly (readonly number[])[],
  imp: readonly (readonly number[])[],
): FiniteResiduatedLatticeSystem {
  assertIndex("finiteResiduatedLatticeSystem top", top, lattice.labels.length);
  assertIndex("finiteResiduatedLatticeSystem bot", bot, lattice.labels.length);
  assertIndex("finiteResiduatedLatticeSystem one", one, lattice.labels.length);
  requireBinaryTable("finiteResiduatedLatticeSystem fuse", fuse, lattice.labels.length);
  requireBinaryTable("finiteResiduatedLatticeSystem imp", imp, lattice.labels.length);
  return Object.freeze({
    kind: "residuatedLattice.finiteSystem" as const,
    lattice,
    top,
    bot,
    one,
    fuse: freezeTable(fuse),
    imp: freezeTable(imp),
  });
}

export interface ResiduatedLatticeWitness {
  readonly kind: "residuatedLattice.laws:witness";
  readonly carrier: readonly string[];
  readonly top: number;
  readonly topLabel: string;
  readonly bot: number;
  readonly botLabel: string;
  readonly one: number;
  readonly oneLabel: string;
  readonly boundedLattice: true;
  readonly commutativeMonoid: true;
  readonly residuation: true;
  readonly integral: true;
  readonly fuseMonotone: true;
  readonly leOne: true;
  readonly modusPonens: true;
  readonly fuseLeMeet: true;
}

export interface ResiduatedLatticeObstruction {
  readonly kind: "residuatedLattice.laws-obstruction";
  readonly reason:
    | "boundedLattice"
    | "fuse.comm"
    | "fuse.assoc"
    | "fuse.one"
    | "residuation"
    | "integral"
    | "fuse.mono.left"
    | "fuse.mono.right"
    | "le.one"
    | "modusPonens"
    | "fuse.leMeet";
  readonly boundedLattice?: BoundedLatticeObstruction;
  readonly indices?: readonly number[];
  readonly labels?: readonly string[];
  readonly left?: number | undefined;
  readonly right?: number | undefined;
}

export type ResiduatedLatticeJudgment = ResiduatedLatticeWitness | ResiduatedLatticeObstruction;

const obstruction = (
  reason: ResiduatedLatticeObstruction["reason"],
  system: FiniteResiduatedLatticeSystem,
  indices: readonly number[],
  left?: number,
  right?: number,
): ResiduatedLatticeObstruction => Object.freeze({
  kind: "residuatedLattice.laws-obstruction" as const,
  reason,
  indices: Object.freeze([...indices]),
  labels: Object.freeze(indices.map((index) => system.lattice.labels[index] as string)),
  left,
  right,
});

/** Finite integral commutative residuated-lattice law receipt. */
export function laws(system: FiniteResiduatedLatticeSystem): ResiduatedLatticeJudgment {
  const bounded = boundedLattice(system.lattice, system.top, system.bot);
  if (bounded.kind !== "orderInfra.boundedLattice:witness") {
    return Object.freeze({
      kind: "residuatedLattice.laws-obstruction" as const,
      reason: "boundedLattice" as const,
      boundedLattice: bounded,
    });
  }
  if (system.one !== system.top) return obstruction("integral", system, [system.one, system.top], system.one, system.top);

  const size = system.lattice.labels.length;
  for (let a = 0; a < size; a += 1) {
    if (fuseAt(system, a, system.one) !== a) return obstruction("fuse.one", system, [a, system.one], fuseAt(system, a, system.one), a);
    if (!leAt(system, a, system.one)) return obstruction("le.one", system, [a, system.one], a, system.one);
    for (let b = 0; b < size; b += 1) {
      if (fuseAt(system, a, b) !== fuseAt(system, b, a)) return obstruction("fuse.comm", system, [a, b], fuseAt(system, a, b), fuseAt(system, b, a));
      for (let c = 0; c < size; c += 1) {
        if (fuseAt(system, fuseAt(system, a, b), c) !== fuseAt(system, a, fuseAt(system, b, c))) {
          return obstruction("fuse.assoc", system, [a, b, c], fuseAt(system, fuseAt(system, a, b), c), fuseAt(system, a, fuseAt(system, b, c)));
        }
        const fuseLe = leAt(system, fuseAt(system, a, b), c);
        const leImp = leAt(system, a, impAt(system, b, c));
        if (fuseLe !== leImp) return obstruction("residuation", system, [a, b, c], fuseLe ? 1 : 0, leImp ? 1 : 0);

        if (leAt(system, a, b) && !leAt(system, fuseAt(system, a, c), fuseAt(system, b, c))) {
          return obstruction("fuse.mono.left", system, [a, b, c], fuseAt(system, a, c), fuseAt(system, b, c));
        }
        if (leAt(system, a, b) && !leAt(system, fuseAt(system, c, a), fuseAt(system, c, b))) {
          return obstruction("fuse.mono.right", system, [c, a, b], fuseAt(system, c, a), fuseAt(system, c, b));
        }
      }
    }
  }

  for (let a = 0; a < size; a += 1) {
    for (let b = 0; b < size; b += 1) {
      if (!leAt(system, fuseAt(system, impAt(system, a, b), a), b)) {
        return obstruction("modusPonens", system, [a, b], fuseAt(system, impAt(system, a, b), a), b);
      }
      if (!leAt(system, fuseAt(system, a, b), meetAt(system, a, b))) {
        return obstruction("fuse.leMeet", system, [a, b], fuseAt(system, a, b), meetAt(system, a, b));
      }
    }
  }

  return Object.freeze({
    kind: "residuatedLattice.laws:witness" as const,
    carrier: system.lattice.labels,
    top: system.top,
    topLabel: system.lattice.labels[system.top] as string,
    bot: system.bot,
    botLabel: system.lattice.labels[system.bot] as string,
    one: system.one,
    oneLabel: system.lattice.labels[system.one] as string,
    boundedLattice: true as const,
    commutativeMonoid: true as const,
    residuation: true as const,
    integral: true as const,
    fuseMonotone: true as const,
    leOne: true as const,
    modusPonens: true as const,
    fuseLeMeet: true as const,
  });
}

export const twoBooleanResiduatedLattice: FiniteResiduatedLatticeSystem = finiteResiduatedLatticeSystem(
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
  0,
  1,
  [
    [0, 0],
    [0, 1],
  ],
  [
    [1, 1],
    [0, 1],
  ],
);

export const twoBooleanOrder = latticeOrder(twoBooleanResiduatedLattice.lattice);
