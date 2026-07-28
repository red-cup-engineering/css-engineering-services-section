/**
 * analysis/algebra-hierarchy - finite executable shadow of
 * RelMath.Order.AlgebraHierarchy.
 *
 * Lean packages the algebra tower as structures and exhibits concrete shadows:
 * Boolean field F2, Klein-four group K4, and commutative monoids obtained from
 * lattice meet/join and residuated fusion. This module checks those finite
 * tables as carrier-shaped receipts.
 */
import {
  gauge,
  gaugeElementNames,
  chargeValue,
  chargeValueNames,
  sameChargeValue,
  type ChargeValueName,
  type GaugeElementName,
} from "../../bilattice-charge.mjs";
import {
  booleanLatticeSystem,
} from "./order-infra.mjs";
import {
  twoBooleanResiduatedLattice,
} from "./residuated-lattice.mjs";

const assertIndex = (name: string, value: number, length: number): void => {
  if (!Number.isSafeInteger(value) || value < 0 || value >= length) {
    throw new RangeError(`${name}: expected an index into the carrier`);
  }
};

const requireBinaryTable = (name: string, table: readonly (readonly number[])[], size: number): void => {
  if (table.length !== size) throw new RangeError(`${name}: row count must match carrier size`);
  table.forEach((row, left) => {
    if (row.length !== size) throw new RangeError(`${name}: table must be square`);
    row.forEach((target, right) => assertIndex(`${name}[${left}][${right}]`, target, size));
  });
};

const freezeTable = (table: readonly (readonly number[])[]): readonly (readonly number[])[] =>
  Object.freeze(table.map((row) => Object.freeze([...row])));

export interface FiniteBinaryAlgebra {
  readonly kind: "algebraHierarchy.finiteBinaryAlgebra";
  readonly labels: readonly string[];
  readonly op: readonly (readonly number[])[];
}

export function finiteBinaryAlgebra(labels: readonly string[], op: readonly (readonly number[])[]): FiniteBinaryAlgebra {
  if (labels.length === 0) throw new RangeError("finiteBinaryAlgebra: carrier must be nonempty");
  requireBinaryTable("finiteBinaryAlgebra op", op, labels.length);
  return Object.freeze({
    kind: "algebraHierarchy.finiteBinaryAlgebra" as const,
    labels: Object.freeze([...labels]),
    op: freezeTable(op),
  });
}

const opAt = (algebra: FiniteBinaryAlgebra, left: number, right: number): number => algebra.op[left]?.[right] as number;

export interface CommutativeMonoidWitness {
  readonly kind: "algebraHierarchy.commutativeMonoid:witness";
  readonly carrier: readonly string[];
  readonly one: number;
  readonly oneLabel: string;
  readonly associative: true;
  readonly leftIdentity: true;
  readonly rightIdentity: true;
  readonly commutative: true;
  readonly identityUnique: true;
}

export interface AlgebraObstruction {
  readonly kind: "algebraHierarchy.obstruction";
  readonly law:
    | "assoc"
    | "leftIdentity"
    | "rightIdentity"
    | "comm"
    | "identityUnique"
    | "leftInverse"
    | "rightInverse"
    | "leftCancel"
    | "addAssoc"
    | "addComm"
    | "addZero"
    | "zeroAdd"
    | "mulAssoc"
    | "oneMul"
    | "mulOne"
    | "leftDistrib"
    | "rightDistrib"
    | "zeroMul"
    | "mulZero"
    | "addLeftNeg"
    | "mulComm"
    | "mulInvCancel"
    | "invZero"
    | "zeroNeOne";
  readonly indices?: readonly number[];
  readonly labels?: readonly string[];
  readonly left?: number | undefined;
  readonly right?: number | undefined;
}

export type CommutativeMonoidJudgment = CommutativeMonoidWitness | AlgebraObstruction;

