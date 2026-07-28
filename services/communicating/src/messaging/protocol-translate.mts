/**
 * messaging/protocol-translate - across-face wires as one utterance factor.
 *
 * ActivityPub C2S, CloudEvents, and DIDComm plaintext are projections of one
 * communicating boundary item: utterer token, illocutionary force, witness time,
 * truth charge, and claim. Protocol translation is therefore a projector
 * transcode through that carried item, not a mesh of per-pair adapters.
 */
import {
  canonical,
  carrierFrom,
  chargeValue,
  jsonResource,
  mark,
  negateValue,
  parseJson,
  utterance,
  valueOf,
  type ChargeValueName,
  type FromSchema,
  type JsonRecord,
  type JsonValue,
  type UtteranceCarrier,
} from "@red-cup-engineering/relating";
import { define, restrict, transcode, type Projector, type Resource } from "@red-cup-engineering/relating/writing";

import { membraneMeme } from "../communicate/face.mjs";
import type { IllocutionaryForce } from "../speaking/illocuting/index.mjs";
import {
  CLOUDEVENTS_JSON_CONTENT_TYPE,
  cloudEventCarrier,
  cloudEventFromUtterance,
  utteranceFromCloudEvent,
  type CloudEvent,
} from "./cloudevents.mjs";
import {
  didcommMessageFromUtterance,
  didcommPlaintextMessageCarrier,
  utteranceFromDIDCommMessage,
  type DIDCommPlaintextMessage,
} from "./didcomm.mjs";

export const ACTIVITYSTREAMS_CONTEXT = "https://www.w3.org/ns/activitystreams" as const;
export const ACTIVITYPUB_C2S_CONTENT_TYPE = "application/activity+json" as const;
export const DIDCOMM_PLAINTEXT_CONTENT_TYPE = "application/didcomm-plain+json" as const;

export type AcrossFaceProtocol = "activitypub-c2s" | "cloudevents" | "didcomm";

export interface ProtocolUtteranceCarrier {
  readonly kind: "communicating.messaging.protocol-utterance";
  readonly protocol: AcrossFaceProtocol;
  readonly utterance: UtteranceCarrier;
  readonly force: IllocutionaryForce | null;
  readonly time: string | null;
  readonly truthCharge: ChargeValueName;
  readonly recipient: string | null;
}

export interface ProtocolTranslateOptions {
  readonly path?: string;
}

export interface SocializingAcrossFaceLift {
  readonly package: "@red-cup-engineering/socializing";
  readonly scale: "scale-2";
  readonly wires: readonly ["Matrix state-resolution", "ActivityPub S2S"];
  readonly law: "same-projector-transcode-factor";
  readonly status: "Roadmap";
}

export const socializingAcrossFaceLift: SocializingAcrossFaceLift = Object.freeze({
  package: "@red-cup-engineering/socializing",
  scale: "scale-2",
  wires: ["Matrix state-resolution", "ActivityPub S2S"] as const,
  law: "same-projector-transcode-factor",
  status: "Roadmap",
});

const activityObjectSchema = {
  anyOf: [
    { type: "string" },
    {
      type: "object",
      additionalProperties: true,
      properties: {
        type: { type: "string" },
        content: { type: "string" },
        id: { type: "string" },
      },
    },
  ],
} as const;

export const activityPubC2sActivitySchema = {
  $id: "communicating/messaging/activitypub-c2s/activity",
  title: "ActivityPubC2SActivity",
  description:
    "ActivityStreams C2S activity as one communicating across-face utterance wire projection.",
  type: "object",
  additionalProperties: false,
  required: ["@context", "type", "actor", "object"],
  properties: {
    "@context": { const: ACTIVITYSTREAMS_CONTEXT },
    id: { type: "string" },
    type: { type: "string" },
    actor: { type: "string" },
    object: activityObjectSchema,
    target: { type: "string" },
    to: { type: "array", items: { type: "string" } },
    cc: { type: "array", items: { type: "string" } },
    published: { type: "string" },
  },
} as const;

