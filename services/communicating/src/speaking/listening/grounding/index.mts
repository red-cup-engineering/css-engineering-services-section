/**
 * speaking/listening/grounding — common-ground carriers and update morphisms.
 *
 * A common ground is the communicative state participants treat as shared. It
 * grows by accepted assertions and refuses or removes propositions by challenge.
 */
export {
  CommonGroundBasisSchema,
  commonGroundCarrier,
  commonGroundPropositionCarrier,
  commonGroundUpdateCarrier,
} from "./carriers.mjs";
export type {
  CommonGroundBasis,
  CommonGroundCarrier,
  CommonGroundProposition,
  CommonGroundUpdate,
} from "./carriers.mjs";

import type {
  CommonGroundBasis,
  CommonGroundCarrier,
  CommonGroundProposition,
  CommonGroundUpdate,
} from "./carriers.mjs";

/** Construct a common-ground carrier from propositions already treated as shared. */
export const commonGround = <Proposition,>(
  propositions: readonly CommonGroundProposition<Proposition>[] = [],
): CommonGroundCarrier<Proposition> =>
  Object.freeze({
    kind: "communicating.speaking.listening.grounding.commonGround" as const,
    propositions: Object.freeze([...propositions]),
  });

/** Construct a proposition with the basis by which it enters common ground. */
export const commonGroundProposition = <Proposition,>(
  proposition: Proposition,
  basis: CommonGroundBasis,
): CommonGroundProposition<Proposition> =>
  Object.freeze({
    kind: "communicating.speaking.listening.grounding.proposition" as const,
    proposition,
    basis,
  });

const sameProposition = <Proposition,>(
  left: CommonGroundProposition<Proposition>,
  right: CommonGroundProposition<Proposition>,
): boolean => Object.is(left.proposition, right.proposition);

/** Add a proposition to common ground when it is not already present. */
export function assertIntoCommonGround<Proposition>(
  carrier: CommonGroundCarrier<Proposition>,
  proposition: CommonGroundProposition<Proposition>,
): CommonGroundUpdate<Proposition> {
  const propositions = carrier.propositions.some((item) => sameProposition(item, proposition))
    ? carrier.propositions
    : Object.freeze([...carrier.propositions, proposition]);
  return Object.freeze({
    kind: "communicating.speaking.listening.grounding.update" as const,
    before: carrier,
    after: commonGround(propositions),
    proposition,
    mode: "assertion" as const,
  });
}

/** Add a proposition by accommodation rather than prior explicit assertion. */
export function accommodateCommonGround<Proposition>(
  carrier: CommonGroundCarrier<Proposition>,
  proposition: Proposition,
): CommonGroundUpdate<Proposition> {
  const accommodated = commonGroundProposition(proposition, "accommodation");
  const update = assertIntoCommonGround(carrier, accommodated);
  return Object.freeze({ ...update, mode: "accommodation" as const });
}

/** Remove a proposition from common ground by challenge. */
export function challengeCommonGround<Proposition>(
  carrier: CommonGroundCarrier<Proposition>,
  proposition: CommonGroundProposition<Proposition>,
): CommonGroundUpdate<Proposition> {
  return Object.freeze({
    kind: "communicating.speaking.listening.grounding.update" as const,
    before: carrier,
    after: commonGround(carrier.propositions.filter((item) => !sameProposition(item, proposition))),
    proposition,
    mode: "challenge" as const,
  });
}
