/**
 * accountable-attention - vivid surfaces with protocol-shaped warrants.
 *
 * This is the upstream form of Koios's "IETF-conformant clickbait" rule:
 * a headline, preview, social post, or Discover card may be sharp, but it
 * must preserve the warrant it invites the reader to inspect. The obligations
 * use RFC 2119-style modal keywords because the point is conformance, not
 * taste: do not strengthen modality, erase attribution, broaden scope, hide
 * correction state, or leave the body unable to discharge the surface promise.
 */
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/codecs";
import { normalizeTerm } from "./gates.mjs";

export const AttentionSurfaceKindSchema = { title: "AttentionSurfaceKind", anyOf: [{ const: "headline" }, { const: "description" }, { const: "summary" }, { const: "social" }, { const: "discover-preview" }] } as const;

export const Rfc2119KeywordSchema = { title: "Rfc2119Keyword", anyOf: [{ const: "MUST" }, { const: "MUST NOT" }, { const: "SHOULD" }, { const: "SHOULD NOT" }, { const: "MAY" }] } as const;

export const WarrantModalitySchema = { title: "WarrantModality", anyOf: [{ const: "alleges" }, { const: "confirms" }, { const: "denies" }, { const: "estimates" }, { const: "quotes" }, { const: "corrects" }, { const: "computes" }, { const: "interprets" }] } as const;

export const CorrectionStateSchema = { title: "CorrectionState", anyOf: [{ const: "current" }, { const: "clarified" }, { const: "corrected" }, { const: "retracted" }] } as const;

export const AttentionSurfaceSchema = { $id: "producing-content/topology/accountable-attention/surface", title: "AttentionSurface", additionalProperties: false, type: "object", required: ["kind", "surface", "text"], properties: { kind: { const: "producing-content.attention.surface" }, surface: AttentionSurfaceKindSchema, text: { minLength: 1, type: "string" } } } as const;

export const WarrantShapeSchema = { $id: "producing-content/topology/accountable-attention/warrant", title: "WarrantShape", additionalProperties: false, type: "object", required: ["kind", "modality", "scope", "correctionState", "evidence"], properties: { kind: { const: "producing-content.attention.warrant" }, modality: WarrantModalitySchema, attribution: { minLength: 1, type: "string" }, scope: { type: "array", items: { minLength: 1, type: "string" } }, correctionState: CorrectionStateSchema, evidence: { type: "array", items: { minLength: 1, type: "string" } } } } as const;

export const AttentionObligationSchema = { $id: "producing-content/topology/accountable-attention/obligation", title: "AttentionObligation", additionalProperties: false, type: "object", required: ["kind", "code", "keyword", "text"], properties: { kind: { const: "producing-content.attention.obligation" }, code: { minLength: 1, type: "string" }, keyword: Rfc2119KeywordSchema, text: { minLength: 1, type: "string" } } } as const;

export const AccountableAttentionContractSchema = { $id: "producing-content/topology/accountable-attention/contract", title: "AccountableAttentionContract", additionalProperties: false, type: "object", required: ["kind", "id", "surface", "warrant", "obligations"], properties: { kind: { const: "producing-content.attention.contract" }, id: { minLength: 1, type: "string" }, surface: AttentionSurfaceSchema, warrant: WarrantShapeSchema, obligations: { type: "array", items: AttentionObligationSchema } } } as const;

export const AccountableAttentionFindingSchema = { $id: "producing-content/topology/accountable-attention/finding", title: "AccountableAttentionFinding", additionalProperties: false, type: "object", required: ["kind", "obligation", "charge", "evidence"], properties: { kind: { const: "producing-content.attention.finding" }, obligation: { minLength: 1, type: "string" }, charge: { anyOf: [{ const: "pass" }, { const: "fail" }] }, evidence: { minLength: 1, type: "string" } } } as const;

