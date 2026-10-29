import type { ChargeValueName } from "@red-cup-engineering/relating";

/** The one Hohfeldian eightfold used by governance and operational office law. */
export const JURAL_KINDS = Object.freeze([
  "claim",
  "duty",
  "privilege",
  "no-right",
  "power",
  "liability",
  "immunity",
  "disability",
] as const);
export type JuralKind = typeof JURAL_KINDS[number];

const CORRELATIVE: Readonly<Record<JuralKind, JuralKind>> = Object.freeze({
  claim: "duty",
  duty: "claim",
  privilege: "no-right",
  "no-right": "privilege",
  power: "liability",
  liability: "power",
  immunity: "disability",
  disability: "immunity",
});

export interface JuralRelation {
  readonly kind: JuralKind;
  readonly active: string;
  readonly passive: string;
  readonly scope: string;
  readonly standing: ChargeValueName;
}

export function correlativeKind(kind: JuralKind): JuralKind {
  return CORRELATIVE[kind];
}

export function correlate(relation: JuralRelation): JuralRelation {
  return Object.freeze({
    kind: correlativeKind(relation.kind),
    active: relation.passive,
    passive: relation.active,
    scope: relation.scope,
    standing: relation.standing,
  });
}