export type ActivityPubC2sActivity = FromSchema<typeof activityPubC2sActivitySchema>;
export const activityPubC2sActivityCarrier = carrierFrom(activityPubC2sActivitySchema);

const NEGATING_ACTIVITY_TYPES: ReadonlySet<string> = new Set(["Undo", "Delete", "Tombstone"]);
const NEGATION_MARK = "not ";
const NEGATION = /^\s*(?:not|no|never)\s+|^\s*[!-]\s*/i;
const AS2_PUBLIC = "https://www.w3.org/ns/activitystreams#Public";

const ILLOCUTION: Readonly<Record<string, IllocutionaryForce>> = Object.freeze({
  Create: "assertive",
  Note: "assertive",
  Article: "assertive",
  Update: "assertive",
  Announce: "assertive",
  Follow: "directive",
  Question: "directive",
  Offer: "directive",
  Invite: "directive",
  Invoke: "directive",
  Accept: "commissive",
  TentativeAccept: "commissive",
  Reject: "commissive",
  TentativeReject: "commissive",
  Like: "expressive",
  Dislike: "expressive",
  View: "expressive",
  Listen: "expressive",
  Read: "expressive",
  Undo: "declaration",
  Delete: "declaration",
  Tombstone: "declaration",
  Block: "declaration",
  Add: "declaration",
  Remove: "declaration",
  Move: "declaration",
  Flag: "declaration",
});

function parseRecord(content: string, context: string): JsonRecord {
  const parsed = parseJson(content);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError(`${context}: expected a JSON object`);
  }
  return parsed as JsonRecord;
}

function recognizes<T>(resource: Resource, assert: (value: JsonRecord) => T): boolean {
  try {
    assert(parseRecord(resource.content, "protocol projector recognize"));
    return true;
  } catch {
    return false;
  }
}

function claimOf(object: ActivityPubC2sActivity["object"]): string {
  if (typeof object === "string") return object;
  return String(object.content ?? object.id ?? "");
}

function bareClaim(claim: unknown): string {
  const text = typeof claim === "string" ? claim.trim() : String(claim);
  return text.replace(NEGATION, "").trim() || text;
}

function isDeniedClaim(claim: unknown): boolean {
  const text = typeof claim === "string" ? claim.trim() : String(claim);
  return text === "false" || NEGATION.test(text);
}

function defaultFollowers(actor: string): string {
  return actor.endsWith("/") ? `${actor}followers` : `${actor}/followers`;
}

function activityAudience(
  charge: ChargeValueName,
  actor: string,
): { readonly to?: readonly string[]; readonly cc?: readonly string[] } {
  const followers = defaultFollowers(actor);
  switch (charge) {
    case "stable":
      return { to: [AS2_PUBLIC], cc: [followers] };
    case "potential":
      return { to: [followers] };
    case "active":
      return { cc: [followers] };
    case "absurd":
    default:
      return { to: [] };
  }
}

function activityTruthCharge(activity: ActivityPubC2sActivity, fallback: UtteranceCarrier): ChargeValueName {
  const followers = defaultFollowers(activity.actor);
  const to = activity.to ?? [];
  const cc = activity.cc ?? [];
  if (to.includes(AS2_PUBLIC)) return "stable";
  if (to.includes(followers)) return "potential";
  if (cc.includes(followers)) return "active";
  if ("to" in activity || "cc" in activity) return "absurd";
  return valueOf(membraneMeme(fallback).charge).name;
}

function utteranceFromActivityPubC2s(activity: ActivityPubC2sActivity): UtteranceCarrier {
  const base = bareClaim(claimOf(activity.object));
  const claim = NEGATING_ACTIVITY_TYPES.has(activity.type) ? `${NEGATION_MARK}${base}` : base;
  return utterance(mark(activity.actor), mark(claim));
}

function activityForce(activity: ActivityPubC2sActivity): IllocutionaryForce | null {
  return ILLOCUTION[activity.type] ?? null;
}

