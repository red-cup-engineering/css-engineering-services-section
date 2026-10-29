import { linkHeader } from "@red-cup-engineering/computer-data-serialization-services-section/services/http-data-services-section/src/link";
import { iriRef, turtleLiteral } from "@red-cup-engineering/turtle-services-section/turtle-term-writing";
import { stableJson, finiteAlgebra } from "../semantic-reader/index.mjs";
const CONTRARY_PREDICATE = "contrary-to";
const NS = Object.freeze({
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    rdfs: "http://www.w3.org/2000/01/rdf-schema#",
    owl: "http://www.w3.org/2002/07/owl#",
    xsd: "http://www.w3.org/2001/XMLSchema#",
    prov: "http://www.w3.org/ns/prov#",
});
function ensureSlash(base) {
    return base.endsWith("/") ? base : `${base}/`;
}
export function vocabularyNamespace(base = "/") {
    return `${ensureSlash(base)}vocab#`;
}
export function predicateNamespace(base = "/") {
    return `${ensureSlash(base)}vocab/predicate#`;
}
export function subjectIri(base, subject) {
    return `${ensureSlash(base)}${encodeURI(subject)}`;
}
export function predicateIri(base, predicate) {
    return `${predicateNamespace(base)}${encodeURI(predicate)}`;
}
function subjectSet(subjects) {
    return subjects instanceof Set ? subjects : new Set(subjects ?? []);
}
function cellKey(predicate, object) {
    return JSON.stringify([predicate, stableJson(object)]);
}
function witnessProvenance(cell) {
    const out = [...cell.witnessedBy].filter(Boolean).sort();
    return out.length === 0 ? undefined : out.length === 1 ? out[0] : Object.freeze(out);
}
function plainCell(cell) {
    const citation = witnessProvenance(cell);
    return Object.freeze({ predicate: cell.predicate, object: cell.object, ...(citation !== undefined ? { citation } : {}) });
}
// Contrariety is read-side knowledge, never admission-side polarity: it
// enters from `opts.contrary` and from `contrary-to` claims in the trace
// itself (taxonomy is itself claimed).
function contrarietyOf(assertions, declared) {
    const contrary = {};
    for (const assertion of assertions) {
        if (assertion.a === CONTRARY_PREDICATE && typeof assertion.v === "string" && typeof assertion.e === "string") {
            contrary[assertion.e] = assertion.v;
        }
    }
    return { ...contrary, ...declared };
}
export function linkedDataSubject(subject, assertions, opts = {}) {
    const { contrary, functional, ...algebraOptions } = opts;
    const declared = contrarietyOf(assertions, contrary ?? {});
    const predicateIsFunctional = typeof functional === "function"
        ? functional
        : functional instanceof Set ? (predicate) => functional.has(predicate)
            : Array.isArray(functional) ? (predicate) => functional.includes(predicate)
                : () => false;
    const latest = new Map();
    for (const assertion of assertions) {
        if (assertion?.e !== subject || !predicateIsFunctional(assertion.a))
            continue;
        const current = latest.get(assertion.a);
        if (current === undefined || String(assertion.t ?? "") >= String(current.t ?? ""))
            latest.set(assertion.a, assertion);
    }
    const normalized = assertions.flatMap((assertion) => {
        if (assertion?.e !== subject || assertion.v === null || assertion.a === CONTRARY_PREDICATE)
            return [];
        if (predicateIsFunctional(assertion.a) && latest.get(assertion.a) !== assertion)
            return [];
        const canonical = declared[assertion.a];
        return [canonical === undefined
            ? assertion
            : { ...assertion, a: canonical, v: { not: assertion.v } }];
    });
    return finiteAlgebra(subject, normalized, algebraOptions);
}
// Admission only ever witnesses potential cells, so the active and stable
// buckets are derived reads: a declared contrary predicate's cell witnesses
// the canonical cell's falsity side. Both present knowledge-join to stable;
// the contrary side alone derives the canonical cell active.
export function linkedDataFromFolded(folded, opts = {}) {
    const contrary = opts.contrary ?? {};
    const byKey = new Map();
    for (const cell of folded.fiber)
        byKey.set(cellKey(cell.predicate, cell.object), cell);
    const potential = [];
    const active = [];
    const stableCells = [];
    const pairedCanonical = new Set();
    for (const cell of folded.fiber) {
        const canonical = contrary[cell.predicate];
        if (canonical === undefined)
            continue;
        const partner = byKey.get(cellKey(canonical, cell.object));
        if (partner !== undefined) {
            pairedCanonical.add(cellKey(canonical, cell.object));
            const claimedBy = witnessProvenance(partner);
            const contraryClaimedBy = witnessProvenance(cell);
            stableCells.push(Object.freeze({
                predicate: canonical,
                object: cell.object,
                ...(claimedBy !== undefined ? { claimedBy } : {}),
                ...(contraryClaimedBy !== undefined ? { contraryClaimedBy } : {}),
            }));
        }
        else {
            const citation = witnessProvenance(cell);
            active.push(Object.freeze({ predicate: canonical, object: cell.object, ...(citation !== undefined ? { citation } : {}) }));
        }
    }
    for (const cell of folded.fiber) {
        if (contrary[cell.predicate] !== undefined)
            continue; // folds into its canonical pair
        if (pairedCanonical.has(cellKey(cell.predicate, cell.object)))
            continue;
        if (cell.value === "potential")
            potential.push(plainCell(cell));
        else if (cell.value === "active")
            active.push(plainCell(cell));
        else if (cell.value === "stable")
            stableCells.push(plainCell(cell));
    }
    return Object.freeze({
        subject: folded.entity,
        potential: Object.freeze(potential),
        active: Object.freeze(active),
        stable: Object.freeze(stableCells),
    });
}
function objectTerm(base, object, subjects) {
    if (typeof object === "string" && subjects.has(object))
        return Object.freeze({ iri: subjectIri(base, object) });
    return Object.freeze({ literal: object });
}
function turtleLiteralValue(value) {
    if (typeof value === "string" || typeof value === "boolean")
        return value;
    if (typeof value === "number")
        return Number.isFinite(value) ? value : String(value);
    if (value === null || value === undefined)
        return null;
    try {
        return JSON.stringify(value) ?? String(value);
    }
    catch {
        return String(value);
    }
}
// Turtle term serialization is an RDF data capability. Re-export it here so
// linked-data's public surface remains useful to its callers.
export { iriRef, turtleLiteral };
function turtleTerm(value) {
    return "iri" in value ? iriRef(value.iri) : turtleLiteral(turtleLiteralValue(value.literal));
}
function prefixes(base) {
    const lines = Object.entries(NS).map(([name, iri]) => `@prefix ${name}: <${iri}> .`);
    lines.push(`@prefix ws: <${vocabularyNamespace(base)}> .`);
    lines.push(`@prefix prop: <${predicateNamespace(base)}> .`);
    return lines.join("\n");
}
function provenanceItems(value) {
    if (value === undefined)
        return [];
    return typeof value === "string" ? [value] : [...value];
}
function isUrl(value) {
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}
function provTurtle(value) {
    return isUrl(value) ? iriRef(value) : `[ a prov:Entity ; rdfs:label ${turtleLiteral(value)} ]`;
}
function provTurtleList(value) {
    const items = provenanceItems(value);
    return items.length === 0 ? "[]" : items.map(provTurtle).join(", ");
}
function provJsonLd(value) {
    return isUrl(value) ? { "@id": value } : { "@type": "prov:Entity", "rdfs:label": value };
}
function provJsonLdValue(value) {
    const items = provenanceItems(value);
    if (items.length === 0)
        return undefined;
    const mapped = items.map(provJsonLd);
    return mapped.length === 1 ? mapped[0] : Object.freeze(mapped);
}
function jsonLdObject(base, object, subjects) {
    const term = objectTerm(base, object, subjects);
    return "iri" in term ? { "@id": term.iri } : term.literal;
}
function negativeTarget(base, object, subjects) {
    const term = objectTerm(base, object, subjects);
    return "iri" in term
        ? { "owl:targetIndividual": { "@id": term.iri } }
        : { "owl:targetValue": term.literal };
}
export function toTurtle(algebra, opts = {}) {
    const base = opts.base ?? "/";
    const subjects = subjectSet(opts.subjects);
    const subject = iriRef(subjectIri(base, algebra.subject));
    const out = [prefixes(base), ""];
    out.push(`${subject} a ws:Subject ;`);
    out.push(`  rdfs:label ${turtleLiteral(algebra.subject)} .`);
    for (const cell of algebra.potential) {
        const object = turtleTerm(objectTerm(base, cell.object, subjects));
        const predicate = iriRef(predicateIri(base, cell.predicate));
        out.push(`${subject} ${predicate} ${object} .`);
        if (cell.citation) {
            out.push("[] a rdf:Statement, ws:PotentialClaim ;");
            out.push(`  rdf:subject ${subject} ; rdf:predicate ${predicate} ; rdf:object ${object} ;`);
            out.push(`  prov:wasDerivedFrom ${provTurtleList(cell.citation)} .`);
        }
    }
    for (const cell of algebra.active) {
        const object = objectTerm(base, cell.object, subjects);
        out.push("[] a owl:NegativePropertyAssertion ;");
        out.push(`  owl:sourceIndividual ${subject} ; owl:assertionProperty ${iriRef(predicateIri(base, cell.predicate))} ;`);
        out.push(`  ${"iri" in object ? `owl:targetIndividual ${iriRef(object.iri)}` : `owl:targetValue ${turtleLiteral(turtleLiteralValue(object.literal))}`} ;`);
        out.push(`  prov:wasDerivedFrom ${provTurtleList(cell.citation)} .`);
    }
    for (const cell of algebra.stable) {
        const object = turtleTerm(objectTerm(base, cell.object, subjects));
        const parts = [
            cell.claimedBy ? `ws:claimedBy ${provTurtleList(cell.claimedBy)}` : "",
            cell.contraryClaimedBy ? `ws:contraryClaimedBy ${provTurtleList(cell.contraryClaimedBy)}` : "",
        ].filter(Boolean);
        out.push("[] a ws:StableClaim ;");
        out.push(`  rdf:subject ${subject} ; rdf:predicate ${iriRef(predicateIri(base, cell.predicate))} ; rdf:object ${object} ;`);
        out.push(`  ${parts.length ? parts.join(" ; ") : "prov:wasDerivedFrom []"} .`);
    }
    return `${out.join("\n")}\n`;
}
export function toJsonLd(algebra, opts = {}) {
    const base = opts.base ?? "/";
    const subjects = subjectSet(opts.subjects);
    const context = {
        ...NS,
        ws: vocabularyNamespace(base),
        prop: predicateNamespace(base),
        label: "rdfs:label",
    };
    const subjectId = subjectIri(base, algebra.subject);
    const node = { "@id": subjectId, "@type": "ws:Subject", label: algebra.subject };
    const graph = [node];
    for (const cell of algebra.potential) {
        node[`prop:${cell.predicate}`] = jsonLdObject(base, cell.object, subjects);
        const citation = provJsonLdValue(cell.citation);
        if (citation) {
            graph.push({
                "@type": ["rdf:Statement", "ws:PotentialClaim"],
                "rdf:subject": { "@id": subjectId },
                "rdf:predicate": { "@id": predicateIri(base, cell.predicate) },
                "rdf:object": jsonLdObject(base, cell.object, subjects),
                "prov:wasDerivedFrom": citation,
            });
        }
    }
    for (const cell of algebra.active) {
        const citation = provJsonLdValue(cell.citation);
        graph.push({
            "@type": "owl:NegativePropertyAssertion",
            "owl:sourceIndividual": { "@id": subjectId },
            "owl:assertionProperty": { "@id": predicateIri(base, cell.predicate) },
            ...negativeTarget(base, cell.object, subjects),
            ...(citation ? { "prov:wasDerivedFrom": citation } : {}),
        });
    }
    for (const cell of algebra.stable) {
        const claimedBy = provJsonLdValue(cell.claimedBy);
        const contraryClaimedBy = provJsonLdValue(cell.contraryClaimedBy);
        graph.push({
            "@type": "ws:StableClaim",
            "rdf:subject": { "@id": subjectId },
            "rdf:predicate": { "@id": predicateIri(base, cell.predicate) },
            "rdf:object": jsonLdObject(base, cell.object, subjects),
            ...(claimedBy ? { "ws:claimedBy": claimedBy } : {}),
            ...(contraryClaimedBy ? { "ws:contraryClaimedBy": contraryClaimedBy } : {}),
        });
    }
    return `${JSON.stringify({ "@context": context, "@graph": graph }, null, 2)}\n`;
}
export function vocabulary(base = "/") {
    const vocab = vocabularyNamespace(base);
    return `${prefixes(base)}
<${vocab.slice(0, -1)}> a owl:Ontology ;
  rdfs:label "561 linked-data vocabulary" ;
  rdfs:comment "Types four-valued, citation-witnessed subject claims published by @emsenn/web-linked-data." .

ws:Subject a owl:Class ;
  rdfs:label "Subject" ;
  rdfs:comment "A thing the site holds settled claims about; its slug is its IRI." .

ws:PotentialClaim a owl:Class ; rdfs:subClassOf rdf:Statement ;
  rdfs:label "Potential claim" ;
  rdfs:comment "A reified claim measured potential: its truth side is witnessed by its own claims, with prov:wasDerivedFrom its witness." .

ws:StableClaim a owl:Class ; rdfs:subClassOf rdf:Statement ;
  rdfs:label "Stable claim" ;
  rdfs:comment "A held contradiction at knowledge top: the claim and its declared contrary predicate are both witnessed. Derived, never admitted." .

ws:claimedBy a owl:ObjectProperty ;
  rdfs:domain ws:StableClaim ; rdfs:range prov:Entity ;
  rdfs:subPropertyOf prov:wasDerivedFrom ;
  rdfs:label "claimed by" .

ws:contraryClaimedBy a owl:ObjectProperty ;
  rdfs:domain ws:StableClaim ; rdfs:range prov:Entity ;
  rdfs:subPropertyOf prov:wasDerivedFrom ;
  rdfs:label "contrary claimed by" .
`;
}
function repr(type, body, headers = {}) {
    return {
        type,
        cacheControl: { visibility: "public", maxAge: 300 },
        headers: { Vary: "Accept", ...headers },
        body,
    };
}
async function subjectsFor(opts) {
    const input = typeof opts.subjects === "function" ? await opts.subjects() : opts.subjects;
    return subjectSet(input);
}
export function linkedDataApp(opts) {
    const paths = {
        subject: "/:subject",
        vocabulary: "/vocab",
        ...(opts.paths ?? {}),
    };
    const base = opts.base ?? "/";
    return {
        resources: [
            {
                match: paths.vocabulary,
                route: paths.vocabulary,
                id: "linked-data.vocabulary",
                name: "Linked Data Vocabulary",
                methods: ["GET"],
                produces: ["text/turtle"],
                handler: () => repr("text/turtle; charset=utf-8", vocabulary(base)),
            },
            {
                match: paths.subject,
                route: paths.subject,
                id: "linked-data.subject",
                name: "Linked Data Subject",
                methods: ["GET"],
                produces: ["text/turtle", "application/ld+json"],
                handler: async (ctx) => {
                    const subject = ctx.params.subject;
                    if (!subject) {
                        return { ...repr("text/plain; charset=utf-8", "Not Found"), status: 404 };
                    }
                    const algebra = await opts.getSubject(subject);
                    if (!algebra) {
                        return { ...repr("text/plain; charset=utf-8", "Not Found"), status: 404 };
                    }
                    const subjects = await subjectsFor(opts);
                    const headers = { Link: linkHeader([
                            { href: new URL(paths.vocabulary, base).href, rel: "describedby", type: "text/turtle" },
                            { href: subjectIri(base, subject), rel: "canonical" },
                        ]) };
                    if (ctx.negotiatedType === "application/ld+json") {
                        return repr("application/ld+json; charset=utf-8", toJsonLd(algebra, { base, subjects }), headers);
                    }
                    return repr("text/turtle; charset=utf-8", toTurtle(algebra, { base, subjects }), headers);
                },
            },
        ],
    };
}
export default linkedDataApp;
//# sourceMappingURL=index.mjs.map
