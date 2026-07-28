import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";

export const signRelationSchema = {
  $id: "communicating/speaking/signifying/sign-relation",
  title: "SignRelationCarrier",
  description: "A triadic sign relation: vehicle, object, interpretant.",
  type: "object",
  required: ["kind", "vehicle", "object", "interpretant"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.speaking.signifying.signRelation" },
    vehicle: {},
    object: {},
    interpretant: {},
  },
} as const;
export const signRelationCarrier = carrierFrom(signRelationSchema);

export type SignRelationCarrier<Vehicle = unknown, Object = unknown, Interpretant = unknown> =
  Omit<FromSchema<typeof signRelationSchema>, "vehicle" | "object" | "interpretant"> & {
    readonly vehicle: Vehicle;
    readonly object: Object;
    readonly interpretant: Interpretant;
  };

export const semiosisStepSchema = {
  $id: "communicating/speaking/signifying/semiosis-step",
  title: "SemiosisStepCarrier",
  description: "One semiosis step: the prior interpretant becomes the next sign vehicle.",
  type: "object",
  required: ["kind", "prior", "next"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.speaking.signifying.semiosisStep" },
    prior: {},
    next: {},
  },
} as const;
export const semiosisStepCarrier = carrierFrom(semiosisStepSchema);

export type SemiosisStepCarrier<
  Prior extends SignRelationCarrier = SignRelationCarrier,
  Next extends SignRelationCarrier = SignRelationCarrier,
> = Omit<FromSchema<typeof semiosisStepSchema>, "prior" | "next"> & {
  readonly prior: Prior;
  readonly next: Next;
};

export const semiosphereSchema = {
  $id: "communicating/speaking/signifying/semiosphere",
  title: "SemiosphereCarrier",
  description: "A named semiotic domain within which sign relations are interpreted.",
  type: "object",
  required: ["kind", "name"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.speaking.signifying.semiosphere" },
    name: { type: "string" },
  },
} as const;
export const semiosphereCarrier = carrierFrom(semiosphereSchema);

export type SemiosphereCarrier = FromSchema<typeof semiosphereSchema>;

export const semiosphereBoundaryTranslationSchema = {
  $id: "communicating/speaking/signifying/semiosphere-boundary-translation",
  title: "SemiosphereBoundaryTranslation",
  description: "A semantic boundary translation into a semiosphere.",
  type: "object",
  required: ["kind", "semiosphere", "external", "internal"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.speaking.signifying.semiosphereBoundaryTranslation" },
    semiosphere: {},
    external: {},
    internal: {},
  },
} as const;
export const semiosphereBoundaryTranslationCarrier = carrierFrom(semiosphereBoundaryTranslationSchema);

export type SemiosphereBoundaryTranslation<External = unknown, Internal extends SignRelationCarrier = SignRelationCarrier> =
  Omit<FromSchema<typeof semiosphereBoundaryTranslationSchema>, "semiosphere" | "external" | "internal"> & {
    readonly semiosphere: SemiosphereCarrier;
    readonly external: External;
    readonly internal: Internal;
  };
