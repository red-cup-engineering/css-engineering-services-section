/**
 * analysis/bigraded-diamond - finite executable shadow of
 * RelMath.Positing.BigradedDiamond and the FOUR instance of
 * RelMath.Positing.NucleusAndCommutingNuclei.
 *
 * Lean proves that the charge knowledge order is a Heyting algebra, that
 * raising by knowledge-join toward a charge is a nucleus, that any two such
 * nuclei commute, and that the true/false two-fiber family varies. This module
 * turns those finite FOUR facts into carrier receipts.
 */
import {
  asChargeValueName,
  charge,
  chargeSideName,
  chargeValue,
  chargeValueName,
  chargeValueNames,
  joinKnowledgeValue,
  leqKnowledge,
  meetKnowledgeValue,
  sameChargeValue,
  type ChargeValue,
  type ChargeValueName,
  type GaugeElementName,
} from "../../bilattice-charge.mjs";
import {
  crossOrderNotKnowledgeNucleus,
  type CrossOrderNucleusFinding,
} from "../../valuation-fiber-algebra.mjs";

export type BigradedDiamondCornerName = "potential" | "active" | "stable" | "absurd";
export type BigradedDiamondFiberName = "true" | "false";
export type K4GradeName = "id" | "neg" | "conf" | "negConf";
export type FourCornerPair = readonly [knowledgeAxis: boolean, truthAxis: boolean];

export interface KnowledgeHeytingReceipt {
  readonly kind: "bigradedDiamond.knowledgeHeyting:witness";
  readonly carrier: readonly ChargeValueName[];
  readonly bottom: "absurd";
  readonly top: "stable";
  readonly meetCommutative: true;
  readonly meetAssociative: true;
  readonly meetIdempotent: true;
  readonly implicationAdjunction: true;
  readonly modusPonens: true;
}

export interface KnowledgeNucleusReceipt {
  readonly kind: "bigradedDiamond.knowledgeNucleus:witness";
  readonly pole: ChargeValueName;
  readonly action: Readonly<Record<ChargeValueName, ChargeValueName>>;
  readonly fixed: readonly ChargeValueName[];
  readonly inflationary: true;
  readonly idempotent: true;
  readonly meetPreserving: true;
  readonly monotone: true;
  readonly fixedImplicationClosed: true;
  readonly topFixed: true;
}

export interface CornerActionReceipt {
  readonly corner: BigradedDiamondCornerName;
  readonly action: Readonly<Record<ChargeValueName, ChargeValueName>>;
  readonly imageAtKnowledgeBottom: ChargeValueName;
}

export interface NuclearSquareReceipt {
  readonly kind: "bigradedDiamond.nuclearSquare:witness";
  readonly leftPole: ChargeValueName;
  readonly rightPole: ChargeValueName;
  readonly left: KnowledgeNucleusReceipt;
  readonly right: KnowledgeNucleusReceipt;
  readonly piAction: Readonly<Record<ChargeValueName, ChargeValueName>>;
  readonly jointFixed: readonly ChargeValueName[];
  readonly corners: readonly CornerActionReceipt[];
  readonly cornerCount: 4;
  readonly commutes: true;
  readonly compositeIsNucleus: true;
  readonly fixPiIffFixBoth: true;
}

export interface VaryingFamilyReceipt {
  readonly kind: "bigradedDiamond.varyingFamily:witness";
  readonly fibers: Readonly<Record<BigradedDiamondFiberName, NuclearSquareReceipt>>;
  readonly varies: true;
  readonly witness: {
    readonly leftFiber: "true";
    readonly rightFiber: "false";
    readonly differingNucleus: "j1";
    readonly at: "absurd";
    readonly leftValue: "potential";
    readonly rightValue: "stable";
  };
}

export interface BigradedDiamondReceipt {
  readonly kind: "bigradedDiamond.receipt:witness";
  readonly heyting: KnowledgeHeytingReceipt;
  readonly family: VaryingFamilyReceipt;
  readonly finiteNuclearQuartetDischarged: true;
}

export interface GradePoleReceipt {
  readonly grade: K4GradeName;
  readonly gaugeElement: GaugeElementName;
  readonly knowledgeAxis: boolean;
  readonly truthAxis: boolean;
  readonly fourCorner: FourCornerPair;
  readonly corner: BigradedDiamondCornerName;
  readonly leftPole: ChargeValueName;
  readonly rightPole: ChargeValueName;
  readonly square: NuclearSquareReceipt;
}

export interface BigradedDiamondTowerReceipt {
  readonly kind: "bigradedDiamond.tower:witness";
  readonly grades: readonly GradePoleReceipt[];
  readonly gradeCount: 4;
  readonly cornerCount: 4;
  readonly axesAssemble: true;
  readonly axesIndependent: true;
  readonly everyGradeSameOrderSquare: true;
  readonly everyGradeFixPiIff: true;
  readonly crossOrderForbidsCoNucleus: CrossOrderNucleusFinding;
}

