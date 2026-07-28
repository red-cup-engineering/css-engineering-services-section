// running/session — the transfinite transport: a bounded interactive claim session.
//
// Between the Scott stream (one-sided, never conflicts) and the aperiodic open
// session (never settles) sits the transfinite-bounded session. It does NOT
// overwrite: nothing is ever retracted. Each message is a CLAIM — a charged
// predication about a cell — and the claims accumulate in a monotone log exactly
// like the Scott ledger. What moves is the JUDGEMENT: the ∨ₖ knowledge-join of all
// claims about a cell. Knowledge only grows, but the truth verdict can flip — a
// cell standing `potential` (for) becomes `stable` (⊤, both) when an `active`
// (against) claim arrives, with the earlier claim still in the log.
//
// The session is `scott` when no cell ever conflicts (flat, H¹=0) and
// `transfinite` when some cell reaches conflict (a ⊤ / NSC firing) — bounded,
// because the claim log is finite and ∨ₖ settling reaches a fixpoint. It never
// becomes aperiodic.

import {
  chargeValue,
  chargeValueName,
  joinKnowledgeValue,
  type ChargeValueName,
} from "../../lib/articulating/predicating/positing/bilattice-charge.mjs";

/** A claim: a charged predication about a cell. `potential` = evidence for,
 *  `active` = evidence against, `stable` = ⊤ (both), `absurd` = ⊥ (neither). Claims
 *  are never retracted; the judgement is derived by settling. */
export interface Claim {
  readonly cell: string;
  readonly charge: ChargeValueName;
}

/** A bounded interactive session: the monotone, append-only claim log and whether a
 *  close handshake has settled it. Nothing here is ever overwritten. */
export interface Session {
  readonly claims: readonly Claim[];
  readonly closed: boolean;
}

/** Open an empty session. */
export function openSession(): Session {
  return { claims: [], closed: false };
}

/** Append one claim — never overwriting an earlier one. A closed session is inert. */
export function claim(session: Session, cell: string, charge: ChargeValueName): Session {
  if (session.closed) return session;
  return { claims: [...session.claims, { cell, charge }], closed: false };
}

/** The judgement: for each cell, the ∨ₖ knowledge-join of every claim about it — the
 *  collective standing. `potential` and `active` on one cell settle to `stable`
 *  (⊤, contested); knowledge only grows, but the verdict can flip with no claim
 *  removed. */
export function judge(session: Session): Map<string, ChargeValueName> {
  const byCell = new Map<string, ChargeValueName>();
  for (const { cell, charge } of session.claims) {
    const prior = byCell.get(cell);
    byCell.set(
      cell,
      prior === undefined
        ? charge
        : chargeValueName(joinKnowledgeValue(chargeValue(prior), chargeValue(charge))),
    );
  }
  return byCell;
}

/** The cells whose judgement is in conflict (`stable` = ⊤, both for and against) —
 *  the curved / transfinite signature (an NSC firing). */
export function conflicts(session: Session): readonly string[] {
  return [...judge(session)].filter(([, verdict]) => verdict === "stable").map(([cell]) => cell);
}

/** The session's settling regime, read off its judgement: `scott` (flat — no cell in
 *  conflict, H¹=0) or `transfinite` (some cell at ⊤, bounded). Never aperiodic: the
 *  claim log is finite and ∨ₖ settling reaches a fixpoint. */
export function sessionRegime(session: Session): "scott" | "transfinite" {
  return conflicts(session).length === 0 ? "scott" : "transfinite";
}

/** The close handshake: settle the session so no further claim is accepted. The
 *  accumulated log and its judgement are preserved. */
export function settle(session: Session): Session {
  return { claims: session.claims, closed: true };
}
