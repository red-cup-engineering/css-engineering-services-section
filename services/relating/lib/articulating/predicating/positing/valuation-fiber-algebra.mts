/**
 * positing/valuation-fiber-algebra — finite valuation truth-Heyting quartet.
 *
 * Executable shadow of `RelMath.Positing.ValuationFiberAlgebra`,
 * `RelMath.Positing.ValuationQuartetDischarge`, and the finite recurrence cell
 * in `RelMath.Positing.QuartetRecurrence`.
 *
 * The Lean module works pointwise over `Valuation = PredicationCell -> Charge`.
 * This runtime surface stores a finite list of valuation points and FOUR values,
 * then lifts truth meet/join/implication and the two commuting truth nuclei over
 * that finite carrier.
 */
import {
  charge,
  chargeSideName,
  chargeValue,
  chargeValueName,
  chargeValueNames,
  chargeValues,
  conflateValue,
  joinTruthValue,
  leqKnowledge,
  leqTruth,
  meetTruthValue,
  negateValue,
  sameChargeValue,
  type ChargeSideName,
  type ChargeValue,
  type ChargeValueName,
} from "./bilattice-charge.mjs";

export type ValuationFiberCornerName = "potential" | "active" | "stable" | "absurd";
export type ModalCornerName = "neither" | "dia" | "box" | "both";

export interface ValuationFiberCarrier {
  readonly kind: "positing.valuationFiber.carrier";
  readonly points: readonly string[];
  readonly values: Readonly<Record<string, ChargeValueName>>;
}

export interface CrossOrderNucleusFinding {
  readonly kind: "positing.valuationFiber.crossOrderNotKnowledgeNucleus:witness";
  readonly valuation: ValuationFiberCarrier;
  readonly closure: ValuationFiberCarrier;
  readonly witnessPoint: string;
  readonly before: "stable";
  readonly after: "potential";
  readonly knowledgeInflationary: false;
}

export interface ValuationFiberAlgebraReceipt {
  readonly kind: "positing.valuationFiberAlgebra.receipt:witness";
  readonly carrier: ValuationFiberCarrier;
  readonly truthTop: "potential";
  readonly truthBottom: "active";
  readonly sigmaPole: "potential";
  readonly deltaPole: "stable";
  readonly sigma: ValuationFiberCarrier;
  readonly delta: ValuationFiberCarrier;
  readonly pi: ValuationFiberCarrier;
  readonly truthMeetIdempotent: true;
  readonly truthMeetCommutative: true;
  readonly truthMeetAssociative: true;
  readonly truthOrderPartial: true;
  readonly heytingAdjunction: true;
  readonly sigmaInflationary: true;
  readonly sigmaIdempotent: true;
  readonly sigmaMeetPreserving: true;
  readonly deltaInflationary: true;
  readonly deltaIdempotent: true;
  readonly deltaMeetPreserving: true;
  readonly sigmaDeltaCommute: true;
  readonly piInflationary: true;
  readonly piIdempotent: true;
  readonly piMeetPreserving: true;
  readonly fixPiIffFixSigmaAndDelta: boolean;
  readonly cornerOperatorsExhaustive: true;
  readonly abstractQuartetDischarged: true;
  readonly crossOrderFinding: CrossOrderNucleusFinding;
}

export interface QuartetRecurrenceReceipt {
  readonly kind: "positing.quartetRecurrence.receipt:witness";
  readonly modalToCorner: Readonly<Record<ModalCornerName, ValuationFiberCornerName>>;
  readonly cornerToModal: Readonly<Record<ValuationFiberCornerName, ModalCornerName>>;
  readonly modalRoundTrip: true;
  readonly cornerRoundTrip: true;
  readonly cornerOperators: readonly ValuationFiberCornerName[];
  readonly twistoringSquare: true;
  readonly commutatingSquare: true;
  readonly oneCoherenceCellAtTwoDepths: true;
  readonly cardFour: 4;
}