const obstruction = (
  law: AlgebraObstruction["law"],
  labels: readonly string[],
  indices: readonly number[],
  left?: number,
  right?: number,
): AlgebraObstruction => Object.freeze({
  kind: "algebraHierarchy.obstruction" as const,
  law,
  indices: Object.freeze([...indices]),
  labels: Object.freeze(indices.map((index) => labels[index] as string)),
  left,
  right,
});

export function commutativeMonoid(algebra: FiniteBinaryAlgebra, one: number): CommutativeMonoidJudgment {
  assertIndex("commutativeMonoid one", one, algebra.labels.length);
  const size = algebra.labels.length;
  for (let a = 0; a < size; a += 1) {
    if (opAt(algebra, one, a) !== a) return obstruction("leftIdentity", algebra.labels, [one, a], opAt(algebra, one, a), a);
    if (opAt(algebra, a, one) !== a) return obstruction("rightIdentity", algebra.labels, [a, one], opAt(algebra, a, one), a);
    for (let b = 0; b < size; b += 1) {
      if (opAt(algebra, a, b) !== opAt(algebra, b, a)) return obstruction("comm", algebra.labels, [a, b], opAt(algebra, a, b), opAt(algebra, b, a));
      for (let c = 0; c < size; c += 1) {
        if (opAt(algebra, opAt(algebra, a, b), c) !== opAt(algebra, a, opAt(algebra, b, c))) {
          return obstruction("assoc", algebra.labels, [a, b, c], opAt(algebra, opAt(algebra, a, b), c), opAt(algebra, a, opAt(algebra, b, c)));
        }
      }
    }
  }
  for (let candidate = 0; candidate < size; candidate += 1) {
    const twoSided = Array.from({ length: size }, (_, point) =>
      opAt(algebra, candidate, point) === point && opAt(algebra, point, candidate) === point,
    ).every(Boolean);
    if (twoSided && candidate !== one) return obstruction("identityUnique", algebra.labels, [candidate, one], candidate, one);
  }
  return Object.freeze({
    kind: "algebraHierarchy.commutativeMonoid:witness" as const,
    carrier: algebra.labels,
    one,
    oneLabel: algebra.labels[one] as string,
    associative: true as const,
    leftIdentity: true as const,
    rightIdentity: true as const,
    commutative: true as const,
    identityUnique: true as const,
  });
}

export interface AbelianGroupWitness {
  readonly kind: "algebraHierarchy.abelianGroup:witness";
  readonly carrier: readonly string[];
  readonly one: number;
  readonly oneLabel: string;
  readonly associative: true;
  readonly leftIdentity: true;
  readonly rightIdentity: true;
  readonly commutative: true;
  readonly identityUnique: true;
  readonly inverses: readonly number[];
  readonly leftInverse: true;
  readonly rightInverse: true;
  readonly leftCancel: true;
}

export type AbelianGroupJudgment = AbelianGroupWitness | AlgebraObstruction;

export function abelianGroup(algebra: FiniteBinaryAlgebra, one: number, inverses: readonly number[]): AbelianGroupJudgment {
  if (inverses.length !== algebra.labels.length) throw new RangeError("abelianGroup: inverse table length must match carrier size");
  inverses.forEach((inverse, index) => assertIndex(`abelianGroup inverses[${index}]`, inverse, algebra.labels.length));
  const monoid = commutativeMonoid(algebra, one);
  if (monoid.kind !== "algebraHierarchy.commutativeMonoid:witness") return monoid;
  const size = algebra.labels.length;
  for (let a = 0; a < size; a += 1) {
    const inv = inverses[a] as number;
    if (opAt(algebra, inv, a) !== one) return obstruction("leftInverse", algebra.labels, [inv, a, one], opAt(algebra, inv, a), one);
    if (opAt(algebra, a, inv) !== one) return obstruction("rightInverse", algebra.labels, [a, inv, one], opAt(algebra, a, inv), one);
    for (let b = 0; b < size; b += 1) {
      for (let c = 0; c < size; c += 1) {
        if (opAt(algebra, a, b) === opAt(algebra, a, c) && b !== c) {
          return obstruction("leftCancel", algebra.labels, [a, b, c], b, c);
        }
      }
    }
  }
  return Object.freeze({
    ...monoid,
    kind: "algebraHierarchy.abelianGroup:witness" as const,
    inverses: Object.freeze([...inverses]),
    leftInverse: true as const,
    rightInverse: true as const,
    leftCancel: true as const,
  });
}

