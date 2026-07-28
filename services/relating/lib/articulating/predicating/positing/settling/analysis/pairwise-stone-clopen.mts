/**
 * analysis/pairwise-stone-clopen - finite executable shadow of
 * RelMath.Cohomology.PairwiseStoneClopen.
 *
 * Lean proves the two-point paired Priestley / pairwise-Stone dual of FOUR:
 * points `{plus, minus}`, antichain order, swap involution, clopen up-sets as
 * boolean membership pairs, and the transport of swap to FOUR negation. This
 * module keeps exactly that finite carrier executable.
 */
import {
  asChargeValueName,
  chargeValue,
  chargeValueName,
  gauge,
  negateValue,
  type ChargeValueName,
} from "../../bilattice-charge.mjs";

export type StonePointName = "plus" | "minus";

export interface StonePoint {
  readonly kind: "pairwiseStone.point";
  readonly name: StonePointName;
}

export interface ClopenUp {
  readonly kind: "pairwiseStone.clopenUp";
  readonly plus: boolean;
  readonly minus: boolean;
}

export interface PairedPriestleyReceipt {
  readonly kind: "pairwiseStone.pairedPriestley:witness";
  readonly points: readonly StonePoint[];
  readonly order: readonly (readonly [StonePointName, StonePointName])[];
  readonly sigma: Readonly<Record<StonePointName, StonePointName>>;
  readonly reflexive: true;
  readonly transitive: true;
  readonly antisymmetric: true;
  readonly antichain: true;
  readonly sigmaInvolutive: true;
  readonly sigmaOrderReversing: true;
}

export interface ClopenLatticeReceipt {
  readonly kind: "pairwiseStone.clopenLattice:witness";
  readonly clopens: readonly ClopenUp[];
  readonly bottom: ClopenUp;
  readonly top: ClopenUp;
  readonly table: readonly {
    readonly clopen: ClopenUp;
    readonly members: readonly StonePointName[];
    readonly charge: ChargeValueName;
  }[];
  readonly everySubsetClopenUp: true;
  readonly meetCommutative: true;
  readonly joinCommutative: true;
  readonly absorption: true;
  readonly bounded: true;
}

export interface SwapNegationReceipt {
  readonly kind: "pairwiseStone.swapNegation:witness";
  readonly sigmaInvolutive: true;
  readonly clopenActionInvolutive: true;
  readonly transportedAsChargeNegation: true;
  readonly transportedAsGaugeNegation: true;
  readonly table: readonly {
    readonly clopen: ClopenUp;
    readonly sigmaAct: ClopenUp;
    readonly charge: ChargeValueName;
    readonly negatedCharge: ChargeValueName;
  }[];
}

export interface PairwiseTopologyReceipt {
  readonly kind: "pairwiseStone.topology:witness";
  readonly tauPlus: readonly ClopenUp[];
  readonly tauMinus: readonly ClopenUp[];
  readonly tauMinusIsSigmaImage: true;
  readonly finiteDiscrete: true;
  readonly orderRecoveredFromTauPlus: true;
}

export interface PairwiseStoneClopenReceipt {
  readonly kind: "pairwiseStoneClopen.receipt:witness";
  readonly space: PairedPriestleyReceipt;
  readonly lattice: ClopenLatticeReceipt;
  readonly swap: SwapNegationReceipt;
  readonly topology: PairwiseTopologyReceipt;
  readonly duality: "ClopenUp(FourDual) ~= FOUR";
  readonly openFrontier: readonly string[];
}

export const stonePointNames: readonly StonePointName[] = Object.freeze(["plus", "minus"] as const);

export const point = (name: StonePointName): StonePoint => Object.freeze({
  kind: "pairwiseStone.point" as const,
  name,
});

export const points: readonly StonePoint[] = Object.freeze(stonePointNames.map(point));

export const bot: ClopenUp = Object.freeze({
  kind: "pairwiseStone.clopenUp" as const,
  plus: false,
  minus: false,
});

export const top: ClopenUp = Object.freeze({
  kind: "pairwiseStone.clopenUp" as const,
  plus: true,
  minus: true,
});

export const clopenUp = (plus: boolean, minus: boolean): ClopenUp => Object.freeze({
  kind: "pairwiseStone.clopenUp" as const,
  plus,
  minus,
});

export const allClopens: readonly ClopenUp[] = Object.freeze([
  bot,
  clopenUp(true, false),
  clopenUp(false, true),
  top,
]);

