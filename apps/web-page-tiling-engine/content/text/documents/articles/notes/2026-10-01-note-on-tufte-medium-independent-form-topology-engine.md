---
title: "TUFTE beyond the web: medium-independent form topology engine plan"
description: "Architectural plan to recover TUFTE's intended meaning as the Tiling User Form Topology Engine: a semantic, topological, styleable, multi-medium rendering engine whose web runtime is one projection rather than the engine itself."
date-created: 2026-10-01
type: note
status: proposed
supersedes-in-part:
  - 2026-08-30-note-on-tufte-framework-charter
related:
  - 561 Group Design Bible v0.3
  - 561 Group design tokens
  - relating graph coloring
  - computing aperiodic tiling
---

# TUFTE beyond the web

TUFTE's name is a stronger architecture than its current package boundary.

The present `@red-cup-engineering/web-page-tiling-engine` has several correct
seeds: normalized semantic tiles, typed forms, topology inspection, pure
reducers returning receipts and refusals, persistent workspaces represented as
values, logical reading order separated from visual arrangement, and
deterministic geometry derived from a workspace. Those should be preserved.

The package is nevertheless still organized primarily as a web application
framework. Its theme contract ultimately resolves to CSS, its renderer emits
HTML, and application/runtime/publication/storefront concerns surround the
topological core. That is useful software, but it is narrower than the phrase
**Tiling User Form Topology Engine**.

The intended engine should make the web one rendering target among several.
A single semantic form-topology should be able to realize itself as an
interactive web workspace, a LaTeX/PDF document, SVG, a poster or image macro,
a slide surface, a terminal interaction, or another medium without each target
reconstructing the underlying relations and house styling independently.

The architectural direction is therefore:

```text
Semioverse / application semantics
            |
            v
      TUFTE Form Model
            |
            v
      TUFTE Topology
    (relations/incidence)
            |
            v
       Tiling / Layout
   (geometric realization)
            |
            v
      Semantic Styling
  (tokens + coloring rules)
            |
            v
   Target Projection / Codec
   /       |       |       \
 HTML    LaTeX    SVG     terminal ...
```

The engine owns the middle. HTTP servers, website routing, browser hosting,
PDF compilation, image rasterization, and other transport/materialization
services should compose it rather than define it.

## 1. Separate topology from geometric realization

The current workspace is a nested rectilinear split tree flattened to CSS-grid
geometry. That is a good tiling scheme, not the definition of tiling.

TUFTE should carry at least three distinct objects:

1. **Logical topology**: cells/forms and their typed relations independent of
   coordinates. Relations include containment, incidence, adjacency, authored
   order, focus order, action targets, evidence/provenance, and other
   application-declared edges.
2. **Tiling realization**: a geometric arrangement satisfying some subset of
   that topology plus medium constraints. A realization may be a rectilinear
   split tree, a document grid, a flow layout, a table, a Wang-style matching
   patch, a substitution tiling, or another admitted scheme.
3. **Rendered projection**: the medium-specific artifact produced from the
   topology, tiling, and style profile.

This preserves a principle the current code already gets right: DOM/reading
order need not equal visual position. Generalized, that means *semantic order
does not equal geometric embedding*. A Penrose realization, a CSS grid, and a
LaTeX page can all project the same underlying object without claiming their
coordinates are the semantics.

A first core carrier can remain finite and modest. It does not need to pretend
that every interface is already a formal topological space. It needs explicit,
typed relation layers and a stable way to derive stronger mathematical
structures when available.

## 2. Make Tile a cell, not a rectangle

A TUFTE tile should be understood as a semantic cell that can receive a
geometric realization, not as a rectangular browser card.

A tile may have:

- stable identity;
- semantic role and state;
- content or nested forms;
- boundary ports/signatures;
- relations to neighboring or containing cells;
- intrinsic/minimum/desired measures;
- ordering and focus constraints;
- provenance/evidence;
- style classes/semantic marks;
- target-specific affordances.

Rectangles are one renderer's realization. A tile may become a CSS-grid area,
a LaTeX box, a TikZ polygon, a Penrose rhombus, an SVG group, a terminal pane,
or an unrendered logical cell.

This is also where TUFTE can meet the house's existing tiling mathematics
without turning the GUI layer into a second mathematics library.

## 3. Make Form genuinely medium-independent

The current charter correctly says Form means more than the HTML `form`
element. The implementation should cash that claim out.

A TUFTE form should carry:

