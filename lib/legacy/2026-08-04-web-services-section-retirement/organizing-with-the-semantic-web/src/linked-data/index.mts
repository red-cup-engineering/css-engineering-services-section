import type { App, Repr } from "@red-cup-engineering/relating/services/http";
import { linkHeader } from "@red-cup-engineering/relating/writing/http";
import { iriRef, turtleLiteral } from "@red-cup-engineering/relating/writing";
import {
  finiteAlgebra,
  type AssertionTrace,
  type ClaimCell,
  type FiniteAlgebra,
  type SettleOptions,
} from "../semantic-reader/index.mjs";

export type ProvenanceValue = string | readonly string[];

export type LinkedDataCell = Readonly<{
  predicate: string;
  object: unknown;
  citation?: ProvenanceValue;
  claimedBy?: ProvenanceValue;
  contraryClaimedBy?: ProvenanceValue;
}>;

export type LinkedDataSubject = Readonly<{
  subject: string;
  potential: readonly LinkedDataCell[];
  active: readonly LinkedDataCell[];
  stable: readonly LinkedDataCell[];
}>;

export type LinkedDataSettleOptions = SettleOptions;

export type LinkedDataOptions = Readonly<{
  base?: string;
  subjects?: ReadonlySet<string> | readonly string[];
}>;

export type LinkedDataAppOptions = LinkedDataOptions & Readonly<{
  getSubject: (subject: string) => LinkedDataSubject | null | undefined | Promise<LinkedDataSubject | null | undefined>;
  subjects?: ReadonlySet<string> | readonly string[] | (() => readonly string[] | Promise<readonly string[]>);
  paths?: {
    subject?: string;
    vocabulary?: string;
  };
}>;

const NS = Object.freeze({
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  owl: "http://www.w3.org/2002/07/owl#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  prov: "http://www.w3.org/ns/prov#",
});

function ensureSlash(base: string): string {
  return base.endsWith("/") ? base : `${base}/`;
}

export function vocabularyNamespace(base = "/"): string {
  return `${ensureSlash(base)}vocab#`;
}

export function predicateNamespace(base = "/"): string {
  return `${ensureSlash(base)}vocab/predicate#`;
}

export function subjectIri(base: string, subject: string): string {
  return `${ensureSlash(base)}${encodeURI(subject)}`;
}

export function predicateIri(base: string, predicate: string): string {
  return `${predicateNamespace(base)}${encodeURI(predicate)}`;
}

function subjectSet(subjects: LinkedDataOptions["subjects"]): ReadonlySet<string> {
  return subjects instanceof Set ? subjects : new Set(subjects ?? []);
}

export function linkedDataSubject(subject: string, assertions: AssertionTrace, opts: LinkedDataSettleOptions = {}): LinkedDataSubject {
  return linkedDataFromAlgebra(finiteAlgebra(subject, assertions, opts));
}

function provenance(value: unknown): ProvenanceValue | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) return Object.freeze([...value]) as readonly string[];
  return undefined;
}

function linkedCell(cell: ClaimCell): LinkedDataCell {
  const citation = provenance(cell.citation);
  const claimedBy = provenance(cell.claimedBy);
  const contraryClaimedBy = provenance(cell.contraryClaimedBy);
  return Object.freeze({
    predicate: cell.predicate,
    object: cell.object,
    ...(citation !== undefined ? { citation } : {}),
    ...(claimedBy !== undefined ? { claimedBy } : {}),
    ...(contraryClaimedBy !== undefined ? { contraryClaimedBy } : {}),
  });
}

/** Project the one settled finite algebra into RDF-facing cells. */
export function linkedDataFromAlgebra(algebra: FiniteAlgebra): LinkedDataSubject {
  return Object.freeze({
    subject: algebra.subject,
    potential: Object.freeze(algebra.potential.map(linkedCell)),
    active: Object.freeze(algebra.active.map(linkedCell)),
    stable: Object.freeze(algebra.stable.map(linkedCell)),
  });
}

type ObjectTerm = Readonly<{ iri: string } | { literal: unknown }>;
type TurtleLiteralValue = string | number | boolean | null;

function objectTerm(base: string, object: unknown, subjects: ReadonlySet<string>): ObjectTerm {
  if (typeof object === "string" && subjects.has(object)) return Object.freeze({ iri: subjectIri(base, object) });
  return Object.freeze({ literal: object });
}