export type AttentionSurfaceKind = FromSchema<typeof AttentionSurfaceKindSchema>;
export type Rfc2119Keyword = FromSchema<typeof Rfc2119KeywordSchema>;
export type WarrantModality = FromSchema<typeof WarrantModalitySchema>;
export type CorrectionState = FromSchema<typeof CorrectionStateSchema>;
export type AttentionSurface = FromSchema<typeof AttentionSurfaceSchema>;
export type WarrantShape = FromSchema<typeof WarrantShapeSchema>;
export type AttentionObligation = FromSchema<typeof AttentionObligationSchema>;
export type AccountableAttentionContract = FromSchema<typeof AccountableAttentionContractSchema>;
export type AccountableAttentionFinding = FromSchema<typeof AccountableAttentionFindingSchema>;

export const attentionSurfaceCarrier = carrierFrom(AttentionSurfaceSchema);

export const warrantShapeCarrier = carrierFrom(WarrantShapeSchema);

export const attentionObligationCarrier = carrierFrom(AttentionObligationSchema);

export const accountableAttentionContractCarrier = carrierFrom(AccountableAttentionContractSchema);

export const accountableAttentionFindingCarrier = carrierFrom(AccountableAttentionFindingSchema);

export const ACCOUNTABLE_ATTENTION_OBLIGATIONS: readonly AttentionObligation[] = Object.freeze([
  attentionObligation("preserve-modality", "MUST NOT", "The surface must not state a claim with stronger certainty than the warrant carries."),
  attentionObligation("preserve-attribution", "MUST", "When attribution is part of the warrant, the surface or its immediate preview must keep that attribution visible."),
  attentionObligation("preserve-scope", "MUST NOT", "The surface must not broaden the warrant's event, place, time, or affected population."),
  attentionObligation("preserve-correction", "MUST", "A corrected, clarified, or retracted warrant must keep that state visible on the attention surface or immediate preview."),
  attentionObligation("discharge-promise", "MUST", "The article body must contain evidence that discharges the surface promise."),
]);

export type AttentionSurfaceInput = Readonly<{
  surface: AttentionSurfaceKind;
  text: string;
}>;

export type WarrantShapeInput = Readonly<{
  modality: WarrantModality;
  attribution?: string;
  scope?: readonly string[];
  correctionState?: CorrectionState;
  evidence?: readonly string[];
}>;

export type AccountableAttentionContractInput = Readonly<{
  id: string;
  surface: AttentionSurfaceInput;
  warrant: WarrantShapeInput;
  obligations?: readonly AttentionObligation[];
}>;

export function attentionSurface(input: AttentionSurfaceInput): AttentionSurface {
  return attentionSurfaceCarrier.assert({
    kind: "producing-content.attention.surface" as const,
    surface: input.surface,
    text: input.text,
  }, "attention surface");
}

export function warrantShape(input: WarrantShapeInput): WarrantShape {
  return warrantShapeCarrier.assert({
    kind: "producing-content.attention.warrant" as const,
    modality: input.modality,
    ...(input.attribution === undefined ? {} : { attribution: input.attribution }),
    scope: [...(input.scope ?? [])],
    correctionState: input.correctionState ?? "current",
    evidence: [...(input.evidence ?? [])],
  }, "attention warrant");
}

export function attentionObligation(code: string, keyword: Rfc2119Keyword, text: string): AttentionObligation {
  return attentionObligationCarrier.assert({
    kind: "producing-content.attention.obligation" as const,
    code,
    keyword,
    text,
  }, "attention obligation");
}

export function accountableAttentionContract(input: AccountableAttentionContractInput): AccountableAttentionContract {
  return accountableAttentionContractCarrier.assert({
    kind: "producing-content.attention.contract" as const,
    id: input.id,
    surface: attentionSurface(input.surface),
    warrant: warrantShape(input.warrant),
    obligations: [...(input.obligations ?? ACCOUNTABLE_ATTENTION_OBLIGATIONS)],
  }, "accountable attention contract");
}

