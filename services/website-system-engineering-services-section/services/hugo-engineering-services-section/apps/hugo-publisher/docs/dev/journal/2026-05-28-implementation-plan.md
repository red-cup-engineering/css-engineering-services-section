---
date: 2026-05-28
topic: Concrete implementation plan for a categorical static site generator as a Hugo theme — load-bearing pattern, data schemas, partial architecture, frontmatter conventions, contradiction rendering, roadmap
---

# Categorical SSG implementation plan (Hugo theme)

This entry is the planning work the operator asked for, building on the two earlier 2026-05-28 entries (`2026-05-28.md` — Hugo as a category-theoretic system; `2026-05-28-categorical-ssg.md` — positing-and-settling as the design frame, with corrections).
The goal here is not more conceptual mapping; it is to lay out *what to build*, in enough specificity that a future session can read this file and start writing the theme.

The plan is structured around six commitments: (1) the load-bearing architectural pattern — the Hashup pattern — that lets a finite document corpus carry a Scott-continuous interpretation; (2) a concrete specification of Π for this site (the Fregean unsaturated binary functions the corpus declares); (3) the four predicate-category morphism classes realized as theme partials; (4) frontmatter conventions for how authors contribute evidence at Frege cells; (5) output-format rendering per cell-state per format; (6) the contradicting-definitions example worked end-to-end as the demonstration test.
A discrete roadmap follows.

## The Hashup pattern: documents finite, interpretation Scott-continuous

The load-bearing claim, drawn from the hashup-as-restriction memory:

> Most artifacts in the running system can't be infinite, but the *configuration* of how they are interpreted can grow without bound.
> Hashup names the pattern: restrict the algebra to a single token-class with fall-through, and the binding-table inherits the right to grow Scott-continuously.

The translation to the Hugo theme is direct:

- The **content corpus** — every markdown file in `content/`, with frontmatter — is regime-1 (κ < ω, strict).
  Each file is finite; the corpus as a set of files is finite at any moment; the on-disk algebra is a finite carrier.
- The **theme's binding-and-interpretation surface** — `.
  Site.
  Data.predicates`, `.
  Site.
  Data.predicate-morphisms`, `.
  Site.
  Data.kinds`, plus the accumulated cell-valuations the theme computes during a build — is regime-2 (κ = ω, Scott-continuous).
  The binding-table grows by adding entries to data files; the cell-valuation grows by accumulating evidence over the build's trace.
- **Fall-through is inherited.** An unbound predicate-reference (a frontmatter `defines: T` where T has not been declared as a term) should fall through to literal mention — "this is a mention of T as a name" — rather than failing.
  The categorical theme inherits this property the same way Hashup inherits it from Markdown: total parsing with degraded-but-non-failing interpretation at ⊥.
- **The four-cell partition is the four-valued posit-bilattice shadow.** Unbound `#word` in Hashup sits at `potential` (token articulated, claim absent).
  For the theme: an unbound or unevaluated Frege cell sits at potential.
  Binding (frontmatter evidence + predicate-walking + cell-computation by the theme) monotonically lifts cells toward active.
  Contestation (negative evidence at the same cell as positive) forces the `absurd` value.

This pattern is the architectural commitment that licenses everything that follows.
The theme does not have to be a typed lambda calculus or a categorical host language.
It has to be a *binding-table that grows Scott-continuously over a finite document corpus, with fall-through to literal at ⊥*.
Hugo's data-loading + partial-composition is sufficient for this.

## Specifying Π: the Fregean predicate-set for this site

