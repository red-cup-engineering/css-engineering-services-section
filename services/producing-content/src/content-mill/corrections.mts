/**
 * corrections - publication correction register carriers.
 *
 * A site owns how it records corrections in local metadata. The mill owns the
 * public accountability packet: correction records, register readings, coverage
 * readings, and validation findings.
 */
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/codecs";
import type { CorrectionState } from "../topology/accountable-attention.mjs";

export const CorrectionKindSchema = { anyOf: [{ const: "correction" }, { const: "clarification" }, { const: "update" }, { const: "retraction" }] } as const;

export const CorrectionRecordSchema = { $id: "producing-content/content-mill/correction-record", title: "CorrectionRecord", additionalProperties: false, type: "object", required: ["id", "kind", "articleSlug", "articlePath", "articleHeadline", "correctedAt", "summary", "affectedSurfaces"], properties: { id: { minLength: 1, type: "string" }, kind: CorrectionKindSchema, articleSlug: { minLength: 1, type: "string" }, articlePath: { minLength: 1, type: "string" }, articleHeadline: { minLength: 1, type: "string" }, correctedAt: { minLength: 1, type: "string" }, summary: { minLength: 1, type: "string" }, details: { minLength: 1, type: "string" }, affectedSurfaces: { type: "array", items: { minLength: 1, type: "string" } } } } as const;

export const CorrectionRegisterReadingSchema = { $id: "producing-content/content-mill/correction-register", title: "CorrectionRegisterReading", additionalProperties: false, type: "object", required: ["kind", "correctionCount", "articleCount", "policy", "corrections", "constraints"], properties: { kind: { const: "producing-content.correction-register" }, correctionCount: { minimum: 0, type: "number" }, articleCount: { minimum: 0, type: "number" }, policy: { type: "array", items: { type: "string" } }, corrections: { type: "array", items: CorrectionRecordSchema }, constraints: { type: "array", items: { type: "string" } } } } as const;

export const CorrectionValidationFindingSchema = { $id: "producing-content/content-mill/correction-validation-finding", title: "CorrectionValidationFinding", additionalProperties: false, type: "object", required: ["code", "message"], properties: { code: { minLength: 1, type: "string" }, message: { minLength: 1, type: "string" } } } as const;

export const CorrectionCoverageReadingSchema = { $id: "producing-content/content-mill/correction-coverage", title: "CorrectionCoverageReading", additionalProperties: false, type: "object", required: ["correctionCount", "explicitSurfaceCount", "implicitSurfaceCount", "incompleteSurfaceCount", "missingSurfaces", "coverage"], properties: { correctionCount: { minimum: 0, type: "number" }, explicitSurfaceCount: { minimum: 0, type: "number" }, implicitSurfaceCount: { minimum: 0, type: "number" }, incompleteSurfaceCount: { minimum: 0, type: "number" }, missingSurfaces: { type: "array", items: { type: "string" } }, coverage: { minimum: 0, maximum: 1, type: "number" } } } as const;

export type CorrectionKind = FromSchema<typeof CorrectionKindSchema>;
export type CorrectionRecord = FromSchema<typeof CorrectionRecordSchema>;
export type CorrectionRegisterReading = FromSchema<typeof CorrectionRegisterReadingSchema>;
export type CorrectionValidationFinding = FromSchema<typeof CorrectionValidationFindingSchema>;
export type CorrectionCoverageReading = FromSchema<typeof CorrectionCoverageReadingSchema>;

export const DEFAULT_CORRECTION_AFFECTED_SURFACES = Object.freeze([
  "article",
  "feeds",
  "sitemaps",
  "json-ld",
  "social-card",
  "syndication",
]);

export const CORRECTION_POLICY = Object.freeze([
  "Corrections, clarifications, material updates, and retractions belong to the article record and are folded into the public correction register.",
  "A correction must state what changed, when it was corrected, and which publication surfaces require propagation.",
  "Correction propagation should include body copy, headlines when needed, article metadata, social cards, feeds, sitemaps, JSON-LD, and syndication packets.",
]);

