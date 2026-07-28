/**
 * predicating/quantifying — finite fiber quantifiers and hyperdoctrine receipts.
 *
 * Executable shadow of `RelMath.Predicating.Quantifying`,
 * `RelMath.Predicating.Hyperdoctrine`, and
 * `RelMath.Predicating.PredicationHyperdoctrineDual`.
 *
 * A finite fibration is stored as a total base map from source cells to target
 * cells; fibers are derived from the map. Quantifiers are finite joins/meets in
 * the knowledge or truth order, and receipt constructors check the adjunction
 * laws over the finite FOUR-valued valuation space when asked for a law witness.
 */
import {
  chargeValue,
  chargeValueName,
  chargeValueNames,
  joinKnowledgeValue,
  joinTruthValue,
  meetKnowledgeValue,
  meetTruthValue,
  sameChargeValue,
  type ChargeValue,
  type ChargeValueName,
} from "./positing/bilattice-charge.mjs";
import { orderSwapValue } from "./positing/dihedral-gauge.mjs";
import type { OrderName } from "./positing/fiber.mjs";

export type FiniteValuation = Readonly<Record<string, ChargeValueName>>;

export interface PredicatingFiniteFibration {
  readonly kind: "predicating.quantifying.finiteFibration";
  readonly points: readonly string[];
  readonly bases: readonly string[];
  readonly baseMap: Readonly<Record<string, string>>;
  readonly fibers: Readonly<Record<string, readonly string[]>>;
}

export interface PredicatingQuantifyingReceipt {
  readonly kind: "predicating.quantifying.receipt:witness";
  readonly fibration: PredicatingFiniteFibration;
  readonly valuation: FiniteValuation;
  readonly existsKnowledge: FiniteValuation;
  readonly forallKnowledge: FiniteValuation;
  readonly existsTruth: FiniteValuation;
  readonly forallTruth: FiniteValuation;
  readonly emptyFiberExistsKnowledge: "absurd";
  readonly emptyFiberForallKnowledge: "stable";
  readonly emptyFiberExistsTruth: "active";
  readonly emptyFiberForallTruth: "potential";
  readonly singletonFiberIdentityKnowledge: boolean;
  readonly singletonFiberIdentityTruth: boolean;
  readonly knowledgeAdjunctionFinite: true;
  readonly truthAdjunctionFinite: true;
}

export interface PredicatingHyperdoctrineReceipt {
  readonly kind: "predicating.hyperdoctrine.receipt:witness";
  readonly fibration: PredicatingFiniteFibration;
  readonly valuation: FiniteValuation;
  readonly reindexed: FiniteValuation;
  readonly reindexedTwice: FiniteValuation;
  readonly existsKnowledge: FiniteValuation;
  readonly forallKnowledge: FiniteValuation;
  readonly existsTruth: FiniteValuation;
  readonly forallTruth: FiniteValuation;
  readonly baseIsoInvolution: true;
  readonly reindexConverseConverse: true;
  readonly converseExistsIsReindexKnowledge: true;
  readonly converseForallIsReindexKnowledge: true;
  readonly converseExistsIsReindexTruth: true;
  readonly converseForallIsReindexTruth: true;
  readonly converseFrobeniusKnowledge: true;
  readonly converseFrobeniusTruth: true;
  readonly beckChevalleySelf: true;
}

export interface PredicatingDualHyperdoctrineReceipt {
  readonly kind: "predicating.hyperdoctrine.dual.receipt:witness";
  readonly fibration: PredicatingFiniteFibration;
  readonly valuation: FiniteValuation;
  readonly swappedValuation: FiniteValuation;
  readonly conjExists: FiniteValuation;
  readonly existsTruth: FiniteValuation;
  readonly conjForall: FiniteValuation;
  readonly forallTruth: FiniteValuation;
  readonly swapInvolutive: true;
  readonly conjExistsEqualsExistsTruth: true;
  readonly conjForallEqualsForallTruth: true;
  readonly conjReindexEqualsReindex: true;
  readonly dualAdjointSystemFinite: true;
}

const freezeRecord = <T,>(record: Record<string, T>): Readonly<Record<string, T>> => Object.freeze({ ...record });

const unique = (values: readonly string[]): boolean => new Set(values).size === values.length;

function requireKeys(name: string, keys: readonly string[]): readonly string[] {
  if (!unique(keys)) throw new TypeError(`${name}: duplicate keys are not a finite carrier`);
  return Object.freeze([...keys]);
}

