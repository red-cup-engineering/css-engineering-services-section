import { Activity } from "@fedify/vocab";
import { decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { decodeRelationalValue, encodeRelationalValue, RELATIONAL_VALUE_TYPE } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { rawNiUri as sha256Ni } from "@red-cup-engineering/rmn-semantic-conformance-die/canonical-cbor";
import {
  agentRmnMessage,
  extractRmnPart,
  parseA2aMessage
} from "@red-cup-engineering/a2a-rmn-part-service";

export const ACTIVITYSTREAMS_CONTEXT = "https://www.w3.org/ns/activitystreams";
export const ACTIVITYSTREAMS_PUBLIC = "https://www.w3.org/ns/activitystreams#Public";
export const RMN_MEDIA_TYPE = "application/rmn+cbor";
export const CLOUDEVENTS_MEDIA_TYPE = "application/cloudevents+json";
export const A2A_MEDIA_TYPE = "application/a2a+json";
export const AGENTIC_ACTIVITY_PROFILE = "org.harmonious-union.activitypub.cloudevent.a2a-rmn.v1";
const MAXIMUM_INLINE_RMN_BYTES = 256 * 1024;
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const TYPES = new Set(["Accept", "Announce", "Create", "Offer", "Reject", "Update"]);

function exactUrl(value, label, { https = true } = {}) {
  let url;
  try { url = new URL(value); } catch { throw new TypeError(`${label} must be an absolute URL`); }
  if (https && url.protocol !== "https:" && url.hostname !== "127.0.0.1" && url.hostname !== "localhost") throw new TypeError(`${label} must use HTTPS outside loopback development`);
  return url.href;
}
function actorUrl(origin, identifier) {
  if (typeof identifier !== "string" || !/^[a-z0-9][a-z0-9._-]*$/u.test(identifier)) throw new TypeError("ActivityPub identifier is invalid");
  return new URL(`/actors/${identifier}`, exactUrl(origin, "ActivityPub origin")).href;
}
function one(value) { return Array.isArray(value) ? value : [value]; }
function sameRecipient(left, right) { return left === right || ([left, right].every((value) => [ACTIVITYSTREAMS_PUBLIC, "as:Public"].includes(value))); }
function immutable(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) immutable(child);
  return Object.freeze(value);
}
function dataUri(bytes) { return `data:${RMN_MEDIA_TYPE};base64,${Buffer.from(bytes).toString("base64")}`; }
function dataBytes(value) {
  const match = /^data:application\/rmn\+cbor;base64,([A-Za-z0-9+/]*={0,2})$/u.exec(value ?? "");
  if (!match) throw new TypeError("ActivityPub RMN link must contain one canonical base64 data URI");
  const bytes = Buffer.from(match[1], "base64");
  if (bytes.length > MAXIMUM_INLINE_RMN_BYTES || bytes.toString("base64") !== match[1]) throw new TypeError("ActivityPub RMN link is oversized or noncanonical");
  return bytes;
}

