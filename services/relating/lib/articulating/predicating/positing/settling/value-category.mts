/**
 * settling/value-category — settling over a value category `V` (the universal `F_U` over `V`).
 *
 * The spine settles **charges**: the closure `cl = ◇∘□` iterates on the FOUR
 * bilattice to its fixed point. The corpus's `continuous-valued-settling` node
 * generalizes this — settling is parametric in a **value category** `V`, and the
 * *same* settling dynamics run over any complete/residuated lattice of values
 * (the Lawvere quantale, a continuous lattice, fuzzy `[0,1]`, the four-valued
 * bilattice FOUR, or the Boolean `{0,1}`). Settling is the universal closure `F_U`
 * *over* `V`. Ported faithfully from `lean/RelMath/Value/SettlingOverValueCategory.lean`
 * (and the slice of `ClosureOrdinalRegime.lean` it depends on) into the relating
 * substrate — relating's settling was hardwired to the `Charge`/`Valuation`
 * bilattice; this is the layer that lets a settling run over an arbitrary `V`.
 *
 * The corpus's key claim is a **uniformity**: the four-regime stratification of the
 * closure ordinal `κ` — strict(finite) / Scott / transfinite-bounded / aperiodic —
 * is **`V`-independent**. Which regime a settling lands in is decided by `κ`
 * (equivalently by the decidable `ClosureRegimeData`), and that decision never
 * looks at `V`. `V = {0,1}` (Boolean) and `V = FOUR` (Charge) both recover the
 * standard bilattice settling spine.
 *
 * No free data. relating's `ClosureRegime` values are reused, not re-introduced.
 * The Lean carries each structure's laws as proof fields; the faithful TS analog
 * is (a) **finite-exhaustion law judgments** (`partialOrderOver`, `closureOver`)
 * that witness the laws over a sample — the full carrier for a finite `V`, exactly
 * the `decide` the Lean uses — and (b) **smart constructors** that *refuse* to
 * admit data violating the corpus constraints (`closureRegimeData` rejects a finite
 * base that is not Scott-continuous / countably-cofinal, so an invalid datum is
 * unconstructible, as the Lean's proof fields make it). Formalizes
 * `content/.../settling/content/continuous-valued-settling/continuous-valued-settling.md`.
 *
 * This is a finite/sample-checked Node surface. It does not implement a full
 * continuous quantale runtime or prove laws for arbitrary host functions.
 *
 * @packageDocumentation
 */
import {
  type ClosureRegime,
  finiteClosureRegime,
  scottClosureRegime,
  transfiniteClosureRegime,
  aperiodicClosureRegime,
} from "./closure.mjs";
import {
  type ChargeValue,
  chargeValue,
  chargeValues,
  sameChargeValue,
  joinKnowledgeValue,
} from "../bilattice-charge.mjs";

/* ──────────────────────────────────────────────────────────────────────────
 * (A) The value category `V`
 *
 * An abstract value category over which settling runs: a carrier with a partial
 * order (`le` reflexive/transitive/antisymmetric) and a seed `bot` (the
 * knowledge-least value `⊥` settling climbs from). The corpus's `V` is a
 * complete/residuated lattice of values; we carry exactly the
 * partial-order-with-seed structure the `V`-independence claim quantifies over.
 * ────────────────────────────────────────────────────────────────────────── */

/** A **value category** `V`: a carrier `T` with a partial order `le`, an equality
 * `eq`, and a seed value `bot`. `le` is required to be a partial order (reflexive,
 * transitive, antisymmetric w.r.t. `eq`) — witnessed for a finite `V` by
 * {@link partialOrderOver}. The corpus's value category settling runs over. */
export interface ValueCategory<T> {
  readonly kind: "settling.valueCategory";
  /** The value order `≤_V`. */
  readonly le: (left: T, right: T) => boolean;
  /** Equality on values (the antisymmetry codomain). */
  readonly eq: (left: T, right: T) => boolean;
  /** The seed value `⊥` settling climbs from. */
  readonly bot: T;
}

/** Construct a value category from its order, equality, and seed. */
export const valueCategory = <T,>(
  le: (left: T, right: T) => boolean,
  eq: (left: T, right: T) => boolean,
  bot: T,
): ValueCategory<T> => Object.freeze({ kind: "settling.valueCategory" as const, le, eq, bot });

