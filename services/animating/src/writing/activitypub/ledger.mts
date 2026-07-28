/**
 * writing/activitypub/ledger — the RWIL functor: an agent's outbox IS its witness log.
 *
 * This is the load-bearing claim of the RWIL note made into code: a `log` of EAVT
 * witnesses (relating's witness ledger) and an `outbox` of AS2 Activities (WMAP's
 * across face) are two CHANNEL-CODES of one information source. This module is the
 * functor `F: Activity → EAVT witness` (`activityCell`) and its inverse
 * `G: witness → Activity` (`activityFromCell`); the isomorphism laws — round-trip,
 * surprisal-dedup, ⊤-preservation, and the bulk merge-square — are pinned in
 * test/rwil-outbox-iso.test.mjs.
 *
 * No second ontology: `F` reuses the existing utterance bridge verbatim
 * (`utteranceFromActivity` / `activityFromUtterance`). The ONLY thing the EAVT form
 * adds is carrying the activity's `published` time in the witness slot `T` — the one
 * bit the bare utterance bridge forgets. So the log is simply the bridge, with time.
 *
 * Source/channel separation (Shannon) = the data-form/wire-form split: the witness
 * is the source symbol; `eavt+jsonl`-on-fs (relating's ledger store) and this AS2
 * OrderedCollection outbox are two channel codes of it. Layering: consumes only
 * relating's root apex (`utterance`/`mark`) and animating's own AP index — never a
 * relating subpath; the law test wires the functor to the real ledger machinery.
 */
import { utterance, mark } from "@red-cup-engineering/relating";
import { utteranceFromActivity, activityFromUtterance, type Activity } from "./index.mjs";

/**
 * One EAVT witness row — structurally relating's ledger `EAVTRecord`, declared here
 * so the functor needs no ledger subpath. At time `t`, the Actor `e` witnessed the
 * claim `a` standing at polarity `v` on the across face.
 */
export interface WitnessRow {
  /** entity — the Actor (who uttered the membrane meme). */
  readonly e: string;
  /** attribute — the bare claim subject (what is at issue), negation stripped. */
  readonly a: string;
  /** value — the across-face polarity standing: `Create` ⇒ assert, `Undo` ⇒ deny. */
  readonly v: "assert" | "deny";
  /** time — the witness coordinate: the activity's `published`, or "" if untimed. */
  readonly t: string;
}

/** The leading denial marker the across face writes (`communicating`'s `isDenial`). */
const NEG = "not ";

/**
 * F — cellize one outbound Activity into one EAVT witness row. The actor is the
 * entity, the bare claim the attribute, the polarity (Create=assert / Undo=deny) the
 * value, and `published` (or the supplied `at`) the witness time. Reads polarity via
 * `utteranceFromActivity`, so it is exactly how the across face reads the same wire.
 */
export function activityCell(activity: Activity, at?: string): WitnessRow {
  const claim = String(utteranceFromActivity(activity).claim.mark.value);
  const token = String(utteranceFromActivity(activity).token.mark.value);
  const denied = claim.startsWith(NEG);
  return {
    e: token,
    a: denied ? claim.slice(NEG.length) : claim,
    v: denied ? "deny" : "assert",
    t: String(activity.published ?? at ?? ""),
  };
}

/**
 * G — the inverse: re-emit one EAVT witness row as its canonical Activity. Reuses
 * `activityFromUtterance`, so the wire polarity (`Create`/`Undo`) and the `Note`
 * object are produced exactly as the outbox leg does; the witness time `T` is
 * restored as `published`. `G ∘ F = id` on the canonical Create/Undo activity form.
 */
export function activityFromCell(row: WitnessRow): Activity {
  const claim = row.v === "deny" ? `${NEG}${row.a}` : row.a;
  const activity = activityFromUtterance(utterance(mark(row.e), mark(claim)), {
    type: row.v === "deny" ? "Undo" : "Create",
  });
  return row.t === "" ? activity : { ...activity, published: row.t };
}

/**
 * The merge identity of a witness — `(who, polarity, what)`, TIME-FORGOTTEN. This is
 * organizing's `mergeKey` for the canonical (id-less) Create/Undo form, written as
 * the spec the bulk law checks against: the state projection dedups distinct
 * standings to exactly these keys. The gap between this key (no time) and the log's
 * `eavtId` (with time) is the rate-distortion seam — the log is a time-refinement of
 * the merged outbox; they agree at the bulk where time has done its latest-wins job.
 */
export function standingKey(row: WitnessRow): string {
  return `${row.e}|${row.v}|${row.a}`;
}