function protocolCarrier(
  protocol: AcrossFaceProtocol,
  utteranceCarrier: UtteranceCarrier,
  force: IllocutionaryForce | null,
  time: string | null,
  truthCharge: ChargeValueName,
  recipient: string | null = null,
): ProtocolUtteranceCarrier {
  return Object.freeze({
    kind: "communicating.messaging.protocol-utterance" as const,
    protocol,
    utterance: utteranceCarrier,
    force,
    time,
    truthCharge,
    recipient,
  });
}

function writeOne(items: readonly ProtocolUtteranceCarrier[], target: string): ProtocolUtteranceCarrier {
  if (items.length !== 1) throw new TypeError(`${target}: expected exactly one protocol utterance`);
  return items[0]!;
}

function serialize(value: unknown, context: string): string {
  return `${canonical(jsonResource(value, context))}\n`;
}

function requireForce(item: ProtocolUtteranceCarrier, target: string): IllocutionaryForce {
  if (item.force === null) {
    throw new TypeError(`${target}: cannot fabricate illocutionary force missing from the source wire`);
  }
  return item.force;
}

function requireTime(item: ProtocolUtteranceCarrier, target: string): string {
  if (item.time === null) {
    throw new TypeError(`${target}: cannot fabricate witness time missing from the source wire`);
  }
  return item.time;
}

function negateClaim(claim: unknown): string {
  const text = typeof claim === "string" ? claim.trim() : String(claim);
  return isDeniedClaim(text) ? bareClaim(text) : `${NEGATION_MARK}${bareClaim(text)}`;
}

export function negateProtocolUtterance(item: ProtocolUtteranceCarrier): ProtocolUtteranceCarrier {
  const nextClaim = negateClaim(item.utterance.claim.mark.value);
  const nextDenied = isDeniedClaim(nextClaim);
  const nextForce = nextDenied ? "declaration" : item.force === "declaration" ? "assertive" : item.force;
  return protocolCarrier(
    item.protocol,
    utterance(mark(item.utterance.token.mark.value), mark(nextClaim)),
    nextForce,
    item.time,
    negateValue(chargeValue(item.truthCharge)).name,
    item.recipient,
  );
}

export const protocolWireProjector: Projector<ProtocolUtteranceCarrier> = define<ProtocolUtteranceCarrier>({
  type: "communicating.protocol-wire",
  corner: "assertion",
  rung: "identity",
  recognize: (resource) => {
    try {
      parseRecord(resource.content, "communicating.protocol-wire");
      return true;
    } catch {
      return false;
    }
  },
});

export const activityPubC2sProjector: Projector<ProtocolUtteranceCarrier> = restrict(protocolWireProjector, {
  type: "activitypub-c2s",
  corner: "assertion",
  rung: "identity",
  recognize: (resource) => recognizes(resource, (value) => activityPubC2sActivityCarrier.assert(value)),
  read: (resource) => {
    const activity = activityPubC2sActivityCarrier.assert(parseRecord(resource.content, "activitypub-c2s read")) as ActivityPubC2sActivity;
    const readUtterance = utteranceFromActivityPubC2s(activity);
    return [protocolCarrier(
      "activitypub-c2s",
      readUtterance,
      activityForce(activity),
      activity.published ?? null,
      activityTruthCharge(activity, readUtterance),
    )];
  },
  write: (items) => {
    const item = writeOne(items, "activitypub-c2s write");
    const actor = String(item.utterance.token.mark.value);
    const rawClaim = String(item.utterance.claim.mark.value);
    const denied = isDeniedClaim(rawClaim);
    const activity: ActivityPubC2sActivity = {
      "@context": ACTIVITYSTREAMS_CONTEXT,
      type: denied ? "Undo" : "Create",
      actor,
      object: { type: denied ? "Tombstone" : "Note", content: bareClaim(rawClaim) },
      ...(item.time === null ? {} : { published: item.time }),
      ...activityAudience(item.truthCharge, actor),
    };
    return serialize(activity, "activitypub-c2s write");
  },
});

