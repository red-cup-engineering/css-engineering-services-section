/**
 * Concurrent strategies — the morphisms of $\mathbf{CGS}$.
 *
 * A morphism $A \to B$ is an equivalence class of concurrent strategies
 * $\sigma : S \to A^\perp \| B$ satisfying, per Castellan-Clairambault-Winskel,
 * three conditions: *receptivity*, *innocence*, and *symmetry-invariance*.  We
 * present a strategy on a single arena as a non-empty, prefix-closed set of
 * valid plays and supply a witness/obstruction judge for each condition:
 *
 *   - **receptivity** — Player may not refuse Opponent: any negative move the
 *     arena legally enables after an admitted play is itself admitted.
 *   - **innocence** — the deterministic (Hyland-Ong) reading the corpus gives:
 *     "sequential innocent strategies are the deterministic concurrent
 *     strategies — at most one P-move enabled after any history."
 *   - **symmetry-invariance** — *the defining condition*: the admitted set is
 *     **closed under the arena symmetry-groupoid action**.  A symmetry of the
 *     arena acts on a play by relabeling each move along the bijection (and, at
 *     the nominal layer, the bijection is itself induced by an
 *     $\mathrm{FSym}(\mathbb{A})$ finite name permutation via
 *     `applyPermutation`); a *concurrent strategy* is exactly a play-set fixed
 *     by every symmetry in the groupoid.  `closeUnderSymmetry` is the closure
 *     operator that produces this fixed set; `symmetryInvarianceJudgment`
 *     witnesses it.  This is the lift datum: gaming is **playing lifted along
 *     the symmetry groupoid** — `strategyFromDesign` admits a playing `Design`'s
 *     chronicles as plays and closes them under the groupoid; at trivial
 *     symmetry that closure is the identity and the strategy coincides with the
 *     playing `Design` (the trivial-symmetry inclusion `playing ↪ gaming`).
 */
import { arena as arenaOf, type Arena } from "../arena.mjs";
import {
  type Design,
  type Event,
  type EventPair,
  designAction,
  designChronicles,
  designFromActionSet,
  eventById,
  event,
  eventStructure,
  locusFromKey,
  locusKey,
  negative,
  negativeAction,
  polarityName,
  positive,
  positiveAction,
  prefixes,
  sameLocus,
  support,
} from "@red-cup-engineering/playing/ludics";
import { type Play, isValidPlay, play } from "./play.mjs";
import { type Bijection } from "../arena.mjs";
import { type EventNameLabel } from "../nominalizing/action.mjs";
import { type FinitePermutation, applyPermutation } from "../nominalizing/permutation.mjs";

export interface Strategy {
  readonly kind: "game.strategy";
  readonly arena: Arena;
  readonly plays: readonly Play[];
}

export function strategy(a: Arena, plays: readonly Play[]): Strategy {
  return Object.freeze({
    kind: "game.strategy" as const,
    arena: a,
    plays: Object.freeze(plays.map((p) => play(p.moves))),
  });
}

const movePolarity = (a: Arena, id: string): Event["polarity"] | null => eventById(a.structure, id)?.polarity ?? null;

const isNegativeMove = (a: Arena, id: string): boolean => movePolarity(a, id)?.name === "negative";
const isPositiveMove = (a: Arena, id: string): boolean => movePolarity(a, id)?.name === "positive";

const playKey = (p: Play): string => p.moves.join("\u0000");
const hasPlay = (plays: readonly Play[], p: Play): boolean => {
  const key = playKey(p);
  return plays.some((other) => playKey(other) === key);
};

/** Whether a strategy admits a play. */
export const strategyContainsPlay = (s: Strategy, p: Play): boolean =>
  hasPlay(s.plays, p);

/** Read the polarity of a move in the strategy arena. */
export const strategyMovePolarity = (s: Strategy, id: string): Event["polarity"] | null =>
  movePolarity(s.arena, id);

