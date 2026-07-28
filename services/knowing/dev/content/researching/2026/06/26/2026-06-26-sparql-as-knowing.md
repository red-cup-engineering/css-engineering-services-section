---
title: "SPARQL/RDF as knowing's QUERY projection"
description: "Names the SPARQL/RDF query surface as the knowing/IN-face standard over RWIL: Basic Graph Patterns are conjunctive queries over witnessed EAVT triples, SELECT/ASK/CONSTRUCT are thin projections of the existing Datalog evaluator, and answer-completeness is governed by the knowledge order <=k rather than by a separate consistency policy."
date: 2026-06-26
status: implemented
---

# SPARQL/RDF as knowing's QUERY projection

**Name:** SPARQL/RDF QUERY.

**Pitch:** RDF graph queries over the witness ledger: SPARQL Basic Graph Patterns read RWIL EAVT witnesses through knowing's Datalog evaluator, so web-standard query conformance is derived from the knowing face rather than designed as another store.

This is the IN-face standard the family registry left open for single-agent memory/reflection.
RDF row writing still belongs in `relating/writing` because EAVT, triple, and Turtle are representation codecs.
Querying those witnessed triples belongs in `knowing` because it is reflection over accumulated facts: an agent reads what has been admitted and asks what substitutions are forced by the conjunction.

## Why BGP is exactly Datalog over EAVT

RWIL admits facts as:

```text
eavt(entity, attribute, value, time)
```

An RDF triple pattern:

```text
?s <p> ?o
```

is the Datalog atom:

```text
eavt(?s, "p", ?o, ?t)
```

where `?t` is existential.
A Basic Graph Pattern is a finite conjunction of those triple patterns, therefore it is exactly a conjunctive query over the extensional `eavt` relation.
The implementation maps one BGP to one Datalog rule whose body is the conjunction and whose head is the answer tuple; no second evaluator is introduced.

Answer-completeness is governed by `<=k`, the knowledge order.
RWIL is monotone evidence: adding witnesses can only move the known cell upward in information.
A conflict is not filtered away; a `top` cell is told-both and therefore more informed than either side alone.
So the query surface is complete when it returns every binding witnessed by the current EAVT extent.
The green law-test demonstrates this directly: a held-both truth cell yields both `"true"` and `"false"` bindings.

## Realizing files

- [`lib/knowing/src/writing/sparql/index.mts`](../../../lib/knowing/src/writing/sparql/index.mts) — SPARQL carriers and SELECT/ASK/CONSTRUCT evaluation as a projection of `evaluateDatalog`.
- [`lib/knowing/src/writing/datalog/index.mts`](../../../lib/knowing/src/writing/datalog/index.mts) — the existing semi-naive Datalog evaluator over RWIL EAVT witnesses.
- [`lib/relating/src/ledger/index.mts`](../../../lib/relating/src/ledger/index.mts) — RWIL witness-log reading via `@emsenn/relating/ledger`.
- [`lib/relating/src/writing/{eavt,triple,turtle}.mts`](../../../lib/relating/src/writing/eavt.mts) — the row and Turtle/RDF term codecs reused by the projection.
- [`lib/knowing/test/sparql.test.mjs`](../../../lib/knowing/test/sparql.test.mjs) — the conformance law-test.

## Checkable derive-not-design claim

SPARQL/RDF QUERY is standard-conformant by derivation:

1. RWIL already gives the RDF-ish graph extension as witnessed EAVT triples.
2. SPARQL BGP semantics are conjunctive query semantics.
3. Knowing already owns Datalog evaluation over EAVT.
4. Therefore SELECT/ASK/CONSTRUCT are projections of that evaluator, not a new query ontology.

The check is concrete: `pnpm --filter @emsenn/knowing run check` and `pnpm --filter @emsenn/knowing run test` are green after rebuild.
The test named `SPARQL BGP SELECT returns exactly the bindings of its derived Datalog read` compares the SPARQL result to the Datalog answer relation; the test named `a knowledge-top cell is query-complete` checks the `<=k` top case.

## Boundary

This is not a textual SPARQL parser.
It is the carrier-level query projection: schema literal carriers for variables, triple patterns, queries, and results.
A textual SPARQL reader can be added later as a codec that lowers parsed syntax into these carriers.
That reader should remain a representation boundary, while the semantics continue to live here as Datalog-over-RWIL.

## Provenance

Grounded in the family registry [`2026-06-25-relating-family-of-named-systems.md`](2026-06-25-relating-family-of-named-systems.md), the face ownership rule in [`2026-06-25-codecs-on-faces-activitypub-across-scales.md`](2026-06-25-codecs-on-faces-activitypub-across-scales.md), the Datalog substrate note [`2026-06-25-datalog-eavt-as-knowing.md`](2026-06-25-datalog-eavt-as-knowing.md), and the WMAP/RWIL derive-not-design pattern.