export interface FiniteFieldSystem {
  readonly kind: "algebraHierarchy.finiteFieldSystem";
  readonly labels: readonly string[];
  readonly add: readonly (readonly number[])[];
  readonly mul: readonly (readonly number[])[];
  readonly zero: number;
  readonly one: number;
  readonly neg: readonly number[];
  readonly inv: readonly number[];
}

export function finiteFieldSystem(
  labels: readonly string[],
  add: readonly (readonly number[])[],
  mul: readonly (readonly number[])[],
  zero: number,
  one: number,
  neg: readonly number[],
  inv: readonly number[],
): FiniteFieldSystem {
  if (labels.length === 0) throw new RangeError("finiteFieldSystem: carrier must be nonempty");
  requireBinaryTable("finiteFieldSystem add", add, labels.length);
  requireBinaryTable("finiteFieldSystem mul", mul, labels.length);
  assertIndex("finiteFieldSystem zero", zero, labels.length);
  assertIndex("finiteFieldSystem one", one, labels.length);
  if (neg.length !== labels.length || inv.length !== labels.length) throw new RangeError("finiteFieldSystem: neg/inv length must match carrier size");
  neg.forEach((target, index) => assertIndex(`finiteFieldSystem neg[${index}]`, target, labels.length));
  inv.forEach((target, index) => assertIndex(`finiteFieldSystem inv[${index}]`, target, labels.length));
  return Object.freeze({
    kind: "algebraHierarchy.finiteFieldSystem" as const,
    labels: Object.freeze([...labels]),
    add: freezeTable(add),
    mul: freezeTable(mul),
    zero,
    one,
    neg: Object.freeze([...neg]),
    inv: Object.freeze([...inv]),
  });
}

const addAt = (field: FiniteFieldSystem, left: number, right: number): number => field.add[left]?.[right] as number;
const mulAt = (field: FiniteFieldSystem, left: number, right: number): number => field.mul[left]?.[right] as number;

export interface FieldWitness {
  readonly kind: "algebraHierarchy.field:witness";
  readonly carrier: readonly string[];
  readonly zero: number;
  readonly zeroLabel: string;
  readonly one: number;
  readonly oneLabel: string;
  readonly additiveGroup: true;
  readonly multiplicativeMonoid: true;
  readonly distributive: true;
  readonly zeroAnnihilates: true;
  readonly additiveInverses: true;
  readonly multiplicativeCommutative: true;
  readonly multiplicativeInverses: true;
  readonly invZero: true;
  readonly zeroNeOne: true;
  readonly zeroUnique: true;
}

export type FieldJudgment = FieldWitness | AlgebraObstruction;

