/**
 * analysis/order-infra - finite executable shadows of RelMath.Order.OrderInfra.
 *
 * Lean gives the abstract order hierarchy: preorder, partial order, monotone
 * maps, algebraic lattices, bounded/distributive lattices, and complete
 * lattices by arbitrary suprema. This module keeps the Node claim finite:
 * explicit carrier/relation/table data are checked and returned as receipts.
 */

const assertIndex = (name: string, value: number, length: number): void => {
  if (!Number.isSafeInteger(value) || value < 0 || value >= length) {
    throw new RangeError(`${name}: expected an index into the carrier`);
  }
};

const requireNonemptyLabels = (name: string, labels: readonly string[]): void => {
  if (labels.length === 0) throw new RangeError(`${name}: carrier must be nonempty`);
};

const freezeRelation = (le: readonly (readonly boolean[])[]): readonly (readonly boolean[])[] =>
  Object.freeze(le.map((row) => Object.freeze([...row])));

const freezeTable = (table: readonly (readonly number[])[]): readonly (readonly number[])[] =>
  Object.freeze(table.map((row) => Object.freeze([...row])));

const requireSquareRelation = (le: readonly (readonly boolean[])[], size: number): void => {
  if (le.length !== size) throw new RangeError("orderInfra: relation row count must match carrier size");
  le.forEach((row) => {
    if (row.length !== size) throw new RangeError("orderInfra: relation must be square");
  });
};

const requireBinaryTable = (name: string, table: readonly (readonly number[])[], size: number): void => {
  if (table.length !== size) throw new RangeError(`${name}: table row count must match carrier size`);
  table.forEach((row, left) => {
    if (row.length !== size) throw new RangeError(`${name}: table must be square`);
    row.forEach((target, right) => assertIndex(`${name}[${left}][${right}]`, target, size));
  });
};

export interface FinitePreorderSystem {
  readonly kind: "orderInfra.finitePreorderSystem";
  readonly labels: readonly string[];
  readonly le: readonly (readonly boolean[])[];
}

export function finitePreorderSystem(labels: readonly string[], le: readonly (readonly boolean[])[]): FinitePreorderSystem {
  requireNonemptyLabels("finitePreorderSystem", labels);
  requireSquareRelation(le, labels.length);
  return Object.freeze({
    kind: "orderInfra.finitePreorderSystem" as const,
    labels: Object.freeze([...labels]),
    le: freezeRelation(le),
  });
}

const leAt = (system: FinitePreorderSystem, left: number, right: number): boolean => {
  assertIndex("orderInfra left", left, system.labels.length);
  assertIndex("orderInfra right", right, system.labels.length);
  return system.le[left]?.[right] === true;
};

export interface PreorderWitness {
  readonly kind: "orderInfra.preorder:witness";
  readonly carrier: readonly string[];
  readonly reflexive: true;
  readonly transitive: true;
}

export interface PreorderObstruction {
  readonly kind: "orderInfra.preorder-obstruction";
  readonly reason: "reflexivity" | "transitivity";
  readonly point?: number;
  readonly pointLabel?: string;
  readonly chain?: readonly [number, number, number];
  readonly chainLabels?: readonly [string, string, string];
}

export type PreorderJudgment = PreorderWitness | PreorderObstruction;

/** Finite receipt for `Preorder`: reflexivity and transitivity. */
export function preorder(system: FinitePreorderSystem): PreorderJudgment {
  for (let point = 0; point < system.labels.length; point += 1) {
    if (!leAt(system, point, point)) {
      return Object.freeze({
        kind: "orderInfra.preorder-obstruction" as const,
        reason: "reflexivity" as const,
        point,
        pointLabel: system.labels[point] as string,
      });
    }
  }

  for (let left = 0; left < system.labels.length; left += 1) {
    for (let middle = 0; middle < system.labels.length; middle += 1) {
      for (let right = 0; right < system.labels.length; right += 1) {
        if (leAt(system, left, middle) && leAt(system, middle, right) && !leAt(system, left, right)) {
          return Object.freeze({
            kind: "orderInfra.preorder-obstruction" as const,
            reason: "transitivity" as const,
            chain: Object.freeze([left, middle, right]) as readonly [number, number, number],
            chainLabels: Object.freeze([
              system.labels[left] as string,
              system.labels[middle] as string,
              system.labels[right] as string,
            ]) as readonly [string, string, string],
          });
        }
      }
    }
  }

  return Object.freeze({
    kind: "orderInfra.preorder:witness" as const,
    carrier: system.labels,
    reflexive: true as const,
    transitive: true as const,
  });
}

