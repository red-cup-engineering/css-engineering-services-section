/**
 * Game — a running game IS a concurrent game system.
 *
 * Per the corpus, "the theory of computing is $\mathbf{CGS}$" (concurrent games
 * with symmetry): the unique $*$-autonomous category in which sequential game
 * semantics, nominal computation, session-typed concurrency, and realizability
 * all embed.  A running game is therefore not a new datatype — it is a
 * *configuration* of the carriers already proved in `@red-cup-engineering/gaming` and
 * `@red-cup-engineering/gaming`:
 *
 *   - an **arena** (a polarized prime event structure with symmetry groupoid) —
 *     the board;
 *   - the **designs** in play (Girard's dialogical objects, realized as charge
 *     valuations on the locus tree — "a design IS a partial valuation into the
 *     meme-algebra bilattice charge");
 *   - a current **play** (a secured linearization of the causal order — the
 *     position-with-history reached so far), advanced only by the one legal-move
 *     transition `extend`;
 *   - the interaction **history**: a log of moves and interactions, each
 *     interaction recording its `interactionReport` (the knowledge-join normal
 *     form) and whether it `converged` — reached the Daimon $\dagger$ ($\top$),
 *     i.e. orthogonality $\mathfrak{D} \perp \mathfrak{E}$.
 *
 * The transitions are pure: each returns a *new* frozen `Game`, or an
 * obstruction carrier (the witness/obstruction union pattern) when the move is
 * illegal.  Carriers are `Object.freeze`d plain objects with `kind:
 * "game.computer.<thing>"` discriminants.  Nothing is invented here: a `Game`
 * is wholly composed of earlier carriers.
 *
 * NOTE on shape: the listed `Game` fields are `{id, arena, designs, history}`;
 * we additionally carry the current `play: Play` (itself a game-algebra carrier)
 * so `playMove` can `extend` a tracked position rather than reconstruct it from
 * the interleaved history — faithful and cleaner, and still "nothing new
 * invented".
 */
import type { Arena, Play, Design, InteractionReport, Locus } from "../structuring/index.mjs";
import { convergenceJudgment, emptyPlay, extend, extendJudgment, interactionReport, isArena, isPlay } from "../structuring/index.mjs";
import { matchAll, type MatchAll } from "./match.mjs";

/** A design enrolled in the running game, under a stable string id. */
export interface GameDesign {
  readonly kind: "game.computer.design";
  readonly id: string;
  readonly design: Design;
}

/** A move appended to the history: the play after a legal `extend`. */
export interface MoveEntry {
  readonly kind: "game.computer.move";
  readonly move: string;
  readonly play: Play;
}

/**
 * An interaction appended to the history: the two participants, the
 * `interactionReport` (knowledge-join normal form + meeting loci), and whether
 * the interaction converged to the Daimon ($\mathfrak{D} \perp \mathfrak{E}$).
 */
export interface InteractionEntry {
  readonly kind: "game.computer.interaction";
  readonly designIdA: string;
  readonly designIdB: string;
  readonly report: InteractionReport;
  readonly converged: boolean;
}

/**
 * A terminal settle appended to the history: the JOINT verdict of ALL enrolled
 * designs.  Per `federation-is-parallel-composition.md` the joint interaction is
 * the $\|$-combine = `superpose` over the whole roster, so the settle records
 * every participant's id (not a privileged pair), the joint form's report, the
 * joint Daimon loci, and whether the N-way knowledge-join converged to $\top$.
 */
export interface SettleEntry {
  readonly kind: "game.computer.settle";
  /** Every participant folded into the joint interaction, in roster order. */
  readonly designIds: readonly string[];
  readonly report: InteractionReport;
  readonly daimonLoci: readonly Locus[];
  readonly converged: boolean;
}

export type HistoryEntry = MoveEntry | InteractionEntry | SettleEntry;

/** A running game: a frozen configuration of arena, designs, current play, and history. */
export interface Game {
  readonly kind: "game.computer.game";
  readonly id: string;
  readonly arena: Arena;
  readonly designs: readonly GameDesign[];
  readonly play: Play;
  readonly history: readonly HistoryEntry[];
}

export interface PlayMoveObstruction {
  readonly kind: "game.computer.playMove-obstruction";
  readonly move: string;
  readonly reason: "illegal-move";
}

export interface AddDesignObstruction {
  readonly kind: "game.computer.addDesign-obstruction";
  readonly designId: string;
  readonly reason: "duplicate-id";
}

export interface InteractionObstruction {
  readonly kind: "game.computer.runInteraction-obstruction";
  readonly designIdA: string;
  readonly designIdB: string;
  readonly reason: "unknown-design";
  readonly missing: string;
}

export interface SettleObstruction {
  readonly kind: "game.computer.settle-obstruction";
  readonly reason: "too-few-designs";
}

/** A running game, frozen. */
export function game(
  id: string,
  arena: Arena,
  designs: readonly GameDesign[],
  play: Play,
  history: readonly HistoryEntry[],
): Game {
  return Object.freeze({
    kind: "game.computer.game",
    id,
    arena,
    designs: Object.freeze([...designs]),
    play,
    history: Object.freeze([...history]),
  } as const);
}

function gameDesign(id: string, design: Design): GameDesign {
  return Object.freeze({ kind: "game.computer.design", id, design } as const);
}

/** A fresh game over an arena: no designs, empty play, empty history. */
export function createGame(id: string, arena: Arena): Game {
  return game(id, arena, [], emptyPlay(), []);
}