/** A witness that `le` is a partial order over a sample (every checked triple
 * satisfies reflexivity, transitivity, antisymmetry). For a finite `V` pass the
 * whole carrier — this is the decision the Lean's `le_refl/le_trans/le_antisymm`
 * proof fields make. */
export interface PartialOrderWitness<T> {
  readonly kind: "settling.valueCategory.partialOrder:witness";
  readonly sample: readonly T[];
}

/** An obstruction to `le` being a partial order: a sample point/pair/triple that
 * breaks one of the three laws. */
export interface PartialOrderObstruction<T> {
  readonly kind: "settling.valueCategory.partialOrder-obstruction";
  readonly law: "reflexive" | "transitive" | "antisymmetric";
  readonly points: readonly T[];
}

/** The result of checking the partial-order laws over a sample. */
export type PartialOrderJudgment<T> = PartialOrderWitness<T> | PartialOrderObstruction<T>;

/** Check that a value category's `le` is a partial order over a finite sample
 * (the full carrier, for a finite `V`). Reflexive at each point; transitive over
 * each ordered triple; antisymmetric (`le a b ∧ le b a → eq a b`) over each pair. */
export function partialOrderOver<T>(V: ValueCategory<T>, sample: readonly T[]): PartialOrderJudgment<T> {
  for (const a of sample) {
    if (!V.le(a, a)) return Object.freeze({ kind: "settling.valueCategory.partialOrder-obstruction" as const, law: "reflexive", points: Object.freeze([a]) });
  }
  for (const a of sample) for (const b of sample) {
    if (V.le(a, b) && V.le(b, a) && !V.eq(a, b)) {
      return Object.freeze({ kind: "settling.valueCategory.partialOrder-obstruction" as const, law: "antisymmetric", points: Object.freeze([a, b]) });
    }
    for (const c of sample) {
      if (V.le(a, b) && V.le(b, c) && !V.le(a, c)) {
        return Object.freeze({ kind: "settling.valueCategory.partialOrder-obstruction" as const, law: "transitive", points: Object.freeze([a, b, c]) });
      }
    }
  }
  return Object.freeze({ kind: "settling.valueCategory.partialOrder:witness" as const, sample: Object.freeze([...sample]) });
}

/* ──────────────────────────────────────────────────────────────────────────
 * (B) The `V`-enriched closure operator and its settling
 *
 * A `VClosure` is the `V`-enriched closure the corpus iterates: an endo `op` on
 * `V` that is inflationary (`v ≤ op v` — the unit η, no value retracted), monotone
 * (2-functoriality), and idempotent (`op (op v) = op v` — the multiplication μ).
 * Its least fixed point is the settling `F_U` over `V`.
 * ────────────────────────────────────────────────────────────────────────── */

/** A **`V`-enriched closure operator**: the endomap `op` settling iterates. Required
 * inflationary + monotone + idempotent in the `V`-order — witnessed for a finite `V`
 * by {@link closureOver}. The same closure-operator shape as the spine's charge
 * closure, generalized over the value category. */
export interface VClosure<T> {
  readonly kind: "settling.vClosure";
  /** The closure endomap `cl`. */
  readonly op: (value: T) => T;
}

/** Construct a `V`-enriched closure from its endomap. */
export const vClosure = <T,>(op: (value: T) => T): VClosure<T> => Object.freeze({ kind: "settling.vClosure" as const, op });

/** A witness that `op` is a closure (inflationary, monotone, idempotent) over a sample. */
export interface ClosureLawWitness<T> {
  readonly kind: "settling.vClosure.law:witness";
  readonly sample: readonly T[];
}

/** An obstruction to `op` being a closure: a sample point/pair breaking one law. */
export interface ClosureLawObstruction<T> {
  readonly kind: "settling.vClosure.law-obstruction";
  readonly law: "inflationary" | "monotone" | "idempotent";
  readonly points: readonly T[];
}

/** The result of checking the closure laws over a sample. */
export type ClosureLawJudgment<T> = ClosureLawWitness<T> | ClosureLawObstruction<T>;

/** Check that a `VClosure` is inflationary, monotone, and idempotent over a finite
 * sample (the full carrier, for a finite `V`) — the decision the Lean's
 * `infl/mono/idem` proof fields make. */