const chargeNames = chargeValueNames;
const k4Grades: readonly K4GradeName[] = Object.freeze(["id", "neg", "conf", "negConf"] as const);

const freezeNames = (names: readonly ChargeValueName[]): readonly ChargeValueName[] =>
  Object.freeze([...names]);

const chargeMap = (f: (name: ChargeValueName) => ChargeValueName): Readonly<Record<ChargeValueName, ChargeValueName>> =>
  Object.freeze(Object.fromEntries(chargeNames.map((name) => [name, f(name)])) as Record<ChargeValueName, ChargeValueName>);

const pairs = (): readonly (readonly [ChargeValueName, ChargeValueName])[] =>
  Object.freeze(chargeNames.flatMap((a) => chargeNames.map((b) => Object.freeze([a, b] as const))));

const triples = (): readonly (readonly [ChargeValueName, ChargeValueName, ChargeValueName])[] =>
  Object.freeze(chargeNames.flatMap((a) => chargeNames.flatMap((b) => chargeNames.map((c) => Object.freeze([a, b, c] as const)))));

const nameOf = (value: ChargeValue): ChargeValueName => chargeValueName(value);

const sameName = (left: ChargeValueName, right: ChargeValueName): boolean =>
  sameChargeValue(chargeValue(left), chargeValue(right));

const meetK = (left: ChargeValueName, right: ChargeValueName): ChargeValueName =>
  nameOf(meetKnowledgeValue(chargeValue(left), chargeValue(right)));

const joinK = (left: ChargeValueName, right: ChargeValueName): ChargeValueName =>
  nameOf(joinKnowledgeValue(chargeValue(left), chargeValue(right)));

const leK = (left: ChargeValueName, right: ChargeValueName): boolean =>
  leqKnowledge(charge(chargeValue(left)), charge(chargeValue(right)));

const chargeAtCoordinates = (truth: boolean, falsity: boolean): ChargeValueName => {
  if (truth && falsity) return "stable";
  if (truth) return "potential";
  if (falsity) return "active";
  return "absurd";
};

const coordinatesOf = (name: ChargeValueName): readonly [truth: boolean, falsity: boolean] => {
  const [truth, falsity] = chargeValue(name).coordinates;
  return Object.freeze([
    chargeSideName(truth) === "present",
    chargeSideName(falsity) === "present",
  ] as const);
};

export function knowledgeImplication(antecedentInput: string, consequentInput: string): ChargeValueName {
  const antecedent = asChargeValueName(antecedentInput);
  const consequent = asChargeValueName(consequentInput);
  const [aTruth, aFalsity] = coordinatesOf(antecedent);
  const [cTruth, cFalsity] = coordinatesOf(consequent);
  return chargeAtCoordinates((!aTruth) || cTruth, (!aFalsity) || cFalsity);
}

export const knowledgeNucleusToward = (poleInput: string, valueInput: string): ChargeValueName => {
  const pole = asChargeValueName(poleInput);
  const value = asChargeValueName(valueInput);
  return joinK(pole, value);
};

const checkEndomapNucleus = (
  j: (value: ChargeValueName) => ChargeValueName,
): readonly [inflationary: boolean, idempotent: boolean, meetPreserving: boolean, monotone: boolean, fixedImplicationClosed: boolean, topFixed: boolean] => {
  const inflationary = chargeNames.every((a) => leK(a, j(a)));
  const idempotent = chargeNames.every((a) => sameName(j(j(a)), j(a)));
  const meetPreserving = pairs().every(([a, b]) => sameName(j(meetK(a, b)), meetK(j(a), j(b))));
  const monotone = pairs().every(([a, b]) => !leK(a, b) || leK(j(a), j(b)));
  const fixedImplicationClosed = pairs().every(([a, b]) =>
    !sameName(j(b), b) || sameName(j(knowledgeImplication(a, b)), knowledgeImplication(a, b)),
  );
  const topFixed = sameName(j("stable"), "stable");
  return Object.freeze([inflationary, idempotent, meetPreserving, monotone, fixedImplicationClosed, topFixed] as const);
};

