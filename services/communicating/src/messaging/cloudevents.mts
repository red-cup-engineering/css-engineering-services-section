/**
 * messaging/cloudevents — CloudEvents as communicating's standard across-envelope.
 *
 * A CloudEvent is one charged membrane utterance in a CNCF envelope: `source`
 * names the speaker token, `type` is the Searle illocutionary force, `time` is
 * the witness time `T`, and JSON `data` carries the claim. The bridge is a
 * functorial view of `UtteranceCarrier`, not a parallel event ontology.
 */
import { createHash } from "node:crypto";

import {
  canonical,
  carrierFrom,
  mark,
  requireJsonValue,
  utterance,
  type ChargeValueName,
  type FromSchema,
  type JsonValue,
  type UtteranceCarrier,
} from "@red-cup-engineering/relating";

import type { IllocutionaryForce } from "../speaking/illocuting/index.mjs";

/** CloudEvents JSON Event Format media type for structured mode. */
export const CLOUDEVENTS_JSON_CONTENT_TYPE = "application/cloudevents+json" as const;

/** CloudEvents core spec version carried in `specversion`. */
export const CLOUDEVENTS_SPECVERSION = "1.0" as const;

/** The JSON content type used for direct structured `data` claims. */
export const CLOUDEVENTS_DATA_CONTENT_TYPE = "application/json" as const;

const illocutionaryForceSchema = {
  enum: ["assertive", "directive", "commissive", "expressive", "declaration"],
} as const;

const chargeValueNameSchema = {
  enum: ["absurd", "potential", "active", "stable"],
} as const;

export const cloudEventSchema = {
  $id: "communicating/messaging/cloudevents/event",
  title: "CloudEvent",
  description:
    "A CloudEvents structured JSON envelope for one communicating membrane utterance: source=token, type=illocutionary force, time=T, data=claim.",
  type: "object",
  required: ["specversion", "id", "source", "type", "time", "datacontenttype", "data"],
  additionalProperties: false,
  properties: {
    specversion: { const: CLOUDEVENTS_SPECVERSION },
    id: { type: "string", minLength: 1 },
    source: { type: "string", minLength: 1 },
    type: illocutionaryForceSchema,
    time: { type: "string", minLength: 1 },
    datacontenttype: { const: CLOUDEVENTS_DATA_CONTENT_TYPE },
    data: {},
    emsenntruthcharge: chargeValueNameSchema,
  },
} as const;
export type CloudEvent = Omit<FromSchema<typeof cloudEventSchema>, "type" | "data"> & {
  readonly type: IllocutionaryForce;
  readonly data: JsonValue;
  readonly emsenntruthcharge?: ChargeValueName;
};
export const cloudEventCarrier = carrierFrom(cloudEventSchema);

export interface CloudEventOptions {
  /** CloudEvents id; defaults to a deterministic urn over source/type/time/data. */
  readonly id?: string;
  /** Optional Belnap truth charge carried as a CloudEvents extension attribute. */
  readonly truthCharge?: ChargeValueName;
}

function cloudEventId(source: string, type: IllocutionaryForce, time: string, data: JsonValue): string {
  const digest = createHash("sha256")
    .update(canonical({ source, type, time, data }))
    .digest("hex");
  return `urn:sha256:${digest}`;
}

/** Read a membrane utterance as a CloudEvents structured JSON envelope. */
export function cloudEventFromUtterance(
  carrier: UtteranceCarrier,
  type: IllocutionaryForce,
  time: string,
  options: CloudEventOptions = {},
): CloudEvent {
  const source = String(carrier.token.mark.value);
  const data = requireJsonValue(carrier.claim.mark.value, "cloudEventFromUtterance data");
  const event: CloudEvent = Object.freeze({
    specversion: CLOUDEVENTS_SPECVERSION,
    id: options.id ?? cloudEventId(source, type, time, data),
    source,
    type,
    time,
    datacontenttype: CLOUDEVENTS_DATA_CONTENT_TYPE,
    data,
    ...(options.truthCharge === undefined ? {} : { emsenntruthcharge: options.truthCharge }),
  });
  return Object.freeze(cloudEventCarrier.assert(event, "cloudEventFromUtterance event")) as CloudEvent;
}

/** Read a CloudEvents structured JSON envelope back as its membrane utterance. */
export function utteranceFromCloudEvent(event: CloudEvent): UtteranceCarrier {
  const admitted = cloudEventCarrier.assert(event, "utteranceFromCloudEvent event") as CloudEvent;
  return utterance(mark(admitted.source), mark(admitted.data));
}

/** The CloudEvents `type` attribute is the same Searle force read by ActivityPub. */
export function cloudEventIllocutionaryForce(event: CloudEvent): IllocutionaryForce {
  return (cloudEventCarrier.assert(event, "cloudEventIllocutionaryForce event") as CloudEvent).type;
}
