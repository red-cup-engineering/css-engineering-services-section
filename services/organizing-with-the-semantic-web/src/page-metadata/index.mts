import type { App, Repr, Resource } from "@red-cup-engineering/relating/running/http";
import type { ChargeValueName, UtteranceCarrier } from "@red-cup-engineering/relating";
import { settleLessonJudgments, utterEvidenceSet, type LessonSettlement, type LessonEvidence } from "@red-cup-engineering/knowing/learning";
import { assertHttpUrl, escapeHtmlText } from "@red-cup-engineering/producing-content/codecs/feed";

export type MetadataImage = {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  type?: string;
};

export type MetadataAuthor = {
  name: string;
  url?: string;
  image?: string;
  email?: string;
  sameAs?: string | readonly string[];
};

export type MetadataOrganization = {
  name: string;
  url?: string;
  logo?: string;
  sameAs?: string | readonly string[];
};

export type MetadataPerson = string | MetadataAuthor;

export type PageMetadata = {
  url: string;
  title: string;
  description?: string;
  siteName?: string;
  type?: "article" | "website" | "profile" | "book" | "music.song" | "video.movie";
  locale?: string;
  images?: readonly MetadataImage[];
  author?: MetadataAuthor;
  published?: string;
  modified?: string;
  tags?: readonly string[];
  twitterSite?: string;
  twitterCreator?: string;
  schemaType?: "Article" | "BlogPosting" | "WebPage" | "ProfilePage" | "NewsArticle";
  publisher?: string | MetadataOrganization;
  searchUrl?: string;
  breadcrumbs?: readonly Breadcrumb[];
};

export type MetadataAppOptions = {
  metadata: PageMetadata;
  path?: string;
};

export type WebAppManifestIcon = {
  src: string;
  sizes?: string;
  type?: string;
  purpose?: "any" | "maskable" | "monochrome" | string;
};

export type WebAppManifestScreenshot = {
  src: string;
  sizes?: string;
  type?: string;
  formFactor?: "narrow" | "wide" | string;
  label?: string;
};

export type WebAppManifest = {
  name: string;
  shortName?: string;
  description?: string;
  id?: string;
  startUrl?: string;
  scope?: string;
  display?: "fullscreen" | "standalone" | "minimal-ui" | "browser";
  orientation?: "any" | "natural" | "landscape" | "portrait" | "portrait-primary" | "portrait-secondary" | "landscape-primary" | "landscape-secondary";
  themeColor?: string;
  backgroundColor?: string;
  lang?: string;
  dir?: "auto" | "ltr" | "rtl";
  categories?: readonly string[];
  icons?: readonly WebAppManifestIcon[];
  screenshots?: readonly WebAppManifestScreenshot[];
};

export type WebAppManifestAppOptions = {
  manifest: WebAppManifest;
  path?: string;
};

export type SecurityTxt = {
  contacts: readonly string[];
  expires: string | Date;
  canonical?: string | readonly string[];
  encryption?: string | readonly string[];
  acknowledgments?: string | readonly string[];
  policy?: string | readonly string[];
  hiring?: string | readonly string[];
  preferredLanguages?: readonly string[];
  csaf?: string | readonly string[];
  comments?: readonly string[];
};

export type SecurityTxtAppOptions = {
  security: SecurityTxt;
  path?: string;
};

export type Breadcrumb = {
  name: string;
  url?: string;
};

export type PredicatePair = {
  predicate: string;
  object: unknown;
};

export type SelectedCell = {
  cell: PredicatePair & {
    subject?: unknown;
  };
};

/** Source predicate pairs bucketed by their measured charge value, in the
 *  bedrock partition vocabulary: potential (truth side witnessed), active
 *  (the contrary holds), stable (held contradiction). */
export type FiniteAlgebra = {
  potential?: readonly PredicatePair[];
  active?: readonly PredicatePair[];
  stable?: readonly PredicatePair[];
};

export type MetadataPairStatus = Extract<ChargeValueName, "potential" | "active" | "stable">;

