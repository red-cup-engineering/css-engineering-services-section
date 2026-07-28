/**
 * @packageDocumentation
 *
 * settling/optimization — the optimum IS the settling fixed point.
 *
 * The corpus's received-math `optimization` node says optimization "produces a
 * FIXED POINT … a point where no small change helps", requiring a measure and a
 * constraint. That fixed point is OUR settling / closure fixed point: optimization
 * is the settling dynamics read under a measure-and-constraint gloss. Ported from
 * `lean/RelMath/Value/Optimization.lean` over the value-category hub:
 *
 *   * a **measure** = the order `≤_V` of a {@link ValueCategory} (*better = higher*);
 *   * **constraints** = its carrier (the allowed system the operator acts within);
 *   * an **improvement** = a monotone, inflationary, idempotent endo on `V` — exactly
 *     a {@link VClosure}. The **optimum** is its fixed point, reached by `settle`.
 *
 * So an `OptimizationProblem` *is* a `ValueCategory` paired with a `VClosure`; its
 * `optimum` is the hub's `settleOverValue`. No solver is hidden here: callers supply
 * the order and lawful improvement closure, and the module returns carrier data plus
 * fixed-point / least-fixed-point witnesses. Every law is reused from the
 * value-category settle judgments.
 */
import {
  type ValueCategory,
  type VClosure,
  settleOverValue,
  settleFixedPoint,
  settleLeast,
  type SettleFixedPointJudgment,
  type SettleFixedPointWitness,
  type SettleLeastJudgment,
  type SettleLeastWitness,
} from "./value-category.mjs";

/** An **optimization problem**: a measure-and-constraint value category `V` and an
 * improvement operator (a value-category closure — monotone, inflationary,
 * idempotent). The optimum is the fixed point this improvement reaches. */
export interface OptimizationProblem<T> {
  readonly kind: "settling.optimizationProblem";
  /** The measure (`≤_V`, better = higher) and constraints (the carrier). */
  readonly V: ValueCategory<T>;
  /** The improvement operator — a value-category closure; its fixed point is the optimum. */
  readonly improve: VClosure<T>;
}

/** Construct an optimization problem from a value category and an improvement closure. */
export const optimizationProblem = <T,>(V: ValueCategory<T>, improve: VClosure<T>): OptimizationProblem<T> =>
  Object.freeze({ kind: "settling.optimizationProblem" as const, V, improve });

/** Read a `V`-settling as an optimization problem — a `VClosure` *is* an improvement
 * operator. (Lean `ofSettling`.) */
export const ofSettling = <T,>(V: ValueCategory<T>, improve: VClosure<T>): OptimizationProblem<T> =>
  optimizationProblem(V, improve);

/** The **optimum** of a problem from a seed: the fixed point the improvement reaches,
 * `optimum seed = settle seed = improve seed`. */
export const optimum = <T,>(p: OptimizationProblem<T>, seed: T): T => settleOverValue(p.improve, seed);

/** **Locally optimal** at `x`: the improvement makes no move (`improve x = x`) — the
 * corpus's *"no small change helps"*. */
export const locallyOptimal = <T,>(p: OptimizationProblem<T>, x: T): boolean => p.V.eq(p.improve.op(x), x);

/** Whether the optimum is **reachable** from the seed (`seed ≤_V optimum`) — true when
 * the improvement is inflationary (an improving move never retracts). */
export const optimumReachable = <T,>(p: OptimizationProblem<T>, seed: T): boolean =>
  p.V.le(seed, optimum(p, seed));

/** **The optimum is a fixed point (HEADLINE).** The corpus's *"optimization produces a
 * fixed-point"*: `improve (optimum seed) = optimum seed`. Reuses `settleFixedPoint`
 * (the improvement's idempotence). */
export const optimumIsFixedPoint = <T,>(p: OptimizationProblem<T>, seed: T): SettleFixedPointJudgment<T> =>
  settleFixedPoint(p.V, p.improve, seed);

/** A witness that a settling IS an optimization: the optimum is reachable, locally
 * optimal (a fixed point), and the least optimum above the seed. */
export interface SettlingIsOptimizationWitness<T> {
  readonly kind: "settling.settlingIsOptimization:witness";
  readonly optimum: T;
  /** `seed ≤_V optimum` — an improving move never retracts (inflation). */
  readonly reachable: boolean;
  /** `improve (optimum) = optimum` — no improving move remains (a fixed point). */
  readonly locallyOptimal: boolean;
  /** The least-fixed-point check against a candidate optimum `x ≥_V seed` with
   * `improve x = x`: witnesses `optimum ≤_V x` (the best reachable optimum). */
  readonly least: (bound: T) => SettleLeastJudgment<T>;
}