export const cloudEventsProjector: Projector<ProtocolUtteranceCarrier> = restrict(protocolWireProjector, {
  type: "cloudevents",
  corner: "assertion",
  rung: "identity",
  recognize: (resource) => recognizes(resource, (value) => cloudEventCarrier.assert(value)),
  read: (resource) => {
    const event = cloudEventCarrier.assert(parseRecord(resource.content, "cloudevents read")) as CloudEvent;
    const readUtterance = utteranceFromCloudEvent(event);
    return [protocolCarrier(
      "cloudevents",
      readUtterance,
      event.type,
      event.time,
      event.emsenntruthcharge ?? valueOf(membraneMeme(readUtterance).charge).name,
    )];
  },
  write: (items) => {
    const item = writeOne(items, "cloudevents write");
    const event = cloudEventFromUtterance(item.utterance, requireForce(item, "cloudevents write"), requireTime(item, "cloudevents write"), {
      truthCharge: item.truthCharge,
    });
    return serialize(event, "cloudevents write");
  },
});

export const didcommProjector: Projector<ProtocolUtteranceCarrier> = restrict(protocolWireProjector, {
  type: "didcomm",
  corner: "assertion",
  rung: "identity",
  recognize: (resource) => recognizes(resource, (value) => didcommPlaintextMessageCarrier.assert(value)),
  read: (resource) => {
    const message = didcommPlaintextMessageCarrier.assert(parseRecord(resource.content, "didcomm read")) as DIDCommPlaintextMessage;
    const readUtterance = utteranceFromDIDCommMessage(message);
    return [protocolCarrier(
      "didcomm",
      readUtterance,
      message.type as IllocutionaryForce,
      message.created_time === undefined ? null : new Date(message.created_time * 1000).toISOString(),
      message.truth_charge ?? valueOf(membraneMeme(readUtterance).charge).name,
      message.to[0] ?? null,
    )];
  },
  write: (items) => {
    const item = writeOne(items, "didcomm write");
    if (item.recipient === null) throw new TypeError("didcomm write: cannot fabricate recipient DID missing from the source wire");
    const time = item.time === null ? undefined : Date.parse(item.time);
    const message = didcommMessageFromUtterance(item.utterance, item.recipient, requireForce(item, "didcomm write"), {
      truthCharge: item.truthCharge,
      ...(time === undefined || Number.isNaN(time) ? {} : { createdTime: Math.floor(time / 1000) }),
    });
    return serialize(message, "didcomm write");
  },
});

export const acrossFaceProtocolProjectors: Readonly<Record<AcrossFaceProtocol, Projector<ProtocolUtteranceCarrier>>> = Object.freeze({
  "activitypub-c2s": activityPubC2sProjector,
  cloudevents: cloudEventsProjector,
  didcomm: didcommProjector,
});

export const acrossFaceProtocolMediaTypes: Readonly<Record<AcrossFaceProtocol, string>> = Object.freeze({
  "activitypub-c2s": ACTIVITYPUB_C2S_CONTENT_TYPE,
  cloudevents: CLOUDEVENTS_JSON_CONTENT_TYPE,
  didcomm: DIDCOMM_PLAINTEXT_CONTENT_TYPE,
});

export function protocolProjector(protocol: AcrossFaceProtocol): Projector<ProtocolUtteranceCarrier> {
  return acrossFaceProtocolProjectors[protocol];
}

export function readProtocolUtterances(protocol: AcrossFaceProtocol, content: string, path = `${protocol}.json`): ProtocolUtteranceCarrier[] {
  return protocolProjector(protocol).read!({ path, content });
}

export function writeProtocolUtterances(protocol: AcrossFaceProtocol, items: readonly ProtocolUtteranceCarrier[]): string {
  return protocolProjector(protocol).write!(items);
}

export function protocolTranslate(
  from: AcrossFaceProtocol,
  to: AcrossFaceProtocol,
  content: string,
  options: ProtocolTranslateOptions = {},
): string {
  return transcode(protocolProjector(from), protocolProjector(to), {
    path: options.path ?? `${from}.json`,
    content,
  });
}
