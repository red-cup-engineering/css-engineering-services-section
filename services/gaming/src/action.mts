/**
 * Gaming action constructor.
 *
 * Carrier objects remain the sole authored source of domain/codomain identity.
 * Gaming also exposes their bare descent-path references on each action because
 * actions themselves are part of this package's public, inspectable boundary.
 */
import {
  action as relatingAction,
  type Action,
  type ActionSpec,
} from "@red-cup-engineering/relating";

export interface GamingAction extends Action {
  readonly domainSchema?: Readonly<{ readonly $ref: string }>;
  readonly codomainSchema?: Readonly<{ readonly $ref: string }>;
}

/** Construct an action and project schema references directly from its carriers. */
export function action(spec: ActionSpec): GamingAction {
  const declared = relatingAction(spec);
  return Object.freeze({
    ...declared,
    ...(declared.domain === undefined
      ? {}
      : { domainSchema: Object.freeze({ $ref: declared.domain.id }) }),
    ...(declared.codomain === undefined
      ? {}
      : { codomainSchema: Object.freeze({ $ref: declared.codomain.id }) }),
  });
}