export function closureOver<T>(V: ValueCategory<T>, T_: VClosure<T>, sample: readonly T[]): ClosureLawJudgment<T> {
  for (const a of sample) {
    if (!V.le(a, T_.op(a))) return Object.freeze({ kind: "settling.vClosure.law-obstruction" as const, law: "inflationary", points: Object.freeze([a]) });
    if (!V.eq(T_.op(T_.op(a)), T_.op(a))) return Object.freeze({ kind: "settling.vClosure.law-obstruction" as const, law: "idempotent", points: Object.freeze([a]) });
  }
  for (const a of sample) for (const b of sample) {
    if (V.le(a, b) && !V.le(T_.op(a), T_.op(b))) {
      return Object.freeze({ kind: "settling.vClosure.law-obstruction" as const, law: "monotone", points: Object.freeze([a, b]) });
    }
  }
  return Object.freeze({ kind: "settling.vClosure.law:witness" as const, sample: Object.freeze([...sample]) });
}

/** The **settling** of a value under a `V`-closure: its fixed point from a seed,
 * `settle v = cl v`. The universal `F_U` over `V`, evaluated at `v`. (Named
 * `settleOverValue` to avoid colliding with the spine's charge-level `settle`.) */
export const settleOverValue = <T,>(T_: VClosure<T>, value: T): T => T_.op(value);

/** A witness that the settled value is a fixed point (Knaster–Tarski, closure form,
 * over `V`): `cl (settle v) = settle v`. */
export interface SettleFixedPointWitness<T> {
  readonly kind: "settling.valueCategory.settleFixedPoint:witness";
  readonly seed: T;
  readonly settled: T;
}

/** An obstruction: the settled value is not a fixed point (a closure-law violation). */
export interface SettleFixedPointObstruction<T> {
  readonly kind: "settling.valueCategory.settleFixedPoint-obstruction";
  readonly seed: T;
  readonly settled: T;
  readonly resettled: T;
}

/** The result of checking the settled value is a fixed point. */
export type SettleFixedPointJudgment<T> = SettleFixedPointWitness<T> | SettleFixedPointObstruction<T>;

/** **The settling is a fixed point.** Witnesses `cl (settle v) = settle v` (the
 * closure's idempotence). */
export function settleFixedPoint<T>(V: ValueCategory<T>, T_: VClosure<T>, value: T): SettleFixedPointJudgment<T> {
  const settled = settleOverValue(T_, value);
  const resettled = T_.op(settled);
  return V.eq(resettled, settled)
    ? Object.freeze({ kind: "settling.valueCategory.settleFixedPoint:witness" as const, seed: value, settled })
    : Object.freeze({ kind: "settling.valueCategory.settleFixedPoint-obstruction" as const, seed: value, settled, resettled });
}

/** A witness that the settling is the **least** fixed point above the seed: for a
 * given fixed point `x ≥_V seed`, `settle seed ≤_V x`. */
export interface SettleLeastWitness<T> {
  readonly kind: "settling.valueCategory.settleLeast:witness";
  readonly seed: T;
  readonly settled: T;
  readonly bound: T;
}

/** An obstruction to the least-fixed-point property, or to its hypotheses. */
export interface SettleLeastObstruction<T> {
  readonly kind: "settling.valueCategory.settleLeast-obstruction";
  readonly reason: "seed-not-below-bound" | "bound-not-fixed" | "settled-not-below-bound";
  readonly seed: T;
  readonly settled: T;
  readonly bound: T;
}

/** The result of checking the least-fixed-point property against a candidate bound. */
export type SettleLeastJudgment<T> = SettleLeastWitness<T> | SettleLeastObstruction<T>;

/** **The settling is the least fixed point above the seed.** Given a candidate `x`
 * with `seed ≤_V x` and `op x = x`, witnesses `settle seed ≤_V x` — the
 * least-upper-bound character of the settled value. Refuses the check when its
 * hypotheses fail (so the witness genuinely certifies the least-fixed-point law). */
export function settleLeast<T>(V: ValueCategory<T>, T_: VClosure<T>, seed: T, bound: T): SettleLeastJudgment<T> {
  const settled = settleOverValue(T_, seed);
  if (!V.le(seed, bound)) return Object.freeze({ kind: "settling.valueCategory.settleLeast-obstruction" as const, reason: "seed-not-below-bound" as const, seed, settled, bound });
  if (!V.eq(T_.op(bound), bound)) return Object.freeze({ kind: "settling.valueCategory.settleLeast-obstruction" as const, reason: "bound-not-fixed" as const, seed, settled, bound });
  if (!V.le(settled, bound)) return Object.freeze({ kind: "settling.valueCategory.settleLeast-obstruction" as const, reason: "settled-not-below-bound" as const, seed, settled, bound });
  return Object.freeze({ kind: "settling.valueCategory.settleLeast:witness" as const, seed, settled, bound });
}

