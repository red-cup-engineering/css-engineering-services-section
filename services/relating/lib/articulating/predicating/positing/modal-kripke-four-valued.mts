/**
 * positing/modal-kripke-four-valued — finite FOUR-valued Kripke frames.
 *
 * Executable shadow of `RelMath.Positing.ModalKripkeFourValued`.
 *
 * The Lean carrier is a finite fibration whose fiber at a cell is the list of
 * cells accessible from it. Runtime parity stores that relation directly:
 * `accessibility[world] = accessible worlds`. Possibility is the knowledge join
 * over a fiber; necessity is the knowledge meet over a fiber.
 */
import {
  chargeValue,
  chargeValueName,
  chargeValueNames,
  joinKnowledgeValue,
  meetKnowledgeValue,
  negateValue,
  sameChargeValue,
  type ChargeValue,
  type ChargeValueName,
} from "./bilattice-charge.mjs";

export type KripkeFrameClass = "K" | "T" | "S4" | "S5";

export type KripkeValuation = Readonly<Record<string, ChargeValueName>>;

export interface ModalKripkeFrame {
  readonly kind: "positing.modalKripke.frame";
  readonly worlds: readonly string[];
  readonly accessibility: Readonly<Record<string, readonly string[]>>;
  readonly reflexive: boolean;
  readonly transitive: boolean;
  readonly symmetric: boolean;
  readonly frameClass: KripkeFrameClass;
}

export interface TwistSplit {
  readonly kind: "positing.modalKripke.twistSplit";
  readonly value: ChargeValueName;
  readonly positive: boolean;
  readonly negative: boolean;
}

export interface ModalKripkeReceipt {
  readonly kind: "positing.modalKripke.receipt:witness";
  readonly frame: ModalKripkeFrame;
  readonly valuation: KripkeValuation;
  readonly possibilized: KripkeValuation;
  readonly necessitated: KripkeValuation;
  readonly kPossibilizeMonotone: true;
  readonly kNecessitateMonotone: true;
  readonly tPossibilizeInflationary: boolean;
  readonly tNecessitateDeflationary: boolean;
  readonly s4BoxInterior: boolean;
  readonly s4DiamondClosure: boolean;
  readonly s4BoxIdempotent: boolean;
  readonly s4DiamondIdempotent: boolean;
  readonly s5ForgetsToS4: boolean;
  readonly s5PossibilizeAdjointNecessitate: boolean;
  readonly s5Commutating: boolean;
  readonly s5ClosureEqualsPossibilize: boolean;
  readonly s5ClosureInflationary: boolean;
  readonly s5ClosureMonotone: boolean;
  readonly s5ClosureIdempotent: boolean;
  readonly hierarchy: readonly KripkeFrameClass[];
  readonly twistSplit: readonly TwistSplit[];
  readonly twistSplitNegate: true;
}

export interface ModalPairAdjunctionReceipt {
  readonly kind: "positing.modalPairAdjunction.receipt:witness";
  readonly theorem:
    | "RelMath.Valuation.ModalFrame.possibilize_adjoint_necessitate"
    | "RelMath.Valuation.ModalFrame.closureOp_is_closure";
  readonly frame: ModalKripkeFrame;
  readonly valuation: KripkeValuation;
  readonly possibilized: KripkeValuation;
  readonly necessitated: KripkeValuation;
  readonly closure: KripkeValuation;
  readonly modalFrameS5: true;
  readonly possibilizeInflationary: true;
  readonly necessitateDeflationary: true;
  readonly possibilizeMonotone: true;
  readonly necessitateMonotone: true;
  readonly possibilizeAdjointNecessitate: true;
  readonly adjunctionUnit: true;
  readonly adjunctionCounit: true;
  readonly necessitatePossibilizeLe: true;
  readonly closureEqualsPossibilize: true;
  readonly closureInflationary: true;
  readonly closureMonotone: true;
  readonly closureIdempotent: true;
  readonly settled: KripkeValuation;
  readonly settleFixed: true;
  readonly settleLeast: true;
}

const freezeRecord = <T,>(record: Record<string, T>): Readonly<Record<string, T>> => Object.freeze({ ...record });

const unique = (values: readonly string[]): boolean => new Set(values).size === values.length;

const readValuation = (valuation: KripkeValuation, world: string): ChargeValueName => valuation[world] ?? "absurd";

function knowledgeJoinList(values: readonly ChargeValue[]): ChargeValue {
  return values.reduce((acc, value) => joinKnowledgeValue(acc, value), chargeValue("absurd"));
}

function knowledgeMeetList(values: readonly ChargeValue[]): ChargeValue {
  return values.reduce((acc, value) => meetKnowledgeValue(acc, value), chargeValue("stable"));
}

