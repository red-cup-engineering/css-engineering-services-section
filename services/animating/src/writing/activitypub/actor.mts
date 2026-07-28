/**
 * writing/activitypub/actor — the Actor projection: the single agent AS an
 * ActivityPub Actor. The agent's OUTWARD identity card on the social web.
 *
 * No second ontology: an Actor is a pure VIEW of the existing `Agent` carrier (the
 * glued individual sheaf). The agent's `identity` is the Actor `id`; the agent IS a
 * `perceive(input)→act(output)` loop, and that loop is exactly the Actor's
 * inbox/outbox — perceive ← inbox, act → outbox. `followers`/`following` are the
 * Actor's peer-set endpoints; at scale 1 they are endpoint IRIs only — the actual
 * membership (a camp of many Actors) is scale-2 and belongs to `organizing`'s
 * federation codec, not here.
 *
 * This is the C2S / actor-document half of ActivityPub: who the agent is and where
 * its inbox/outbox live. Delivery, signing, and the inbox/outbox COLLECTIONS are
 * separate bricks. See dev/docs/notes/2026-06-25-codecs-on-faces-activitypub-across-scales.md.
 */
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";
import { ACTIVITYSTREAMS_CONTEXT } from "./index.mjs";
import type { Agent } from "../../becoming/doing/working/governing/carriers.mjs";

/** An ActivityPub Actor — the agent's outward identity document. Single-source
 *  carrier (schema = type = `$id` = validator), bare descent-path `$id`. */
export const actorSchema = {
  $id: "animating/writing/activitypub/actor",
  title: "Actor",
  description:
    "An ActivityPub Actor: the single agent's outward identity document, a pure view of the glued-sheaf `Agent`. `id` is the agent's identity; inbox/outbox ARE the perceive→act loop's two legs; followers/following are peer-set endpoints (membership is scale-2). $id is the bare package-rooted path.",
  type: "object",
  additionalProperties: false,
  required: ["@context", "id", "type", "preferredUsername", "inbox", "outbox", "followers", "following", "summary"],
  properties: {
    "@context": { const: ACTIVITYSTREAMS_CONTEXT },
    id: { type: "string" },
    type: { type: "string" },
    preferredUsername: { type: "string" },
    inbox: { type: "string" },
    outbox: { type: "string" },
    followers: { type: "string" },
    following: { type: "string" },
    summary: { type: "string" },
  },
} as const;
export type Actor = FromSchema<typeof actorSchema>;
export const actorCarrier = carrierFrom(actorSchema);

/** Options for projecting an agent as an Actor. */
export interface ActorOptions {
  /** the IRI base under which this agent's endpoints live, e.g. `https://dev.bare-cedar-fog.emsenn.net/agents`.
   *  Ignored if the agent's identity is already an absolute IRI. */
  readonly base?: string;
  /** the AS2 actor type — default `Service` (an autonomous agent). */
  readonly type?: string;
}

const IS_IRI = /^https?:\/\//i;

/** Slugify a bare identity label into an IRI path segment. */
function handleSlug(identity: string): string {
  return identity.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "agent";
}

/**
 * actorOfAgent — project an agent as its ActivityPub Actor. The agent's `identity`
 * becomes the Actor `id` (used directly if it is already an absolute IRI, else joined
 * under `base`); the perceive→act loop becomes the inbox/outbox; the peer-set
 * endpoints are derived from the id. A pure view — it reads only the agent's
 * identity and re-models nothing.
 */
export function actorOfAgent(agent: Agent, options: ActorOptions = {}): Actor {
  const identity = agent.identity;
  const base = (options.base ?? "").replace(/\/+$/, "");
  const id = IS_IRI.test(identity) ? identity : `${base}/${handleSlug(identity)}`;
  return {
    "@context": ACTIVITYSTREAMS_CONTEXT,
    id,
    type: options.type ?? "Service",
    preferredUsername: IS_IRI.test(identity) ? handleSlug(identity.replace(IS_IRI, "")) : identity,
    inbox: `${id}/inbox`,
    outbox: `${id}/outbox`,
    followers: `${id}/followers`,
    following: `${id}/following`,
    summary: summaryOfAgent(agent),
  };
}

/** Reflect the agent's three-faced interior onto its public card: the across (truth)
 *  lean, the inside (knowledge) cognition regime, and its characteristic disposition.
 *  A pure view of the existing agent readings — making the faces visible on the Actor. */
function summaryOfAgent(agent: Agent): string {
  const leans =
    agent.stance.lean === "potential" ? "leans for"
    : agent.stance.lean === "active" ? "leans against"
    : agent.stance.lean === "stable" ? "is torn (told-both)"
    : "is uncommitted";
  const knows = agent.cognition.reflects ? "reflecting (recallable)" : "ruminating (unsettled)";
  return `An agent that ${leans} on the truth axis, ${knows} on the knowledge axis; characteristic standing: ${agent.character.signature}.`;
}