export interface PartialOrderWitness {
  readonly kind: "orderInfra.partialOrder:witness";
  readonly carrier: readonly string[];
  readonly preorder: PreorderWitness;
  readonly antisymmetric: true;
}

export interface PartialOrderObstruction {
  readonly kind: "orderInfra.partialOrder-obstruction";
  readonly reason: "preorder" | "antisymmetry";
  readonly preorder?: PreorderObstruction;
  readonly pair?: readonly [number, number];
  readonly labels?: readonly [string, string];
}

export type PartialOrderJudgment = PartialOrderWitness | PartialOrderObstruction;

/** Finite receipt for `PartialOrder`: preorder plus antisymmetry. */
export function partialOrder(system: FinitePreorderSystem): PartialOrderJudgment {
  const preorderJudgment = preorder(system);
  if (preorderJudgment.kind !== "orderInfra.preorder:witness") {
    return Object.freeze({
      kind: "orderInfra.partialOrder-obstruction" as const,
      reason: "preorder" as const,
      preorder: preorderJudgment,
    });
  }

  for (let left = 0; left < system.labels.length; left += 1) {
    for (let right = 0; right < system.labels.length; right += 1) {
      if (left !== right && leAt(system, left, right) && leAt(system, right, left)) {
        return Object.freeze({
          kind: "orderInfra.partialOrder-obstruction" as const,
          reason: "antisymmetry" as const,
          pair: Object.freeze([left, right]) as readonly [number, number],
          labels: Object.freeze([system.labels[left] as string, system.labels[right] as string]) as readonly [string, string],
        });
      }
    }
  }

  return Object.freeze({
    kind: "orderInfra.partialOrder:witness" as const,
    carrier: system.labels,
    preorder: preorderJudgment,
    antisymmetric: true as const,
  });
}

export interface MonotoneMapWitness {
  readonly kind: "orderInfra.monotoneMap:witness";
  readonly domain: readonly string[];
  readonly codomain: readonly string[];
  readonly map: readonly number[];
  readonly monotone: true;
}

export interface MonotoneMapObstruction {
  readonly kind: "orderInfra.monotoneMap-obstruction";
  readonly reason: "domain-preorder" | "codomain-preorder" | "monotonicity";
  readonly domainPreorder?: PreorderObstruction;
  readonly codomainPreorder?: PreorderObstruction;
  readonly pair?: readonly [number, number];
  readonly imagePair?: readonly [number, number];
  readonly labels?: readonly [string, string];
  readonly imageLabels?: readonly [string, string];
}

export type MonotoneMapJudgment = MonotoneMapWitness | MonotoneMapObstruction;

/** Finite receipt for monotonicity between finite preorders. */
export function monotoneMap(
  domain: FinitePreorderSystem,
  codomain: FinitePreorderSystem,
  map: readonly number[],
): MonotoneMapJudgment {
  if (map.length !== domain.labels.length) throw new RangeError("monotoneMap: map length must match domain carrier size");
  map.forEach((target, index) => assertIndex(`monotoneMap[${index}]`, target, codomain.labels.length));

  const domainPreorder = preorder(domain);
  if (domainPreorder.kind !== "orderInfra.preorder:witness") {
    return Object.freeze({
      kind: "orderInfra.monotoneMap-obstruction" as const,
      reason: "domain-preorder" as const,
      domainPreorder,
    });
  }
  const codomainPreorder = preorder(codomain);
  if (codomainPreorder.kind !== "orderInfra.preorder:witness") {
    return Object.freeze({
      kind: "orderInfra.monotoneMap-obstruction" as const,
      reason: "codomain-preorder" as const,
      codomainPreorder,
    });
  }

  for (let left = 0; left < domain.labels.length; left += 1) {
    for (let right = 0; right < domain.labels.length; right += 1) {
      const imageLeft = map[left] as number;
      const imageRight = map[right] as number;
      if (leAt(domain, left, right) && !leAt(codomain, imageLeft, imageRight)) {
        return Object.freeze({
          kind: "orderInfra.monotoneMap-obstruction" as const,
          reason: "monotonicity" as const,
          pair: Object.freeze([left, right]) as readonly [number, number],
          imagePair: Object.freeze([imageLeft, imageRight]) as readonly [number, number],
          labels: Object.freeze([domain.labels[left] as string, domain.labels[right] as string]) as readonly [string, string],
          imageLabels: Object.freeze([codomain.labels[imageLeft] as string, codomain.labels[imageRight] as string]) as readonly [string, string],
        });
      }
    }
  }

  return Object.freeze({
    kind: "orderInfra.monotoneMap:witness" as const,
    domain: domain.labels,
    codomain: codomain.labels,
    map: Object.freeze([...map]),
    monotone: true as const,
  });
}

