/**
 * work-closure — the executable closure structure of a task, declared as a plain JSON-Schema literal
 * (no TypeBox, no codegen, no Ajv). Migrated from animating-experimental's work-type algebra into
 * computing: it records whether task meaning is already fixed at dispatch (every goal cell determined)
 * and whether execution is deterministic (no rule branches), without naming office authority or
 * collective adjudication. The `as const` schema is the single source: `FromSchema` infers the type and
 * `carrierFrom` builds the validator + registers the `$id`.
 */
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";

export const workClosureSchema = {
  $id: "computing/work-closure",
  title: "WorkClosure",
  type: "object",
  required: ["kind", "goalCells", "rules"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.work-closure" },
    goalCells: {
      type: "array",
      items: {
        type: "object",
        required: ["cell", "determinedAtDispatch"],
        additionalProperties: false,
        properties: {
          cell: { type: "string", minLength: 1 },
          determinedAtDispatch: { type: "boolean" },
        },
      },
    },
    rules: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "branching"],
        additionalProperties: false,
        properties: {
          name: { type: "string", minLength: 1 },
          branching: { type: "boolean" },
        },
      },
    },
  },
} as const;

/** The executable closure structure of a task — its type INFERRED from `workClosureSchema`. */
export type WorkClosure = FromSchema<typeof workClosureSchema>;

/** The registered carrier (validate/assert over the same literal). */
export const workClosureCarrier = carrierFrom(workClosureSchema);
