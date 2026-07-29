/**
 * fingerprints - stable article provenance carriers.
 *
 * Sites own how they extract facts from local frontmatter and how they render a
 * visible fingerprint. The mill owns the stable article fact packet, canonical
 * serialization, digest, and artifact URLs.
 */
import { createHash } from "node:crypto";

import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/codecs";

export const ArticleFingerprintFactsSchema = { $id: "producing-content/content-mill/article-fingerprint-facts", title: "ArticleFingerprintFacts", additionalProperties: false, type: "object", required: ["kind", "slug", "url", "headline", "summary", "keywords", "tags", "references", "wordCount", "bodySha256"], properties: { kind: { const: "producing-content.article-fingerprint.facts" }, slug: { minLength: 1, type: "string" }, url: { minLength: 1, type: "string" }, headline: { minLength: 1, type: "string" }, summary: { type: "string" }, datePublished: { minLength: 1, type: "string" }, dateModified: { minLength: 1, type: "string" }, correctionState: { minLength: 1, type: "string" }, correctionCount: { minimum: 0, type: "integer" }, author: { minLength: 1, type: "string" }, section: { minLength: 1, type: "string" }, keywords: { type: "array", items: { minLength: 1, type: "string" } }, tags: { type: "array", items: { minLength: 1, type: "string" } }, references: { type: "array", items: { minLength: 1, type: "string" } }, license: { minLength: 1, type: "string" }, licenseUrl: { minLength: 1, type: "string" }, syndicationRights: { minLength: 1, type: "string" }, seoTerm: { minLength: 1, type: "string" }, wordCount: { minimum: 0, type: "integer" }, bodySha256: { minLength: 64, maxLength: 64, type: "string" } } } as const;

export const ArticleFingerprintEncodingSchema = { $id: "producing-content/content-mill/article-fingerprint-encoding", title: "ArticleFingerprintEncoding", additionalProperties: false, type: "object", required: ["serialization", "digest", "visible", "metadata"], properties: { serialization: { const: "producing-content.stable-json.v1" }, digest: { const: "sha256" }, visible: { minLength: 1, type: "string" }, metadata: { const: "none" } } } as const;

export const ArticleFingerprintSchema = { $id: "producing-content/content-mill/article-fingerprint", title: "ArticleFingerprint", additionalProperties: false, type: "object", required: ["kind", "facts", "serialization", "sha256", "encoding", "jsonUrl", "svgUrl"], properties: { kind: { const: "producing-content.article-fingerprint" }, facts: ArticleFingerprintFactsSchema, serialization: { minLength: 1, type: "string" }, sha256: { minLength: 64, maxLength: 64, type: "string" }, encoding: ArticleFingerprintEncodingSchema, jsonUrl: { minLength: 1, type: "string" }, svgUrl: { minLength: 1, type: "string" }, pngUrl: { minLength: 1, type: "string" } } } as const;

export type ArticleFingerprintFacts = FromSchema<typeof ArticleFingerprintFactsSchema>;
export type ArticleFingerprintEncoding = FromSchema<typeof ArticleFingerprintEncodingSchema>;
export type ArticleFingerprint = FromSchema<typeof ArticleFingerprintSchema>;

export const articleFingerprintFactsCarrier = carrierFrom(ArticleFingerprintFactsSchema);

export const articleFingerprintEncodingCarrier = carrierFrom(ArticleFingerprintEncodingSchema);

export const articleFingerprintCarrier = carrierFrom(ArticleFingerprintSchema);

export function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => stable(item));
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort().map((key) => [key, stable(record[key])]));
  }
  return value;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(stable(value));
}

export function sha256Digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function articleFingerprintFacts(input: Omit<ArticleFingerprintFacts, "kind" | "keywords" | "tags" | "references"> & Readonly<{
  keywords: readonly string[];
  tags: readonly string[];
  references: readonly string[];
}>): ArticleFingerprintFacts {
  return articleFingerprintFactsCarrier.assert({
    kind: "producing-content.article-fingerprint.facts" as const,
    ...input,
    keywords: [...input.keywords],
    tags: [...input.tags],
    references: [...input.references],
  }, "article fingerprint facts");
}

export function articleFingerprintEncoding(input: Partial<ArticleFingerprintEncoding> = {}): ArticleFingerprintEncoding {
  return articleFingerprintEncodingCarrier.assert({
    serialization: "producing-content.stable-json.v1" as const,
    digest: "sha256" as const,
    visible: input.visible ?? "producing-content.visible-fingerprint.v1",
    metadata: "none" as const,
  }, "article fingerprint encoding");
}

export function articleFingerprint(input: Readonly<{
  facts: ArticleFingerprintFacts;
  jsonUrl: string;
  svgUrl: string;
  pngUrl?: string;
  visibleEncoding?: string;
}>): ArticleFingerprint {
  const facts = articleFingerprintFacts(input.facts);
  const serialization = stableJson(facts);
  return articleFingerprintCarrier.assert({
    kind: "producing-content.article-fingerprint" as const,
    facts,
    serialization,
    sha256: sha256Digest(serialization),
    encoding: articleFingerprintEncoding(input.visibleEncoding === undefined ? {} : { visible: input.visibleEncoding }),
    jsonUrl: input.jsonUrl,
    svgUrl: input.svgUrl,
    ...(input.pngUrl === undefined ? {} : { pngUrl: input.pngUrl }),
  }, "article fingerprint");
}

export function articleFingerprintJson(input: ArticleFingerprint): string {
  return `${stableJson(articleFingerprintCarrier.assert(input))}\n`;
}

export function articleFingerprintFactsTerm(input: ArticleFingerprintFacts): Tm {
  return carrierToTerm(jsonResource(articleFingerprintFactsCarrier.assert(input), "article fingerprint facts"));
}

export function articleFingerprintTerm(input: ArticleFingerprint): Tm {
  return carrierToTerm(jsonResource(articleFingerprintCarrier.assert(input), "article fingerprint"));
}