export function finitePredicatingFibration(
  points: readonly string[],
  bases: readonly string[],
  baseMap: Readonly<Record<string, string>>,
): PredicatingFiniteFibration {
  const source = requireKeys("finitePredicatingFibration(points)", points);
  const target = requireKeys("finitePredicatingFibration(bases)", bases);
  const targetSet = new Set(target);
  const map: Record<string, string> = {};
  const fibers: Record<string, string[]> = {};
  for (const base of target) fibers[base] = [];
  for (const point of source) {
    const base = baseMap[point];
    if (base === undefined) throw new TypeError(`finitePredicatingFibration: missing base image for ${point}`);
    if (!targetSet.has(base)) throw new TypeError(`finitePredicatingFibration: base image ${base} is not in the codomain`);
    map[point] = base;
    fibers[base]?.push(point);
  }
  return Object.freeze({
    kind: "predicating.quantifying.finiteFibration" as const,
    points: source,
    bases: target,
    baseMap: freezeRecord(map),
    fibers: freezeRecord(Object.fromEntries(Object.entries(fibers).map(([key, fiber]) => [key, Object.freeze([...fiber])] as const))),
  });
}

function orderBottom(order: OrderName): ChargeValue {
  return chargeValue(order === "knowledge" ? "absurd" : "active");
}

function orderTop(order: OrderName): ChargeValue {
  return chargeValue(order === "knowledge" ? "stable" : "potential");
}

function orderJoin(order: OrderName, left: ChargeValue, right: ChargeValue): ChargeValue {
  return order === "knowledge" ? joinKnowledgeValue(left, right) : joinTruthValue(left, right);
}

function orderMeet(order: OrderName, left: ChargeValue, right: ChargeValue): ChargeValue {
  return order === "knowledge" ? meetKnowledgeValue(left, right) : meetTruthValue(left, right);
}

export function chargeListJoin(order: OrderName, values: readonly ChargeValueName[]): ChargeValueName {
  return chargeValueName(values.map(chargeValue).reduce((acc, value) => orderJoin(order, acc, value), orderBottom(order)));
}

export function chargeListMeet(order: OrderName, values: readonly ChargeValueName[]): ChargeValueName {
  return chargeValueName(values.map(chargeValue).reduce((acc, value) => orderMeet(order, acc, value), orderTop(order)));
}

const readValuation = (valuation: FiniteValuation, point: string): ChargeValueName => valuation[point] ?? "absurd";

export function existsF(fibration: PredicatingFiniteFibration, valuation: FiniteValuation, order: OrderName): FiniteValuation {
  const out: Record<string, ChargeValueName> = {};
  for (const base of fibration.bases) {
    const fiber = fibration.fibers[base] ?? [];
    out[base] = chargeListJoin(order, fiber.map((point) => readValuation(valuation, point)));
  }
  return freezeRecord(out);
}

export function forallF(fibration: PredicatingFiniteFibration, valuation: FiniteValuation, order: OrderName): FiniteValuation {
  const out: Record<string, ChargeValueName> = {};
  for (const base of fibration.bases) {
    const fiber = fibration.fibers[base] ?? [];
    out[base] = chargeListMeet(order, fiber.map((point) => readValuation(valuation, point)));
  }
  return freezeRecord(out);
}

export function reindexF(fibration: PredicatingFiniteFibration, valuation: FiniteValuation): FiniteValuation {
  const out: Record<string, ChargeValueName> = {};
  for (const point of fibration.points) out[point] = readValuation(valuation, fibration.baseMap[point] as string);
  return freezeRecord(out);
}

export function swapValuation(valuation: FiniteValuation): FiniteValuation {
  const out: Record<string, ChargeValueName> = {};
  for (const [key, name] of Object.entries(valuation)) out[key] = chargeValueName(orderSwapValue(chargeValue(name)));
  return freezeRecord(out);
}

function sameValuation(keys: readonly string[], left: FiniteValuation, right: FiniteValuation): boolean {
  return keys.every((key) => readValuation(left, key) === readValuation(right, key));
}

function leqValue(order: OrderName, left: ChargeValueName, right: ChargeValueName): boolean {
  return sameChargeValue(orderJoin(order, chargeValue(left), chargeValue(right)), chargeValue(right));
}