export type MetadataProjectionJudgment = Readonly<{
  name: "positive-seo-projection";
  value: ChargeValueName;
  reason: string;
  path: string;
}>;

export type MetadataProjection = Readonly<{
  kind: "web-page-metadata.projection";
  id: string;
  entries: readonly LessonEvidence[];
  utterances: readonly UtteranceCarrier[];
  settlement: LessonSettlement;
  judgments: readonly MetadataProjectionJudgment[];
  value: ChargeValueName;
  admitted: boolean;
}>;

export type MetadataProjectionCandidate = PredicatePair & {
  status: MetadataPairStatus;
  admitted: boolean;
  entries: readonly LessonEvidence[];
  utterances: readonly UtteranceCarrier[];
  settlement: LessonSettlement;
  projection: MetadataProjection;
};

export type PredicateRule = {
  field: string;
  repeatable?: boolean;
};

export const SCHEMA_CONTEXT = "https://schema.org";
export const ARTICLE_TYPES = ["Article", "BlogPosting", "NewsArticle", "TechArticle", "Report"] as const;
export const OG_TYPES = ["website", "article", "profile", "book", "music.song", "video.movie", "video.other"] as const;
export const TWITTER_CARDS = ["summary", "summary_large_image"] as const;

export const SCHEMA_PREDICATE_MAP: Record<string, PredicateRule> = {
  headline: { field: "headline" },
  title: { field: "headline" },
  name: { field: "headline" },
  description: { field: "description" },
  summary: { field: "description" },
  excerpt: { field: "description" },
  url: { field: "url" },
  permalink: { field: "url" },
  datePublished: { field: "datePublished" },
  published: { field: "datePublished" },
  date: { field: "datePublished" },
  dateModified: { field: "dateModified" },
  updated: { field: "dateModified" },
  modified: { field: "dateModified" },
  author: { field: "author" },
  publisher: { field: "publisher" },
  image: { field: "image", repeatable: true },
  photo: { field: "image", repeatable: true },
  keywords: { field: "keywords", repeatable: true },
  keyword: { field: "keywords", repeatable: true },
  tag: { field: "keywords", repeatable: true },
  tags: { field: "keywords", repeatable: true },
  category: { field: "keywords", repeatable: true },
};

export const META_PREDICATE_MAP: Record<string, PredicateRule> = {
  title: { field: "title" },
  headline: { field: "title" },
  name: { field: "title" },
  description: { field: "description" },
  summary: { field: "description" },
  excerpt: { field: "description" },
  url: { field: "url" },
  permalink: { field: "url" },
  image: { field: "image", repeatable: true },
  photo: { field: "image", repeatable: true },
  published: { field: "publishedTime" },
  datePublished: { field: "publishedTime" },
  date: { field: "publishedTime" },
  modified: { field: "modifiedTime" },
  dateModified: { field: "modifiedTime" },
  updated: { field: "modifiedTime" },
  author: { field: "author", repeatable: true },
  tag: { field: "tags", repeatable: true },
  tags: { field: "tags", repeatable: true },
  category: { field: "tags", repeatable: true },
  keyword: { field: "tags", repeatable: true },
  keywords: { field: "tags", repeatable: true },
  siteName: { field: "siteName" },
  site: { field: "site" },
  creator: { field: "creator" },
};

function instant(value: string, field: string): void {
  if (!Number.isFinite(Date.parse(value))) throw new TypeError(`${field} must be an RFC-3339 instant`);
}

function requireMetadata(metadata: PageMetadata): void {
  assertHttpUrl(metadata.url, "metadata.url");
  if (!metadata.title) throw new TypeError("metadata.title is required");
  if (metadata.author?.url) assertHttpUrl(metadata.author.url, "metadata.author.url");
  if (metadata.published) instant(metadata.published, "metadata.published");
  if (metadata.modified) instant(metadata.modified, "metadata.modified");
  for (const [index, image] of (metadata.images ?? []).entries()) {
    assertHttpUrl(image.url, `metadata.images[${index}].url`);
    if (image.width !== undefined && (!Number.isSafeInteger(image.width) || image.width <= 0)) {
      throw new RangeError(`metadata.images[${index}].width must be a positive integer`);
    }
    if (image.height !== undefined && (!Number.isSafeInteger(image.height) || image.height <= 0)) {
      throw new RangeError(`metadata.images[${index}].height must be a positive integer`);
    }
  }
}