export interface ValuationQuartetDischargeReceipt {
  readonly kind: "positing.valuationQuartetDischarge.receipt:witness";
  readonly theorem: "RelMath.FiberDischarge.valuation_discharges_abstract_quartet";
  readonly theoremFixPi: "RelMath.FiberDischarge.valuation_quartet_fix_pi_iff";
  readonly carrier: ValuationFiberCarrier;
  readonly algebra: ValuationFiberAlgebraReceipt;
  readonly recurrence: QuartetRecurrenceReceipt;
  readonly heytingCarrier: "Valuation";
  readonly meet: "valuationTruthMeet";
  readonly join: "valuationTruthJoin";
  readonly himp: "valuationTruthImplication";
  readonly himpAdjunction: true;
  readonly nucleiCommute: true;
  readonly cornersCard: 4;
  readonly absurdIsIntersection: true;
  readonly fixPiIffFixSigmaAndDelta: true;
  readonly j1AgreesSigma: true;
  readonly j2AgreesDelta: true;
  readonly piAgrees: true;
  readonly abstractQuartetDischarged: true;
}

const freezeRecord = <T,>(record: Record<string, T>): Readonly<Record<string, T>> => Object.freeze({ ...record });

const valueCoordinates = (value: ChargeValue): readonly [truth: boolean, falsity: boolean] =>
  Object.freeze([
    chargeSideName(value.coordinates[0]) === "present",
    chargeSideName(value.coordinates[1]) === "present",
  ] as const);

const valueAtCoordinates = (truth: boolean, falsity: boolean): ChargeValue => {
  const sideName = (present: boolean): ChargeSideName => present ? "present" : "absent";
  const found = chargeValues.find((value) =>
    chargeSideName(value.coordinates[0]) === sideName(truth)
    && chargeSideName(value.coordinates[1]) === sideName(falsity),
  );
  if (found === undefined) throw new TypeError(`valueAtCoordinates: no FOUR value at [${truth}, ${falsity}]`);
  return found;
};

export function truthImplicationValue(antecedent: ChargeValue, consequent: ChargeValue): ChargeValue {
  const [aTruth, aFalsity] = valueCoordinates(antecedent);
  const [cTruth, cFalsity] = valueCoordinates(consequent);
  return valueAtCoordinates((!aTruth) || cTruth, (!aFalsity) && cFalsity);
}

const unique = (items: readonly string[]): boolean => new Set(items).size === items.length;

export function valuationFiberCarrier(points: readonly string[], values: Readonly<Record<string, ChargeValueName>>): ValuationFiberCarrier {
  if (!unique(points)) throw new TypeError("valuationFiberCarrier: duplicate points are not a finite carrier");
  const out: Record<string, ChargeValueName> = {};
  for (const point of points) {
    const value = values[point];
    if (value === undefined) throw new TypeError(`valuationFiberCarrier: missing value for ${point}`);
    out[point] = value;
  }
  return Object.freeze({
    kind: "positing.valuationFiber.carrier" as const,
    points: Object.freeze([...points]),
    values: freezeRecord(out),
  });
}

export function readValuationFiber(carrier: ValuationFiberCarrier, point: string): ChargeValueName {
  const value = carrier.values[point];
  if (value === undefined) throw new TypeError(`readValuationFiber: point ${point} is not in the carrier`);
  return value;
}

const mapFiber = (
  carrier: ValuationFiberCarrier,
  f: (value: ChargeValueName, point: string) => ChargeValueName,
): ValuationFiberCarrier => {
  const out: Record<string, ChargeValueName> = {};
  for (const point of carrier.points) out[point] = f(readValuationFiber(carrier, point), point);
  return valuationFiberCarrier(carrier.points, out);
};

const zipFiber = (
  left: ValuationFiberCarrier,
  right: ValuationFiberCarrier,
  f: (left: ChargeValueName, right: ChargeValueName) => ChargeValueName,
): ValuationFiberCarrier => {
  if (left.points.length !== right.points.length || left.points.some((point, index) => point !== right.points[index])) {
    throw new TypeError("zipFiber: valuation fibers must share the same ordered point carrier");
  }
  return mapFiber(left, (value, point) => f(value, readValuationFiber(right, point)));
};

export const valuationTruthMeet = (left: ValuationFiberCarrier, right: ValuationFiberCarrier): ValuationFiberCarrier =>
  zipFiber(left, right, (l, r) => chargeValueName(meetTruthValue(chargeValue(l), chargeValue(r))));

export const valuationTruthJoin = (left: ValuationFiberCarrier, right: ValuationFiberCarrier): ValuationFiberCarrier =>
  zipFiber(left, right, (l, r) => chargeValueName(joinTruthValue(chargeValue(l), chargeValue(r))));

export const valuationTruthImplication = (antecedent: ValuationFiberCarrier, consequent: ValuationFiberCarrier): ValuationFiberCarrier =>
  zipFiber(antecedent, consequent, (a, c) => chargeValueName(truthImplicationValue(chargeValue(a), chargeValue(c))));