- a value/schema;
- field identities and typed domains;
- current value/state;
- constraints and validation;
- actions/intents;
- admission/refusal/reconciliation behavior;
- presentation hints that are semantic rather than medium-specific.

Target projections then choose affordances:

- HTML -> native form controls plus progressive enhancement;
- interactive PDF -> AcroForm fields where supported;
- print/PDF -> labels, blanks, check boxes, signature regions, instructions;
- terminal -> prompts/selectors;
- slide/poster -> read-only state or an instruction/QR/link affordance;
- accessibility projection -> explicit labels, descriptions, order, states.

The same form identity and validation result should survive projection. A
renderer may refuse unsupported affordances or degrade them explicitly; it
must not silently invent different semantics.

## 4. Turn "theme" into semantic styling, not CSS

The current TUFTE theme contract is presentation-specific: a theme is
effectively `{name, styles, themeColor}`, where `styles` is CSS. That should
become a web adapter over a target-neutral style profile.

A **TUFTE Style Profile** should contain:

- portable design tokens;
- semantic role mappings;
- typography roles;
- line/stroke roles;
- surface/material roles;
- spacing and measure roles;
- texture/pattern recipes;
- icon/glyph/motif references;
- coloring constraints;
- target-specific overrides only where unavoidable.

The 561 Group Design Bible and
`data/records/design-tokens/561-group.tokens.json` should supply the first
serious house profile. TUFTE should not duplicate those values.

A profile can say, for example:

```text
role:evidence       -> witness channel
role:hazard         -> alarm channel
state:contradicted  -> contradiction mark
edge:provenance     -> evidence stroke
edge:dependency     -> dependency stroke
boundary:unmatched  -> obstruction pattern
office:<id>         -> section/office mark family
```

The web renderer compiles these into CSS variables/selectors. The LaTeX
renderer compiles them into color/font/macros and TikZ/tcolorbox parameters.
The SVG renderer compiles them into presentation attributes, patterns, and
defs. A terminal renderer maps them to ANSI capabilities. The semantic profile
remains the same.

## 5. Treat coloring as assignment under constraints

"Coloring" should not mean merely choosing literal hues.

TUFTE can use the house's graph-coloring and aperiodic-tiling machinery to
assign a finite set of distinguishable **marks** to cells or boundaries under
constraints. A mark may use several channels:

- hue;
- value/lightness;
- hatch or dot pattern;
- stroke weight/style;
- glyph;
- texture;
- typographic treatment;
- shape or corner treatment.

This matters for accessibility and for print. A semantic distinction should
not disappear merely because a target is monochrome.

There are at least three useful coloring regimes:

1. **Semantic coloring**: a known role maps directly to a house token
   (`evidence -> witness`, `hazard -> alarm`).
2. **Constraint coloring**: adjacent or confusable cells require distinct
   marks, solved as a finite coloring problem.
3. **Boundary coloring**: edges carry compatibility signatures. Existing
   Wang/Robinson-style machinery can witness whether neighboring cells match
   their local constraints.

The third regime is particularly important. Wang tiling gives TUFTE a model
where compatibility is local and compositional: a tile says what may meet each
boundary. That can describe more than ornament. It can represent interface
composition contracts, data-flow ports, provenance joins, or other local
admissibility conditions.

## 6. Admit multiple tiling schemes

Define a small `TilingScheme` contract rather than hard-coding one geometry.

Conceptually:

```text
realize(topology, constraints, mediumCapabilities)
  -> tiling receipt | tiling refusal
```

Early schemes should be practical:

- authored linear/flow order;
- responsive grid;
- current rectilinear split workspace;
- paginated document grid;
- table/matrix;
- free but constrained rectangular packing.

Research/expressive schemes can then compose existing house mathematics:

- Wang/local-matching tilings;
- Robinson/substitution tilings;
- Penrose/rhombic substitution;
- quasicrystalline/aperiodic fields;
- graph-derived embeddings.

Do not force aperiodicity into ordinary dashboards. Aperiodic schemes are
valuable because they test whether TUFTE's abstraction really separates
semantic topology from geometry and because they become expressive media for
posters, maps, diagrams, and specialized interfaces.

A tiling scheme may also have two modes:

- **content realization**: geometric tiles seat semantic cells;
- **field realization**: a generated tiling becomes background, guide,
  ornament, density field, or other visual substrate while semantic cells sit
  above it.

That prevents "Penrose tiling" from becoming a gimmick while still letting the
house visual language use it materially.

## 7. Give TUFTE a target-neutral rendering IR

