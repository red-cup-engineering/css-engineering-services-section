import { existsSync, mkdirSync, readdirSync, rmSync, statSync, watch, writeFileSync, type FSWatcher } from "node:fs";
import { dirname, join, relative } from "node:path";
import { markdownToHtml } from "@red-cup-engineering/producing-content/markdown";
import { readJsonBody, readTextBody, start as startWebServer, type App, type Context, type Repr, type Resource, type StartResult } from "@red-cup-engineering/http-server";
import type { FeedChannel, FeedItem, SitemapUrl } from "@red-cup-engineering/producing-content/codecs/feed";
import { atom, escapeHtmlText, jsonFeed, robots, rss2, sitemap } from "@red-cup-engineering/producing-content/codecs/feed";
import { hEntry, hFeed } from "../microformats/index.mjs";
import { securityTxt, type SecurityTxt } from "../page-metadata/index.mjs";
import type { Assertion, FiniteAlgebra } from "../semantic-reader/index.mjs";
import { finiteAlgebra, readMarkdownFile } from "../semantic-reader/index.mjs";
import { algebraToPage, projectArticle } from "../semantic-hypertext/index.mjs";
import { minimal, render, type Theme, type ThemeContext } from "@red-cup-engineering/organizing-with-the-web/theming";
import { receiveMention, type ReceiveResult } from "@red-cup-engineering/organizing-with-the-web/webmention";

export type SemanticReader = Readonly<{
  listSubjects(root: string): readonly string[];
  traceOf(root: string, subject: string): readonly Assertion[];
  settle(root: string, subject: string): FiniteAlgebra;
  claim?: (root: string, subject: string, claims: Record<string, unknown>, options?: { citation?: unknown }) => unknown;
}>;

export type SiteConfig = Readonly<{
  root: string;
  baseUrl: string;
  title: string;
  tagline?: string;
  language?: string;
  publishedOnly?: boolean;
  theme?: Theme;
  themeContext?: ThemeContext;
  webmentionPath?: string | null;
  pingbackUrl?: string | null;
}>;

export type TripleRecord = Readonly<{
  subject: string;
  predicate: string;
  object: unknown;
  state: "potential" | "active" | "stable";
  witness?: unknown;
  claimedBy?: unknown;
  contraryClaimedBy?: unknown;
}>;

export type QueryPattern = Readonly<{ s?: string; p?: string; o?: string; state?: TripleRecord["state"]; witness?: string }>;

export type JsonLdProjectionOptions = Readonly<{
  publisher?: JsonLdRecord;
  titleIndex?: Readonly<Record<string, string>>;
}>;

export type JsonLdRecord = Record<string, unknown>;

export type SiteOutputFormat = "html" | "ttl" | "jsonld" | "jsonfeed" | "atom" | "rss" | "sitemap" | "robots" | "manifest";
export type SiteCellState = "potential" | "active" | "stable" | "absurd";

export type SiteBuildCell = Readonly<{
  subject: string;
  format: SiteOutputFormat;
  path: string;
  state: SiteCellState;
  reason: string;
  contradictions?: readonly unknown[];
  bytes?: number;
}>;

export type SiteArtifact = Readonly<{
  path: string;
  format: SiteOutputFormat;
  mediaType: string;
  body: string;
}>;

export type SiteBuildReport = Readonly<{
  kind: "web-semantic-site.finite-build";
  generatedAt: string;
  config: Readonly<{ baseUrl: string; title: string; language: string }>;
  cells: readonly SiteBuildCell[];
  artifacts: readonly SiteArtifact[];
  assertions: readonly Assertion[];
  subjects: readonly string[];
  counts: Readonly<Record<SiteCellState, number>>;
}>;

export type BuildSiteOptions = Readonly<{
  now?: () => string;
  includeStableAssertions?: boolean;
}>;

export type BuildAppOptions = Readonly<{
  securityTxtPath?: string;
  security?: SecurityTxt;
}>;

export type SiteBuildDelta = Readonly<{
  changed: readonly SiteBuildCell[];
  removed: readonly SiteBuildCell[];
}>;

export type MarkdownReaderOptions = Readonly<{
  extension?: string;
  citationPrefix?: string;
  citationFor?: (root: string, path: string) => string;
  functional?: Iterable<string>;
}>;

export type ContentWatchOptions = Readonly<{
  debounceMs?: number;
  onChange?: (filename: string, subjects: readonly string[]) => void;
  onError?: (error: unknown) => void;
}>;

export type StartMarkdownSiteOptions = Readonly<{
  port?: number;
  watch?: boolean;
  readerOptions?: MarkdownReaderOptions;
  watchOptions?: ContentWatchOptions;
}>;

export type StartedSemanticSite = StartResult & Readonly<{
  root: string;
  reader: SemanticReader;
  watcher: FSWatcher | null;
}>;

function trimBase(baseUrl: string): string {
  const url = String(baseUrl ?? "").replace(/\/+$/, "");
  new URL(url);
  return url;
}

function scriptJson(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/</g, "\\u003c");
}


export function subjectUrl(baseUrl: string, subject: string): string {
  return `${trimBase(baseUrl)}/${subject.split("/").map(encodeURIComponent).join("/")}`;
}

export function predicateUrl(baseUrl: string, predicate: string): string {
  return `${trimBase(baseUrl)}/vocab/predicate/${encodeURIComponent(predicate)}`;
}

export function isPublished(algebra: FiniteAlgebra): boolean {
  const status = algebra.potential.find((cell) => cell.predicate === "status")?.object;
  return status === undefined || status === "published";
}

function semanticTheme(config: SiteConfig, extraHead: string): Theme {
  const base = config.theme ?? minimal;
  return {
    ...base,
    head(ctx) {
      return [base.head(ctx), extraHead].filter(Boolean).join("\n    ");
    },
  };
}

export function semanticHead(config: SiteConfig, options: { canonical?: string; jsonLd?: unknown; subject?: string } = {}): string {
  const base = trimBase(config.baseUrl);
  const webmentionPath = config.webmentionPath === undefined ? "/webmention" : config.webmentionPath;
  const webmentionUrl = webmentionPath === null ? null : `${base}${webmentionPath.startsWith("/") ? "" : "/"}${webmentionPath}`;
  const alternates = [
    { rel: "alternate", type: "application/feed+json", href: `${base}/feed.json`, title: `${config.title} JSON Feed` },
    { rel: "alternate", type: "application/atom+xml", href: `${base}/feed.atom`, title: `${config.title} Atom` },
    { rel: "alternate", type: "application/rss+xml", href: `${base}/feed.xml`, title: `${config.title} RSS` },
    ...(options.subject ? [
      { rel: "alternate", type: "text/turtle", href: `${subjectUrl(config.baseUrl, options.subject)}.ttl`, title: "Turtle" },
      { rel: "alternate", type: "application/ld+json", href: `${subjectUrl(config.baseUrl, options.subject)}.jsonld`, title: "JSON-LD" },
    ] : []),
  ];
  return [
    webmentionUrl === null ? "" : `<link rel="webmention" href="${escapeHtmlText(webmentionUrl)}" />`,
    config.pingbackUrl === null ? "" : `<link rel="pingback" href="${escapeHtmlText(config.pingbackUrl ?? `${base}/pingback`)}" />`,
    ...alternates.map((link) => `<link rel="${escapeHtmlText(link.rel)}" type="${escapeHtmlText(link.type)}" href="${escapeHtmlText(link.href)}" title="${escapeHtmlText(link.title)}" />`),
    options.jsonLd ? `<script type="application/ld+json">${scriptJson(options.jsonLd)}</script>` : "",
  ].filter(Boolean).join("\n    ");
}