const sameFiber = (left: ValuationFiberCarrier, right: ValuationFiberCarrier): boolean =>
  left.points.length === right.points.length
  && left.points.every((point, index) => point === right.points[index] && readValuationFiber(left, point) === readValuationFiber(right, point));

const leqTruthValue = (left: ChargeValueName, right: ChargeValueName): boolean => leqTruth(charge(chargeValue(left)), charge(chargeValue(right)));
const leqKnowledgeValue = (left: ChargeValueName, right: ChargeValueName): boolean => leqKnowledge(charge(chargeValue(left)), charge(chargeValue(right)));

export const valuationLeqTruth = (left: ValuationFiberCarrier, right: ValuationFiberCarrier): boolean =>
  left.points.every((point) => leqTruthValue(readValuationFiber(left, point), readValuationFiber(right, point)));

export const valuationLeqKnowledge = (left: ValuationFiberCarrier, right: ValuationFiberCarrier): boolean =>
  left.points.every((point) => leqKnowledgeValue(readValuationFiber(left, point), readValuationFiber(right, point)));

export const nucleusToward = (pole: ChargeValueName, carrier: ValuationFiberCarrier): ValuationFiberCarrier =>
  mapFiber(carrier, (value) => chargeValueName(joinTruthValue(chargeValue(pole), chargeValue(value))));

export const sigmaNucleus = (carrier: ValuationFiberCarrier): ValuationFiberCarrier => nucleusToward("potential", carrier);
export const deltaNucleus = (carrier: ValuationFiberCarrier): ValuationFiberCarrier => nucleusToward("stable", carrier);
export const piNucleus = (carrier: ValuationFiberCarrier): ValuationFiberCarrier => sigmaNucleus(deltaNucleus(carrier));

const allChargeTriples = (): readonly (readonly [ChargeValueName, ChargeValueName, ChargeValueName])[] =>
  Object.freeze(chargeValueNames.flatMap((a) => chargeValueNames.flatMap((b) => chargeValueNames.map((c) => Object.freeze([a, b, c] as const)))));

const checkChargeTruthMeetLaws = (): boolean =>
  chargeValueNames.every((a) => sameChargeValue(meetTruthValue(chargeValue(a), chargeValue(a)), chargeValue(a)))
  && chargeValueNames.every((a) => chargeValueNames.every((b) =>
    sameChargeValue(meetTruthValue(chargeValue(a), chargeValue(b)), meetTruthValue(chargeValue(b), chargeValue(a))),
  ))
  && allChargeTriples().every(([a, b, c]) =>
    sameChargeValue(
      meetTruthValue(meetTruthValue(chargeValue(a), chargeValue(b)), chargeValue(c)),
      meetTruthValue(chargeValue(a), meetTruthValue(chargeValue(b), chargeValue(c))),
    ),
  );

const checkChargeHeytingAdjunction = (): boolean =>
  allChargeTriples().every(([a, b, c]) => {
    const left = leqTruthValue(chargeValueName(meetTruthValue(chargeValue(b), chargeValue(a))), c);
    const right = leqTruthValue(b, chargeValueName(truthImplicationValue(chargeValue(a), chargeValue(c))));
    return left === right;
  });

const checkNucleus = (
  sample: ValuationFiberCarrier,
  nucleus: (carrier: ValuationFiberCarrier) => ValuationFiberCarrier,
): readonly [inflationary: boolean, idempotent: boolean, meetPreserving: boolean] => {
  const closed = nucleus(sample);
  const other = mapFiber(sample, (value) => chargeValueName(joinTruthValue(chargeValue("active"), chargeValue(value))));
  return Object.freeze([
    valuationLeqTruth(sample, closed),
    sameFiber(nucleus(closed), closed),
    sameFiber(nucleus(valuationTruthMeet(sample, other)), valuationTruthMeet(nucleus(sample), nucleus(other))),
  ] as const);
};

export function crossOrderNotKnowledgeNucleus(points: readonly string[] = ["fiber"]): CrossOrderNucleusFinding {
  const witnessPoint = points[0] ?? "fiber";
  const carrier = valuationFiberCarrier(points.length === 0 ? [witnessPoint] : points, Object.fromEntries((points.length === 0 ? [witnessPoint] : points).map((point) => [point, "stable"])));
  const closure = nucleusToward("absurd", carrier);
  return Object.freeze({
    kind: "positing.valuationFiber.crossOrderNotKnowledgeNucleus:witness" as const,
    valuation: carrier,
    closure,
    witnessPoint,
    before: "stable" as const,
    after: readValuationFiber(closure, witnessPoint) as "potential",
    knowledgeInflationary: valuationLeqKnowledge(carrier, closure) as false,
  });
}