/* ──────────────────────────────────────────────────────────────────────────
 * (C) The decidable regime characterization, and the `V`-independent classifier
 *
 * Lean core / relating have no transfinite ordinals, so the regime is decided by
 * the corpus's equivalent decidable data: three Boolean flags — is the closure
 * Scott-continuous, is the base finite, is the cofinality countable — with two
 * corpus constraints (a finite base forces Scott-continuity AND countable
 * cofinality). `classifyRegime` reads only this data; `regimeOfValueSettling`
 * takes `V` and the closure purely as ignored parameters — that *is* the
 * `V`-independence.
 * ────────────────────────────────────────────────────────────────────────── */

/** The decidable characterization of a settling's closure ordinal `κ`: whether the
 * closure is Scott-continuous, whether the base `(L,E,C)` is finite, whether the
 * cofinality is countable. Constructed only through {@link closureRegimeData},
 * which enforces the corpus constraints, so an invalid datum is unconstructible. */
export interface ClosureRegimeData {
  readonly kind: "settling.closureRegimeData";
  readonly scottContinuous: boolean;
  readonly finiteBase: boolean;
  readonly countableCofinality: boolean;
}

/** A witness admitting valid regime data. */
export interface ClosureRegimeDataWitness {
  readonly kind: "settling.closureRegimeData:witness";
  readonly data: ClosureRegimeData;
}

/** An obstruction: data violating a corpus constraint (a finite base that is not
 * Scott-continuous, or not countably cofinal). */
export interface ClosureRegimeDataObstruction {
  readonly kind: "settling.closureRegimeData-obstruction";
  readonly constraint: "finiteBase→scottContinuous" | "finiteBase→countableCofinality";
}

/** The result of admitting regime data. */
export type ClosureRegimeDataJudgment = ClosureRegimeDataWitness | ClosureRegimeDataObstruction;

/** Admit regime data, enforcing the corpus constraints `finiteBase → scottContinuous`
 * and `finiteBase → countableCofinality` (a finite base forces both). Returns an
 * obstruction rather than admitting invalid data — the runtime analog of the Lean's
 * `fin_scott` / `fin_cof` proof fields. */
export function closureRegimeData(scottContinuous: boolean, finiteBase: boolean, countableCofinality: boolean): ClosureRegimeDataJudgment {
  if (finiteBase && !scottContinuous) return Object.freeze({ kind: "settling.closureRegimeData-obstruction" as const, constraint: "finiteBase→scottContinuous" });
  if (finiteBase && !countableCofinality) return Object.freeze({ kind: "settling.closureRegimeData-obstruction" as const, constraint: "finiteBase→countableCofinality" });
  return Object.freeze({ kind: "settling.closureRegimeData:witness" as const, data: Object.freeze({ kind: "settling.closureRegimeData" as const, scottContinuous, finiteBase, countableCofinality }) });
}

/** **Classify** regime data into its regime via the corpus equivalences: strict
 * (finite, `κ<ω`) if the base is finite; else Scott (`κ=ω`) if Scott-continuous;
 * else transfinite-bounded (`ω<κ<ω₁`) if countably cofinal; else aperiodic (`κ≥ω₁`).
 * Reuses relating's existing `ClosureRegime` values. */
export function classifyRegime(d: ClosureRegimeData): ClosureRegime {
  if (d.finiteBase) return finiteClosureRegime;
  if (d.scottContinuous) return scottClosureRegime;
  if (d.countableCofinality) return transfiniteClosureRegime;
  return aperiodicClosureRegime;
}

/** The four-regime dichotomy carrier: the classified regime and the four mutually
 * exclusive corpus conditions, exactly one of which holds. */