function exactA2aMessage(objectBytes, supplied, expectedRole = "ROLE_AGENT") {
  const payload = Buffer.from(objectBytes ?? []);
  const payloadNi = sha256Ni(payload);
  const message = supplied ?? agentRmnMessage(payload, "operation.rmn.cbor", payloadNi);
  if (message?.role !== expectedRole) throw new TypeError(`ActivityPub RMN projection requires one A2A ${expectedRole} message`);
  let part;
  try {
    part = extractRmnPart(parseA2aMessage(message).parts);
  } catch (error) {
    throw new TypeError(`ActivityPub RMN projection requires one exact A2A RMN part: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!Buffer.from(part.bytes).equals(payload) || part.ni !== payloadNi) {
    throw new TypeError("A2A RMN part does not carry the projected RMN object");
  }
  return immutable(structuredClone(message));
}

function cloudEventBytes({ type, actor, recipient, objectBytes, a2aMessage, eventTime, a2aRole }) {
  const message = exactA2aMessage(objectBytes, a2aMessage, a2aRole);
  const data = {
    profile: AGENTIC_ACTIVITY_PROFILE,
    transport: "A2A",
    message,
  };
  const body = {
    specversion: "1.0",
    source: actor,
    type: `org.harmonious-union.activitypub.${type.toLowerCase()}.v1`,
    time: eventTime ?? "1970-01-01T00:00:00.000Z",
    subject: recipient,
    datacontenttype: A2A_MEDIA_TYPE,
    data,
  };
  const encodedBody = encodeRelationalValue(body);
  const event = { id: semanticId(["ascribe", encodedBody.type, encodedBody.term]), ...body };
  const encoded = encodeRelationalValue(event);
  return semanticBytes(["ascribe", encoded.type, encoded.term]);
}

function unwrapCloudEvent(bytes, expectedType, expectedActor, expectedRecipient) {
  const term = decodeSemantic(bytes);
  if (!Array.isArray(term) || term[0] !== "ascribe" || JSON.stringify(term[1]) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) {
    throw new TypeError("ActivityPub RMN object must carry the canonical CloudEvents/A2A membrane envelope");
  }
  const event = decodeRelationalValue(term[1], term[2]);
  if (event?.specversion !== "1.0" || event.source !== expectedActor || event.subject !== expectedRecipient || event.type !== `org.harmonious-union.activitypub.${expectedType.toLowerCase()}.v1` || event.datacontenttype !== A2A_MEDIA_TYPE || event.data?.profile !== AGENTIC_ACTIVITY_PROFILE || event.data?.transport !== "A2A") {
    throw new TypeError("ActivityPub RMN object has the wrong canonical CloudEvents/A2A envelope");
  }
  if (!["ROLE_USER", "ROLE_AGENT"].includes(event.data.message?.role)) {
    throw new TypeError("CloudEvents data is not one A2A ROLE_USER or ROLE_AGENT message");
  }
  const { id: eventId, ...eventBody } = event;
  const encodedBody = encodeRelationalValue(eventBody);
  if (eventId !== semanticId(["ascribe", encodedBody.type, encodedBody.term])) {
    throw new TypeError("CloudEvents id does not name its canonical RMN body");
  }
  if (typeof event.time !== "string" || !Number.isFinite(Date.parse(event.time))) {
    throw new TypeError("CloudEvents time must be an RFC 3339 timestamp");
  }
  let part;
  try {
    part = extractRmnPart(parseA2aMessage(event.data.message).parts);
  } catch (error) {
    throw new TypeError(`CloudEvents A2A message does not carry one exact RMN part: ${error instanceof Error ? error.message : String(error)}`);
  }
  const objectBytes = Buffer.from(part.bytes);
  if (!semanticBytes(decodeSemantic(objectBytes)).equals(objectBytes)) throw new TypeError("CloudEvents/A2A payload RMN is noncanonical");
  return Object.freeze({
    objectBytes,
    objectNi: part.ni,
    a2aMessage: immutable(structuredClone(event.data.message)),
    cloudEvent: immutable(structuredClone(event)),
  });
}

export function projectRmnActivity({ type, origin, identifier, recipient, objectBytes, agentCard, a2aMessage, eventTime, a2aRole = "ROLE_AGENT" }) {
  if (!TYPES.has(type)) throw new TypeError("ActivityPub RMN projection requires a standard supported Activity type");
  const bytes = Buffer.from(objectBytes ?? []);
  if (bytes.length < 1 || bytes.length > MAXIMUM_INLINE_RMN_BYTES) throw new TypeError("ActivityPub RMN projection requires bounded nonempty canonical bytes");
  try {
    if (!semanticBytes(decodeSemantic(bytes)).equals(bytes)) throw new Error("noncanonical");
  } catch {
    throw new TypeError("ActivityPub RMN projection requires canonical RMN bytes");
  }
  const actor = actorUrl(origin, identifier);
  const to = recipient === ACTIVITYSTREAMS_PUBLIC ? recipient : exactUrl(recipient, "ActivityPub recipient");
  const card = exactUrl(agentCard, "A2A Agent Card");
  if (!["ROLE_USER", "ROLE_AGENT"].includes(a2aRole)) throw new TypeError("ActivityPub RMN projection requires A2A ROLE_USER or ROLE_AGENT");
  const envelopeBytes = cloudEventBytes({ type, actor, recipient: to, objectBytes: bytes, a2aMessage, eventTime, a2aRole });
  const ni = sha256Ni(envelopeBytes);
  const projectionBody = encodeRelationalValue({ type, actor, to, envelopeNi: ni, agentCard: card });
  const projectionDigest = semanticId(["ascribe", projectionBody.type, projectionBody.term]).slice("ni:///sha-256;".length);
  const id = new URL(`/activities/rmn-${projectionDigest}`, exactUrl(origin, "ActivityPub origin")).href;
  return Object.freeze({
    "@context": ACTIVITYSTREAMS_CONTEXT, id, type, actor, to,
    object: Object.freeze({ type: "Document", mediaType: RMN_MEDIA_TYPE, name: ni, url: Object.freeze({ type: "Link", mediaType: RMN_MEDIA_TYPE, href: dataUri(envelopeBytes) }) }),
    attachment: Object.freeze({ type: "Link", mediaType: "application/json", name: "A2A Agent Card", href: card }),
  });
}

export function extractRmnActivity(activity, { expectedActor, expectedRecipient, expectedAgentCard } = {}) {
  if (!activity || !TYPES.has(activity.type) || activity.actor !== exactUrl(expectedActor, "expected ActivityPub actor") || !one(activity.to).some((value) => sameRecipient(value, expectedRecipient))) throw new TypeError("exact addressed ActivityPub RMN projection is required");
  if (activity.object?.type !== "Document" || activity.object.mediaType !== RMN_MEDIA_TYPE || !NI.test(activity.object.name ?? "") || activity.object.url?.type !== "Link" || activity.object.url.mediaType !== RMN_MEDIA_TYPE) throw new TypeError("ActivityPub object must be one RFC 6920 named RMN Document with a standard Link");
  const bytes = dataBytes(activity.object.url.href), ni = sha256Ni(bytes);
  if (ni !== activity.object.name) throw new TypeError("ActivityPub RMN bytes do not match their ni identity");
  const attachments = Array.isArray(activity.attachment) ? activity.attachment : [activity.attachment];
  const cards = attachments.filter((item) => item?.type === "Link" && item.mediaType === "application/json" && item.name === "A2A Agent Card" && typeof item.href === "string");
  if (cards.length !== 1) throw new TypeError("ActivityPub RMN projection must name exactly one A2A Agent Card");
  const agentCard = exactUrl(cards[0].href, "A2A Agent Card");
  if (expectedAgentCard !== undefined && agentCard !== exactUrl(expectedAgentCard, "expected A2A Agent Card")) throw new TypeError("ActivityPub RMN projection named a foreign A2A Agent Card");
  const opened = unwrapCloudEvent(bytes, activity.type, activity.actor, expectedRecipient === ACTIVITYSTREAMS_PUBLIC ? ACTIVITYSTREAMS_PUBLIC : exactUrl(expectedRecipient, "expected ActivityPub recipient"));
  return Object.freeze({ type: activity.type, objectNi: opened.objectNi, envelopeNi: ni, objectBytes: opened.objectBytes, a2aMessage: opened.a2aMessage, cloudEvent: opened.cloudEvent, agentCard });
}

export async function materializeRmnActivity(input) { return Activity.fromJsonLd(projectRmnActivity(input)); }