/** The arena events legally enabled after a play (configuration-extending, unused). */
function enabledAfter(a: Arena, p: Play): readonly string[] {
  const used = new Set(p.moves);
  const out: string[] = [];
  for (const e of a.structure.events) {
    if (used.has(e.id)) continue;
    if (isValidPlay(a, play([...p.moves, e.id]))) out.push(e.id);
  }
  return Object.freeze(out);
}

/** Arena-legal moves after a play, before restricting to the strategy's admitted plays. */
export const arenaEnabledMovesAfter = (s: Strategy, p: Play): readonly string[] =>
  enabledAfter(s.arena, p);

/** Strategy-admitted one-move extensions after a play. */
export function strategyExtensionsAfter(s: Strategy, p: Play): readonly string[] {
  return Object.freeze(enabledAfter(s.arena, p).filter((move) => hasPlay(s.plays, play([...p.moves, move]))));
}

export interface PrefixClosedWitness { readonly kind: "game.strategy.prefixClosed:witness"; }
export interface PrefixClosedObstruction { readonly kind: "game.strategy.prefixClosed-obstruction"; readonly play: Play; readonly missingPrefix: Play; }
export type PrefixClosedJudgment = PrefixClosedWitness | PrefixClosedObstruction;

export function prefixClosedJudgment(s: Strategy): PrefixClosedJudgment {
  for (const p of s.plays) {
    for (let i = 0; i < p.moves.length; i++) {
      const prefix = play(p.moves.slice(0, i));
      if (!hasPlay(s.plays, prefix)) {
        return Object.freeze({ kind: "game.strategy.prefixClosed-obstruction" as const, play: p, missingPrefix: prefix });
      }
    }
  }
  return Object.freeze({ kind: "game.strategy.prefixClosed:witness" as const });
}

export interface ReceptivityWitness { readonly kind: "game.strategy.receptivity:witness"; }
export interface ReceptivityObstruction { readonly kind: "game.strategy.receptivity-obstruction"; readonly play: Play; readonly refusedOpponentMove: string; }
export type ReceptivityJudgment = ReceptivityWitness | ReceptivityObstruction;

export function receptivityJudgment(s: Strategy): ReceptivityJudgment {
  for (const p of s.plays) {
    for (const move of enabledAfter(s.arena, p)) {
      if (isNegativeMove(s.arena, move) && !hasPlay(s.plays, play([...p.moves, move]))) {
        return Object.freeze({ kind: "game.strategy.receptivity-obstruction" as const, play: p, refusedOpponentMove: move });
      }
    }
  }
  return Object.freeze({ kind: "game.strategy.receptivity:witness" as const });
}

export interface InnocenceWitness { readonly kind: "game.strategy.innocence:witness"; }
export interface InnocenceObstruction { readonly kind: "game.strategy.innocence-obstruction"; readonly play: Play; readonly competingPlayerMoves: readonly string[]; }
export type InnocenceJudgment = InnocenceWitness | InnocenceObstruction;

/** Innocence in the deterministic (sequential, Hyland-Ong) reading: at most one P-move admitted after any play. */
export function innocenceJudgment(s: Strategy): InnocenceJudgment {
  for (const p of s.plays) {
    const positiveContinuations = enabledAfter(s.arena, p)
      .filter((move) => isPositiveMove(s.arena, move) && hasPlay(s.plays, play([...p.moves, move])));
    if (positiveContinuations.length > 1) {
      return Object.freeze({ kind: "game.strategy.innocence-obstruction" as const, play: p, competingPlayerMoves: Object.freeze(positiveContinuations) });
    }
  }
  return Object.freeze({ kind: "game.strategy.innocence:witness" as const });
}

