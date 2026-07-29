import { decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { decodeRelationalValue, encodeRelationalValue, RELATIONAL_VALUE_TYPE } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { ACTIVITYSTREAMS_CONTEXT, A2A_MEDIA_TYPE, RMN_MEDIA_TYPE, extractRmnActivity } from "./rmn-activity.mjs";

const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const POSITIVE = new Set(["Accept", "Announce", "Create", "Offer", "Update"]);
const NEGATIVE = new Set(["Reject"]);

function immutable(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) immutable(child);
  return Object.freeze(value);
}

function canonical(value) {
  const encoded = encodeRelationalValue(value);
  const term = ["ascribe", encoded.type, encoded.term];
  return Object.freeze({ bytes: semanticBytes(term), ni: semanticId(term) });
}

function decodeCanonical(bytes, label) {
  const source = Buffer.from(bytes ?? []);
  let term;
  try { term = decodeSemantic(source); } catch { throw new TypeError(`${label} must be canonical RMN bytes`); }
  if (!semanticBytes(term).equals(source) || term?.[0] !== "ascribe" || JSON.stringify(term[1]) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) {
    throw new TypeError(`${label} must be one canonical typed relational RMN document`);
  }
  return immutable(decodeRelationalValue(term[1], term[2]));
}

function polarityOf(type) {
  if (POSITIVE.has(type)) return "positive";
  if (NEGATIVE.has(type)) return "negative";
  throw new TypeError(`ActivityPub ${type} has no admitted truth support polarity`);
}

function carriesActivityStreamsContext(value) {
  if (value === ACTIVITYSTREAMS_CONTEXT) return true;
  if (Array.isArray(value)) return value.includes(ACTIVITYSTREAMS_CONTEXT);
  return false;
}

export function fourValue({ positive, negative }) {
  if (positive && negative) return "stable";
  if (positive) return "potential";
  if (negative) return "active";
  return "absurd";
}

/**
 * Admit one already-authenticated ActivityPub arrival into the semantic history.
 * Fedify owns signature/proof admission; this function owns exact carrier opening.
 */
export function admitRmnActivityHistory(activity, {
  expectedActor,
  expectedRecipient,
  expectedAgentCard,
  observedAt,
} = {}) {
  if (typeof activity?.id !== "string" || activity.id.length === 0) throw new TypeError("admitted ActivityPub history requires a durable activity id");
  if (!carriesActivityStreamsContext(activity["@context"])) throw new TypeError("admitted ActivityPub history requires the ActivityStreams 2.0 context");
  if (typeof observedAt !== "string" || !Number.isFinite(Date.parse(observedAt))) throw new TypeError("admitted ActivityPub history requires an RFC 3339 observation time");
  const opened = extractRmnActivity(activity, { expectedActor, expectedRecipient, expectedAgentCard });
  const polarity = polarityOf(opened.type);
  const receiptBody = immutable({
    type: "FederationCarrierAdmissionReceipt",
    version: 1,
    activity: activity.id,
    activityType: opened.type,
    actor: expectedActor,
    recipient: expectedRecipient,
    agentCard: opened.agentCard,
    envelopeNi: opened.envelopeNi,
    objectNi: opened.objectNi,
    observedAt,
    support: { positive: polarity === "positive", negative: polarity === "negative", value: polarity === "positive" ? "potential" : "active" },
    standards: {
      activityStreamsContext: ACTIVITYSTREAMS_CONTEXT,
      cloudEventsSpecversion: opened.cloudEvent.specversion,
      cloudEventId: opened.cloudEvent.id,
      cloudEventSource: opened.cloudEvent.source,
      cloudEventType: opened.cloudEvent.type,
      cloudEventSubject: opened.cloudEvent.subject,
      cloudEventTime: opened.cloudEvent.time,
      cloudEventDataContentType: opened.cloudEvent.datacontenttype,
      a2aRole: opened.a2aMessage.role,
      a2aMessageId: opened.a2aMessage.messageId,
      a2aPartMediaType: RMN_MEDIA_TYPE,
    },
  });
  const receipt = canonical(receiptBody);
  return Object.freeze({
    receipt: receiptBody,
    receiptNi: receipt.ni,
    receiptBytes: receipt.bytes,
    objectBytes: Buffer.from(opened.objectBytes),
  });
}

function admitStoredRecord(record) {
  if (!record || !NI.test(record.receiptNi ?? "")) throw new TypeError("federation history record must name its receipt with a SHA-256 ni URI");
  const receipt = decodeCanonical(record.receiptBytes, "federation admission receipt");
  if (receipt.type !== "FederationCarrierAdmissionReceipt" || receipt.version !== 1 || canonical(receipt).ni !== record.receiptNi) throw new TypeError("federation admission receipt identity or type is invalid");
  const objectBytes = Buffer.from(record.objectBytes ?? []);
  let objectTerm;
  try { objectTerm = decodeSemantic(objectBytes); } catch { throw new TypeError("federation history object differs from its admitted canonical RMN identity"); }
  if (semanticId(objectTerm) !== receipt.objectNi || !semanticBytes(objectTerm).equals(objectBytes)) throw new TypeError("federation history object differs from its admitted canonical RMN identity");
  if (receipt.standards?.activityStreamsContext !== "https://www.w3.org/ns/activitystreams" || receipt.standards?.cloudEventsSpecversion !== "1.0" || receipt.standards?.cloudEventDataContentType !== A2A_MEDIA_TYPE || receipt.standards?.a2aRole !== "ROLE_AGENT" || receipt.standards?.a2aPartMediaType !== RMN_MEDIA_TYPE) throw new TypeError("federation admission receipt does not bind the required standards stack");
  const expectedValue = fourValue(receipt.support ?? {});
  if (receipt.support?.value !== expectedValue || expectedValue === "absurd") throw new TypeError("federation admission receipt carries incoherent truth support");
  return Object.freeze({ receipt, receiptNi: record.receiptNi, objectBytes });
}

/** Read only typed admission records and knowledge-join their support by RMN object NI. */
export function readRmnActivityHistory(records) {
  if (!Array.isArray(records)) throw new TypeError("federation history must be a finite array of typed admission records");
  const admitted = records.map(admitStoredRecord);
  const byObject = new Map();
  for (const entry of admitted) {
    const held = byObject.get(entry.receipt.objectNi) ?? { positive: false, negative: false, witnesses: [], objectBytes: entry.objectBytes };
    held.positive ||= entry.receipt.support.positive;
    held.negative ||= entry.receipt.support.negative;
    held.witnesses.push(entry.receiptNi);
    byObject.set(entry.receipt.objectNi, held);
  }
  return Object.freeze([...byObject.entries()].map(([objectNi, held]) => Object.freeze({
    type: "FederationHistoryStanding",
    objectNi,
    objectBytes: Buffer.from(held.objectBytes),
    object: decodeCanonical(held.objectBytes, "federation history object"),
    support: Object.freeze({ positive: held.positive, negative: held.negative, value: fourValue(held) }),
    witnesses: Object.freeze([...held.witnesses]),
  })));
}

/** Total FOUR read, including the untold/absurd value for an unobserved object NI. */
export function supportFromRmnActivityHistory(records, objectNi) {
  if (!NI.test(objectNi ?? "")) throw new TypeError("history support requires one canonical object ni URI");
  return readRmnActivityHistory(records).find((entry) => entry.objectNi === objectNi)?.support
    ?? Object.freeze({ positive: false, negative: false, value: "absurd" });
}