export interface FourRegimeDichotomy {
  readonly kind: "settling.fourRegimeDichotomy";
  readonly data: ClosureRegimeData;
  readonly regime: ClosureRegime;
  /** strict ⟺ finite base. */
  readonly strict: boolean;
  /** Scott ⟺ Scott-continuous ∧ ¬finite base. */
  readonly scott: boolean;
  /** transfinite-bounded ⟺ ¬Scott-continuous ∧ countable cofinality. */
  readonly transfiniteBounded: boolean;
  /** aperiodic ⟺ ¬Scott-continuous ∧ ¬countable cofinality. */
  readonly aperiodic: boolean;
  /** Whether exactly one condition holds and it matches `regime` (always true for
   * data admitted through {@link closureRegimeData}). */
  readonly exclusiveAndExhaustive: boolean;
}

/** **The four-regime dichotomy.** For any regime data, the classifier lands in one
 * of the four regimes and each is selected by exactly its corpus condition — the
 * four conditions mutually exclusive and jointly exhaustive. */
export function fourRegimeDichotomy(d: ClosureRegimeData): FourRegimeDichotomy {
  const strict = d.finiteBase;
  const scott = d.scottContinuous && !d.finiteBase;
  const transfiniteBounded = !d.scottContinuous && d.countableCofinality;
  const aperiodic = !d.scottContinuous && !d.countableCofinality;
  const regime = classifyRegime(d);
  const flags = [strict, scott, transfiniteBounded, aperiodic];
  const exactlyOne = flags.filter(Boolean).length === 1;
  const matches =
    (strict && regime === finiteClosureRegime)
    || (scott && regime === scottClosureRegime)
    || (transfiniteBounded && regime === transfiniteClosureRegime)
    || (aperiodic && regime === aperiodicClosureRegime);
  return Object.freeze({
    kind: "settling.fourRegimeDichotomy" as const,
    data: d, regime, strict, scott, transfiniteBounded, aperiodic,
    exclusiveAndExhaustive: exactlyOne && matches,
  });
}

/** **The regime of a settling over `V`, factored through `κ`'s data only.** Takes
 * the value category and the closure as parameters it *ignores*: `regimeOfValueSettling
 * V T d = classifyRegime d`. This is the `V`-independence — the function does not
 * read `V` or `T`. */
export function regimeOfValueSettling<T>(_V: ValueCategory<T>, _T: VClosure<T>, d: ClosureRegimeData): ClosureRegime {
  return classifyRegime(d);
}

/** A witness that `regimeOfValueSettling` is independent of `V` and the closure: the
 * regime depends only on `d`. */
export interface ValueIndependentRegimeWitness {
  readonly kind: "settling.valueIndependentRegime:witness";
  readonly data: ClosureRegimeData;
  readonly regime: ClosureRegime;
  readonly dichotomy: FourRegimeDichotomy;
}

/** **The four-regime classification is `V`-independent (HEADLINE).** For any value
 * category `V₁,V₂` and closures `T₁,T₂`, `regimeOfValueSettling` on the same data is
 * identical (it is `classifyRegime d` regardless of `V`/`T`), and the full
 * {@link fourRegimeDichotomy} holds. So the strict/Scott/transfinite/aperiodic
 * classification is `V`-parametric in statement but `V`-independent in content —
 * decided by the closure ordinal `κ` alone. Checks the independence across the two
 * supplied instances and returns the shared regime + dichotomy. */
export function fourRegimeValueIndependent<A, B>(
  V1: ValueCategory<A>, T1: VClosure<A>,
  V2: ValueCategory<B>, T2: VClosure<B>,
  d: ClosureRegimeData,
): ValueIndependentRegimeWitness | { readonly kind: "settling.valueIndependentRegime-obstruction"; readonly left: ClosureRegime; readonly right: ClosureRegime } {
  const left = regimeOfValueSettling(V1, T1, d);
  const right = regimeOfValueSettling(V2, T2, d);
  if (left !== right) return Object.freeze({ kind: "settling.valueIndependentRegime-obstruction" as const, left, right });
  return Object.freeze({ kind: "settling.valueIndependentRegime:witness" as const, data: d, regime: left, dichotomy: fourRegimeDichotomy(d) });
}

/** Whether the settling-associated sheaf's `H¹` vanishes in a regime: `true` in the
 * strict and Scott regimes, `false` in the transfinite-bounded and aperiodic regimes
 * (where the cohomological content concentrates). The corpus's regime-dependent
 * cohomology table — the structural ground of "no-arbitrage = H¹ = 0" in the settled
 * regimes. */
