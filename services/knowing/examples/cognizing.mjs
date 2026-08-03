/**
 * cognizing — knowing as the comonad on the Meme carrier.
 *
 * Every knowing morphism is Meme → Meme, working the knowledge order ≤_k.
 * The ε-counit (cognize) is the faithful extract; absorb is a ≤_k increment;
 * reflect converges (finite regime) while ruminate is aperiodic (never-settling).
 */
import {
  cognizeAction,
  absorbAction,
  reflectAction,
  ruminateAction,
  doubtAction,
  forgetAction,
  assessAction,
  inferAction,
  consolidateAction,
  knowNecessarilyAction,
  knowPossiblyAction,
  stateFromMemes,
} from "@red-cup-engineering/knowing";
import { meme, cell, token, mark, charge, chargeValue, canonical } from "@red-cup-engineering/relating";

// ── build a meme (the comonad's carrier) ─────────────────────────────────────────
const pred = {
  kind: "predication.predicate",
  claim: { kind: "utterance.claim", hand: "right", mark: mark("knows") },
  mark: mark("knows"),
};
const makeMeme = (subject, object, value, evidence = [[], []]) =>
  meme(cell(token(mark(subject)), pred, token(mark(object))), charge(chargeValue(value), evidence));

const m = makeMeme("knower", "thing", "potential", [[mark("obs")], []]);

// ── cognize: the ε-counit (faithful extract) ────────────────────────────────────
const out = cognizeAction.run(m, {});
console.log("cognize kind:", out.kind);   // "predication.fiber.meme"
console.log("cell preserved:", canonical(out.cell) === canonical(m.cell)); // true

// ── absorb: a ≤_k increment (adds evidence, raises knowledge order) ──────────────
const learned = absorbAction.run(m, { evidence: "counter", side: "against" });
const standing = assessAction.run(learned, {});
console.log("absorbed standing:", standing.standing); // "stable" (both sides witnessed)
console.log("settled:", standing.settled);            // true

// ── reflect vs ruminate: finite vs aperiodic regime ──────────────────────────────
const stable = makeMeme("knower", "thing", "stable", [[mark("o")], [mark("c")]]);
const reflected = reflectAction.run(stable, {});
console.log("reflect kind:", reflected.kind);   // meme — converges (finite)

const ruminated = ruminateAction.run(stable, {});
console.log("ruminate kind:", ruminated.kind);  // meme — never-settling (aperiodic)

// ── doubt: suspend evidence ───────────────────────────────
const doubted = doubtAction.run(stable, {});
console.log("doubt kind:", doubted.kind);        // meme — suspended

// ── forget: erase both sides of evidence ─────────────────────────────────────────
const forgotten = forgetAction.run(stable, {});
const forgottenStanding = assessAction.run(forgotten, {});
console.log("forgotten standing:", forgottenStanding.standing); // "absurd" (no evidence)

// ── modalities: necessarily / possibly — box/diamond over a world-set W ──────────
// Each world is a canonical knowledge-state produced from a folded section of memes.
const world = stateFromMemes("example", [m]);
const necessarily = knowNecessarilyAction.run({ meme: m, worlds: [world] }, {});
const possibly    = knowPossiblyAction.run({ meme: m, worlds: [world] }, {});
console.log("necessarily kind:", necessarily.kind);   // "knowing.modal-standing"
console.log("necessarily modality:", necessarily.modality); // "necessity"
console.log("possibly kind:", possibly.kind);         // "knowing.modal-standing"
console.log("possibly modality:", possibly.modality); // "possibility"