export function knowledgeHeytingReceipt(): KnowledgeHeytingReceipt {
  const meetCommutative = pairs().every(([a, b]) => sameName(meetK(a, b), meetK(b, a)));
  const meetAssociative = triples().every(([a, b, c]) => sameName(meetK(meetK(a, b), c), meetK(a, meetK(b, c))));
  const meetIdempotent = chargeNames.every((a) => sameName(meetK(a, a), a));
  const implicationAdjunction = triples().every(([a, b, c]) =>
    leK(meetK(b, a), c) === leK(b, knowledgeImplication(a, c)),
  );
  const modusPonens = pairs().every(([a, c]) => leK(meetK(knowledgeImplication(a, c), a), c));

  if (!meetCommutative || !meetAssociative || !meetIdempotent || !implicationAdjunction || !modusPonens) {
    throw new TypeError("knowledgeHeytingReceipt: FOUR knowledge-Heyting laws failed");
  }

  return Object.freeze({
    kind: "bigradedDiamond.knowledgeHeyting:witness" as const,
    carrier: freezeNames(chargeNames),
    bottom: "absurd" as const,
    top: "stable" as const,
    meetCommutative: true as const,
    meetAssociative: true as const,
    meetIdempotent: true as const,
    implicationAdjunction: true as const,
    modusPonens: true as const,
  });
}

export function knowledgeNucleusReceipt(poleInput: string): KnowledgeNucleusReceipt {
  const pole = asChargeValueName(poleInput);
  const j = (value: ChargeValueName): ChargeValueName => knowledgeNucleusToward(pole, value);
  const [inflationary, idempotent, meetPreserving, monotone, fixedImplicationClosed, topFixed] = checkEndomapNucleus(j);
  if (!inflationary || !idempotent || !meetPreserving || !monotone || !fixedImplicationClosed || !topFixed) {
    throw new TypeError(`knowledgeNucleusReceipt: ${pole} is not a FOUR knowledge nucleus`);
  }
  return Object.freeze({
    kind: "bigradedDiamond.knowledgeNucleus:witness" as const,
    pole,
    action: chargeMap(j),
    fixed: freezeNames(chargeNames.filter((name) => sameName(j(name), name))),
    inflationary: true as const,
    idempotent: true as const,
    meetPreserving: true as const,
    monotone: true as const,
    fixedImplicationClosed: true as const,
    topFixed: true as const,
  });
}

export function nuclearSquareReceipt(leftPoleInput: string, rightPoleInput: string): NuclearSquareReceipt {
  const leftPole = asChargeValueName(leftPoleInput);
  const rightPole = asChargeValueName(rightPoleInput);
  const j1 = (value: ChargeValueName): ChargeValueName => knowledgeNucleusToward(leftPole, value);
  const j2 = (value: ChargeValueName): ChargeValueName => knowledgeNucleusToward(rightPole, value);
  const pi = (value: ChargeValueName): ChargeValueName => j1(j2(value));
  const commutes = chargeNames.every((a) => sameName(j1(j2(a)), j2(j1(a))));
  const [piInflationary, piIdempotent, piMeetPreserving, piMonotone, piFixedImplicationClosed, piTopFixed] = checkEndomapNucleus(pi);
  const compositeIsNucleus = piInflationary && piIdempotent && piMeetPreserving && piMonotone && piFixedImplicationClosed && piTopFixed;
  const fixPiIffFixBoth = chargeNames.every((a) =>
    sameName(pi(a), a) === (sameName(j1(a), a) && sameName(j2(a), a)),
  );

  if (!commutes || !compositeIsNucleus || !fixPiIffFixBoth) {
    throw new TypeError("nuclearSquareReceipt: FOUR knowledge nuclei failed to form a nuclear square");
  }

  const cornerFns: Readonly<Record<BigradedDiamondCornerName, (value: ChargeValueName) => ChargeValueName>> = Object.freeze({
    potential: (value) => value,
    active: j1,
    stable: j2,
    absurd: pi,
  });
  const corners: readonly CornerActionReceipt[] = Object.freeze(
    (["potential", "active", "stable", "absurd"] as const satisfies readonly BigradedDiamondCornerName[]).map((corner) => Object.freeze({
      corner,
      action: chargeMap(cornerFns[corner]),
      imageAtKnowledgeBottom: cornerFns[corner]("absurd"),
    })),
  );

  return Object.freeze({
    kind: "bigradedDiamond.nuclearSquare:witness" as const,
    leftPole,
    rightPole,
    left: knowledgeNucleusReceipt(leftPole),
    right: knowledgeNucleusReceipt(rightPole),
    piAction: chargeMap(pi),
    jointFixed: freezeNames(chargeNames.filter((name) => sameName(pi(name), name))),
    corners,
    cornerCount: 4 as const,
    commutes: true as const,
    compositeIsNucleus: true as const,
    fixPiIffFixBoth: true as const,
  });
}

export function varyingFamilyReceipt(): VaryingFamilyReceipt {
  const trueFiber = nuclearSquareReceipt("potential", "active");
  const falseFiber = nuclearSquareReceipt("stable", "active");
  const leftValue = trueFiber.left.action.absurd;
  const rightValue = falseFiber.left.action.absurd;
  if (leftValue !== "potential" || rightValue !== "stable") {
    throw new TypeError("varyingFamilyReceipt: expected the Lean true/false fibers to differ at kBot");
  }
  return Object.freeze({
    kind: "bigradedDiamond.varyingFamily:witness" as const,
    fibers: Object.freeze({
      true: trueFiber,
      false: falseFiber,
    }),
    varies: true as const,
    witness: Object.freeze({
      leftFiber: "true" as const,
      rightFiber: "false" as const,
      differingNucleus: "j1" as const,
      at: "absurd" as const,
      leftValue: "potential" as const,
      rightValue: "stable" as const,
    }),
  });
}