const sameClopen = (left: ClopenUp, right: ClopenUp): boolean =>
  left.plus === right.plus && left.minus === right.minus;

const pointName = (value: StonePoint | StonePointName): StonePointName =>
  typeof value === "string" ? value : value.name;

export const le = (left: StonePoint | StonePointName, right: StonePoint | StonePointName): boolean =>
  pointName(left) === pointName(right);

export const sigma = (value: StonePoint | StonePointName): StonePointName =>
  pointName(value) === "plus" ? "minus" : "plus";

export const mem = (set: ClopenUp, value: StonePoint | StonePointName): boolean =>
  pointName(value) === "plus" ? set.plus : set.minus;

export const meet = (left: ClopenUp, right: ClopenUp): ClopenUp =>
  clopenUp(left.plus && right.plus, left.minus && right.minus);

export const join = (left: ClopenUp, right: ClopenUp): ClopenUp =>
  clopenUp(left.plus || right.plus, left.minus || right.minus);

export const sigmaAct = (set: ClopenUp): ClopenUp => clopenUp(set.minus, set.plus);

export function toChargeName(set: ClopenUp): ChargeValueName {
  if (set.plus && set.minus) return "stable";
  if (set.plus) return "potential";
  if (set.minus) return "active";
  return "absurd";
}

export function ofChargeName(value: string): ClopenUp {
  const name = asChargeValueName(value);
  if (name === "stable") return top;
  if (name === "potential") return clopenUp(true, false);
  if (name === "active") return clopenUp(false, true);
  return bot;
}

export const tauPlus: readonly ClopenUp[] = allClopens;
export const tauMinus: readonly ClopenUp[] = Object.freeze(tauPlus.map(sigmaAct));

const pairs = <T,>(items: readonly T[]): readonly (readonly [T, T])[] =>
  Object.freeze(items.flatMap((left) => items.map((right) => Object.freeze([left, right] as const))));

const triples = <T,>(items: readonly T[]): readonly (readonly [T, T, T])[] =>
  Object.freeze(items.flatMap((a) => items.flatMap((b) => items.map((c) => Object.freeze([a, b, c] as const)))));

const membersOf = (set: ClopenUp): readonly StonePointName[] =>
  Object.freeze(stonePointNames.filter((name) => mem(set, name)));

export function orderRecoveredFromTauPlus(left: StonePoint | StonePointName, right: StonePoint | StonePointName): boolean {
  const a = pointName(left);
  const b = pointName(right);
  const specialization = tauPlus.every((set) => !mem(set, a) || mem(set, b));
  return le(a, b) === specialization;
}

export function pairedPriestleyReceipt(): PairedPriestleyReceipt {
  const order = Object.freeze(
    pairs(stonePointNames)
      .filter(([left, right]) => le(left, right))
      .map(([left, right]) => Object.freeze([left, right] as const)),
  );
  const reflexive = stonePointNames.every((name) => le(name, name));
  const transitive = triples(stonePointNames).every(([a, b, c]) => !le(a, b) || !le(b, c) || le(a, c));
  const antisymmetric = pairs(stonePointNames).every(([a, b]) => !le(a, b) || !le(b, a) || a === b);
  const antichain = pairs(stonePointNames).every(([a, b]) => le(a, b) === (a === b));
  const sigmaInvolutive = stonePointNames.every((name) => sigma(sigma(name)) === name);
  const sigmaOrderReversing = pairs(stonePointNames).every(([a, b]) => !le(a, b) || le(sigma(b), sigma(a)));

  if (!reflexive || !transitive || !antisymmetric || !antichain || !sigmaInvolutive || !sigmaOrderReversing) {
    throw new TypeError("pairedPriestleyReceipt: two-point paired-Priestley laws failed");
  }

  return Object.freeze({
    kind: "pairwiseStone.pairedPriestley:witness" as const,
    points,
    order,
    sigma: Object.freeze({ plus: "minus", minus: "plus" } as const),
    reflexive: true as const,
    transitive: true as const,
    antisymmetric: true as const,
    antichain: true as const,
    sigmaInvolutive: true as const,
    sigmaOrderReversing: true as const,
  });
}