/* ------------------------------------------------------------------------- *
 * The arena symmetry-groupoid action on plays (the lift datum).
 *
 * A symmetry of the arena is a `Bijection` on event ids.  It ACTS on a play by
 * relabeling each move along the bijection — `relabelPlay`.  When the bijection
 * was induced by an FSym(A) finite name permutation (`permutationBijection` in
 * `nominalizing/action.mts`, which is `applyPermutation` over an event labelling),
 * this is exactly the nominal name-passing action of the agent-sheaf; we expose
 * `relabelPlayByPermutation` as that action applied directly to a play, so the
 * FSym(A) groupoid and the arena symmetry groupoid are *the same action* on plays.
 * ------------------------------------------------------------------------- */

/** The arena symmetry-groupoid action: relabel each move of a play along a bijection. */
export const relabelPlay = (bij: Bijection, p: Play): Play =>
  play(p.moves.map((id) => bij.find((pair) => pair[0] === id)?.[1] ?? id));

/**
 * The FSym(A) name-permutation action on a play, applied directly: each move is
 * the event id whose name `applyPermutation` carries that move's name to.  This
 * is `relabelPlay` for the bijection `permutationBijection` would install — the
 * REAL FSym(A) groupoid action (`applyPermutation`), not a placeholder relabel.
 * Moves with no label, or whose image name labels no event, are fixed.
 */
export function relabelPlayByPermutation(
  permutation: FinitePermutation,
  labels: readonly EventNameLabel[],
  p: Play,
): Play {
  const nameOfEvent = new Map(labels.map((l) => [l.event, l.name]));
  const eventOfName = new Map(labels.map((l) => [l.name, l.event]));
  return play(p.moves.map((id) => {
    const name = nameOfEvent.get(id);
    if (name === undefined) return id;
    const image = applyPermutation(permutation, name);
    return eventOfName.get(image) ?? id;
  }));
}

export interface SymmetryInvarianceWitness { readonly kind: "game.strategy.symmetryInvariance:witness"; }
export interface SymmetryInvarianceObstruction { readonly kind: "game.strategy.symmetryInvariance-obstruction"; readonly play: Play; readonly bijection: Bijection; readonly missingImage: Play; }
export type SymmetryInvarianceJudgment = SymmetryInvarianceWitness | SymmetryInvarianceObstruction;

/**
 * Symmetry-invariance — *the defining condition* of a concurrent strategy: the
 * admitted set is closed under the arena symmetry-groupoid action.  For every
 * admitted play and every symmetry `bij` in the groupoid, `relabelPlay(bij, p)`
 * is also admitted.  Because the arena groupoid is where the nominal layer
 * installs its FSym(A) `permutationBijection`s (see `nominalEquivarianceJudgment`),
 * this judgment IS closure under the real FSym(A) groupoid — not a placeholder.
 */
export function symmetryInvarianceJudgment(s: Strategy): SymmetryInvarianceJudgment {
  for (const p of s.plays) {
    for (const bij of s.arena.symmetry) {
      const image = relabelPlay(bij, p);
      if (!hasPlay(s.plays, image)) {
        return Object.freeze({ kind: "game.strategy.symmetryInvariance-obstruction" as const, play: p, bijection: bij, missingImage: image });
      }
    }
  }
  return Object.freeze({ kind: "game.strategy.symmetryInvariance:witness" as const });
}

/**
 * The symmetry-closure operator: the smallest symmetry-invariant strategy
 * containing `s`'s plays — the closure of the admitted set under the arena
 * symmetry-groupoid action (and its prefixes, so the result stays prefix-closed).
 * A *concurrent strategy* is a fixed point of this operator; `strategyFromDesign`
 * builds one by closing the lifted Design chronicles.  At trivial symmetry the
 * groupoid is `{ id }`, so the closure is the identity and the play-set is
 * returned unchanged (the trivial-symmetry inclusion `playing ↪ gaming`).
 */