export function cohomologyVanishesInRegime(regime: ClosureRegime): boolean {
  return regime === finiteClosureRegime || regime === scottClosureRegime;
}

/* ──────────────────────────────────────────────────────────────────────────
 * (D) Boolean `{0,1}` and FOUR (Charge) recover the spine
 *
 * `V = Bool` and `V = ChargeValue` are both value categories, and the standard
 * bilattice settling is the `V = FOUR` case: a charge join-closure is a `VClosure`
 * over `chargeValueCategory` whose settle from the seed reaches the target.
 * ────────────────────────────────────────────────────────────────────────── */

/** Value-level knowledge order on charges: `a ≤ₖ b ⇔ a ∨ₖ b = b`. */
const chargeKnowledgeLeq = (left: ChargeValue, right: ChargeValue): boolean =>
  sameChargeValue(joinKnowledgeValue(left, right), right);

/** **`V = FOUR` is a value category.** The bilattice `ChargeValue` read as a value
 * category: order the knowledge order `≤ₖ`, equality `sameChargeValue`, seed the
 * knowledge-bottom `absurd` (`⊥ₖ`). The value category the spine settles over. */
export const chargeValueCategory: ValueCategory<ChargeValue> =
  valueCategory(chargeKnowledgeLeq, sameChargeValue, chargeValue("absurd"));

/** The full charge carrier (the four values) — the finite sample the law judgments
 * exhaust over. */
export const chargeSample: readonly ChargeValue[] = chargeValues;

/** **Lift a charge knowledge-join to a `VClosure` over `V = FOUR`.** `op a = k ∨ₖ a`
 * (possibilize toward `k`) is inflationary, monotone, and idempotent in `≤ₖ` — the
 * canonical charge settling closure. Settling `⊥ₖ` under it reaches `k`. */
export const chargeJoinVClosure = (k: ChargeValue): VClosure<ChargeValue> =>
  vClosure((a) => joinKnowledgeValue(k, a));

/** **`V = {0,1}` is a value category.** Boolean read as a value category: order
 * `a ≤ b ⇔ ¬a ∨ b`, equality `===`, seed `false` (`⊥`). The minimal value category
 * the regime claim quantifies over. */
export const booleanValueCategory: ValueCategory<boolean> =
  valueCategory((a, b) => !a || b, (a, b) => a === b, false);

/** The full Boolean carrier — the sample the law judgments exhaust over. */
export const booleanSample: readonly boolean[] = Object.freeze([false, true]);

/** A boolean join-closure `op a = k ∨ a` — the `V = {0,1}` settling toward `k`. */
export const booleanJoinVClosure = (k: boolean): VClosure<boolean> => vClosure((a) => k || a);

/** **Both `{0,1}` and FOUR recover the spine (HEADLINE).** Bundles the recovery:
 * `chargeValueCategory` and `booleanValueCategory` are genuine value categories (the
 * partial-order laws hold over their full finite carriers); a charge join-closure is
 * a genuine `VClosure` over FOUR (the closure laws hold over the four values); and
 * its settling from the seed `⊥ₖ` reaches the target `k` (`settle_kBot`) — the
 * standard bilattice settling is the `V = FOUR` case of settling-over-`V`. Returns
 * the law judgments and the worked `settle ⊥ₖ = k` check for a chosen target. */
export interface SpineRecoveryWitness {
  readonly kind: "settling.spineRecovery:witness";
  readonly chargePartialOrder: PartialOrderJudgment<ChargeValue>;
  readonly booleanPartialOrder: PartialOrderJudgment<boolean>;
  readonly chargeClosureLaws: ClosureLawJudgment<ChargeValue>;
  readonly settledTarget: ChargeValue;
  readonly reachesTarget: boolean;
}

/** Witness the spine recovery for a chosen target charge `k`: the value-category and
 * closure laws over the finite carriers, and `settleOverValue (k ∨ₖ ·) ⊥ₖ = k`. */
export function spineRecovery(k: ChargeValue): SpineRecoveryWitness {
  const closure = chargeJoinVClosure(k);
  const settled = settleOverValue(closure, chargeValueCategory.bot);
  return Object.freeze({
    kind: "settling.spineRecovery:witness" as const,
    chargePartialOrder: partialOrderOver(chargeValueCategory, chargeSample),
    booleanPartialOrder: partialOrderOver(booleanValueCategory, booleanSample),
    chargeClosureLaws: closureOver(chargeValueCategory, closure, chargeSample),
    settledTarget: k,
    reachesTarget: sameChargeValue(settled, k),
  });
}