const hasDesignId = (g: Game, id: string): boolean => g.designs.some((d) => d.id === id);

const findDesign = (g: Game, id: string): GameDesign | undefined =>
  g.designs.find((d) => d.id === id);

/** Enroll a design under an id, or refuse a duplicate id. */
export function addDesign(g: Game, designId: string, design: Design): Game | AddDesignObstruction {
  if (hasDesignId(g, designId)) {
    return Object.freeze({
      kind: "game.computer.addDesign-obstruction",
      designId,
      reason: "duplicate-id",
    } as const);
  }
  return game(g.id, g.arena, [...g.designs, gameDesign(designId, design)], g.play, g.history);
}

/**
 * Play one legal move: reuse `extendJudgment` over the tracked current play.
 * On a witness, advance the play and append a move entry; on an obstruction,
 * return a `playMove` obstruction (the arena did not enable the move here).
 */
export function playMove(g: Game, move: string): Game | PlayMoveObstruction {
  const judgment = extendJudgment(g.arena, g.play, move);
  if (judgment.kind === "game.play.extend-obstruction") {
    return Object.freeze({
      kind: "game.computer.playMove-obstruction",
      move,
      reason: "illegal-move",
    } as const);
  }
  // The witness records the *prior* play; `extend` yields the advanced position.
  const nextPlay = extend(g.arena, g.play, move);
  if (nextPlay === null) {
    return Object.freeze({
      kind: "game.computer.playMove-obstruction",
      move,
      reason: "illegal-move",
    } as const);
  }
  const entry: MoveEntry = Object.freeze({ kind: "game.computer.move", move, play: nextPlay });
  return game(g.id, g.arena, g.designs, nextPlay, [...g.history, entry]);
}

/**
 * Run the interaction of two enrolled designs: reuse `interactionReport` (the
 * knowledge-join normal form) and `convergenceJudgment` (does the join reach
 * the Daimon $\top$ — orthogonality).  Append an interaction entry recording
 * the report and the convergence verdict; refuse an unknown design id.
 */
export function runInteraction(
  g: Game,
  designIdA: string,
  designIdB: string,
): Game | InteractionObstruction {
  const a = findDesign(g, designIdA);
  const b = findDesign(g, designIdB);
  if (a === undefined || b === undefined) {
    return Object.freeze({
      kind: "game.computer.runInteraction-obstruction",
      designIdA,
      designIdB,
      reason: "unknown-design",
      missing: a === undefined ? designIdA : designIdB,
    } as const);
  }
  const report = interactionReport(a.design, b.design);
  const converged = convergenceJudgment(a.design, b.design).kind === "game.convergence:witness";
  const entry: InteractionEntry = Object.freeze({
    kind: "game.computer.interaction",
    designIdA,
    designIdB,
    report,
    converged,
  });
  return game(g.id, g.arena, g.designs, g.play, [...g.history, entry]);
}

/**
 * The joint N-player interaction over the game's roster: read every enrolled
 * design and `matchAll` them — the $\|$-combine (`superpose`) over the WHOLE
 * roster, not a privileged pair.  This is gaming's genuine multi-agent verdict:
 * all participants interact concurrently over the one shared arena.
 */
export function matchGame(g: Game): MatchAll {
  return matchAll(g.designs.map((d) => d.design));
}

/**
 * Settle the game to its convergence verdict over the JOINT interaction of ALL
 * enrolled designs.  Per the orthogonality doc, "convergence $\Downarrow$ = the
 * play reaches the Daimon $\dagger$"; per `federation-is-parallel-composition.md`
 * the joint interaction of N players is the $\|$-combine = `superpose` over the
 * whole roster, and "the cellwise $\vee_k$-join followed by closure is the action
 * induced by $\|$ at the fiber level."  So we settle natively over `matchGame`:
 * fold every design into the joint form, read its Daimon loci, and append a
 * terminal settle entry recording the JOINT verdict (all participants).  The
 * fold is symmetry-invariant (permuting the players does not change the verdict).
 * Fewer than two designs cannot settle.
 */
export function settle(g: Game): Game | SettleObstruction {
  if (g.designs.length < 2) {
    return Object.freeze({ kind: "game.computer.settle-obstruction", reason: "too-few-designs" } as const);
  }
  const match = matchGame(g);
  const entry: SettleEntry = Object.freeze({
    kind: "game.computer.settle",
    designIds: Object.freeze(g.designs.map((d) => d.id)),
    report: match.report,
    daimonLoci: match.daimonLoci,
    converged: match.converged,
  });
  return game(g.id, g.arena, g.designs, g.play, [...g.history, entry]);
}

/**
 * Structural guard: a value is a `Game` carrier composed of real game-algebra
 * carriers.  Discriminates on the `kind` tag (obstructions carry distinct
 * `game.computer.<op>-obstruction` kinds) and confirms the carried `arena` and
 * `play` are real frozen carriers via the algebra's own guards.
 */
export function isGame(value: unknown): value is Game {
  if (typeof value !== "object" || value === null) return false;
  const v = value as {
    readonly kind?: unknown;
    readonly arena?: unknown;
    readonly designs?: unknown;
    readonly play?: unknown;
    readonly history?: unknown;
  };
  return (
    v.kind === "game.computer.game" &&
    isArena(v.arena) &&
    Array.isArray(v.designs) &&
    Array.isArray(v.history) &&
    isPlay(v.play)
  );
}