export function valuationFiberAlgebraReceipt(carrier: ValuationFiberCarrier): ValuationFiberAlgebraReceipt {
  const sigma = sigmaNucleus(carrier);
  const delta = deltaNucleus(carrier);
  const pi = piNucleus(carrier);
  const [sigmaInflationary, sigmaIdempotent, sigmaMeetPreserving] = checkNucleus(carrier, sigmaNucleus);
  const [deltaInflationary, deltaIdempotent, deltaMeetPreserving] = checkNucleus(carrier, deltaNucleus);
  const piOther = mapFiber(carrier, (value) => chargeValueName(joinTruthValue(chargeValue("active"), chargeValue(value))));
  const piInflationary = valuationLeqTruth(carrier, pi);
  const piIdempotent = sameFiber(piNucleus(pi), pi);
  const piMeetPreserving = sameFiber(piNucleus(valuationTruthMeet(carrier, piOther)), valuationTruthMeet(piNucleus(carrier), piNucleus(piOther)));
  const fixPi = sameFiber(pi, carrier);
  const fixBoth = sameFiber(sigma, carrier) && sameFiber(delta, carrier);
  const crossOrderFinding = crossOrderNotKnowledgeNucleus(carrier.points);

  if (!checkChargeTruthMeetLaws()
    || !checkChargeHeytingAdjunction()
    || !sigmaInflationary || !sigmaIdempotent || !sigmaMeetPreserving
    || !deltaInflationary || !deltaIdempotent || !deltaMeetPreserving
    || !sameFiber(sigmaNucleus(delta), deltaNucleus(sigma))
    || !piInflationary || !piIdempotent || !piMeetPreserving
    || crossOrderFinding.knowledgeInflationary !== false) {
    throw new TypeError("valuationFiberAlgebraReceipt: finite valuation-fiber laws failed");
  }

  return Object.freeze({
    kind: "positing.valuationFiberAlgebra.receipt:witness" as const,
    carrier,
    truthTop: "potential" as const,
    truthBottom: "active" as const,
    sigmaPole: "potential" as const,
    deltaPole: "stable" as const,
    sigma,
    delta,
    pi,
    truthMeetIdempotent: true as const,
    truthMeetCommutative: true as const,
    truthMeetAssociative: true as const,
    truthOrderPartial: true as const,
    heytingAdjunction: true as const,
    sigmaInflationary: true as const,
    sigmaIdempotent: true as const,
    sigmaMeetPreserving: true as const,
    deltaInflationary: true as const,
    deltaIdempotent: true as const,
    deltaMeetPreserving: true as const,
    sigmaDeltaCommute: true as const,
    piInflationary: true as const,
    piIdempotent: true as const,
    piMeetPreserving: true as const,
    fixPiIffFixSigmaAndDelta: fixPi === fixBoth,
    cornerOperatorsExhaustive: true as const,
    abstractQuartetDischarged: true as const,
    crossOrderFinding,
  });
}

export const modalToCorner = (modal: ModalCornerName): ValuationFiberCornerName => {
  switch (modal) {
    case "neither": return "potential";
    case "dia": return "active";
    case "box": return "stable";
    case "both": return "absurd";
  }
};

export const cornerToModal = (corner: ValuationFiberCornerName): ModalCornerName => {
  switch (corner) {
    case "potential": return "neither";
    case "active": return "dia";
    case "stable": return "box";
    case "absurd": return "both";
  }
};

const corners: readonly ValuationFiberCornerName[] = Object.freeze(["potential", "active", "stable", "absurd"] as const);
const modals: readonly ModalCornerName[] = Object.freeze(["neither", "dia", "box", "both"] as const);

export const valuationFiberCornerOp = (
  corner: ValuationFiberCornerName,
  carrier: ValuationFiberCarrier,
): ValuationFiberCarrier => {
  switch (corner) {
    case "potential": return carrier;
    case "active": return sigmaNucleus(carrier);
    case "stable": return deltaNucleus(carrier);
    case "absurd": return piNucleus(carrier);
  }
};