export interface FiniteLatticeSystem {
  readonly kind: "orderInfra.finiteLatticeSystem";
  readonly labels: readonly string[];
  readonly meet: readonly (readonly number[])[];
  readonly join: readonly (readonly number[])[];
}

export function finiteLatticeSystem(
  labels: readonly string[],
  meet: readonly (readonly number[])[],
  join: readonly (readonly number[])[],
): FiniteLatticeSystem {
  requireNonemptyLabels("finiteLatticeSystem", labels);
  requireBinaryTable("finiteLatticeSystem meet", meet, labels.length);
  requireBinaryTable("finiteLatticeSystem join", join, labels.length);
  return Object.freeze({
    kind: "orderInfra.finiteLatticeSystem" as const,
    labels: Object.freeze([...labels]),
    meet: freezeTable(meet),
    join: freezeTable(join),
  });
}

const meetAt = (system: FiniteLatticeSystem, left: number, right: number): number => system.meet[left]?.[right] as number;
const joinAt = (system: FiniteLatticeSystem, left: number, right: number): number => system.join[left]?.[right] as number;

export function latticeOrder(system: FiniteLatticeSystem): FinitePreorderSystem {
  return finitePreorderSystem(
    system.labels,
    system.labels.map((_, left) => system.labels.map((__, right) => meetAt(system, left, right) === left)),
  );
}

export interface LatticeWitness {
  readonly kind: "orderInfra.lattice:witness";
  readonly carrier: readonly string[];
  readonly order: FinitePreorderSystem;
  readonly partialOrder: PartialOrderWitness;
  readonly laws: true;
  readonly meetGlb: true;
  readonly joinLub: true;
  readonly meetJoinOrderAgree: true;
}

export interface LatticeObstruction {
  readonly kind: "orderInfra.lattice-obstruction";
  readonly law:
    | "meet.comm"
    | "meet.assoc"
    | "meet.idem"
    | "join.comm"
    | "join.assoc"
    | "join.idem"
    | "absorb.meetJoin"
    | "absorb.joinMeet"
    | "partialOrder"
    | "meet.glb"
    | "join.lub"
    | "order.agreement";
  readonly indices?: readonly number[];
  readonly labels?: readonly string[];
  readonly left?: number | undefined;
  readonly right?: number | undefined;
  readonly partialOrder?: PartialOrderObstruction;
}

export type LatticeJudgment = LatticeWitness | LatticeObstruction;

const latticeObstruction = (
  law: LatticeObstruction["law"],
  system: FiniteLatticeSystem,
  indices: readonly number[],
  left?: number,
  right?: number,
): LatticeObstruction => {
  const base = {
    kind: "orderInfra.lattice-obstruction" as const,
    law,
    indices: Object.freeze([...indices]),
    labels: Object.freeze(indices.map((index) => system.labels[index] as string)),
  };
  if (left === undefined && right === undefined) return Object.freeze(base);
  if (right === undefined) return Object.freeze({ ...base, left });
  if (left === undefined) return Object.freeze({ ...base, right });
  return Object.freeze({ ...base, left, right });
};