const leqKnowledgeValue = (left: ChargeValueName, right: ChargeValueName): boolean =>
  sameChargeValue(joinKnowledgeValue(chargeValue(left), chargeValue(right)), chargeValue(right));

const leqValuationKnowledge = (worlds: readonly string[], left: KripkeValuation, right: KripkeValuation): boolean =>
  worlds.every((world) => leqKnowledgeValue(readValuation(left, world), readValuation(right, world)));

const sameValuation = (worlds: readonly string[], left: KripkeValuation, right: KripkeValuation): boolean =>
  worlds.every((world) => readValuation(left, world) === readValuation(right, world));

function classifyFrame(reflexive: boolean, transitive: boolean, symmetric: boolean): KripkeFrameClass {
  if (reflexive && transitive && symmetric) return "S5";
  if (reflexive && transitive) return "S4";
  if (reflexive) return "T";
  return "K";
}

export function modalKripkeFrame(
  worlds: readonly string[],
  accessibility: Readonly<Record<string, readonly string[]>>,
): ModalKripkeFrame {
  if (!unique(worlds)) throw new TypeError("modalKripkeFrame: duplicate worlds are not a finite carrier");
  const worldSet = new Set(worlds);
  const relation: Record<string, readonly string[]> = {};
  for (const world of worlds) {
    const fiber = accessibility[world] ?? [];
    if (!unique(fiber)) throw new TypeError(`modalKripkeFrame: duplicate accessibility entries from ${world}`);
    for (const target of fiber) {
      if (!worldSet.has(target)) throw new TypeError(`modalKripkeFrame: ${target} is not a world`);
    }
    relation[world] = Object.freeze([...fiber]);
  }

  const accesses = (from: string, to: string): boolean => (relation[from] ?? []).includes(to);
  const reflexive = worlds.every((world) => accesses(world, world));
  const transitive = worlds.every((from) =>
    (relation[from] ?? []).every((mid) =>
      (relation[mid] ?? []).every((to) => accesses(from, to)),
    ),
  );
  const symmetric = worlds.every((from) => (relation[from] ?? []).every((to) => accesses(to, from)));

  return Object.freeze({
    kind: "positing.modalKripke.frame" as const,
    worlds: Object.freeze([...worlds]),
    accessibility: freezeRecord(relation),
    reflexive,
    transitive,
    symmetric,
    frameClass: classifyFrame(reflexive, transitive, symmetric),
  });
}

export function possibilize(frame: ModalKripkeFrame, valuation: KripkeValuation): KripkeValuation {
  const out: Record<string, ChargeValueName> = {};
  for (const world of frame.worlds) {
    const values = (frame.accessibility[world] ?? []).map((target) => chargeValue(readValuation(valuation, target)));
    out[world] = chargeValueName(knowledgeJoinList(values));
  }
  return freezeRecord(out);
}

export function necessitate(frame: ModalKripkeFrame, valuation: KripkeValuation): KripkeValuation {
  const out: Record<string, ChargeValueName> = {};
  for (const world of frame.worlds) {
    const values = (frame.accessibility[world] ?? []).map((target) => chargeValue(readValuation(valuation, target)));
    out[world] = chargeValueName(knowledgeMeetList(values));
  }
  return freezeRecord(out);
}

export function closureOp(frame: ModalKripkeFrame, valuation: KripkeValuation): KripkeValuation {
  return necessitate(frame, possibilize(frame, valuation));
}

function* valuations(worlds: readonly string[]): Generator<KripkeValuation> {
  function* go(index: number, record: Record<string, ChargeValueName>): Generator<KripkeValuation> {
    if (index === worlds.length) {
      yield freezeRecord(record);
      return;
    }
    const world = worlds[index] as string;
    for (const value of chargeValueNames) {
      record[world] = value;
      yield* go(index + 1, record);
    }
    delete record[world];
  }
  yield* go(0, {});
}

function requireExhaustiveWorlds(frame: ModalKripkeFrame): void {
  if (frame.worlds.length > 5) {
    throw new RangeError("modalKripkeReceipt: exhaustive FOUR-valued law checks are limited to at most 5 worlds");
  }
}

function checkKMonotone(frame: ModalKripkeFrame, op: (frame: ModalKripkeFrame, valuation: KripkeValuation) => KripkeValuation): boolean {
  for (const left of valuations(frame.worlds)) {
    for (const right of valuations(frame.worlds)) {
      if (leqValuationKnowledge(frame.worlds, left, right)
        && !leqValuationKnowledge(frame.worlds, op(frame, left), op(frame, right))) {
        return false;
      }
    }
  }
  return true;
}

