/**
 * analysis/jeandel-rao-witness - finite Jeandel-Rao AP cohomology witnesses.
 *
 * This is the executable finite shadow of:
 * - RelMath.Aperiodic.Witness.JeandelRao
 * - RelMath.Aperiodic.Witness.JeandelRaoSubstitution
 * - RelMath.Aperiodic.Witness.JeandelRaoSubstitutionTower
 * - RelMath.Aperiodic.Witness.JeandelRaoPersistence
 *
 * It models the one-vertex Anderson-Putnam cochain complexes from the Lean
 * module, checks the degree-1 coboundary, packages the two nonzero H1 witness
 * cochains, and transcribes the finite marker-domino pullback/tower receipts.
 * It does not claim Jeandel-Rao aperiodicity or identify the finite tower map
 * with the literal Labbe recognizable substitution matrix.
 */
import {
  count,
  fromNatural,
  intNegate,
  intZero,
  magnitude,
  monus,
  natEqual,
  rank,
  sign,
  successor,
  type Matrix,
  type Integer,
  type Natural,
} from "./exact-number.mjs";

export interface OneVertexComplex {
  readonly kind: "jeandelRao.oneVertexComplex";
  readonly name: string;
  readonly edges: readonly string[];
  readonly faces: readonly string[];
  readonly d2: Matrix;
  readonly h1RankClaim?: Natural;
}

export interface Cochain {
  readonly kind: "jeandelRao.cochain";
  readonly complex: string;
  readonly values: Readonly<Record<string, number>>;
}

export interface NonzeroH1Witness {
  readonly kind: "jeandelRao.nonzeroH1:witness";
  readonly theorem:
    | "RelMath.Aperiodic.Witness.jeandelRaoMarker01_nonzero_h1_shadow"
    | "RelMath.Aperiodic.Witness.markerRing_b3_nonzero_h1_shadow";
  readonly complex: OneVertexComplex;
  readonly cochain: Cochain;
  readonly delta1: readonly number[];
  readonly isCocycle: true;
  readonly nonzeroEdge: string;
  readonly nonzeroValue: number;
  readonly delta0Vanishes: true;
  readonly h1Rank: Natural;
  readonly h1RankMatchesLeanClaim: boolean;
  readonly representsNonzeroH1: true;
  readonly scopeBoundary:
    "finite local AP witness only; no Jeandel-Rao aperiodicity or direct-limit persistence";
}

export interface JeandelRaoWitnessReceipt {
  readonly kind: "jeandelRao.receipt:witness";
  readonly decoratedPhi: NonzeroH1Witness;
  readonly markerRingB3: NonzeroH1Witness;
  readonly decoratedPullbackBoundary:
    "phi is the pullback of b3 along the transcribed marker-domino chain map";
  readonly persistenceBoundary:
    "finite substitution tower persists b3; literal Labbe matrix identification remains residual";
  readonly substitutionPullback: SubstitutionPullbackReceipt;
  readonly substitutionTower: SubstitutionTowerReceipt;
  readonly persistence: JeandelRaoPersistenceReceipt;
}

export interface SubstitutionPullbackReceipt {
  readonly kind: "jeandelRao.receipt:substitutionPullback";
  readonly theorem: "RelMath.Aperiodic.Witness.jr_substitution_pullback";
  readonly subEdge: Readonly<Record<string, string>>;
  readonly subFace: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly pulledBackB3: Cochain;
  readonly equalsPhi: true;
  readonly chainMapRows: readonly ChainMapRow[];
  readonly cocyclePreserved: true;
  readonly nonzeroEdge: string;
}

export interface ChainMapRow {
  readonly face: string;
  readonly jrDelta: number;
  readonly negativeMarkerG3Delta: number;
  readonly holds: true;
}

export interface SubstitutionTowerReceipt {
  readonly kind: "jeandelRao.receipt:substitutionTower";
  readonly theorem: "RelMath.Aperiodic.Witness.jr_substitution_tower";
  readonly recEdge: Readonly<Record<string, string>>;
  readonly returnedPhi: Cochain;
  readonly recPullPhiEqualsB3: true;
  readonly sigmaB3: Cochain;
  readonly sigmaB3EqualsB3: true;
  readonly iteratesChecked: readonly Cochain[];
  readonly everyCheckedIterateEqualsB3: true;
  readonly b3NonzeroInDirectLimit: true;
  readonly residualScope:
    "identifying sigma with the literal Labbe recognizable substitution matrix is not claimed";
}

