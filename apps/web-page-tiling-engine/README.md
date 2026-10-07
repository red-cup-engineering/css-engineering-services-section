# web-page-tiling-engine (TUFTE)

TUFTE is the **Tiling User Form Topology Engine**, the graphical interface engine for computer web servers and web platforms. It renders tiles and forms with a stable reading order, applies live updates, and connects user actions to application responses. It composes `computer-web-platform/application` and uses `computer-web-server/node` for Node hosting.

Topology, form interaction, rendering, navigation, and browser updates belong here. HTTP transport belongs to Computer Networking; request dispatch belongs to the web server; provider lifetime belongs to the computer platform. Applications supply their domain vocabulary and actions.

The source executes directly as JavaScript. There is no TypeScript build or generated runtime copy.

The `./browser` export carries the recovered domain-neutral browser seams:
projection normalization and `tufte:action`, `tufte:receipt`,
`tufte:refusal`, and `tufte:projection` DOM events. Domain vocabularies remain
outside this package. It also carries Wave1's app-author patterns, built on
the same patch primitives: `connectTufteNavigation` (documents-as-routes
navigation with no router dependency), `applyTufteFieldErrors` (the
field-level validation convention), and `withPendingLifecycle` (the
`lifecycle="pending"` loading-state convention) -- see `docs/handbook.md`'s
"Wave1: app-author patterns" chapter for all five, including the opt-in
`live` tile field and `applyTufteProjectionPatch`'s `focusOnInsert`/
`transition` options.

## Application runtime

```js
import { createTufteApplication, tuftePage } from "@red-cup-engineering/web-page-tiling-engine/application";

export const app = createTufteApplication({
  enhance: true,
  pages: [{ match: "/", load: () => tuftePage({
    title: "Home", tiles: [{ id: "welcome", content: "Welcome." }],
  }) }],
});
```

The returned handler accepts a standard `Request` and explicit execution
capabilities. Node uses `startWebServer({ fetch: app }, { port })` from
`@red-cup-engineering/computer-web-server/node`;
Workers call the handler from their native fetch adapter. Page/action descriptors
compile to that same engine's resources. Native forms, JSON enhancement,
redirects, authentication middleware, body cancellation, metadata, and CSP remain
one application contract. Static pages without enhancement emit no framework JS.
See the [handbook](./docs/handbook.md) for composition, component lifecycle, and
native-form migration. The [running comparison](./examples/head-to-head/README.md)
uses this application contract on the shared core.

## Publication application

`./publication` forms one TUFTE application from an admitted CAIRN catalog and
a site description. Its declared route renderers own cell pages and
provenance, the index and archives, search and error pages, atlas and
neighbourhood tiles, feeds, vault-room rendering, and semiotic-concept
projection. A static publisher consumes the same route declarations; it does
not carry a second rendering path.

```js
import { createTuftePublicationApplication } from "@red-cup-engineering/web-page-tiling-engine/publication";

const application = createTuftePublicationApplication({
  catalog,
  site: { name, baseIri, home, theme, founded, discovery, archives, cellLabel },
});
```

## Search

`createTufteSearchArtifacts` derives TUFTE's browser-search index and query
module from a completed set of rendered documents. It respects Pagefind's
`data-pagefind-body`, `data-pagefind-ignore`, `data-pagefind-meta`, and
`data-pagefind-filter` annotations, while excluding redirects, 404 pages, and
`noindex` documents. It emits `search/search-index.json` and
`search/search.mjs`; the latter exports `createSearchClient` for a TUFTE page
to render with its own tiles and forms.

```js
import { createTufteSearchArtifacts } from "@red-cup-engineering/web-page-tiling-engine/search";

const search = createTufteSearchArtifacts({ artifacts: renderedDocuments });
```

## Early Macintosh theme

TUFTE's domain-neutral `early-mac` theme gives a full document warm monochrome
desktop texture, sharp window borders and striped titlebars, crisp native
controls, a visible keyboard focus ring, responsive small-screen rules, and
reduced-motion behavior. It uses system font fallbacks that retain common
Indigenous-language diacritics; application language stays in the model.