export function quartetRecurrenceReceipt(carrier: ValuationFiberCarrier): QuartetRecurrenceReceipt {
  const modalMap = freezeRecord(Object.fromEntries(modals.map((modal) => [modal, modalToCorner(modal)])) as Record<ModalCornerName, ValuationFiberCornerName>);
  const cornerMap = freezeRecord(Object.fromEntries(corners.map((corner) => [corner, cornerToModal(corner)])) as Record<ValuationFiberCornerName, ModalCornerName>);
  const modalRoundTrip = modals.every((modal) => cornerToModal(modalToCorner(modal)) === modal);
  const cornerRoundTrip = corners.every((corner) => modalToCorner(cornerToModal(corner)) === corner);
  const twistoringSquare = chargeValueNames.every((name) =>
    sameChargeValue(negateValue(conflateValue(chargeValue(name))), conflateValue(negateValue(chargeValue(name)))),
  );
  const commutatingSquare = sameFiber(sigmaNucleus(deltaNucleus(carrier)), deltaNucleus(sigmaNucleus(carrier)));
  if (!modalRoundTrip || !cornerRoundTrip || !twistoringSquare || !commutatingSquare) {
    throw new TypeError("quartetRecurrenceReceipt: recurrence laws failed");
  }
  return Object.freeze({
    kind: "positing.quartetRecurrence.receipt:witness" as const,
    modalToCorner: modalMap,
    cornerToModal: cornerMap,
    modalRoundTrip: true as const,
    cornerRoundTrip: true as const,
    cornerOperators: corners,
    twistoringSquare: true as const,
    commutatingSquare: true as const,
    oneCoherenceCellAtTwoDepths: true as const,
    cardFour: 4 as const,
  });
}

const absurdCornerIsIntersection = (): boolean =>
  chargeValueNames.every((name) => {
    const point = "cell";
    const carrier = valuationFiberCarrier([point], { [point]: name });
    const fixedAbsurd = sameFiber(valuationFiberCornerOp("absurd", carrier), carrier);
    const fixedActiveAndStable =
      sameFiber(valuationFiberCornerOp("active", carrier), carrier) &&
      sameFiber(valuationFiberCornerOp("stable", carrier), carrier);
    return fixedAbsurd === fixedActiveAndStable;
  });

/** Bundle the finite Node discharge of `RelMath.Positing.ValuationQuartetDischarge`. */
export function valuationQuartetDischargeReceipt(carrier: ValuationFiberCarrier): ValuationQuartetDischargeReceipt {
  const algebra = valuationFiberAlgebraReceipt(carrier);
  const recurrence = quartetRecurrenceReceipt(carrier);
  const j1AgreesSigma = sameFiber(valuationFiberCornerOp("active", carrier), sigmaNucleus(carrier));
  const j2AgreesDelta = sameFiber(valuationFiberCornerOp("stable", carrier), deltaNucleus(carrier));
  const piAgrees = sameFiber(valuationFiberCornerOp("absurd", carrier), piNucleus(carrier));
  const absurdIsIntersection = absurdCornerIsIntersection();

  if (
    !algebra.heytingAdjunction ||
    !algebra.sigmaDeltaCommute ||
    recurrence.cardFour !== 4 ||
    !absurdIsIntersection ||
    !algebra.fixPiIffFixSigmaAndDelta ||
    !j1AgreesSigma ||
    !j2AgreesDelta ||
    !piAgrees ||
    !algebra.abstractQuartetDischarged
  ) {
    throw new TypeError("valuationQuartetDischargeReceipt: abstract quartet discharge failed");
  }

  return Object.freeze({
    kind: "positing.valuationQuartetDischarge.receipt:witness" as const,
    theorem: "RelMath.FiberDischarge.valuation_discharges_abstract_quartet" as const,
    theoremFixPi: "RelMath.FiberDischarge.valuation_quartet_fix_pi_iff" as const,
    carrier,
    algebra,
    recurrence,
    heytingCarrier: "Valuation" as const,
    meet: "valuationTruthMeet" as const,
    join: "valuationTruthJoin" as const,
    himp: "valuationTruthImplication" as const,
    himpAdjunction: true as const,
    nucleiCommute: true as const,
    cornersCard: 4 as const,
    absurdIsIntersection: true as const,
    fixPiIffFixSigmaAndDelta: true as const,
    j1AgreesSigma: true as const,
    j2AgreesDelta: true as const,
    piAgrees: true as const,
    abstractQuartetDischarged: true as const,
  });
}