Directly mapping semantic tiles to every target will eventually duplicate
layout/style logic. Introduce a compact **presentation IR** after topology,
tiling, and style resolution.

The IR should be boring and finite: pages/surfaces, regions, paths, text runs,
images, rules, patterns, form affordances, links/actions, and metadata. It
should retain stable references back to semantic cell ids.

Then:

```text
TUFTE Form/Topology
        |
   tiling + style
        |
 Presentation IR
  /    |    |   \
HTML LaTeX SVG terminal
```

Not every target needs to use the same low-level primitive set immediately.
The important invariant is that target codecs consume an already-resolved
semantic/geometric/style projection rather than making independent semantic
decisions.

Every renderer should emit an artifact **plus a manifest** mapping semantic
ids to rendered locations/elements/pages and listing degradations, refusals,
token usage, and provenance.

## 8. Make LaTeX the first proof that TUFTE is not a web framework

The fastest architectural test is a second medium that cannot cheat by using
CSS/DOM assumptions.

Build a LaTeX projection first.

The existing 561 Group document engineering tree already contains LaTeX book
and cover templates, so TUFTE should compose that infrastructure rather than
become a TeX distribution.

Minimum proof:

- one TUFTE semantic model;
- one 561 Group style profile;
- one rectilinear/document tiling;
- HTML output;
- LaTeX output;
- compiled PDF downstream;
- the same topology/semantic manifest for both.

The LaTeX adapter should translate the 561 Group token profile into xcolor,
font roles, spacing lengths, rules, and boxes. TikZ is appropriate for
construction geometry, node/edge diagrams, and poster/image-macro motifs.
Interactive PDF forms can be a later adapter capability rather than an MVP
requirement.

This immediately forces clean answers to questions that CSS currently hides:
what is a semantic style token, what is geometry, what is pagination, what is
an unsupported interaction, and which parts of the Design Bible are
machine-enforceable.

## 9. Realize the 561 Group visual language through TUFTE

The design system should become executable through the engine.

The current 561 Group profile already has:

- ink/bone material ground;
- alarm red;
- witness blue;
- sans/slab/mono roles;
- spacing and type scales;
- web measures;
- explicit visual refusals.

Extend it with target-neutral tokens/recipes for the newly recovered
relational-geometric lineage:

- construction-line roles;
- node, edge, arc, cut, boundary, and field roles;
- evidence/obstruction/uncertainty marks;
- line-screen, dot-screen, halftone, grain, and paper recipes;
- geometric motif parameters;
- poster and image-macro composition constraints;
- section/office identity channels;
- mark density/color budgets.

The canonical image macro should not be a prompt. It should be a TUFTE
composition whose typography, geometry, marks, and texture are deterministic
enough to reproduce. Generative image models can supply commissioned artwork
or textures where useful, but the house layout itself should be source data.

That gives the Group one visual grammar spanning:

- MetroPlat/VICTOR interfaces;
- 561.group;
- reports;
- LaTeX books and papers;
- posters;
- social cards/image macros;
- diagrams;
- slide decks;
- eventually motion.

## 10. Narrow the current web package instead of deleting working software

Do not rewrite TUFTE from scratch.

First extract/identify a medium-neutral core *inside* the existing package,
while preserving current exports. Once the boundary is proven, split packages
only if the code demands it.

A likely eventual decomposition is:

```text
@red-cup-engineering/tufte-core
  model
  topology
  forms
  tiling contracts
  style contracts
  reducers / receipts / refusals
  presentation IR

@red-cup-engineering/tufte-tilings
  rectilinear
  grid
  paged
  adapters to aperiodic/coloring services

@red-cup-engineering/tufte-html
  HTML/CSS projection
  DOM patching
  native forms
  browser interaction

@red-cup-engineering/tufte-latex
  LaTeX/TikZ projection

@red-cup-engineering/tufte-svg
  deterministic vector projection

VICTOR / web platform
  routing
  server
  build
  assets
  publication hosting

561 Group Content Design
  canonical design profile and house constraints
```

Package names are illustrative. The architectural boundary matters more than
renaming immediately.

In particular, `tufte-application.mjs`, HTTP-oriented runtime behavior,
storefront routing, and similar web application concerns should eventually be
consumers/adapters of the core. They should not define what TUFTE is.

## 11. Preserve "User" as agency across media

User does not disappear when the target is not a browser.

TUFTE should preserve:

- focus/reading order;
- selectable or fillable fields where the target supports them;
- personal arrangement/preferences where meaningful;
- undoable transformations;
- annotations and provenance;
- accessibility alternatives;
- explicit degradation of unavailable actions.

A printed worksheet is still a user form. A fillable PDF is a user form. A
terminal prompt is a user form. A poster is generally not interactive, but it
can still preserve the authored route through the composition and expose
machine-readable links/provenance.

The engine therefore models affordance and agency; renderers negotiate how
much of it a medium can realize.

## 12. Use formalism as executable discipline, not decoration

TUFTE is a good place for the Group's formal work to meet ordinary interfaces,
but the dependency direction matters.

TUFTE should consume finite executable witnesses from mathematics services:

- graph-coloring witnesses/obstructions;
- edge-matching constraints;
- substitution patches;
- incidence/adjacency graphs;
- closure/settling state;
- confidence/evidence values.

It should not casually copy formal algorithms into presentation code.

Longer-term, a TUFTE topology can be related to finite cell complexes,
Alexandrov spaces/preorders, sheaf-like local data, or other structures when
that buys concrete capability. Those should enter behind explicit adapters and
witnesses. The MVP is a typed finite relation complex plus realizations, not a
claim that every GUI already is a derived stack.

## 13. Conformance invariants

A multi-medium TUFTE needs tests stronger than screenshot equality.

Core invariants should include:

- target renderers do not mutate semantic topology;
- stable cell ids survive every projection;
- reading/authored order is preserved or explicitly remapped;
- form field ids and constraints survive supported targets;
- unsupported affordances produce recorded degradation/refusal;
- topology reducers remain pure and deterministic;
- equivalent semantic/style inputs produce reproducible target projections;
- adjacent-mark constraints are witnessed;
- design-token fallbacks are explicit;
- accessibility does not depend on color alone;
- 561 Group alarm/witness budgets can be linted where area is measurable;
- every artifact carries a provenance/render manifest.

Cross-medium golden fixtures should render the same specimen to HTML, LaTeX,
SVG, and eventually other targets while comparing their manifests rather than
pretending their pixels should match.

## 14. Work sequence

### Milestone A — recover the core boundary

1. Supersede the web-only product boundary in the TUFTE charter while retaining
   the web renderer as a first-class target.
2. Write schemas/types for Form Model, Topology, Tiling, Style Profile,
   target capabilities, and render manifest.
3. Adapt the current normalized model and split-tree workspace into those
   carriers without breaking the public web API.
4. Move CSS-string themes behind a web style adapter.

### Milestone B — make 561 Group the reference style profile

1. Import/derive from `561-group.tokens.json`.
2. Add semantic mark and relational-geometry recipes.
3. Implement design lints and color/mark budgets.
4. Render a current MetroPlat/TUFTE fixture with the 561 profile.

### Milestone C — prove medium independence

1. Implement LaTeX/TikZ projection.
2. Render one shared semantic fixture to HTML and LaTeX/PDF.
3. Emit and compare manifests.
4. Add SVG as a deterministic vector target; use SVG as the canonical basis
   for posters/image macros where possible.

### Milestone D — make tiling mathematically extensible

1. Define the `TilingScheme` adapter.
2. Wrap the current split tree as the first scheme.
3. Add coloring-service integration.
4. Add Wang/local-edge-matching integration.
5. Add an experimental substitution/Penrose realization behind the same
   contract.
6. Keep logical reading/focus topology independent of geometric realization.

### Milestone E — push the engine through the Semioverse

Use structured Semioverse relations and state to drive visual semantics:
evidence, contradiction, confidence, lifecycle, provenance, section/office
identity, obligation, refusal, and closure should be renderable marks rather
than ad hoc CSS choices.

At that point the same semantic object can literally have multiple forms
without losing its identity.

## 15. Reference demonstration

The first demonstrator should deliberately exercise the whole idea.

Use one small 561 Group semantic artifact containing:

- six to ten cells;
- evidence and provenance relations;
- one contradiction or obstruction;
- a user-editable form;
- lifecycle/confidence state;
- at least one adjacency-coloring constraint.

Render it as:

1. a live TUFTE web workspace;
2. a 561 Group LaTeX/PDF page;
3. an SVG poster/image macro;
4. optionally an aperiodic/Wang-derived geometric field using the same semantic
   boundary labels.

The text and data stay the same. The form/topology stays the same. The
geometric realization and affordances vary by medium. The 561 Group design
profile supplies the visual language everywhere.

If this specimen works, TUFTE has stopped being "the web server with tiles"
and become the engine its name describes.