```js
import { renderTufteDocument } from "@red-cup-engineering/web-page-tiling-engine";

const html = renderTufteDocument(
  { title: "Lakhóta words", tiles: [{ id: "today", title: "Čhaŋté", content: "Heart" }] },
  { theme: "early-mac" },
);
```

The renderer injects the theme CSS and puts `data-tufte-theme="early-mac"` on
the document body and TUFTE root. `./theme` also exports `EARLY_MAC_THEME`,
`EARLY_MAC_THEME_STYLES`, and `resolveTufteTheme` for a consumer that needs to
inspect the same public theme contract. Its `tufteThemeStyles` adapter maps a
validated shared web theme onto TUFTE's `--tufte-*` presentation properties.

```sh
npm install @red-cup-engineering/web-page-tiling-engine
```

```js
import { renderTufteDocument } from "@red-cup-engineering/web-page-tiling-engine";

const html = renderTufteDocument({
  title: "A living interface",
  tiles: [{ id: "now", role: "now", title: "Now", html: "<p>Stable.</p>" }]
});
```

Use `./application`, `./rendering`, and `./composition` for portable Fetch/Worker
applications. The root and `./packet` exports retain the Node-specific SHP
cryptographic codec. `./browser` exposes DOM enhancements; `./topology` supports
server computation and optional browser interactions.

```js
import {
  describeTufteTopology,
  reduceTufteTopology,
} from "@red-cup-engineering/web-page-tiling-engine/topology";

const model = {
  tiles: [{ id: "research", span: 8 }, { id: "sources", span: 4 }],
};
const topology = describeTufteTopology(model);
const receipt = reduceTufteTopology(model, {
  kind: "resize",
  id: "sources",
  span: 6,
});
```

The topology describes viewport-independent facts TUFTE can honestly
guarantee: membership, semantic placement, form ownership, and authored
reading-order adjacency. `reduceTufteTopology` currently admits `move` and
`resize` operations and returns either `tufte.topology.receipt` or
`tufte.topology.refusal`.

The same module carries the workspace: an actual nested tiling layout as pure
data. A workspace is a split tree (`{split:"row"|"column", children, sizes}`
over pane references to tile ids) normalized by `normalizeTufteWorkspace`,
flattened by `computeTufteWorkspaceGeometry` onto one CSS grid whose tracks
are the tree's cut lines -- tiles keep their authored DOM order, so reading
order, tab order, and the patch model hold under any arrangement -- and
transformed by `reduceTufteWorkspace` (`resize` a boundary, `swap` two panes,
`move` a pane against a named edge; refusals are data). `renderTufteFragment`
renders a `model.workspace` server-first with one `role="separator"` splitter
per interior edge; `applyTufteWorkspace`/`connectTufteWorkspace` add pointer
drag, keyboard resize on focused splitters (arrows, Home/End), and the same
focus/move modifier split i3, sway, and Hyprland ship: Alt+Arrow moves DOM
focus to the spatial neighbor without touching the arrangement, Alt+Shift+Arrow
swaps the tile with it. Both routes emit `tufte:workspace` events for
data-changing gestures, and `connectTufteWorkspace` opts into localStorage
persistence via `storageKey` (tested to round-trip a fresh connection to the
same value).

