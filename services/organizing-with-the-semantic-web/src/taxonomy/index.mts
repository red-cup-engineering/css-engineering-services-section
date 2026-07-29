import type { App, Repr, Resource } from "@red-cup-engineering/relating/services/http";
import { assertHttpUrl, escapeHtmlText } from "@red-cup-engineering/producing-content/codecs/feed";
import { pageLinksNav } from "@red-cup-engineering/organizing-with-the-web/pagination";

export type TaxonomyItem = {
  id: string;
  url: string;
  title: string;
  summary?: string;
  published?: string;
  updated?: string;
  terms: Record<string, readonly string[]>;
};

export type TaxonomyPredicate = "category" | "tag" | "author" | "p-category" | (string & {});

export type TaxonomyCellValue = "potential" | "active" | "stable" | "absurd";

export type PredicateObject = {
  predicate: string;
  object: string;
};

export type FiniteAlgebra = {
  subject: string;
  potential?: readonly PredicateObject[];
  active?: readonly PredicateObject[];
  stable?: readonly PredicateObject[];
};

export type TaxonomyRelationTerm = {
  predicate: string;
  object: string;
};

export type TaxonomyRelation = {
  subjects: readonly string[];
  terms: readonly TaxonomyRelationTerm[];
  at(subject: string, term: TaxonomyRelationTerm): TaxonomyCellValue;
};

export type TaxonomyMember = {
  subject: string;
  contested: boolean;
};

export type RelatedSubject = {
  subject: string;
  shared: number;
};

export type TaxonomyTerm = {
  scheme: string;
  term: string;
  slug: string;
  count: number;
  items: readonly TaxonomyItem[];
};

export type TaxonomyIndex = {
  schemes: readonly string[];
  terms: readonly TaxonomyTerm[];
};

export type ArchivePage = {
  scheme: string;
  term: string;
  slug: string;
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  items: readonly TaxonomyItem[];
  links: {
    self: string;
    first: string;
    previous?: string;
    next?: string;
    last: string;
  };
};

export type TaxonomyAppOptions = {
  items: readonly TaxonomyItem[];
  baseUrl: string;
  pageSize?: number;
  paths?: {
    index?: string;
    archive?: string;
  };
};

function instant(value: string, field: string): void {
  if (!Number.isFinite(Date.parse(value))) throw new TypeError(`${field} must be an RFC-3339 instant`);
}

function requireItem(item: TaxonomyItem): void {
  if (!item.id) throw new TypeError("item.id is required");
  assertHttpUrl(item.url, "item.url");
  if (!item.title) throw new TypeError("item.title is required");
  if (item.published) instant(item.published, "item.published");
  if (item.updated) instant(item.updated, "item.updated");
}

function requireItems(items: readonly TaxonomyItem[]): void {
  for (const item of items) requireItem(item);
}

export function slugTerm(term: string): string {
  return encodeURIComponent(term.trim().toLowerCase().replace(/\s+/g, "-"));
}

function indexTermKey(scheme: string, slug: string): string {
  return `${scheme}\u0000${slug}`;
}

const DEFAULT_TAXONOMY_PREDICATES = Object.freeze(["category", "tag", "author", "p-category"] as const);
const RELATION_SEPARATOR = "\u0001";

function relationTermKey(predicate: string, object: string): string {
  return `${predicate}${RELATION_SEPARATOR}${object}`;
}

function splitRelationTermKey(key: string): TaxonomyRelationTerm {
  const index = key.indexOf(RELATION_SEPARATOR);
  return index === -1
    ? { predicate: key, object: "" }
    : { predicate: key.slice(0, index), object: key.slice(index + 1) };
}

function normalizeRelationTerm(term: TaxonomyRelationTerm): TaxonomyRelationTerm {
  return {
    predicate: term.predicate,
    object: String(term.object),
  };
}

