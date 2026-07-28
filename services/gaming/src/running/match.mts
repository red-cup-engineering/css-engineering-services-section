/**
 * Match — the joint N-player interaction of a whole roster of designs.
 *
 * A running game is multi-agent: N enrolled designs play concurrently over one
 * shared arena.  The corpus names this exactly.  Per
 * `federation-is-parallel-composition.md`, $\mathbf{CGS}$'s monoidal product
 * $\|$ IS parallel composition of arenas — "$A\|B$ is the arena where Player
 * makes moves in both $A$ and $B$ concurrently," i.e. concurrent multi-player —
 * and "the cellwise $\vee_k$-join followed by closure is the action induced by
 * $\|$ at the fiber level."  So the JOINT interaction of the whole roster over
 * the shared arena is the $\|$-combine = the iterated knowledge-join $\bigsqcup_k$
 * = exactly playing/ludics's `superpose` (the $\sqcup_k$ union of commitments,
 * re-exported by gaming via the with-symmetry barrel from `@red-cup-engineering/playing/ludics`).
 *
 * `matchAll` folds over ALL designs — `jointForm = superpose(designs)` is the
 * $\|$-combine over the WHOLE roster, not a privileged pair.  Because
 * $\sqcup_k$ is commutative, associative, and idempotent, `superpose` is
 * order-independent: the joint match is invariant under any permutation of the
 * players — the $\mathrm{FSym}(\mathbb{A})$ groupoid that permutes agents acts
 * trivially on the verdict.  That symmetry-invariance is the multi-agent
 * structure the spiral note names, gotten for free from the fold.
 *
 * Convergence is read at the fiber level: a Daimon collision is a locus where
 * the knowledge-join is stable $\top$ — a shared/meeting locus at which the
 * cellwise $\vee_k$ has closed against the Daimon $\dagger$.  We read it off the
 * joint form by `interactionReport(jointForm, jointForm)`: since
 * $x \sqcup_k x = x$, a self-interaction's `daimonLoci` are exactly the loci of
 * `jointForm` already at $\top$ — the loci where the N-way join collided.  This
 * reuses `interactionReport` / `convergenceJudgment` verbatim; nothing new is
 * invented.
 */
import type { Design, InteractionReport, Locus } from "../structuring/index.mjs";
import { convergenceJudgment, interactionReport, superpose } from "../structuring/index.mjs";

/** The verdict of the joint N-player interaction over the whole roster. */
export interface MatchAll {
  readonly kind: "game.computer.match";
  /** The $\|$-combine over the WHOLE roster: `superpose(designs)`. */
  readonly jointForm: Design;
  /** True iff the joint interaction reaches a Daimon $\top$ at some meeting locus. */
  readonly converged: boolean;
  /** The loci where the N-way knowledge-join is stable $\top$ — the joint give-up points. */
  readonly daimonLoci: readonly Locus[];
  /**
   * The self-interaction report of the joint form: its meetings are the loci the
   * fold committed at, and its `daimonLoci` are the joint $\top$-collisions.
   */
  readonly report: InteractionReport;
  /** The roster size folded over — the number of concurrent participants. */
  readonly participants: number;
}

/**
 * The joint N-player interaction over a roster of designs.
 *
 * Domain: a list of `Design`s (the concurrent players).
 * Codomain: `MatchAll` — the $\|$-combine and its convergence verdict.
 *
 * `jointForm = superpose(designs)` folds the WHOLE roster by the iterated
 * knowledge-join (the $\|$-combine).  Convergence is read off the joint form via
 * `interactionReport(jointForm, jointForm)` / `convergenceJudgment`: a Daimon
 * locus is a shared/meeting locus where the join is stable $\top$.  The empty or
 * singleton roster has no meeting and so does not converge.
 */
export function matchAll(designs: readonly Design[]): MatchAll {
  const jointForm = superpose(designs);
  const report = interactionReport(jointForm, jointForm);
  const converged =
    designs.length >= 2 &&
    convergenceJudgment(jointForm, jointForm).kind === "game.convergence:witness";
  return Object.freeze({
    kind: "game.computer.match" as const,
    jointForm,
    converged,
    daimonLoci: report.daimonLoci,
    report,
    participants: designs.length,
  });
}