function finding(obligation: string, charge: "pass" | "fail", evidence: string): AccountableAttentionFinding {
  return accountableAttentionFindingCarrier.assert({
    kind: "producing-content.attention.finding" as const,
    obligation,
    charge,
    evidence,
  }, "accountable attention finding");
}

const CERTAINTY_WORDS = /\b(will|proves?|confirmed|guaranteed?|inevitabl\w*|certain(?:ly)?)\b/i;
const HEDGED_MODALITIES = new Set<WarrantModality>(["alleges", "estimates", "interprets"]);

function includesNormalized(haystack: string, needle: string): boolean {
  const normalizedNeedle = normalizeTerm(needle);
  return normalizedNeedle.length === 0 || normalizeTerm(haystack).includes(normalizedNeedle);
}

/**
 * Review an accountable-attention contract against optional body text. The
 * reading is deliberately conservative: it catches modality inflation,
 * attribution loss, scope loss, hidden correction state, and an empty body
 * promise. More specialized newsrooms can add stricter local gates downstream.
 */
export function reviewAccountableAttention(contract: AccountableAttentionContract, body: string = ""): readonly AccountableAttentionFinding[] {
  const surface = contract.surface.text;
  const combined = `${surface}\n${body}`;
  const findings: AccountableAttentionFinding[] = [];
  const hasBody = normalizeTerm(body).length > 0;

  const modalityInflated = HEDGED_MODALITIES.has(contract.warrant.modality) && CERTAINTY_WORDS.test(surface);
  findings.push(finding(
    "preserve-modality",
    modalityInflated ? "fail" : "pass",
    modalityInflated
      ? `surface "${surface}" uses certainty language for ${contract.warrant.modality} warrant`
      : `surface preserves ${contract.warrant.modality} modality`,
  ));

  const attribution = contract.warrant.attribution;
  const keepsAttribution = attribution === undefined || includesNormalized(combined, attribution);
  findings.push(finding(
    "preserve-attribution",
    keepsAttribution ? "pass" : "fail",
    keepsAttribution ? "attribution preserved" : `missing attribution "${attribution}"`,
  ));

  const missingScope = contract.warrant.scope.filter((scope) => !includesNormalized(combined, scope));
  findings.push(finding(
    "preserve-scope",
    missingScope.length === 0 ? "pass" : "fail",
    missingScope.length === 0 ? "scope terms preserved" : `missing scope term(s): ${missingScope.join(", ")}`,
  ));

  const correctionState = contract.warrant.correctionState;
  const visibleCorrection = correctionState === "current" || includesNormalized(combined, correctionState);
  findings.push(finding(
    "preserve-correction",
    visibleCorrection ? "pass" : "fail",
    visibleCorrection ? `correction state ${correctionState} visible or not required` : `hidden correction state ${correctionState}`,
  ));

  const discharged = hasBody && contract.warrant.evidence.some((evidence) => includesNormalized(body, evidence));
  findings.push(finding(
    "discharge-promise",
    discharged ? "pass" : "fail",
    discharged ? "body contains warrant evidence" : "body does not discharge the attention promise with warrant evidence",
  ));

  return Object.freeze(findings);
}

export function attentionSurfaceTerm(surface: AttentionSurface): Tm {
  return carrierToTerm(jsonResource(attentionSurfaceCarrier.assert(surface, "attention surface"), "attention surface"));
}

export function warrantShapeTerm(warrant: WarrantShape): Tm {
  return carrierToTerm(jsonResource(warrantShapeCarrier.assert(warrant, "attention warrant"), "attention warrant"));
}

export function accountableAttentionContractTerm(contract: AccountableAttentionContract): Tm {
  return carrierToTerm(jsonResource(accountableAttentionContractCarrier.assert(contract, "accountable attention contract"), "accountable attention contract"));
}

export function accountableAttentionFindingsTerm(findings: readonly AccountableAttentionFinding[]): Tm {
  return carrierToTerm(jsonResource(findings.map((item) => accountableAttentionFindingCarrier.assert(item, "accountable attention finding")), "accountable attention findings"));
}