/* ──────────────────────────────────────────────────────────────────────────
 * (E) Exact discrete dequantization: Nat support to Boolean existence
 *
 * RelMath.Value.Dequantization proves that `supp n = (0 < n)` is a semiring
 * homomorphism from the counting face `(Nat,+,*)` to the Boolean idempotent
 * face `(Bool,∨,∧)`. The runtime surface checks the finite Nat sample the
 * caller supplies and carries the corpus diamond's `|Apex| = 5 ↦ true` read.
 * ────────────────────────────────────────────────────────────────────────── */

export interface CountingDequantizationReceipt {
  readonly kind: "settling.dequantization.counting:witness";
  readonly sample: readonly number[];
  readonly support: readonly boolean[];
  readonly boolStochIdempotent: true;
  readonly natStochNotIdempotent: true;
  readonly mapsZero: true;
  readonly mapsOne: true;
  readonly mapsAddToOr: true;
  readonly mapsMulToAnd: true;
  readonly monotone: true;
  readonly diamondApexCount: 5;
  readonly diamondApexSupport: true;
  readonly exactDiscreteEndpoint: true;
  readonly continuousMaslovFrontier: "real-power interpolation remains proof/frontier work";
}

export interface MagnitudeWitnessReceipt {
  readonly kind: "settling.dequantization.magnitudeWitness:witness";
  readonly theoremSuppBlindToDvd: "RelMath.Dequantization.supp_blind_to_dvd";
  readonly theoremWitnessOne: "RelMath.Dequantization.witness_one";
  readonly theoremWitnessZero: "RelMath.Dequantization.witness_zero";
  readonly theoremDiamondBoundaryWitness: "RelMath.Dequantization.diamond_boundary_witness";
  readonly theoremDiamondInteriorNoWitness: "RelMath.Dequantization.diamond_interior_no_witness";
  readonly divisor: number;
  readonly divisibleMagnitude: number;
  readonly nondivisibleMagnitude: number;
  readonly supportDivisible: true;
  readonly supportNondivisible: true;
  readonly supportSame: true;
  readonly divisibleWitness: false;
  readonly nondivisibleWitness: true;
  readonly witnessOne: true;
  readonly witnessZero: false;
  readonly diamondBoundaryMagnitude: 1;
  readonly diamondInteriorMagnitude: 0;
  readonly diamondBoundaryWitness: true;
  readonly diamondInteriorWitness: false;
  readonly dequantizationForgetsDivisibility: true;
}