export function languageTagFromLocale(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/_/g, "-");
  return normalized ? normalized : undefined;
}

function requireManifest(manifest: WebAppManifest): void {
  if (!manifest.name) throw new TypeError("manifest.name is required");
  for (const [index, icon] of (manifest.icons ?? []).entries()) {
    if (!icon.src) throw new TypeError(`manifest.icons[${index}].src is required`);
  }
  for (const [index, screenshot] of (manifest.screenshots ?? []).entries()) {
    if (!screenshot.src) throw new TypeError(`manifest.screenshots[${index}].src is required`);
  }
}

function oneOrMany(value: string | readonly string[] | undefined): readonly string[] {
  if (value === undefined) return [];
  if (typeof value === "string") {
    const item: string = value;
    return [item];
  }
  return [...value];
}

function assertUri(value: string, field: string): void {
  try {
    new URL(value);
  } catch {
    throw new TypeError(`${field} must be an absolute URI`);
  }
}

function assertFieldValue(value: string, field: string): void {
  if (!value || /[\r\n]/.test(value)) throw new TypeError(`${field} must be a single non-empty line`);
}

function rfc3339(value: string | Date, field: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.valueOf())) throw new TypeError(`${field} must be an RFC-3339 instant`);
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function requireSecurityTxt(security: SecurityTxt): void {
  if (!security.contacts.length) throw new TypeError("security.contacts must contain at least one URI");
  for (const [index, contact] of security.contacts.entries()) {
    assertFieldValue(contact, `security.contacts[${index}]`);
    assertUri(contact, `security.contacts[${index}]`);
  }
  rfc3339(security.expires, "security.expires");
  for (const field of ["canonical", "encryption", "acknowledgments", "policy", "hiring", "csaf"] as const) {
    for (const [index, value] of oneOrMany(security[field]).entries()) {
      assertFieldValue(value, `security.${field}[${index}]`);
      assertUri(value, `security.${field}[${index}]`);
    }
  }
  for (const [index, lang] of (security.preferredLanguages ?? []).entries()) {
    assertFieldValue(lang, `security.preferredLanguages[${index}]`);
  }
  for (const [index, comment] of (security.comments ?? []).entries()) {
    if (/[\r\n]/.test(comment)) throw new TypeError(`security.comments[${index}] must be a single line`);
  }
}

export function escapeScriptJson(value: string): string {
  return value
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function metaProperty(property: string, content: unknown): string {
  if (content === undefined || content === null || content === "") return "";
  return `<meta property="${escapeHtmlText(property)}" content="${escapeHtmlText(content)}">`;
}

function metaName(name: string, content: unknown): string {
  if (content === undefined || content === null || content === "") return "";
  return `<meta name="${escapeHtmlText(name)}" content="${escapeHtmlText(content)}">`;
}

export function metaTag(kind: "property" | "name", key: string, content: unknown): string {
  if (content === undefined || content === null || content === "") return "";
  return `<meta ${kind}="${escapeHtmlText(key)}" content="${escapeHtmlText(content)}">`;
}

function prune<T extends Record<string, unknown>>(object: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => {
    if (value === undefined || value === null || value === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }));
}

function list(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  const values = (Array.isArray(value) ? value : [value]).filter((item) => item !== undefined && item !== null && item !== "");
  if (values.length === 0) return undefined;
  return values.length === 1 ? values[0] : values;
}