export function subjects(reader: SemanticReader, config: SiteConfig): readonly string[] {
  return Object.freeze(reader.listSubjects(config.root).filter((subject) => !config.publishedOnly || isPublished(reader.settle(config.root, subject))).sort());
}

export function renderWebmentions(algebra: FiniteAlgebra): string {
  const mentions = algebra.potential.filter((cell) => cell.predicate === "mention").map((cell) => cell.object);
  if (!mentions.length) return "";
  const items = mentions.map((mention) => {
    const record = mention && typeof mention === "object" && !Array.isArray(mention) ? mention as Record<string, unknown> : { url: mention };
    const url = String(record["url"] ?? record["source"] ?? mention ?? "");
    const author = record["author"] && typeof record["author"] === "object" ? record["author"] as Record<string, unknown> : {};
    const authorName = String(author["name"] ?? record["author"] ?? url);
    const authorUrl = String(author["url"] ?? url);
    const published = record["published"] ? String(record["published"]) : "";
    const text = cleanText(record["text"] ?? record["content"], 500);
    return `<li class="h-cite">`
      + (authorName ? `<a class="p-author h-card" href="${escapeHtmlText(authorUrl)}">${escapeHtmlText(authorName)}</a>` : "")
      + (published ? `<time class="dt-published" datetime="${escapeHtmlText(published)}">${escapeHtmlText(published)}</time>` : "")
      + (text ? `<div class="p-content">${escapeHtmlText(text)}</div>` : "")
      + (url ? `<a class="u-url" href="${escapeHtmlText(url)}">link</a>` : "")
      + `</li>`;
  }).join("");
  return `<section class="webmentions"><h2>Webmentions</h2><ul>${items}</ul></section>`;
}

function renderSemanticContent(algebra: FiniteAlgebra): string {
  const bodyText = String(algebra.potential.find((cell) => cell.predicate === "body")?.object ?? "");
  // The packet projects short factual claims legibly (title, type, status);
  // "body" carries the whole markdown source, already rendered below, so it
  // is excluded here to avoid printing the raw source twice on the page.
  const packetAlgebra: FiniteAlgebra = { ...algebra, potential: algebra.potential.filter((cell) => cell.predicate !== "body") };
  return [
    projectArticle(algebraToPage(packetAlgebra), "public"),
    bodyText ? markdownToHtml(bodyText) : "",
    renderWebmentions(algebra),
  ].filter(Boolean).join("");
}

export function renderSubject(algebra: FiniteAlgebra, config: SiteConfig, nonce?: string): string {
  const entry = hEntry({
    name: String(algebra.potential.find((cell) => cell.predicate === "title" || cell.predicate === "name")?.object ?? algebra.subject),
    url: subjectUrl(config.baseUrl, algebra.subject),
    content: renderSemanticContent(algebra),
    ...(algebra.potential.find((cell) => cell.predicate === "summary")?.object ? { summary: String(algebra.potential.find((cell) => cell.predicate === "summary")!.object) } : {}),
  });
  return render(semanticTheme(config, semanticHead(config, { subject: algebra.subject, jsonLd: toJsonLd(algebra, config) })), entry, {
    title: String(algebra.potential.find((cell) => cell.predicate === "title" || cell.predicate === "name")?.object ?? algebra.subject),
    siteName: config.title,
    description: config.tagline ?? "",
    canonical: subjectUrl(config.baseUrl, algebra.subject),
    lang: config.language ?? "en",
    ...config.themeContext,
    ...(nonce ? { nonce } : {}),
  });
}

export function siteJsonLd(reader: SemanticReader, config: SiteConfig): Record<string, unknown> {
  const base = trimBase(config.baseUrl);
  return {
    "@context": "https://schema.org",
    "@type": ["WebSite", "CollectionPage"],
    "@id": `${base}/#site`,
    name: config.title,
    url: `${base}/`,
    ...(config.tagline ? { description: config.tagline } : {}),
    inLanguage: config.language ?? "en",
    mainEntity: subjects(reader, config).map((subject) => ({
      "@type": "CreativeWork",
      "@id": subjectUrl(config.baseUrl, subject),
      url: subjectUrl(config.baseUrl, subject),
      name: String(firstClaim(reader.settle(config.root, subject), "title", "name") ?? subject),
    })),
  };
}

export function renderIndex(reader: SemanticReader, config: SiteConfig, nonce?: string): string {
  const canonical = `${trimBase(config.baseUrl)}/`;
  const baseContext = {
    title: config.title,
    siteName: config.title,
    description: config.tagline ?? "",
    canonical,
    lang: config.language ?? "en",
    ...config.themeContext,
    ...(nonce ? { nonce } : {}),
  };
  if (subjects(reader, config).includes("home")) {
    const algebra = reader.settle(config.root, "home");
    return render(semanticTheme(config, semanticHead(config, { jsonLd: siteJsonLd(reader, config) })), renderSemanticContent(algebra), baseContext);
  }
  const entries = subjects(reader, config).map((subject) => {
    const algebra = reader.settle(config.root, subject);
    const summary = algebra.potential.find((cell) => cell.predicate === "summary")?.object;
    return {
      id: subjectUrl(config.baseUrl, subject),
      url: subjectUrl(config.baseUrl, subject),
      title: String(algebra.potential.find((cell) => cell.predicate === "title" || cell.predicate === "name")?.object ?? subject),
      ...(typeof summary === "string" ? { summary } : {}),
    };
  });
  return render(semanticTheme(config, semanticHead(config, { jsonLd: siteJsonLd(reader, config) })), hFeed({ title: config.title, url: config.baseUrl, entries }), baseContext);
}