Π is the set of Fregean unsaturated binary functions the site uses.
The current `static/vocab/index.ttl` declares the first members. Π for the initial implementation includes (named in `kebab-case` to match the project's schema convention):

Definitional predicates (about the corpus's content kinds): - `has-definition` — subject: a term-page; object: a definitional claim (literal or page-reference). - `defines` — subject: any page; object: a term-page.
(Converse of has-definition.) - `central-thesis` — subject: a creative-work page; object: a literal claim. - `teleology` — subject: a domain page; object: a literal aim-sentence. - `method` — subject: a domain page; object: a literal method-description.

Relational predicates (about provenance and connection): - `generated-from` — subject: a content-page; object: another content-page.
The generation-chain predicate. - `refines` — subject: a content-page (later); object: a content-page (earlier). - `cites` — subject: a content-page; object: a content-page or external work. - `contests` — subject: a content-page; object: a Frege cell (a (subject, predicate, object) triple).
NEGATIVE evidence carrier.

Type predicates (about kind membership): - `instance-of-kind` — subject: a content-page; object: a kind from the kind-lattice. - `published-as` — subject: a content-page; object: an output-format identifier.

Each predicate is declared in `data/predicates.yaml` (or `data/predicates.json`) as an entry with: - `name`: the predicate's kebab-case identifier - `subject-type`: the type its subject-slot accepts (e.g., `term-page`, `content-page`, `creative-work`) - `object-type`: the type its object-slot accepts (`literal`, `term-page`, `cell-reference`) - `polarity`: `positive` (asserting; e.g., `defines`) or `negative` (contesting; e.g., `contests`) — defaults to `positive` - `converse`: optional reference to the converse predicate (e.g., `defines.converse = has-definition`) - `description`: a human-readable explanation

The `polarity: negative` field is the crucial new piece.
Predicates carry their polarity *in the predicate declaration*, not in the cell.
A frontmatter assertion `contests: <cell-ref>` contributes negative evidence at the cell-ref because `contests` is declared negative-polarity.
Positive predicates contribute positive evidence at the cell they target.
The four-valued cell state emerges from the joint positive-and-negative evidence accumulated by predicates of each polarity hitting the same cell.

## The four predicate-category morphism classes as theme partials

The active tree's predicate-category has four morphism classes (read from the schemas this session): `specializing`, `conversing`, `projecting-to-subject`, `projecting-to-object`.
Each is partial — returns null if the input cell's predicate doesn't match the morphism's source.

For the theme, each becomes a Hugo partial:

- **`partials/cell-morphism/specialize.html`** — input: a cell + a specialization-pair (declared in `data/predicate-morphisms.yaml`).
  Returns: the cell with the specialization-pair's target predicate, same subject/object.
  Used when the theme needs to walk up the predicate-specialization lattice (e.g., a cell with `central-thesis` can be specialized to a cell with `has-claim` if `central-thesis ⊑ has-claim` is declared).
- **`partials/cell-morphism/converse.html`** — input: a cell + a converse-pair.
  Returns: the cell with subject and object swapped and predicate replaced by its converse.
  Used to find "pages whose object-slot is T" by converting them to "T as subject" — necessary for term-page rendering, which lists pages that reference T regardless of slot.
- **`partials/cell-morphism/project-to-subject.html`** — input: a binary cell + a subject-projection declaration.
  Returns: a unary cell (subject, unary-predicate, subject).
  Used to derive unary properties from binary cells (e.g., from `(A, defines, *)` cells you can project to `(A, has-defined-something, A)` — "A is a definition-author").
- **`partials/cell-morphism/project-to-object.html`** — input: a binary cell + an object-projection declaration.
  Returns: a unary cell (object, unary-predicate, object).
  Used analogously to find what objects have been targeted (e.g., from `(*, defines, T)` cells project to `(T, has-been-defined, T)` — "T is a defined term").

These partials are pure data-walking templates.
They consult `data/predicate-morphisms.yaml` for the declared morphism pairs.
They are partial in the categorical sense — they return null if the morphism is not applicable.
The theme's higher-level partials check for null and either skip or aggregate.

The morphism declarations in `data/predicate-morphisms.yaml`:

```yaml
specialization-pairs:
  - source: central-thesis
    target: has-claim
  - source: teleology
    target: has-aim

converse-pairs:
  - forward: defines
    reverse: has-definition

subject-projections:
  - binary: defines
    unary: has-defined-something
object-projections:
  - binary: defines
    unary: has-been-defined
```

This is the predicate-category C realized as data.
The theme walks C via these partials.

## Frontmatter conventions: how authors contribute evidence at Frege cells

The author-facing surface should look like ordinary YAML frontmatter.
The theme reads each frontmatter assertion and computes which Frege cells it contributes evidence to.

The conventions:

**Bare assertion (positive evidence at a cell):** A frontmatter field whose name is a predicate's name and whose value is the object contributes positive evidence at the cell `(this-page, <predicate>, <value>)`.

```yaml
---
title: "Some Letter About T"
defines:
  - T: "T means X for-reason Y"
cites:
  - 2024-letter-foo
  - external:doi:10.1234/abc
---
```

Reads as: the cell `(this-page, defines, T-with-claim-"T means X for-reason Y")` gains positive evidence; the cell `(this-page, cites, 2024-letter-foo)` gains positive evidence; the cell `(this-page, cites, external-DOI)` gains positive evidence.

**Negative-polarity predicate (negative evidence at a target cell):** A frontmatter field whose name is a negative-polarity predicate and whose value names a target cell contributes negative evidence at that cell.

```yaml
---
title: "Some Letter Contesting Foo's Definition of T"
contests:
  - cell:
      subject: 2024-letter-foo
      predicate: defines
      object: T-with-claim-"T means X for-reason Y"
    for-reason: "X conflates two distinct notions; the right definition uses W instead of X"
---
```

Reads as: the cell `(2024-letter-foo, defines, T-with-claim-"T means X for-reason Y")` gains negative evidence with the contest-reason attached.
That cell now has positive evidence (from the foo letter's `defines:` assertion) AND negative evidence (from this letter's `contests:` assertion).
The cell's state is absurd.

**Frege cell references:** A cell-reference is a structured value (`{subject, predicate, object}`).
It identifies a triple-position in Φ.
The theme builds a stable string-identifier from the triple (subject-slug + predicate-name + object-slug-or-claim-hash) so cells can be addressed reliably.

These conventions are what authors write.
The theme's positing-partials read these conventions and walk them.

## Theme architecture: positing-partials and settling-partials

The theme implements positing and settling as two layers of partials.

**Positing layer.** For each page in the build, a positing-partial reads the page's frontmatter and emits one or more cell-evidence-records into a build-scope accumulator (Hugo's `.
Site.
Scratch` or, better, a `data/`-side-effect via `resources.
Get` JSON-emit pattern).
Each evidence-record is:

```
{
  cell: {subject, predicate, object},
  evidence: "positive" or "negative",
  source-page: "the page that asserted this",
  for-reason: "if negative, the contest reason"
}
```

The positing-partial for a given page is invoked during that page's render.
By the time all pages have been rendered once, the accumulator holds the full evidence collection.
This is one trace step τ per page: each page's render contributes the page's frontmatter-evidence to the trace.

**Settling layer.** After all positing has run, a settling-partial runs per cell to compute the cell's final four-valued state by combining the accumulated positive and negative evidence:

```
positive-evidence-count = number of positive-evidence records at this cell
negative-evidence-count = number of negative-evidence records at this cell

if positive == 0 and negative == 0: cell-state = potential
if positive > 0 and negative == 0: cell-state = active
if positive == 0 and negative > 0: cell-state = stable
if positive > 0 and negative > 0: cell-state = absurd
```

The settling-partial returns the cell-state plus the evidence-record lists.
Higher-level rendering partials consume this to produce the appropriate HTML and RDF.

This requires two passes over the corpus.
Hugo's standard render pass can be the positing pass; a second `partial` invocation during page rendering reads the accumulated evidence for cells relevant to that page and produces the settled rendering.
The two-pass shape is a known Hugo pattern (e.g., for computed indices); it is not exotic.

**Concrete partial inventory for the first implementation:** - `partials/positing/emit-evidence.html` — per-page, reads frontmatter, emits evidence records. - `partials/settling/compute-cell-state.html` — given a cell, computes its four-valued state from accumulated evidence. - `partials/settling/render-cell-html.html` — given a cell and its state, produces the HTML rendering (different output per state). - `partials/settling/render-cell-jsonld.html` — given a cell and its state, produces the JSON-LD rendering. - `partials/settling/render-cell-ttl.html` — given a cell and its state, produces the Turtle rendering. - `partials/cell-morphism/{specialize,converse,project-to-subject,project-to-object}.html` — the four predicate-category morphism partials.

That is the minimum partial-set.
About a dozen files.

## Output-format renderings per cell-state per format

For each (cell-state, output-format) combination, the theme needs to specify what gets rendered.
The (state × format) grid:

| | HTML | JSON-LD | Turtle |
|---|---|---|---|
| potential | (no rendering — the cell is empty) | (no triple emitted) | (no triple emitted) |
| active | `<div class="cell active"><span class="subject">S</span> <span class="predicate">P</span> <span class="object">O</span></div>` plus citation-link to source-page | `{"@id": "S", "P": "O"}` | `S P O .` |
| stable | `<div class="cell stable">S P O is not the case (per source-page)</div>` | `{"@id": "S", "negated:P": "O"}` (using a `negated:` prefix vocabulary) | `S emsenn:does-not-have-P O .` |
| absurd | `<div class="cell absurd"><span class="claim">S P O</span> <span class="contest">contested by source-page-B: for-reason</span></div>` | `{"@type": "emsenn:AbsurdCell", "claim": {S, P, O}, "positive-evidence": [...], "negative-evidence": [...]}` | `_:b emsenn:absurdAt [emsenn:subject S; emsenn:predicate P; emsenn:object O]; emsenn:positiveEvidence ...; emsenn:negativeEvidence ... .` |

The absurd-cell vocabulary is the part that the current `static/vocab/index.ttl` does NOT yet declare.
New ontology entries needed:

```turtle
emsenn:AbsurdCell
  rdf:type owl:Class ;
  rdfs:label "absurd cell" ;
  rdfs:comment "A Frege cell at (subject, predicate, object) with both positive and negative evidence accumulated. Recorded as state, not as error." .

emsenn:positiveEvidence
  rdf:type rdf:Property ;
  rdfs:domain emsenn:AbsurdCell ;
  rdfs:range schema:CreativeWork .

emsenn:negativeEvidence
  rdf:type rdf:Property ;
  rdfs:domain emsenn:AbsurdCell ;
  rdfs:range schema:CreativeWork .

emsenn:contestReason
  rdf:type rdf:Property ;
  rdfs:domain emsenn:AbsurdCell ;
  rdfs:range rdfs:Literal .
```

These are added to `static/vocab/index.ttl` and `static/vocab/index.html` as part of the implementation.

## The contradicting-definitions example worked end-to-end

The demonstration test.
Imagine three pages in the corpus:

**Page 1: `content/terms/relationality.md`** (a term-page)
```yaml
---
title: "Relationality"
type: term
---
Relationality is the concept that...
```

**Page 2: `content/letters/2024-01-letter-on-relationality.md`** (asserts a definition)
```yaml
---
title: "On Relationality"
type: letter
defines:
  - term: relationality
    claim: "Relationality is the priority of relations over relata, ontologically"
---
... letter body ...
```

**Page 3: `content/letters/2024-06-letter-contesting-the-prior.md`** (contests that definition)
```yaml
---
title: "On the Limits of the Prior Definition"
type: letter
contests:
  - cell:
      subject: 2024-01-letter-on-relationality
      predicate: defines
      object:
        term: relationality
        claim: "Relationality is the priority of relations over relata, ontologically"
    for-reason: "The definition smuggles in a static-ontology framing; relationality is about process, not priority"
---
... letter body ...
```

The build runs.
The positing-partial for page 2 emits a positive-evidence record at cell `(2024-01-letter-on-relationality, defines, relationality-with-claim-"...priority...")
`.
The positing-partial for page 3 emits a negative-evidence record at the same cell, with the contest-reason attached.
The settling-partial computes the cell's state as absurd.

When page 1 (the term-page for relationality) renders, its layout invokes `partials/settling/render-cell-*.html` for cells with `predicate = defines` and `object = relationality`.
The HTML output of the relationality term-page now contains:

```html
<section class="definitions">
  <h2>Asserted Definitions</h2>
  <article class="cell absurd">
    <p class="claim">"Relationality is the priority of relations over relata, ontologically"</p>
    <p class="source">asserted by <a href="/letters/2024-01-letter-on-relationality/">2024-01 Letter on Relationality</a></p>
    <p class="contest">contested by <a href="/letters/2024-06-letter-contesting-the-prior/">2024-06 Letter</a></p>
    <p class="contest-reason">The definition smuggles in a static-ontology framing; relationality is about process, not priority</p>
  </article>
</section>
```

The JSON-LD output of the same page contains an `emsenn:AbsurdCell` block.
The Turtle output contains the corresponding `emsenn:absurdAt` blank node.
The build does not fail; the contradiction is rendered with both the original claim and the contest visible.

If a third letter later confirms or refutes one side, more evidence accumulates at the same cell.
The cell stays absurd until the negative-evidence is withdrawn (the contesting letter is unpublished or marks itself `retracted: true`).
The author can read the rendered absurd-cell at any time and decide whether to: (a) accept the contestation and revise the original definition (which dissolves the absurd cell by removing the positive evidence); (b) reject the contestation and add a counter-contest (which produces a more elaborate evidence-chain); (c) leave it absurd and let readers see the disagreement (the published-site-as-honest-record).

## Roadmap

Discrete steps from current state to first working categorical-positing theme.
Each step is independently testable.

**Step 1 — Declare Π in data/.** Write `data/predicates.yaml` with the predicates listed in the "Specifying Π" section.
Each entry includes subject-type, object-type, polarity, optional converse, description.
Verify with a small test partial that lists all declared predicates.

**Step 2 — Declare the predicate-category C in data/.** Write `data/predicate-morphisms.yaml` with the specialization-pairs, converse-pairs, subject-projections, and object-projections.
Initially small — just the morphisms needed for `defines` ↔ `has-definition`.
Verify with the four cell-morphism partials returning correct results on hand-constructed test cells.

**Step 3 — Implement the positing layer.** Write `partials/positing/emit-evidence.html`.
It reads a page's frontmatter, identifies which fields correspond to declared predicates, emits evidence-records keyed by cell-identifier.
Persist the records via `.
Site.
Scratch` or via a build-side-effect file.
Verify on the three example pages from the contradicting-definitions example.

**Step 4 — Implement the settling layer.** Write `partials/settling/compute-cell-state.html`.
Given a cell-identifier, look up all evidence-records at that cell, compute the four-valued state.
Verify on the example: cell state = absurd.

**Step 5 — Implement cell-renderings per format.** Write `partials/settling/render-cell-html.html`, `render-cell-jsonld.html`, `render-cell-ttl.html`.
Each handles the four cell states explicitly.
Verify by rendering the example term-page and checking the HTML/JSON-LD/Turtle outputs match the specifications above.

**Step 6 — Add the absurd-cell vocabulary to `static/vocab/`.** Extend `index.ttl` and `index.html` with the new ontology terms: `emsenn:AbsurdCell`, `emsenn:positiveEvidence`, `emsenn:negativeEvidence`, `emsenn:contestReason`.
Verify the published vocabulary resolves to itself (the URI `/vocab/` serves both human and machine forms).

**Step 7 — Wire the term-page layout to render cells.** Write or update `layouts/terms/single.html` to invoke the cell-rendering partials for all cells where the current term is the subject (and, via the converse morphism, where it is the object).
The layout shows the term's accumulated definitional cells, with appropriate state-specific rendering.

**Step 8 — Test contradicting-definitions end-to-end.** Add the three example pages from the demonstration section as test fixtures.
Run a Hugo build.
Inspect the relationality term-page's HTML, JSON-LD, Turtle outputs.
Verify the absurd-cell is rendered correctly in all three formats.
This is the acceptance test.

**Step 9 — Document the conventions for authors.** Write a `docs/authoring-conventions.md` explaining the frontmatter conventions, the predicate vocabulary, and what authors should expect to see when their assertions land in active vs. absurd cells.
This is the surface that lets emsenn (and any future contributors) work with the theme without reading the partial-template source.

Steps 1–8 are buildable in a small number of sessions.
Step 9 is documentation but is what makes the rest usable.
The acceptance test (Step 8) is concrete enough to know when the first implementation is done.

## What this plan does NOT include

The plan is deliberately bounded to the first working implementation.
Several things that the categorical SSG might eventually want are out of scope here:

- The Lawvere comprehension morphism (the `comprehending/` schema just placed in the active tree) is not used in the first implementation.
  Comprehension is a higher-level operation; the first theme handles only direct cell-state computation, not the comprehension of fiber-algebras into specialization-pairs.
- Full settlement-algebra composition operations (`Build A ⊓ Build B` etc.) are not implemented.
  The first theme produces single builds; build-composition is a future capability.
- Incremental-rebuild as a categorical morphism is not implemented.
  The first theme rebuilds from scratch each time.
- The trace-bound λ is set implicitly to "however many evidence-emission passes Hugo performs."
  Making λ a first-class configurable parameter is future work.
- Predicate-fiber-algebras (the hyperdoctrine layer) are not surfaced to authors.
  Authors work with predicates and cells; the fiber-algebra structure on Π is held in the theme's data files but not exposed.

These omissions are deliberate: they keep the first implementation focused on the load-bearing demonstration (contradiction recorded rather than crashed), with the more elaborate categorical machinery added later if and as it earns its place.

## Status

This entry: read the four predicate-category morphism schemas (specializing, conversing, projecting-to-subject, projecting-to-object), read the newly-placed comprehending schema and predication-hyperdoctrine structure, read the settling/projecting schema, and integrated the hashup-as-Scott-continuous-restriction memory as the load-bearing architectural pattern.
Produced a concrete nine-step roadmap for the first working categorical-positing Hugo theme, with the contradicting-definitions example specified end-to-end as the acceptance test.
No code or schemas written in the theme yet; this is the design document.

The single strongest claim of this entry: **the Hashup pattern — finite carrier, Scott-continuous binding-table, fall-through at ⊥ — is the architectural commitment that makes a categorical static site generator implementable in Hugo without rebuilding Hugo.** The content stays markdown files.
The theme is the binding-table that grows Scott-continuously.
The four-valued cell semantics gives us contradiction-as-recorded-state for free.
Implementation is roughly a dozen partial templates, two data files, an ontology extension, and one layout update.
The acceptance test is concrete.
