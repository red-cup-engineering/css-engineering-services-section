import { readFileSync } from "node:fs";

import {
  carrierFrom,
  chu,
  coordinationCohomology,
  evaluateRunTerm,
  lambek,
  sofic,
  type FromSchema,
  type JsonValue,
} from "@red-cup-engineering/relating";

import type { RawBundle, CompiledBundle } from "./fiber.mjs";
import { load } from "./compile.mjs";
import "./profile.mjs";
import { registerFiberAxes, registerFiberDataSchema } from "./register-fiber.mjs";

const rwilLiteralSchema = {
  type: "object",
  required: ["entity", "attribute", "value"],
  additionalProperties: false,
  properties: {
    entity: { type: "string", minLength: 1 },
    attribute: { type: "string", minLength: 1 },
    value: {},
    time: { type: "string", minLength: 1 },
    witness: { type: "string", minLength: 1 },
  },
} as const;

const stringArraySchema = { type: "array", items: { type: "string" } } as const;

const suffixRuleSchema = {
  type: "object",
  required: ["pattern", "tag"],
  properties: {
    pattern: { type: "string", minLength: 1 },
    tag: { type: "string", minLength: 1 },
  },
} as const;

const languageBundleSchema = {
  type: "object",
  required: ["meta", "lexicon", "morphology", "reference", "wordOrder", "attachment", "segmentation"],
  properties: {
    meta: {
      type: "object",
      required: ["name", "code", "script", "direction"],
      additionalProperties: false,
      properties: {
        name: { type: "string", minLength: 1 },
        code: { type: "string", minLength: 1 },
        script: { type: "string", minLength: 1 },
        direction: { enum: ["ltr", "rtl"] },
      },
    },
    lexicon: {
      type: "object",
      required: ["determiners", "prepositions", "pronouns", "conjunctions", "auxiliaries", "copula"],
      additionalProperties: false,
      properties: {
        determiners: stringArraySchema,
        prepositions: stringArraySchema,
        pronouns: stringArraySchema,
        conjunctions: stringArraySchema,
        auxiliaries: stringArraySchema,
        copula: stringArraySchema,
      },
    },
    morphology: {
      type: "object",
      required: ["suffixRules", "numberSuffixPattern", "verbFormRules", "numberWords"],
      properties: {
        suffixRules: { type: "array", items: suffixRuleSchema },
        featureRules: { type: "array", items: suffixRuleSchema },
        rootPatternRules: { type: "array", items: { $ref: "communicating/language/morphotactic-pattern-rule" } },
        numberSuffixPattern: { type: "string" },
        verbFormRules: { type: "array", items: suffixRuleSchema },
        numberWords: stringArraySchema,
        irregularPlurals: { type: "object" },
        irregularVerbs: { type: "object" },
      },
    },
    reference: {
      type: "object",
      required: ["pronouns"],
      properties: {
        pronouns: { type: "object" },
        nameGender: { type: "object" },
      },
    },
    wordOrder: { enum: ["SVO", "SOV", "VSO", "VOS", "OVS", "OSV", "free", "topic-comment"] },
    roleBy: { enum: ["case"] },
    grammar: { $ref: "communicating/language/grammar-profile" },
    registerFiber: registerFiberDataSchema,
    attachment: {
      type: "object",
      required: ["determiner", "adjective", "subject", "object"],
      additionalProperties: false,
      properties: {
        determiner: { enum: ["left", "right"] },
        adjective: { enum: ["left", "right"] },
        subject: { enum: ["left", "right"] },
        object: { enum: ["left", "right"] },
      },
    },
    segmentation: {
      type: "object",
      required: ["sentenceTerminatorPattern", "abbreviations"],
      additionalProperties: false,
      properties: {
        sentenceTerminatorPattern: { type: "string" },
        abbreviations: stringArraySchema,
      },
    },
  },
} as const;

