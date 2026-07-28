/**
 * analysis/quantale-enriched-sheaf - finite executable shadow of
 * RelMath.Cohomology.QuantaleEnrichedSheaf.
 *
 * Lean builds a commutative unital quantale on FOUR/Charge, Q-categories,
 * Q-functors, q-fuzzy equivalence composition, and the degree-0 enriched
 * Laplacian fixed-point witness. This module exposes the finite charge-quantale
 * instance and bounded Q-category/equivalence receipts.
 */
import {
  chargeValue,
  chargeValueName,
  chargeValueNames,
  joinKnowledgeValue,
  meetKnowledgeValue,
  type ChargeValueName,
} from "../../bilattice-charge.mjs";

export interface ChargeQuantaleReceipt {
  readonly kind: "quantaleEnrichedSheaf.chargeQuantale:witness";
  readonly carrier: readonly ChargeValueName[];
  readonly bottom: ChargeValueName;
  readonly top: ChargeValueName;
  readonly one: ChargeValueName;
  readonly multiplication: "knowledge-meet";
  readonly order: "knowledge";
  readonly leReflexive: true;
  readonly leTransitive: true;
  readonly leAntisymmetric: true;
  readonly supUpperBound: true;
  readonly supLeastUpperBound: true;
  readonly mulAssociative: true;
  readonly mulCommutative: true;
  readonly oneIsUnit: true;
  readonly mulDistributesOverSup: true;
  readonly mulMonotone: true;
}

export interface QCatCarrier {
  readonly kind: "quantaleEnrichedSheaf.qcat";
  readonly objects: readonly string[];
  readonly hom: Readonly<Record<string, ChargeValueName>>;
}

export interface QFunctorCarrier {
  readonly kind: "quantaleEnrichedSheaf.qfunctor";
  readonly sourceObjects: readonly string[];
  readonly targetObjects: readonly string[];
  readonly map: Readonly<Record<string, string>>;
  readonly preservesHomsUpward: true;
}

export interface QCategoryReceipt {
  readonly kind: "quantaleEnrichedSheaf.qcategory:witness";
  readonly oneObject: QCatCarrier;
  readonly discrete: QCatCarrier;
  readonly identityFunctor: QFunctorCarrier;
  readonly composedFunctor: QFunctorCarrier;
  readonly oneObjectReflexive: true;
  readonly oneObjectComposition: true;
  readonly discreteReflexive: true;
  readonly discreteComposition: true;
  readonly identityPreservesHoms: true;
  readonly compositionPreservesHoms: true;
}

export interface QFuzzyEquivalenceReceipt {
  readonly kind: "quantaleEnrichedSheaf.qFuzzyEquivalence:witness";
  readonly leftGrade: ChargeValueName;
  readonly rightGrade: ChargeValueName;
  readonly compositeGrade: ChargeValueName;
  readonly strictGrade: ChargeValueName;
  readonly compositionMultipliesGrade: true;
  readonly strictGradeReducesToRoundTripUnit: true;
  readonly roundTripBoundsHold: true;
}

export interface H0LaplacianReceipt {
  readonly kind: "quantaleEnrichedSheaf.h0Laplacian:witness";
  readonly weight: ChargeValueName;
  readonly fixedPoints: readonly ChargeValueName[];
  readonly laplacianTable: Readonly<Record<ChargeValueName, ChargeValueName>>;
  readonly laplacianIdempotent: true;
  readonly fixedPointsClosedUnderJoin: true;
}

export interface QuantaleEnrichedSheafReceipt {
  readonly kind: "quantaleEnrichedSheaf.receipt:witness";
  readonly quantale: ChargeQuantaleReceipt;
  readonly qcategory: QCategoryReceipt;
  readonly fuzzyEquivalence: QFuzzyEquivalenceReceipt;
  readonly h0: H0LaplacianReceipt;
  readonly openFrontier: readonly string[];
}

const values = chargeValueNames;

const value = (name: ChargeValueName) => chargeValue(name);
const nameOf = (name: ChargeValueName): ChargeValueName => chargeValueName(value(name));

export const mul = (left: ChargeValueName, right: ChargeValueName): ChargeValueName =>
  chargeValueName(meetKnowledgeValue(value(left), value(right)));

export const sup = (members: readonly ChargeValueName[]): ChargeValueName =>
  members.reduce((accumulator, member) =>
    chargeValueName(joinKnowledgeValue(value(accumulator), value(member))), "absurd" as ChargeValueName);

export const le = (left: ChargeValueName, right: ChargeValueName): boolean =>
  sup([left, right]) === right;

const subsets = <T,>(items: readonly T[]): readonly (readonly T[])[] => {
  const count = 2 ** items.length;
  return Object.freeze(Array.from({ length: count }, (_, maskValue) =>
    Object.freeze(items.filter((_, index) => (maskValue & (1 << index)) !== 0))));
};

const key = (from: string, to: string): string => `${from}->${to}`;