export function receipt(): BigradedDiamondReceipt {
  return Object.freeze({
    kind: "bigradedDiamond.receipt:witness" as const,
    heyting: knowledgeHeytingReceipt(),
    family: varyingFamilyReceipt(),
    finiteNuclearQuartetDischarged: true as const,
  });
}

export const knowledgeBit = (grade: K4GradeName): boolean => grade === "neg" || grade === "negConf";
export const truthBit = (grade: K4GradeName): boolean => grade === "conf" || grade === "negConf";

export function toFourCorner(grade: K4GradeName): FourCornerPair {
  return Object.freeze([knowledgeBit(grade), truthBit(grade)] as const);
}

export function ofFourCorner(corner: FourCornerPair): K4GradeName {
  const [knowledgeAxis, truthAxis] = corner;
  if (knowledgeAxis && truthAxis) return "negConf";
  if (knowledgeAxis) return "neg";
  if (truthAxis) return "conf";
  return "id";
}

export function fourCornerToCorner(corner: FourCornerPair): BigradedDiamondCornerName {
  const [knowledgeAxis, truthAxis] = corner;
  if (knowledgeAxis && truthAxis) return "absurd";
  if (knowledgeAxis) return "active";
  if (truthAxis) return "stable";
  return "potential";
}

export function gradePoles(grade: K4GradeName): readonly [leftPole: ChargeValueName, rightPole: ChargeValueName] {
  switch (grade) {
    case "id": return Object.freeze(["absurd", "absurd"] as const);
    case "neg": return Object.freeze(["potential", "absurd"] as const);
    case "conf": return Object.freeze(["active", "absurd"] as const);
    case "negConf": return Object.freeze(["stable", "absurd"] as const);
  }
}

const gradeToGaugeElement = (grade: K4GradeName): GaugeElementName => {
  switch (grade) {
    case "id": return "id";
    case "neg": return "negation";
    case "conf": return "conflation";
    case "negConf": return "double";
  }
};

const mulK4 = (left: K4GradeName, right: K4GradeName): K4GradeName =>
  ofFourCorner(Object.freeze([
    knowledgeBit(left) !== knowledgeBit(right),
    truthBit(left) !== truthBit(right),
  ] as const));

function gradeReceipt(grade: K4GradeName): GradePoleReceipt {
  const fourCorner = toFourCorner(grade);
  const [leftPole, rightPole] = gradePoles(grade);
  return Object.freeze({
    grade,
    gaugeElement: gradeToGaugeElement(grade),
    knowledgeAxis: fourCorner[0],
    truthAxis: fourCorner[1],
    fourCorner,
    corner: fourCornerToCorner(fourCorner),
    leftPole,
    rightPole,
    square: nuclearSquareReceipt(leftPole, rightPole),
  });
}

export function towerReceipt(): BigradedDiamondTowerReceipt {
  const grades = Object.freeze(k4Grades.map(gradeReceipt));
  const axesAssemble = k4Grades.every((grade) => ofFourCorner(toFourCorner(grade)) === grade);
  const axesIndependent = k4Grades.every((grade) =>
    knowledgeBit(mulK4("neg", grade)) !== knowledgeBit(grade)
    && truthBit(mulK4("neg", grade)) === truthBit(grade)
    && knowledgeBit(mulK4("conf", grade)) === knowledgeBit(grade)
    && truthBit(mulK4("conf", grade)) !== truthBit(grade),
  );
  const everyGradeSameOrderSquare = grades.every((grade) =>
    grade.square.leftPole === grade.leftPole && grade.square.rightPole === grade.rightPole,
  );
  const everyGradeFixPiIff = grades.every((grade) => grade.square.fixPiIffFixBoth);
  if (!axesAssemble || !axesIndependent || !everyGradeSameOrderSquare || !everyGradeFixPiIff) {
    throw new TypeError("towerReceipt: K4 bigraded diamond tower laws failed");
  }
  return Object.freeze({
    kind: "bigradedDiamond.tower:witness" as const,
    grades,
    gradeCount: 4 as const,
    cornerCount: 4 as const,
    axesAssemble: true as const,
    axesIndependent: true as const,
    everyGradeSameOrderSquare: true as const,
    everyGradeFixPiIff: true as const,
    crossOrderForbidsCoNucleus: crossOrderNotKnowledgeNucleus(["tower"]),
  });
}
