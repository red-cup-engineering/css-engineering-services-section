/**
 * carriers — the becoming stage carrier (stage 1 of the agency descent).
 */
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";

export const becomingSchema = {
  $id: "animating/becoming",
  title: "Becoming",
  description:
    "Stage 1 of the agency descent: the AGENCY reading of relating's `articulate` at the APERIODIC regime. $id is the bare package-rooted descent path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "regime", "stage", "face", "epistemic", "seed", "cells", "openAbove"],
  properties: {
    kind: { const: "animating.becoming" },
    regime: { const: "aperiodic" },
    stage: { const: "articulate" },
    face: { const: "animate" },
    epistemic: { const: "question" },
    seed: { type: "array", items: { type: "string" } },
    cells: { type: "integer", minimum: 0 },
    openAbove: { const: true },
  },
} as const;

export type Becoming = FromSchema<typeof becomingSchema>;
export const becomingCarrier = carrierFrom(becomingSchema);
