---
title: emsenn Visual Language — Design System
status: living
edition: v0.3
drafted: 2026-05-01
consolidated: 2026-07-02
governs: design-system.css
supersedes-values-in: code/structures/, code/transformers/, prose/ (v0.1 generation)
---


A design language for emsenn's writing, software, and printed matter — one
type family, seven inks, one spacing rhythm, five devices, three page
geometries, three density modes, four type roles, three page templates.
Print is the primary surface; screen inherits its decisions.

This document is the single reference. [`design-system.css`](design-system.css)
is its single build. Together they are the two files a new contributor
needs to make a page that reads as emsenn's. Everything else in this
directory is the working history that produced them — kept, not deleted
(see [Provenance](#provenance)).

## Contents

1. [Principles](#principles)
2. [Foundations — tokens](#foundations--tokens)
3. [Type](#type)
4. [Devices](#devices)
5. [Layout](#layout)
6. [The mark](#the-mark)
7. [Components](#components)
8. [Page templates](#page-templates)
9. [Voice](#voice)
10. [Accessibility](#accessibility)
11. [Print](#print)
12. [Governance](#governance)
13. [Provenance](#provenance)
14. [Open questions](#open-questions)
15. [References](#references)

---

## Principles

The kit is a **resource graph**, not a stylesheet. Every token, device,
type rule, grid, and component is one file, deciding one thing, citing its
dependencies and declaring who depends on it (`@ems-cites` /
`@ems-cited-by`). A stylesheet collapses "what colors exist," "where
colors are used," and "what colors are forbidden" into one file; the kit
keeps those three decisions in three places so any one of them can be
edited, bumped, or retired without touching the other two. See
`prose/teaching/explanations/the-resource-graph-as-design.md` for the
full argument.

**Closed sets, grown by earned addition.** Every dimension the kit names —
colors, spacing units, type sizes, weights, rule weights, devices, page
geometries, density modes — is a finite, enumerated set. An artifact may
use only a listed member; a value outside the set is a defect, not a
variant. A set grows only after three independent, cited uses have
demanded the addition (`governance/extension`, §12). Open sets dilute the
felt weight of every member; a seven-color palette makes each color twice
as recognizable as a fourteen-color one.

**Verbs, not hues.** The three jewel colors — oxblood, teal, indigo — are
each bound to one verb: oxblood *emphasizes*, teal *signals*, indigo
*cites*. A jewel-colored mark that performs no verb is decorative, which
the kit forbids. Salience is scarce by design: at most one jewel-toned
mass per page-level artifact (a masthead's oxblood beam, a citation
cluster's indigo beam, a tag-stack's indigo key are each their own
component-level artifact and may coexist — see [Foundations →
Color](#color)).

**Print-native.** Print does not let the kit hide: the printer's color
profile, the paper, the fold, the bind are all fully-checked at proofing,
and a decision that fails there is rolled back. Screen and web are
renderings of the print decision, never their own decision. A resource
that requires JavaScript or a screen surface to function is not a kit
resource.

**One voice.** Specs, components, and this document are set in the same
register: noun-clause, present-tense, no exhortation, no marketing voice.
`a rule is one solid stroke at one of two weights`, not `use rules
sparingly`. See [Voice](#voice).

**The kit is written in the language it describes.** This document
follows its own conventions — sentence case, ISO dates, decorator-style
reference tables — because a spec written in a different register from
its own artifacts teaches the reader that the spec is optional.

**Accretion, not refactor.** The kit is a research vault. It never
deletes a retired resource, never renames a published id, and never adds
a resource speculatively. See [Governance](#governance).

---

## Foundations — tokens

### Color

Seven named inks. Two grounds, two inks-on-ground, three jewels. Named by
structural role, not hue, so a future revision of the hex value never
breaks a consumer of the token name.

| Token | Hex | Role | Verb |
|---|---|---|---|
| `--ems-color-paper` | `#efe9dc` | ground — warm bone, primary surface | — |
| `--ems-color-paper-deep` | `#e3dccb` | ground, recessed — one half-step into shadow | — |
| `--ems-color-ink` | `#1a1814` | figure — primary type and structure | — |
| `--ems-color-ink-soft` | `#4a443a` | figure, recessed — secondary text, metadata | — |
| `--ems-color-teal` | `#0e3a3a` | jewel | **signal** — current state, link, focus |
| `--ems-color-oxblood` | `#6b1e1a` | jewel | **emphasize** — masthead, opening anchor |
| `--ems-color-indigo` | `#1c2752` | jewel | **cite** — citations, archive, footnotes, tags |

All seven pairings against both grounds clear WCAG AAA at body size (see
[Accessibility](#accessibility)). Never pure `#000`/`#FFF` — print never
produces either, and the kit's ground truth is print.

**One jewel per artifact, where "artifact" is component-scoped.** A
single page may carry an oxblood masthead beam, an indigo citation
cluster, and teal links at once — these are three different component-
level artifacts sharing one page, each with its own single jewel. Two
jewels performing the *same* verb on the *same* component-level artifact
is a defect; when two jewels compete for one mark, emphasize (oxblood)
wins over cite (indigo) wins over signal (teal), and the loser demotes to
`--ink`.

Print: two-color default (ink + one jewel, typically oxblood as the
spot-color plate); one-color permitted (ink only — jewels flatten to
ink); three-color forbidden on a single artifact. Pantone references and
CMYK builds are in `design-system.css` §1 (`tokens/color`).

### Space

One rhythm unit, 8px, and seven multiples. Every margin, padding, gap,
gutter, and offset resolves to one of these eight values — nothing
between them.

| Token | Value | Typical use |
|---|---|---|
| `--ems-u` | 8px | list-item gap, minimal paragraph spacing |
| `--ems-u2` | 16px | paragraph rhythm, row padding |
| `--ems-u3` | 24px | component padding, section gaps |
| `--ems-u4` | 32px | component gap, block padding |
| `--ems-u5` | 48px | section margin, masthead mark padding |
| `--ems-u6` | 64px | screen page padding |
| `--ems-u7` | 96px | print top margin |
| `--ems-u8` | 128px | citation-cluster key column, cover margin |

There is no sub-8px unit. A layout that "almost works" at 12px has a
structural problem the fix is a full unit promotion, not a half-step —
this is the scale's own conflict rule (`tokens/space`), and it applies
even where an earlier draft of the kit carried a 4px half-unit; that
value did not survive into the current generation (see
[Provenance](#provenance)).

### Type family and weight

Three IBM Plex faces, self-hosted (no third-party CDN), sharing one
x-height and weight progression so the kit can move between them without
a typographic seam.

| Token | Family | Role |
|---|---|---|
| `--ems-type-sans` | IBM Plex Sans | structural — display, heading |
| `--ems-type-serif` | IBM Plex Serif | body — prose, lede |
| `--ems-type-mono` | IBM Plex Mono | spec — metadata, citations, code, tags |

| Token | Weight | Bound role |
|---|---|---|
| `--ems-weight-light` (300) | reserved — loaded, unbound |
| `--ems-weight-regular` (400) | body, mono data |
| `--ems-weight-medium` (500) | sans structure, mono labels |
| `--ems-weight-semibold` (600) | reserved — loaded, unbound |
| `--ems-weight-bold` (700) | prose `<strong>` only, twice per page maximum |

Two weights per artifact: sans-medium for structure, serif-regular for
body, mono-medium for spec labels, mono-regular for spec data. A page
that needs a third weight to read clearly has a structural problem more
weight will not fix.

### Type scale

Seven sizes, each paired with one leading. Role picks size; size never
picks role.

| Token | Size | Leading | Use |
|---|---|---|---|
| `--ems-size-display` | 96px | 0.9 | cover, masthead — type as mass |
| `--ems-size-h1` | 48px | 1.05 | page title |
| `--ems-size-h2` | 24px | 1.25 | section title |
| `--ems-size-lede` | 20px | 1.5 | opening paragraph |
| `--ems-size-body` | 16px | 1.65 | default prose |
| `--ems-size-spec-data` | 14px | 1.55 | mono metadata values |
| `--ems-size-spec` | 12px | 1.5 | mono labels, tracked uppercase |

### Rule weight

Two stroke weights only. A stroke is either a separator (hairline) or a
mark (beam); there is no third, ambiguous weight.

| Token | Weight | Role |
|---|---|---|
| `--ems-rule-hair` | 1px screen / 0.25mm print | section breaks, dividers, table rules |
| `--ems-rule-beam` | 2px screen / 0.5mm print | anchors (devices/beam), focus indicators, hover underline |

---

## Type

Four roles. Every text node on every page is exactly one of them; size,
weight, family, and color follow from role.

| Role | Family / weight | Size | Job |
|---|---|---|---|
| **display** | sans, medium | 96px or 48px | primary structural mass — masthead, cover; at most one per page |
| **heading** | sans, medium | 48px (h1) or 24px (h2) | section/subsection title; two levels only, never three |
| **body** | serif, regular | 16px or 20px (lede) | long-form prose; 38em measure, ragged right |
| **spec** | mono, medium (label) or regular (data) | 12px or 14px | metadata, paths, dates, code, tags, citations |

A fifth role does not exist — content that fits none of the four is
either mis-scoped or evidence for a role proposal under
[Governance](#governance), never an ad-hoc style.

**Prose conventions** (`type/prose`): paragraphs break by space (16px),
never by first-line indent; unordered lists mark with an em-dash, ordered
lists with a mono decimal-leading-zero counter; blockquotes indent 24px
with a hairline left rule, set in italic ink-soft; inline code is mono in
teal; code blocks are mono, bracketed by hairlines, no background fill;
links are teal with a hairline underline that thickens to beam weight on
hover, with no color change.

**Citation typography** (`type/citations`): every citation renders in
indigo mono, in one of three forms — **inline** (author-year, in flow),
**footnote** (a superscript mark plus a foot- or margin-entry, for
supplementary sources or elaboration), or **cluster** (a bibliographic
block, required once a document carries three or more sources). Position
carries the hierarchy; color never varies by citation importance.

---

## Devices

Five permitted marks. Nothing else draws structure onto a page.

| Device | What it is | Forbidden as |
|---|---|---|
| **rule** | a 1px ink hairline, full column width — the page's hinge | decoration around an already-spaced region; more than 3 per 800px viewport |
| **beam** | a 2px, jewel-colored short stroke (24/32/48px) that anchors a moment — masthead, focus, citation opening | a separator between equal regions (that's a rule); more than one oxblood beam per page |
| **block** | type-as-mass: `block/beam` (display-scale headline as structural weight) or `block/reservoir` (a dense paragraph as counterweight) | center-aligned; framed with borders or fill |
| **spine** | the vertical structural axis — void (empty column) or rule (1px ink line) — holding metadata and prose in relation | a vertical line with no column structure on either side |
| **triad** | three equal-weight, equal-spaced sibling elements — the smallest pattern that reads as rhythm, not enumeration | jewels mixed across the three; a fourth element nudged smaller |

Each device carries its own full anatomy, geometry, and refusal list in
`design-system.css`; the table above is the index, not the spec.

---

## Layout

### Page geometry

Every page declares exactly one of three geometries, first, before any
other composition decision.

| Geometry | Shape | Use |
|---|---|---|
| **scholar** | 1/3 metadata margin + 2/3 prose column, gap 32px | letters, essays, papers — single-thread prose with apparatus |
| **paired** | two equal columns, gap 48px | genuinely parallel content — translation, Q&A, annotation |
| **index** | 12-column grid, gap 24px | archive listings, tables of contents — scan, not flow |

Collapses to a single column below 720px viewport; the spine becomes a
horizontal rule.

### Density mode

Every page declares exactly one density, after geometry. Density resets
padding, paragraph gap, and prose measure as a coordinated triple — never
per-element.

| Density | Page padding | Paragraph gap | Measure | Use |
|---|---|---|---|---|
| **letter** | 64px | 24px | 32em | essays, correspondence — prose-led |
| **spec** | 32px | 8px | 38em | technical specification, reference — reference-led |
| **index** | 48px | 16px | unconstrained | listings, glossaries, search results — scan-led |

### Reservoir layout

The scholar page's structural pattern: a spine holding metadata, a
reservoir block holding the prose read, in one of three positions —
**right** (default: spine 1/3 left, reservoir 2/3 right), **left**
(annotation: reservoir 2/3 left, spine 1/3 right), or **split** (formal
apparatus: 1/5 spine, 3/5 reservoir, 1/5 spine). A reservoir without a
spine collapses into ordinary body prose; a spine without a reservoir is
decoration — neither is permitted alone.

---

## The mark

The wordmark is `emsenn`, set in IBM Plex Sans Medium at −0.04em
tracking, with a single 32×2px oxblood beam positioned at x-height to
its right. It is **set, not drawn** — composed entirely from the kit's
own type and beam primitives, with no separately-maintained logo asset.
The SVG at `tools/emsenn-source/emsenn-language/marks/wordmark.svg` is a
generated sidecar for contexts needing a vector asset (favicon, embedded
mark), not the canonical form.

One wordmark per page, appearing only inside a [masthead](#components).
Never centered, never in a jewel color other than its beam, never
without its beam. At one-color print the beam becomes ink — the kit
accepts the trade rather than adding a second logo variant.

---

## Components

| Component | Anatomy | Required on |
|---|---|---|
| **masthead** | spec-band (path·date·license) → wordmark + oxblood beam → spec-band (section·issue) | every published page, at the top edge |
| **breadcrumb** | mono, uppercase, tracked; segments joined by ` › ` | pages nested ≥2 levels below the library root |
| **colophon** | a triad of label/value cells (contact · license · support), opening hairline, 64px clear space above | every published page, at the foot |
| **citation cluster** | opening indigo beam; rows of mono indigo key + serif ink body | documents with ≥3 cited sources |
| **footnote system** | indigo mono superscript mark in body + numbered entry (foot or margin) | documents using footnote-form citations or elaborations |
| **tag-stack** | vertical (or inline, on listings) stack of plain mono indigo links, no pills, no backgrounds | every letter and library entry's metadata column |

Each component's full required/permitted/forbidden list, geometry, and
test is the corresponding `@ems-prose` block in `design-system.css`.

---

## Page templates

Three templates cover the kit's work. A page that resists all three is
usually doing too much — split it.

| Template | Geometry · density | Composition |
|---|---|---|
| **letter** | scholar · letter | masthead → (breadcrumb) → reservoir (spine: date, tags, footnotes / body: h1, lede, prose) → (citation cluster) → colophon |
| **spec-doc** | scholar · spec | masthead → status band → title + lede → numbered sections (≤15, each a hairline-separated row) → (citation cluster) → colophon |
| **library-page** | index · index | masthead → breadcrumb → h1 → (lede) → index rows (date · title · tags) → colophon |

Every template requires a masthead and a colophon; there is no published
page without both (see the retired v0.1 term for this rule,
`masthead-on-published`, in `prose/learning/claims/`).

---

## Voice

Editorial register for every word the kit renders.

- **Casing.** Sentence case for prose and titles; lowercase for tags,
  links, and button labels; ALL CAPS (tracked) only in mono spec voice
  (bands, colophon cells, footnote titles).
- **Dates.** ISO 8601 only — `2026-05-01`; ranges as
  `2026-05-01 / 2026-05-08`; no locale-formatted dates anywhere.
- **Sentences.** One idea per sentence, 15–20 words average, 30-word
  hard cap. Compound sentences: two clauses maximum, joined by a
  coordinator.
- **Vocabulary.** Anglo-Saxon over Latinate when equally precise (*begin*
  not *commence*); Latinate permitted when precision demands it
  (*specify*, *refute*).
- **No marketing voice.** No exclamation marks, no "amazing," no second
  person sales register, no "click here."
- **Buttons and links read as their action** — "read the letter," not
  "more" or a bare arrow.
- **Errors** are lowercase sentences with a period, naming the path,
  never blaming the reader: *"the page at /library/onomastics could not
  be found."* **Empty states** are lowercase sentences with no period —
  a status, not a statement.

---

## Accessibility

The floor every kit page meets, not a layer added afterward.

- **Contrast.** Every ink/ground pairing clears WCAG AAA (7:1 body,
  4.5:1 display) — ink-on-paper 14.2:1, ink-soft-on-paper 7.8:1,
  teal-on-paper 9.4:1, oxblood-on-paper 8.9:1, indigo-on-paper 11.2:1.
- **Minimum sizes.** Body 16px floor, spec-data 14px floor, spec-label
  12px floor. Nothing smaller.
- **Focus.** A 2px teal outline at 2px offset, on `:focus-visible` only,
  added rather than a recolor of the element itself.
- **Color is never the only carrier.** Every verb-colored mark also
  carries a typographic or positional signal.
- **Semantic HTML first.** `<header>` for masthead, `<nav>` for
  breadcrumb, `<main>` for body, `<footer>` for colophon, `<cite>` for
  citations, `<a rel="tag">` for tags — classes cite structure, they
  never construct it.
- **Plain-text fallback.** Every page reads, unstyled, as a
  well-structured document; every link, citation, and footnote
  return-link works with JavaScript disabled.
- **Reduced motion.** The kit is static by design; its few transitions
  (footnote scroll, entry highlight) degrade to instant under
  `prefers-reduced-motion: reduce`.

---

## Print

Print is the primary surface (see [Principles](#principles)); this is
its production spec.

- **Stock.** Uncoated text, cream or warm white — 80gsm (letters), 100gsm
  (spec-docs, bound papers), 250–300gsm cover stock (cards). No glossy or
  coated body stock.
- **Ink.** Two-color default: ink (warm-shifted CMYK black) + one jewel
  (oxblood as the standard second plate, Pantone 7644 C). One-color
  (ink only) permitted; three-color+ forbidden on a single artifact.
- **Sizes.** US Letter (8.5×11") and A4 (210×297mm) for correspondence
  and papers; 3.5×2" business card; 4×6" postcard.
- **Margins.** 96px-equivalent top, 64px sides, 48px bottom; inner
  margin gains binding allowance when bound.
- **Folio.** Bare numeral, centered between margins, mono ink-soft,
  omitted on the cover and on single-page documents.
- **PDF.** One PDF per document; Plex embedded (subset acceptable,
  reference-only forbidden); bookmarks mirror heading structure past
  eight pages.

---

## Governance

The kit is a research vault, not a product. It **accretes; it does not
refactor.**

- **Earned addition.** A resource enters after an existing artifact has
  needed it and worked around it three times; the third workaround is
  the new resource's first draft. Proposing a resource speculatively is
  forbidden.
- **Versioning.** Each resource carries `<status> · v<major>.<minor> ·
  <date>`. A major bump signals a contract change (a renamed token, a
  changed device geometry, a changed component anatomy); a minor bump is
  editorial. The kit's declared version is the highest version any
  single resource has reached — currently **v0.3**.
- **The citation graph is bidirectional.** Every resource declares what
  it cites and is cited by; a contract change requires reading every
  entry in the resource's `@ems-cited-by` list and updating each
  cite-side before the change lands.
- **Retirement, never deletion.** A resource no longer in use is marked
  `retired · <date> · superseded-by <id>`; the file stays on disk. A
  future reader can walk the graph backward through every layer the kit
  has ever been.
- **Names are permanent.** A resource that wants a different name is a
  different resource — retire the old id, create the new one.

---

## Provenance

This archive holds **two generations** of the same design language,
never reconciled into one build until now:

1. A **v0.1 prose-spec-doc generation** (`concepts/`, `code/structures/`,
   `code/transformers/`, `prose/`), drafted 2026-05-02, edition v.0.1 —
   the philosophical articulation: closed sets, the resource graph, the
   decorator scheme, verb-as-color, print-native, spec-voice,
   governance-as-archive. Its four narrative essays in
   `prose/teaching/explanations/` are the clearest statement of *why*
   the kit is shaped the way it is, and nothing in the later generation
   contradicts them — it only refines their numbers.
2. A **v0.3 CSS generation** (`tools/emsenn-source/emsenn-language/`),
   drafted 2026-05-01, the working, buildable, self-citing
   implementation this document and `design-system.css` are built from —
   complete with Pantone/CMYK targets, measured AAA contrast ratios, a
   real accessibility and print production spec, and an editorial voice
   guide the v0.1 generation never reached.

Where the two disagreed on a concrete value, this consolidation follows
the kit's own governance rule: **the higher-versioned, later-instrumented
generation is the current one; the earlier generation is retired, not
deleted, and remains readable for its rationale.** Concretely:

| Dimension | v0.1 (retired) | v0.3 (current, used here) |
|---|---|---|
| Color hex values | `#F5F0E6` / `#7A2E2E` / … | `#efe9dc` / `#6b1e1a` / … *(this doc)* |
| Spacing scale | 4–64px, 8 steps incl. a 4px half-unit | 8–128px, 8 steps, no sub-8px value |
| Type roles | display · body · label · mono | display · **heading** · body · **spec** |
| Rule weights | three (hairline 0.5px / regular 1px / heavy 2px) | **two** (hair 1px / beam 2px) |
| Density modes | airy · working · archive | **letter · spec · index** (renamed to match templates) |
| Wordmark | word + plain underline | word + **oxblood beam** at x-height |
| One-jewel rule | strict, whole-page | refined: one jewel **per component-level artifact** |

Every component and template spec'd only in the v0.1 corpus (masthead,
colophon, breadcrumb, tag-stack, footnote system, citation forms,
reservoir layout, letter/spec-doc/library-page templates, the five
devices, the three page geometries) turned out to have a direct, more
complete v0.3 counterpart — so nothing from the v0.1 generation's
*structure* was lost; only its *numbers* were superseded. Its narrative
prose, its open questions, and its bibliography remain the best available
statement of the kit's reasoning and are cited throughout this document
rather than restated.

Nothing was deleted to produce this consolidation. `design-system.css`
and this document are new files, added alongside the full existing
archive.

---

## Open questions

Carried forward, unresolved, from `questions/` — each needs three
independent, cited artifacts to close per the earned-addition rule:

- **Data visualization.** No chart-geometry or chart-color extension
  exists yet; Tufte is the cited lineage for whatever the kit eventually
  specifies.
- **Moving image.** No timing, easing, frame-rate, or caption spec
  exists; every kit resource currently assumes a static surface.
- **Non-Latin typography.** IBM Plex ships Arabic, Devanagari, Hebrew,
  Thai, and CJK variants, but the kit has not adopted any, nor specified
  RTL/vertical-flow page geometry or reservoir mirroring.

## References

- Bringhurst, *The Elements of Typographic Style* — type-role
  discipline, leading and measure, restrained typography.
- Tufte, *The Visual Display of Quantitative Information* /
  *Envisioning Information* — data-ink ratio, salience scarcity, the
  cited lineage for the open data-visualization question.
- Tschichold — *The Form of the Book*, *Asymmetric Typography* — rule
  typography, the masthead-as-title-page tradition, lowercase as a
  constructed (not declaimed) page.
- WCAG 2.2 — the accessibility floor the kit exceeds by design.
- IBM Plex specimen and OFL license.
- Hochuli & Kinross, *Designing Books* — the codex margin, the colophon,
  print production.
- Full bibliography: `references.bib`, `references/*.md`.
