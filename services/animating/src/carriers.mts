/**
 * carriers — animating's apex JSON-Schema carriers (the holographic boundary).
 *
 * Each exported carrier is ONE value: an `as const` JSON-Schema literal is the
 * static type (`FromSchema`), the runtime validator (`carrierFrom`), and the
 * category identity (`$id`).
 */
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";

const nonnegativeIntegerSchema = { type: "integer", minimum: 0 } as const;
const fourValueSchema = { enum: ["absurd", "potential", "active", "stable"] } as const;
const facultySchema = { enum: ["communicating", "knowing", "playing"] } as const;
const directionSchema = { enum: ["across", "inside", "outside"] } as const;
const axisSchema = { enum: ["truth", "knowledge", "evidence"] } as const;

/** The per-cell FOUR census on a face's agentive-triad axis. */
export const belnapSchema = {
  type: "object",
  additionalProperties: false,
  description:
    "the per-cell FOUR census of this face's local section ON ITS AGENTIVE-TRIAD AXIS — the sibling faculty's OWN four-valued reading the bulk consolidates, not a generic descend.",
  required: ["absurd", "potential", "active", "stable"],
  properties: {
    absurd: nonnegativeIntegerSchema,
    potential: nonnegativeIntegerSchema,
    active: nonnegativeIntegerSchema,
    stable: nonnegativeIntegerSchema,
  },
} as const;
export type Belnap = FromSchema<typeof belnapSchema>;

export const faceValueSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "faculty", "direction", "axis", "cover", "held", "contested", "belnap", "aggregate", "bigrade"],
  properties: {
    kind: { const: "animating.face" },
    faculty: facultySchema,
    direction: directionSchema,
    axis: axisSchema,
    cover: nonnegativeIntegerSchema,
    held: nonnegativeIntegerSchema,
    contested: nonnegativeIntegerSchema,
    belnap: belnapSchema,
    aggregate: fourValueSchema,
    bigrade: {
      type: "object",
      additionalProperties: false,
      required: ["truth", "contradiction", "collapsed"],
      properties: {
        truth: nonnegativeIntegerSchema,
        contradiction: nonnegativeIntegerSchema,
        collapsed: { type: "boolean" },
      },
    },
  },
} as const;

export const faceSchema = {
  ...faceValueSchema,
  $id: "animating/face",
  title: "Face",
  description:
    "One boundary face of animating's three-faced holographic boundary — one element of the replica COVER U = communicating ∪ knowing ∪ playing. $id is the bare package-rooted path.",
} as const;

export type Face = FromSchema<typeof faceSchema>;
export const faceCarrier = carrierFrom(faceSchema);

export const boundaryProjectionSchema = {
  $id: "animating/boundary-projection",
  title: "BoundaryProjection",
  description:
    "The holographic boundary projection of an agent — its three boundary faces (communicating/knowing/playing), keyed by faculty, the codomain of `project`.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "identity", "glued", "coordination", "communicating", "knowing", "playing"],
  properties: {
    kind: { const: "animating.projection" },
    identity: { type: "string" },
    glued: { type: "boolean" },
    coordination: { enum: ["coordination-free", "consensus-required"] },
    communicating: faceValueSchema,
    knowing: faceValueSchema,
    playing: faceValueSchema,
  },
} as const;

export type BoundaryProjection = FromSchema<typeof boundaryProjectionSchema>;
export const boundaryProjectionCarrier = carrierFrom(boundaryProjectionSchema);