export function qcat(objects: readonly string[], hom: Readonly<Record<string, ChargeValueName>>): QCatCarrier {
  const obj = Object.freeze([...objects]);
  if (obj.length === 0) throw new TypeError("qcat: at least one object is required");
  for (const x of obj) {
    if (x.length === 0) throw new TypeError("qcat: object names must be nonempty");
    for (const y of obj) {
      const h = hom[key(x, y)];
      if (h === undefined) throw new TypeError(`qcat: missing hom ${key(x, y)}`);
      nameOf(h);
    }
  }
  return Object.freeze({ kind: "quantaleEnrichedSheaf.qcat" as const, objects: obj, hom: Object.freeze({ ...hom }) });
}

export function hom(cat: QCatCarrier, from: string, to: string): ChargeValueName {
  const h = cat.hom[key(from, to)];
  if (h === undefined) throw new TypeError(`hom: missing hom ${key(from, to)}`);
  return h;
}

export function qcatReflexive(cat: QCatCarrier): boolean {
  return cat.objects.every((x) => le("stable", hom(cat, x, x)));
}

export function qcatCompositional(cat: QCatCarrier): boolean {
  return cat.objects.every((x) => cat.objects.every((y) => cat.objects.every((z) =>
    le(mul(hom(cat, x, y), hom(cat, y, z)), hom(cat, x, z)))));
}

export function qfunctor(
  source: QCatCarrier,
  target: QCatCarrier,
  mapInput: Readonly<Record<string, string>>,
): QFunctorCarrier {
  for (const x of source.objects) {
    if (!target.objects.includes(mapInput[x] ?? "")) throw new TypeError(`qfunctor: ${x} maps outside target`);
  }
  const preserves = source.objects.every((x) => source.objects.every((y) =>
    le(hom(source, x, y), hom(target, mapInput[x] ?? "", mapInput[y] ?? ""))));
  if (!preserves) throw new TypeError("qfunctor: hom preservation failed");
  return Object.freeze({
    kind: "quantaleEnrichedSheaf.qfunctor" as const,
    sourceObjects: source.objects,
    targetObjects: target.objects,
    map: Object.freeze({ ...mapInput }),
    preservesHomsUpward: true as const,
  });
}

export function composeFunctor(
  source: QCatCarrier,
  middle: QCatCarrier,
  target: QCatCarrier,
  left: QFunctorCarrier,
  right: QFunctorCarrier,
): QFunctorCarrier {
  const mapInput: Record<string, string> = {};
  for (const x of source.objects) {
    const mid = right.map[x];
    if (mid === undefined || !middle.objects.includes(mid)) throw new TypeError("composeFunctor: right map mismatch");
    const out = left.map[mid];
    if (out === undefined || !target.objects.includes(out)) throw new TypeError("composeFunctor: left map mismatch");
    mapInput[x] = out;
  }
  return qfunctor(source, target, mapInput);
}

export function oneObjectQCat(): QCatCarrier {
  return qcat(["unit"], Object.freeze({ [key("unit", "unit")]: "stable" as const }));
}

export function discreteQCat(objects: readonly string[] = ["a", "b"]): QCatCarrier {
  const homs: Record<string, ChargeValueName> = {};
  for (const x of objects) for (const y of objects) homs[key(x, y)] = x === y ? "stable" : "absurd";
  return qcat(objects, homs);
}

export function chargeQuantaleReceipt(): ChargeQuantaleReceipt {
  const allSubsets = subsets(values);
  const pairs = values.flatMap((a) => values.map((b) => [a, b] as const));
  const triples = values.flatMap((a) => values.flatMap((b) => values.map((c) => [a, b, c] as const)));

  const leReflexive = values.every((a) => le(a, a));
  const leTransitive = triples.every(([a, b, c]) => !le(a, b) || !le(b, c) || le(a, c));
  const leAntisymmetric = pairs.every(([a, b]) => !le(a, b) || !le(b, a) || a === b);
  const supUpperBound = allSubsets.every((family) => family.every((member) => le(member, sup(family))));
  const supLeastUpperBound = allSubsets.every((family) => values.every((candidate) =>
    !family.every((member) => le(member, candidate)) || le(sup(family), candidate)));
  const mulAssociative = triples.every(([a, b, c]) => mul(mul(a, b), c) === mul(a, mul(b, c)));
  const mulCommutative = pairs.every(([a, b]) => mul(a, b) === mul(b, a));
  const oneIsUnit = values.every((a) => mul("stable", a) === a && mul(a, "stable") === a);
  const mulDistributesOverSup = values.every((a) => allSubsets.every((family) =>
    mul(a, sup(family)) === sup(family.map((member) => mul(a, member)))));
  const mulMonotone = pairs.every(([a, aPrime]) => pairs.every(([b, bPrime]) =>
    !le(a, aPrime) || !le(b, bPrime) || le(mul(a, b), mul(aPrime, bPrime))));

  if (!leReflexive || !leTransitive || !leAntisymmetric || !supUpperBound || !supLeastUpperBound
    || !mulAssociative || !mulCommutative || !oneIsUnit || !mulDistributesOverSup || !mulMonotone) {
    throw new TypeError("chargeQuantaleReceipt: finite charge quantale laws failed");
  }

  return Object.freeze({
    kind: "quantaleEnrichedSheaf.chargeQuantale:witness" as const,
    carrier: values,
    bottom: "absurd" as const,
    top: "stable" as const,
    one: "stable" as const,
    multiplication: "knowledge-meet" as const,
    order: "knowledge" as const,
    leReflexive: true as const,
    leTransitive: true as const,
    leAntisymmetric: true as const,
    supUpperBound: true as const,
    supLeastUpperBound: true as const,
    mulAssociative: true as const,
    mulCommutative: true as const,
    oneIsUnit: true as const,
    mulDistributesOverSup: true as const,
    mulMonotone: true as const,
  });
}

