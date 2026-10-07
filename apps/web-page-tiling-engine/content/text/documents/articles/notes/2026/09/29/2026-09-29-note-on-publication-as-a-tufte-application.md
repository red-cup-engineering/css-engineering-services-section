---
title: "Publication as a TUFTE application"
description: "Why every VICTOR site looks identical, what the publication path actually uses of TUFTE, and how a catalog should become a Tiling User Form Topology application: tiles of varied role and shape placed by the catalog's relations, reader-owned arrangement, and typed form tiles."
date-created: 2026-09-29
type: note
authors:
  - claude-sonnet-5-5
keywords:
  - tufte
  - victor
  - publication
  - design
---

# Publication as a TUFTE application

## What is wrong

Every site VICTOR builds looks the same because the publication path
(`src/publication/page.mjs`) is not a TUFTE application. Its history is the
26 August VICTOR 0.1.0 and Hugo-lineage renderer, whose anatomy it still
names in its own header comment (masthead, breadcrumb, spine, reservoir,
colophon). TUFTE was wrapped around that renderer afterward:

- One catalog cell becomes **one** tile, `catalog-cell`, holding the whole
  article as an HTML string. A "Contents" tile, an "Explore" tile and
  backlink lists sit beside it. The tile vocabulary is used as a container
  for a document, not as a composition.
- The catalog knows how cells relate: links, backlinks, types, audiences,
  sections, tags. The page reduces that to lists. Relations do not decide
  placement, adjacency, emphasis or navigation.
- The reader has no arrangement. TUFTE already ships tested workspace tiling,
  fullscreen, undo and persistence (`reduceTufteWorkspace`,
  `createTufteWorkspaceHistory`, `connectTufteWorkspace`); publication uses none of it.
- Forms are not tiles. A site that needs an inquiry form must hand-write one,
  though TUFTE's form vocabulary preserves input and recovers from refusals.
- The look is `BASE_STYLES` in `tufte-rendering.mjs`: bordered rectangles with
  small-caps panel headers and a 15px system-font body. A site can change
  colors and font families and nothing else. The one named theme,
  `early-mac`, is matched by string.

The TUFTE charter already says the package does not yet meet its mandate. The
publication path is where that shows.

## What the name requires

Each word is load-bearing (charter), so publication is designed from each.

**Topology.** The catalog *is* a topology: cells are surfaces, relations are
edges. `describeTufteTopology` exposes membership, semantic placement, form
ownership and reading-order adjacency. A publication projects the catalog
into a TUFTE model in which relations decide composition: a cell's
neighbours (what it cites, what cites it, its section, its audience) are
tiles positioned by relation, and navigation is the topology, not a
hand-written menu. The menu becomes one projection of the topology, not a
separate authored list.

**Tiling.** A page is a composition of tiles that differ in role, size and
shape: a lead tile that is the piece, a provenance tile, related-work tiles,
a form tile. Tiles are regions with semantics (`role`, `span`, `side`,
`lifecycle`, order). Whether a region is a bordered card, a bare reading
column, a full-bleed band or an asymmetric block is the presentation's
decision, never the framework's. The structural CSS the engine needs (grid
mechanics, workspace, splitters, skip link, focus) must be separated from
skin (borders, panel headers, label type, radii, the masthead look).

**User.** The reader is a participant. Text size, color scheme, and the
arrangement of tiles are the reader's, persisted and undoable, with keyboard
parity, using the workspace and history primitives that exist. A
publication opens in its authored composition and lets the reader change it.

**Form.** Anything the reader submits is a typed form tile: an inquiry, a
workshop request, a newsletter sign-up. Entered text survives an error, the
invalid field is named beside itself, and a refusal is a state of the form,
not a redirect to a separate error page. `application/json` projection
negotiation in `createTufteApplication` already supports updating the form
tile in place; static publication needs the native form floor and the same
model.

**Engine.** Publication is a TUFTE application, so the static publisher is
one transport for it (write the projection to files), and a live server is
another (`createTufteApplication`). Both consume the same model. The site's
own vocabulary (Esther Davis, MLS; booklists; workshops) stays outside the
kernel: it lives in the site's composition, which is a value the site
supplies.

## Design

1. **Skin is a value.** `resolveTufteTheme` accepts `{ name, styles,
   themeColor }` from a site, scoped under `body[data-tufte-theme=name]`.
   Landed 2026-09-29. Still to do: split `BASE_STYLES` into structural rules
   the engine owns and a default skin a theme can wholly replace.
2. **Composition is a value.** The publication projection takes a
   composition from the site: a function from a catalog cell and its
   relations to an ordered set of tiles, with the current output as the
   default composition so existing sites do not regress. A composition may
   omit panel headers, suppress the Contents tile below a length, choose the
   footer, and place related tiles by relation.
3. **Relations place tiles.** The default composition reads relation types
   and places `cites`, `cited-by`, section siblings and audience siblings as
   tiles with roles, instead of `aside` lists.
4. **Reader arrangement.** Publication pages ship the workspace connection as
   an enhancement; the no-JavaScript page remains the authored composition.
5. **Forms are tiles.** A cell may declare a form tile (fields, consent,
   receipt route). It renders natively with retained input and per-field
   errors. The Cloudflare form handler returns to the same page with the
   refusal in the model, not to a separate route.
6. **Dates.** Cells carry `date-created` and `date-modified`; the footer shows
   the reader-relevant dates and drops the hash and status word except where
   provenance is the point (republished and archived work).

## Open questions

- Whether the composition value lives in the site config or in a theme
  package that pairs a skin with a composition. Leaning toward a theme
  package, since a skin and its composition are designed together.
- How much of reader arrangement a static site can persist without
  JavaScript. Leaning: none; the floor is the authored composition.
- Whether the existing `tiles.mjs` path (the storefront and tile pages) should
  be the model for publication, since it already composes tiles
  deliberately.
