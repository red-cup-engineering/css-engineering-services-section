/**
 * syndication - machine-readable publication surface carriers.
 *
 * A site owns its route topology. The mill owns the distribution packet that
 * names which feed, sitemap, record, audit, and article surfaces are exposed.
 */
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/codecs";

export const SyndicationSurfaceKindSchema = { anyOf: [{ const: "feed" }, { const: "sitemap" }, { const: "record" }, { const: "audit" }, { const: "article" }] } as const;

export const SyndicationSurfaceSchema = { $id: "producing-content/content-mill/syndication-surface", title: "SyndicationSurface", additionalProperties: false, type: "object", required: ["kind", "href", "mediaType"], properties: { kind: SyndicationSurfaceKindSchema, href: { minLength: 1, type: "string" }, mediaType: { minLength: 1, type: "string" } } } as const;

export const SyndicationReadingSchema = { $id: "producing-content/content-mill/syndication-reading", title: "SyndicationReading", additionalProperties: false, type: "object", required: ["kind", "surfaces"], properties: { kind: { const: "producing-content.syndication-reading" }, surfaces: { type: "array", items: SyndicationSurfaceSchema } } } as const;

export type SyndicationSurfaceKind = FromSchema<typeof SyndicationSurfaceKindSchema>;
export type SyndicationSurface = FromSchema<typeof SyndicationSurfaceSchema>;
export type SyndicationReading = FromSchema<typeof SyndicationReadingSchema>;

export const syndicationSurfaceCarrier = carrierFrom(SyndicationSurfaceSchema);

export const syndicationReadingCarrier = carrierFrom(SyndicationReadingSchema);

export function syndicationSurface(input: SyndicationSurface): SyndicationSurface {
  return syndicationSurfaceCarrier.assert(input, "syndication surface");
}

export function syndicationReading(input: Readonly<{
  surfaces: readonly SyndicationSurface[];
}>): SyndicationReading {
  return syndicationReadingCarrier.assert({
    kind: "producing-content.syndication-reading" as const,
    surfaces: input.surfaces.map((surface) => syndicationSurface(surface)),
  }, "syndication reading");
}

export function publicationSyndicationSurfaces(input: Readonly<{
  baseUrl: string;
  itemPath: string;
  articleSlugs?: readonly string[];
  recordPaths?: readonly string[];
  auditPaths?: readonly string[];
}>): SyndicationReading {
  const base = input.baseUrl.replace(/\/$/, "");
  const itemPath = input.itemPath.replace(/^\/+|\/+$/g, "");
  const recordPaths = input.recordPaths ?? [
    "ninjs.json",
    "topics.json",
    "tags.json",
    "archive.json",
    "sources.json",
    "desks.json",
    "bibliography.json",
    "coverage.json",
  ];
  const auditPaths = input.auditPaths ?? ["newswire-audit.json"];
  const recordMediaType = (path: string): string =>
    path.endsWith(".json") && path.includes("coverage")
      ? "application/ld+json"
      : "application/json";

  return syndicationReading({
    surfaces: [
      syndicationSurface({ kind: "feed", href: `${base}/feed.xml`, mediaType: "application/rss+xml" }),
      syndicationSurface({ kind: "feed", href: `${base}/feed.atom`, mediaType: "application/atom+xml" }),
      syndicationSurface({ kind: "feed", href: `${base}/feed.json`, mediaType: "application/feed+json" }),
      syndicationSurface({ kind: "sitemap", href: `${base}/sitemap.xml`, mediaType: "application/xml" }),
      syndicationSurface({ kind: "sitemap", href: `${base}/news-sitemap.xml`, mediaType: "application/xml" }),
      ...recordPaths.map((path) => syndicationSurface({
        kind: "record",
        href: `${base}/${path.replace(/^\/+/, "")}`,
        mediaType: recordMediaType(path),
      })),
      ...auditPaths.map((path) => syndicationSurface({
        kind: "audit",
        href: `${base}/${path.replace(/^\/+/, "")}`,
        mediaType: "application/json",
      })),
      ...(input.articleSlugs ?? []).map((slug) => syndicationSurface({
        kind: "article",
        href: `${base}/${itemPath}/${slug}`,
        mediaType: "text/html",
      })),
    ],
  });
}

export function syndicationSurfaceTerm(input: SyndicationSurface): Tm {
  return carrierToTerm(jsonResource(syndicationSurfaceCarrier.assert(input), "syndication surface"));
}

export function syndicationReadingTerm(input: SyndicationReading): Tm {
  return carrierToTerm(jsonResource(syndicationReadingCarrier.assert(input), "syndication reading"));
}