export function person(value: MetadataPerson | undefined): Record<string, unknown> | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return prune({ "@type": "Person", name: value });
  return prune({
    "@type": "Person",
    name: value.name,
    url: value.url,
    image: value.image,
    email: value.email,
    sameAs: list(value.sameAs),
  });
}

export function organization(value: string | MetadataOrganization | undefined): Record<string, unknown> | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return prune({ "@type": "Organization", name: value });
  return prune({
    "@type": "Organization",
    name: value.name,
    url: value.url,
    logo: value.logo,
    sameAs: list(value.sameAs),
  });
}

export function article(props: Record<string, unknown> = {}): Record<string, unknown> {
  const type = props.type ?? "Article";
  const page = props.mainEntityOfPage ?? props.url;
  return prune({
    "@context": SCHEMA_CONTEXT,
    "@type": type,
    "@id": props.url,
    url: props.url,
    headline: props.headline,
    name: props.headline,
    description: props.description,
    mainEntityOfPage: page ? { "@type": "WebPage", "@id": page } : undefined,
    datePublished: props.datePublished,
    dateModified: props.dateModified,
    inLanguage: props.inLanguage,
    author: props.author === undefined ? undefined : person(props.author as MetadataPerson),
    publisher: props.publisher === undefined ? undefined : organization(props.publisher as string | MetadataOrganization),
    image: list(props.image),
    keywords: list(props.keywords),
    isPartOf: props.isPartOf,
  });
}

export function webSite(props: { name?: string; url?: string; description?: string; searchUrl?: string } = {}): Record<string, unknown> {
  return prune({
    "@context": SCHEMA_CONTEXT,
    "@type": "WebSite",
    name: props.name,
    url: props.url,
    description: props.description,
    potentialAction: props.searchUrl ? {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: props.searchUrl },
      "query-input": "required name=search_term_string",
    } : undefined,
  });
}

export function breadcrumbList(crumbs: readonly Breadcrumb[] = []): Record<string, unknown> {
  const items: Record<string, unknown>[] = [];
  for (const crumb of crumbs) {
    if (!crumb?.name) continue;
    items.push(prune({
      "@type": "ListItem",
      position: items.length + 1,
      name: crumb.name,
      item: crumb.url,
    }));
  }
  return prune({
    "@context": SCHEMA_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items,
  });
}

export function graph(...nodes: (Record<string, unknown> | undefined)[]): Record<string, unknown> | undefined {
  const present = nodes.filter((node): node is Record<string, unknown> => node !== undefined);
  if (present.length === 0) return undefined;
  if (present.length === 1) return present[0];
  return {
    "@context": SCHEMA_CONTEXT,
    "@graph": present.map((node) => {
      const { "@context": _context, ...rest } = node;
      return rest;
    }),
  };
}

export function stringifyLd(node: Record<string, unknown> | undefined, indent = 0): string {
  return node ? JSON.stringify(node, null, indent) : "";
}

export function ldScript(node: Record<string, unknown> | undefined, indent = 0): string {
  if (!node) return "";
  return `<script type="application/ld+json">${escapeScriptJson(stringifyLd(node, indent))}</script>`;
}

export function schemaOrgObject(metadata: PageMetadata): Record<string, unknown> {
  requireMetadata(metadata);
  const type = metadata.schemaType ?? (metadata.type === "profile" ? "ProfilePage" : metadata.type === "website" ? "WebPage" : "Article");
  const images = (metadata.images ?? []).map((image) => image.url);
  return article({
    type,
    url: metadata.url,
    headline: metadata.title,
    description: metadata.description,
    image: images,
    author: metadata.author,
    publisher: metadata.publisher,
    datePublished: metadata.published,
    dateModified: metadata.modified,
    inLanguage: languageTagFromLocale(metadata.locale),
    keywords: metadata.tags,
    ...(metadata.siteName ? { isPartOf: { "@type": "WebSite", name: metadata.siteName } } : {}),
  });
}

export function schemaOrgJson(metadata: PageMetadata): string {
  return `${JSON.stringify(schemaOrgObject(metadata), null, 2)}\n`;
}