export function field(fieldSystem: FiniteFieldSystem): FieldJudgment {
  const size = fieldSystem.labels.length;
  if (fieldSystem.zero === fieldSystem.one) return obstruction("zeroNeOne", fieldSystem.labels, [fieldSystem.zero, fieldSystem.one], fieldSystem.zero, fieldSystem.one);
  for (let a = 0; a < size; a += 1) {
    if (addAt(fieldSystem, a, fieldSystem.zero) !== a) return obstruction("addZero", fieldSystem.labels, [a, fieldSystem.zero], addAt(fieldSystem, a, fieldSystem.zero), a);
    if (addAt(fieldSystem, fieldSystem.zero, a) !== a) return obstruction("zeroAdd", fieldSystem.labels, [fieldSystem.zero, a], addAt(fieldSystem, fieldSystem.zero, a), a);
    if (mulAt(fieldSystem, fieldSystem.one, a) !== a) return obstruction("oneMul", fieldSystem.labels, [fieldSystem.one, a], mulAt(fieldSystem, fieldSystem.one, a), a);
    if (mulAt(fieldSystem, a, fieldSystem.one) !== a) return obstruction("mulOne", fieldSystem.labels, [a, fieldSystem.one], mulAt(fieldSystem, a, fieldSystem.one), a);
    if (mulAt(fieldSystem, fieldSystem.zero, a) !== fieldSystem.zero) return obstruction("zeroMul", fieldSystem.labels, [fieldSystem.zero, a], mulAt(fieldSystem, fieldSystem.zero, a), fieldSystem.zero);
    if (mulAt(fieldSystem, a, fieldSystem.zero) !== fieldSystem.zero) return obstruction("mulZero", fieldSystem.labels, [a, fieldSystem.zero], mulAt(fieldSystem, a, fieldSystem.zero), fieldSystem.zero);
    if (addAt(fieldSystem, fieldSystem.neg[a] as number, a) !== fieldSystem.zero) return obstruction("addLeftNeg", fieldSystem.labels, [fieldSystem.neg[a] as number, a], addAt(fieldSystem, fieldSystem.neg[a] as number, a), fieldSystem.zero);
    if (a !== fieldSystem.zero && mulAt(fieldSystem, a, fieldSystem.inv[a] as number) !== fieldSystem.one) return obstruction("mulInvCancel", fieldSystem.labels, [a, fieldSystem.inv[a] as number], mulAt(fieldSystem, a, fieldSystem.inv[a] as number), fieldSystem.one);
    for (let b = 0; b < size; b += 1) {
      if (addAt(fieldSystem, a, b) !== addAt(fieldSystem, b, a)) return obstruction("addComm", fieldSystem.labels, [a, b], addAt(fieldSystem, a, b), addAt(fieldSystem, b, a));
      if (mulAt(fieldSystem, a, b) !== mulAt(fieldSystem, b, a)) return obstruction("mulComm", fieldSystem.labels, [a, b], mulAt(fieldSystem, a, b), mulAt(fieldSystem, b, a));
      for (let c = 0; c < size; c += 1) {
        if (addAt(fieldSystem, addAt(fieldSystem, a, b), c) !== addAt(fieldSystem, a, addAt(fieldSystem, b, c))) return obstruction("addAssoc", fieldSystem.labels, [a, b, c]);
        if (mulAt(fieldSystem, mulAt(fieldSystem, a, b), c) !== mulAt(fieldSystem, a, mulAt(fieldSystem, b, c))) return obstruction("mulAssoc", fieldSystem.labels, [a, b, c]);
        if (mulAt(fieldSystem, a, addAt(fieldSystem, b, c)) !== addAt(fieldSystem, mulAt(fieldSystem, a, b), mulAt(fieldSystem, a, c))) return obstruction("leftDistrib", fieldSystem.labels, [a, b, c]);
        if (mulAt(fieldSystem, addAt(fieldSystem, a, b), c) !== addAt(fieldSystem, mulAt(fieldSystem, a, c), mulAt(fieldSystem, b, c))) return obstruction("rightDistrib", fieldSystem.labels, [a, b, c]);
      }
    }
  }
  if (fieldSystem.inv[fieldSystem.zero] !== fieldSystem.zero) return obstruction("invZero", fieldSystem.labels, [fieldSystem.zero], fieldSystem.inv[fieldSystem.zero], fieldSystem.zero);
  return Object.freeze({
    kind: "algebraHierarchy.field:witness" as const,
    carrier: fieldSystem.labels,
    zero: fieldSystem.zero,
    zeroLabel: fieldSystem.labels[fieldSystem.zero] as string,
    one: fieldSystem.one,
    oneLabel: fieldSystem.labels[fieldSystem.one] as string,
    additiveGroup: true as const,
    multiplicativeMonoid: true as const,
    distributive: true as const,
    zeroAnnihilates: true as const,
    additiveInverses: true as const,
    multiplicativeCommutative: true as const,
    multiplicativeInverses: true as const,
    invZero: true as const,
    zeroNeOne: true as const,
    zeroUnique: true as const,
  });
}

