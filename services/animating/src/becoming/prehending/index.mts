/**
 * prehending - the constitutive grasp at animating's becoming boundary.
 *
 * A prehension is not a task or an office act. It is the animating-side admission
 * of "this subject grasps that datum under this subjective form" into relating:
 * a predication cell, the utterance that admits it, and the articulation opened
 * from that utterance. Boundary callers provide Mark payloads; this module
 * reconstructs the relating carriers as the lawful form.
 */
import {
  articulate,
  cell,
  claim,
  mark,
  predicateOfClaim,
  token,
  arrayTerm,
  objectTerm,
  stringTerm,
  tm,
  type JsonValue,
  type Tm,
} from "@red-cup-engineering/relating";
import type { PrehensionRequest } from "./carriers.mjs";
import type { Prehension } from "./carriers.mjs";

export type { PrehensionRequest } from "./carriers.mjs";
export type { Prehension } from "./carriers.mjs";

export const prehensionSubjectiveForms: Readonly<Record<"physical" | "conceptual" | "negative", string>> =
  Object.freeze({
    physical: "animating.agent.prehension.physical",
    conceptual: "animating.agent.prehension.conceptual",
    negative: "animating.agent.prehension.negative",
  });

/** Boundary admission for the prehend action. */
export function admitPrehensionRequest(input: JsonValue, verb: string): PrehensionRequest {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${verb}: expected an animating.agent.prehension-request carrier`);
  }
  if ((input as { readonly kind?: unknown }).kind !== "animating.agent.prehension-request") {
    throw new TypeError(`${verb}: expected kind animating.agent.prehension-request`);
  }
  return input as unknown as PrehensionRequest;
}

/**
 * Constitute a prehension from Mark payloads: subject and datum become
 * predication terms, subjectiveForm becomes the predicate claim, and the
 * resulting cell is admitted as one utterance/articulation.
 */
export function prehend(request: PrehensionRequest): Prehension {
  const subject = token(mark(request.subject));
  const datum = token(mark(request.datum));
  const subjectiveClaim = claim(mark(request.subjectiveForm));
  const subjectiveForm = predicateOfClaim(subjectiveClaim);
  const prehensionCell = cell(subject, subjectiveForm, datum);
  const utterance = Object.freeze({
    kind: "utterance.carrier" as const,
    token: subject,
    claim: subjectiveClaim,
  });
  return Object.freeze({
    kind: "animating.agent.prehension" as const,
    subject,
    datum,
    subjectiveForm,
    cell: prehensionCell,
    utterance,
    articulation: articulate(utterance),
    cells: Object.freeze([prehensionCell]),
    utterances: Object.freeze([utterance]),
  }) as unknown as Prehension;
}

const markTerm = (payload: Tm): Tm => objectTerm([
  ["kind", stringTerm("utterance.mark")],
  ["value", payload],
]);

const tokenTerm = (payload: Tm): Tm => objectTerm([
  ["kind", stringTerm("utterance.token")],
  ["hand", stringTerm("left")],
  ["mark", markTerm(payload)],
]);

const claimTerm = (payload: Tm): Tm => objectTerm([
  ["kind", stringTerm("utterance.claim")],
  ["hand", stringTerm("right")],
  ["mark", markTerm(payload)],
]);

const predicateTerm = (payload: Tm): Tm => objectTerm([
  ["kind", stringTerm("predication.predicate")],
  ["claim", claimTerm(payload)],
  ["mark", markTerm(payload)],
]);

/** The relational IR body for prehend: PrehensionRequest -> Prehension. */
export const prehendTerm: Tm = (() => {
  const input = tm.var(0);
  const subjectPayload = tm.field("subject", input);
  const datumPayload = tm.field("datum", input);
  const subjectiveFormPayload = tm.field("subjectiveForm", input);
  const subject = tokenTerm(subjectPayload);
  const datum = tokenTerm(datumPayload);
  const subjectiveForm = predicateTerm(subjectiveFormPayload);
  const utterance = objectTerm([
    ["kind", stringTerm("utterance.carrier")],
    ["token", subject],
    ["claim", claimTerm(subjectiveFormPayload)],
  ]);
  const prehensionCell = objectTerm([
    ["subject", subject],
    ["predicate", subjectiveForm],
    ["object", datum],
  ]);
  const articulation = objectTerm([
    ["kind", stringTerm("utterance.articulation.cell")],
    ["potentialAperiodicArticulationCell", arrayTerm([utterance, arrayTerm([arrayTerm([]), arrayTerm([])])])],
  ]);

  return tm.lam(objectTerm([
    ["kind", stringTerm("animating.agent.prehension")],
    ["subject", subject],
    ["datum", datum],
    ["subjectiveForm", subjectiveForm],
    ["cell", prehensionCell],
    ["utterance", utterance],
    ["articulation", articulation],
    ["cells", arrayTerm([prehensionCell])],
    ["utterances", arrayTerm([utterance])],
  ]));
})();