export function closeUnderSymmetry(s: Strategy): Strategy {
  const seen = new Map<string, Play>();
  const admit = (p: Play): void => {
    const key = playKey(p);
    if (!seen.has(key)) seen.set(key, p);
  };
  // seed with the plays and all their prefixes
  for (const p of s.plays) {
    for (let i = 0; i <= p.moves.length; i++) admit(play(p.moves.slice(0, i)));
  }
  // saturate under the groupoid action until a fixed point is reached
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of [...seen.values()]) {
      for (const bij of s.arena.symmetry) {
        const image = relabelPlay(bij, p);
        const key = playKey(image);
        if (!seen.has(key)) {
          seen.set(key, image);
          changed = true;
        }
      }
    }
  }
  return strategy(s.arena, [...seen.values()]);
}

/** Whether a strategy is already a fixed point of `closeUnderSymmetry` (its plays equal their closure). */
export function isSymmetryClosed(s: Strategy): boolean {
  return symmetryInvarianceJudgment(s).kind === "game.strategy.symmetryInvariance:witness";
}

export interface StrategyWellFormednessReport {
  readonly kind: "game.strategy.report";
  readonly validPlays: boolean;
  readonly prefixClosed: PrefixClosedJudgment;
  readonly receptivity: ReceptivityJudgment;
  readonly innocence: InnocenceJudgment;
  readonly symmetryInvariance: SymmetryInvarianceJudgment;
  readonly wellFormed: boolean;
}

/** Run all four conditions; `wellFormed` holds when each is a witness. */
export function strategyReport(s: Strategy): StrategyWellFormednessReport {
  const validPlays = s.plays.every((p) => isValidPlay(s.arena, p));
  const prefixClosed = prefixClosedJudgment(s);
  const receptivity = receptivityJudgment(s);
  const innocence = innocenceJudgment(s);
  const symmetryInvariance = symmetryInvarianceJudgment(s);
  const wellFormed = validPlays
    && prefixClosed.kind === "game.strategy.prefixClosed:witness"
    && receptivity.kind === "game.strategy.receptivity:witness"
    && innocence.kind === "game.strategy.innocence:witness"
    && symmetryInvariance.kind === "game.strategy.symmetryInvariance:witness";
  return Object.freeze({ kind: "game.strategy.report" as const, validPlays, prefixClosed, receptivity, innocence, symmetryInvariance, wellFormed });
}

export const isWellFormedStrategy = (s: Strategy): boolean => strategyReport(s).wellFormed;

export function isStrategy(value: unknown): value is Strategy {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Strategy>;
  return candidate.kind === "game.strategy" && Array.isArray(candidate.plays);
}

/* ========================================================================= *
 * The playing-lift: gaming is playing's Design LIFTED along the symmetry
 * groupoid.  A playing `Design` is the union of its chronicles, and (Faggian-
 * Hyland 2002) a chronicle IS a Hyland-Ong play.  So a `Design`'s chronicles
 * are exactly a set of plays — and a concurrent strategy is that set lifted onto
 * an arena and CLOSED under the arena symmetry groupoid (`strategyFromDesign`).
 * Reading the maximal plays back as chronicles, each becomes a `Design`, and the
 * union of those Designs reconstructs the original (`designsOfStrategy`).  At
 * trivial symmetry the closure is the identity, so the strategy's plays ARE the
 * Design's chronicles and the round-trip is exact — this is the trivial-symmetry
 * inclusion `playing ↪ gaming`.
 *
 * The lift identifies each design locus with an arena event by its `locusKey`:
 * the lifted arena's event ids are the support loci's keys, polarized by each
 * locus's parity, causally ordered by the locus prefix order — so an arena
 * configuration (a play) is exactly a secured root-to-leaf locus chain (a
 * chronicle).
 * ========================================================================= */

/** The polarity name an action variety presents (daimon and positive are both positive-polarity). */
const varietyPolarityName = (variety: "positive" | "negative" | "daimon"): "positive" | "negative" =>
  variety === "negative" ? "negative" : "positive";

/**
 * The arena a playing `Design` lifts onto (trivial symmetry): one event per
 * support locus (event id = `locusKey`), polarized by the action realized there,
 * causally ordered by the locus prefix order.  This is the discrete (trivial-
 * symmetry) arena whose configurations are the design's secured locus chains.
 */