export const correctionRecordCarrier = carrierFrom(CorrectionRecordSchema);

export const correctionRegisterReadingCarrier = carrierFrom(CorrectionRegisterReadingSchema);

export const correctionValidationFindingCarrier = carrierFrom(CorrectionValidationFindingSchema);

export const correctionCoverageReadingCarrier = carrierFrom(CorrectionCoverageReadingSchema);

export function correctionRecord(input: Omit<CorrectionRecord, "affectedSurfaces"> & Readonly<{
  affectedSurfaces: readonly string[];
}>): CorrectionRecord {
  return correctionRecordCarrier.assert({
    ...input,
    affectedSurfaces: [...input.affectedSurfaces],
  }, "correction record");
}

export function correctionRegisterReading(input: Readonly<{
  corrections: readonly CorrectionRecord[];
  policy?: readonly string[];
  constraints?: readonly string[];
}>): CorrectionRegisterReading {
  const corrections = [...input.corrections];
  return correctionRegisterReadingCarrier.assert({
    kind: "producing-content.correction-register" as const,
    correctionCount: corrections.length,
    articleCount: new Set(corrections.map((correction) => correction.articleSlug)).size,
    policy: [...(input.policy ?? CORRECTION_POLICY)],
    corrections,
    constraints: [...(input.constraints ?? [
      "Generated from public article metadata only.",
      "The register records publication accountability, not reader behavior.",
    ])],
  }, "correction register reading");
}

export function correctionValidationFinding(input: CorrectionValidationFinding): CorrectionValidationFinding {
  return correctionValidationFindingCarrier.assert(input, "correction validation finding");
}

export function correctionCoverageReading(input: Omit<CorrectionCoverageReading, "missingSurfaces"> & Readonly<{
  missingSurfaces: readonly string[];
}>): CorrectionCoverageReading {
  return correctionCoverageReadingCarrier.assert({
    ...input,
    missingSurfaces: [...input.missingSurfaces],
  }, "correction coverage reading");
}

export type CorrectionMetadataOptions = Readonly<{
  /** The frontmatter namespace that may also carry correction records. Default: "koios". */
  namespace?: string;
  /** The propagation surfaces required when an entry names surfaces explicitly. */
  defaultAffectedSurfaces?: readonly string[];
}>;

export type CorrectionMetadataArticle = Readonly<{
  frontMatter: Readonly<Record<string, unknown>>;
  slug: string;
  path: string;
  headline: string;
  namespace?: string;
  defaultAffectedSurfaces?: readonly string[];
}>;

function maybeString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

function strings(value: unknown): readonly string[] {
  if (value === undefined || value === null || value === "") return Object.freeze([]);
  if (Array.isArray(value)) return Object.freeze(value.flatMap((item) => strings(item)));
  return Object.freeze([String(value)]);
}

function record(value: unknown): Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : Object.freeze({});
}

function correctionMetadataNamespace(frontMatter: Readonly<Record<string, unknown>>, namespace: string | undefined): Readonly<Record<string, unknown>> {
  return namespace === undefined ? Object.freeze({}) : record(frontMatter[namespace]);
}

function correctionMetadataDeclared(frontMatter: Readonly<Record<string, unknown>>, namespace: string | undefined): unknown {
  return "corrections" in frontMatter ? frontMatter["corrections"] : correctionMetadataNamespace(frontMatter, namespace)["corrections"];
}

function correctionMetadataArray(frontMatter: Readonly<Record<string, unknown>>, namespace: string | undefined): readonly unknown[] {
  const direct = frontMatter["corrections"];
  const namespaced = correctionMetadataNamespace(frontMatter, namespace)["corrections"];
  return Array.isArray(direct) ? direct : Array.isArray(namespaced) ? namespaced : [];
}

export function correctionKindFromValue(value: unknown): CorrectionKind | undefined {
  return value === "correction" || value === "clarification" || value === "update" || value === "retraction"
    ? value
    : undefined;
}