export interface JeandelRaoPersistenceReceipt {
  readonly kind: "jeandelRao.receipt:persistence";
  readonly sourceModule: "RelMath.Aperiodic.Witness.JeandelRaoPersistence";
  readonly theorem: "RelMath.Aperiodic.Witness.jeandel_rao_persistence";
  readonly base: NonzeroH1Witness;
  readonly decoratedSigmaPhi: Cochain;
  readonly decoratedSigmaPhiEqualsPhi: true;
  readonly checkedThrough: number;
  readonly iteratesChecked: readonly Cochain[];
  readonly everyCheckedIterateEqualsPhi: true;
  readonly nonzeroAtEveryIterateByFixedPoint: true;
  readonly frontierBoundary:
    "finite decorated endomap fixes phi; the Lean frontier remains the literal marker-domino substitution endomorphism preserving nonzero H1 in the full AP direct limit";
}

const assertSafeInteger = (value: number, label: string): void => {
  if (!Number.isSafeInteger(value)) throw new RangeError(`${label}: expected a safe integer`);
};

const natFromNumber = (value: number): Natural => {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError("jeandelRao: expected a safe natural");
  let n: Natural = count([]);
  for (let i = 0; i < value; i += 1) n = successor(n);
  return n;
};

const intFromNumber = (value: number): Integer => {
  assertSafeInteger(value, "jeandelRao.integer");
  if (value === 0) return intZero;
  const magnitudeValue = fromNatural(natFromNumber(Math.abs(value)));
  return value < 0 ? intNegate(magnitudeValue) : magnitudeValue;
};

const exactRow = (values: readonly number[]): readonly Integer[] => Object.freeze(values.map(intFromNumber));

const intToNumber = (value: Integer): number => sign(value) * magnitude(value).members.length;

const assertComplexShape = (complex: OneVertexComplex): void => {
  if (complex.d2.length !== complex.faces.length) {
    throw new TypeError("jeandelRao: d2 must have one row per face");
  }
  for (const row of complex.d2) {
    if (row.length !== complex.edges.length) {
      throw new TypeError("jeandelRao: each d2 row must have one column per edge");
    }
  }
};

const valueAt = (cochain: Cochain, edge: string): number => {
  const value = cochain.values[edge] ?? 0;
  assertSafeInteger(value, `jeandelRao.${cochain.complex}.${edge}`);
  return value;
};

const valuesFor = (complex: OneVertexComplex, read: (edge: string) => number): Readonly<Record<string, number>> => {
  const values: Record<string, number> = {};
  for (const edge of complex.edges) {
    const value = read(edge);
    assertSafeInteger(value, `jeandelRao.valuesFor.${edge}`);
    if (value !== 0) values[edge] = value;
  }
  return Object.freeze(values);
};

const cochain = (complex: OneVertexComplex, values: Readonly<Record<string, number>>): Cochain => Object.freeze({
  kind: "jeandelRao.cochain" as const,
  complex: complex.name,
  values,
});

const cochainEquals = (complex: OneVertexComplex, left: Cochain, right: Cochain): boolean => {
  if (left.complex !== complex.name || right.complex !== complex.name) return false;
  return complex.edges.every((edge) => valueAt(left, edge) === valueAt(right, edge));
};

/** The decorated marker-domino witness complex `jrComplex`. */
export const jrComplex: OneVertexComplex = Object.freeze({
  kind: "jeandelRao.oneVertexComplex" as const,
  name: "jrComplex",
  edges: Object.freeze(["e0", "e1", "e2", "e3", "e4", "e5"]),
  faces: Object.freeze(["f0", "f1", "f2"]),
  d2: Object.freeze([
    exactRow([1, -1, 1, -1, 0, 0]),
    exactRow([0, 0, 1, -1, 1, -1]),
    exactRow([0, 0, 1, -1, 1, -1]),
  ]),
});

/** The decorated cochain `phi`, supported on `e2` and `e3`. */
export const phi: Cochain = Object.freeze({
  kind: "jeandelRao.cochain" as const,
  complex: jrComplex.name,
  values: Object.freeze({ e2: 1, e3: 1 }),
});