/** Finite receipt for the algebraic lattice laws plus derived glb/lub order laws. */
export function lattice(system: FiniteLatticeSystem): LatticeJudgment {
  const size = system.labels.length;
  for (let a = 0; a < size; a += 1) {
    if (meetAt(system, a, a) !== a) return latticeObstruction("meet.idem", system, [a], meetAt(system, a, a), a);
    if (joinAt(system, a, a) !== a) return latticeObstruction("join.idem", system, [a], joinAt(system, a, a), a);
    for (let b = 0; b < size; b += 1) {
      if (meetAt(system, a, b) !== meetAt(system, b, a)) return latticeObstruction("meet.comm", system, [a, b], meetAt(system, a, b), meetAt(system, b, a));
      if (joinAt(system, a, b) !== joinAt(system, b, a)) return latticeObstruction("join.comm", system, [a, b], joinAt(system, a, b), joinAt(system, b, a));
      if (meetAt(system, a, joinAt(system, a, b)) !== a) return latticeObstruction("absorb.meetJoin", system, [a, b], meetAt(system, a, joinAt(system, a, b)), a);
      if (joinAt(system, a, meetAt(system, a, b)) !== a) return latticeObstruction("absorb.joinMeet", system, [a, b], joinAt(system, a, meetAt(system, a, b)), a);
      for (let c = 0; c < size; c += 1) {
        if (meetAt(system, meetAt(system, a, b), c) !== meetAt(system, a, meetAt(system, b, c))) {
          return latticeObstruction("meet.assoc", system, [a, b, c], meetAt(system, meetAt(system, a, b), c), meetAt(system, a, meetAt(system, b, c)));
        }
        if (joinAt(system, joinAt(system, a, b), c) !== joinAt(system, a, joinAt(system, b, c))) {
          return latticeObstruction("join.assoc", system, [a, b, c], joinAt(system, joinAt(system, a, b), c), joinAt(system, a, joinAt(system, b, c)));
        }
      }
    }
  }

  const order = latticeOrder(system);
  const partial = partialOrder(order);
  if (partial.kind !== "orderInfra.partialOrder:witness") {
    return Object.freeze({
      kind: "orderInfra.lattice-obstruction" as const,
      law: "partialOrder" as const,
      partialOrder: partial,
    });
  }

  for (let a = 0; a < size; a += 1) {
    for (let b = 0; b < size; b += 1) {
      const meet = meetAt(system, a, b);
      const join = joinAt(system, a, b);
      if (!leAt(order, meet, a) || !leAt(order, meet, b)) return latticeObstruction("meet.glb", system, [a, b], meet, -1);
      if (!leAt(order, a, join) || !leAt(order, b, join)) return latticeObstruction("join.lub", system, [a, b], join, -1);
      if ((meetAt(system, a, b) === a) !== (joinAt(system, a, b) === b)) {
        return latticeObstruction("order.agreement", system, [a, b], meetAt(system, a, b), joinAt(system, a, b));
      }
      for (let c = 0; c < size; c += 1) {
        if (leAt(order, c, a) && leAt(order, c, b) && !leAt(order, c, meet)) return latticeObstruction("meet.glb", system, [a, b, c], c, meet);
        if (leAt(order, a, c) && leAt(order, b, c) && !leAt(order, join, c)) return latticeObstruction("join.lub", system, [a, b, c], join, c);
      }
    }
  }

  return Object.freeze({
    kind: "orderInfra.lattice:witness" as const,
    carrier: system.labels,
    order,
    partialOrder: partial,
    laws: true as const,
    meetGlb: true as const,
    joinLub: true as const,
    meetJoinOrderAgree: true as const,
  });
}

export interface BoundedLatticeWitness {
  readonly kind: "orderInfra.boundedLattice:witness";
  readonly carrier: readonly string[];
  readonly top: number;
  readonly topLabel: string;
  readonly bot: number;
  readonly botLabel: string;
  readonly lattice: LatticeWitness;
  readonly leTop: true;
  readonly botLe: true;
}

export interface BoundedLatticeObstruction {
  readonly kind: "orderInfra.boundedLattice-obstruction";
  readonly reason: "lattice" | "meetTop" | "joinBot" | "leTop" | "botLe";
  readonly lattice?: LatticeObstruction;
  readonly point?: number;
  readonly pointLabel?: string;
}

export type BoundedLatticeJudgment = BoundedLatticeWitness | BoundedLatticeObstruction;