function leqValuation(order: OrderName, keys: readonly string[], left: FiniteValuation, right: FiniteValuation): boolean {
  return keys.every((key) => leqValue(order, readValuation(left, key), readValuation(right, key)));
}

function* valuations(keys: readonly string[]): Generator<FiniteValuation> {
  function* go(index: number, record: Record<string, ChargeValueName>): Generator<FiniteValuation> {
    if (index === keys.length) {
      yield freezeRecord(record);
      return;
    }
    const key = keys[index] as string;
    for (const name of chargeValueNames) {
      record[key] = name;
      yield* go(index + 1, record);
    }
    delete record[key];
  }
  yield* go(0, {});
}

function checkExistsAdjunction(fibration: PredicatingFiniteFibration, order: OrderName): boolean {
  for (const sourceValuation of valuations(fibration.points)) {
    for (const targetValuation of valuations(fibration.bases)) {
      const left = leqValuation(order, fibration.bases, existsF(fibration, sourceValuation, order), targetValuation);
      const right = leqValuation(order, fibration.points, sourceValuation, reindexF(fibration, targetValuation));
      if (left !== right) return false;
    }
  }
  return true;
}

function checkForallAdjunction(fibration: PredicatingFiniteFibration, order: OrderName): boolean {
  for (const targetValuation of valuations(fibration.bases)) {
    for (const sourceValuation of valuations(fibration.points)) {
      const left = leqValuation(order, fibration.points, reindexF(fibration, targetValuation), sourceValuation);
      const right = leqValuation(order, fibration.bases, targetValuation, forallF(fibration, sourceValuation, order));
      if (left !== right) return false;
    }
  }
  return true;
}

const requireFiniteAdjunctions = (fibration: PredicatingFiniteFibration, order: OrderName): void => {
  if (!checkExistsAdjunction(fibration, order) || !checkForallAdjunction(fibration, order)) {
    throw new TypeError(`predicating quantifier ${order}-order adjunction check failed`);
  }
};

function singletonFiberIdentity(fibration: PredicatingFiniteFibration, valuation: FiniteValuation, order: OrderName): boolean {
  const exists = existsF(fibration, valuation, order);
  const forall = forallF(fibration, valuation, order);
  return fibration.bases.every((base) => {
    const fiber = fibration.fibers[base] ?? [];
    return fiber.length !== 1 || (exists[base] === readValuation(valuation, fiber[0] as string) && forall[base] === readValuation(valuation, fiber[0] as string));
  });
}

export function predicatingQuantifyingReceipt(
  fibration: PredicatingFiniteFibration,
  valuation: FiniteValuation,
): PredicatingQuantifyingReceipt {
  requireFiniteAdjunctions(fibration, "knowledge");
  requireFiniteAdjunctions(fibration, "truth");
  return Object.freeze({
    kind: "predicating.quantifying.receipt:witness" as const,
    fibration,
    valuation: freezeRecord({ ...valuation }),
    existsKnowledge: existsF(fibration, valuation, "knowledge"),
    forallKnowledge: forallF(fibration, valuation, "knowledge"),
    existsTruth: existsF(fibration, valuation, "truth"),
    forallTruth: forallF(fibration, valuation, "truth"),
    emptyFiberExistsKnowledge: "absurd" as const,
    emptyFiberForallKnowledge: "stable" as const,
    emptyFiberExistsTruth: "active" as const,
    emptyFiberForallTruth: "potential" as const,
    singletonFiberIdentityKnowledge: singletonFiberIdentity(fibration, valuation, "knowledge"),
    singletonFiberIdentityTruth: singletonFiberIdentity(fibration, valuation, "truth"),
    knowledgeAdjunctionFinite: true as const,
    truthAdjunctionFinite: true as const,
  });
}

export function finiteConverseFibration(points: readonly string[], converseMap: Readonly<Record<string, string>>): PredicatingFiniteFibration {
  const fibration = finitePredicatingFibration(points, points, converseMap);
  const pointSet = new Set(fibration.points);
  for (const point of fibration.points) {
    const image = fibration.baseMap[point] as string;
    if (!pointSet.has(image) || fibration.baseMap[image] !== point) {
      throw new TypeError("finiteConverseFibration: converse map must be an involutive bijection");
    }
    if ((fibration.fibers[point] ?? []).length !== 1) {
      throw new TypeError("finiteConverseFibration: every converse fiber must be singleton");
    }
  }
  return fibration;
}

