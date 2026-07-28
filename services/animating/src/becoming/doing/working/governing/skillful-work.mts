/**
 * skillful-work — the NUCLEAR QUARTET reading of an agent's work.
 *
 * This is the pure quartet LOGIC the agent reading (`agent.mts`) consolidates onto the
 * interior bulk — NOT a stored carrier of declared booleans. A unit of an agent's work
 * is typed by two commuting institutional nuclei, identified with the agent's two
 * non-communicating boundary faces:
 *   - σ (saturation = MEANING-closure)   = the INSIDE / knowing face settled
 *                                          (the ≤_k interior-knowledge orbit reflects).
 *   - Δ (transfer   = EXECUTION-closure) = the OUTSIDE / playing face settled
 *                                          (no open affordances remain to act on).
 * These are the same σ and Δ the agent `character` doc already names as "the institutional
 * nuclei" (χ is the third). By the Nuclear Quartet Theorem (two commuting nuclei ⇒
 * π = σ∘Δ is itself a nucleus, idempotent because they commute), applying neither/σ/Δ/both
 * yields EXACTLY four sub-algebras = the four types of skillful work:
 *
 *   ¬σ ¬Δ  raw A              → Inquiry    (⊥ absurd)   inside open,  outside open
 *    σ ¬Δ  Fix(σ)\H*          → Procedure  (one middle)  inside settled, outside open  — knows WHAT, still routing HOW
 *   ¬σ  Δ  Fix(Δ)\H*          → Derivation (other middle) inside open, outside settled — HOW is fixed rules, WHAT is a novel judgment
 *    σ  Δ  H* = Fix(σ)∩Fix(Δ) → Process    (⊤ stable)    inside settled, outside settled
 *
 * The quartet's determination order is order-ISOMORPHIC to relating's bilattice knowledge
 * order ≤_k: it is computed as the ≤_k JOIN of the two closure charges, so inquiry lands on
 * ⊥ absurd and process on ⊤ stable with the two single-closure types on the two incomparable
 * middles. We CONSUME relating's proven `joinKnowledgeValue` for that order — we do not
 * re-author it. The assignment of which middle charge (potential/active) labels σ-only vs
 * Δ-only is a coordinate LABELING of the two symmetric ≤_k middles, NOT a claim that
 * meaning-closure is epistemically "for"; this quartet is a sibling instance of FOUR on the
 * (σ, Δ) closure axes, not the for/against census the faces carry.
 *
 * Origin: the gsu-ccs relational-machine spec (skillful-work / inquiry / derivation /
 * procedure / process), grounded on math/nuclear-quartet-theorem.md.
 */
import { chargeValue, joinKnowledgeValue, type ChargeValueName } from "@red-cup-engineering/relating";

/** One of the four canonical types of skillful work. */
export type SkillfulWorkKind = "inquiry" | "procedure" | "derivation" | "process";

/** The two commuting nuclei, read off an agent's inside/outside faces. */
export interface WorkClosure {
  /** σ (saturation): MEANING-closure — the inside/knowing face settled (cognition reflects). */
  readonly meaningClosed: boolean;
  /** Δ (transfer): EXECUTION-closure — the outside/playing face settled (no open affordances). */
  readonly executionClosed: boolean;
}

/** The quartet reading of one work unit: the type and its ≤_k determination charge. */
export interface SkillfulWork extends WorkClosure {
  readonly kind: "animating.agent.work";
  readonly closureKind: SkillfulWorkKind;
  readonly determination: ChargeValueName;
}

/** The four sub-algebras named, indexed by their ≤_k determination charge. The two middle
 *  charges label the two incomparable single-closure types (a symmetric coordinate choice). */
const CLOSURE_KIND: Readonly<Record<ChargeValueName, SkillfulWorkKind>> = Object.freeze({
  absurd: "inquiry", // ⊥  neither σ nor Δ — raw A
  potential: "procedure", // σ only — Fix(σ)\H*
  active: "derivation", // Δ only — Fix(Δ)\H*
  stable: "process", // ⊤  both — H* = Fix(σ)∩Fix(Δ)
});

/** The four kinds in ≤_k determination order, ⊥ (least determined) to ⊤ (most). */
export const SKILLFUL_WORK_KINDS: readonly SkillfulWorkKind[] = Object.freeze([
  "inquiry",
  "procedure",
  "derivation",
  "process",
]);

/** The ≤_k DETERMINATION charge of a work unit = the KNOWLEDGE-ORDER JOIN of its two closure
 *  charges (each closure contributes one of the two incomparable ≤_k middles), computed by
 *  relating's proven `joinKnowledgeValue`. neither → ⊥ absurd, σ → a middle, Δ → the other
 *  middle, both → ⊤ stable. The quartet's order IS relating's ≤_k; this consumes it. */
function determinationOf(closure: WorkClosure): ChargeValueName {
  const meaning = chargeValue(closure.meaningClosed ? "potential" : "absurd");
  const execution = chargeValue(closure.executionClosed ? "active" : "absurd");
  return joinKnowledgeValue(meaning, execution).name;
}

/** Classify a work unit into its nuclear-quartet type from the two commuting nuclei. */
export function classifySkillfulWork(closure: WorkClosure): SkillfulWork {
  const determination = determinationOf(closure);
  return {
    kind: "animating.agent.work",
    meaningClosed: closure.meaningClosed,
    executionClosed: closure.executionClosed,
    closureKind: CLOSURE_KIND[determination],
    determination,
  };
}

/** π = σ∘Δ — the JOINT PROJECTION reflecting any work unit UP into Process (H*), the least
 *  element of the joint fixed-point sub-algebra above it (nuclear-quartet-subalgebra §projection).
 *  Following a Procedure's branches to resolution, or settling a Derivation's meaning, IS this
 *  reflection. π is extensive (result ≥_k input) and idempotent — π(π(a)) = π(a) — because σ and
 *  Δ commute; since H* is the single top sub-algebra it lands every unit on Process. */
export function jointProjection(work: WorkClosure): SkillfulWork {
  return classifySkillfulWork({
    meaningClosed: work.meaningClosed || true,
    executionClosed: work.executionClosed || true,
  });
}

/** The closure state of each declared type — the inverse of `classifySkillfulWork`. A skill
 *  author declares its `closureKind`; the two nuclei follow. */
export const CLOSURE_OF_KIND: Readonly<Record<SkillfulWorkKind, WorkClosure>> = Object.freeze({
  inquiry: { meaningClosed: false, executionClosed: false },
  procedure: { meaningClosed: true, executionClosed: false },
  derivation: { meaningClosed: false, executionClosed: true },
  process: { meaningClosed: true, executionClosed: true },
});

/** Apply σ — close MEANING. Moves a unit one step up the quartet: Inquiry → Procedure, or
 *  Derivation → Process. The operational reading of the saturation nucleus (extensive,
 *  idempotent: a second application is a no-op). */
export function advanceMeaning(work: WorkClosure): SkillfulWork {
  return classifySkillfulWork({ meaningClosed: true, executionClosed: work.executionClosed });
}

/** Apply Δ — close EXECUTION. Moves a unit one step up the quartet: Inquiry → Derivation, or
 *  Procedure → Process. The operational reading of the transfer nucleus (extensive, idempotent). */
export function advanceExecution(work: WorkClosure): SkillfulWork {
  return classifySkillfulWork({ meaningClosed: work.meaningClosed, executionClosed: true });
}