/** The marker-ring quotient complex. */
export const markerRingComplex: OneVertexComplex = Object.freeze({
  kind: "jeandelRao.oneVertexComplex" as const,
  name: "markerRingComplex",
  edges: Object.freeze(["q0", "q1", "q2", "q3", "q4", "q5", "q6"]),
  faces: Object.freeze(["g0", "g1", "g2", "g3"]),
  d2: Object.freeze([
    exactRow([0, 1, -1, 0, 0, 0, 0]),
    exactRow([0, 0, 0, 0, 0, 0, 0]),
    exactRow([0, 0, 1, 0, 0, -1, 0]),
    exactRow([0, -1, 0, 0, 0, 1, 0]),
  ]),
  h1RankClaim: count([0, 1, 2, 3, 4]),
});

/** The isolated marker-ring class `b3 = q1 + q2 + q5`. */
export const b3: Cochain = Object.freeze({
  kind: "jeandelRao.cochain" as const,
  complex: markerRingComplex.name,
  values: Object.freeze({ q1: 1, q2: 1, q5: 1 }),
});

/** The marker-domino substitution on 1-cells, `jrComplex -> markerRingComplex`. */
export const subEdge: Readonly<Record<string, string>> = Object.freeze({
  e0: "q0",
  e1: "q0",
  e2: "q1",
  e3: "q5",
  e4: "q0",
  e5: "q0",
});

/** The substitution sends every witness face to the integer 2-chain `-g3`. */
export const subFace: Readonly<Record<string, Readonly<Record<string, number>>>> = Object.freeze(Object.fromEntries(
  jrComplex.faces.map((face) => [face, Object.freeze({ g3: -1 })]),
));

/** The recognizability return on 1-cells, `markerRingComplex -> jrComplex`. */
export const recEdge: Readonly<Record<string, string>> = Object.freeze({
  q0: "e0",
  q1: "e2",
  q2: "e2",
  q3: "e0",
  q4: "e0",
  q5: "e2",
  q6: "e0",
});

/** The degree-1 coboundary `delta1(cochain)(face) = sum_e d2(face,e) * cochain(e)`. */
export function delta1(complex: OneVertexComplex, cochain: Cochain): readonly number[] {
  assertComplexShape(complex);
  if (cochain.complex !== complex.name) {
    throw new TypeError("jeandelRao.delta1: cochain belongs to a different complex");
  }
  return Object.freeze(complex.d2.map((row) => {
    let total = 0;
    row.forEach((coefficient, index) => {
      total += intToNumber(coefficient) * valueAt(cochain, complex.edges[index]!);
    });
    assertSafeInteger(total, "jeandelRao.delta1");
    return total;
  }));
}

export function isCocycle(complex: OneVertexComplex, cochain: Cochain): boolean {
  return delta1(complex, cochain).every((value) => value === 0);
}

export function nonzeroSupport(complex: OneVertexComplex, cochain: Cochain): readonly string[] {
  if (cochain.complex !== complex.name) {
    throw new TypeError("jeandelRao.nonzeroSupport: cochain belongs to a different complex");
  }
  return Object.freeze(complex.edges.filter((edge) => valueAt(cochain, edge) !== 0));
}

/** Since the AP complexes are one-vertex, `delta0 = 0`; H1 rank is `|edges| - rank(delta1)`. */
export function h1Rank(complex: OneVertexComplex): Natural {
  assertComplexShape(complex);
  return monus(count(complex.edges), rank(complex.d2));
}

/** Pull a marker-ring cochain back to the decorated witness complex along `subEdge`. */
export function subPull(markerCochain: Cochain): Cochain {
  if (markerCochain.complex !== markerRingComplex.name) {
    throw new TypeError("jeandelRao.subPull: expected a markerRingComplex cochain");
  }
  return cochain(jrComplex, valuesFor(jrComplex, (edge) => valueAt(markerCochain, subEdge[edge] ?? "")));
}

/** Pull a decorated witness cochain back to the marker-ring complex along `recEdge`. */
export function recPull(decoratedCochain: Cochain): Cochain {
  if (decoratedCochain.complex !== jrComplex.name) {
    throw new TypeError("jeandelRao.recPull: expected a jrComplex cochain");
  }
  return cochain(markerRingComplex, valuesFor(markerRingComplex, (edge) => valueAt(decoratedCochain, recEdge[edge] ?? "")));
}

/** The substitution endomorphism `sigma = recPull . subPull` on marker-ring cochains. */
export function sigma(markerCochain: Cochain): Cochain {
  return recPull(subPull(markerCochain));
}

/** The decorated substitution endomorphism `subPull . recPull` on JR cochains. */
export function decoratedSigma(decoratedCochain: Cochain): Cochain {
  return subPull(recPull(decoratedCochain));
}

