/**
 * operating - settled operational reads for downstream computing surfaces.
 *
 * This owns the executable-task face of the old animating-experimental work algebra:
 * a closure structure is classified by whether its meaning is fixed at dispatch
 * and whether execution is deterministic. Office assignment and collective
 * adjudication stay out of this module; those are organizing readings.
 */

import { arrayTerm, objectTerm, stringTerm, tm, type JsonValue, type Tm } from "@red-cup-engineering/relating";
import { type CapabilityDecision } from "./capability-decision.mjs";
import { type CapabilityRequest } from "./capability-request.mjs";
import { type WorkClosure } from "./work-closure.mjs";
import { type WorkTypeCarrier } from "./work-type.mjs";

export type LabelCharge = "potential" | "active" | "stable" | "absurd";
export { capabilityDecisionCarrier, type CapabilityDecision } from "./capability-decision.mjs";
export { capabilityRequestCarrier, type CapabilityRequest } from "./capability-request.mjs";
export { workClosureCarrier, type WorkClosure } from "./work-closure.mjs";
export { workTypeCarrier, type WorkTypeCarrier } from "./work-type.mjs";

export type WorkType = WorkTypeCarrier["value"];

export const WORK_TYPES: readonly WorkType[] = Object.freeze([
  "inquiry",
  "derivation",
  "procedure",
  "process",
]);

export type LabeledSettledMemeInput = Readonly<{
  id: string;
  predicate: string;
  charge: LabelCharge;
  object?: string;
}>;

export type DerivationProvenance = Readonly<{
  kind: "computing.derivation.provenance";
  source: "labels";
  labels: readonly string[];
}>;

export type ObservationArena = Readonly<{
  kind: "computing.observation.arena";
  positions: readonly string[];
  moves: readonly Readonly<{
    from: string;
    to: string;
    predicate: string;
    charge: LabelCharge;
  }>[];
  structure: Readonly<{
    events: readonly Readonly<{
      id: string;
      predicate: string;
      charge: LabelCharge;
      object?: string;
    }>[];
  }>;
}>;

export type Observation = Readonly<{
  kind: "computing.observation";
  labels: readonly LabeledSettledMemeInput[];
  arena: ObservationArena;
  provenance: DerivationProvenance;
}>;

export function observeLabels(labels: readonly LabeledSettledMemeInput[]): Observation {
  const settled = Object.freeze(labels.map((label) => Object.freeze({
    id: label.id,
    predicate: label.predicate,
    charge: label.charge,
    ...(label.object === undefined ? {} : { object: label.object }),
  })));
  return Object.freeze({
    kind: "computing.observation" as const,
    labels: settled,
    arena: Object.freeze({
      kind: "computing.observation.arena" as const,
      positions: Object.freeze(settled.map((label) => label.id)),
      moves: Object.freeze(settled.map((label) => Object.freeze({
        from: label.id,
        to: label.object ?? label.id,
        predicate: label.predicate,
        charge: label.charge,
      }))),
      structure: Object.freeze({
        events: settled,
      }),
    }),
    provenance: Object.freeze({
      kind: "computing.derivation.provenance" as const,
      source: "labels" as const,
      labels: Object.freeze(settled.map((label) => label.id)),
    }),
  });
}

/** meaning-settled(T): every goal cell is determined at dispatch. */
export function meaningSettled(closure: WorkClosure): boolean {
  return closure.goalCells.every((goal) => goal.determinedAtDispatch);
}

/** execution-settled(T): no closure rule branches. */
export function executionSettled(closure: WorkClosure): boolean {
  return closure.rules.every((rule) => !rule.branching);
}

/** The pure 2x2 map from settled meaning/execution to the work quartet. */
export function workTypeOf(meaning: boolean, execution: boolean): WorkType {
  return meaning
    ? execution ? "process" : "procedure"
    : execution ? "derivation" : "inquiry";
}

/** Read a task closure into its executable work type. */
export function classifyWork(closure: WorkClosure): WorkTypeCarrier {
  const meaning = meaningSettled(closure);
  const execution = executionSettled(closure);
  return Object.freeze({
    kind: "computing.work-type" as const,
    value: workTypeOf(meaning, execution),
    meaningSettled: meaning,
    executionSettled: execution,
  });
}

const COORDINATES: Readonly<Record<WorkType, readonly [meaning: boolean, execution: boolean]>> =
  Object.freeze({
    process: Object.freeze([true, true] as const),
    procedure: Object.freeze([true, false] as const),
    derivation: Object.freeze([false, true] as const),
    inquiry: Object.freeze([false, false] as const),
  });