function turtleLiteralValue(value: unknown): TurtleLiteralValue {
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (value === null || value === undefined) return null;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

// The shared Turtle serialization primitives now live at the relational
// substrate (@red-cup-engineering/relating/writing) — they are RDF primitives,
// not a web concern, and factual-vocabulary emitters downstream of relationality
// (e.g. @red-cup-engineering/organizing-with-jsnode/codecs) reuse them there. Imported at the top of this
// module and re-exported here so this module's public surface is unchanged.
export { iriRef, turtleLiteral };

function turtleTerm(value: ObjectTerm): string {
  return "iri" in value ? iriRef(value.iri) : turtleLiteral(turtleLiteralValue(value.literal));
}

function prefixes(base: string): string {
  const lines = Object.entries(NS).map(([name, iri]) => `@prefix ${name}: <${iri}> .`);
  lines.push(`@prefix ws: <${vocabularyNamespace(base)}> .`);
  lines.push(`@prefix prop: <${predicateNamespace(base)}> .`);
  return lines.join("\n");
}

function provenanceItems(value: ProvenanceValue | undefined): readonly string[] {
  if (value === undefined) return [];
  return typeof value === "string" ? [value] : [...value];
}

function isUrl(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}

function provTurtle(value: string): string {
  return isUrl(value) ? iriRef(value) : `[ a prov:Entity ; rdfs:label ${turtleLiteral(value)} ]`;
}

function provTurtleList(value: ProvenanceValue | undefined): string {
  const items = provenanceItems(value);
  return items.length === 0 ? "[]" : items.map(provTurtle).join(", ");
}

function provJsonLd(value: string): Record<string, unknown> {
  return isUrl(value) ? { "@id": value } : { "@type": "prov:Entity", "rdfs:label": value };
}

function provJsonLdValue(value: ProvenanceValue | undefined): Record<string, unknown> | readonly Record<string, unknown>[] | undefined {
  const items = provenanceItems(value);
  if (items.length === 0) return undefined;
  const mapped = items.map(provJsonLd);
  return mapped.length === 1 ? mapped[0] : Object.freeze(mapped);
}

function jsonLdObject(base: string, object: unknown, subjects: ReadonlySet<string>): unknown {
  const term = objectTerm(base, object, subjects);
  return "iri" in term ? { "@id": term.iri } : term.literal;
}

function negativeTarget(base: string, object: unknown, subjects: ReadonlySet<string>): Record<string, unknown> {
  const term = objectTerm(base, object, subjects);
  return "iri" in term
    ? { "owl:targetIndividual": { "@id": term.iri } }
    : { "owl:targetValue": term.literal };
}

export function toTurtle(algebra: LinkedDataSubject, opts: LinkedDataOptions = {}): string {
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

export function toJsonLd(algebra: LinkedDataSubject, opts: LinkedDataOptions = {}): string {
  const base = opts.base ?? "/";
  const subjects = subjectSet(opts.subjects);
  const context = {
    ...NS,
    ws: vocabularyNamespace(base),
    prop: predicateNamespace(base),
    label: "rdfs:label",
  };
  const subjectId = subjectIri(base, algebra.subject);
  const node: Record<string, unknown> = { "@id": subjectId, "@type": "ws:Subject", label: algebra.subject };
  const graph: Record<string, unknown>[] = [node];

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

export function vocabulary(base = "/"): string {
  const vocab = vocabularyNamespace(base);
  return `${prefixes(base)}
<${vocab.slice(0, -1)}> a owl:Ontology ;
  rdfs:label "561 linked-data vocabulary" ;
  rdfs:comment "Types four-valued, citation-witnessed subject claims published by @red-cup-engineering/web-linked-data." .

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

function repr(type: string, body: string, headers: Record<string, string> = {}): Repr {
  return {
    type,
    cacheControl: { visibility: "public", maxAge: 300 },
    headers: { Vary: "Accept", ...headers },
    body,
  };
}

async function subjectsFor(opts: LinkedDataAppOptions): Promise<ReadonlySet<string>> {
  const input = typeof opts.subjects === "function" ? await opts.subjects() : opts.subjects;
  return subjectSet(input);
}

export function linkedDataApp(opts: LinkedDataAppOptions): App {
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