export function sigmaIter(iterations: number, markerCochain: Cochain): Cochain {
  if (!Number.isSafeInteger(iterations) || iterations < 0) {
    throw new RangeError("jeandelRao.sigmaIter: expected a safe natural iteration count");
  }
  let current = markerCochain;
  for (let i = 0; i < iterations; i += 1) current = sigma(current);
  return current;
}

export function decoratedSigmaIter(iterations: number, decoratedCochain: Cochain): Cochain {
  if (!Number.isSafeInteger(iterations) || iterations < 0) {
    throw new RangeError("jeandelRao.decoratedSigmaIter: expected a safe natural iteration count");
  }
  let current = decoratedCochain;
  for (let i = 0; i < iterations; i += 1) current = decoratedSigma(current);
  return current;
}

export function chainMapRows(markerCochain: Cochain): readonly ChainMapRow[] {
  if (markerCochain.complex !== markerRingComplex.name) {
    throw new TypeError("jeandelRao.chainMapRows: expected a markerRingComplex cochain");
  }
  const pulled = subPull(markerCochain);
  const jrBoundary = delta1(jrComplex, pulled);
  const markerBoundary = delta1(markerRingComplex, markerCochain);
  const g3Index = markerRingComplex.faces.indexOf("g3");
  const rawNegativeG3 = -markerBoundary[g3Index]!;
  const negativeG3 = Object.is(rawNegativeG3, -0) ? 0 : rawNegativeG3;
  return Object.freeze(jrComplex.faces.map((face, index) => {
    const jrDelta = jrBoundary[index]!;
    if (jrDelta !== negativeG3) {
      throw new TypeError("jeandelRao.chainMapRows: substitution square failed");
    }
    return Object.freeze({
      face,
      jrDelta,
      negativeMarkerG3Delta: negativeG3,
      holds: true as const,
    });
  }));
}

export function nonzeroH1Witness(
  theorem: NonzeroH1Witness["theorem"],
  complex: OneVertexComplex,
  cochain: Cochain,
): NonzeroH1Witness {
  const boundary = delta1(complex, cochain);
  if (!boundary.every((value) => value === 0)) {
    throw new TypeError("jeandelRao.nonzeroH1Witness: cochain is not closed");
  }
  const support = nonzeroSupport(complex, cochain);
  const nonzeroEdge = support[0];
  if (nonzeroEdge === undefined) {
    throw new TypeError("jeandelRao.nonzeroH1Witness: cochain is zero");
  }
  const rankValue = h1Rank(complex);
  return Object.freeze({
    kind: "jeandelRao.nonzeroH1:witness" as const,
    theorem,
    complex,
    cochain,
    delta1: boundary,
    isCocycle: true as const,
    nonzeroEdge,
    nonzeroValue: valueAt(cochain, nonzeroEdge),
    delta0Vanishes: true as const,
    h1Rank: rankValue,
    h1RankMatchesLeanClaim: complex.h1RankClaim === undefined ? true : natEqual(rankValue, complex.h1RankClaim),
    representsNonzeroH1: true as const,
    scopeBoundary: "finite local AP witness only; no Jeandel-Rao aperiodicity or direct-limit persistence" as const,
  });
}

export function decoratedPhiWitness(): NonzeroH1Witness {
  return nonzeroH1Witness(
    "RelMath.Aperiodic.Witness.jeandelRaoMarker01_nonzero_h1_shadow",
    jrComplex,
    phi,
  );
}

export function markerRingB3Witness(): NonzeroH1Witness {
  return nonzeroH1Witness(
    "RelMath.Aperiodic.Witness.markerRing_b3_nonzero_h1_shadow",
    markerRingComplex,
    b3,
  );
}

export function substitutionPullbackReceipt(): SubstitutionPullbackReceipt {
  const pulledBackB3 = subPull(b3);
  if (!cochainEquals(jrComplex, pulledBackB3, phi)) {
    throw new TypeError("jeandelRao.substitutionPullbackReceipt: subPull b3 must equal phi");
  }
  if (!isCocycle(jrComplex, pulledBackB3)) {
    throw new TypeError("jeandelRao.substitutionPullbackReceipt: pulled cochain must be closed");
  }
  return Object.freeze({
    kind: "jeandelRao.receipt:substitutionPullback" as const,
    theorem: "RelMath.Aperiodic.Witness.jr_substitution_pullback" as const,
    subEdge,
    subFace,
    pulledBackB3,
    equalsPhi: true as const,
    chainMapRows: chainMapRows(b3),
    cocyclePreserved: true as const,
    nonzeroEdge: nonzeroSupport(jrComplex, pulledBackB3)[0]!,
  });
}

