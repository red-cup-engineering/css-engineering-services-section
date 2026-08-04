import { carrierFrom } from "../../kernel/carrier.mjs";

export const mementoSnapshotSchema = {
  $id: "relating/ledger/memento/snapshot",
  title: "WitnessJournal Memento Snapshot",
  description: "A ledger state projection as of one datetime.",
  type: "object",
  required: ["kind", "datetime", "state"],
  properties: {
    kind: { const: "witness-journal.memento.snapshot" },
    datetime: { type: "string", minLength: 1 },
    state: {},
  },
  additionalProperties: false,
} as const;

export const mementoSnapshotCarrier = carrierFrom(mementoSnapshotSchema);

export const timeMapSchema = {
  $id: "relating/ledger/memento/timemap",
  title: "WitnessJournal Memento TimeMap",
  description: "The available record snapshots for one ledger projection.",
  type: "object",
  required: ["kind", "original", "snapshots"],
  properties: {
    kind: { const: "witness-journal.memento.timemap" },
    original: { type: "string" },
    snapshots: {
      type: "array",
      items: {
        type: "object",
        required: ["datetime", "witnesses"],
        properties: {
          datetime: { type: "string", minLength: 1 },
          witnesses: { type: "integer", minimum: 0 },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
} as const;

export const timeMapCarrier = carrierFrom(timeMapSchema);
