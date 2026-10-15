---
date: 2026-05-28
topic: Walking the chain predicate-set → predicate-category → variety → lattice → twist-product → bilattice → posit-bilattice values, and recording what "predicates are cells, not strings" actually means
---

# Predicates are cells, not strings — what I read in the chain

The operator corrected an error in this session's implementation-plan entry: I had treated predicates first as elaborately-typed declarations (subject-type, object-type, polarity, converse), then — after the first correction — as flat kebab-case slugs.
Both were wrong.
This entry records what I found when I walked the active tree's actual derivation chain from predicate-set down to our posit-bilattice's values, so a future session can stand on the right foundation.

## The load-bearing finding, stated as a fact

A posit-bilattice value IS an aperiodic-predication-cell.
Structural identity, not encoding-relation, not representation-by.
The `four.schema.json` description states the identity directly, and the schema enforces it by `oneOf` against the four aperiodic-predication-cell schemas; there is no abstract-typed-object encoding for posit-bilattice values.
The schema's own commentary records the prior abstraction-attempt and its rejection: *"Earlier revisions of this schema used an abstract {pos: boolean, neg: boolean} object encoding; that encoding is replaced here because nothing in the active tree may live as an abstract typed object — every datum-schema must be derived from articulating's primitives."*

The value-to-cell correspondence is direct: `potential` = potential-aperiodic-predication-cell (token-unarticulated, claim-unarticulated); `active` = active-aperiodic-predication-cell (token-articulated, claim-unarticulated); `stable` = stable-aperiodic-predication-cell (token-unarticulated, claim-articulated); `absurd` = absurd-aperiodic-predication-cell (token-articulated, claim-articulated).
The 2×2 partition of the posit-bilattice's values is the same 2×2 partition as the cells; same structure, same objects.

## The chain, walked

The active path from predicate-set to our posit-bilattice's values runs through six derivation steps.
Each step is recorded below with what its schema actually says.

**Step 1 — predicate-set.** `predicate-set.schema.json` says: *"Π — the object-set of the predicate-category C.
The set of predicates over which the predicate coordinate of the predication-cell-set Φ = E × Π × E ranges.
Each element is a typed coordinate, not a label: a predicate p ∈ Π carries the typing that licenses reindexing along the four canonical predicate-category morphism classes."* Schema body lists `predicates` as an array of kebab-case strings — but the description has already told us those strings are addressing-handles for typed coordinates, not labels.

**Step 2 — predicate-category.** `predicate-category.schema.json`: *"a small predicate category C — an object-set (the predicate-set Π = Ob(C)) together with four morphism tables, one per canonical generator class.
Each table lists morphisms as (source, target) pairs in that class."* The four classes: specialization, converse, subject-projection, object-projection.
The generator-exhaustiveness theorem (relationality-repo: `predicate-generator-exhaustiveness`) says these four are exhaustive among natural bilattice homomorphisms between predication fiber algebras.

**Step 3 — variety.** `variety.schema.json`: *"The binary predicate variety — names the membership relation between a variety of universal algebras and one of its algebras.
A cell (V, variety, A) reads: 'A is an algebra of the variety named V.'"* So `variety` itself is a binary predicate; cells of the form (V, variety, A) populate Φ.
The variety carries `signature` (operation symbols with arities) and `equations` (pairs of terms over the signature) — the Birkhoff (1935) data that defines an equational class.

**Step 4 — lattice.** `lattice.schema.json`: *"a lattice as data: a finite carrier set together with two binary operation tables interpreting the signature ⟨∧, ∨⟩."* The carrier is an array of distinct symbolic values; meet and join are nested binary-operation tables.
Optional bottom/top elements for bounded lattices.
The lattice axioms (idempotence, commutativity, associativity, absorption) are not in JSON Schema — they are verifier-checked.
So a lattice IS its carrier plus its operation tables, satisfying lattice axioms.

**Step 5 — twist-product.** `twist-product.schema.json`: *"the twist-product construction's input data: a single bounded lattice L (carrier + meet + join).
The output bilattice L^⋈ is derived by the construction script; its data shape conforms to bilattice.schema.json with carrier L × L."* So twist-product is a CONSTRUCTION that takes a lattice and produces a bilattice.
The bilattice has carrier L × L; its bilattice operations are derived from the lattice operations.

**Step 6 — equipping-with-negation.** A morphism in the chain.
Schema not directly inspected this session; the placement is `library/twist-product/equipping-with-negation/`, so it is the morphism that takes the twist-product output and equips it with the negation operation ~ that makes it a full bilattice.

**Step 7 — bilattice.** `bilattice.schema.json`: *"a bilattice as data: a finite carrier set together with five (or six, with conflation) operation tables interpreting the signature ⟨∧_t, ∨_t, ∧_k, ∨_k, ~, (-)⟩."* Required: carrier, truth-meet, truth-join, knowledge-meet, knowledge-join, negating.
Optional: conflating.
The two orders are independent (knowledge × truth, the bigrading).
A bilattice IS its carrier plus all its operation tables.

**Step 8 — four.** `four.schema.json`: a single posit-bilattice value, structurally identified with one of the four aperiodic-predication-cells per the correspondence above.
The value algebra is the twist product of the two-element slot-articulation-status lattice with itself; the two-element lattice 2 in this tree is realized as articulating's slot-articulation-status — the binary status per slot.

