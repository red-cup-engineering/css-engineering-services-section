/**
 * @packageDocumentation
 *
 * settling/stochastic — settling over the stochastic semiring (Markov, martingale).
 *
 * The value-category hub runs settling over any `V`. Its `stochastic-settling`
 * child takes `V` to be the **stochastic semiring** `([0,1], ·, +)` — `·` as
 * probability along a path, `+` as the convex combine over alternative paths — and
 * the canonical instance is Markov-chain transition settling: a finite state space,
 * a transition kernel `P`, and the closure step `T_stoch(v)(s,o) = Σ_z v(s,z)·P(z,o)`
 * (one matrix multiply). The **stationary distribution** `π` (with `π·P = π`) is the
 * settling's fixed point. Ported from `lean/RelMath/Probability/Stochastic.lean`.
 *
 * No reals, no rationals: the probability semiring is taken **abstractly** (a carrier
 * with `0/1/+/·` and a partial order), and the canonical `Nat` (counting-weight)
 * instance reuses relating's exact-number arithmetic. The Perron–Frobenius/stationary
 * content is structural over the abstract value. The headline finance reading: a
 * **martingale = a stationary process = a stochastic-closure fixed point** — the
 * substrate of the no-arbitrage / risk-neutral measure (FTAP).
 */
import {
  type ValueCategory,
  type VClosure,
  valueCategory,
  vClosure,
  regimeOfValueSettling,
  fourRegimeValueIndependent,
  type ClosureRegimeData,
  type ValueIndependentRegimeWitness,
} from "./value-category.mjs";
import { type ClosureRegime } from "./closure.mjs";
import {
  type Natural,
  type Rational,
  fromRatio,
  natZero,
  natOne,
  natAdd,
  natMultiply,
  natLeq,
  natEqual,
  ratZero,
  ratOne,
  ratAdd,
  ratMultiply,
  ratEqual,
  ratCompare,
} from "./analysis/exact-number.mjs";

/** An **abstract stochastic semiring** `V`: the value structure stochastic settling
 * runs over — a carrier with `zero`/`one`/`add` (convex combine)/`mul` (sequential
 * probability) and a partial order `le`/`eq`. The corpus's `([0,1], ·, +)` taken at
 * the order-theoretic level the stationary/closure statements need (no reals). */
export interface StochSemiring<C> {
  readonly kind: "settling.stochSemiring";
  readonly zero: C;
  readonly one: C;
  readonly add: (left: C, right: C) => C;
  readonly mul: (left: C, right: C) => C;
  readonly le: (left: C, right: C) => boolean;
  readonly eq: (left: C, right: C) => boolean;
}

/** Construct a stochastic semiring from its operations. */
export const stochSemiring = <C,>(
  zero: C, one: C,
  add: (l: C, r: C) => C, mul: (l: C, r: C) => C,
  le: (l: C, r: C) => boolean, eq: (l: C, r: C) => boolean,
): StochSemiring<C> => Object.freeze({ kind: "settling.stochSemiring" as const, zero, one, add, mul, le, eq });

/** **The `Nat` stochastic semiring (counting weights).** The canonical concrete
 * instance over relating's exact `Natural`: the no-reals model of probability
 * weights, where counting measure `μ(A) = |A|` lives. */
export const natStochSemiring: StochSemiring<Natural> =
  stochSemiring(natZero, natOne, natAdd, natMultiply, natLeq, natEqual);

/** The exact rational stochastic semiring used by finite probability witnesses. */
export const ratStochSemiring: StochSemiring<Rational> =
  stochSemiring(
    ratZero,
    ratOne,
    ratAdd,
    ratMultiply,
    (left, right) => ratCompare(left, right) <= 0,
    ratEqual,
  );

/** A **Markov kernel** on a finite state space `S` valued in `V`: a transition kernel
 * `P : S → S → V` with a finite enumeration `states` (the list the matrix-multiply
 * sum ranges over). */
export interface MarkovKernel<S, C> {
  readonly kind: "settling.markovKernel";
  readonly states: readonly S[];
  readonly P: (z: S, o: S) => C;
}

/** Construct a Markov kernel from its state enumeration and transition kernel. */
export const markovKernel = <S, C>(states: readonly S[], P: (z: S, o: S) => C): MarkovKernel<S, C> =>
  Object.freeze({ kind: "settling.markovKernel" as const, states, P });

/** Weighted sum over the state enumeration `Σ_{z ∈ states} f z` (foldr add zero). */
export const kernelSum = <S, C>(K: MarkovKernel<S, C>, V: StochSemiring<C>, f: (z: S) => C): C =>
  K.states.reduceRight((acc, z) => V.add(f(z), acc), V.zero);

/** **Row action of the kernel on a distribution** `(advance π)(o) = Σ_z π z · P(z,o)`
 * — the stochastic vector-matrix product `π · P`. `π` is stationary iff `advance π = π`. */
export const advance = <S, C>(K: MarkovKernel<S, C>, V: StochSemiring<C>, pi: (z: S) => C) =>
  (o: S): C => kernelSum(K, V, (z) => V.mul(pi(z), K.P(z, o)));