function literal(value: unknown): string {
  return `"${String(value ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function firstClaim(algebra: FiniteAlgebra, ...predicates: string[]): unknown {
  for (const predicate of predicates) {
    const cell = algebra.potential.find((candidate) => candidate.predicate === predicate);
    if (cell) return cell.object;
  }
  return undefined;
}

function claimValues(algebra: FiniteAlgebra, ...predicates: string[]): unknown[] {
  return algebra.potential.filter((cell) => predicates.includes(cell.predicate)).flatMap((cell) => Array.isArray(cell.object) ? cell.object : [cell.object]);
}

function cleanText(value: unknown, limit = 240): string | undefined {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  return text.length > limit ? `${text.slice(0, Math.max(0, limit - 1)).trimEnd()}...` : text;
}

function slugUrl(config: SiteConfig, value: unknown, titleIndex?: Readonly<Record<string, string>>): string {
  const text = String(value ?? "").trim();
  if (!text) return trimBase(config.baseUrl);
  try {
    const url = new URL(text);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch { /* not an absolute URL */ }
  const indexed = titleIndex?.[text.toLowerCase()];
  if (indexed) return indexed.startsWith("http://") || indexed.startsWith("https://") ? indexed : `${trimBase(config.baseUrl)}${indexed.startsWith("/") ? "" : "/"}${indexed}`;
  return subjectUrl(config.baseUrl, text);
}

function valueList(value: unknown): unknown[] {
  if (value === undefined || value === null || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

function people(value: unknown, config: SiteConfig, titleIndex?: Readonly<Record<string, string>>): JsonLdRecord[] {
  return valueList(value).map((entry) => {
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const record = entry as Record<string, unknown>;
      return {
        "@type": "Person",
        name: String(record["name"] ?? record["title"] ?? record["@id"] ?? "unknown"),
        ...(record["url"] ? { url: slugUrl(config, record["url"], titleIndex) } : {}),
        ...(record["sameAs"] ? { sameAs: record["sameAs"] } : {}),
      };
    }
    const name = String(entry);
    return { "@type": "Person", name, url: slugUrl(config, name, titleIndex) };
  });
}

export function schemaTypeFor(value: unknown): string | readonly string[] {
  const type = String(value ?? "").toLowerCase();
  if (type === "term" || type === "definition" || type === "concept") return Object.freeze(["DefinedTerm", "skos:Concept"]);
  if (type === "babble") return "BlogPosting";
  if (type === "letter" || type === "text") return "Article";
  if (type === "lesson") return "LearningResource";
  if (type === "skill") return "HowTo";
  if (type === "question") return "Question";
  if (["theorem", "proof", "lemma", "corollary", "axiom", "conjecture", "proposition", "claim", "argument", "objection", "position", "response"].includes(type)) return "ScholarlyArticle";
  if (type === "index" || type === "topic") return "CollectionPage";
  return "Article";
}

export function rdfaPredicate(predicate: string): string {
  const map: Record<string, string> = {
    title: "schema:name",
    description: "schema:description",
    summary: "schema:abstract",
    authors: "schema:author",
    "date-created": "schema:dateCreated",
    "date-updated": "schema:dateModified",
    "date-modified": "schema:dateModified",
    tags: "schema:keywords",
    cites: "schema:citation",
    references: "schema:citation",
    "part-of": "schema:isPartOf",
    partOf: "schema:isPartOf",
    "component-of": "schema:isPartOf",
    componentOf: "schema:isPartOf",
    requires: "schema:educationalAlignment",
    type: "dc:type",
  };
  return map[predicate] ?? `ws:${predicate.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())}`;
}

function schemaPrefixedType(type: string | readonly string[]): string {
  const first = Array.isArray(type) ? type[0] : type;
  return first === "DefinedTerm" ? "schema:DefinedTerm" : `schema:${first}`;
}

export function toTurtle(algebra: FiniteAlgebra, config: SiteConfig): string {
  const subject = `<${subjectUrl(config.baseUrl, algebra.subject)}>`;
  const schemaType = schemaPrefixedType(schemaTypeFor(firstClaim(algebra, "type")));
  const lines = [
    "@prefix dc: <http://purl.org/dc/terms/> .",
    "@prefix owl: <http://www.w3.org/2002/07/owl#> .",
    "@prefix prov: <http://www.w3.org/ns/prov#> .",
    "@prefix schema: <https://schema.org/> .",
    "@prefix skos: <http://www.w3.org/2004/02/skos/core#> .",
    "@prefix ws: <https://561.group/vocab#> .",
    `${subject} a ${schemaType}, ws:Subject ;`,
    `  schema:url ${subject} ;`,
    `  schema:identifier ${subject} .`,
  ];
  for (const cell of algebra.potential) {
    const predicate = rdfaPredicate(cell.predicate);
    const property = predicate.includes(":") ? predicate : `<${predicateUrl(config.baseUrl, cell.predicate)}>`;
    const values = valueList(cell.object);
    for (const value of values) lines.push(`${subject} ${property} ${literal(value)} .`);
  }
  for (const cell of algebra.active) lines.push(`[] a owl:NegativePropertyAssertion ; owl:sourceIndividual ${subject} ; owl:assertionProperty <${predicateUrl(config.baseUrl, cell.predicate)}> ; owl:targetValue ${literal(cell.object)} .`);
  for (const cell of algebra.stable) lines.push(`[] a ws:StableClaim ; ws:claimedBy ${literal(cell.claimedBy)} ; ws:contraryClaimedBy ${literal(cell.contraryClaimedBy)} .`);
  return `${lines.join("\n")}\n`;
}

export function toJsonLd(algebra: FiniteAlgebra, config: SiteConfig, options: JsonLdProjectionOptions = {}): Record<string, unknown> {
  const pageType = schemaTypeFor(firstClaim(algebra, "type"));
  const title = String(firstClaim(algebra, "title", "name") ?? algebra.subject);
  const description = cleanText(firstClaim(algebra, "description", "summary", "body"));
  const isTerm = Array.isArray(pageType) && pageType.includes("DefinedTerm");
  const json: JsonLdRecord = {
    "@context": ["https://schema.org", { skos: "http://www.w3.org/2004/02/skos/core#", ws: "https://561.group/vocab#", prov: "http://www.w3.org/ns/prov#" }],
    "@id": subjectUrl(config.baseUrl, algebra.subject),
    "@type": pageType,
    name: title,
    url: subjectUrl(config.baseUrl, algebra.subject),
    ...(description ? { description } : {}),
    ...(firstClaim(algebra, "date", "date-created", "published") ? { datePublished: String(firstClaim(algebra, "date", "date-created", "published")) } : {}),
    ...(firstClaim(algebra, "dateUpdated", "date-updated", "date-modified", "updated") ? { dateModified: String(firstClaim(algebra, "dateUpdated", "date-updated", "date-modified", "updated")) } : { dateModified: algebra.t }),
  };

  const authors = people(firstClaim(algebra, "authors", "author"), config, options.titleIndex);
  if (authors.length === 1) json["author"] = authors[0];
  else if (authors.length > 1) json["author"] = authors;

  const tags = claimValues(algebra, "tags", "keywords").map(String).filter(Boolean);
  if (tags.length) json["keywords"] = tags.join(", ");

  const citations = claimValues(algebra, "references", "cites").map((value) => citationObject(value, config, options.titleIndex));
  if (citations.length === 1) json["citation"] = citations[0];
  else if (citations.length > 1) json["citation"] = citations;

  const publisher = options.publisher ?? (config.themeContext?.siteName || config.title ? { "@type": "Organization", name: config.title, url: trimBase(config.baseUrl) } : undefined);
  if (publisher) json["publisher"] = publisher;

  if (isTerm) {
    json["skos:prefLabel"] = title;
    const aliases = claimValues(algebra, "aliases", "alias").map(String).filter(Boolean);
    if (aliases.length) json["skos:altLabel"] = aliases.length === 1 ? aliases[0] : aliases;
    if (description) json["skos:definition"] = description;
    const broader = claimValues(algebra, "componentOf", "component-of", "partOf", "part-of").map((value) => slugUrl(config, value, options.titleIndex));
    const narrower = claimValues(algebra, "contains").map((value) => slugUrl(config, value, options.titleIndex));
    const related = claimValues(algebra, "related", "related-to", "see-also").map((value) => slugUrl(config, value, options.titleIndex));
    if (broader.length === 1) json["skos:broader"] = broader[0];
    else if (broader.length > 1) json["skos:broader"] = broader;
    if (narrower.length) json["skos:narrower"] = narrower;
    if (related.length) json["skos:related"] = related;
    const termCode = claimValues(algebra, "defines", "termCode").map(String).filter(Boolean);
    if (termCode.length) json["termCode"] = termCode.join(", ");
  }

  if (pageType === "LearningResource") {
    const teaches = claimValues(algebra, "teaches").map((name) => ({ "@type": "DefinedTerm", name: String(name) }));
    if (teaches.length) json["teaches"] = teaches;
  }

  const partOf = firstClaim(algebra, "partOf", "part-of", "componentOf", "component-of");
  if (partOf) json["isPartOf"] = { "@type": "CreativeWork", name: String(partOf), "@id": slugUrl(config, partOf, options.titleIndex), url: slugUrl(config, partOf, options.titleIndex) };

  json["ws:claims"] = {
    potential: algebra.potential,
    active: algebra.active,
    stable: algebra.stable,
  };
  return json;
}

function citationObject(value: unknown, config: SiteConfig, titleIndex?: Readonly<Record<string, string>>): JsonLdRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    return {
      "@type": "CreativeWork",
      ...(record["identifier"] || record["id"] ? { identifier: record["identifier"] ?? record["id"] } : {}),
      ...(record["title"] || record["name"] ? { name: record["title"] ?? record["name"] } : {}),
      ...(record["authors"] || record["author"] ? { author: people(record["authors"] ?? record["author"], config, titleIndex) } : {}),
      ...(record["year"] || record["datePublished"] ? { datePublished: String(record["year"] ?? record["datePublished"]) } : {}),
      ...(record["publication"] ? { publisher: { "@type": "Organization", name: String(record["publication"]) } } : {}),
      ...(record["url"] ? { url: slugUrl(config, record["url"], titleIndex) } : {}),
      ...(record["link-to"] ? { sameAs: slugUrl(config, record["link-to"], titleIndex) } : {}),
    };
  }
  return { "@type": "CreativeWork", name: String(value), url: slugUrl(config, value, titleIndex) };
}

export function allTriples(reader: SemanticReader, config: SiteConfig): readonly TripleRecord[] {
  return Object.freeze(subjects(reader, config).flatMap((subject) => {
    const algebra = reader.settle(config.root, subject);
    return [
      ...algebra.potential.map((cell) => ({ subject, predicate: cell.predicate, object: cell.object, state: "potential" as const, witness: cell.citation })),
      ...algebra.active.map((cell) => ({ subject, predicate: cell.predicate, object: cell.object, state: "active" as const, witness: cell.citation })),
      ...algebra.stable.map((cell) => ({ subject, predicate: cell.predicate, object: cell.object, state: "stable" as const, claimedBy: cell.claimedBy, contraryClaimedBy: cell.contraryClaimedBy })),
    ];
  }));
}

export function queryTriples(triples: readonly TripleRecord[], pattern: QueryPattern = {}): readonly TripleRecord[] {
  return Object.freeze(triples.filter((triple) => {
    if (pattern.s && triple.subject !== pattern.s) return false;
    if (pattern.p && triple.predicate !== pattern.p) return false;
    if (pattern.o && String(triple.object) !== pattern.o) return false;
    if (pattern.state && triple.state !== pattern.state) return false;
    if (pattern.witness) {
      const witnesses = [triple.witness, triple.claimedBy, triple.contraryClaimedBy].map(String);
      if (!witnesses.includes(pattern.witness)) return false;
    }
    return true;
  }));
}

export function feedChannel(config: SiteConfig): FeedChannel {
  return { title: config.title, homePageUrl: config.baseUrl, feedUrl: `${trimBase(config.baseUrl)}/feed.json`, ...(config.tagline ? { description: config.tagline } : {}), language: config.language ?? "en" };
}

export function feedItems(reader: SemanticReader, config: SiteConfig): readonly FeedItem[] {
  return Object.freeze(subjects(reader, config).map((subject) => {
    const algebra = reader.settle(config.root, subject);
    const title = String(algebra.potential.find((cell) => cell.predicate === "title" || cell.predicate === "name")?.object ?? subject);
    return {
      id: subjectUrl(config.baseUrl, subject),
      url: subjectUrl(config.baseUrl, subject),
      title,
      contentHtml: markdownToHtml(String(algebra.potential.find((cell) => cell.predicate === "body")?.object ?? "")),
      ...(algebra.t ? { updated: algebra.t } : {}),
    };
  }));
}

export function jsonFeedDocument(reader: SemanticReader, config: SiteConfig): string {
  return jsonFeed(feedChannel(config), feedItems(reader, config));
}

export function atomFeed(reader: SemanticReader, config: SiteConfig): string {
  return atom(feedChannel(config), feedItems(reader, config));
}

export function rssFeed(reader: SemanticReader, config: SiteConfig): string {
  return rss2({ ...feedChannel(config), feedUrl: `${trimBase(config.baseUrl)}/feed.xml` }, feedItems(reader, config));
}

export function sitemapXml(reader: SemanticReader, config: SiteConfig): string {
  return sitemap(subjects(reader, config).map((subject): SitemapUrl => ({ loc: subjectUrl(config.baseUrl, subject) })));
}

export function robotsTxt(config: SiteConfig): string {
  return robots({ sitemap: `${trimBase(config.baseUrl)}/sitemap.xml` });
}

export function siteManifest(reader: SemanticReader, config: SiteConfig): Record<string, unknown> {
  const base = trimBase(config.baseUrl);
  const triples = allTriples(reader, config);
  const stateCounts = triples.reduce((counts, triple) => {
    counts[triple.state] += 1;
    return counts;
  }, { potential: 0, active: 0, stable: 0 } satisfies Record<TripleRecord["state"], number>);
  const webmentionPath = config.webmentionPath === undefined ? "/webmention" : config.webmentionPath;
  return {
    title: config.title,
    baseUrl: base,
    description: config.tagline ?? "",
    language: config.language ?? "en",
    feeds: {
      json: `${base}/feed.json`,
      atom: `${base}/feed.atom`,
      rss: `${base}/feed.xml`,
      sitemap: `${base}/sitemap.xml`,
      robots: `${base}/robots.txt`,
      ...(webmentionPath === null ? {} : { webmention: `${base}${webmentionPath.startsWith("/") ? "" : "/"}${webmentionPath}` }),
    },
    counts: {
      subjects: subjects(reader, config).length,
      triples: triples.length,
      ...stateCounts,
    },
    subjects: subjects(reader, config).map((subject) => {
      const algebra = reader.settle(config.root, subject);
      return {
        subject,
        url: subjectUrl(config.baseUrl, subject),
        title: String(firstClaim(algebra, "title", "name") ?? subject),
        state: subjectCellState(algebra).state,
        claims: {
          potential: algebra.potential.length,
          active: algebra.active.length,
          stable: algebra.stable.length,
        },
      };
    }),
  };
}

export function exportAssertions(reader: SemanticReader, config: SiteConfig): readonly Assertion[] {
  return Object.freeze(subjects(reader, config).flatMap((subject) => [...reader.traceOf(config.root, subject)]));
}

export function importAssertions(reader: SemanticReader, config: SiteConfig, assertions: readonly Assertion[], citation = "sync"): number {
  if (!reader.claim) return 0;
  let count = 0;
  for (const assertion of assertions) {
    reader.claim(config.root, assertion.e, { [assertion.a]: assertion.v }, { citation: assertion.t ?? citation });
    count += 1;
  }
  return count;
}

function artifact(path: string, format: SiteOutputFormat, mediaType: string, body: string): SiteArtifact {
  return Object.freeze({ path, format, mediaType, body });
}

function buildCell(
  subject: string,
  format: SiteOutputFormat,
  path: string,
  state: SiteCellState,
  reason: string,
  body?: string,
  contradictions?: readonly unknown[],
): SiteBuildCell {
  return Object.freeze({
    subject,
    format,
    path,
    state,
    reason,
    ...(body !== undefined ? { bytes: Buffer.byteLength(body, "utf8") } : {}),
    ...(contradictions && contradictions.length > 0 ? { contradictions } : {}),
  });
}

function subjectCellState(algebra: FiniteAlgebra): Pick<SiteBuildCell, "state" | "reason" | "contradictions"> {
  if (algebra.stable.length > 0) return { state: "absurd", reason: "settled algebra holds contradictions (stable claim cells)", contradictions: algebra.stable };
  if (algebra.active.length > 0 && algebra.potential.length === 0) return { state: "stable", reason: "subject has only contrary-claim evidence" };
  return { state: "active", reason: "subject rendered from settled potential claims" };
}

function buildCounts(cells: readonly SiteBuildCell[]): Readonly<Record<SiteCellState, number>> {
  const counts: Record<SiteCellState, number> = { potential: 0, active: 0, stable: 0, absurd: 0 };
  for (const cell of cells) counts[cell.state] += 1;
  return Object.freeze(counts);
}

export function buildSite(reader: SemanticReader, config: SiteConfig, options: BuildSiteOptions = {}): SiteBuildReport {
  const generatedAt = options.now?.() ?? new Date().toISOString();
  const artifacts: SiteArtifact[] = [];
  const cells: SiteBuildCell[] = [];
  const add = (entry: SiteArtifact, cell: SiteBuildCell): void => {
    artifacts.push(entry);
    cells.push(cell);
  };
  const siteSubject = "__site__";
  const siteArtifacts: Array<[string, SiteOutputFormat, string, string]> = [
    ["index.html", "html", "text/html; charset=utf-8", renderIndex(reader, config)],
    ["feed.json", "jsonfeed", "application/feed+json; charset=utf-8", jsonFeedDocument(reader, config)],
    ["feed.atom", "atom", "application/atom+xml; charset=utf-8", atomFeed(reader, config)],
    ["feed.xml", "rss", "application/rss+xml; charset=utf-8", rssFeed(reader, config)],
    ["sitemap.xml", "sitemap", "application/xml; charset=utf-8", sitemapXml(reader, config)],
    ["robots.txt", "robots", "text/plain; charset=utf-8", robotsTxt(config)],
    ["site.json", "manifest", "application/json; charset=utf-8", `${JSON.stringify(siteManifest(reader, config), null, 2)}\n`],
  ];
  for (const [path, format, mediaType, body] of siteArtifacts) {
    add(artifact(path, format, mediaType, body), buildCell(siteSubject, format, path, "active", "site-level output rendered", body));
  }

  for (const subject of subjects(reader, config)) {
    const algebra = reader.settle(config.root, subject);
    const cellState = subjectCellState(algebra);
    const encoded = subject.split("/").map(encodeURIComponent).join("/");
    const outputs: Array<[string, SiteOutputFormat, string, string]> = [
      [`${encoded}/index.html`, "html", "text/html; charset=utf-8", renderSubject(algebra, config)],
      [`${encoded}.ttl`, "ttl", "text/turtle; charset=utf-8", toTurtle(algebra, config)],
      [`${encoded}.jsonld`, "jsonld", "application/ld+json; charset=utf-8", `${JSON.stringify(toJsonLd(algebra, config), null, 2)}\n`],
    ];
    for (const [path, format, mediaType, body] of outputs) {
      add(artifact(path, format, mediaType, body), buildCell(subject, format, path, cellState.state, cellState.reason, body, cellState.contradictions));
    }
  }

  const assertionSource = options.includeStableAssertions === false ? [] : exportAssertions(reader, config);
  return Object.freeze({
    kind: "web-semantic-site.finite-build",
    generatedAt,
    config: Object.freeze({ baseUrl: trimBase(config.baseUrl), title: config.title, language: config.language ?? "en" }),
    cells: Object.freeze(cells),
    artifacts: Object.freeze(artifacts),
    assertions: Object.freeze(assertionSource),
    subjects: subjects(reader, config),
    counts: buildCounts(cells),
  });
}

export type ProjectSiteOptions = BuildSiteOptions & Readonly<{
  // Remove the target directory before writing, so the projection holds only
  // the current build's artifacts (no stale files from an earlier projection).
  clean?: boolean;
}>;

export type SiteProjection = Readonly<{
  directory: string;
  written: readonly string[];
  report: SiteBuildReport;
}>;

// Write an already-built site's artifacts to a directory, one file per
// artifact at its artifact path (creating parent directories as needed).
// The artifact path is the build's relative output path — `index.html`,
// `subject/index.html`, `subject.ttl`, `feed.json`, and so on — so the
// directory mirrors the URL space the running server would answer.
export function writeSiteArtifacts(artifacts: readonly SiteArtifact[], directory: string): readonly string[] {
  const written: string[] = [];
  for (const entry of artifacts) {
    const target = join(directory, entry.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, entry.body);
    written.push(target);
  }
  return Object.freeze(written.sort());
}

// Project a built website at a directory: settle every subject the reader
// holds, render the finite build, and write its artifacts to `directory`.
// This is the static counterpart to `buildApp` — the same renderings, fixed
// to disk instead of answered live — and pairs with `mountedDirectoryReader`
// to project a site from one or more mounted content packages.
export function projectSite(reader: SemanticReader, config: SiteConfig, directory: string, options: ProjectSiteOptions = {}): SiteProjection {
  if (options.clean) rmSync(directory, { recursive: true, force: true });
  const report = buildSite(reader, config, options);
  const written = writeSiteArtifacts(report.artifacts, directory);
  return Object.freeze({ directory, written, report });
}

export type ProjectAppOptions = Readonly<{
  // The public base URL the app renders against, so absolute links (canonical
  // links, feed entries) and root-relative links alike resolve to the site and
  // are followed.
  baseUrl: string;
  // Paths to seed the crawl with beyond "/" and the sitemap — section indexes
  // and any page not reachable by following links from the home page.
  entryPaths?: readonly string[];
  // Remove the target directory before writing.
  clean?: boolean;
}>;

export type AppProjection = Readonly<{
  directory: string;
  written: readonly string[];
  rendered: number;
}>;

function crawlOutputPath(pathname: string): string {
  const trimmed = decodeURIComponent(pathname).replace(/^\/+|\/+$/g, "");
  if (trimmed === "") return "index.html";
  const last = trimmed.split("/").pop() ?? "";
  // Anything without a file extension is a rendered page, written as the
  // directory's index.html so the static host serves it at the clean URL.
  return /\.[a-z0-9]+$/i.test(last) ? trimmed : `${trimmed}/index.html`;
}

// Extensions that are content assets or source, never a rendered page route.
// Following them only ever yields a 404, so the crawl skips them — this keeps
// broken relative markdown links (../foo/index.md) and image references in
// post bodies from each costing a wasted render.
const NON_PAGE_EXT = /\.(?:md|markdown|png|jpe?g|gif|svg|webp|avif|ico|css|js|mjs|map|pdf|zip|woff2?|ttf|eot|mp[34]|webm|wav)$/i;

function internalPaths(html: string, pageUrl: string, baseOrigin: string): readonly string[] {
  const out = new Set<string>();
  const re = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const raw = (m[1] ?? "").trim();
    if (!raw || raw.startsWith("#") || /^(?:mailto:|tel:|data:|javascript:)/i.test(raw)) continue;
    let url: URL;
    try { url = new URL(raw, pageUrl); } catch { continue; }
    // Same-site links only; drop the query (static files have no query space).
    if ((url.protocol === "http:" || url.protocol === "https:") && url.origin === baseOrigin && !NON_PAGE_EXT.test(url.pathname)) {
      out.add(url.pathname);
    }
  }
  return [...out];
}

function sitemapPaths(xml: string, baseOrigin: string): readonly string[] {
  const out = new Set<string>();
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  for (let m = re.exec(xml); m; m = re.exec(xml)) {
    try {
      const url = new URL(m[1] ?? "", baseOrigin);
      if (url.origin === baseOrigin) out.add(url.pathname);
    } catch { /* skip malformed loc */ }
  }
  return [...out];
}

function matchResource(resource: Resource, pathname: string, ctx: Context): Record<string, string> | null {
  const m = resource.match;
  if (typeof m === "string") return m === pathname ? {} : null;
  if (m instanceof RegExp) {
    const result = m.exec(pathname);
    return result ? { ...(result.groups ?? {}) } : null;
  }
  const verdict = m(pathname, ctx);
  if (verdict === false || verdict === null || verdict === undefined) return null;
  return verdict === true ? {} : { ...verdict };
}

function reprBody(body: Repr["body"]): string | Uint8Array {
  if (typeof body === "string") return body;
  if (body instanceof Uint8Array) return body;
  return body == null ? "" : JSON.stringify(body);
}

// Render a single GET path against the app's resources in array order — the
// authored order encodes precedence (specific routes before catch-alls), the
// same order the router answers in. The first matching resource wins.
async function renderGet(app: App, pathname: string, baseUrl: string): Promise<Repr | null> {
  const url = new URL(pathname, baseUrl);
  const base = { url, params: {}, nonce: "", locals: {} } as unknown as Context;
  for (const resource of app.resources ?? []) {
    if (resource.methods && !resource.methods.includes("GET")) continue;
    const params = matchResource(resource, url.pathname, base);
    if (params === null) continue;
    const ctx = { ...base, params } as unknown as Context;
    const result = await resource.handler(ctx);
    if (result == null || typeof (result as Response).arrayBuffer === "function") return null;
    return result as Repr;
  }
  return null;
}

// Project a built website at a directory by rendering the app in memory and
// crawling it to static files — the faithful counterpart to `projectSite` for
// an arbitrary composed `App` (semantic site plus, say, professional-blog
// sections). No server, no socket: each path is rendered by invoking the
// matching resource handler directly, starting from the home page and sitemap
// and following same-site links, writing each response at its clean path. The
// result is a static mirror of exactly what the app serves.
export async function projectApp(app: App, directory: string, options: ProjectAppOptions): Promise<AppProjection> {
  if (options.clean) rmSync(directory, { recursive: true, force: true });
  const baseOrigin = new URL(options.baseUrl).origin;
  const seeds = ["/", "/sitemap.xml", "/robots.txt", "/feed.json", "/feed.atom", "/feed.xml", ...(options.entryPaths ?? [])];
  const queue: string[] = [...new Set(seeds)];
  const seen = new Set<string>();
  const written: string[] = [];
  let rendered = 0;
  for (let path = queue.shift(); path !== undefined; path = queue.shift()) {
    if (seen.has(path)) continue;
    seen.add(path);
    const repr = await renderGet(app, path, options.baseUrl);
    if (!repr || (repr.status !== undefined && repr.status >= 400)) continue;
    rendered += 1;
    const contentType = repr.type ?? "";
    const body = reprBody(repr.body);
    const target = join(directory, crawlOutputPath(new URL(path, options.baseUrl).pathname));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, body);
    written.push(target);
    const text = typeof body === "string" ? body : "";
    if (contentType.includes("html")) {
      for (const next of internalPaths(text, new URL(path, options.baseUrl).href, baseOrigin)) {
        if (!seen.has(next)) queue.push(next);
      }
    } else if (contentType.includes("xml") || path.endsWith("sitemap.xml")) {
      for (const next of sitemapPaths(text, baseOrigin)) {
        if (!seen.has(next)) queue.push(next);
      }
    }
  }
  return Object.freeze({ directory, written: Object.freeze(written.sort()), rendered });
}

function cellKey(cell: Pick<SiteBuildCell, "subject" | "format" | "path">): string {
  return `${cell.subject}\u0000${cell.format}\u0000${cell.path}`;
}

function cellRank(state: SiteCellState): number {
  return state === "potential" ? 0 : state === "stable" ? 1 : state === "active" ? 2 : 3;
}

function sameCell(left: SiteBuildCell, right: SiteBuildCell): boolean {
  return left.state === right.state
    && left.reason === right.reason
    && left.bytes === right.bytes
    && JSON.stringify(left.contradictions ?? []) === JSON.stringify(right.contradictions ?? []);
}

function reportLike(base: SiteBuildReport, cells: readonly SiteBuildCell[], artifacts: readonly SiteArtifact[], kind: SiteBuildReport["kind"] = "web-semantic-site.finite-build"): SiteBuildReport {
  return Object.freeze({
    kind,
    generatedAt: base.generatedAt,
    config: base.config,
    cells: Object.freeze([...cells]),
    artifacts: Object.freeze([...artifacts]),
    assertions: base.assertions,
    subjects: Object.freeze([...new Set(cells.map((cell) => cell.subject).filter((subject) => subject !== "__site__"))].sort()),
    counts: buildCounts(cells),
  });
}

export function meetBuilds(left: SiteBuildReport, right: SiteBuildReport): SiteBuildReport {
  const rightCells = new Map(right.cells.map((cell) => [cellKey(cell), cell]));
  const cells = left.cells.filter((cell) => {
    const other = rightCells.get(cellKey(cell));
    return other ? sameCell(cell, other) : false;
  });
  const rightArtifacts = new Map(right.artifacts.map((entry) => [`${entry.path}\u0000${entry.format}`, entry]));
  const artifacts = left.artifacts.filter((entry) => {
    const other = rightArtifacts.get(`${entry.path}\u0000${entry.format}`);
    return other?.body === entry.body && other.mediaType === entry.mediaType;
  });
  return reportLike(left, cells, artifacts);
}

export function joinBuilds(left: SiteBuildReport, right: SiteBuildReport): SiteBuildReport {
  const cells = new Map<string, SiteBuildCell>();
  for (const cell of [...left.cells, ...right.cells]) {
    const key = cellKey(cell);
    const prev = cells.get(key);
    if (!prev || cellRank(cell.state) >= cellRank(prev.state)) cells.set(key, cell);
  }
  const artifacts = new Map<string, SiteArtifact>();
  for (const entry of [...left.artifacts, ...right.artifacts]) artifacts.set(`${entry.path}\u0000${entry.format}`, entry);
  return reportLike(right, [...cells.values()].sort((a, b) => cellKey(a).localeCompare(cellKey(b))), [...artifacts.values()].sort((a, b) => a.path.localeCompare(b.path)));
}

export function residualBuild(from: SiteBuildReport, to: SiteBuildReport): SiteBuildDelta {
  const fromCells = new Map(from.cells.map((cell) => [cellKey(cell), cell]));
  const toCells = new Map(to.cells.map((cell) => [cellKey(cell), cell]));
  return Object.freeze({
    changed: Object.freeze(to.cells.filter((cell) => {
      const before = fromCells.get(cellKey(cell));
      return !before || !sameCell(before, cell);
    })),
    removed: Object.freeze(from.cells.filter((cell) => !toCells.has(cellKey(cell)))),
  });
}

function repr(body: unknown, type: string, status = 200): Repr {
  return { status, type, body: typeof body === "string" ? body : `${JSON.stringify(body, null, 2)}\n` };
}

function notFound(): Repr {
  return repr("Not Found", "text/plain; charset=utf-8", 404);
}

function subjectMatch(path: string): { subject: string } | null {
  if (!path || path === "/" || path.startsWith("/.") || path === "/site.json" || path === "/feed.json" || path === "/feed.atom" || path === "/feed.xml" || path === "/sitemap.xml" || path === "/robots.txt" || path === "/query" || path === "/sync" || path === "/webmention") return null;
  return { subject: decodeURIComponent(path.replace(/^\//, "").replace(/\.(ttl|jsonld|html)$/, "")) };
}

export function buildApp(reader: SemanticReader, config: SiteConfig, options: BuildAppOptions = {}): App {
  const webmentionPath = config.webmentionPath === undefined ? "/webmention" : config.webmentionPath;
  const securityTxtPath = options.securityTxtPath ?? "/.well-known/security.txt";
  const security = options.security;
  const languages = Object.freeze([config.language ?? "en"]);
  return {
    security: true,
    cacheControl: { visibility: "public", maxAge: 300 },
    resources: [
      {
        id: "semantic-site.index",
        name: "Semantic Site Index",
        route: "/",
        match: "/",
        methods: ["GET"],
        produces: ["text/html"],
        languages,
        handler: async (ctx) => repr(renderIndex(reader, config, ctx.nonce), "text/html; charset=utf-8"),
      },
      {
        id: "semantic-site.feed.json",
        name: "Semantic Site JSON Feed",
        route: "/feed.json",
        match: "/feed.json",
        methods: ["GET"],
        produces: ["application/feed+json"],
        languages,
        handler: async () => repr(jsonFeedDocument(reader, config), "application/feed+json; charset=utf-8"),
      },
      {
        id: "semantic-site.manifest",
        name: "Semantic Site Manifest",
        route: "/site.json",
        match: "/site.json",
        methods: ["GET"],
        produces: ["application/json"],
        languages,
        handler: async () => repr(siteManifest(reader, config), "application/json; charset=utf-8"),
      },
      {
        id: "semantic-site.feed.atom",
        name: "Semantic Site Atom Feed",
        route: "/feed.atom",
        match: "/feed.atom",
        methods: ["GET"],
        produces: ["application/atom+xml"],
        languages,
        handler: async () => repr(atomFeed(reader, config), "application/atom+xml; charset=utf-8"),
      },
      {
        id: "semantic-site.feed.rss",
        name: "Semantic Site RSS Feed",
        route: "/feed.xml",
        match: "/feed.xml",
        methods: ["GET"],
        produces: ["application/rss+xml"],
        languages,
        handler: async () => repr(rssFeed(reader, config), "application/rss+xml; charset=utf-8"),
      },
      {
        id: "semantic-site.sitemap",
        name: "Semantic Site Sitemap",
        route: "/sitemap.xml",
        match: "/sitemap.xml",
        methods: ["GET"],
        produces: ["application/xml"],
        handler: async () => repr(sitemapXml(reader, config), "application/xml; charset=utf-8"),
      },
      {
        id: "semantic-site.robots",
        name: "Semantic Site Robots",
        route: "/robots.txt",
        match: "/robots.txt",
        methods: ["GET"],
        produces: ["text/plain"],
        handler: async () => repr(robotsTxt(config), "text/plain; charset=utf-8"),
      },
      ...(security ? [{
        id: "semantic-site.security-txt",
        name: "Semantic Site Security Contact Policy",
        route: securityTxtPath,
        match: securityTxtPath,
        methods: ["GET"],
        produces: ["text/plain"],
        handler: async () => repr(securityTxt(security), "text/plain; charset=utf-8"),
      }] : []),
      { id: "semantic-site.query", name: "Semantic Site Query", route: "/query", match: "/query", methods: ["GET"], produces: ["application/json"], languages, handler: async (ctx) => {
        const s = ctx.url.searchParams.get("s");
        const p = ctx.url.searchParams.get("p");
        const o = ctx.url.searchParams.get("o");
        const state = ctx.url.searchParams.get("state") as TripleRecord["state"] | null;
        const pattern: QueryPattern = {
          ...(s ? { s } : {}),
          ...(p ? { p } : {}),
          ...(o ? { o } : {}),
          ...(state ? { state } : {}),
        };
        return repr({ triples: queryTriples(allTriples(reader, config), pattern) }, "application/json; charset=utf-8");
      } },
      {
        id: "semantic-site.sync.export",
        name: "Semantic Site Sync Export",
        route: "/sync",
        match: "/sync",
        methods: ["GET"],
        produces: ["application/json"],
        languages,
        handler: async () => repr({ assertions: exportAssertions(reader, config) }, "application/json; charset=utf-8"),
      },
      { id: "semantic-site.sync.import", name: "Semantic Site Sync Import", route: "/sync", match: "/sync", methods: ["POST"], produces: ["application/json"], handler: async (ctx) => {
        const body = await readJsonBody<{ assertions?: Assertion[] }>(ctx.req, { maxBytes: 1_000_000, empty: {} });
        return repr({ imported: importAssertions(reader, config, body.assertions ?? []) }, "application/json; charset=utf-8", reader.claim ? 202 : 409);
      } },
      ...(webmentionPath === null ? [] : [{ id: "semantic-site.webmention", name: "Semantic Site Webmention", route: webmentionPath, match: webmentionPath, methods: ["POST"], produces: ["application/json"], handler: async (ctx: Context) => {
        const result: ReceiveResult = await receiveMention(await readTextBody(ctx.req, { maxBytes: 100_000 }), { baseUrl: config.baseUrl, contentType: String(ctx.req.headers["content-type"] ?? "") });
        if (result.accepted && reader.claim && result.request.source && result.request.target) {
          reader.claim(config.root, result.request.target, { mention: result.request.source }, { citation: result.request.source });
        }
        return repr(result, "application/json; charset=utf-8", result.status);
      } }]),
      { id: "semantic-site.subject", name: "Semantic Site Subject", route: "/:subject", match: subjectMatch, methods: ["GET"], produces: ["text/html", "text/turtle", "application/ld+json"], languages, handler: async (ctx) => {
        const subject = ctx.params.subject ?? "";
        if (!subjects(reader, config).includes(subject)) return notFound();
        const algebra = reader.settle(config.root, subject);
        if (ctx.url.pathname.endsWith(".ttl")) return repr(toTurtle(algebra, config), "text/turtle; charset=utf-8");
        if (ctx.url.pathname.endsWith(".jsonld")) return repr(toJsonLd(algebra, config), "application/ld+json; charset=utf-8");
        return repr(renderSubject(algebra, config, ctx.nonce), "text/html; charset=utf-8");
      } },
    ],
  };
}

function markdownFiles(root: string, extension = ".md"): readonly string[] {
  if (!existsSync(root)) return Object.freeze([]);
  const files: string[] = [];
  const visit = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (name === "trace" || name === "finite" || name === "cache" || name === "node_modules" || name.startsWith(".")) continue;
      const path = join(dir, name);
      const stat = statSync(path);
      if (stat.isDirectory()) visit(path);
      else if (stat.isFile() && name.endsWith(extension)) files.push(path);
    }
  };
  visit(root);
  return Object.freeze(files.sort());
}

function markdownSubject(root: string, path: string, extension = ".md"): string {
  const rel = relative(root, path).replace(/\\/g, "/");
  return rel.endsWith(extension) ? rel.slice(0, -extension.length) : rel;
}

export function markdownDirectoryReader(options: MarkdownReaderOptions = {}): SemanticReader {
  const extension = options.extension ?? ".md";
  const citationPrefix = options.citationPrefix ?? "victor";
  const assertionsFor = (root: string, subject?: string): readonly Assertion[] => Object.freeze(markdownFiles(root, extension).flatMap((path) => {
    const fileSubject = markdownSubject(root, path, extension);
    if (subject && fileSubject !== subject) return [];
    return [...readMarkdownFile(path, { subject: fileSubject, citation: options.citationFor?.(root, path) ?? `${citationPrefix}:${path}` }).assertions];
  }));
  return Object.freeze({
    listSubjects: (root) => Object.freeze(markdownFiles(root, extension).map((path) => markdownSubject(root, path, extension)).sort()),
    traceOf: (root, subject) => assertionsFor(root, subject),
    settle: (root, subject) => {
      const settleOptions: { functional?: Iterable<string>; tracePaths?: readonly string[] } = {
        tracePaths: markdownFiles(root, extension).filter((path) => markdownSubject(root, path, extension) === subject),
      };
      if (options.functional) settleOptions.functional = options.functional;
      return finiteAlgebra(subject, assertionsFor(root, subject), settleOptions);
    },
  });
}

// A read-once snapshot reader for batch projection. `markdownDirectoryReader`
// re-walks the content tree on every `settle` (twice: once for assertions,
// once for trace paths) so a live server always reflects edits — but a static
// build settles every subject, turning that into O(subjects) full directory
// walks. This reader walks each root once, reads each file once, and settles
// from the cached assertions, so a whole-site build pays one walk instead of
// hundreds. It is a snapshot: it will not see files added after first use, so
// it must not back a live server (use `markdownDirectoryReader` there).
export function markdownSnapshotReader(options: MarkdownReaderOptions = {}): SemanticReader {
  const extension = options.extension ?? ".md";
  const citationPrefix = options.citationPrefix ?? "victor";
  type Entry = { paths: string[]; assertions: Assertion[] };
  type Snapshot = { subjects: readonly string[]; bySubject: Map<string, Entry> };
  const snapshots = new Map<string, Snapshot>();
  const snapshotOf = (root: string): Snapshot => {
    const cached = snapshots.get(root);
    if (cached !== undefined) return cached;
    const bySubject = new Map<string, Entry>();
    for (const path of markdownFiles(root, extension)) {
      const subject = markdownSubject(root, path, extension);
      const entry = bySubject.get(subject) ?? { paths: [], assertions: [] };
      entry.paths.push(path);
      entry.assertions.push(...readMarkdownFile(path, { subject, citation: `${citationPrefix}:${path}` }).assertions);
      bySubject.set(subject, entry);
    }
    const snapshot: Snapshot = { subjects: Object.freeze([...bySubject.keys()].sort()), bySubject };
    snapshots.set(root, snapshot);
    return snapshot;
  };
  return Object.freeze({
    listSubjects: (root) => snapshotOf(root).subjects,
    traceOf: (root, subject) => Object.freeze([...(snapshotOf(root).bySubject.get(subject)?.assertions ?? [])]),
    settle: (root, subject) => {
      const entry = snapshotOf(root).bySubject.get(subject);
      const settleOptions: { functional?: Iterable<string>; tracePaths?: readonly string[] } = {
        tracePaths: entry?.paths ?? [],
      };
      if (options.functional) settleOptions.functional = options.functional;
      return finiteAlgebra(subject, entry?.assertions ?? [], settleOptions);
    },
  });
}

export type ContentMount = Readonly<{
  // The content package's directory, read for markdown the same way
  // `markdownDirectoryReader` reads a single root.
  root: string;
  // The sub-path the mount's subjects hang under; a mount of base "garden"
  // turns a file `note.md` into subject `garden/note`. Omitted or empty
  // mounts contribute their subjects at the site root.
  base?: string;
}>;

function mountTrim(base?: string): string {
  return String(base ?? "").replace(/^\/+|\/+$/g, "");
}

// A reader over several mounted content packages, projected as one site.
// Each mount reads its root for markdown like `markdownDirectoryReader`, and
// its subjects hang under the mount's base, so packages mounted at distinct
// bases compose into a single subject space without collision. The `root`
// argument the SemanticReader interface passes is ignored — the mounts are
// the content — exactly as `memoryReader` ignores it.
export function mountedDirectoryReader(mounts: readonly ContentMount[], options: MarkdownReaderOptions = {}): SemanticReader {
  const extension = options.extension ?? ".md";
  const citationPrefix = options.citationPrefix ?? "victor";

  const entries = (): ReadonlyArray<{ subject: string; path: string }> =>
    mounts.flatMap((mount) => markdownFiles(mount.root, extension).map((path) => {
      const local = markdownSubject(mount.root, path, extension);
      const base = mountTrim(mount.base);
      return { subject: base ? `${base}/${local}` : local, path };
    }));

  const assertionsFor = (subject?: string): readonly Assertion[] => Object.freeze(entries().flatMap(({ subject: full, path }) => {
    if (subject && full !== subject) return [];
    return [...readMarkdownFile(path, { subject: full, citation: `${citationPrefix}:${path}` }).assertions];
  }));

  return Object.freeze({
    listSubjects: () => Object.freeze([...new Set(entries().map((entry) => entry.subject))].sort()),
    traceOf: (_root, subject) => assertionsFor(subject),
    settle: (_root, subject) => {
      const settleOptions: { functional?: Iterable<string>; tracePaths?: readonly string[] } = {
        tracePaths: entries().filter((entry) => entry.subject === subject).map((entry) => entry.path),
      };
      if (options.functional) settleOptions.functional = options.functional;
      return finiteAlgebra(subject, assertionsFor(subject), settleOptions);
    },
  });
}

// Wrap a reader so `listSubjects`, `traceOf`, and `settle` are each computed
// once per (root, subject) and cached. A live server must not use this — it
// would never see content change — but a static build reads a fixed snapshot,
// where it turns the site server's naturally O(subjects²) rendering (every
// page calls `subjects()`, which settles every subject) into a single pass.
// `claim` is intentionally dropped: the cache assumes a read-only snapshot.
export function memoizeReader(reader: SemanticReader): SemanticReader {
  const listCache = new Map<string, readonly string[]>();
  const traceCache = new Map<string, readonly Assertion[]>();
  const settleCache = new Map<string, FiniteAlgebra>();
  const key = (root: string, subject: string): string => `${root}\u0000${subject}`;
  return Object.freeze({
    listSubjects: (root) => {
      const hit = listCache.get(root);
      if (hit !== undefined) return hit;
      const value = reader.listSubjects(root);
      listCache.set(root, value);
      return value;
    },
    traceOf: (root, subject) => {
      const k = key(root, subject);
      const hit = traceCache.get(k);
      if (hit !== undefined) return hit;
      const value = reader.traceOf(root, subject);
      traceCache.set(k, value);
      return value;
    },
    settle: (root, subject) => {
      const k = key(root, subject);
      const hit = settleCache.get(k);
      if (hit !== undefined) return hit;
      const value = reader.settle(root, subject);
      settleCache.set(k, value);
      return value;
    },
  });
}

export function watchContent(root: string, reader: Pick<SemanticReader, "listSubjects" | "settle">, options: ContentWatchOptions = {}): FSWatcher | null {
  const debounceMs = options.debounceMs ?? 150;
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return watch(root, { recursive: true }, (_event, filename) => {
      const name = String(filename ?? "");
      if (!name.endsWith(".md")) return;
      if (name.includes("cache/") || name.includes("finite/") || name.includes("trace/")) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          const current = reader.listSubjects(root);
          for (const subject of current) {
            try { reader.settle(root, subject); } catch { /* a bad page should not stop the watcher */ }
          }
          options.onChange?.(name, current);
        } catch (error) {
          options.onError?.(error);
        }
      }, debounceMs);
    });
  } catch (error) {
    options.onError?.(error);
    return null;
  }
}

export async function startMarkdownSite(config: SiteConfig, options: StartMarkdownSiteOptions = {}): Promise<StartedSemanticSite> {
  const reader = markdownDirectoryReader(options.readerOptions);
  const running = await startWebServer(buildApp(reader, config), options.port ?? 0);
  const watcher = options.watch === false ? null : watchContent(config.root, reader, options.watchOptions ?? {});
  const close = async (): Promise<void> => {
    watcher?.close();
    await running.close();
  };
  return Object.freeze({
    ...running,
    close,
    root: config.root,
    reader,
    watcher,
  });
}

export function memoryReader(initial: readonly Assertion[] = []): SemanticReader & { assertions: Assertion[] } {
  const assertions = [...initial];
  return {
    assertions,
    listSubjects: () => Object.freeze([...new Set(assertions.map((assertion) => assertion.e))].sort()),
    traceOf: (_root, subject) => Object.freeze(assertions.filter((assertion) => assertion.e === subject)),
    settle: (_root, subject) => finiteAlgebra(subject, assertions.filter((assertion) => assertion.e === subject)),
    claim: (_root, subject, claims, options = {}) => {
      for (const [predicate, object] of Object.entries(claims)) assertions.push({ e: subject, a: predicate, v: object, t: options.citation ?? new Date().toISOString() });
    },
  };
}