export function clopenLatticeReceipt(): ClopenLatticeReceipt {
  const meetCommutative = pairs(allClopens).every(([a, b]) => sameClopen(meet(a, b), meet(b, a)));
  const joinCommutative = pairs(allClopens).every(([a, b]) => sameClopen(join(a, b), join(b, a)));
  const absorption = pairs(allClopens).every(([a, b]) =>
    sameClopen(meet(a, join(a, b)), a) && sameClopen(join(a, meet(a, b)), a),
  );
  const bounded = allClopens.every((set) => sameClopen(meet(bot, set), bot) && sameClopen(join(top, set), top));
  const chargeRoundtrip = allClopens.every((set) => sameClopen(ofChargeName(toChargeName(set)), set));

  if (!meetCommutative || !joinCommutative || !absorption || !bounded || !chargeRoundtrip) {
    throw new TypeError("clopenLatticeReceipt: clopen-upset lattice laws failed");
  }

  return Object.freeze({
    kind: "pairwiseStone.clopenLattice:witness" as const,
    clopens: allClopens,
    bottom: bot,
    top,
    table: Object.freeze(allClopens.map((set) => Object.freeze({
      clopen: set,
      members: membersOf(set),
      charge: toChargeName(set),
    }))),
    everySubsetClopenUp: true as const,
    meetCommutative: true as const,
    joinCommutative: true as const,
    absorption: true as const,
    bounded: true as const,
  });
}

export function swapNegationReceipt(): SwapNegationReceipt {
  const sigmaInvolutive = stonePointNames.every((name) => sigma(sigma(name)) === name);
  const clopenActionInvolutive = allClopens.every((set) => sameClopen(sigmaAct(sigmaAct(set)), set));
  const transportedAsChargeNegation = allClopens.every((set) =>
    toChargeName(sigmaAct(set)) === chargeValueName(negateValue(chargeValue(toChargeName(set)))),
  );
  const transportedAsGaugeNegation = allClopens.every((set) =>
    toChargeName(sigmaAct(set)) === chargeValueName(gauge("negation", chargeValue(toChargeName(set)))),
  );

  if (!sigmaInvolutive || !clopenActionInvolutive || !transportedAsChargeNegation || !transportedAsGaugeNegation) {
    throw new TypeError("swapNegationReceipt: swap did not transport to FOUR negation");
  }

  return Object.freeze({
    kind: "pairwiseStone.swapNegation:witness" as const,
    sigmaInvolutive: true as const,
    clopenActionInvolutive: true as const,
    transportedAsChargeNegation: true as const,
    transportedAsGaugeNegation: true as const,
    table: Object.freeze(allClopens.map((set) => Object.freeze({
      clopen: set,
      sigmaAct: sigmaAct(set),
      charge: toChargeName(set),
      negatedCharge: toChargeName(sigmaAct(set)),
    }))),
  });
}

export function topologyReceipt(): PairwiseTopologyReceipt {
  const tauMinusIsSigmaImage = tauMinus.every((set, index) => sameClopen(set, sigmaAct(tauPlus[index] ?? bot)));
  const finiteDiscrete = tauPlus.length === 4 && tauMinus.length === 4;
  const orderRecovered = pairs(stonePointNames).every(([left, right]) => orderRecoveredFromTauPlus(left, right));

  if (!tauMinusIsSigmaImage || !finiteDiscrete || !orderRecovered) {
    throw new TypeError("topologyReceipt: pairwise-Stone topology laws failed");
  }

  return Object.freeze({
    kind: "pairwiseStone.topology:witness" as const,
    tauPlus,
    tauMinus,
    tauMinusIsSigmaImage: true as const,
    finiteDiscrete: true as const,
    orderRecoveredFromTauPlus: true as const,
  });
}

export function receipt(): PairwiseStoneClopenReceipt {
  return Object.freeze({
    kind: "pairwiseStoneClopen.receipt:witness" as const,
    space: pairedPriestleyReceipt(),
    lattice: clopenLatticeReceipt(),
    swap: swapNegationReceipt(),
    topology: topologyReceipt(),
    duality: "ClopenUp(FourDual) ~= FOUR" as const,
    openFrontier: Object.freeze([
      "General Jung-Rivieccio duality DBiLat^op ~= PairedPriSp is retained as Lean/proof-side structure.",
      "Non-finite compactness and total order-disconnectedness are not runtime obligations for the two-point discrete carrier.",
      "The RMN surface normalizes the finite receipt; it does not synthesize arbitrary Priestley spectra.",
    ]),
  });
}
