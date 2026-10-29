import { linkHeader } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/link";
import { linkedDataSubject, toJsonLd, toTurtle, } from "../linked-data/index.mjs";
const DEFAULT_LIMIT = 200;
const DEFAULT_MAX_LIMIT = 1000;
const JSON_TYPE = "application/json; charset=utf-8";
const JSONLD_TYPE = "application/ld+json; charset=utf-8";
const TURTLE_TYPE = "text/turtle; charset=utf-8";
function subjectLogs(world) {
    const entries = world instanceof Map
        ? [...world.entries()]
        : world !== null && typeof world === "object" ? Object.entries(world) : [];
    return entries
        .filter(([subject, assertions]) => !subject.startsWith("absurd:") && Array.isArray(assertions))
        .sort(([left], [right]) => left.localeCompare(right));
}
function witnessValue(value) {
    return value === undefined ? null : value;
}
function cell(predicate, object, witness) {
    const out = { predicate, object };
    if (typeof witness === "string" || Array.isArray(witness))
        out.citation = witness;
    return Object.freeze(out);
}
function stableCell(record) {
    const out = {
        predicate: record.predicate,
        object: record.object,
    };
    if (typeof record.claimedBy === "string" || Array.isArray(record.claimedBy))
        out.claimedBy = record.claimedBy;
    if (typeof record.contraryClaimedBy === "string" || Array.isArray(record.contraryClaimedBy))
        out.contraryClaimedBy = record.contraryClaimedBy;
    return Object.freeze(out);
}
// The states are the measured charge value names: every admitted claim is a
// potential cell; active and stable are derived reads across declared
// contrary predicate pairs (see @emsenn/web-linked-data).
export function allTriples(world, opts = {}) {
    const out = [];
    for (const [subject, assertions] of subjectLogs(world)) {
        const derived = linkedDataSubject(subject, assertions, opts.fold ?? {});
        for (const derivedCell of derived.potential) {
            out.push(Object.freeze({
                subject,
                predicate: derivedCell.predicate,
                object: derivedCell.object,
                state: "potential",
                witness: witnessValue(derivedCell.citation),
            }));
        }
        for (const derivedCell of derived.active) {
            out.push(Object.freeze({
                subject,
                predicate: derivedCell.predicate,
                object: derivedCell.object,
                state: "active",
                witness: witnessValue(derivedCell.citation),
            }));
        }
        for (const derivedCell of derived.stable) {
            const claimedBy = witnessValue(derivedCell.claimedBy);
            const contraryClaimedBy = witnessValue(derivedCell.contraryClaimedBy);
            out.push(Object.freeze({
                subject,
                predicate: derivedCell.predicate,
                object: derivedCell.object,
                state: "stable",
                witness: Object.freeze([...witnessItems(claimedBy), ...witnessItems(contraryClaimedBy)]),
                ...(claimedBy !== null ? { claimedBy } : {}),
                ...(contraryClaimedBy !== null ? { contraryClaimedBy } : {}),
            }));
        }
    }
    return Object.freeze(out.sort((left, right) => JSON.stringify([left.subject, left.predicate, left.object, left.state])
        .localeCompare(JSON.stringify([right.subject, right.predicate, right.object, right.state]))));
}
function witnessItems(value) {
    if (value == null)
        return [];
    return typeof value === "string" ? [value] : [...value];
}
function witnessMatches(record, wanted) {
    return witnessItems(record.witness).includes(wanted)
        || witnessItems(record.claimedBy).includes(wanted)
        || witnessItems(record.contraryClaimedBy).includes(wanted);
}
export function tripleMatches(record, pattern = {}) {
    if (pattern.s && record.subject !== pattern.s)
        return false;
    if (pattern.p && record.predicate !== pattern.p)
        return false;
    if (pattern.o && String(record.object) !== pattern.o)
        return false;
    if (pattern.state && record.state !== pattern.state)
        return false;
    if (pattern.witness && !witnessMatches(record, pattern.witness))
        return false;
    return true;
}
export function queryTriples(world, pattern = {}, opts = {}) {
    const limit = clampLimit(opts.limit, opts.maxLimit);
    const allOpts = opts.fold === undefined ? {} : { fold: opts.fold };
    const matched = allTriples(world, allOpts).filter((record) => tripleMatches(record, pattern));
    const totalItems = matched.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const page = clampPage(opts.page, totalPages);
    const start = (page - 1) * limit;
    const triples = Object.freeze(matched.slice(start, start + limit));
    const base = opts.base ?? "http://localhost/";
    const path = opts.path ?? "/query";
    return Object.freeze({
        query: Object.freeze({
            page,
            limit,
            maxLimit: opts.maxLimit ?? DEFAULT_MAX_LIMIT,
            ...pattern,
        }),
        totalItems,
        totalPages,
        page,
        limit,
        triples,
        links: pageLinks(base, path, pattern, page, limit, totalPages),
    });
}
function clampLimit(limit, maxLimit = DEFAULT_MAX_LIMIT) {
    if (limit === undefined)
        return DEFAULT_LIMIT;
    if (!Number.isSafeInteger(limit) || limit <= 0)
        return DEFAULT_LIMIT;
    return Math.min(limit, maxLimit);
}
function clampPage(page, totalPages) {
    if (page === undefined || !Number.isSafeInteger(page) || page <= 0)
        return 1;
    return Math.min(page, totalPages);
}
function pageLinks(base, path, pattern, page, limit, totalPages) {
    const at = (target) => {
        const url = new URL(path, base);
        for (const [key, value] of Object.entries(pattern)) {
            if (value)
                url.searchParams.set(key, String(value));
        }
        url.searchParams.set("page", String(target));
        url.searchParams.set("limit", String(limit));
        return url.href;
    };
    return Object.freeze({
        self: at(page),
        first: at(1),
        last: at(totalPages),
        ...(page > 1 ? { previous: at(page - 1) } : {}),
        ...(page < totalPages ? { next: at(page + 1) } : {}),
    });
}
export function fragmentJson(page) {
    return {
        query: page.query,
        count: page.triples.length,
        totalItems: page.totalItems,
        totalPages: page.totalPages,
        page: page.page,
        limit: page.limit,
        links: page.links,
        triples: page.triples,
    };
}
export function fragmentJsonLd(page, opts = {}) {
    const base = opts.base ?? "http://localhost/";
    return {
        "@context": {
            hydra: "http://www.w3.org/ns/hydra/core#",
            void: "http://rdfs.org/ns/void#",
            tpf: "http://www.w3.org/ns/hydra/core#",
            subject: "http://www.w3.org/1999/02/22-rdf-syntax-ns#subject",
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#predicate",
            object: "http://www.w3.org/1999/02/22-rdf-syntax-ns#object",
            state: "https://561.group/vocab#state",
            witness: "http://www.w3.org/ns/prov#wasDerivedFrom",
        },
        "@id": page.links.self,
        "@type": ["hydra:Collection", "hydra:PagedCollection"],
        "hydra:totalItems": page.totalItems,
        "void:triples": page.totalItems,
        "hydra:itemsPerPage": page.limit,
        "hydra:first": { "@id": page.links.first },
        "hydra:last": { "@id": page.links.last },
        ...(page.links.previous ? { "hydra:previous": { "@id": page.links.previous } } : {}),
        ...(page.links.next ? { "hydra:next": { "@id": page.links.next } } : {}),
        "hydra:search": searchTemplate(page.links.self),
        "hydra:member": page.triples.map((record) => tripleJsonLd(record, base)),
    };
}
function searchTemplate(self) {
    const url = new URL(self);
    url.search = "";
    return {
        "@type": "hydra:IriTemplate",
        "hydra:template": `${url.href}{?s,p,o,state,witness,page,limit}`,
        "hydra:mapping": [
            mapping("s", "rdf:subject"),
            mapping("p", "rdf:predicate"),
            mapping("o", "rdf:object"),
            mapping("state", "https://561.group/vocab#state"),
            mapping("witness", "prov:wasDerivedFrom"),
            mapping("page", "hydra:pageIndex"),
            mapping("limit", "hydra:limit"),
        ],
    };
}
function mapping(variable, property) {
    return { "@type": "hydra:IriTemplateMapping", "hydra:variable": variable, "hydra:property": property };
}
function tripleJsonLd(record, base) {
    return {
        "@type": "rdf:Statement",
        subject: { "@id": new URL(encodeURI(record.subject), base).href },
        predicate: record.predicate,
        object: record.object,
        state: record.state,
        witness: record.witness,
        ...(record.claimedBy !== undefined ? { claimedBy: record.claimedBy } : {}),
        ...(record.contraryClaimedBy !== undefined ? { contraryClaimedBy: record.contraryClaimedBy } : {}),
    };
}
export function fragmentTurtle(page, opts = {}) {
    const base = opts.base ?? "http://localhost/";
    const subjects = new Set(opts.subjects ?? page.triples.map((record) => record.subject));
    const bySubject = new Map();
    for (const record of page.triples) {
        const group = bySubject.get(record.subject) ?? { potential: [], active: [], stable: [] };
        if (record.state === "potential")
            group.potential.push(cell(record.predicate, record.object, record.witness));
        else if (record.state === "active")
            group.active.push(cell(record.predicate, record.object, record.witness));
        else
            group.stable.push(stableCell(record));
        bySubject.set(record.subject, group);
    }
    const bodies = [
        `@prefix hydra: <http://www.w3.org/ns/hydra/core#> .`,
        `@prefix void: <http://rdfs.org/ns/void#> .`,
        `<${page.links.self}> a hydra:Collection, hydra:PagedCollection ;`,
        `  hydra:totalItems ${page.totalItems} ;`,
        `  hydra:itemsPerPage ${page.limit} ;`,
        `  void:triples ${page.totalItems} .`,
        "",
    ];
    for (const [subject, group] of [...bySubject.entries()].sort(([left], [right]) => left.localeCompare(right))) {
        const algebra = Object.freeze({
            subject,
            potential: Object.freeze(group.potential),
            active: Object.freeze(group.active),
            stable: Object.freeze(group.stable),
        });
        bodies.push(toTurtle(algebra, { base, subjects }));
    }
    return bodies.join("\n");
}
function repr(type, body, headers = {}) {
    return {
        type,
        cacheControl: { visibility: "public", maxAge: 60 },
        headers: {
            Vary: "Accept",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            ...headers,
        },
        body,
    };
}
async function worldFor(opts) {
    return typeof opts.world === "function" ? await opts.world() : opts.world;
}
function patternFrom(url) {
    const state = url.searchParams.get("state") || undefined;
    if (state !== undefined && state !== "potential" && state !== "active" && state !== "stable") {
        throw new TypeError("state must be potential, active, or stable");
    }
    return {
        ...(url.searchParams.get("s") ? { s: url.searchParams.get("s") } : {}),
        ...(url.searchParams.get("p") ? { p: url.searchParams.get("p") } : {}),
        ...(url.searchParams.get("o") ? { o: url.searchParams.get("o") } : {}),
        ...(state ? { state } : {}),
        ...(url.searchParams.get("witness") ? { witness: url.searchParams.get("witness") } : {}),
    };
}
function intParam(url, name) {
    const value = url.searchParams.get(name);
    if (!value)
        return undefined;
    const parsed = Number.parseInt(value, 10);
    return Number.isSafeInteger(parsed) ? parsed : undefined;
}
export function tpfApp(opts) {
    const path = opts.paths?.query ?? opts.path ?? "/query";
    const base = opts.base ?? "http://localhost/";
    return {
        resources: [
            {
                match: path,
                route: path,
                id: "triple-pattern-fragments.query",
                name: "Triple Pattern Fragments Query",
                methods: ["GET"],
                produces: ["application/ld+json", "application/json", "text/turtle"],
                handler: async (ctx) => {
                    let pattern;
                    try {
                        pattern = patternFrom(ctx.url);
                    }
                    catch (error) {
                        return {
                            ...repr("text/plain; charset=utf-8", error instanceof Error ? error.message : String(error)),
                            status: 400,
                        };
                    }
                    const world = await worldFor(opts);
                    const fragmentOpts = { base, path };
                    if (opts.fold !== undefined)
                        fragmentOpts.fold = opts.fold;
                    const requestedPage = intParam(ctx.url, "page");
                    if (requestedPage !== undefined)
                        fragmentOpts.page = requestedPage;
                    const requestedLimit = intParam(ctx.url, "limit") ?? opts.limit;
                    if (requestedLimit !== undefined)
                        fragmentOpts.limit = requestedLimit;
                    if (opts.maxLimit !== undefined)
                        fragmentOpts.maxLimit = opts.maxLimit;
                    const page = queryTriples(world, pattern, fragmentOpts);
                    const headers = { Link: linkHeader([
                            { href: page.links.first, rel: "first" },
                            { href: page.links.last, rel: "last" },
                            ...(page.links.previous ? [{ href: page.links.previous, rel: "prev" }] : []),
                            ...(page.links.next ? [{ href: page.links.next, rel: "next" }] : []),
                        ]) };
                    if (ctx.negotiatedType === "text/turtle") {
                        return repr(TURTLE_TYPE, fragmentTurtle(page, { base, subjects: subjects(world) }), headers);
                    }
                    else if (ctx.negotiatedType === "application/ld+json") {
                        return repr(JSONLD_TYPE, `${JSON.stringify(fragmentJsonLd(page, { base }), null, 2)}\n`, headers);
                    }
                    return repr(JSON_TYPE, `${JSON.stringify(fragmentJson(page), null, 2)}\n`, headers);
                },
            },
        ],
    };
}
export default tpfApp;
