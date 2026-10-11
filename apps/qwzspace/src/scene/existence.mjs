import { readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";
/**
 * Existence as a reading of told evidence — and death as a reading of it.
 *
 * In this engine a body does not have a boolean `alive`. Its existence is a
 * four-valued reading of its evidence (SignCell), and *visibility is that
 * reading*: a body renders when its existence reads real or
 * contradiction, and is culled when it reads destroyed or unknown. Evidence is
 * monotone — conservation of evidence, the substrate's first commitment — so a
 * body's existence is never mutated; it is the knowledge-join of the positive
 * `alive` evidence and the negative `slain` evidence accumulated about it:
 *
 *     existence = readingOfSides(knowledge, alive, slain)
 *
 *   ⊥ absurd     no evidence either way      → not a body yet; culled
 *   t potential  alive, not slain            → real; rendered
 *   f active     slain, never alive          → destroyed/void; culled
 *   ⊤ stable     alive AND slain             → a held contradiction; the
 *                                              paraconsistent case — the engine
 *                                              does not throw it, it *renders*
 *                                              it (the undead)
 *
 * `slain ⊣ alive` (slain read as negative evidence into the existence cell) is
 * the *reading*, not an admitted polarity: meme-topology has no verb that
 * admits a denial. The negativity lives here, at the read, exactly as aletheon
 * and ruinfold routed a killing blow's `slain` row as negative evidence.
 *
 * Which contradiction a slain body *gets* is read from its death-rule (data on
 * the body), routed onto the same four values — the five deaths ruinfold built,
 * recovered as policy over the bilattice rather than five code paths.
 */
export const noEvidence = () => Object.freeze({ kind: "qwzspace.existence.evidence", aliveCount: 0, slainCount: 0 });
/** Articulate one unit of positive `alive` evidence (spawn, heal, resurrect). */
export const witnessAlive = (evidence, units = 1) => Object.freeze({ ...evidence, aliveCount: evidence.aliveCount + Math.max(1, units | 0) });
/** Articulate one unit of negative `slain` evidence (a killing blow). */
export const witnessSlain = (evidence, units = 1) => Object.freeze({ ...evidence, slainCount: evidence.slainCount + Math.max(1, units | 0) });
/** The existence reading of a body: which of alive and slain its evidence has told — both told
 *  is the contradiction `⊤` (stable), which is why the undead are a held contradiction and not
 *  a crash. */
export const existenceReading = (evidence) => readingOfSides("knowledge", evidence.aliveCount > 0, evidence.slainCount > 0);
/** The bilattice glyph the wire carries so a client can show world-truth, as
 *  aletheon's view did. */
export const existenceGlyph = (evidence) => {
    switch (existenceReading(evidence)) {
        case "absurd": return "⊥";
        case "potential": return "t";
        case "active": return "f";
        case "stable": return "⊤";
    }
};
export const DEATH_RULES = Object.freeze(["undead", "named", "mortal", "construct", "cursed"]);
export const isDeathRule = (value) => typeof value === "string" && DEATH_RULES.includes(value);
/** Does a body with this death-rule and this evidence render? Real (t) always
 *  renders. Of the contradiction (⊤), only the undead render — every other
 *  rule reads ⊤ as gone. Destroyed (f) and unknown (⊥) never render. */
export const rendersUnder = (rule, evidence) => {
    const name = existenceReading(evidence);
    if (name === "potential")
        return true;
    if (name === "stable")
        return rule === "undead";
    return false;
};
/** Whether a slain body of this rule is *unmade* — removed from the world
 *  rather than left as a (possibly hidden) corpse. Constructs return to ⊥. */
export const isUnmadeUnder = (rule, evidence) => rule === "construct" && existenceReading(evidence) === "stable";