function meetValuation(order: OrderName, keys: readonly string[], left: FiniteValuation, right: FiniteValuation): FiniteValuation {
  const out: Record<string, ChargeValueName> = {};
  for (const key of keys) out[key] = chargeValueName(orderMeet(order, chargeValue(readValuation(left, key)), chargeValue(readValuation(right, key))));
  return freezeRecord(out);
}

function converseFrobenius(fibration: PredicatingFiniteFibration, order: OrderName, valuation: FiniteValuation): boolean {
  const alpha = valuation;
  const phi = reindexF(fibration, valuation);
  const left = reindexF(fibration, meetValuation(order, fibration.points, reindexF(fibration, alpha), phi));
  const right = meetValuation(order, fibration.points, alpha, reindexF(fibration, phi));
  return sameValuation(fibration.points, left, right);
}

export function predicatingHyperdoctrineReceipt(
  fibration: PredicatingFiniteFibration,
  valuation: FiniteValuation,
): PredicatingHyperdoctrineReceipt {
  const reindexed = reindexF(fibration, valuation);
  const reindexedTwice = reindexF(fibration, reindexed);
  const existsKnowledge = existsF(fibration, valuation, "knowledge");
  const forallKnowledge = forallF(fibration, valuation, "knowledge");
  const existsTruth = existsF(fibration, valuation, "truth");
  const forallTruth = forallF(fibration, valuation, "truth");
  if (!sameValuation(fibration.points, reindexedTwice, valuation)
    || !sameValuation(fibration.points, existsKnowledge, reindexed)
    || !sameValuation(fibration.points, forallKnowledge, reindexed)
    || !sameValuation(fibration.points, existsTruth, reindexed)
    || !sameValuation(fibration.points, forallTruth, reindexed)
    || !converseFrobenius(fibration, "knowledge", valuation)
    || !converseFrobenius(fibration, "truth", valuation)) {
    throw new TypeError("predicatingHyperdoctrineReceipt: converse laws failed");
  }
  return Object.freeze({
    kind: "predicating.hyperdoctrine.receipt:witness" as const,
    fibration,
    valuation: freezeRecord({ ...valuation }),
    reindexed,
    reindexedTwice,
    existsKnowledge,
    forallKnowledge,
    existsTruth,
    forallTruth,
    baseIsoInvolution: true as const,
    reindexConverseConverse: true as const,
    converseExistsIsReindexKnowledge: true as const,
    converseForallIsReindexKnowledge: true as const,
    converseExistsIsReindexTruth: true as const,
    converseForallIsReindexTruth: true as const,
    converseFrobeniusKnowledge: true as const,
    converseFrobeniusTruth: true as const,
    beckChevalleySelf: true as const,
  });
}

export function predicatingDualHyperdoctrineReceipt(
  fibration: PredicatingFiniteFibration,
  valuation: FiniteValuation,
): PredicatingDualHyperdoctrineReceipt {
  requireFiniteAdjunctions(fibration, "truth");
  const swappedValuation = swapValuation(valuation);
  const conjExists = swapValuation(existsF(fibration, swappedValuation, "knowledge"));
  const existsTruth = existsF(fibration, valuation, "truth");
  const conjForall = swapValuation(forallF(fibration, swappedValuation, "knowledge"));
  const forallTruth = forallF(fibration, valuation, "truth");
  const swappedTwice = swapValuation(swappedValuation);
  if (!sameValuation(fibration.points, swappedTwice, valuation)
    || !sameValuation(fibration.bases, conjExists, existsTruth)
    || !sameValuation(fibration.bases, conjForall, forallTruth)
    || !sameValuation(fibration.points, swapValuation(reindexF(fibration, swapValuation(existsTruth))), reindexF(fibration, existsTruth))) {
    throw new TypeError("predicatingDualHyperdoctrineReceipt: sigma transport laws failed");
  }
  return Object.freeze({
    kind: "predicating.hyperdoctrine.dual.receipt:witness" as const,
    fibration,
    valuation: freezeRecord({ ...valuation }),
    swappedValuation,
    conjExists,
    existsTruth,
    conjForall,
    forallTruth,
    swapInvolutive: true as const,
    conjExistsEqualsExistsTruth: true as const,
    conjForallEqualsForallTruth: true as const,
    conjReindexEqualsReindex: true as const,
    dualAdjointSystemFinite: true as const,
  });
}