export const languageManifestSchema = {
  $id: "communicating/language/manifest",
  type: "object",
  required: ["kind", "bundle"],
  additionalProperties: false,
  properties: {
    kind: { const: "communicating.language-manifest" },
    bundle: languageBundleSchema,
    rwil: {
      type: "array",
      items: rwilLiteralSchema,
    },
    rmn: {
      type: "array",
      items: { type: "object" },
    },
    lambek: {
      type: "object",
      properties: {
        categories: { type: "array", items: { type: "string", minLength: 1 } },
        judgments: { type: "array", items: { type: "object" } },
      },
    },
    sofic: {
      type: "object",
      properties: {
        alphabet: { type: "array", items: { type: "string", minLength: 1 } },
        graph: { type: "array", items: { type: "array", items: { type: "boolean" } } },
        factor: { type: "array", items: { type: "integer", minimum: 0 } },
        sample: { type: "array", items: { type: "integer", minimum: 0 } },
        note: { type: "string" },
      },
    },
    chu: {
      type: "object",
      properties: {
        pts: { type: "array", items: { type: "string", minLength: 1 } },
        sts: { type: "array", items: { type: "string", minLength: 1 } },
        matrix: { type: "array", items: { type: "object" } },
      },
    },
    discourseCover: {
      type: "object",
      required: ["entities", "cells", "components"],
      additionalProperties: false,
      properties: {
        entities: { type: "integer", minimum: 0 },
        cells: { type: "integer", minimum: 0 },
        components: { type: "integer", minimum: 0 },
        note: { type: "string" },
      },
    },
  },
} as const;

export type LanguageManifestCarrier = FromSchema<typeof languageManifestSchema>;
export const languageManifestCarrier = carrierFrom(languageManifestSchema);

export interface RwilLiteral {
  readonly entity: string;
  readonly attribute: string;
  readonly value: unknown;
  readonly time?: string;
  readonly witness?: string;
}

export interface LambekManifest {
  readonly categories?: readonly string[];
  readonly judgments?: readonly Record<string, unknown>[];
}

export interface SoficManifest {
  readonly alphabet?: readonly string[];
  readonly graph?: readonly (readonly boolean[])[];
  readonly factor?: readonly number[];
  readonly sample?: readonly number[];
  readonly note?: string;
}

export interface ChuManifest {
  readonly pts?: readonly string[];
  readonly sts?: readonly string[];
  readonly matrix?: readonly Record<string, unknown>[];
}

export interface DiscourseCoverManifest {
  readonly entities: number;
  readonly cells: number;
  readonly components: number;
  readonly note?: string;
}

export interface LanguageManifest extends Omit<LanguageManifestCarrier, "bundle" | "rwil" | "lambek" | "sofic" | "chu" | "discourseCover"> {
  readonly bundle: RawBundle;
  readonly rwil?: readonly RwilLiteral[];
  readonly lambek?: LambekManifest;
  readonly sofic?: SoficManifest;
  readonly chu?: ChuManifest;
  readonly discourseCover?: DiscourseCoverManifest;
}

export interface LanguageManifestReceipt {
  readonly kind: "communicating.language-manifest.receipts";
  readonly language: string;
  readonly rwil: readonly RwilLiteral[];
  readonly lambek: unknown;
  readonly sofic: unknown;
  readonly chu: unknown;
  readonly discourseCover: unknown;
}

const asJsonValue = (value: unknown): JsonValue => value as JsonValue;

export function loadLanguageManifest(value: unknown, context = "language manifest"): LanguageManifest {
  return Object.freeze(languageManifestCarrier.assert(value, context) as unknown as LanguageManifest);
}

export function loadLanguageManifestFile(url: URL, context = url.href): LanguageManifest {
  return loadLanguageManifest(JSON.parse(readFileSync(url, "utf8")), context);
}

export const bundleFromLanguageManifest = (manifest: LanguageManifest): RawBundle => manifest.bundle;

export const compiledBundleFromLanguageManifest = (manifest: LanguageManifest): CompiledBundle =>
  load(bundleFromLanguageManifest(manifest));

