import { createHash } from "node:crypto";
import { Activity } from "@fedify/vocab";

export const ACTIVITYSTREAMS_CONTEXT = "https://www.w3.org/ns/activitystreams";
export const ACTIVITYSTREAMS_PUBLIC = "https://www.w3.org/ns/activitystreams#Public";
export const RMN_MEDIA_TYPE = "application/rmn+cbor";
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
const sha256Ni = (await import(new URL("../../../../../../lenticule-science/services/obsmetrological-services-section/services/rmn-semantic-conformance-die/src/canonical-cbor.mjs", import.meta.url).href)).rawNiUri;
function one(value) { return Array.isArray(value) ? value : [value]; }
function sameRecipient(left, right) { return left === right || ([left, right].every((value) => [ACTIVITYSTREAMS_PUBLIC, "as:Public"].includes(value))); }
function dataUri(bytes) { return `data:${RMN_MEDIA_TYPE};base64,${Buffer.from(bytes).toString("base64")}`; }
function dataBytes(value) {
  const match = /^data:application\/rmn\+cbor;base64,([A-Za-z0-9+/]*={0,2})$/u.exec(value ?? "");
  if (!match) throw new TypeError("ActivityPub RMN link must contain one canonical base64 data URI");
  const bytes = Buffer.from(match[1], "base64");
  if (bytes.length > MAXIMUM_INLINE_RMN_BYTES || bytes.toString("base64") !== match[1]) throw new TypeError("ActivityPub RMN link is oversized or noncanonical");
  return bytes;
}

export function projectRmnActivity({ type, origin, identifier, recipient, objectBytes, agentCard }) {
  if (!TYPES.has(type)) throw new TypeError("ActivityPub RMN projection requires a standard supported Activity type");
  const bytes = Buffer.from(objectBytes ?? []);
  if (bytes.length < 1 || bytes.length > MAXIMUM_INLINE_RMN_BYTES) throw new TypeError("ActivityPub RMN projection requires bounded nonempty canonical bytes");
  const actor = actorUrl(origin, identifier);
  const to = recipient === ACTIVITYSTREAMS_PUBLIC ? recipient : exactUrl(recipient, "ActivityPub recipient");
  const card = exactUrl(agentCard, "A2A Agent Card");
  const ni = sha256Ni(bytes);
  const projectionDigest = createHash("sha256").update(`${type}\0${actor}\0${to}\0${ni}\0${card}`).digest("base64url");
  const id = new URL(`/activities/rmn-${projectionDigest}`, exactUrl(origin, "ActivityPub origin")).href;
  return Object.freeze({
    "@context": ACTIVITYSTREAMS_CONTEXT, id, type, actor, to,
    object: Object.freeze({ type: "Document", mediaType: RMN_MEDIA_TYPE, name: ni, url: Object.freeze({ type: "Link", mediaType: RMN_MEDIA_TYPE, href: dataUri(bytes) }) }),
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
  return Object.freeze({ type: activity.type, objectNi: ni, objectBytes: bytes, agentCard });
}

export async function materializeRmnActivity(input) { return Activity.fromJsonLd(projectRmnActivity(input)); }
