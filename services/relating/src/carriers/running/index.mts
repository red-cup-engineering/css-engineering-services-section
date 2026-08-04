import { carrierFrom } from "../kernel/carrier.mjs";

/** A serializable morphism face. The executable `run` is intentionally outside this schema. */
export const MorphismSchema = {
  $id: "relating/running/morphism",
  type: "object",
  required: ["kind", "verb", "inputFormat", "outputFormat", "options"],
  properties: {
    kind: { const: "relating.action" },
    verb: { type: "string", minLength: 1 },
    inputFormat: { type: "string" },
    outputFormat: { type: "string" },
    options: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
    description: { type: "string" },
    domain: { type: "string", minLength: 1 },
    codomain: { type: "string", minLength: 1 },
    runTerm: {},
  },
  title: "Action",
  description: "The schema-of-a-morphism: a boundary action typed by carrier domain and codomain $id.",
  additionalProperties: false,
} as const;

/** The morphism schema as a registered carrier. */
export const morphismSchemaCarrier = carrierFrom(MorphismSchema);

export const inspectionReportCarrier = carrierFrom({
  $id: "relating.action.inspection",
  type: "object",
  required: ["kind", "verb", "hasRunTerm"],
  properties: {
    kind: { const: "relating.action.inspection" },
    verb: { type: "string", minLength: 1 },
    hasRunTerm: { type: "boolean" },
    domain: { type: "string" },
    codomain: { type: "string" },
    termClosed: { type: "boolean" },
    termSize: { type: "number" },
    termUses: { type: "array", items: { type: "string" } },
  },
  title: "ActionInspection",
  description: "RMN inspection report for a morphism carrier.",
  additionalProperties: false,
} as const);