export function languageManifestRwIlRows(manifest: LanguageManifest): readonly RwilLiteral[] {
  const language = `language:${manifest.bundle.meta.code}`;
  const rows: RwilLiteral[] = [
    { entity: language, attribute: "communicating.name", value: manifest.bundle.meta.name, witness: "manifest.bundle.meta.name" },
    { entity: language, attribute: "communicating.script", value: manifest.bundle.meta.script, witness: "manifest.bundle.meta.script" },
    { entity: language, attribute: "communicating.direction", value: manifest.bundle.meta.direction, witness: "manifest.bundle.meta.direction" },
    { entity: language, attribute: "communicating.wordOrder", value: manifest.bundle.wordOrder, witness: "manifest.bundle.wordOrder" },
  ];
  if (manifest.bundle.grammar !== undefined) {
    rows.push({
      entity: language,
      attribute: "communicating.grammarProfile",
      value: manifest.bundle.grammar,
      witness: "manifest.bundle.grammar",
    });
  }
  for (const axis of registerFiberAxes) {
    const values = manifest.bundle.registerFiber?.[axis] ?? [];
    if (values.length === 0) continue;
    rows.push({
      entity: language,
      attribute: `communicating.${axis}`,
      value: values,
      witness: `manifest.bundle.registerFiber.${axis}`,
    });
  }
  for (const [index, row] of (manifest.rwil ?? []).entries()) {
    rows.push({
      witness: `manifest.rwil.${index}`,
      ...row,
    });
  }
  return Object.freeze(rows);
}

export function lambekManifestReceipt(manifest: LanguageManifest): unknown {
  const categories = Object.freeze([
    ...new Set([
      "S",
      "NP",
      "N",
      "VP",
      ...(manifest.lambek?.categories ?? []),
    ]),
  ]);
  return evaluateRunTerm(lambek.laws, asJsonValue(Object.freeze({
    kind: "communicating.lambek-language-receipt",
    language: manifest.bundle.meta.code,
    categories,
    judgments: manifest.lambek?.judgments ?? [],
    wordOrder: manifest.bundle.grammar?.wordOrder ?? manifest.bundle.wordOrder,
  })));
}

export function soficManifestReceipt(manifest: LanguageManifest): unknown {
  const alphabet = manifest.sofic?.alphabet ?? ["C", "V"];
  const graph = manifest.sofic?.graph ?? [
    [false, true],
    [true, true],
  ];
  const factor = manifest.sofic?.factor ?? alphabet.map((_, index) => index);
  const sample = manifest.sofic?.sample ?? [0, 1, 0];
  return evaluateRunTerm(sofic.image, asJsonValue(Object.freeze({
    kind: "communicating.sofic-language-receipt",
    language: manifest.bundle.meta.code,
    alphabet,
    graph,
    factor,
    sample,
    note: manifest.sofic?.note ?? "finite phonotactic/morphotactic sofic reading",
  })));
}

export function chuManifestReceipt(manifest: LanguageManifest): unknown {
  const pts = manifest.chu?.pts ?? manifest.bundle.lexicon.pronouns;
  const sts = manifest.chu?.sts ?? ["speaker", "listener"];
  const matrix: readonly Record<string, unknown>[] = manifest.chu?.matrix ?? pts.flatMap((pt) =>
    sts.map((st) => ({ pt, st, charge: "absurd" })));
  const r = matrix.map((entry) => ({
    pt: String(entry["pt"] ?? ""),
    st: String(entry["st"] ?? ""),
    charge: String(entry["charge"] ?? entry["value"] ?? "absurd"),
  }));
  const space = asJsonValue(Object.freeze({
    pts,
    sts,
    r,
  }));
  return Object.freeze({
    kind: "communicating.chu-language-receipt" as const,
    language: manifest.bundle.meta.code,
    space,
    dualInvolution: evaluateRunTerm(chu.dualInvolution, space),
  });
}

export function discourseCoverManifestReceipt(manifest: LanguageManifest): unknown {
  const cover = manifest.discourseCover ?? {
    entities: Math.max(1, manifest.bundle.lexicon.pronouns.length),
    cells: Math.max(0, manifest.bundle.lexicon.conjunctions.length),
    components: 1,
  };
  return evaluateRunTerm(coordinationCohomology.receipt, asJsonValue(Object.freeze({
    kind: "communicating.discourse-cover-receipt",
    language: manifest.bundle.meta.code,
    cover,
  })));
}

export function languageManifestReceipts(manifest: LanguageManifest): LanguageManifestReceipt {
  return Object.freeze({
    kind: "communicating.language-manifest.receipts",
    language: manifest.bundle.meta.code,
    rwil: languageManifestRwIlRows(manifest),
    lambek: lambekManifestReceipt(manifest),
    sofic: soficManifestReceipt(manifest),
    chu: chuManifestReceipt(manifest),
    discourseCover: discourseCoverManifestReceipt(manifest),
  });
}