export function substitutionTowerReceipt(iterations = 4): SubstitutionTowerReceipt {
  const returnedPhi = recPull(phi);
  const sigmaB3 = sigma(b3);
  const iteratesChecked = Object.freeze(Array.from({ length: iterations + 1 }, (_, index) => sigmaIter(index, b3)));
  if (!cochainEquals(markerRingComplex, returnedPhi, b3)) {
    throw new TypeError("jeandelRao.substitutionTowerReceipt: recPull phi must equal b3");
  }
  if (!cochainEquals(markerRingComplex, sigmaB3, b3)) {
    throw new TypeError("jeandelRao.substitutionTowerReceipt: sigma b3 must equal b3");
  }
  if (!iteratesChecked.every((iterated) => cochainEquals(markerRingComplex, iterated, b3))) {
    throw new TypeError("jeandelRao.substitutionTowerReceipt: every checked iterate must fix b3");
  }
  if (nonzeroSupport(markerRingComplex, b3).length === 0) {
    throw new TypeError("jeandelRao.substitutionTowerReceipt: b3 must be nonzero");
  }
  return Object.freeze({
    kind: "jeandelRao.receipt:substitutionTower" as const,
    theorem: "RelMath.Aperiodic.Witness.jr_substitution_tower" as const,
    recEdge,
    returnedPhi,
    recPullPhiEqualsB3: true as const,
    sigmaB3,
    sigmaB3EqualsB3: true as const,
    iteratesChecked,
    everyCheckedIterateEqualsB3: true as const,
    b3NonzeroInDirectLimit: true as const,
    residualScope: "identifying sigma with the literal Labbe recognizable substitution matrix is not claimed" as const,
  });
}

export function persistenceReceipt(iterations = 4): JeandelRaoPersistenceReceipt {
  if (!Number.isSafeInteger(iterations) || iterations < 0) {
    throw new RangeError("jeandelRao.persistenceReceipt: expected a safe natural iteration count");
  }
  const base = decoratedPhiWitness();
  const decoratedSigmaPhi = decoratedSigma(phi);
  const iteratesChecked = Object.freeze(Array.from({ length: iterations + 1 }, (_, index) => decoratedSigmaIter(index, phi)));
  if (!cochainEquals(jrComplex, decoratedSigmaPhi, phi)) {
    throw new TypeError("jeandelRao.persistenceReceipt: decorated sigma must fix phi");
  }
  if (!iteratesChecked.every((iterated) => cochainEquals(jrComplex, iterated, phi))) {
    throw new TypeError("jeandelRao.persistenceReceipt: every checked iterate must fix phi");
  }
  if (!iteratesChecked.every((iterated) => isCocycle(jrComplex, iterated) && nonzeroSupport(jrComplex, iterated).length > 0)) {
    throw new TypeError("jeandelRao.persistenceReceipt: every checked iterate must be a nonzero H1 representative");
  }
  return Object.freeze({
    kind: "jeandelRao.receipt:persistence" as const,
    sourceModule: "RelMath.Aperiodic.Witness.JeandelRaoPersistence" as const,
    theorem: "RelMath.Aperiodic.Witness.jeandel_rao_persistence" as const,
    base,
    decoratedSigmaPhi,
    decoratedSigmaPhiEqualsPhi: true as const,
    checkedThrough: iterations,
    iteratesChecked,
    everyCheckedIterateEqualsPhi: true as const,
    nonzeroAtEveryIterateByFixedPoint: true as const,
    frontierBoundary: "finite decorated endomap fixes phi; the Lean frontier remains the literal marker-domino substitution endomorphism preserving nonzero H1 in the full AP direct limit" as const,
  });
}

export function receipt(): JeandelRaoWitnessReceipt {
  return Object.freeze({
    kind: "jeandelRao.receipt:witness" as const,
    decoratedPhi: decoratedPhiWitness(),
    markerRingB3: markerRingB3Witness(),
    decoratedPullbackBoundary: "phi is the pullback of b3 along the transcribed marker-domino chain map" as const,
    persistenceBoundary: "finite substitution tower persists b3; literal Labbe matrix identification remains residual" as const,
    substitutionPullback: substitutionPullbackReceipt(),
    substitutionTower: substitutionTowerReceipt(),
    persistence: persistenceReceipt(),
  });
}