export function qcategoryReceipt(): QCategoryReceipt {
  const one = oneObjectQCat();
  const discrete = discreteQCat();
  const identityMap = Object.fromEntries(discrete.objects.map((object) => [object, object]));
  const identityFunctor = qfunctor(discrete, discrete, identityMap);
  const composedFunctor = composeFunctor(discrete, discrete, discrete, identityFunctor, identityFunctor);
  const oneObjectReflexive = qcatReflexive(one);
  const oneObjectComposition = qcatCompositional(one);
  const discreteReflexive = qcatReflexive(discrete);
  const discreteComposition = qcatCompositional(discrete);

  if (!oneObjectReflexive || !oneObjectComposition || !discreteReflexive || !discreteComposition) {
    throw new TypeError("qcategoryReceipt: Q-category laws failed");
  }

  return Object.freeze({
    kind: "quantaleEnrichedSheaf.qcategory:witness" as const,
    oneObject: one,
    discrete,
    identityFunctor,
    composedFunctor,
    oneObjectReflexive: true as const,
    oneObjectComposition: true as const,
    discreteReflexive: true as const,
    discreteComposition: true as const,
    identityPreservesHoms: true as const,
    compositionPreservesHoms: true as const,
  });
}

export function qFuzzyEquivalenceReceipt(
  leftGrade: ChargeValueName = "potential",
  rightGrade: ChargeValueName = "active",
): QFuzzyEquivalenceReceipt {
  const compositeGrade = mul(leftGrade, rightGrade);
  const strictGrade = "stable" as const;
  const one = oneObjectQCat();
  const roundTripBoundsHold = le(compositeGrade, hom(one, "unit", "unit")) && le(strictGrade, hom(one, "unit", "unit"));
  const compositionMultipliesGrade = compositeGrade === "absurd";
  const strictGradeReducesToRoundTripUnit = strictGrade === "stable" && le(strictGrade, hom(one, "unit", "unit"));

  if (!roundTripBoundsHold || !compositionMultipliesGrade || !strictGradeReducesToRoundTripUnit) {
    throw new TypeError("qFuzzyEquivalenceReceipt: q-fuzzy equivalence laws failed");
  }

  return Object.freeze({
    kind: "quantaleEnrichedSheaf.qFuzzyEquivalence:witness" as const,
    leftGrade,
    rightGrade,
    compositeGrade,
    strictGrade,
    compositionMultipliesGrade: true as const,
    strictGradeReducesToRoundTripUnit: true as const,
    roundTripBoundsHold: true as const,
  });
}

export const laplacian = (weight: ChargeValueName, x: ChargeValueName): ChargeValueName => mul(x, weight);

export function h0LaplacianReceipt(weight: ChargeValueName = "potential"): H0LaplacianReceipt {
  const laplacianTable = Object.freeze(Object.fromEntries(values.map((x) => [x, laplacian(weight, x)])) as Record<ChargeValueName, ChargeValueName>);
  const fixedPoints = Object.freeze(values.filter((x) => laplacianTable[x] === x));
  const laplacianIdempotent = values.every((x) => laplacian(weight, laplacian(weight, x)) === laplacian(weight, x));
  const fixedPointsClosedUnderJoin = fixedPoints.every((x) => fixedPoints.every((y) =>
    fixedPoints.includes(sup([x, y]))));

  if (!laplacianIdempotent || !fixedPointsClosedUnderJoin) {
    throw new TypeError("h0LaplacianReceipt: fixed-point laws failed");
  }

  return Object.freeze({
    kind: "quantaleEnrichedSheaf.h0Laplacian:witness" as const,
    weight,
    fixedPoints,
    laplacianTable,
    laplacianIdempotent: true as const,
    fixedPointsClosedUnderJoin: true as const,
  });
}

export function receipt(): QuantaleEnrichedSheafReceipt {
  return Object.freeze({
    kind: "quantaleEnrichedSheaf.receipt:witness" as const,
    quantale: chargeQuantaleReceipt(),
    qcategory: qcategoryReceipt(),
    fuzzyEquivalence: qFuzzyEquivalenceReceipt(),
    h0: h0LaplacianReceipt(),
    openFrontier: Object.freeze([
      "The runtime receipt checks the concrete finite FOUR/Charge quantale; arbitrary complete quantales remain Lean/proof-side.",
      "Q-categories and Q-functors are finite table carriers here, not a general enriched-category kernel.",
      "Full enriched Cech cohomology over arbitrary sites remains proof/topology work; RMN carries the degree-0 Laplacian fixed-point core.",
    ]),
  });
}