const composeGauge = (left: GaugeElementName, right: GaugeElementName): GaugeElementName => {
  const images = chargeValueNames.map((name) => gauge(left, gauge(right, chargeValue(name))).name);
  const found = gaugeElementNames.find((candidate) =>
    chargeValueNames.every((name, index) => sameChargeValue(gauge(candidate, chargeValue(name)), chargeValue(images[index] as ChargeValueName))),
  );
  if (found === undefined) throw new TypeError("composeGauge: K4 composition left the gauge set");
  return found;
};

const indexByLabel = (labels: readonly string[], label: string): number => {
  const index = labels.indexOf(label);
  if (index < 0) throw new RangeError(`missing label: ${label}`);
  return index;
};

export const boolFieldSystem: FiniteFieldSystem = finiteFieldSystem(
  ["false", "true"],
  [
    [0, 1],
    [1, 0],
  ],
  [
    [0, 0],
    [0, 1],
  ],
  0,
  1,
  [0, 1],
  [0, 1],
);

export const kleinFourAlgebra: FiniteBinaryAlgebra = finiteBinaryAlgebra(
  gaugeElementNames,
  gaugeElementNames.map((left) => gaugeElementNames.map((right) => indexByLabel(gaugeElementNames, composeGauge(left, right)))),
);

export const booleanMeetMonoidAlgebra: FiniteBinaryAlgebra = finiteBinaryAlgebra(booleanLatticeSystem.labels, booleanLatticeSystem.meet);
export const booleanJoinMonoidAlgebra: FiniteBinaryAlgebra = finiteBinaryAlgebra(booleanLatticeSystem.labels, booleanLatticeSystem.join);
export const booleanFuseMonoidAlgebra: FiniteBinaryAlgebra = finiteBinaryAlgebra(twoBooleanResiduatedLattice.lattice.labels, twoBooleanResiduatedLattice.fuse);

export interface AlgebraHierarchyReceipt {
  readonly kind: "algebraHierarchy.receipt:witness";
  readonly boolField: FieldWitness;
  readonly kleinFourGroup: AbelianGroupWitness;
  readonly meetMonoid: CommutativeMonoidWitness;
  readonly joinMonoid: CommutativeMonoidWitness;
  readonly fuseMonoid: CommutativeMonoidWitness;
  readonly orderToAlgebraCollapse: true;
}

export type AlgebraHierarchyJudgment = AlgebraHierarchyReceipt | AlgebraObstruction;

/** Concrete finite receipt for the Lean AlgebraHierarchy worked examples. */
export function algebraHierarchy(): AlgebraHierarchyJudgment {
  const bool = field(boolFieldSystem);
  if (bool.kind !== "algebraHierarchy.field:witness") return bool;
  const k4 = abelianGroup(kleinFourAlgebra, indexByLabel(kleinFourAlgebra.labels, "id"), [0, 1, 2, 3]);
  if (k4.kind !== "algebraHierarchy.abelianGroup:witness") return k4;
  const meet = commutativeMonoid(booleanMeetMonoidAlgebra, 1);
  if (meet.kind !== "algebraHierarchy.commutativeMonoid:witness") return meet;
  const join = commutativeMonoid(booleanJoinMonoidAlgebra, 0);
  if (join.kind !== "algebraHierarchy.commutativeMonoid:witness") return join;
  const fuse = commutativeMonoid(booleanFuseMonoidAlgebra, 1);
  if (fuse.kind !== "algebraHierarchy.commutativeMonoid:witness") return fuse;
  return Object.freeze({
    kind: "algebraHierarchy.receipt:witness" as const,
    boolField: bool,
    kleinFourGroup: k4,
    meetMonoid: meet,
    joinMonoid: join,
    fuseMonoid: fuse,
    orderToAlgebraCollapse: true as const,
  });
}