export function schemaOrgScript(metadata: PageMetadata): string {
  return ldScript(schemaOrgObject(metadata), 2);
}

export function openGraphTags(metadata: PageMetadata): string {
  requireMetadata(metadata);
  const type = metadata.type ?? "article";
  const tags = [
    metaProperty("og:type", type),
    metaProperty("og:url", metadata.url),
    metaProperty("og:title", metadata.title),
    metaProperty("og:description", metadata.description),
    metaProperty("og:site_name", metadata.siteName),
    metaProperty("og:locale", metadata.locale),
    ...(metadata.images ?? []).flatMap((image) => [
      metaProperty("og:image", image.url),
      metaProperty("og:image:alt", image.alt),
      metaProperty("og:image:width", image.width),
      metaProperty("og:image:height", image.height),
      metaProperty("og:image:type", image.type),
    ]),
    metadata.author?.url ? metaProperty("article:author", metadata.author.url) : "",
    metaProperty("article:published_time", metadata.published),
    metaProperty("article:modified_time", metadata.modified),
    ...(metadata.tags ?? []).map((tag) => metaProperty("article:tag", tag)),
  ];
  return tags.filter(Boolean).join("\n");
}

export function twitterCardTags(metadata: PageMetadata): string {
  requireMetadata(metadata);
  const firstImage = metadata.images?.[0];
  const card = firstImage ? "summary_large_image" : "summary";
  return [
    metaName("twitter:card", card),
    metaName("twitter:title", metadata.title),
    metaName("twitter:description", metadata.description),
    firstImage ? metaName("twitter:image", firstImage.url) : "",
    firstImage?.alt ? metaName("twitter:image:alt", firstImage.alt) : "",
    metaName("twitter:site", metadata.twitterSite),
    metaName("twitter:creator", metadata.twitterCreator),
  ].filter(Boolean).join("\n");
}

function pushMetaTag(out: string[], kind: "property" | "name", key: string, value: unknown): void {
  const tag = metaTag(kind, key, value);
  if (tag) out.push(tag);
}

function pushEachMetaTag(out: string[], kind: "property" | "name", key: string, value: unknown): void {
  if (value === undefined || value === null) return;
  for (const item of Array.isArray(value) ? value : [value]) pushMetaTag(out, kind, key, item);
}

export function openGraphTagList(props: Record<string, unknown> = {}): string[] {
  const out: string[] = [];
  const type = props.type ?? "website";
  pushMetaTag(out, "property", "og:title", props.title);
  pushMetaTag(out, "property", "og:type", type);
  pushEachMetaTag(out, "property", "og:image", props.image);
  pushMetaTag(out, "property", "og:url", props.url);
  pushMetaTag(out, "property", "og:description", props.description);
  pushMetaTag(out, "property", "og:site_name", props.siteName);
  if (type === "article") {
    pushMetaTag(out, "property", "article:published_time", props.publishedTime);
    pushMetaTag(out, "property", "article:modified_time", props.modifiedTime);
    pushEachMetaTag(out, "property", "article:author", props.author);
    pushEachMetaTag(out, "property", "article:tag", props.tags);
  }
  return out;
}

export function twitterTagList(props: Record<string, unknown> = {}): string[] {
  const out: string[] = [];
  const images = Array.isArray(props.image) ? props.image : [props.image];
  const firstImage = images.find((image) => image !== undefined && image !== null && image !== "");
  const card = props.card ?? (firstImage ? "summary_large_image" : "summary");
  pushMetaTag(out, "name", "twitter:card", card);
  pushMetaTag(out, "name", "twitter:title", props.title);
  pushMetaTag(out, "name", "twitter:description", props.description);
  pushMetaTag(out, "name", "twitter:image", firstImage);
  pushMetaTag(out, "name", "twitter:site", props.site);
  pushMetaTag(out, "name", "twitter:creator", props.creator);
  return out;
}

export function socialMetaTags(props: Record<string, unknown> = {}): string[] {
  return [...openGraphTagList(props), ...twitterTagList(props)];
}