const assertNaturalNumber = (value: number, label: string): number => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label}: expected a safe natural number`);
  }
  return value;
};

/** The support map `supp n = (0 < n)`: magnitude to existence. */
export function support(n: number): boolean {
  return 0 < assertNaturalNumber(n, "support");
}

export function divides(divisor: number, magnitude: number): boolean {
  const d = assertNaturalNumber(divisor, "divides.divisor");
  const c = assertNaturalNumber(magnitude, "divides.magnitude");
  return d === 0 ? c === 0 : c % d === 0;
}

/** The non-divisibility witness `D ∤ C`: magnitude information Boolean support forgets. */
export function magnitudeWitness(divisor: number, magnitude: number): boolean {
  return !divides(divisor, magnitude);
}

const booleanAdd = (left: boolean, right: boolean): boolean => left || right;
const booleanMul = (left: boolean, right: boolean): boolean => left && right;
const boolLe = (left: boolean, right: boolean): boolean => booleanAdd(left, right) === right;

export function countingDequantizationReceipt(sampleInput: readonly number[] = Object.freeze([0, 1, 2, 3, 5])): CountingDequantizationReceipt {
  const sample = Object.freeze([...sampleInput].map((value) => assertNaturalNumber(value, "countingDequantizationReceipt.sample")));
  if (!sample.includes(0) || !sample.includes(1)) {
    throw new TypeError("countingDequantizationReceipt: sample must include 0 and 1");
  }
  const supports = Object.freeze(sample.map(support));
  const boolStochIdempotent = [false, true].every((value) => booleanAdd(value, value) === value);
  const natStochNotIdempotent = 1 + 1 !== 1;
  const mapsZero = support(0) === false;
  const mapsOne = support(1) === true;
  const mapsAddToOr = sample.every((a) => sample.every((b) =>
    support(a + b) === booleanAdd(support(a), support(b))));
  const mapsMulToAnd = sample.every((a) => sample.every((b) =>
    support(a * b) === booleanMul(support(a), support(b))));
  const monotone = sample.every((a) => sample.every((b) =>
    !(a <= b) || boolLe(support(a), support(b))));
  const diamondApexCount = 5;
  const diamondApexSupport = support(diamondApexCount);

  if (!boolStochIdempotent || !natStochNotIdempotent || !mapsZero || !mapsOne || !mapsAddToOr || !mapsMulToAnd || !monotone || !diamondApexSupport) {
    throw new TypeError("countingDequantizationReceipt: support homomorphism laws failed");
  }

  return Object.freeze({
    kind: "settling.dequantization.counting:witness" as const,
    sample,
    support: supports,
    boolStochIdempotent: true as const,
    natStochNotIdempotent: true as const,
    mapsZero: true as const,
    mapsOne: true as const,
    mapsAddToOr: true as const,
    mapsMulToAnd: true as const,
    monotone: true as const,
    diamondApexCount: 5 as const,
    diamondApexSupport: true as const,
    exactDiscreteEndpoint: true as const,
    continuousMaslovFrontier: "real-power interpolation remains proof/frontier work" as const,
  });
}

/** Bundle the finite Node shadow of `RelMath.Value.MagnitudeWitness`. */
export function magnitudeWitnessReceipt(divisorInput = 2): MagnitudeWitnessReceipt {
  const divisor = assertNaturalNumber(divisorInput, "magnitudeWitnessReceipt.divisor");
  if (divisor < 2) throw new RangeError("magnitudeWitnessReceipt: divisor must be at least 2");

  const divisibleMagnitude = divisor;
  const nondivisibleMagnitude = divisor + 1;
  const supportDivisible = support(divisibleMagnitude);
  const supportNondivisible = support(nondivisibleMagnitude);
  const supportSame = supportDivisible === supportNondivisible;
  const divisibleWitness = magnitudeWitness(divisor, divisibleMagnitude);
  const nondivisibleWitness = magnitudeWitness(divisor, nondivisibleMagnitude);
  const witnessOne = magnitudeWitness(divisor, 1);
  const witnessZero = magnitudeWitness(divisor, 0);
  const diamondBoundaryMagnitude = 1;
  const diamondInteriorMagnitude = 0;
  const diamondBoundaryWitness = magnitudeWitness(divisor, diamondBoundaryMagnitude);
  const diamondInteriorWitness = magnitudeWitness(divisor, diamondInteriorMagnitude);

  if (
    !supportDivisible ||
    !supportNondivisible ||
    !supportSame ||
    divisibleWitness !== false ||
    nondivisibleWitness !== true ||
    witnessOne !== true ||
    witnessZero !== false ||
    diamondBoundaryWitness !== true ||
    diamondInteriorWitness !== false
  ) {
    throw new TypeError("magnitudeWitnessReceipt: finite magnitude witness laws failed");
  }

  return Object.freeze({
    kind: "settling.dequantization.magnitudeWitness:witness" as const,
    theoremSuppBlindToDvd: "RelMath.Dequantization.supp_blind_to_dvd" as const,
    theoremWitnessOne: "RelMath.Dequantization.witness_one" as const,
    theoremWitnessZero: "RelMath.Dequantization.witness_zero" as const,
    theoremDiamondBoundaryWitness: "RelMath.Dequantization.diamond_boundary_witness" as const,
    theoremDiamondInteriorNoWitness: "RelMath.Dequantization.diamond_interior_no_witness" as const,
    divisor,
    divisibleMagnitude,
    nondivisibleMagnitude,
    supportDivisible: true as const,
    supportNondivisible: true as const,
    supportSame: true as const,
    divisibleWitness: false as const,
    nondivisibleWitness: true as const,
    witnessOne: true as const,
    witnessZero: false as const,
    diamondBoundaryMagnitude: 1 as const,
    diamondInteriorMagnitude: 0 as const,
    diamondBoundaryWitness: true as const,
    diamondInteriorWitness: false as const,
    dequantizationForgetsDivisibility: true as const,
  });
}
