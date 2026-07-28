/**
 * writing/activitypub — animating's ACROSS-face standards codec: the single agent
 * as an ActivityPub Actor (the Client-to-Server / object surface).
 *
 * This is the scale-1 across-face standard. animating is the bulk that glues three
 * boundary faces into one agent; the ACROSS face is `communicating` (meme in / meme
 * out over the agent's membrane). ActivityPub is the standardized wire for exactly
 * that face: an Actor receives Activities at its inbox (perceive) and emits them
 * from its outbox (act). So an ActivityStreams `Activity` is, for us, ONE membrane
 * utterance crossing the boundary — and this codec is the pure value↔wire bridge
 * between the two, NOT a second ontology.
 *
 * No second ontology (the gate): an inbound `Activity` becomes a relating
 * `UtteranceCarrier` — the exact carrier the agent's membrane is made of and the
 * `communicating` across face (`membraneMeme`/`communicatingFace`) already reads —
 * with `actor` as the token (who) and the activity's object content as the claim
 * (what). An outbound utterance becomes an `Activity` the same way. Charge/polarity
 * (assertion vs. `Undo` = denial) is the across face's truth-axis reading; this
 * brick supplies the object bridge, leaving the truth-direction to `communicating`.
 *
 * Layering: this consumes only relating's stable root apex (`mark`, `utterance`,
 * `UtteranceCarrier`, `carrier`) — never a relating subpath — and is downstream of
 * the `communicating` across face. The Actor projection (Actor = the agent), the
 * inbox/outbox collections, and S2S federation are separate bricks; federation
 * (many Actors) is scale-2 and belongs to `organizing`, not here.
 * See dev/docs/notes/2026-06-25-codecs-on-faces-activitypub-across-scales.md.
 */
import { carrierFrom, mark, utterance, type FromSchema, type UtteranceCarrier, type ChargeValueName } from "@red-cup-engineering/relating";
import type { IllocutionaryForce } from "@red-cup-engineering/communicating";

/** The ActivityStreams 2.0 JSON-LD context — emitted as a literal constant so this
 *  codec needs no JSON-LD processor and no semantic-web dependency (the agent's
 *  across face only emits/consumes the AS2 vocabulary it actually uses). */
export const ACTIVITYSTREAMS_CONTEXT = "https://www.w3.org/ns/activitystreams" as const;

/** An ActivityStreams object the activity is about: either a bare IRI/text string,
 *  or a `Note`-like object whose `content` carries the claim. */
const objectSchema = {
  anyOf: [
    { type: "string", description: "a bare IRI or text the activity is about" },
    {
      type: "object",
      additionalProperties: true,
      description: "an AS2 object node (content carries the claim)",
      properties: {
        type: { type: "string" },
        content: { type: "string" },
        id: { type: "string" },
      },
    },
  ],
} as const;

export const activitySchema = {
  $id: "animating/writing/activitypub/activity",
  title: "Activity",
  description:
    "An ActivityStreams 2.0 Activity: the AS2 wire form of one membrane utterance crossing the agent's across (communicating) boundary. $id is the bare package-rooted path.",
  type: "object",
  additionalProperties: false,
  required: ["@context", "type", "actor", "object"],
  properties: {
    "@context": { const: ACTIVITYSTREAMS_CONTEXT },
    id: { type: "string" },
    type: { type: "string" },
    actor: { type: "string" },
    object: objectSchema,
    target: { type: "string" },
    to: { type: "array", items: { type: "string" } },
    cc: { type: "array", items: { type: "string" } },
    published: { type: "string" },
  },
} as const;

/** An ActivityStreams 2.0 Activity — one membrane utterance crossing the agent's
 *  boundary, in its AS2 wire form. The carrier is single-source (the schema is the
 *  type, the `$id`, and the validator), with a bare descent-path `$id`. */
export type Activity = FromSchema<typeof activitySchema>;
export const activityCarrier = carrierFrom(activitySchema);

/** AS2 activity types that NEGATE a prior assertion — they cross the boundary as
 *  denials (the across face reads them `active`/against, the truth-axis antitone). */
const NEGATING_TYPES: ReadonlySet<string> = new Set(["Undo", "Delete"]);

/** The leading negation marker the across face (`communicating`'s `isDenial`) reads. */
const NEGATION_MARK = "not ";
const NEGATION = /^\s*(?:not|no|never)\s+|^\s*[¬!-]\s*/i;

/** The claim text an activity carries: the object string itself, else its `content`,
 *  else its `id` (an Activity always settles to one claim on the across face). */
