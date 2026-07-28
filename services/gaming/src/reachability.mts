/**
 * reachability — gaming's EQUILIBRIUM-REACHABILITY reading: the corpus's closure of the
 * STABILITY↔REACHABILITY gap, built on a layer-1 capability.
 *
 * Layer-2 gaming (= playing among many; concurrent games with symmetry) inherits game theory's
 * hardest practical gap. equilibrium-concept.md states it outright: an equilibrium is *stable*
 * (no profitable unilateral deviation) but not necessarily *reachable* (agents may never arrive
 * at it from arbitrary starts) — "equilibrium concepts characterize stability; learning dynamics
 * characterize reachability… self-play often does NOT converge (general-sum, multi-player); may
 * converge to non-equilibrium attractors (CYCLES, chaos). The gap between equilibrium analysis
 * and dynamical analysis is substantial." The canonical witness is Rock–Paper–Scissors / Matching
 * Pennies: best-response dynamics CYCLES forever and never reaches the (mixed) equilibrium.
 *
 * A best-response cycle is EXACTLY a non-trivial periodic orbit of the strategy dynamics. The
 * corpus PROVES (closure-monad-no-non-trivial-periodic-orbits.md — the layer-1 capability behind
 * knowing's `attract`) that the monotone + inflationary + idempotent ≤_k settling has NO such
 * orbit: it ALWAYS converges to a fixed point. So when the strategy dynamics is run as the
 * bilattice ≤_k accumulation (accumulate each move's wins/losses, never RETRACT — best-response's
 * non-monotone retraction is what cycles), it REACHES an attractor: a pure dominant move where one
 * exists, or — for a cyclic game (RPS) — the symmetric ⊤ state (every move beats some and loses to
 * some → told-both), which is the mixed equilibrium read paraconsistently. The settling closes the
 * stability↔reachability gap: the equilibrium is reachable even where best-response cycles.
 */
import {
  chargeValue,
  joinKnowledgeValue,
  type ChargeValue,
  type ChargeValueName,
} from "@red-cup-engineering/relating";
import { admitSeed, descend } from "@red-cup-engineering/animating";
import { type UtteranceCarrier, type JsonValue } from "@red-cup-engineering/relating";

/** gaming's equilibrium-reachability verdict over a game's dominance structure. */
export interface Reachability {
  readonly kind: "gaming.reachability";
  /** the distinct moves/strategies of the game. */
  readonly moves: number;
  /** moves with only wins (≤_k standing `potential`) — undominated candidates. */
  readonly dominant: number;
  /** moves with only losses (`active`) — strictly dominated. */
  readonly dominated: number;
  /** moves that win some AND lose some (`stable` ⊤) — caught in a dominance cycle / mixed support. */
  readonly contested: number;
  /** a PURE dominant-strategy equilibrium exists: some move beats EVERY other move. */
  readonly pureEquilibrium: boolean;
  /** the equilibrium is MIXED — no single move dominates all (`!pureEquilibrium`, moves > 1); the
   *  reachable attractor is the symmetric ⊤ state (RPS reads as all moves told-both). */
  readonly mixed: boolean;
  /** the dominance graph has a directed CYCLE (RPS / Matching Pennies) — BEST-RESPONSE dynamics
   *  would never converge (the unreachable-by-naive-learning case, a periodic orbit). */
  readonly bestResponseCyclic: boolean;
  /** the monotone ≤_k settling CONVERGES to a fixed-point attractor — by the no-non-trivial-
   *  periodic-orbit theorem, ALWAYS. The strategy dynamics terminates; it cannot cycle. */
  readonly converges: boolean;
  /** the equilibrium attractor is REACHABLE: the monotone settling arrives at it from any start
   *  (`converges`) — TRUE even when `bestResponseCyclic`. The stability↔reachability gap, closed. */
  readonly reachable: boolean;
}

/** Whether a directed edge set has a directed cycle (DFS three-colouring). */
function hasCycle(nodes: readonly string[], edges: ReadonlyMap<string, readonly string[]>): boolean {
  const colour = new Map<string, 0 | 1 | 2>();
  const visit = (n: string): boolean => {
    colour.set(n, 1);
    for (const m of edges.get(n) ?? []) {
      const c = colour.get(m) ?? 0;
      if (c === 1) return true;
      if (c === 0 && visit(m)) return true;
    }
    colour.set(n, 2);
    return false;
  };
  for (const n of nodes) if ((colour.get(n) ?? 0) === 0 && visit(n)) return true;
  return false;
}

/**
 * reachabilityOf — read a game's dominance structure (a membrane of `winner|loser` lines, each "the
 * winner move beats the loser move") for equilibrium reachability. Each move accumulates its wins
 * (potential a₊) and losses (active a₋) along the ≤_k join, so a move in a cycle settles to ⊤
 * (told-both). The monotone settling converges (no-periodic-orbit) — so the equilibrium is reachable
 * — even when the dominance graph cycles (where best-response would not).
 */
export function reachabilityOf(membrane: readonly UtteranceCarrier[]): Reachability {
  const standing = new Map<string, ChargeValue>(); // move → ≤_k-pooled win/loss charge
  const beats = new Map<string, Set<string>>();     // winner → moves it beats (out-neighbours)
  const moves = new Set<string>();
  const accrue = (move: string, side: ChargeValueName): void => {
    moves.add(move);
    const prior = standing.get(move);
    const v = chargeValue(side);
    standing.set(move, prior === undefined ? v : joinKnowledgeValue(prior, v));
  };
  for (const carrier of membrane) {
    const winner = String(carrier.token.mark.value).trim();
    const loser = String(carrier.claim.mark.value).trim();
    if (winner === "" || loser === "" || winner === loser) continue;
    accrue(winner, "potential"); // a win — for-side a₊
    accrue(loser, "active");     // a loss — against-side a₋
    beats.set(winner, (beats.get(winner) ?? new Set<string>()).add(loser));
  }

  let dominant = 0;
  let dominated = 0;
  let contested = 0;
  for (const v of standing.values()) {
    if (v.name === "potential") dominant += 1;
    else if (v.name === "active") dominated += 1;
    else if (v.name === "stable") contested += 1;
  }
  const all = [...moves];
  // a PURE dominant-strategy equilibrium: a move that beats every OTHER move.
  const pureEquilibrium = all.some((m) => {
    const won = beats.get(m);
    return won !== undefined && all.every((x) => x === m || won.has(x));
  });
  const edges = new Map<string, readonly string[]>();
  for (const [w, ls] of beats) edges.set(w, [...ls]);
  const bestResponseCyclic = hasCycle(all, edges);

  return {
    kind: "gaming.reachability",
    moves: moves.size,
    dominant,
    dominated,
    contested,
    pureEquilibrium,
    mixed: !pureEquilibrium && moves.size > 1,
    bestResponseCyclic,
    converges: true, // no-non-trivial-periodic-orbit: the monotone ≤_k settling reaches a fixpoint
    reachable: true, // the attractor is reached even when best-response cycles
  };
}

/** Settle a `winner|loser` dominance seed into a reachability reading. */
export function reachability(seed: unknown): Reachability {
  return reachabilityOf(descend(admitSeed(seed as JsonValue)).utterances);
}
