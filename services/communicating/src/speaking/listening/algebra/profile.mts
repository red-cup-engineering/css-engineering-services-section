import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";

export const languageGrammarProfileSchema = {
  $id: "communicating/language/grammar-profile",
  type: "object",
  required: [
    "kind",
    "wordOrder",
    "alignment",
    "headDirectionality",
    "roleStrategies",
    "morphology",
    "segmentation",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.language-grammar-profile" },
    wordOrder: { enum: ["SVO", "SOV", "VSO", "VOS", "OVS", "OSV", "free", "topic-comment"] },
    alignment: {
      enum: [
        "nominative-accusative",
        "ergative-absolutive",
        "active-stative",
        "semantic-particle",
        "topic-comment",
        "underdetermined",
      ],
    },
    headDirectionality: {
      type: "object",
      required: ["determiner", "adjective", "subject", "object", "adposition"],
      additionalProperties: false,
      properties: {
        determiner: { enum: ["left", "right", "mixed"] },
        adjective: { enum: ["left", "right", "mixed"] },
        subject: { enum: ["left", "right", "mixed"] },
        object: { enum: ["left", "right", "mixed"] },
        adposition: { enum: ["left", "right", "mixed"] },
      },
    },
    roleStrategies: {
      type: "array",
      items: {
        type: "object",
        required: ["relation", "by"],
        additionalProperties: false,
        properties: {
          relation: { enum: ["nsubj", "dobj", "det", "amod", "advmod", "prep", "pobj", "obl", "case", "discourse", "topic", "focus", "contrast", "repair", "ccomp", "mark"] },
          by: { enum: ["position", "case", "particle", "nearest"] },
          direction: { enum: ["left", "right", "any"] },
          distance: { enum: ["nearest", "farthest"] },
          caseFeature: { type: "string", minLength: 1 },
          marker: { type: "string", minLength: 1 },
          markerPosition: { enum: ["before", "after"] },
          note: { type: "string" },
        },
      },
    },
    morphology: {
      type: "object",
      required: ["type", "caseMarking", "agreement"],
      additionalProperties: false,
      properties: {
        type: { enum: ["isolating", "agglutinative", "fusional", "polysynthetic", "mixed"] },
        caseMarking: { enum: ["none", "suffix", "particle", "mixed"] },
        agreement: { enum: ["none", "weak", "rich", "pronominal"] },
      },
    },
    segmentation: {
      type: "object",
      required: ["sentenceBoundary", "wordBoundary"],
      additionalProperties: false,
      properties: {
        sentenceBoundary: { enum: ["punctuation", "particle", "line", "mixed"] },
        wordBoundary: { enum: ["space", "script", "morpheme", "mixed"] },
      },
    },
    notes: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

export type LanguageGrammarProfile = FromSchema<typeof languageGrammarProfileSchema>;
export const languageGrammarProfileCarrier = carrierFrom(languageGrammarProfileSchema);

export const morphotacticPatternRuleSchema = {
  $id: "communicating/language/morphotactic-pattern-rule",
  type: "object",
  required: ["pattern", "tag"],
  additionalProperties: false,
  properties: {
    pattern: {
      type: "string",
      minLength: 1,
      description: "A Unicode regular expression over the surface token.",
    },
    tag: {
      type: "string",
      minLength: 1,
      description: "The syntactic tag admitted when the surface matches the pattern.",
    },
    root: {
      type: "string",
      minLength: 1,
      description: "Optional consonantal/root witness read from a non-concatenative template.",
    },
    template: {
      type: "string",
      minLength: 1,
      description: "Optional template or stem-pattern witness.",
    },
    features: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
  },
} as const;

export type MorphotacticPatternRule = FromSchema<typeof morphotacticPatternRuleSchema>;
export const morphotacticPatternRuleCarrier = carrierFrom(morphotacticPatternRuleSchema);

export function grammarProfileFromLegacyBundle(raw: {
  readonly wordOrder: "SVO" | "SOV" | "VSO" | "VOS" | "OVS" | "OSV" | "free" | "topic-comment";
  readonly roleBy?: "case";
  readonly attachment: {
    readonly determiner: "left" | "right";
    readonly adjective: "left" | "right";
    readonly subject: "left" | "right";
    readonly object: "left" | "right";
  };
}): LanguageGrammarProfile {
  const subjectDirection = raw.attachment.subject;
  const objectDirection = raw.attachment.object;
  const roleStrategies = raw.roleBy === "case"
    ? [
        { relation: "nsubj", by: "case", caseFeature: "case:nom" },
        { relation: "dobj", by: "case", caseFeature: "case:acc" },
      ] as const
    : [
        { relation: "nsubj", by: "position", direction: subjectDirection === "left" ? "left" : "right", distance: "nearest" },
        { relation: "dobj", by: "position", direction: objectDirection === "left" ? "left" : "right", distance: "nearest" },
      ] as const;
  return Object.freeze({
    kind: "communicating.language-grammar-profile" as const,
    wordOrder: raw.wordOrder,
    alignment: raw.roleBy === "case" ? "nominative-accusative" : "underdetermined",
    headDirectionality: {
      determiner: raw.attachment.determiner,
      adjective: raw.attachment.adjective,
      subject: subjectDirection,
      object: objectDirection,
      adposition: "left",
    },
    roleStrategies,
    morphology: {
      type: "mixed",
      caseMarking: raw.roleBy === "case" ? "suffix" : "none",
      agreement: "weak",
    },
    segmentation: {
      sentenceBoundary: "punctuation",
      wordBoundary: "space",
    },
    notes: ["Derived from the pre-profile bundle fields."],
  } as const);
}