function checkTInflation(frame: ModalKripkeFrame): readonly [diamond: boolean, box: boolean] {
  if (!frame.reflexive) return Object.freeze([false, false] as const);
  for (const valuation of valuations(frame.worlds)) {
    if (!leqValuationKnowledge(frame.worlds, valuation, possibilize(frame, valuation))) return Object.freeze([false, false] as const);
    if (!leqValuationKnowledge(frame.worlds, necessitate(frame, valuation), valuation)) return Object.freeze([false, false] as const);
  }
  return Object.freeze([true, true] as const);
}

function checkS4Idempotence(frame: ModalKripkeFrame): readonly [box: boolean, diamond: boolean] {
  if (!frame.reflexive || !frame.transitive) return Object.freeze([false, false] as const);
  for (const valuation of valuations(frame.worlds)) {
    const box = necessitate(frame, valuation);
    const diamond = possibilize(frame, valuation);
    if (!sameValuation(frame.worlds, necessitate(frame, box), box)) return Object.freeze([false, false] as const);
    if (!sameValuation(frame.worlds, possibilize(frame, diamond), diamond)) return Object.freeze([false, false] as const);
  }
  return Object.freeze([true, true] as const);
}

function checkS5Adjunction(frame: ModalKripkeFrame): boolean {
  if (frame.frameClass !== "S5") return false;
  for (const left of valuations(frame.worlds)) {
    for (const right of valuations(frame.worlds)) {
      const diamondBelow = leqValuationKnowledge(frame.worlds, possibilize(frame, left), right);
      const belowBox = leqValuationKnowledge(frame.worlds, left, necessitate(frame, right));
      if (diamondBelow !== belowBox) return false;
    }
  }
  return true;
}

function checkS5Commutating(frame: ModalKripkeFrame): boolean {
  if (frame.frameClass !== "S5") return false;
  for (const valuation of valuations(frame.worlds)) {
    if (!leqValuationKnowledge(
      frame.worlds,
      possibilize(frame, necessitate(frame, valuation)),
      necessitate(frame, possibilize(frame, valuation)),
    )) return false;
  }
  return true;
}

function checkS5Closure(frame: ModalKripkeFrame): readonly [
  equalsPossibilize: boolean,
  inflationary: boolean,
  monotone: boolean,
  idempotent: boolean,
] {
  if (frame.frameClass !== "S5") return Object.freeze([false, false, false, false] as const);

  let equalsPossibilize = true;
  let inflationary = true;
  let idempotent = true;
  for (const valuation of valuations(frame.worlds)) {
    const closed = closureOp(frame, valuation);
    if (!sameValuation(frame.worlds, closed, possibilize(frame, valuation))) equalsPossibilize = false;
    if (!leqValuationKnowledge(frame.worlds, valuation, closed)) inflationary = false;
    if (!sameValuation(frame.worlds, closureOp(frame, closed), closed)) idempotent = false;
  }

  let monotone = true;
  for (const left of valuations(frame.worlds)) {
    for (const right of valuations(frame.worlds)) {
      if (leqValuationKnowledge(frame.worlds, left, right)
        && !leqValuationKnowledge(frame.worlds, closureOp(frame, left), closureOp(frame, right))) {
        monotone = false;
      }
    }
  }

  return Object.freeze([equalsPossibilize, inflationary, monotone, idempotent] as const);
}

function checkAdjunctionUnit(frame: ModalKripkeFrame): boolean {
  if (frame.frameClass !== "S5") return false;
  return [...valuations(frame.worlds)].every((valuation) =>
    leqValuationKnowledge(frame.worlds, valuation, necessitate(frame, possibilize(frame, valuation))),
  );
}

function checkAdjunctionCounit(frame: ModalKripkeFrame): boolean {
  if (frame.frameClass !== "S5") return false;
  return [...valuations(frame.worlds)].every((valuation) =>
    leqValuationKnowledge(frame.worlds, possibilize(frame, necessitate(frame, valuation)), valuation),
  );
}

function checkSettledLeast(frame: ModalKripkeFrame, seed: KripkeValuation): boolean {
  const settled = closureOp(frame, seed);
  return sameValuation(frame.worlds, closureOp(frame, settled), settled)
    && [...valuations(frame.worlds)].every((candidate) =>
      !(leqValuationKnowledge(frame.worlds, seed, candidate)
        && sameValuation(frame.worlds, closureOp(frame, candidate), candidate))
      || leqValuationKnowledge(frame.worlds, settled, candidate),
    );
}

export function twistSplit(value: ChargeValueName): TwistSplit {
  const charge = chargeValue(value);
  return Object.freeze({
    kind: "positing.modalKripke.twistSplit" as const,
    value,
    positive: charge.coordinates[0].name === "present",
    negative: charge.coordinates[1].name === "present",
  });
}