function claimOf(object: Activity["object"]): string {
  if (typeof object === "string") return object;
  return object.content ?? object.id ?? "";
}

/** Strip any leading negation marker, returning the bare positive claim. */
function bareClaim(claim: string): string {
  return claim.replace(NEGATION, "").trim();
}

/** Whether a claim already reads as a denial on the truth axis. */
function isDeniedClaim(claim: string): boolean {
  return NEGATION.test(claim);
}

/**
 * utteranceFromActivity — admit one inbound Activity as a membrane utterance: the
 * exact `UtteranceCarrier` the agent's across face is made of. `actor` becomes the
 * token (who uttered), the object's content becomes the claim (what was uttered).
 * The result flows straight into `perceive`/`communicatingFace` — no second
 * ontology, no parallel microblog model.
 */
export function utteranceFromActivity(activity: Activity): UtteranceCarrier {
  const base = bareClaim(claimOf(activity.object));
  // A negating activity (Undo/Delete) crosses as a DENIAL — the across face reads
  // the negation marker and leans `active` (against); an assertion + its Undo of the
  // same subject pool to ⊤ (a held contradiction), the truth-axis antitone.
  const claim = NEGATING_TYPES.has(activity.type) ? `${NEGATION_MARK}${base}` : base;
  return utterance(mark(activity.actor), mark(claim));
}

/** Options for projecting an utterance back out as an Activity. */
export interface ActivityOptions {
  /** the AS2 activity type to emit — default `Create` (an assertion). */
  readonly type?: string;
  /** the activity IRI, if minted. */
  readonly id?: string;
  /** the AS2 object type to wrap the claim in — default `Note`. */
  readonly objectType?: string;
}

/**
 * activityFromUtterance — emit one membrane utterance outbound as an Activity: the
 * dual of `utteranceFromActivity`. The token becomes the `actor`, the claim becomes
 * a `Note`-like object's `content`. This is the outbox leg of the across face.
 */
export function activityFromUtterance(carrierUtterance: UtteranceCarrier, options: ActivityOptions = {}): Activity {
  const actor = String(carrierUtterance.token.mark.value);
  const rawClaim = String(carrierUtterance.claim.mark.value);
  // A denial utterance emits as an Undo over the bare (positive) statement it negates,
  // unless the caller forces a type — so denial round-trips through the wire polarity.
  const denied = isDeniedClaim(rawClaim);
  const type = options.type ?? (denied ? "Undo" : "Create");
  return {
    "@context": ACTIVITYSTREAMS_CONTEXT,
    ...(options.id === undefined ? {} : { id: options.id }),
    type,
    actor,
    object: { type: options.objectType ?? "Note", content: bareClaim(rawClaim) },
  };
}

// ── relating's FOUR bilattice → AS2 visibility (addressing as epistemic reach) ──

/** The AS2 magic public collection — addressing it makes an Activity world-visible. */
export const AS2_PUBLIC = "https://www.w3.org/ns/activitystreams#Public" as const;

/**
 * audience — map a FOUR bilattice charge to AS2 addressing, reading visibility as
 * epistemic REACH along ≤_k: `absurd` ⊥ (told-nothing) = direct/private (only the
 * named recipients), `potential` t = followers-only, `active` f = unlisted (visible,
 * not promoted to Public), `stable` ⊤ (told-both, the ≤_k top) = public (maximal
 * reach). So the bilattice order IS the reach order: direct < {followers, unlisted} <
 * public. Earned from relating's FOUR — addressing is the knowledge-extent of a meme.
 */
export function audience(charge: ChargeValueName, followers: string, direct: readonly string[] = []): { readonly to: readonly string[]; readonly cc: readonly string[] } {
  switch (charge) {
    case "stable": return { to: [AS2_PUBLIC], cc: [followers] };       // ⊤ public
    case "potential": return { to: [followers], cc: [] };              // t followers-only
    case "active": return { to: [...direct], cc: [followers] };        // f unlisted
    case "absurd": default: return { to: [...direct], cc: [] };        // ⊥ direct/private
  }
}

/**
 * visibility — read an Activity's addressing back as its FOUR charge (the inverse of
 * `audience`): Public ⇒ `stable` ⊤, followers in `to` ⇒ `potential`, followers only in
 * `cc` ⇒ `active`, neither ⇒ `absurd` ⊥. The visibility of a post IS a bilattice value.
 */
export function visibility(activity: Activity, followers: string): ChargeValueName {
  const to = activity.to ?? [];
  const cc = activity.cc ?? [];
  if (to.includes(AS2_PUBLIC)) return "stable";
  if (to.includes(followers)) return "potential";
  if (cc.includes(followers)) return "active";
  return "absurd";
}

