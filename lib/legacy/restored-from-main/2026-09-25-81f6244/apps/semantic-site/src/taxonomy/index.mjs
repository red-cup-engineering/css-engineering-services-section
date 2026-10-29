import { assertHttpUrl, escapeHtmlText } from "@red-cup-engineering/computer-data-serialization-services-section/web-feed";
import { pageLinksNav } from "@red-cup-engineering/computer-data-serialization-services-section/pagination-html";
function instant(value, field) {
    if (!Number.isFinite(Date.parse(value)))
        throw new TypeError(`${field} must be an RFC-3339 instant`);
}
function requireItem(item) {
    if (!item.id)
        throw new TypeError("item.id is required");
    assertHttpUrl(item.url, "item.url");
    if (!item.title)
        throw new TypeError("item.title is required");
    if (item.published)
        instant(item.published, "item.published");
    if (item.updated)
        instant(item.updated, "item.updated");
}
function requireItems(items) {
    for (const item of items)
        requireItem(item);
}
export function slugTerm(term) {
    return encodeURIComponent(term.trim().toLowerCase().replace(/\s+/g, "-"));
}
function indexTermKey(scheme, slug) {
    return `${scheme}\u0000${slug}`;
}
const DEFAULT_TAXONOMY_PREDICATES = Object.freeze(["category", "tag", "author", "p-category"]);
const RELATION_SEPARATOR = "\u0001";
function relationTermKey(predicate, object) {
    return `${predicate}${RELATION_SEPARATOR}${object}`;
}
function splitRelationTermKey(key) {
    const index = key.indexOf(RELATION_SEPARATOR);
    return index === -1
        ? { predicate: key, object: "" }
        : { predicate: key.slice(0, index), object: key.slice(index + 1) };
}
function normalizeRelationTerm(term) {
    return {
        predicate: term.predicate,
        object: String(term.object),
    };
}
function mergeCell(current, incoming) {
    if (incoming === "stable" || current === "stable")
        return "stable";
    if (current === undefined || current === "absurd")
        return incoming;
    if (incoming === "absurd")
        return current;
    return current === incoming ? current : "stable";
}
function sortedItems(items) {
    return [...items].sort((a, b) => {
        const dateA = a.updated ?? a.published ?? "";
        const dateB = b.updated ?? b.published ?? "";
        return dateA === dateB ? a.title.localeCompare(b.title) : dateB.localeCompare(dateA);
    });
}
export function taxonomyIndex(items) {
    requireItems(items);
    const schemes = new Set();
    const terms = new Map();
    for (const item of items) {
        for (const [scheme, values] of Object.entries(item.terms)) {
            if (!scheme)
                throw new TypeError("taxonomy scheme is required");
            schemes.add(scheme);
            for (const term of values) {
                if (!term)
                    continue;
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
export function buildTaxonomy(algebras, options = {}) {
    const predicates = new Set(options.predicates?.length ? options.predicates : DEFAULT_TAXONOMY_PREDICATES);
    const subjects = [];
    const termMeta = new Map();
    const subjectFibers = new Map();
    const put = (subject, cell, value) => {
        if (!predicates.has(cell.predicate))
            return;
        const term = normalizeRelationTerm(cell);
        const key = relationTermKey(term.predicate, term.object);
        termMeta.set(key, term);
        const subjectFiber = subjectFibers.get(subject) ?? new Map();
        subjectFiber.set(key, mergeCell(subjectFiber.get(key), value));
        subjectFibers.set(subject, subjectFiber);
    };
    for (const algebra of algebras) {
        if (!algebra.subject)
            throw new TypeError("finite algebra subject is required");
        subjects.push(algebra.subject);
        subjectFibers.set(algebra.subject, subjectFibers.get(algebra.subject) ?? new Map());
        for (const cell of algebra.potential ?? [])
            put(algebra.subject, cell, "potential");
        for (const cell of algebra.active ?? [])
            put(algebra.subject, cell, "active");
        for (const cell of algebra.stable ?? [])
            put(algebra.subject, cell, "stable");
    }
    const relationTerms = [...termMeta.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, term]) => term);
    return Object.freeze({
        subjects: Object.freeze([...subjects]),
        terms: Object.freeze(relationTerms),
        at(subject, term) {
            const normalized = normalizeRelationTerm(term);
            return subjectFibers.get(subject)?.get(relationTermKey(normalized.predicate, normalized.object)) ?? "absurd";
        },
    });
}
export function members(taxonomy, term) {
    return taxonomy.subjects.filter((subject) => taxonomy.at(subject, term) === "potential");
}
export function membersWithContested(taxonomy, term) {
    return taxonomy.subjects.flatMap((subject) => {
        const value = taxonomy.at(subject, term);
        if (value === "potential")
            return [{ subject, contested: false }];
        if (value === "stable")
            return [{ subject, contested: true }];
        return [];
    });
}
export function termsOf(taxonomy, subject) {
    return taxonomy.terms.filter((term) => taxonomy.at(subject, term) === "potential");
}
export function termsByPredicate(taxonomy) {
    const out = new Map();
    for (const term of taxonomy.terms) {
        const terms = out.get(term.predicate) ?? [];
        terms.push(term);
        out.set(term.predicate, terms);
    }
    return out;
}
export function related(taxonomy, subject) {
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
function findTerm(index, scheme, termOrSlug) {
    const wanted = slugTerm(termOrSlug);
    return index.terms.find((term) => term.scheme === scheme && term.slug === wanted);
}
function pageUrl(baseUrl, archivePattern, scheme, slug, page) {
    const path = archivePattern
        .replace(":scheme", encodeURIComponent(scheme))
        .replace(":term", encodeURIComponent(slug));
    const url = new URL(path, baseUrl);
    url.searchParams.set("page", String(page));
    return url.href;
}
export function archivePage(index, scheme, termOrSlug, opts) {
    assertHttpUrl(opts.baseUrl, "baseUrl");
    const term = findTerm(index, scheme, termOrSlug);
    if (!term)
        return null;
    const pageSize = opts.pageSize ?? 20;
    if (!Number.isSafeInteger(pageSize) || pageSize <= 0)
        throw new RangeError("pageSize must be a positive integer");
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
export function relatedItems(target, items, limit = 5) {
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
export function archiveHtml(page) {
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
function repr(type, body) {
    return {
        type,
        cacheControl: { visibility: "public", maxAge: 300 },
        body,
    };
}
export function taxonomyApp(options) {
    assertHttpUrl(options.baseUrl, "baseUrl");
    const paths = {
        index: "/taxonomy.json",
        archive: "/taxonomy/:scheme/:term",
        ...(options.paths ?? {}),
    };
    const index = taxonomyIndex(options.items);
    const archiveResource = {
        match: paths.archive,
        route: paths.archive,
        id: "taxonomy.archive",
        name: "Taxonomy Archive",
        methods: ["GET"],
        produces: ["text/html", "application/json"],
        handler: (ctx) => {
            const parsedPage = Number.parseInt(ctx.url.searchParams.get("page") ?? "1", 10);
            const archiveOptions = {
                baseUrl: options.baseUrl,
                archivePath: paths.archive,
                page: Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
            };
            if (options.pageSize !== undefined)
                archiveOptions.pageSize = options.pageSize;
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