export function metaTagsString(tags: readonly string[]): string {
  return tags.join("\n");
}

export function foldProps(pairs: Iterable<PredicatePair>, map: Record<string, PredicateRule>): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const { predicate, object } of pairs) {
    const rule = map[predicate];
    if (!rule || object === undefined || object === null || object === "") continue;
    if (rule.repeatable) {
      const prior = props[rule.field];
      props[rule.field] = [...(Array.isArray(prior) ? prior : prior === undefined ? [] : [prior]), object];
    } else {
      props[rule.field] = object;
    }
  }
  return props;
}

export function foldSchemaProps(pairs: Iterable<PredicatePair>): Record<string, unknown> {
  return foldProps(pairs, SCHEMA_PREDICATE_MAP);
}

export function foldMetaProps(pairs: Iterable<PredicatePair>): Record<string, unknown> {
  return foldProps(pairs, META_PREDICATE_MAP);
}

const PROJECTION_PREDICATE = "positive-seo-projection";
const CONTRARY_PROJECTION_PREDICATE = "withheld-from-positive-seo-projection";

const PROJECTION_REASONS: Record<MetadataPairStatus, string> = {
  potential: "potential source predicate is admitted to the positive metadata projection",
  active: "active source predicate is withheld from the positive metadata projection",
  stable: "stable source predicate is a held contradiction, withheld from the positive metadata projection",
};

function projectionJudgment(status: MetadataPairStatus): { value: ChargeValueName; reason: string } {
  return { value: status, reason: PROJECTION_REASONS[status] };
}

/** The trace a projection decision leaves. A potential pair claims the
 *  projection predicate; an active pair claims the contrary predicate —
 *  its own claim, never a denial; a stable pair is a held contradiction
 *  and claims both. */
function metadataProjectionEntries(
  pair: PredicatePair,
  status: MetadataPairStatus,
  judgment: MetadataProjectionJudgment,
): readonly LessonEvidence[] {
  const entryOf = (predicate: string): LessonEvidence => Object.freeze({
    subject: `metadata:${pair.predicate}`,
    predicate,
    object: String(pair.object),
    provenance: Object.freeze({ status, reason: judgment.reason }),
  });
  if (status === "potential") return Object.freeze([entryOf(PROJECTION_PREDICATE)]);
  if (status === "active") return Object.freeze([entryOf(CONTRARY_PROJECTION_PREDICATE)]);
  return Object.freeze([entryOf(PROJECTION_PREDICATE), entryOf(CONTRARY_PROJECTION_PREDICATE)]);
}

export function metadataProjectionCandidate(
  pair: PredicatePair,
  status: MetadataPairStatus,
): MetadataProjectionCandidate {
  const projection = projectionJudgment(status);
  const id = `metadata-projection:${status}:${pair.predicate}:${JSON.stringify(pair.object)}`;
  const judgment = Object.freeze({
    name: "positive-seo-projection" as const,
    value: projection.value,
    reason: projection.reason,
    path: String(pair.predicate),
  });
  const entries = metadataProjectionEntries(pair, status, judgment);
  const utterances = utterEvidenceSet(entries);
  const settlement = settleLessonJudgments([judgment]);
  const metadataProjection = Object.freeze({
    kind: "web-page-metadata.projection" as const,
    id,
    entries,
    utterances,
    settlement,
    judgments: Object.freeze([judgment]),
    value: judgment.value,
    admitted: judgment.value === "potential",
  });
  return {
    predicate: pair.predicate,
    object: pair.object,
    status,
    admitted: metadataProjection.admitted,
    entries,
    utterances,
    settlement,
    projection: metadataProjection,
  };
}

export function metadataProjectionCandidatesFromFiniteAlgebra(algebra: FiniteAlgebra): MetadataProjectionCandidate[] {
  return [
    ...(algebra.potential ?? []).map((pair) => metadataProjectionCandidate(pair, "potential")),
    ...(algebra.active ?? []).map((pair) => metadataProjectionCandidate(pair, "active")),
    ...(algebra.stable ?? []).map((pair) => metadataProjectionCandidate(pair, "stable")),
  ];
}

