import { carrierFrom } from "../../kernel/carrier.mjs";

export const jsonTermSchema = {
  anyOf: [
    { type: "string" },
    { type: "number" },
    { type: "integer" },
    { type: "boolean" },
    { type: "null" },
    { type: "array" },
    { type: "object" },
  ],
} as const;

export const eavtRecordSchema = {
  type: "object",
  required: ["e", "a", "v", "t"],
  properties: {
    e: jsonTermSchema,
    a: jsonTermSchema,
    v: jsonTermSchema,
    t: jsonTermSchema,
  },
  additionalProperties: false,
} as const;

export const stringValueSchema = {
  type: "object",
  required: ["stringValue"],
  properties: {
    stringValue: { type: "string" },
  },
  additionalProperties: false,
} as const;

export const keyValueSchema = {
  type: "object",
  required: ["key", "value"],
  properties: {
    key: { type: "string", minLength: 1 },
    value: stringValueSchema,
  },
  additionalProperties: false,
} as const;

export const otlpSpanSchema = {
  $id: "relating/writing/otlp/span",
  title: "RWIL OTLP span",
  description: "A witnessed EAVT row encoded as an OTLP span.",
  type: "object",
  required: ["traceId", "spanId", "name", "kind", "startTimeUnixNano", "endTimeUnixNano", "attributes"],
  properties: {
    traceId: { type: "string", pattern: "^[0-9a-f]{32}$" },
    spanId: { type: "string", pattern: "^[0-9a-f]{16}$" },
    name: { type: "string", minLength: 1 },
    kind: { type: "integer" },
    startTimeUnixNano: { type: "string" },
    endTimeUnixNano: { type: "string" },
    attributes: { type: "array", items: keyValueSchema },
    status: {
      type: "object",
      required: ["code"],
      properties: {
        code: { type: "integer" },
        message: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

export const otlpSpanCarrier = carrierFrom(otlpSpanSchema);

export const otlpTracesSchema = {
  $id: "relating/writing/otlp/traces",
  title: "RWIL OTLP traces",
  description: "An OTLP ExportTraceServiceRequest carrying RWIL witnesses.",
  type: "object",
  required: ["resourceSpans"],
  properties: {
    resourceSpans: {
      type: "array",
      items: {
        type: "object",
        required: ["resource", "scopeSpans"],
        properties: {
          resource: {
            type: "object",
            required: ["attributes"],
            properties: {
              attributes: { type: "array", items: keyValueSchema },
            },
            additionalProperties: false,
          },
          scopeSpans: {
            type: "array",
            items: {
              type: "object",
              required: ["scope", "spans"],
              properties: {
                scope: {
                  type: "object",
                  required: ["name", "attributes"],
                  properties: {
                    name: { type: "string" },
                    version: { type: "string" },
                    attributes: { type: "array", items: keyValueSchema },
                  },
                  additionalProperties: false,
                },
                spans: { type: "array", items: otlpSpanSchema },
              },
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
} as const;

export const otlpTracesCarrier = carrierFrom(otlpTracesSchema);

export const agentEventChronicleSchema = {
  $id: "relating/writing/otlp/agent-event-chronicle",
  title: "AgentEventChronicle",
  description:
    "A hub agent-event chronicle read as EAVT witnesses, ready for the OTLP/RWIL channel-code.",
  type: "object",
  required: ["kind", "feed", "witnesses"],
  properties: {
    kind: { const: "relating.writing.otlp.agent-event-chronicle" },
    feed: { type: "string", minLength: 1 },
    witnesses: { type: "array", items: eavtRecordSchema },
  },
  additionalProperties: false,
} as const;

export const agentEventChronicleCarrier = carrierFrom(agentEventChronicleSchema);