/** **The stochastic closure** `T_stoch(v)(s,o) = Σ_z v(s,z)·P(z,o)` — one Markov
 * advance (matrix multiply on the right). Iterating gives `v_k = P^k`; its fixed
 * point is the stationary settling. */
export const stochClosure = <S, C>(K: MarkovKernel<S, C>, V: StochSemiring<C>, v: (s: S, z: S) => C) =>
  (s: S, o: S): C => kernelSum(K, V, (z) => V.mul(v(s, z), K.P(z, o)));

/** **`π` is a stationary distribution of `K`**: `∀ o, Σ_z π z · P z o = π o` (`π·P = π`
 * over the listed states). The defining equation of a Markov stationary distribution. */
export const isStationary = <S, C>(K: MarkovKernel<S, C>, V: StochSemiring<C>, pi: (z: S) => C): boolean =>
  K.states.every((o) => V.eq(advance(K, V, pi)(o), pi(o)));

/** Whether each origin row of a finite Markov kernel sums to the stochastic unit. */
export const rowsSumToOne = <S, C>(K: MarkovKernel<S, C>, V: StochSemiring<C>): boolean =>
  K.states.every((origin) => V.eq(kernelSum(K, V, (destination) => K.P(origin, destination)), V.one));

/** Detailed balance: `pi z * P z o = pi o * P o z` for every pair of states. */
export const detailedBalance = <S, C>(K: MarkovKernel<S, C>, V: StochSemiring<C>, pi: (z: S) => C): boolean =>
  K.states.every((z) => K.states.every((o) => V.eq(V.mul(pi(z), K.P(z, o)), V.mul(pi(o), K.P(o, z)))));

export interface DetailedBalanceStationaryWitness {
  readonly kind: "settling.detailedBalanceImpliesStationary:witness";
  readonly detailedBalance: boolean;
  readonly rowsSumToOne: boolean;
  readonly stationary: boolean;
  readonly implicationHolds: boolean;
}

/** Finite detailed-balance witness: detailed balance plus stochastic rows give stationarity. */
export function detailedBalanceImpliesStationary<S, C>(
  K: MarkovKernel<S, C>,
  V: StochSemiring<C>,
  pi: (z: S) => C,
): DetailedBalanceStationaryWitness {
  const balanced = detailedBalance(K, V, pi);
  const stochasticRows = rowsSumToOne(K, V);
  const stationary = isStationary(K, V, pi);
  return Object.freeze({
    kind: "settling.detailedBalanceImpliesStationary:witness" as const,
    detailedBalance: balanced,
    rowsSumToOne: stochasticRows,
    stationary,
    implicationHolds: !(balanced && stochasticRows) || stationary,
  });
}

/** A witness identifying Markov-stationary with the stochastic-closure fixed point. */
export interface StationaryFixpointWitness<S> {
  readonly kind: "settling.markovStationaryIsClosureFixpoint:witness";
  /** `π · P = π` over the listed states. */
  readonly stationary: boolean;
  /** `T_stoch π = π` over the listed states — the *same* equation. */
  readonly fixpoint: boolean;
  /** Whether the two readings agree (always true: they are one defining equation). */
  readonly equivalent: boolean;
}

/** **Markov stationary = stochastic-closure fixed point (HEADLINE).** A distribution
 * `π` is stationary iff it is a fixed point of the stochastic closure on `π` — the
 * *same* equation `advance π = π`. So a Markov stationary distribution **is** a
 * stochastic-settling fixed point (and a martingale, read on the value side). */
export function markovStationaryIsClosureFixpoint<S, C>(K: MarkovKernel<S, C>, V: StochSemiring<C>, pi: (z: S) => C): StationaryFixpointWitness<S> {
  const stationary = isStationary(K, V, pi);
  const fixpoint = K.states.every((o) => V.eq(advance(K, V, pi)(o), pi(o)));
  return Object.freeze({
    kind: "settling.markovStationaryIsClosureFixpoint:witness" as const,
    stationary, fixpoint, equivalent: stationary === fixpoint,
  });
}

/** **A stochastic semiring is a hub value category.** `stochVC V` reads `V`'s
 * partial-order-with-seed (`le`/`eq`, seed `0`) as a {@link ValueCategory}, so all of
 * the value-category hub (including the four-regime classification) applies to
 * stochastic settling. */
export const stochVC = <C,>(V: StochSemiring<C>): ValueCategory<C> => valueCategory(V.le, V.eq, V.zero);

/** **The value-level stochastic closure** (the quiescent identity endo on `V`): a
 * `VClosure` over `stochVC V` whose settling is the value itself — witnessing that
 * `stochVC V` admits a closure, so the four-regime classification applies. */
export const stochVClosure = <C,>(_V: StochSemiring<C>): VClosure<C> => vClosure((v) => v);

/** **The doubly-stochastic 2-state witness kernel** (Perron–Frobenius existence
 * witness): over `natStochSemiring`, states `[0,1]`, the identity transition
 * `P z o = (z = o ? 1 : 0)` — every row and column sums to `1`. */