function mergeCell(current: TaxonomyCellValue | undefined, incoming: TaxonomyCellValue): TaxonomyCellValue {
  if (incoming === "stable" || current === "stable") return "stable";
  if (current === undefined || current === "absurd") return incoming;
  if (incoming === "absurd") return current;
  return current === incoming ? current : "stable";
}

function sortedItems(items: readonly TaxonomyItem[]): TaxonomyItem[] {
  return [...items].sort((a, b) => {
    const dateA = a.updated ?? a.published ?? "";
    const dateB = b.updated ?? b.published ?? "";
    return dateA === dateB ? a.title.localeCompare(b.title) : dateB.localeCompare(dateA);
  });
}

export function taxonomyIndex(items: readonly TaxonomyItem[]): TaxonomyIndex {
  requireItems(items);
  const schemes = new Set<string>();
  const terms = new Map<string, { scheme: string; term: string; slug: string; items: TaxonomyItem[] }>();
  for (const item of items) {
    for (const [scheme, values] of Object.entries(item.terms)) {
      if (!scheme) throw new TypeError("taxonomy scheme is required");
      schemes.add(scheme);
      for (const term of values) {
        if (!term) continue;
        const slug = slugTerm(term);
        const key = indexTermKey(scheme, slug);
        const existing = terms.get(key) ?? { scheme, term, slug, items: [] };
        existing.items.push(item);
        terms.set(key, existing);
      }
    }
  }
  return {
    schemes: [...schemes].sort(),
    terms: [...terms.values()]
      .map((entry) => ({
        scheme: entry.scheme,
        term: entry.term,
        slug: entry.slug,
        count: entry.items.length,
        items: sortedItems(entry.items),
      }))
      .sort((a, b) => a.scheme === b.scheme ? a.term.localeCompare(b.term) : a.scheme.localeCompare(b.scheme)),
  };
}

export function buildTaxonomy(
  algebras: readonly FiniteAlgebra[],
  options: { predicates?: readonly string[] } = {},
): TaxonomyRelation {
  const predicates = new Set(options.predicates?.length ? options.predicates : DEFAULT_TAXONOMY_PREDICATES);
  const subjects: string[] = [];
  const termMeta = new Map<string, TaxonomyRelationTerm>();
  const subjectFibers = new Map<string, Map<string, TaxonomyCellValue>>();

  const put = (subject: string, cell: PredicateObject, value: TaxonomyCellValue): void => {
    if (!predicates.has(cell.predicate)) return;
    const term = normalizeRelationTerm(cell);
    const key = relationTermKey(term.predicate, term.object);
    termMeta.set(key, term);
    const subjectFiber = subjectFibers.get(subject) ?? new Map<string, TaxonomyCellValue>();
    subjectFiber.set(key, mergeCell(subjectFiber.get(key), value));
    subjectFibers.set(subject, subjectFiber);
  };

  for (const algebra of algebras) {
    if (!algebra.subject) throw new TypeError("finite algebra subject is required");
    subjects.push(algebra.subject);
    subjectFibers.set(algebra.subject, subjectFibers.get(algebra.subject) ?? new Map());
    for (const cell of algebra.potential ?? []) put(algebra.subject, cell, "potential");
    for (const cell of algebra.active ?? []) put(algebra.subject, cell, "active");
    for (const cell of algebra.stable ?? []) put(algebra.subject, cell, "stable");
  }

  const relationTerms = [...termMeta.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, term]) => term);

  return Object.freeze({
    subjects: Object.freeze([...subjects]),
    terms: Object.freeze(relationTerms),
    at(subject: string, term: TaxonomyRelationTerm): TaxonomyCellValue {
      const normalized = normalizeRelationTerm(term);
      return subjectFibers.get(subject)?.get(relationTermKey(normalized.predicate, normalized.object)) ?? "absurd";
    },
  });
}