Two more operations complete the reference window managers' set. `fullscreen`
(`{kind:"fullscreen", id}`) collapses one pane to the whole surface: the
covered tiles keep their DOM order and gain the `hidden` attribute (so
assistive technology skips them the way the eye does), no splitter remains,
and the grid carries `data-tufte-fullscreen`. It is an overlay on the value,
never a tree mutation, so `restore` (`{kind:"restore"}`) reproduces the prior
workspace value exactly -- asserted by test, not implied. Alt+F toggles it on
the focused tile (i3's `$mod+f`); `renderTufteFragment` renders a fullscreen
`model.workspace` server-first the same way.

Undo is the same idea one level up. Because an arrangement is a plain frozen
value produced by pure reducers, `createTufteWorkspaceHistory` is a bounded
history of values, not a second implementation of each operation in reverse,
and `connectTufteWorkspace` (option `history`, on by default, `{limit}`, or
`false`) replays a prior value through the identical `applyTufteWorkspace`
path a fresh page load or a persisted arrangement takes: `undo()`/`redo()` on
the handle, Alt+Z/Alt+Shift+Z from inside any tile, receipts and
`nothing-to-undo`/`nothing-to-redo` refusals emitted as `tufte:workspace`
events like every other change. A pointer drag is many resize receipts but
one gesture, so one undo step.

Floating panes are a named refusal-with-alternative, not a silent absence:
the workspace never overlaps tiles, and the "float this above the tiling"
job is routed to the platform's own `<dialog>` and popover elements, which
already own stacking, light-dismiss, focus trapping, and inertness. Tabbed
or stacked containers, constraint solving beyond the minimum-share floor, and
min-content-aware sizing remain framework gaps, not implied features.

Above one workspace's split tree, `normalizeTufteWorkspaces`/
`reduceTufteWorkspaces` add the plural, switchable layer i3/sway/Hyprland/
bspwm/xmonad all ship: a named `tufte.workspaces` set (`{active,
workspaces: {name: TufteWorkspace}}`) where every tile is seated in exactly
one named workspace. `switch` changes the active name, creating it first if
absent -- i3's `workspace <name>` create-or-switch convention; `move`
relocates one tile to a named workspace, creating it if absent. Both are
pure, DOM-free reducers with the same receipt-or-refusal grammar as
`reduceTufteWorkspace`; wiring them to a keyboard gesture is left to the
consumer, same as any other reducer operation this module ships.

`tile.html`, `model.mastheadHtml`, `model.footerHtml`, `options.headHtml`,
`options.styles`, and `options.clientScript` are trusted application fragments
and must never contain untrusted input. `tile.content` and ordinary labels are
escaped. The CLI accepts a JSON model on stdin and emits the rendered document
on stdout:

```sh
render-tufte-document < model.json > index.html
```

The CLI reads exactly one JSON model from standard input, writes only HTML to
standard output, and reports malformed JSON on standard error with a non-zero
exit status. This makes it usable in a shell pipeline without a build step.

## Model

`renderTufteDocument({ title, subtitle, eyebrow, revision, tick, tiles })`
preserves the authored order of `tiles`. Each tile may provide:

- `id`, `title`, and `eyebrow` for identity and labels;
- `role`, `lifecycle`, `confidence`, and `side` as safe semantic tokens;
- `span` from 2 through 12 for CSS-grid placement;
- `content` for escaped plain text, or `html` for trusted markup.
- `form` for a normalized, semantic native form: action, revision, labelled
  fields, and submitters. TUFTE escapes this record into `<form>` markup;
  editors, canvases, and 3D surfaces remain application-owned islands.

Unknown or unsafe semantic tokens fall back to neutral values during
normalization. Duplicate or missing tile ids receive deterministic unique ids.

## Live updates: a tile-granular patch primitive

`diffTufteProjection(previous, next)` diffs two `normalizeTufteModel` outputs
down to TUFTE's own typed vocabulary (`role`, `lifecycle`, `confidence`,
`side`, `span`, `title`, `eyebrow`, `html`/`content`, and tile order) and
returns an ordered patch list (`update`/`insert`/`remove`/`reorder`).
`applyTufteProjectionPatch(root, patches)` applies it to the live DOM: a
whole-tile-body replace, never sub-node diffing -- a patch primitive, not a
virtual DOM. Structural changes place nodes by the *authored* order
(`afterId`), never a DOM-observed one, so the tab-order invariant holds under
structural change too.

```js
import {
  connectTufteDocument,
  normalizeTufteModel,
} from "@red-cup-engineering/web-page-tiling-engine/browser";

const initialModel = window.__INITIAL_TUFTE_MODEL__;
connectTufteDocument(document.querySelector("[data-tufte]"), {
  autoPatch: true,
  projection: normalizeTufteModel(initialModel),
});
```

Pass the model used for server rendering as `projection` when the first
incoming projection should patch that HTML. With no initial projection, the
first `tufte:projection` event establishes the baseline and subsequent events
patch it. Events may come from `source` or from caller-dispatched updates.

