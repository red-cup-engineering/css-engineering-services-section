/**
 * derivation-provenance - the four-stage proof spine under computing results.
 *
 * This is the operational reading promised by the package roadmap: every
 * computing result can be lifted through articulating -> predicating ->
 * positing -> settling. The stages are finite content-addressed witnesses; the
 * trace tiling is the runnable surface, not a claim of full proof-theoretic
 * completeness.
 */
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";
import type { SettledBuildTerm } from "./holographic-compute.mjs";
import { contentHash, stableJson } from "./holographic-compute.mjs";
import {
  foldTraceTiles,
  traceTile,
  traceTilingSchema,
  type TraceTile,
  type TraceTiling,
} from "./trace-holography.mjs";

const hashPattern = "^[A-Za-z0-9._:+/-]+$";

export const derivationStageNameSchema = {
  enum: ["articulating", "predicating", "positing", "settling"],
} as const;

export const derivationProvenanceInputSchema = {
  $id: "computing/derivation-provenance-input",
  title: "DerivationProvenanceInput",
  type: "object",
  required: ["kind", "source", "subject", "payload", "boundaryHashes"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.derivation-provenance-input" },
    source: { enum: ["labels", "build", "dap", "lsp", "action", "workspace", "manual"] },
    subject: { type: "string", minLength: 1 },
    payload: {},
    boundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
  },
} as const;

export type DerivationProvenanceInput = FromSchema<typeof derivationProvenanceInputSchema>;
export const derivationProvenanceInputCarrier = carrierFrom(derivationProvenanceInputSchema);

export const derivationStageSchema = {
  $id: "computing/derivation-stage",
  title: "DerivationStage",
  type: "object",
  required: ["kind", "$id", "stage", "order", "source", "subject", "payload", "boundaryHashes", "descriptionLength"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.derivation-stage" },
    $id: { type: "string", minLength: 1, pattern: hashPattern },
    stage: derivationStageNameSchema,
    order: { type: "integer", minimum: 0, maximum: 3 },
    source: { enum: ["labels", "build", "dap", "lsp", "action", "workspace", "manual"] },
    subject: { type: "string", minLength: 1 },
    payload: {},
    boundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    descriptionLength: { type: "integer", minimum: 0 },
  },
} as const;

export type DerivationStage = FromSchema<typeof derivationStageSchema>;
export const derivationStageCarrier = carrierFrom(derivationStageSchema);

export const derivationProvenanceReceiptSchema = {
  $id: "computing/derivation-provenance-receipt",
  title: "DerivationProvenanceReceipt",
  type: "object",
  required: [
    "kind",
    "$id",
    "source",
    "subject",
    "boundaryHashes",
    "stages",
    "settledHash",
    "trace",
    "maturity",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.derivation-provenance-receipt" },
    $id: { type: "string", minLength: 1, pattern: hashPattern },
    source: { enum: ["labels", "build", "dap", "lsp", "action", "workspace", "manual"] },
    subject: { type: "string", minLength: 1 },
    boundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    stages: { type: "array", minItems: 4, maxItems: 4, items: derivationStageSchema },
    settledHash: { type: "string", minLength: 1, pattern: hashPattern },
    trace: traceTilingSchema,
    maturity: {
      type: "object",
      required: ["tag", "note"],
      additionalProperties: false,
      properties: {
        tag: { const: "Built+green" },
        note: { type: "string", minLength: 1 },
      },
    },
  },
} as const;

export type DerivationProvenanceReceipt = FromSchema<typeof derivationProvenanceReceiptSchema>;
export const derivationProvenanceReceiptCarrier = carrierFrom(derivationProvenanceReceiptSchema);

const stageNames = Object.freeze(["articulating", "predicating", "positing", "settling"] as const);

function unique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)]);
}

function stagePayload(input: DerivationProvenanceInput, stage: typeof stageNames[number], previous: readonly DerivationStage[]): unknown {
  switch (stage) {
    case "articulating":
      return Object.freeze({
        source: input.source,
        subject: input.subject,
        documentHash: contentHash(input.payload),
      });
    case "predicating":
      return Object.freeze({
        subject: input.subject,
        boundaryHashes: unique(input.boundaryHashes),
        predicate: `${input.source}.computes`,
      });
    case "positing":
      return Object.freeze({
        subject: input.subject,
        claim: input.payload,
        priorStage: previous.at(-1)?.$id,
      });
    case "settling":
      return Object.freeze({
        subject: input.subject,
        settledHash: contentHash({ subject: input.subject, payload: input.payload, stages: previous.map((entry) => entry.$id) }),
      });
  }
}

function stageBoundary(input: DerivationProvenanceInput, previous: readonly DerivationStage[]): readonly string[] {
  return previous.length === 0
    ? unique(input.boundaryHashes)
    : unique([previous[previous.length - 1]!.$id]);
}

function makeStage(input: DerivationProvenanceInput, stage: typeof stageNames[number], order: number, previous: readonly DerivationStage[]): DerivationStage {
  const payload = stagePayload(input, stage, previous);
  const boundaryHashes = stageBoundary(input, previous);
  const canonical = Object.freeze({
    stage,
    order,
    source: input.source,
    subject: input.subject,
    payload,
    boundaryHashes,
  });
  return derivationStageCarrier.assert(Object.freeze({
    kind: "computing.derivation-stage" as const,
    $id: contentHash(canonical),
    ...canonical,
    descriptionLength: stableJson(canonical).length,
  })) as DerivationStage;
}

function stageTile(stage: DerivationStage): TraceTile {
  return traceTile({
    kind: "computing.trace-event-input",
    source: stage.source,
    subject: `${stage.subject}/${stage.stage}`,
    rule: `provenance.${stage.stage}`,
    stage: stage.order,
    payload: stage,
    boundaryHashes: stage.boundaryHashes,
  });
}

export function deriveProvenance(input: DerivationProvenanceInput): DerivationProvenanceReceipt {
  const admitted = derivationProvenanceInputCarrier.assert(input) as DerivationProvenanceInput;
  const stages: DerivationStage[] = [];
  for (const [order, stage] of stageNames.entries()) {
    stages.push(makeStage(admitted, stage, order, stages));
  }
  const frozenStages = Object.freeze(stages);
  const trace = foldTraceTiles(frozenStages.map(stageTile));
  const settledHash = frozenStages[frozenStages.length - 1]!.$id;
  return derivationProvenanceReceiptCarrier.assert(Object.freeze({
    kind: "computing.derivation-provenance-receipt" as const,
    $id: contentHash({ source: admitted.source, subject: admitted.subject, stages: frozenStages.map((stage) => stage.$id) }),
    source: admitted.source,
    subject: admitted.subject,
    boundaryHashes: unique(admitted.boundaryHashes),
    stages: frozenStages,
    settledHash,
    trace,
    maturity: Object.freeze({
      tag: "Built+green" as const,
      note: "Finite executable four-stage provenance; general proof-theoretic completeness remains outside this carrier.",
    }),
  })) as DerivationProvenanceReceipt;
}

export function provenanceFromBuildTerm(term: SettledBuildTerm): DerivationProvenanceReceipt {
  return deriveProvenance({
    kind: "computing.derivation-provenance-input",
    source: "build",
    subject: term.derivation.name,
    payload: term,
    boundaryHashes: [term.$id, ...term.boundaryHashes],
  });
}

export function provenanceTrace(receipt: DerivationProvenanceReceipt): TraceTiling {
  return receipt.trace as TraceTiling;
}