## What "predicates are cells" means after walking the chain

A predicate p ∈ Π is not a string.
It is a structured object whose deepest carrier is constructed out of articulation-cells via the chain above.
Each predicate carries, at minimum:

- A membership-relation in some variety: `(some-variety, variety, p)` is a cell asserting that p is an algebra of that variety.
- Its algebraic structure, if it admits structure: signature (operation symbols with arities) and equations (Birkhoff pairs).
  For predicates that themselves are lattice-algebras, this includes the carrier and operation tables.
- Its place in the predicate-category C via the four generator-class morphisms (specialization, converse, subject-projection, object-projection) — declared in C's morphism-tables.

The kebab-case slug attached to a predicate is the addressing-handle the engine uses to refer to it; it is NOT what the predicate is.
The predicate IS the structured-object the slug addresses.

For the deepest case — four-valued status, the posit-bilattice value at the bottom of the chain — a "predicate" IS literally an aperiodic-predication-cell.
At less-deep cases, predicates are typed objects in their own variety, but the chain terminates at cells.

## The Scott-continuous shadow that the current theme already has

The site's `static/vocab/index.ttl` declares its predicates using rdf:type rdf:Property, rdfs:label, rdfs:comment, rdfs:domain, rdfs:range.
This is the *Scott-continuous shadow* of the deeper structure: the rdfs:domain and rdfs:range fields collapse the full variety-membership + signature + equations into two type-restrictions (which subject types are admissible, which object types are admissible).
Standard RDF consumers read this shadow correctly; it interoperates with schema.org and the rest of the semantic web.
Per CLAUDE.md, "the textbook math is the SHADOW of what this repo builds, not the other way around" — the TTL vocab is the textbook RDF reading of the deeper-structured predicates this project's chain produces.

A categorical Hugo theme can choose to work at the shadow level (use the TTL vocab's rdfs:domain/rdfs:range typing, treat predicates as named properties with admissible domain/range) — which is what current Hugo themes effectively do — or to surface the deeper structure (each predicate carries its variety-membership cell, its signature, its operation tables where applicable, its position in C's four morphism-tables).
The shadow level is implementable now and interoperates with the world; the deeper level is what would make the theme honest to the active tree's actual structure.

## What this invalidates in the implementation-plan entry

The implementation-plan entry (`2026-05-28-implementation-plan.md`) specifies `data/predicates.yaml` as a list of predicate declarations with fields {subject-type, object-type, polarity, converse, description}.
That declaration scheme is wrong on two counts simultaneously: (a) per the first correction earlier in the session, the active tree's predicate.schema.json (at the `hacking/` admit position) encodes a predicate as a kebab-case string with no per-predicate metadata fields, so the elaborate scheme has no schema-tree counterpart; (b) per this session's deeper walk, even that slug-only encoding is the simplified shadow — the canonical structure has predicates as cells, with variety-membership and algebraic content.
Both my elaborate version AND the corrected slug-list version were wrong; both worked at shadow-or-less levels, both invented schemas with no anchor in the active tree's actual derivation chain.

The implementation-plan entry's downstream sections (the partial-template architecture, the frontmatter conventions, the contradicting-definitions example) are not invalidated by this finding — they are workable at the Scott-continuous-shadow level.
But the data/ layer needs to be redrawn against the actual chain before any code is written.
The correct data/ structure is not yet drafted in this session; producing it is study-and-design work that needs to happen before implementation.

## What I did not study this session that may matter

- The `pre-bilattice/` library inside `variety/library/` was listed but not read.
  Pre-bilattice is presumably the structure between lattice and bilattice — likely the bilattice-with-knowledge-and-truth-orders before negation is added.
- The `equipping-with-negation` morphism schema was not directly inspected.
- The `taking/` morphism (lattice → twist-product) was found but its schema not inspected; the directory exists with `docs/` and `library/`.
- The fiber-algebra structure (`predication-fiber-algebra`) which is where the *values* live (per predication-cell schema: "The cell carries no value.
  Values live in the predication fiber algebra A_p, separately") — this is where the question of how positive vs negative evidence gets accumulated actually plays out.
  I have not read these schemas in detail.
- The Lawvere comprehension morphism (`comprehending`) was placed this session by parallel work but I have not studied it.

A future session that wants to implement the data/ layer correctly would need to read these before drafting.

## Status

This entry: walked the predicate-set → predicate-category → variety → lattice → twist-product → bilattice → posit-bilattice values chain in the active tree, found the structural-identity claim that a posit-bilattice value IS an aperiodic-predication-cell, recorded what "predicates are cells, not strings" actually means at each level of the chain, and identified what this invalidates in the prior implementation-plan entry (specifically the data/predicates.yaml schema).
Did not draft a corrected data/ layer; deferred to a future study-and-design session because the fiber-algebra structure where values actually live was not read.
No code or theme work; no commit-worthy production changes.

The single fact this entry is meant to make available to a future session: **a predicate in this project is a structured object whose deepest carrier is articulation-cells, and a posit-bilattice value IS literally an aperiodic-predication-cell.
The slug-string encoding is an addressing-shadow.
The Scott-continuous shadow (rdfs:domain/rdfs:range typing on predicates as RDF properties) is what standard tooling consumes; the deeper structure is what the active tree records and what an honest categorical Hugo theme would carry.**