const checkTwistSplitNegate = (): boolean =>
  chargeValueNames.every((name) => {
    const original = twistSplit(name);
    const negated = twistSplit(chargeValueName(negateValue(chargeValue(name))));
    return negated.positive === original.negative && negated.negative === original.positive;
  });

export function modalKripkeReceipt(frame: ModalKripkeFrame, valuation: KripkeValuation): ModalKripkeReceipt {
  requireExhaustiveWorlds(frame);
  const kPossibilizeMonotone = checkKMonotone(frame, possibilize);
  const kNecessitateMonotone = checkKMonotone(frame, necessitate);
  const [tPossibilizeInflationary, tNecessitateDeflationary] = checkTInflation(frame);
  const [s4BoxIdempotent, s4DiamondIdempotent] = checkS4Idempotence(frame);
  const [s5ClosureEqualsPossibilize, s5ClosureInflationary, s5ClosureMonotone, s5ClosureIdempotent] = checkS5Closure(frame);
  if (!kPossibilizeMonotone || !kNecessitateMonotone || !checkTwistSplitNegate()) {
    throw new TypeError("modalKripkeReceipt: finite modal law checks failed");
  }
  return Object.freeze({
    kind: "positing.modalKripke.receipt:witness" as const,
    frame,
    valuation: freezeRecord({ ...valuation }),
    possibilized: possibilize(frame, valuation),
    necessitated: necessitate(frame, valuation),
    kPossibilizeMonotone: true as const,
    kNecessitateMonotone: true as const,
    tPossibilizeInflationary,
    tNecessitateDeflationary,
    s4BoxInterior: s4BoxIdempotent && tNecessitateDeflationary,
    s4DiamondClosure: s4DiamondIdempotent && tPossibilizeInflationary,
    s4BoxIdempotent,
    s4DiamondIdempotent,
    s5ForgetsToS4: frame.frameClass === "S5" ? frame.reflexive && frame.transitive : false,
    s5PossibilizeAdjointNecessitate: checkS5Adjunction(frame),
    s5Commutating: checkS5Commutating(frame),
    s5ClosureEqualsPossibilize,
    s5ClosureInflationary,
    s5ClosureMonotone,
    s5ClosureIdempotent,
    hierarchy: Object.freeze(["K", "T", "S4", "S5"] as const),
    twistSplit: Object.freeze(chargeValueNames.map(twistSplit)),
    twistSplitNegate: true as const,
  });
}

/** Bundle the finite Node shadow of `RelMath.Closure.ModalPairAdjunction`. */
export function modalPairAdjunctionReceipt(frame: ModalKripkeFrame, valuation: KripkeValuation): ModalPairAdjunctionReceipt {
  requireExhaustiveWorlds(frame);
  if (frame.frameClass !== "S5") {
    throw new TypeError("modalPairAdjunctionReceipt: RelMath modal pair adjunction requires an S5/equivalence frame");
  }
  const base = modalKripkeReceipt(frame, valuation);
  const unit = checkAdjunctionUnit(frame);
  const counit = checkAdjunctionCounit(frame);
  const settleLeast = checkSettledLeast(frame, valuation);
  if (!base.tPossibilizeInflationary || !base.tNecessitateDeflationary
    || !base.kPossibilizeMonotone || !base.kNecessitateMonotone
    || !base.s5PossibilizeAdjointNecessitate || !unit || !counit
    || !base.s5Commutating || !base.s5ClosureEqualsPossibilize
    || !base.s5ClosureInflationary || !base.s5ClosureMonotone
    || !base.s5ClosureIdempotent || !settleLeast) {
    throw new TypeError("modalPairAdjunctionReceipt: finite modal-pair laws failed");
  }

  return Object.freeze({
    kind: "positing.modalPairAdjunction.receipt:witness" as const,
    theorem: "RelMath.Valuation.ModalFrame.closureOp_is_closure" as const,
    frame,
    valuation: freezeRecord({ ...valuation }),
    possibilized: base.possibilized,
    necessitated: base.necessitated,
    closure: closureOp(frame, valuation),
    modalFrameS5: true as const,
    possibilizeInflationary: true as const,
    necessitateDeflationary: true as const,
    possibilizeMonotone: true as const,
    necessitateMonotone: true as const,
    possibilizeAdjointNecessitate: true as const,
    adjunctionUnit: true as const,
    adjunctionCounit: true as const,
    necessitatePossibilizeLe: true as const,
    closureEqualsPossibilize: true as const,
    closureInflationary: true as const,
    closureMonotone: true as const,
    closureIdempotent: true as const,
    settled: closureOp(frame, valuation),
    settleFixed: true as const,
    settleLeast: true as const,
  });
}