export function members(taxonomy: TaxonomyRelation, term: TaxonomyRelationTerm): string[] {
  return taxonomy.subjects.filter((subject) => taxonomy.at(subject, term) === "potential");
}

export function membersWithContested(taxonomy: TaxonomyRelation, term: TaxonomyRelationTerm): TaxonomyMember[] {
  return taxonomy.subjects.flatMap<TaxonomyMember>((subject) => {
    const value = taxonomy.at(subject, term);
    if (value === "potential") return [{ subject, contested: false }];
    if (value === "stable") return [{ subject, contested: true }];
    return [];
  });
}

export function termsOf(taxonomy: TaxonomyRelation, subject: string): TaxonomyRelationTerm[] {
  return taxonomy.terms.filter((term) => taxonomy.at(subject, term) === "potential");
}

export function termsByPredicate(taxonomy: TaxonomyRelation): Map<string, TaxonomyRelationTerm[]> {
  const out = new Map<string, TaxonomyRelationTerm[]>();
  for (const term of taxonomy.terms) {
    const terms = out.get(term.predicate) ?? [];
    terms.push(term);
    out.set(term.predicate, terms);
  }
  return out;
}

export function related(taxonomy: TaxonomyRelation, subject: string): RelatedSubject[] {
  const mine = new Set(termsOf(taxonomy, subject).map((term) => relationTermKey(term.predicate, term.object)));
  return taxonomy.subjects
    .filter((candidate) => candidate !== subject)
    .map((candidate) => {
      const shared = termsOf(taxonomy, candidate)
        .filter((term) => mine.has(relationTermKey(term.predicate, term.object)))
        .length;
      return { subject: candidate, shared };
    })
    .filter((entry) => entry.shared > 0)
    .sort((a, b) => b.shared - a.shared || a.subject.localeCompare(b.subject));
}

function findTerm(index: TaxonomyIndex, scheme: string, termOrSlug: string): TaxonomyTerm | undefined {
  const wanted = slugTerm(termOrSlug);
  return index.terms.find((term) => term.scheme === scheme && term.slug === wanted);
}

function pageUrl(baseUrl: string, archivePattern: string, scheme: string, slug: string, page: number): string {
  const path = archivePattern
    .replace(":scheme", encodeURIComponent(scheme))
    .replace(":term", encodeURIComponent(slug));
  const url = new URL(path, baseUrl);
  url.searchParams.set("page", String(page));
  return url.href;
}

export function archivePage(
  index: TaxonomyIndex,
  scheme: string,
  termOrSlug: string,
  opts: { baseUrl: string; archivePath?: string; page?: number; pageSize?: number },
): ArchivePage | null {
  assertHttpUrl(opts.baseUrl, "baseUrl");
  const term = findTerm(index, scheme, termOrSlug);
  if (!term) return null;
  const pageSize = opts.pageSize ?? 20;
  if (!Number.isSafeInteger(pageSize) || pageSize <= 0) throw new RangeError("pageSize must be a positive integer");
  const totalPages = Math.max(1, Math.ceil(term.items.length / pageSize));
  const page = Math.min(Math.max(opts.page ?? 1, 1), totalPages);
  const start = (page - 1) * pageSize;
  const archivePath = opts.archivePath ?? "/taxonomy/:scheme/:term";
  return {
    scheme,
    term: term.term,
    slug: term.slug,
    page,
    pageSize,
    totalPages,
    totalItems: term.items.length,
    items: term.items.slice(start, start + pageSize),
    links: {
      self: pageUrl(opts.baseUrl, archivePath, scheme, term.slug, page),
      first: pageUrl(opts.baseUrl, archivePath, scheme, term.slug, 1),
      ...(page > 1 ? { previous: pageUrl(opts.baseUrl, archivePath, scheme, term.slug, page - 1) } : {}),
      ...(page < totalPages ? { next: pageUrl(opts.baseUrl, archivePath, scheme, term.slug, page + 1) } : {}),
      last: pageUrl(opts.baseUrl, archivePath, scheme, term.slug, totalPages),
    },
  };
}