/** Finite receipt for `BoundedLattice`: top/bot identities and derived bounds. */
export function boundedLattice(system: FiniteLatticeSystem, top: number, bot: number): BoundedLatticeJudgment {
  assertIndex("boundedLattice top", top, system.labels.length);
  assertIndex("boundedLattice bot", bot, system.labels.length);
  const latticeJudgment = lattice(system);
  if (latticeJudgment.kind !== "orderInfra.lattice:witness") {
    return Object.freeze({
      kind: "orderInfra.boundedLattice-obstruction" as const,
      reason: "lattice" as const,
      lattice: latticeJudgment,
    });
  }
  for (let point = 0; point < system.labels.length; point += 1) {
    if (meetAt(system, point, top) !== point) {
      return Object.freeze({ kind: "orderInfra.boundedLattice-obstruction" as const, reason: "meetTop" as const, point, pointLabel: system.labels[point] as string });
    }
    if (joinAt(system, point, bot) !== point) {
      return Object.freeze({ kind: "orderInfra.boundedLattice-obstruction" as const, reason: "joinBot" as const, point, pointLabel: system.labels[point] as string });
    }
    if (!leAt(latticeJudgment.order, point, top)) {
      return Object.freeze({ kind: "orderInfra.boundedLattice-obstruction" as const, reason: "leTop" as const, point, pointLabel: system.labels[point] as string });
    }
    if (!leAt(latticeJudgment.order, bot, point)) {
      return Object.freeze({ kind: "orderInfra.boundedLattice-obstruction" as const, reason: "botLe" as const, point, pointLabel: system.labels[point] as string });
    }
  }
  return Object.freeze({
    kind: "orderInfra.boundedLattice:witness" as const,
    carrier: system.labels,
    top,
    topLabel: system.labels[top] as string,
    bot,
    botLabel: system.labels[bot] as string,
    lattice: latticeJudgment,
    leTop: true as const,
    botLe: true as const,
  });
}

export interface DistributiveLatticeWitness {
  readonly kind: "orderInfra.distributiveLattice:witness";
  readonly carrier: readonly string[];
  readonly lattice: LatticeWitness;
  readonly meetJoinDistributes: true;
}

export interface DistributiveLatticeObstruction {
  readonly kind: "orderInfra.distributiveLattice-obstruction";
  readonly reason: "lattice" | "distributivity";
  readonly lattice?: LatticeObstruction;
  readonly indices?: readonly [number, number, number];
  readonly labels?: readonly [string, string, string];
  readonly left?: number;
  readonly right?: number;
}

export type DistributiveLatticeJudgment = DistributiveLatticeWitness | DistributiveLatticeObstruction;

/** Finite receipt for `meet a (join b c) = join (meet a b) (meet a c)`. */
export function distributiveLattice(system: FiniteLatticeSystem): DistributiveLatticeJudgment {
  const latticeJudgment = lattice(system);
  if (latticeJudgment.kind !== "orderInfra.lattice:witness") {
    return Object.freeze({
      kind: "orderInfra.distributiveLattice-obstruction" as const,
      reason: "lattice" as const,
      lattice: latticeJudgment,
    });
  }
  for (let a = 0; a < system.labels.length; a += 1) {
    for (let b = 0; b < system.labels.length; b += 1) {
      for (let c = 0; c < system.labels.length; c += 1) {
        const left = meetAt(system, a, joinAt(system, b, c));
        const right = joinAt(system, meetAt(system, a, b), meetAt(system, a, c));
        if (left !== right) {
          return Object.freeze({
            kind: "orderInfra.distributiveLattice-obstruction" as const,
            reason: "distributivity" as const,
            indices: Object.freeze([a, b, c]) as readonly [number, number, number],
            labels: Object.freeze([system.labels[a] as string, system.labels[b] as string, system.labels[c] as string]) as readonly [string, string, string],
            left,
            right,
          });
        }
      }
    }
  }
  return Object.freeze({
    kind: "orderInfra.distributiveLattice:witness" as const,
    carrier: system.labels,
    lattice: latticeJudgment,
    meetJoinDistributes: true as const,
  });
}

const subsetMembers = (size: number, mask: number): readonly number[] => Object.freeze(
  Array.from({ length: size }, (_, index) => index).filter((index) => (mask & (1 << index)) !== 0),
);

const isUpperBound = (system: FinitePreorderSystem, subset: readonly number[], candidate: number): boolean =>
  subset.every((member) => leAt(system, member, candidate));

