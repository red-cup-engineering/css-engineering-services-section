import { carrierFrom } from "../../../../../../kernel/carrier.mjs";

const idSchema = { type: "string", minLength: 1 } as const;

export const LeanGoldenVectorSchema = {
  $id: "relating/conformance/golden-vector",
  title: "LeanGoldenVector",
  description: "A Lean-emitted EAVT conformance row for a finite RelMath surface.",
  type: "object",
  required: ["$schema", "e", "a", "v", "t"],
  additionalProperties: false,
  properties: {
    $schema: { const: "relating/conformance/golden-vector" },
    e: idSchema,
    a: idSchema,
    v: {},
    t: idSchema,
  },
} as const;

export const leanGoldenVectorCarrier = carrierFrom(LeanGoldenVectorSchema);