export function arenaOfDesign(d: Design): Arena {
  const loci = support(d);
  const events: Event[] = [];
  for (const xi of loci) {
    const a = designAction(d, xi);
    if (a === null) continue;
    const name = varietyPolarityName(a.variety);
    events.push(event(locusKey(xi), name === "negative" ? negative() : positive()));
  }
  const causality: EventPair[] = [];
  for (const xi of loci) {
    for (const zeta of loci) {
      if (sameLocus(xi, zeta)) continue;
      if (xi.address.length + 1 === zeta.address.length && prefixes(xi, zeta)) {
        causality.push(Object.freeze([locusKey(xi), locusKey(zeta)] as const));
      }
    }
  }
  return arenaOf(eventStructure(events, causality), []);
}

/**
 * Lift a playing `Design` to the concurrent strategy on `arena` whose plays are
 * the Design's chronicles (each chronicle is one HO play; a design is the union
 * of its chronicles), prefix-closed and CLOSED under the arena symmetry groupoid.
 * Each chronicle becomes the play of its actions' move loci (`locusKey`).  When
 * `arena` is omitted the design's own trivial-symmetry arena is used, in which
 * case the result coincides with the playing `Design` (no extra plays are added
 * — `playing ↪ gaming` at trivial symmetry).
 */
export function strategyFromDesign(d: Design, a: Arena = arenaOfDesign(d)): Strategy {
  const plays = designChronicles(d).map((c) => play(c.actions.map((act) => locusKey(act.locus))));
  return closeUnderSymmetry(strategy(a, plays));
}

/**
 * Read a strategy's plays back as playing `Design`s: each MAXIMAL admitted play
 * (one not a strict prefix of another admitted play) is a chronicle, recovered
 * as a `Design` by realizing the action at each move locus from the arena event
 * polarity.  This is the right inverse of `strategyFromDesign` at trivial
 * symmetry: `designsOfStrategy(strategyFromDesign(d))` returns `d` (as the union
 * of its chronicles' designs), proving the lift is a genuine embedding.
 */
export function designsOfStrategy(s: Strategy): readonly Design[] {
  const maximal = s.plays.filter((p) =>
    !s.plays.some((q) => q.moves.length > p.moves.length
      && p.moves.every((m, i) => q.moves[i] === m)));
  return Object.freeze(maximal.map((p) => designFromPlay(s, p)));
}

/**
 * The single Design carried by one play: the action at each move locus, with the
 * variety read off the arena event polarity (negative → Opponent, positive →
 * Proponent).  The ramification at each locus is rebuilt by `designFromActionSet`
 * from the support, so this is the exact inverse of the chronicle realization for
 * positive/negative chronicles.  (A daimon leaf is represented as a positive
 * locus here — arena events carry only polarity, not the Daimon terminator; pass
 * such designs through `designsOfStrategy` only up to that polarity reading.)
 */
function designFromPlay(s: Strategy, p: Play): Design {
  const actions = p.moves.map((id) => {
    const xi = locusFromKey(id);
    const ev = eventById(s.arena.structure, id);
    const negativeMove = ev !== null && polarityName(ev.polarity) === "negative";
    return negativeMove ? negativeAction(xi) : positiveAction(xi);
  });
  return designFromActionSet(actions);
}

/**
 * The combined `Design` of a strategy: the union of `designsOfStrategy` — the
 * single design whose chronicle-forest IS the strategy's maximal plays (a design
 * is the union of its chronicles).  At trivial symmetry this is the inverse of
 * `strategyFromDesign`: `designOfStrategy(strategyFromDesign(d)) ≃ d`.
 */
export function designOfStrategy(s: Strategy): Design {
  const all = designsOfStrategy(s).flatMap((d) =>
    support(d).map((xi) => designAction(d, xi)).filter((a): a is NonNullable<typeof a> => a !== null));
  return designFromActionSet(all);
}