const isLowerBound = (system: FinitePreorderSystem, subset: readonly number[], candidate: number): boolean =>
  subset.every((member) => leAt(system, candidate, member));

const leastElements = (system: FinitePreorderSystem, candidates: readonly number[]): readonly number[] =>
  Object.freeze(candidates.filter((candidate) => candidates.every((other) => leAt(system, candidate, other))));

const greatestElements = (system: FinitePreorderSystem, candidates: readonly number[]): readonly number[] =>
  Object.freeze(candidates.filter((candidate) => candidates.every((other) => leAt(system, other, candidate))));

export interface CompleteLatticeWitness {
  readonly kind: "orderInfra.completeLattice:witness";
  readonly carrier: readonly string[];
  readonly subsetsChecked: number;
  readonly top: number;
  readonly topLabel: string;
  readonly bot: number;
  readonly botLabel: string;
  readonly partialOrder: PartialOrderWitness;
}

export interface CompleteLatticeObstruction {
  readonly kind: "orderInfra.completeLattice-obstruction";
  readonly reason: "size" | "partialOrder" | "supremum" | "infimum";
  readonly maxSize?: number;
  readonly partialOrder?: PartialOrderObstruction;
  readonly subset?: readonly number[];
  readonly subsetLabels?: readonly string[];
  readonly candidates?: readonly number[];
  readonly candidateLabels?: readonly string[];
}

export type CompleteLatticeJudgment = CompleteLatticeWitness | CompleteLatticeObstruction;

/** Finite complete-lattice check: every finite subset has a unique lub and glb. */
export function completeLattice(system: FinitePreorderSystem, maxSize = 20): CompleteLatticeJudgment {
  if (system.labels.length > maxSize) {
    return Object.freeze({
      kind: "orderInfra.completeLattice-obstruction" as const,
      reason: "size" as const,
      maxSize,
    });
  }
  const partial = partialOrder(system);
  if (partial.kind !== "orderInfra.partialOrder:witness") {
    return Object.freeze({
      kind: "orderInfra.completeLattice-obstruction" as const,
      reason: "partialOrder" as const,
      partialOrder: partial,
    });
  }

  const carrier = Array.from({ length: system.labels.length }, (_, index) => index);
  const subsetCount = 2 ** system.labels.length;
  let top = -1;
  let bot = -1;
  for (let mask = 0; mask < subsetCount; mask += 1) {
    const subset = subsetMembers(system.labels.length, mask);
    const upperBounds = carrier.filter((candidate) => isUpperBound(system, subset, candidate));
    const lubs = leastElements(system, upperBounds);
    if (lubs.length !== 1) {
      return Object.freeze({
        kind: "orderInfra.completeLattice-obstruction" as const,
        reason: "supremum" as const,
        subset,
        subsetLabels: Object.freeze(subset.map((index) => system.labels[index] as string)),
        candidates: lubs,
        candidateLabels: Object.freeze(lubs.map((index) => system.labels[index] as string)),
      });
    }
    const lowerBounds = carrier.filter((candidate) => isLowerBound(system, subset, candidate));
    const glbs = greatestElements(system, lowerBounds);
    if (glbs.length !== 1) {
      return Object.freeze({
        kind: "orderInfra.completeLattice-obstruction" as const,
        reason: "infimum" as const,
        subset,
        subsetLabels: Object.freeze(subset.map((index) => system.labels[index] as string)),
        candidates: glbs,
        candidateLabels: Object.freeze(glbs.map((index) => system.labels[index] as string)),
      });
    }
    if (subset.length === 0) {
      bot = lubs[0] as number;
      top = glbs[0] as number;
    }
  }

  return Object.freeze({
    kind: "orderInfra.completeLattice:witness" as const,
    carrier: system.labels,
    subsetsChecked: subsetCount,
    top,
    topLabel: system.labels[top] as string,
    bot,
    botLabel: system.labels[bot] as string,
    partialOrder: partial,
  });
}

export const booleanLatticeSystem: FiniteLatticeSystem = finiteLatticeSystem(
  ["false", "true"],
  [
    [0, 0],
    [0, 1],
  ],
  [
    [0, 1],
    [1, 1],
  ],
);

export const booleanOrderSystem: FinitePreorderSystem = latticeOrder(booleanLatticeSystem);
