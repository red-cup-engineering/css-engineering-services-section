/**
 * carriers — the doing-stage carrier (stage 2) and the act-factorization carrier.
 */
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";
import { belnapSchema } from "../../carriers.mjs";

const nonnegativeIntegerSchema = { type: "integer", minimum: 0 } as const;
const facultySchema = { enum: ["communicating", "knowing", "playing"] } as const;
const axisSchema = { enum: ["truth", "knowledge", "evidence"] } as const;

export const doingSchema = {
  $id: "animating/becoming/doing",
  title: "Doing",
  description:
    "Stage 2 of the agency descent, generated WITHIN becoming: the AGENCY reading of relating's `predicate` at the TRANSFINITE regime. $id is the bare package-rooted descent path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "regime", "stage", "face", "epistemic", "faculty", "entities", "predicates", "cells", "valued"],
  properties: {
    kind: { const: "animating.becoming.doing" },
    regime: { const: "transfinite" },
    stage: { const: "predicate" },
    face: { const: "agential" },
    epistemic: { const: "judgement" },
    faculty: { const: "communicating" },
    entities: nonnegativeIntegerSchema,
    predicates: nonnegativeIntegerSchema,
    cells: nonnegativeIntegerSchema,
    valued: { const: false },
  },
} as const;

export type Doing = FromSchema<typeof doingSchema>;
export const doingCarrier = carrierFrom(doingSchema);

export const factorizationSchema = {
  $id: "animating/becoming/doing/factorization",
  title: "Factorization",
  description:
    "The agentive-triad ACT-FACTORIZATION of one face's act: locution, illocution, perlocution, and the face's OWN axis-typed FOUR census. $id is the bare package-rooted descent path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "faculty", "dual", "axis", "locution", "illocution", "perlocution", "belnap"],
  properties: {
    kind: { const: "animating.factorization" },
    faculty: facultySchema,
    dual: { const: "producing" },
    axis: axisSchema,
    locution: nonnegativeIntegerSchema,
    illocution: nonnegativeIntegerSchema,
    perlocution: nonnegativeIntegerSchema,
    belnap: belnapSchema,
  },
} as const;

export type Factorization = FromSchema<typeof factorizationSchema>;
export const factorizationCarrier = carrierFrom(factorizationSchema);