function correctionStateFromValue(value: unknown): CorrectionState | undefined {
  return value === "current" || value === "clarified" || value === "corrected" || value === "retracted"
    ? value
    : undefined;
}

export function correctionMetadataEntries(
  frontMatter: Readonly<Record<string, unknown>>,
  options: CorrectionMetadataOptions = {},
): readonly Readonly<Record<string, unknown>>[] {
  const namespace = options.namespace ?? "koios";
  return Object.freeze(correctionMetadataArray(frontMatter, namespace).flatMap((entry) =>
    entry !== null && typeof entry === "object" && !Array.isArray(entry)
      ? [entry as Readonly<Record<string, unknown>>]
      : []));
}

export function correctionStateFromMetadata(
  frontMatter: Readonly<Record<string, unknown>>,
  options: CorrectionMetadataOptions = {},
): CorrectionState {
  const explicit = correctionStateFromValue(frontMatter["correction_state"] ?? frontMatter["correctionState"]);
  if (explicit !== undefined) return explicit;
  const entries = correctionMetadataEntries(frontMatter, options);
  if (entries.length === 0) return "current";
  const kinds = entries.map((entry) => correctionKindFromValue(entry["kind"] ?? entry["type"]));
  if (kinds.includes("retraction")) return "retracted";
  return kinds.length > 0 && kinds.every((kind) => kind === "clarification") ? "clarified" : "corrected";
}

export function malformedCorrectionMetadataEntryCount(
  frontMatter: Readonly<Record<string, unknown>>,
  options: CorrectionMetadataOptions = {},
): number {
  const namespace = options.namespace ?? "koios";
  return correctionMetadataArray(frontMatter, namespace)
    .filter((entry) => entry === null || typeof entry !== "object" || Array.isArray(entry))
    .length;
}

export function correctionRecordsFromMetadata(input: CorrectionMetadataArticle): readonly CorrectionRecord[] {
  const defaultAffectedSurfaces = input.defaultAffectedSurfaces ?? DEFAULT_CORRECTION_AFFECTED_SURFACES;
  return Object.freeze(correctionMetadataEntries(input.frontMatter, input).flatMap((entry, index) => {
    const correctedAt = maybeString(entry["corrected_at"] ?? entry["correctedAt"] ?? entry["date"]);
    const summary = maybeString(entry["summary"] ?? entry["note"] ?? entry["title"]);
    if (correctedAt === undefined || summary === undefined) return [];
    const affectedSurfaces = strings(entry["affected_surfaces"] ?? entry["affectedSurfaces"]);
    const details = maybeString(entry["details"] ?? entry["body"]);
    return [correctionRecord({
      id: maybeString(entry["id"]) ?? `${input.slug}-correction-${index + 1}`,
      kind: correctionKindFromValue(entry["kind"] ?? entry["type"]) ?? "correction",
      articleSlug: input.slug,
      articlePath: input.path,
      articleHeadline: input.headline,
      correctedAt,
      summary,
      ...(details === undefined ? {} : { details }),
      affectedSurfaces: affectedSurfaces.length === 0 ? defaultAffectedSurfaces : affectedSurfaces,
    })];
  }));
}

