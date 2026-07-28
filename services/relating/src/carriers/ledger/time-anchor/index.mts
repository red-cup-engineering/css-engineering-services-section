import { carrierFrom } from "../../kernel/carrier.mjs";

export const timeAnchorSchema = {
  $id: "relating/ledger/time-anchor/anchor",
  title: "RWIL Time Anchor",
  description: "A structural OpenTimestamps/RFC-3161-style time attestation over one witness hash.",
  type: "object",
  required: ["kind", "standard", "calendar", "authority", "witnessHash", "witnessTime", "attestedTime", "commitment", "digest"],
  properties: {
    kind: { const: "relating.ledger.time-anchor.anchor" },
    standard: { const: "opentimestamps/rfc3161.structural" },
    calendar: { type: "string", minLength: 1 },
    authority: { type: "string", minLength: 1 },
    witnessHash: { type: "string", minLength: 1 },
    witnessTime: {},
    attestedTime: { type: "string", minLength: 1 },
    commitment: { type: "string", minLength: 1 },
    digest: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
} as const;

export const timeAnchorCarrier = carrierFrom(timeAnchorSchema);

export const timestampedWitnessSchema = {
  $id: "relating/ledger/time-anchor/timestamped-witness",
  title: "Timestamped RWIL Witness",
  description: "One EAVT witness paired with its external time anchor.",
  type: "object",
  required: ["kind", "witness", "anchor"],
  properties: {
    kind: { const: "relating.ledger.time-anchor.timestamped-witness" },
    witness: {},
    anchor: { $ref: "relating/ledger/time-anchor/anchor" },
  },
  additionalProperties: false,
} as const;

export const timestampedWitnessCarrier = carrierFrom(timestampedWitnessSchema);

export const timeAnchorReadingSchema = {
  $id: "relating/ledger/time-anchor/reading",
  title: "RWIL Time Anchor Reading",
  description: "The fifth Datom slot for an externally anchored T judgement.",
  type: "object",
  required: ["kind", "standard", "anchor", "verified"],
  properties: {
    kind: { const: "relating.ledger.time-anchor.reading" },
    standard: { const: "opentimestamps/rfc3161.structural" },
    anchor: { $ref: "relating/ledger/time-anchor/anchor" },
    verified: { type: "boolean" },
  },
  additionalProperties: false,
} as const;

export const timeAnchorReadingCarrier = carrierFrom(timeAnchorReadingSchema);