/** Settlement order on the product lattice: inquiry below process; procedure and derivation incomparable. */
export function settlementLeq(a: WorkType, b: WorkType): boolean {
  const [aMeaning, aExecution] = COORDINATES[a];
  const [bMeaning, bExecution] = COORDINATES[b];
  return (!aMeaning || bMeaning) && (!aExecution || bExecution);
}

const boolFalse: Tm = tm.bool(false);
const boolTrue: Tm = tm.bool(true);

const notTerm = (value: Tm): Tm => tm.cond(value, boolFalse, boolTrue);
const andTerm = (left: Tm, right: Tm): Tm => tm.cond(left, right, boolFalse);
const isEmptyArrayTerm = (value: Tm): Tm => tm.coincide(value, arrayTerm([]));

/** `member x list` for array-encoded carrier terms. */
const memberTerm: Tm = tm.lam(tm.lam(
  tm.fold(
    tm.lam(tm.lam(
      tm.cond(tm.var(1), boolTrue, tm.coincide(tm.var(3), tm.var(0))),
    )),
    boolFalse,
    tm.var(0),
  ),
));

const allGoalsDeterminedTerm: Tm = tm.fold(
  tm.lam(tm.lam(andTerm(tm.var(1), tm.field("determinedAtDispatch", tm.var(0))))),
  boolTrue,
  tm.field("goalCells", tm.var(0)),
);

const noRulesBranchTerm: Tm = tm.fold(
  tm.lam(tm.lam(andTerm(tm.var(1), notTerm(tm.field("branching", tm.var(0)))))),
  boolTrue,
  tm.field("rules", tm.var(0)),
);

const workTypeValueTerm = (meaning: Tm, execution: Tm): Tm =>
  tm.cond(
    meaning,
    tm.cond(execution, stringTerm("process"), stringTerm("procedure")),
    tm.cond(execution, stringTerm("derivation"), stringTerm("inquiry")),
  );

/** The relational IR body for classify-work: WorkClosure -> WorkTypeCarrier. */
export const classifyWorkTerm: Tm = tm.lam(
  tm.app(
    tm.app(
      tm.lam(tm.lam(objectTerm([
        ["kind", stringTerm("computing.work-type")],
        ["value", workTypeValueTerm(tm.var(1), tm.var(0))],
        ["meaningSettled", tm.var(1)],
        ["executionSettled", tm.var(0)],
      ]))),
      allGoalsDeterminedTerm,
    ),
    noRulesBranchTerm,
  ),
);

/** Boundary admission for the classify-work action. */
export function admitWorkClosure(input: JsonValue, verb: string): WorkClosure {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${verb}: expected a computing.work-closure carrier`);
  }
  if ((input as { readonly kind?: unknown }).kind !== "computing.work-closure") {
    throw new TypeError(`${verb}: expected kind computing.work-closure`);
  }
  return input as unknown as WorkClosure;
}

/** Check a computing capability request by finite set inclusion. */
export function decideCapabilities(request: CapabilityRequest): CapabilityDecision {
  const provided = new Set(request.capabilities);
  const missing = Object.freeze(request.requires.filter((required) => !provided.has(required)));
  const admitted = missing.length === 0;
  return Object.freeze({
    kind: "computing.capability-decision" as const,
    admitted,
    status: admitted ? "potential" as const : "active" as const,
    missing,
  });
}

const missingCapabilitiesTerm: Tm = tm.lam(
  tm.fold(
    tm.lam(tm.lam(
      tm.cond(
        tm.app(tm.app(memberTerm, tm.var(0)), tm.field("capabilities", tm.var(2))),
        tm.var(1),
        tm.append(tm.var(1), arrayTerm([tm.var(0)])),
      ),
    )),
    arrayTerm([]),
    tm.field("requires", tm.var(0)),
  ),
);

/** The relational IR body for decide-capabilities: CapabilityRequest -> CapabilityDecision. */
export const decideCapabilitiesTerm: Tm = tm.lam(
  tm.app(
    tm.lam(objectTerm([
      ["kind", stringTerm("computing.capability-decision")],
      ["admitted", isEmptyArrayTerm(tm.var(0))],
      ["status", tm.cond(isEmptyArrayTerm(tm.var(0)), stringTerm("potential"), stringTerm("active"))],
      ["missing", tm.var(0)],
    ])),
    tm.app(missingCapabilitiesTerm, tm.var(0)),
  ),
);

/** Boundary admission for the decide-capabilities action. */
export function admitCapabilityRequest(input: JsonValue, verb: string): CapabilityRequest {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${verb}: expected a computing.capability-request carrier`);
  }
  if ((input as { readonly kind?: unknown }).kind !== "computing.capability-request") {
    throw new TypeError(`${verb}: expected kind computing.capability-request`);
  }
  return input as unknown as CapabilityRequest;
}