If both projections carry a finite `tick` (an opaque ordering/idempotency
token -- TUFTE never interprets it beyond ordering, and never grows a clock
or interpolation math of its own), a patch computed against an older tick is
a no-op rather than a silent overwrite, while a projection at the same tick
still applies what changed. This makes the same
patch path safe for a monotonically advancing live stream or replay. To seek a
replay backward, disconnect and reconnect with the sought projection as the
new baseline; TUFTE intentionally owns no clock or interpolation machinery.

## The action → receipt/refusal loop

`connectTufteDocument` delegates both `click` on `[data-tufte-action]`
elements and `submit` on `<form data-tufte-action="...">` -- form
submissions serialize their named fields into `detail.value` as a plain
object, not just one scalar. `tufte:refusal`'s detail keeps its existing
`{message}` shape, plus an optional `tile`: when the server's non-ok
response body is valid JSON shaped like a tile, it is normalized and
attached as `detail.tile`, so a refusal can render inline instead of only
logging a string. A plain-text or unparseable refusal body still degrades
cleanly to `{message}` only.

## Forms are first-class topology

Use a tile's `form` record when the interaction is an ordinary form, rather
than hand-writing a trusted `tile.html` fragment. Its `fields` and
`submitters` become real labelled HTML controls in the zero-JavaScript page.
The browser connector sends an action envelope containing the form action,
the current root/form revision, a JSON-safe successful-control map (repeated
names become arrays), and the selected submitter id. This is suitable for an
Opal mutation endpoint while leaving validation and admission app-owned.

`tile.html` is still a trusted application boundary. TUFTE never sanitizes it;
untrusted Markdown must be rendered/sanitized before it crosses that boundary.

`applyTufteReceipt(root, body)` turns a `tufte:receipt` handler into one
call: `body` may be a partial or full `{tiles:[...]}` projection (each
listed tile is upserted; tiles it doesn't mention are left alone -- a
receipt is additive, never an implicit delete), or a single tile object
(only the fields actually present are touched on an existing tile; an
unrecognized id is inserted as a new tile with normal defaults).

## Composition: a fragment export, not nested documents

`renderTufteFragment(model)` renders just the tile grid --
`<div class="tufte-grid">...</div>`, no `<html>`/`<head>`/masthead -- so a
caller can compose a nested grid into one tile's own `html` field in their
own code, ordinary string interpolation, the same trust boundary `tile.html`
already documents. `confidenceBadgeTile(...)` and `disclosurePanelTile(...)`
are optional tile-shape helpers -- pure functions returning a ready-to-use
tile object for two well-known patterns. Delete the call, hand-write the
tile again: nothing to migrate off.

## Theming: shelf-chrome-compatible tokens

`BASE_STYLES` aliases five custom properties onto TUFTE's own palette --
`--accent`, `--ink`, `--ink-dim`, `--border`, `--bg` -- matching the names
the house `shelf-chrome` artifact falls back through. A shelf-chrome copy
vendored into a TUFTE-rendered page now finds TUFTE's real palette instead
of shelf-chrome's neutral default. The mark/footer injection points
shelf-chrome asks for are already served by `options.headHtml` and
`model.mastheadHtml`/`model.footerHtml`.

See `examples/head-to-head/` for a from-scratch, honestly-measured
comparison against a hand-rolled vanilla-DOM baseline of the same small app.

See `docs/handbook.md` for the full manual -- tile vocabulary semantics
(including which fields have no CSS at all), the SSR/patch lifecycle, the
action/receipt/refusal loop walked end to end, theming, and this package's
accessibility guarantees and their limits. Every worked example in it is
extracted and actually run by `test/handbook.test.mjs`, so it cannot drift
out of sync with the code the way prose-only docs do.

## Development

Node.js 22 or newer is required. From this directory:

```sh
npm install
npm test
npm run typecheck
npm run example # http://127.0.0.1:18841/tufte and /vanilla
```

`verify` syntax-checks every JavaScript module, type-checks a consumer of both
public exports, runs the package and live-example tests, and inspects the npm
tarball. There is no build: the checked-in `.mjs` and `.d.mts` files are the
published artifacts.