export function correctionCoverageFromMetadata(
  frontMatter: Readonly<Record<string, unknown>>,
  options: CorrectionMetadataOptions = {},
): CorrectionCoverageReading {
  const defaultAffectedSurfaces = options.defaultAffectedSurfaces ?? DEFAULT_CORRECTION_AFFECTED_SURFACES;
  const missing = new Set<string>();
  let correctionCount = 0;
  let explicitSurfaceCount = 0;
  let implicitSurfaceCount = 0;
  let incompleteSurfaceCount = 0;
  for (const entry of correctionMetadataEntries(frontMatter, options)) {
    const correctedAt = maybeString(entry["corrected_at"] ?? entry["correctedAt"] ?? entry["date"]);
    const summary = maybeString(entry["summary"] ?? entry["note"] ?? entry["title"]);
    if (correctedAt === undefined || summary === undefined) continue;
    correctionCount += 1;
    const affectedSurfaces = strings(entry["affected_surfaces"] ?? entry["affectedSurfaces"]);
    if (affectedSurfaces.length === 0) {
      implicitSurfaceCount += 1;
      continue;
    }
    explicitSurfaceCount += 1;
    const normalized = new Set(affectedSurfaces.map((surface) => surface.toLowerCase()));
    const missingForEntry = defaultAffectedSurfaces.filter((surface) => !normalized.has(surface));
    if (missingForEntry.length > 0) incompleteSurfaceCount += 1;
    for (const surface of missingForEntry) missing.add(surface);
  }
  return correctionCoverageReading({
    correctionCount,
    explicitSurfaceCount,
    implicitSurfaceCount,
    incompleteSurfaceCount,
    missingSurfaces: Object.freeze([...missing].sort()),
    coverage: correctionCount === 0 ? 1 : Math.round(((correctionCount - incompleteSurfaceCount) / correctionCount) * 100) / 100,
  });
}

export function correctionValidationFindingsFromMetadata(
  frontMatter: Readonly<Record<string, unknown>>,
  options: CorrectionMetadataOptions = {},
): readonly CorrectionValidationFinding[] {
  const namespace = options.namespace ?? "koios";
  const findings: CorrectionValidationFinding[] = [];
  const hasDirect = "corrections" in frontMatter;
  const hasNamespaced = "corrections" in correctionMetadataNamespace(frontMatter, namespace);
  if (hasDirect && hasNamespaced) {
    findings.push(correctionValidationFinding({
      code: "duplicate-correction-fields",
      message: `Use one corrections field: top-level corrections or ${namespace}.corrections, not both.`,
    }));
  }
  const declared = correctionMetadataDeclared(frontMatter, namespace);
  if (declared !== undefined && !Array.isArray(declared)) {
    findings.push(correctionValidationFinding({
      code: "invalid-corrections-field",
      message: "corrections must be an array of correction records.",
    }));
    return Object.freeze(findings);
  }
  if (malformedCorrectionMetadataEntryCount(frontMatter, options) > 0) {
    findings.push(correctionValidationFinding({
      code: "invalid-correction-record",
      message: "Each correction record must be an object.",
    }));
  }
  for (const [index, entry] of correctionMetadataEntries(frontMatter, options).entries()) {
    if (correctionKindFromValue(entry["kind"] ?? entry["type"]) === undefined && (entry["kind"] !== undefined || entry["type"] !== undefined)) {
      findings.push(correctionValidationFinding({
        code: "invalid-correction-kind",
        message: `corrections[${index}] kind must be correction, clarification, update, or retraction.`,
      }));
    }
    if (maybeString(entry["corrected_at"] ?? entry["correctedAt"] ?? entry["date"]) === undefined) {
      findings.push(correctionValidationFinding({
        code: "missing-correction-date",
        message: `corrections[${index}] needs corrected_at, correctedAt, or date.`,
      }));
    }
    if (maybeString(entry["summary"] ?? entry["note"] ?? entry["title"]) === undefined) {
      findings.push(correctionValidationFinding({
        code: "missing-correction-summary",
        message: `corrections[${index}] needs summary, note, or title.`,
      }));
    }
  }
  return Object.freeze(findings);
}

export function correctionRecordTerm(input: CorrectionRecord): Tm {
  return carrierToTerm(jsonResource(correctionRecordCarrier.assert(input), "correction record"));
}

export function correctionRegisterReadingTerm(input: CorrectionRegisterReading): Tm {
  return carrierToTerm(jsonResource(correctionRegisterReadingCarrier.assert(input), "correction register reading"));
}

export function correctionCoverageReadingTerm(input: CorrectionCoverageReading): Tm {
  return carrierToTerm(jsonResource(correctionCoverageReadingCarrier.assert(input), "correction coverage reading"));
}

export function correctionValidationFindingTerm(input: CorrectionValidationFinding): Tm {
  return carrierToTerm(jsonResource(correctionValidationFindingCarrier.assert(input), "correction validation finding"));
}
