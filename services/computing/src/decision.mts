/**
 * decision - exact linear-budget allocation.
 *
 * This migrates animating-experimental's old governing/deciding allocator into
 * computing: it is an effective operation over a finite carrier, not an
 * office-authority or social-consensus act. The action is schema-first and exact
 * over decimal integer strings. It deliberately has no `runTerm` yet: the current
 * relating `Tm` has structural equality/folds but no integer multiplication or
 * order, so a density-sorted allocator cannot be faithfully expressed in IR
 * without extending the numeric term language.
 */
import { carrierFrom, type FromSchema, type JsonValue } from "@red-cup-engineering/relating";

export const decisionRequestSchema = {
  $id: "computing/decision-request",
  title: "DecisionRequest",
  description: "A computing allocation request over a linear resource: proposals carry a JSON action, exact integer cost, exact integer merit, and an optional justification payload. Costs and merits are decimal strings to preserve exactness on the JSON wire.",
  type: "object",
  required: ["kind", "resource", "available", "proposals"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.decision-request" },
    resource: { type: "string", minLength: 1 },
    available: { $ref: "#/$defs/IntegerString" },
    meritThreshold: { $ref: "#/$defs/IntegerString" },
    proposals: {
      type: "array",
      items: { $ref: "#/$defs/Proposal" },
    },
  },
  $defs: {
    IntegerString: {
      type: "string",
      pattern: "^-?[0-9]+$",
    },
    Json: true,
    Proposal: {
      type: "object",
      required: ["id", "action", "cost", "merit"],
      additionalProperties: false,
      properties: {
        id: { type: "string", minLength: 1 },
        action: { $ref: "#/$defs/Json" },
        cost: { $ref: "#/$defs/IntegerString" },
        merit: { $ref: "#/$defs/IntegerString" },
        justification: { $ref: "#/$defs/Json" },
      },
    },
  },
} as const;

export const decisionRunSchema = {
  $id: "computing/decision-run",
  title: "DecisionRun",
  description: "The auditable result of allocating a linear resource across proposals. Every proposal yields exactly one decision: an acted commitment or an abstention with a reason. Exact integers remain decimal strings on the JSON wire.",
  type: "object",
  required: ["kind", "resource", "decisions", "spent", "remaining"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.decision-run" },
    resource: { type: "string", minLength: 1 },
    decisions: {
      type: "array",
      items: {
        oneOf: [
          { $ref: "#/$defs/Acted" },
          { $ref: "#/$defs/Abstained" },
        ],
      },
    },
    spent: { $ref: "#/$defs/IntegerString" },
    remaining: { $ref: "#/$defs/IntegerString" },
  },
  $defs: {
    IntegerString: {
      type: "string",
      pattern: "^-?[0-9]+$",
    },
    Json: true,
    Acted: {
      type: "object",
      required: ["kind", "id", "action", "cost", "merit", "justification"],
      additionalProperties: false,
      properties: {
        kind: { const: "computing.decision.act" },
        id: { type: "string", minLength: 1 },
        action: { $ref: "#/$defs/Json" },
        cost: { $ref: "#/$defs/IntegerString" },
        merit: { $ref: "#/$defs/IntegerString" },
        justification: { $ref: "#/$defs/Json" },
      },
    },
    Abstained: {
      type: "object",
      required: ["kind", "id", "cost", "merit", "justification", "reason"],
      additionalProperties: false,
      properties: {
        kind: { const: "computing.decision.abstain" },
        id: { type: "string", minLength: 1 },
        cost: { $ref: "#/$defs/IntegerString" },
        merit: { $ref: "#/$defs/IntegerString" },
        justification: { $ref: "#/$defs/Json" },
        reason: { enum: ["below-threshold", "budget-exhausted", "non-positive-cost"] },
      },
    },
  },
} as const;

export type DecisionRequest = FromSchema<typeof decisionRequestSchema>;
export type DecisionRun = FromSchema<typeof decisionRunSchema>;