export function admittedMetadataPairsFromFiniteAlgebra(algebra: FiniteAlgebra): PredicatePair[] {
  return metadataProjectionCandidatesFromFiniteAlgebra(algebra)
    .filter((item) => item.admitted)
    .map(({ predicate, object }) => ({ predicate, object }));
}

function pairsFromSelectedCells(cells: readonly SelectedCell[]): PredicatePair[] {
  return cells.map(({ cell }) => ({ predicate: String(cell.predicate), object: cell.object }));
}

export function articleFromFiniteAlgebra(algebra: FiniteAlgebra, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return article({ ...foldSchemaProps(admittedMetadataPairsFromFiniteAlgebra(algebra)), ...overrides });
}

export function articleFromSelectedCells(cells: readonly SelectedCell[], overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return article({ ...foldSchemaProps(pairsFromSelectedCells(cells)), ...overrides });
}

export function socialTagsFromFiniteAlgebra(algebra: FiniteAlgebra, overrides: Record<string, unknown> = {}): string[] {
  return socialMetaTags({ type: "article", ...foldMetaProps(admittedMetadataPairsFromFiniteAlgebra(algebra)), ...overrides });
}

export function socialTagsFromSelectedCells(cells: readonly SelectedCell[], overrides: Record<string, unknown> = {}): string[] {
  return socialMetaTags({ type: "article", ...foldMetaProps(pairsFromSelectedCells(cells)), ...overrides });
}

export function headFromFiniteAlgebra(
  algebra: FiniteAlgebra,
  options: {
    article?: Record<string, unknown>;
    meta?: Record<string, unknown>;
    site?: Parameters<typeof webSite>[0];
    breadcrumbs?: readonly Breadcrumb[];
    indent?: number;
  } = {},
): { jsonLd: Record<string, unknown> | undefined; jsonLdScript: string; metaTags: string[] } {
  const articleNode = articleFromFiniteAlgebra(algebra, options.article ?? {});
  const siteNode = options.site ? webSite(options.site) : undefined;
  const crumbsNode = options.breadcrumbs?.length ? breadcrumbList(options.breadcrumbs) : undefined;
  const jsonLd = graph(articleNode, siteNode, crumbsNode);
  return {
    jsonLd,
    jsonLdScript: ldScript(jsonLd, options.indent ?? 0),
    metaTags: socialTagsFromFiniteAlgebra(algebra, options.meta ?? {}),
  };
}

export function metadataHead(metadata: PageMetadata): string {
  const jsonLd = graph(
    schemaOrgObject(metadata),
    metadata.searchUrl || metadata.siteName ? webSite({
      ...(metadata.siteName !== undefined ? { name: metadata.siteName } : {}),
      url: metadata.url,
      ...(metadata.description !== undefined ? { description: metadata.description } : {}),
      ...(metadata.searchUrl !== undefined ? { searchUrl: metadata.searchUrl } : {}),
    }) : undefined,
    metadata.breadcrumbs?.length ? breadcrumbList(metadata.breadcrumbs) : undefined,
  );
  return [
    ldScript(jsonLd, 2),
    openGraphTags(metadata),
    twitterCardTags(metadata),
  ].filter(Boolean).join("\n");
}

function manifestIcon(icon: WebAppManifestIcon): Record<string, unknown> {
  return prune({
    src: icon.src,
    sizes: icon.sizes,
    type: icon.type,
    purpose: icon.purpose,
  });
}

function manifestScreenshot(screenshot: WebAppManifestScreenshot): Record<string, unknown> {
  return prune({
    src: screenshot.src,
    sizes: screenshot.sizes,
    type: screenshot.type,
    form_factor: screenshot.formFactor,
    label: screenshot.label,
  });
}