export const witnessKernel: MarkovKernel<number, Natural> =
  markovKernel([0, 1], (z, o) => (z === o ? natOne : natZero));

/** **The uniform distribution on the 2-state witness** `π s = 1` — the stationary
 * distribution for the identity kernel. */
export const uniformWitness = (_s: number): Natural => natOne;

/** **Perron–Frobenius existence (concrete witness): the uniform distribution is
 * stationary.** For the doubly-stochastic `witnessKernel`, `π · P = π` (each column
 * sums to `1`). A settling fixed point exists — proved with no reals. */
export const uniformWitnessStationary = (): boolean =>
  isStationary(witnessKernel, natStochSemiring, uniformWitness);

/** RelMath's finite exact-rational two-state Poisson-settling kernel. */
export const poissonKernel: MarkovKernel<number, Rational> =
  markovKernel([0, 1], (origin, destination) => {
    if (origin === 0 && destination === 0) return fromRatio(1, 2);
    if (origin === 0 && destination === 1) return fromRatio(1, 2);
    if (origin === 1 && destination === 0) return fromRatio(1, 4);
    return fromRatio(3, 4);
  });

/** Stationary distribution for {@link poissonKernel}: `[1/3, 2/3]`. */
export const poissonPi = (state: number): Rational => (state === 0 ? fromRatio(1, 3) : fromRatio(2, 3));

const factorial = (n: number): number => {
  let product = 1;
  for (let i = 2; i <= n; i += 1) product *= i;
  return product;
};

/** Native finite arithmetic shadow of the Poisson detailed-balance identity. */
export function poissonDetailedBalance(lambda: number, n: number): boolean {
  if (!Number.isSafeInteger(lambda) || !Number.isSafeInteger(n) || lambda < 0 || n < 0) return false;
  const left = (lambda ** n / factorial(n)) * lambda;
  const right = lambda ** (n + 1) / factorial(n + 1) * (n + 1);
  return left === right;
}

export interface PoissonSettlingWitness {
  readonly kind: "settling.poissonSettling:witness";
  readonly detailedBalance: boolean;
  readonly rowsSumToOne: boolean;
  readonly stationary: boolean;
  readonly fixpoint: boolean;
  readonly equivalent: boolean;
  readonly detailedBalanceImpliesStationary: DetailedBalanceStationaryWitness;
}

/** Finite exact-rational receipt for `RelMath.Probability.PoissonSettling`. */
export function poissonSettlingReceipt(): PoissonSettlingWitness {
  const fixpoint = markovStationaryIsClosureFixpoint(poissonKernel, ratStochSemiring, poissonPi);
  return Object.freeze({
    kind: "settling.poissonSettling:witness" as const,
    detailedBalance: detailedBalance(poissonKernel, ratStochSemiring, poissonPi),
    rowsSumToOne: rowsSumToOne(poissonKernel, ratStochSemiring),
    stationary: isStationary(poissonKernel, ratStochSemiring, poissonPi),
    fixpoint: fixpoint.fixpoint,
    equivalent: fixpoint.equivalent,
    detailedBalanceImpliesStationary: detailedBalanceImpliesStationary(poissonKernel, ratStochSemiring, poissonPi),
  });
}

/** A witness that stochastic settling is a hub `V`-settling: the four-regime
 * classification applies `V`-independently, and a stationary settling exists. */
export interface StochasticIsValueSettlingWitness {
  readonly kind: "settling.stochasticIsValueSettling:witness";
  readonly regime: ClosureRegime;
  readonly regimeIndependent: ValueIndependentRegimeWitness | { readonly kind: "settling.valueIndependentRegime-obstruction"; readonly left: ClosureRegime; readonly right: ClosureRegime };
  readonly stationaryExists: boolean;
}

/** **Stochastic settling IS a hub `V`-settling (HEADLINE).** For any stochastic
 * semiring `V` and regime data `d`: (a) `stochVC V` is a value category carrying
 * `stochVClosure V`, so its regime is `regimeOfValueSettling` — `V`-independent and
 * agreeing with FOUR's regime via {@link fourRegimeValueIndependent}; and (b)
 * Perron–Frobenius existence holds concretely (the uniform distribution is a
 * stationary stochastic-closure fixed point). So stochastic settling is the hub's
 * settling at the stochastic semiring, the four-regime stratification applies, and a
 * stationary settling provably exists. */
export function stochasticIsValueSettling<C>(V: StochSemiring<C>, d: ClosureRegimeData): StochasticIsValueSettlingWitness {
  const vc = stochVC(V);
  const cl = stochVClosure(V);
  return Object.freeze({
    kind: "settling.stochasticIsValueSettling:witness" as const,
    regime: regimeOfValueSettling(vc, cl, d),
    regimeIndependent: fourRegimeValueIndependent(vc, cl, stochVC(natStochSemiring), stochVClosure(natStochSemiring), d),
    stationaryExists: uniformWitnessStationary(),
  });
}