export const decisionRequestCarrier = carrierFrom(decisionRequestSchema);
export const decisionRunCarrier = carrierFrom(decisionRunSchema);

export type AbstainReason = "below-threshold" | "budget-exhausted" | "non-positive-cost";
export type ActedDecision = Extract<DecisionRun["decisions"][number], { readonly kind: "computing.decision.act" }>;
export type AbstainedDecision = Extract<DecisionRun["decisions"][number], { readonly kind: "computing.decision.abstain" }>;

interface InternalProposal {
  readonly id: string;
  readonly action: JsonValue;
  readonly cost: bigint;
  readonly merit: bigint;
  readonly justification: JsonValue;
}

/** Allocate a linear budget across proposals in exact capital-efficiency order. */
export function decide(request: DecisionRequest): DecisionRun {
  const available = integerOf(request.available, "available");
  const threshold = integerOf(request.meritThreshold ?? "0", "meritThreshold");
  const proposals = request.proposals.map((proposal, index): InternalProposal => Object.freeze({
    id: proposal.id,
    action: proposal.action as JsonValue,
    cost: integerOf(proposal.cost, `proposals[${index}].cost`),
    merit: integerOf(proposal.merit, `proposals[${index}].merit`),
    justification: (proposal.justification ?? null) as JsonValue,
  }));

  let remaining = available;
  let spent = 0n;
  const decisions = [...proposals].sort(byDensityDesc).map((proposal) => {
    if (proposal.cost <= 0n) return abstain(proposal, "non-positive-cost");
    if (proposal.merit < threshold) return abstain(proposal, "below-threshold");
    if (proposal.cost > remaining) return abstain(proposal, "budget-exhausted");
    remaining -= proposal.cost;
    spent += proposal.cost;
    return Object.freeze({
      kind: "computing.decision.act" as const,
      id: proposal.id,
      action: proposal.action,
      cost: proposal.cost.toString(),
      merit: proposal.merit.toString(),
      justification: proposal.justification,
    });
  });

  return Object.freeze({
    kind: "computing.decision-run" as const,
    resource: request.resource,
    decisions: Object.freeze(decisions),
    spent: spent.toString(),
    remaining: remaining.toString(),
  }) as DecisionRun;
}

/** The actions taken in a run, in allocation order. */
export function actionsOf(run: DecisionRun): readonly JsonValue[] {
  return Object.freeze(run.decisions
    .filter((decision): decision is ActedDecision => decision.kind === "computing.decision.act")
    .map((decision) => decision.action as JsonValue));
}

/** The acted decisions of a run, retaining cost/merit/justification. */
export function actedOf(run: DecisionRun): readonly ActedDecision[] {
  return Object.freeze(run.decisions.filter((decision): decision is ActedDecision => decision.kind === "computing.decision.act"));
}

export function admitDecisionRequest(input: JsonValue, verb: string): DecisionRequest {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${verb}: expected a computing.decision-request carrier`);
  }
  if ((input as { readonly kind?: unknown }).kind !== "computing.decision-request") {
    throw new TypeError(`${verb}: expected kind computing.decision-request`);
  }
  return input as unknown as DecisionRequest;
}

function abstain(proposal: InternalProposal, reason: AbstainReason): AbstainedDecision {
  return Object.freeze({
    kind: "computing.decision.abstain" as const,
    id: proposal.id,
    cost: proposal.cost.toString(),
    merit: proposal.merit.toString(),
    justification: proposal.justification,
    reason,
  }) as AbstainedDecision;
}

function byDensityDesc(left: InternalProposal, right: InternalProposal): number {
  const lhs = left.merit * right.cost;
  const rhs = right.merit * left.cost;
  if (lhs > rhs) return -1;
  if (lhs < rhs) return 1;
  if (left.merit > right.merit) return -1;
  if (left.merit < right.merit) return 1;
  return left.id.localeCompare(right.id);
}

function integerOf(value: string, label: string): bigint {
  if (!/^-?[0-9]+$/.test(value)) throw new TypeError(`decide: ${label} must be a decimal integer string`);
  return BigInt(value);
}