export function relatedItems(target: TaxonomyItem, items: readonly TaxonomyItem[], limit = 5): readonly TaxonomyItem[] {
  requireItem(target);
  requireItems(items);
  const targetTerms = new Set(Object.entries(target.terms).flatMap(([scheme, values]) => values.map((value) => indexTermKey(scheme, slugTerm(value)))));
  return items
    .filter((item) => item.id !== target.id)
    .map((item) => {
      const score = Object.entries(item.terms).reduce((total, [scheme, values]) => {
        return total + values.filter((value) => targetTerms.has(indexTermKey(scheme, slugTerm(value)))).length;
      }, 0);
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit)
    .map((entry) => entry.item);
}

export function archiveHtml(page: ArchivePage): string {
  const nav = pageLinksNav(page.links);
  const items = page.items.map((item) => [
    `<article class="taxonomy-item">`,
    `  <h2><a href="${escapeHtmlText(item.url)}">${escapeHtmlText(item.title)}</a></h2>`,
    item.summary ? `  <p>${escapeHtmlText(item.summary)}</p>` : "",
    item.published ? `  <time datetime="${escapeHtmlText(item.published)}">${escapeHtmlText(item.published)}</time>` : "",
    `</article>`,
  ].filter(Boolean).join("\n")).join("\n");
  return [
    `<section class="taxonomy-archive" data-scheme="${escapeHtmlText(page.scheme)}" data-term="${escapeHtmlText(page.term)}">`,
    `  <h1>${escapeHtmlText(page.scheme)}: ${escapeHtmlText(page.term)}</h1>`,
    `  <p>${page.totalItems} item${page.totalItems === 1 ? "" : "s"}</p>`,
    `  ${nav}`,
    items,
    `  ${nav}`,
    `</section>`,
  ].join("\n");
}

function repr(type: string, body: string): Repr {
  return {
    type,
    cacheControl: { visibility: "public", maxAge: 300 },
    body,
  };
}

export function taxonomyApp(options: TaxonomyAppOptions): App {
  assertHttpUrl(options.baseUrl, "baseUrl");
  const paths = {
    index: "/taxonomy.json",
    archive: "/taxonomy/:scheme/:term",
    ...(options.paths ?? {}),
  };
  const index = taxonomyIndex(options.items);
  const archiveResource: Resource = {
    match: paths.archive,
    route: paths.archive,
    id: "taxonomy.archive",
    name: "Taxonomy Archive",
    methods: ["GET"],
    produces: ["text/html", "application/json"],
    handler: (ctx) => {
      const parsedPage = Number.parseInt(ctx.url.searchParams.get("page") ?? "1", 10);
      const archiveOptions: { baseUrl: string; archivePath?: string; page?: number; pageSize?: number } = {
        baseUrl: options.baseUrl,
        archivePath: paths.archive,
        page: Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
      };
      if (options.pageSize !== undefined) archiveOptions.pageSize = options.pageSize;
      const page = archivePage(index, ctx.params.scheme ?? "", ctx.params.term ?? "", archiveOptions);
      if (!page) {
        return { ...repr("text/plain; charset=utf-8", "Not Found"), status: 404 };
      }
      if (ctx.negotiatedType === "application/json") {
        return repr("application/json; charset=utf-8", `${JSON.stringify(page, null, 2)}\n`);
      }
      return repr("text/html; charset=utf-8", archiveHtml(page));
    },
  };
  return {
    resources: [
      {
        match: paths.index,
        route: paths.index,
        id: "taxonomy.index",
        name: "Taxonomy Index",
        methods: ["GET"],
        produces: ["application/json"],
        handler: () => repr("application/json; charset=utf-8", `${JSON.stringify(index, null, 2)}\n`),
      },
      archiveResource,
    ],
  };
}
