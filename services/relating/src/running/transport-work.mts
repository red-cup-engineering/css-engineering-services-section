// running/transport-work — each transport's work-type, read through the σ×Δ quartet.
//
// A transport is a unit of work; its kind fixes the two skillful-work nuclei —
// σ (meaning-closure: is the output type settled?) and Δ (execution-closure: is the
// path settled, no branch?). The four transports are the four work types: a
// request/response serve names its codomain but dispatches (σ, ¬Δ — Procedure); an
// SSE feed is typed and deterministic (σ, Δ — Process); a settled claim session
// derives a judgement without branching (¬σ, Δ — Derivation); an open or conflicted
// session infers and branches (¬σ, ¬Δ — Inquiry).
//
// This is the transport-site instance of the recurring FOUR; the agent-site sibling
// is `@red-cup-engineering/animating`'s `classifySkillfulWork`. The determination charge is
// relating's own ≤ₖ join, never re-authored.

import {
  chargeValue,
  chargeValueName,
  joinKnowledgeValue,
  type ChargeValueName,
} from "@lenticule-science/articulating/predicating/positing/bilattice-charge";
import { conflicts, type Session } from "./session.mjs";

/** The two skillful-work nuclei read off a transport. */
export interface WorkNuclei {
  /** σ — meaning-closure: the output type is settled in advance. */
  readonly meaningClosed: boolean;
  /** Δ — execution-closure: the path is settled, no branch remains. */
  readonly executionClosed: boolean;
}

/** The four skillful-work types — the (σ, Δ) quartet at the transport site. */
export type WorkType = "Inquiry" | "Procedure" | "Derivation" | "Process";

/** Name the work type from its two nuclei: ¬σ¬Δ Inquiry, σ¬Δ Procedure, ¬σΔ
 *  Derivation, σΔ Process. */
export function workType({ meaningClosed, executionClosed }: WorkNuclei): WorkType {
  if (meaningClosed) return executionClosed ? "Process" : "Procedure";
  return executionClosed ? "Derivation" : "Inquiry";
}

/** The determination charge — the ≤ₖ join of the two closure charges (σ ↦ for /
 *  `potential`, Δ ↦ against / `active`, an open nucleus ↦ ⊥ / `absurd`). `potential
 *  ∨ₖ active = stable` (⊤): both closed ⇒ Process. Consumed from relating's charge
 *  algebra, not re-authored. */
export function determination({ meaningClosed, executionClosed }: WorkNuclei): ChargeValueName {
  const sigma = meaningClosed ? chargeValue("potential") : chargeValue("absurd");
  const delta = executionClosed ? chargeValue("active") : chargeValue("absurd");
  return chargeValueName(joinKnowledgeValue(sigma, delta));
}

/** The kinds of transport relating projects an action through. */
export type TransportKind = "request-response" | "event-stream" | "claim-session" | "open-session";

/** The σ×Δ nuclei of each transport kind. */
export const TRANSPORT_WORK: Readonly<Record<TransportKind, WorkNuclei>> = {
  "request-response": { meaningClosed: true, executionClosed: false }, // Procedure
  "event-stream": { meaningClosed: true, executionClosed: true }, // Process
  "claim-session": { meaningClosed: false, executionClosed: true }, // Derivation
  "open-session": { meaningClosed: false, executionClosed: false }, // Inquiry
};

/** The LIVE work nuclei of a claim session: it derives a judgement (¬σ), and is
 *  execution-closed (Δ) only while no cell conflicts. A conflict is a branch in the
 *  determination (a ⊤ / NSC firing), so the session drops from `Derivation` to
 *  `Inquiry` the moment a for- and against-claim meet. */
export function sessionWork(session: Session): WorkNuclei {
  return { meaningClosed: false, executionClosed: conflicts(session).length === 0 };
}
