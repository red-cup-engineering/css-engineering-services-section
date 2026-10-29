import { carrierFrom } from "../kernel/carrier.mjs";

export const readingDescriptorSchema = {
  $id: "relating/ledger/reading",
  title: "WitnessJournal Reading",
  description: "A named isomorphism between one witness journal entry row and one wire form.",
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
} as const;

export const readingDescriptorCarrier = carrierFrom(readingDescriptorSchema);

export const logReadingDescriptorSchema = {
  $id: "relating/ledger/log-reading",
  title: "WitnessJournal Log Reading",
  description: "A named isomorphism between an ordered witness journal entry log and one wire form.",
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
} as const;

export const logReadingDescriptorCarrier = carrierFrom(logReadingDescriptorSchema);

export const coherenceReportSchema = {
  $id: "relating/ledger/coherence-report",
  title: "WitnessJournal Coherence Report",
  description: "The law report for two WitnessJournal readings checked against one witness pivot.",
  type: "object",
  required: ["kind", "left", "right", "witness", "leftIso", "rightIso", "leftToRight", "rightToLeft", "ok"],
  properties: {
    kind: { const: "witness-journal.coherence" },
    left: { type: "string", minLength: 1 },
    right: { type: "string", minLength: 1 },
    witness: {},
    leftIso: { type: "boolean" },
    rightIso: { type: "boolean" },
    leftToRight: { type: "boolean" },
    rightToLeft: { type: "boolean" },
    ok: { type: "boolean" },
  },
  additionalProperties: false,
} as const;

export const coherenceReportCarrier = carrierFrom(coherenceReportSchema);

export const logCoherenceReportSchema = {
  $id: "relating/ledger/log-coherence-report",
  title: "WitnessJournal Log Coherence Report",
  description: "The law report for two WitnessJournal log readings checked against one ordered witness-log pivot.",
  type: "object",
  required: ["kind", "left", "right", "witnessLog", "leftIso", "rightIso", "leftToRight", "rightToLeft", "ok"],
  properties: {
    kind: { const: "witness-journal.log-coherence" },
    left: { type: "string", minLength: 1 },
    right: { type: "string", minLength: 1 },
    witnessLog: { type: "array", items: { type: "object" } },
    leftIso: { type: "boolean" },
    rightIso: { type: "boolean" },
    leftToRight: { type: "boolean" },
    rightToLeft: { type: "boolean" },
    ok: { type: "boolean" },
  },
  additionalProperties: false,
} as const;

export const logCoherenceReportCarrier = carrierFrom(logCoherenceReportSchema);