// ── communicating's speech-act theory → AS2 activity types as illocutionary force ──

/** The Searle illocutionary force of each AS2 activity type — every Activity IS a
 *  speech act (communicating's `illocuting` surface). */
const ILLOCUTION: Readonly<Record<string, IllocutionaryForce>> = Object.freeze({
  // assertive — commit to how things are (saying-that)
  Create: "assertive", Note: "assertive", Article: "assertive", Update: "assertive", Announce: "assertive",
  // directive — get the addressee to do (asking, requesting)
  Follow: "directive", Question: "directive", Offer: "directive", Invite: "directive", Invoke: "directive",
  // commissive — commit the speaker to a course (accepting, refusing)
  Accept: "commissive", TentativeAccept: "commissive", Reject: "commissive", TentativeReject: "commissive",
  // expressive — voice a psychological state
  Like: "expressive", Dislike: "expressive", View: "expressive", Listen: "expressive", Read: "expressive",
  // declaration — change social reality by saying so (performatives)
  Undo: "declaration", Delete: "declaration", Block: "declaration", Add: "declaration", Remove: "declaration", Move: "declaration", Flag: "declaration",
});

/**
 * illocutionOf — read an Activity's illocutionary FORCE (communicating's speech-act
 * theory): each AS2 type is a Searle speech act — `Create` asserts, `Follow`/`Invoke`
 * direct, `Accept` commits, `Like` expresses, `Undo`/`Delete` declare (performatives
 * that change social reality). Unknown types default to `assertive` (the AS2 content
 * default). This is the saying-as-doing reading of an Activity.
 */
export function illocutionOf(activity: Activity): IllocutionaryForce {
  return ILLOCUTION[activity.type] ?? "assertive";
}

// ── communicating's messaging → AS2 direct messaging (a private channel of two) ──

/** A direct channel between two Actors — communicating's `openChannel`: a private
 *  conduit, optionally capacity-bounded (the messaging resource). */
export interface Channel {
  readonly kind: "animating.activitypub.channel";
  readonly from: string;
  readonly to: string;
  readonly medium: string;
  /** the channel capacity (a messaging resource), or null for unbounded. */
  readonly capacity: number | null;
}

// ── knowing's reflection → AS2 Question/answer from settled knowledge ──

/** askQuestion — pose a `Question` about a claim (an AS2 directive speech act). */
export function askQuestion(actor: string, query: string, to?: readonly string[]): Activity {
  return {
    "@context": ACTIVITYSTREAMS_CONTEXT,
    type: "Question",
    actor,
    object: { type: "Question", content: query },
    ...(to === undefined ? {} : { to: [...to] }),
  };
}

/**
 * answer — the agent's settled ≤_k STANDING on a query, read from what it knows
 * (knowing's reflection): scan the known Activities for the queried claim and return
 * the Belnap value — `potential` (believes: asserted, unchallenged), `active`
 * (disbelieves: denied/Undone), `stable` ⊤ (knows-both: asserted AND denied — a held
 * contradiction), `absurd` ⊥ (doesn't know: unmentioned). The four epistemic answers.
 */
export function answer(knowledge: readonly Activity[], query: string): ChargeValueName {
  let asserted = false;
  let denied = false;
  for (const activity of knowledge) {
    const claim = String(utteranceFromActivity(activity).claim.mark.value);
    const subject = claim.replace(NEGATION, "").trim();
    if (subject !== query) continue;
    if (isDeniedClaim(claim)) denied = true;
    else asserted = true;
  }
  if (asserted && denied) return "stable";   // ⊤ knows both
  if (asserted) return "potential";          // believes
  if (denied) return "active";               // disbelieves
  return "absurd";                            // doesn't know
}

/** openChannel — open a private channel from one Actor to another. */
export function openChannel(from: string, to: string, medium = "direct", capacity: number | null = null): Channel {
  return { kind: "animating.activitypub.channel", from, to, medium, capacity };
}

/**
 * send — a direct message over a channel: a `Create` addressed PRIVATELY to the
 * channel's recipient (`to` = the recipient, no Public, no followers — visibility ⊥
 * absurd/direct). The AS2 realization of communicating's `sendMessage`.
 */
export function send(channel: Channel, content: string, options: { readonly type?: string; readonly id?: string } = {}): Activity {
  return {
    "@context": ACTIVITYSTREAMS_CONTEXT,
    ...(options.id === undefined ? {} : { id: options.id }),
    type: options.type ?? "Create",
    actor: channel.from,
    object: { type: "Note", content },
    to: [channel.to],
  };
}