export function webAppManifestObject(manifest: WebAppManifest): Record<string, unknown> {
  requireManifest(manifest);
  return prune({
    name: manifest.name,
    short_name: manifest.shortName,
    description: manifest.description,
    id: manifest.id,
    start_url: manifest.startUrl ?? "/",
    scope: manifest.scope,
    display: manifest.display ?? "standalone",
    orientation: manifest.orientation,
    theme_color: manifest.themeColor,
    background_color: manifest.backgroundColor,
    lang: manifest.lang,
    dir: manifest.dir,
    categories: manifest.categories,
    icons: manifest.icons?.map(manifestIcon),
    screenshots: manifest.screenshots?.map(manifestScreenshot),
  });
}

export function webAppManifestJson(manifest: WebAppManifest): string {
  return `${JSON.stringify(webAppManifestObject(manifest), null, 2)}\n`;
}

export function webAppManifestLink(path = "/site.webmanifest"): string {
  return `<link rel="manifest" href="${escapeHtmlText(path)}">`;
}

function pushSecurityLines(lines: string[], field: string, values: readonly string[]): void {
  for (const value of values) lines.push(`${field}: ${value}`);
}

export function securityTxt(security: SecurityTxt): string {
  requireSecurityTxt(security);
  const lines: string[] = [];
  for (const comment of security.comments ?? []) lines.push(`# ${comment}`);
  if (lines.length) lines.push("");
  pushSecurityLines(lines, "Contact", security.contacts);
  lines.push(`Expires: ${rfc3339(security.expires, "security.expires")}`);
  pushSecurityLines(lines, "Encryption", oneOrMany(security.encryption));
  pushSecurityLines(lines, "Acknowledgments", oneOrMany(security.acknowledgments));
  pushSecurityLines(lines, "Policy", oneOrMany(security.policy));
  pushSecurityLines(lines, "Hiring", oneOrMany(security.hiring));
  if (security.preferredLanguages?.length) lines.push(`Preferred-Languages: ${security.preferredLanguages.join(", ")}`);
  pushSecurityLines(lines, "Canonical", oneOrMany(security.canonical));
  pushSecurityLines(lines, "CSAF", oneOrMany(security.csaf));
  return `${lines.join("\n")}\n`;
}

function repr(body: string, type = "application/ld+json; charset=utf-8"): Repr {
  return {
    type,
    cacheControl: { visibility: "public", maxAge: 300 },
    body,
  };
}

function languages(language: string | undefined): Pick<Resource, "languages"> | Record<string, never> {
  return language ? { languages: [language] } : {};
}

export function metadataApp(options: MetadataAppOptions): App {
  const path = options.path ?? "/metadata.jsonld";
  const language = languageTagFromLocale(options.metadata.locale);
  return {
    resources: [
      {
        match: path,
        route: path,
        id: "page-metadata.schema-org",
        name: "Page Metadata",
        methods: ["GET"],
        produces: ["application/ld+json", "application/json"],
        ...languages(language),
        handler: () => repr(schemaOrgJson(options.metadata)),
      },
    ],
  };
}

export function webAppManifestApp(options: WebAppManifestAppOptions): App {
  const path = options.path ?? "/site.webmanifest";
  return {
    resources: [
      {
        match: path,
        route: path,
        id: "page-metadata.web-app-manifest",
        name: "Web App Manifest",
        methods: ["GET"],
        produces: ["application/manifest+json", "application/json"],
        ...languages(options.manifest.lang),
        handler: () => repr(webAppManifestJson(options.manifest), "application/manifest+json; charset=utf-8"),
      },
    ],
  };
}

export function securityTxtApp(options: SecurityTxtAppOptions): App {
  const path = options.path ?? "/.well-known/security.txt";
  return {
    resources: [
      {
        match: path,
        route: path,
        id: "page-metadata.security-txt",
        name: "Security Contact Policy",
        methods: ["GET"],
        produces: ["text/plain"],
        handler: () => repr(securityTxt(options.security), "text/plain; charset=utf-8"),
      },
    ],
  };
}
