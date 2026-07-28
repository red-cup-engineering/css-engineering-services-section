/**
 * speaking/signifying — semiotic carriers for spoken communication.
 *
 * A sign relation is triadic: vehicle, object, interpretant. Semiosis advances
 * by taking an interpretant as a further sign-vehicle for the same object in a
 * semiosphere. The semiosphere boundary is a translation mechanism, not a codec.
 */
export {
  signRelationCarrier,
  semiosisStepCarrier,
  semiosphereCarrier,
  semiosphereBoundaryTranslationCarrier,
} from "./carriers.mjs";
export type {
  SignRelationCarrier,
  SemiosisStepCarrier,
  SemiosphereCarrier,
  SemiosphereBoundaryTranslation,
} from "./carriers.mjs";

import type {
  SignRelationCarrier,
  SemiosisStepCarrier,
  SemiosphereCarrier,
  SemiosphereBoundaryTranslation,
} from "./carriers.mjs";

/** Construct a semiosphere carrier. */
export const semiosphere = (name: string): SemiosphereCarrier =>
  Object.freeze({ kind: "communicating.speaking.signifying.semiosphere" as const, name });

/** Construct a sign relation from vehicle, object, and interpretant. */
export const signRelation = <Vehicle, Object, Interpretant>(
  vehicle: Vehicle,
  object: Object,
  interpretant: Interpretant,
): SignRelationCarrier<Vehicle, Object, Interpretant> =>
  Object.freeze({
    kind: "communicating.speaking.signifying.signRelation" as const,
    vehicle,
    object,
    interpretant,
  });

/** Advance semiosis by making the prior interpretant the next vehicle. */
export function advanceSemiosis<Vehicle, Object, Interpretant, NextInterpretant>(
  prior: SignRelationCarrier<Vehicle, Object, Interpretant>,
  interpretant: NextInterpretant,
): SemiosisStepCarrier<
  SignRelationCarrier<Vehicle, Object, Interpretant>,
  SignRelationCarrier<Interpretant, Object, NextInterpretant>
> {
  return Object.freeze({
    kind: "communicating.speaking.signifying.semiosisStep" as const,
    prior,
    next: signRelation(prior.interpretant, prior.object, interpretant),
  });
}

/** Apply a boundary translation into a semiosphere and carry both sides. */
export function translateAcrossSemiosphereBoundary<External, Vehicle, Object, Interpretant>(
  sphere: SemiosphereCarrier,
  external: External,
  translate: (external: External) => SignRelationCarrier<Vehicle, Object, Interpretant>,
): SemiosphereBoundaryTranslation<External, SignRelationCarrier<Vehicle, Object, Interpretant>> {
  return Object.freeze({
    kind: "communicating.speaking.signifying.semiosphereBoundaryTranslation" as const,
    semiosphere: sphere,
    external,
    internal: translate(external),
  });
}