/** **A settling IS an optimization (HEADLINE).** For any value category `V`,
 * `V`-settling `improve`, and seed, the settled value is the OPTIMUM: reachable
 * (inflation), locally optimal (a fixed point — *no small change helps*), and the
 * LEAST such above the seed (`settleLeast`). So settling and optimization are the
 * same fixed-point-finding process, and the four-regime convergence dichotomy
 * classifies optimization convergence too. */
export function settlingIsOptimization<T>(V: ValueCategory<T>, improve: VClosure<T>, seed: T): SettlingIsOptimizationWitness<T> {
  const p = ofSettling(V, improve);
  return Object.freeze({
    kind: "settling.settlingIsOptimization:witness" as const,
    optimum: optimum(p, seed),
    reachable: optimumReachable(p, seed),
    locallyOptimal: locallyOptimal(p, optimum(p, seed)),
    least: (bound: T) => settleLeast(V, improve, seed, bound),
  });
}

/** A serializable receipt for `settling_is_optimization` at one candidate bound.
 * Unlike {@link settlingIsOptimization}, this contains no function fields, so it
 * can be normalized and transported as RMN data. */
export interface SettlingOptimizationReceiptWitness<T> {
  readonly kind: "settling.optimization:witness";
  readonly seed: T;
  readonly bound: T;
  readonly optimum: T;
  readonly reachable: true;
  readonly locallyOptimal: true;
  readonly fixedPoint: SettleFixedPointWitness<T>;
  readonly least: SettleLeastWitness<T>;
}

/** Obstruction form for a finite optimization receipt when one of the fixed-point
 * readings fails for the supplied bound. */
export interface SettlingOptimizationReceiptObstruction<T> {
  readonly kind: "settling.optimization-obstruction";
  readonly reason: "reachable" | "local-optimum" | "fixed-point" | "least";
  readonly seed: T;
  readonly bound: T;
  readonly optimum: T;
  readonly reachable: boolean;
  readonly locallyOptimal: boolean;
  readonly fixedPoint: SettleFixedPointJudgment<T>;
  readonly least: SettleLeastJudgment<T>;
}

export type SettlingOptimizationReceipt<T> =
  | SettlingOptimizationReceiptWitness<T>
  | SettlingOptimizationReceiptObstruction<T>;

/** **A settling is an optimization**, as a finite carrier receipt. Given a value
 * category, lawful improvement closure, seed, and candidate fixed-point bound,
 * the receipt witnesses that the settled value is reachable, locally optimal,
 * fixed by improvement, and least below the supplied bound. */
export function settlingOptimizationReceipt<T>(
  V: ValueCategory<T>,
  improve: VClosure<T>,
  seed: T,
  bound: T,
): SettlingOptimizationReceipt<T> {
  const p = ofSettling(V, improve);
  const optimumValue = optimum(p, seed);
  const reachable = optimumReachable(p, seed);
  const local = locallyOptimal(p, optimumValue);
  const fixedPoint = optimumIsFixedPoint(p, seed);
  const least = settleLeast(V, improve, seed, bound);
  if (reachable && local && fixedPoint.kind === "settling.valueCategory.settleFixedPoint:witness" && least.kind === "settling.valueCategory.settleLeast:witness") {
    return Object.freeze({
      kind: "settling.optimization:witness" as const,
      seed,
      bound,
      optimum: optimumValue,
      reachable: true as const,
      locallyOptimal: true as const,
      fixedPoint,
      least,
    });
  }
  return Object.freeze({
    kind: "settling.optimization-obstruction" as const,
    reason: !reachable ? "reachable" as const
      : !local ? "local-optimum" as const
        : fixedPoint.kind !== "settling.valueCategory.settleFixedPoint:witness" ? "fixed-point" as const
          : "least" as const,
    seed,
    bound,
    optimum: optimumValue,
    reachable,
    locallyOptimal: local,
    fixedPoint,
    least,
  });
}

/** **The metric (Lawvere-quantale `[0,∞]`) reading.** With the measure read as a
 * reversed distance and `improve` as *"relax toward shorter distance"*, the optimum
 * is the min / shortest-path fixed point: locally optimal, and the least optimum
 * above the seed. The `settlingIsOptimization` content under the metric gloss. */
export const metricOptimumIsMinFixedPoint = <T,>(p: OptimizationProblem<T>, seed: T, bound: T): SettleLeastJudgment<T> =>
  settleLeast(p.V, p.improve, seed, bound);
