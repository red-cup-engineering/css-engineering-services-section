# The TUFTE handbook

This is a working manual, not a pitch. Every claim below that can be checked
by running code is checked by running code: each fenced example marked
`// doctest: <id>` or `# doctest: <id>` is extracted verbatim and executed by
`test/handbook.test.mjs` as part of this package's own `npm test`. If an
example in this file stops matching the real API, the test suite fails --
this document cannot quietly drift out of date the way prose-only docs do.

Every import in every example below is the real public import a consumer
would write: `@red-cup-engineering/web-page-tiling-engine` and
`@red-cup-engineering/web-page-tiling-engine/browser`. Nothing here
is rewritten to a relative path to make the test pass -- the doc test writes
each snippet into a temp file inside this package's own tree specifically so
that import resolves the same way it would for a real installed dependency
(Node's package self-reference), not so it can cheat.

A few examples reach into `test/fake-dom.mjs`, this package's own
zero-dependency DOM test double, and `examples/head-to-head/`, the package's
real worked app. Both are called out inline wherever they appear -- they are
not part of the public API, only the scaffolding this handbook uses to run
browser-shaped code under plain `node --test` without a real browser or a
new dependency.

## Publication applications

The `./publication` entry owns publication presentation over a CAIRN catalog.
`createTuftePublicationApplication` declares page descriptors for live HTTP
service and exposes the same route renderers as `publicationRoutes` and
grouped `publicationProjectors` for a static publisher. The publisher may
write, fingerprint, assay, and release those returned artifacts, but it does
not select or render publication pages itself.

## Quickstart

TUFTE has two core rendering entry points, and getting them backwards is the
first mistake a new consumer makes:

- `.` (the package root) -- `renderTufteDocument`, `renderTufteFragment`,
  `normalizeTufteModel`, `diffTufteProjection`, `confidenceBadgeTile`,
  `disclosurePanelTile`. Every one of these is safe in Node, Deno, a CLI, a
  Cloud Run build step, or any other server runtime with no DOM at all.
- `./browser` -- `connectTufteDocument`, `applyTufteProjectionPatch`,
  `applyTufteReceipt`, and, as of Wave1 (see the chapter of that name
  below), `connectTufteNavigation`, `applyTufteFieldErrors`, and
  `withPendingLifecycle`. These touch a live DOM
  (`document.createElement`, `element.dispatchEvent`, ...) and must only be
  imported where one exists.

`normalizeTufteModel` and `diffTufteProjection` are re-exported from both
entry points (they're DOM-free, so there's no reason to force a browser-only
import just to reach them), but they're *defined* in `./browser`'s module
file alongside the DOM-touching functions -- an implementation detail, not
something a consumer needs to track, mentioned here only so the source
layout doesn't look inconsistent with the entry-point split above.

```js
// doctest: quickstart-minimal
import assert from "node:assert/strict";
import { renderTufteDocument } from "@red-cup-engineering/web-page-tiling-engine";

const html = renderTufteDocument({
  title: "A living interface",
  tiles: [{ id: "now", role: "now", title: "Now", html: "<p>Stable.</p>" }],
});

assert.ok(html.startsWith("<!doctype html>"));
assert.match(html, /<h1>A living interface<\/h1>/);
assert.match(html, /<section class="tufte-tile" id="now"[^>]*data-role="now"/);
assert.match(html, /<p>Stable\.<\/p>/);
```

The CLI is the same renderer, wired to stdin/stdout, with no build step in
front of it -- the checked-in `.mjs` files in `src/` and `scripts/` *are* the
published artifact:

```sh
# doctest: quickstart-cli
set -euo pipefail
echo '{"title":"A living interface","tiles":[{"id":"now","title":"Now","content":"Stable."}]}' \
  | node scripts/render-tufte-document.mjs > /tmp/tufte-quickstart-cli-output.html
grep -q '<!doctype html>' /tmp/tufte-quickstart-cli-output.html
grep -q '<p>Stable\.</p>' /tmp/tufte-quickstart-cli-output.html
rm -f /tmp/tufte-quickstart-cli-output.html
```

One more housekeeping fact worth knowing up front: the `.d.mts` files next
to every `.mjs` module in `src/` are hand-written, not `tsc --declaration`
output. That's consistent with the package's zero-build identity (`npm run
verify` type-checks a consumer of both entry points against them, it never
generates them), but it also means a hand-written type can drift from the
runtime behavior it describes if a change to one isn't mirrored in the
other -- there's no compiler holding them in sync for you.

## Tile vocabulary semantics

This is the section most worth reading slowly. TUFTE's tile fields have
English names that invite reading more structure into them than the shipped
CSS actually contains. What follows is what the code actually does, not
what the names suggest it might do.

**`id`.** Coerced through the same safe-token rule as every other semantic
field (`/^[a-z][a-z0-9-]*$/i`, else a fallback), then deduplicated: a
colliding id gets a deterministic `-N` suffix, where `N` is the colliding
tile's own array index (not a running collision counter) --
`normalizeTufteModel` never drops or silently merges a tile just because two
entries share an id.

```js
// doctest: tile-vocabulary-normalization
import assert from "node:assert/strict";
import { normalizeTufteModel, diffTufteProjection } from "@red-cup-engineering/web-page-tiling-engine";

// id dedupe: the second "a" becomes "a-2" (index 1 -> "-2"), not an error
// and not a silently dropped tile.
const deduped = normalizeTufteModel({
  tiles: [{ id: "a", title: "First" }, { id: "a", title: "Second" }],
});
assert.deepEqual(deduped.tiles.map((tile) => tile.id), ["a", "a-2"]);

// span clamps to [2, 12] and falls back to 4 for anything non-numeric --
// it never throws on a bad value.
const spans = normalizeTufteModel({
  tiles: [{ id: "s1", span: 1 }, { id: "s2", span: 99 }, { id: "s3", span: "not-a-number" }],
});
assert.deepEqual(spans.tiles.map((tile) => tile.span), [2, 12, 4]);

// Extra, non-vocabulary fields survive normalization (TufteTile's type is
// `[extra: string]: unknown`)...
const prev = normalizeTufteModel({ tiles: [{ id: "x", domainScore: 10 }] });
const next = normalizeTufteModel({ tiles: [{ id: "x", domainScore: 20 }] });
assert.equal(next.tiles[0].domainScore, 20);

// ...but diffTufteProjection only ever looks at TUFTE's own closed
// VOCAB_FIELDS list. Changing ONLY an extra field produces an empty patch --
// a common trap: stashing domain data on a tile and expecting a live update
// to notice it changed.
assert.deepEqual(diffTufteProjection(prev, next), []);
```

**`role`.** Only three values have any CSS at all: `now` (span 8, plus a
color/border override -- the one role meant to read as "the current
thing"), `rail` (span 12, a full-width row), and `aside` (span 4). Every
other value -- including `standard`, the documented default -- renders
completely unstyled by role: no color, no border, nothing selector-specific.
`standard` and `aside` end up visually identical today only because both
happen to default to `span:4`; nothing in the CSS actually targets
`standard`.

**`lifecycle` and `confidence`.** Each is effectively binary. `lifecycle`
has exactly one styled value, `imminent` (a warn-colored border); every
other value, including the documented default `present`, is inert.
`confidence` has exactly one styled value, `low` (reduced opacity, dashed
border); every other value, including the documented default `high`, is
inert. Neither is a graded scale in the shipped CSS, whatever the field name
suggests -- it is exactly one flag, twice.

**`side`.** Only `lake` (a right border) and `land` (a left border) have any
CSS; the documented default `center` is inert. Worth flagging honestly:
`lake`/`land` are literal geography-flavored names inherited from one
consumer's own domain (North Shore), not truly domain-neutral vocabulary
despite the mechanism itself being generic. A consumer whose domain has
nothing to do with lakes or land still has to spell the values that way to
get the border at all.

```js
// doctest: tile-vocabulary-css-surface
import assert from "node:assert/strict";
import { renderTufteDocument } from "@red-cup-engineering/web-page-tiling-engine";

const html = renderTufteDocument({ tiles: [{ id: "z", title: "Z" }] });

// Styled selectors: present in the shipped BASE_STYLES.
for (const selector of [
  "[data-role=now]", "[data-role=rail]", "[data-role=aside]",
  "[data-lifecycle=imminent]",
  "[data-confidence=low]",
  "[data-side=lake]", "[data-side=land]",
]) {
  assert.ok(html.includes(selector), `expected ${selector} to have a CSS rule`);
}

// Documented defaults: no dedicated rule at all -- not styled, just unstyled.
for (const selector of [
  "[data-role=standard]",
  "[data-lifecycle=present]",
  "[data-confidence=high]",
  "[data-side=center]",
]) {
  assert.ok(!html.includes(selector), `expected ${selector} to have NO dedicated CSS rule`);
}
```

**`html` vs `content`.** Mutually exclusive in effect: when a tile carries a
`html` string, it always wins, in both SSR and every live-patch code path --
`content` is never consulted once `html` is present, even if both are set.
`content` is escaped plain text; `html` is trusted markup TUFTE never
parses, sanitizes, or diffs into. There is no partial mode where TUFTE reads
both.

```js
// doctest: tile-vocabulary-html-vs-content
import assert from "node:assert/strict";
import { renderTufteFragment } from "@red-cup-engineering/web-page-tiling-engine";

const fragment = renderTufteFragment({
  tiles: [{ id: "w", title: "W", html: "<b>trusted</b>", content: "escaped, and ignored" }],
});

assert.ok(fragment.includes("<b>trusted</b>"), "html must win when both are present");
assert.ok(!fragment.includes("escaped, and ignored"), "content must be ignored once html is present");
```

## SSR + client patch lifecycle

`renderTufteDocument` returns a complete page: `<!doctype html>`, a
`<style>` block (`BASE_STYLES` plus any `options.styles`), a skip link, a
masthead, the tile grid, and an optional footer. `renderTufteFragment`
returns only `<div class="tufte-grid">...</div>` -- literally none of that
document scaffolding ships with it. A fragment consumer supplies their own
`<head>`, their own skip link, their own reduced-motion rule, and their own
CSS for every tile selector; TUFTE gives them the grid markup and nothing
else.

```js
// doctest: lifecycle-fragment-vs-document
import assert from "node:assert/strict";
import { renderTufteDocument, renderTufteFragment } from "@red-cup-engineering/web-page-tiling-engine";

const model = { title: "Shell", tiles: [{ id: "a", title: "A" }] };
const fragment = renderTufteFragment(model);
const document_ = renderTufteDocument(model, {
  source: "/api/projection",
  actionEndpoint: "/api/submit",
});

// Fragment mode: no document shell at all.
for (const marker of ["<style>", "tufte-skip", "<html", "<head>", "prefers-reduced-motion"]) {
  assert.ok(!fragment.includes(marker), `renderTufteFragment must not emit ${marker}`);
}

// Document mode: the shell, plus options.source/options.actionEndpoint
// landing on data-source/data-action-endpoint for connectTufteDocument to
// read by default.
assert.ok(document_.includes("<style>"));
assert.ok(document_.includes("tufte-skip"));
assert.match(document_, /data-source="\/api\/projection"/);
assert.match(document_, /data-action-endpoint="\/api\/submit"/);
```

`connectTufteDocument`'s `autoPatch: true` option diffs every incoming
`tufte:projection` event against the last-seen projection and patches the
DOM automatically. Pass `options.projection` (the model the page was SSR'd
from) to seed the baseline correctly; with no seed, the *first* incoming
projection just becomes the new baseline -- if it matches the SSR'd HTML,
nothing visibly patches, which is the harmless common case, but it is worth
knowing that's what's happening rather than assuming the first event is
always a no-op by design.

```js
// doctest: lifecycle-autopatch-baseline
import assert from "node:assert/strict";
import { connectTufteDocument } from "@red-cup-engineering/web-page-tiling-engine/browser";
// test/fake-dom.mjs is this package's own zero-dependency DOM test double --
// not a public export, used here only so this example can run under plain
// `node --test`. A real page just uses the browser's own `document`.
import { buildFakeTufteRoot } from "../test/fake-dom.mjs";

const { root, grid } = buildFakeTufteRoot([{ id: "a", title: "Original" }]);
root.contains = () => true;

const connection = connectTufteDocument(root, { autoPatch: true });

// First tufte:projection with no seeded baseline: becomes the new baseline.
// Since it already matches what's on screen, nothing visibly changes.
root.dispatchEvent(new CustomEvent("tufte:projection", {
  detail: { tiles: [{ id: "a", title: "Original" }] },
}));
assert.equal(grid.querySelector("#a").querySelector("h2").textContent, "Original");

// Second tufte:projection: diffs against the now-established baseline and
// patches for real.
root.dispatchEvent(new CustomEvent("tufte:projection", {
  detail: { tiles: [{ id: "a", title: "Updated" }] },
}));
assert.equal(grid.querySelector("#a").querySelector("h2").textContent, "Updated");

connection.disconnect();
```

If both projections in a diff carry a finite `tick` (an opaque
ordering/idempotency token -- TUFTE never interprets it beyond
`nextTick < prevTick`, and never grows a clock of its own), a patch
computed against an older tick is a no-op (`[]`) rather than a silent
overwrite. A projection at the same tick still applies what changed, so a
tile can gain a chat message without the stream inventing a new tick, and
replaying an identical projection diffs to nothing:

```js
// doctest: lifecycle-tick-gating
import assert from "node:assert/strict";
import { normalizeTufteModel, diffTufteProjection } from "@red-cup-engineering/web-page-tiling-engine";

const baseline = normalizeTufteModel({ tick: 5, tiles: [{ id: "a", title: "A" }] });
const olderTick = normalizeTufteModel({ tick: 4, tiles: [{ id: "a", title: "B" }] });
const sameTick = normalizeTufteModel({ tick: 5, tiles: [{ id: "a", title: "B" }] });

// Older tick, real content change: a no-op. tick gates the patch before
// content is even compared.
assert.deepEqual(diffTufteProjection(baseline, olderTick), []);

// Same tick, changed content: a real patch; an identical replay: nothing.
const patches = diffTufteProjection(baseline, sameTick);
assert.equal(patches.length, 1);
assert.deepEqual(patches[0], { op: "update", id: "a", changed: { title: "B" } });
assert.deepEqual(diffTufteProjection(baseline, baseline), []);
```

This is *not* the mechanism to reach for on a manual, sequential "click
refresh" flow with no concurrent writer -- there, `tick`'s stale-patch
guarantee is theater no real race earns. Use `revision` (a plain display
string, no diff-gating semantics of its own) for that case instead, and
compute the diff every time; there's nothing to gate against.

The patch contract itself: `update` writes scalar fields straight onto
`dataset`/inline style, and reconciles body nodes for
`html`/`content`, retaining matching identities and live controls. Structural ops (`insert`/`reorder`) place nodes by the
*authored* `afterId`, never by looking at where anything currently sits in
the DOM -- which is exactly what keeps the DOM/tab-order invariant holding
under a reorder, not just on first render:

```js
// doctest: lifecycle-structural-patch-order
import assert from "node:assert/strict";
import { normalizeTufteModel, diffTufteProjection } from "@red-cup-engineering/web-page-tiling-engine";
import { applyTufteProjectionPatch } from "@red-cup-engineering/web-page-tiling-engine/browser";
import { buildFakeTufteRoot, createFakeDocument } from "../test/fake-dom.mjs";

globalThis.document = createFakeDocument();

const previous = normalizeTufteModel({
  tiles: [{ id: "a", title: "A" }, { id: "b", title: "B" }, { id: "c", title: "C" }],
});
const { root, grid } = buildFakeTufteRoot(previous.tiles);

// b moves to the front, a new tile d is inserted between a and c.
const next = normalizeTufteModel({
  tiles: [{ id: "b", title: "B" }, { id: "a", title: "A" }, { id: "d", title: "D" }, { id: "c", title: "C" }],
});
applyTufteProjectionPatch(root, diffTufteProjection(previous, next));

assert.deepEqual(grid.children.map((tile) => tile.id), next.tiles.map((tile) => tile.id));

```

By default (`autoPatch` off, which is the default), a consumer owns
`tufte:projection` entirely -- dispatch it by hand from any source, or skip
`connectTufteDocument` altogether and call `diffTufteProjection` /
`applyTufteProjectionPatch` directly, the way the worked example in the next
section actually does, since there's no `source` endpoint to justify
`connectTufteDocument`'s own fetch-on-connect there.

## Shared storefronts

`./storefront` supplies the common catalog, item, detail, search, facet, status,
and action presentation. It accepts a `TufteStorefront` display projection;
product identities, prices, offers, playability, inventories, and entitlements
remain with their domain owners. Those owners supply admitted link actions,
native form actions, or an unavailable action with its reason. Buying, playing,
and subscribing therefore share presentation without acquiring the same
business meaning.

Use `storefrontCatalogModel(catalog, { path, itemHref, parameters })` in a page
loader. Search and filters use native GET forms and shareable URL parameters;
`storefrontQuery` discards facet values absent from the current catalog.
`storefrontDetailModel(catalog, id)` returns an explicit `null` for a missing
item. Both outputs are ordinary TUFTE models, usable as documents or fragments
inside a game component. Supply `STOREFRONT_STYLES` as the document's `styles`
option for the shared responsive presentation. Static storefronts need no
framework JavaScript. Domain illustrations and rich detail content use the
shared HTML node contract; ordinary text remains escaped.

## Applications and the shared HTTP server

`./application` exports `createTufteApplication`, `tuftePage`, and
`tufteRedirect`. Page loaders and action handlers receive the shared server's
actual Fetch `Request`, parsed URL and parameters, cancellation signal, and
explicit capabilities. Action `context.input` provides `bytes()`, `text()`,
`json()`, and `formData()` through the shared bounded body reader. Choose one
reader per request. The default encoded/decoded limit is 1 MiB; application
`body` options and action `body` options specialize it. Malformed, oversized,
and unsupported input yields a negotiated 400, 413, or 415 refusal. The raw
Request remains available for explicitly governed streaming protocols. Their results are typed pages or standard `Response`
objects. Resources, middleware, authentication, streaming, and lifecycle hooks
use the common server contract; TUFTE does not maintain another router.

```js
// doctest: fetch-native-application
import assert from "node:assert/strict";
import { createTufteApplication, tuftePage, tufteRedirect } from "@red-cup-engineering/web-page-tiling-engine/application";
import { composeTufteTile, htmlElement } from "@red-cup-engineering/web-page-tiling-engine/composition";
const app = createTufteApplication({
  pages: [{ match: "/hello/:name", load: ({ params }) => tuftePage({
    title: params.name,
    tiles: [composeTufteTile([htmlElement("p", {}, ["Welcome <friend>"])], { id: "welcome" })],
  }) }],
  actions: [{ match: "/save", run: () => tufteRedirect("/hello/Reader") }],
});
const html = await app.fetch(new Request("https://example.test/hello/Reader"));
assert.equal(html.status, 200);
assert.match(await html.text(), /Welcome &lt;friend&gt;/);
const json = await app.fetch(new Request("https://example.test/hello/Reader", { headers: { accept: "application/json" } }));
assert.equal((await json.json()).title, "Reader");
const redirect = await app.fetch(new Request("https://example.test/save", { method: "POST", headers: { origin: "https://example.test" } }));
assert.equal(redirect.status, 303);
```

Pages negotiate `text/html` or `application/json`, send `Vary: Accept`, and
default to `Cache-Control: no-store`. Page options carry status and headers;
HTTP redirects and errors remain standard Responses. The shared server owns
HEAD, OPTIONS, admission failures, and security headers. Authentication uses
`authorize(context)` or resource middleware. Unsafe methods require matching
Origin evidence or explicit `Sec-Fetch-Site: same-origin` when privacy policy
suppresses Origin. A webhook or non-browser client uses an injected `csrf`
verification capability; missing evidence is never silently accepted.

Enhanced navigation and forms send `X-Tufte-Projection: 1`. Application page,
action, and authentication redirects then return a `tufte.redirect` JSON
projection with an admitted HTTP(S) destination and the original redirect
status. The browser performs a document navigation, so external login and
checkout destinations need no CORS permission. Native requests keep their
standard redirect responses. Unsafe-method 307/308 redirects retain HTTP body
preservation; use native forms for external redirects that must preserve the
submitted body. Framework projections never admit `javascript:` or `data:`
navigation targets.

Enable progressive enhancement with `enhance: true`. The framework serves
versioned browser modules and an external bootstrap, seeds the rendered
projection as escaped JSON data, and supplies the response nonce to its
renderer. With enhancement disabled, static pages emit no framework script.
`enhance.components` maps names to same-origin modules exporting
`mount(element, props)`. A changed document shell (assets, component registry,
workspace, or surrounding markup) uses full native navigation; compatible
pages share browser state and patch their projections.

For Node, call `startWebServer(app, { host, port })` from
`@red-cup-engineering/computer-web-server/node`. On a Worker, call
`app.fetch(request, { capabilities: { store: env.STORE } })` from its fetch adapter.
Capabilities are explicit; the framework does not read platform environment
variables. The `./application`, `./rendering`, and `./composition` runtime
graphs contain no Node imports. The root entry retains synchronous SHP packet
support, also exported at `./packet`, whose cryptographic provider is Node-specific.

## Native forms, commands, and receipts

TUFTE forms have real `action`, `method`, and `enctype` attributes. Without
JavaScript, or without `enhance: true` on the form (or `enhanceForms: true`
on the document connection), the browser submits normally. Every native
fallback action must be a working server resource.

Enhanced forms construct `FormData(form, submitter)` and preserve repeated
fields, files, successful controls, validation, submitter overrides, and
native GET query encoding. File bytes use `multipart/form-data`; choosing
URL encoding or plain text submits filenames, as the HTML standard requires.
New-window, external-origin, dialog, and image-button submissions retain
native behavior. Mutation failures never trigger an automatic replay.

The resource should return JSON or an HTTP redirect. JSON success emits
`tufte:receipt`; a complete `kind: "tufte.projection"` also emits
`tufte:projection`, consumed by `autoPatch`. Non-success JSON with `fields`
sets field errors and focuses the first invalid control. HTTP redirects
load the actual destination document, including authentication pages.
`tufte:submit` exposes `{form, submitter, data, action, method}` for observation.

```js
// doctest: native-enhanced-form
import assert from "node:assert/strict";
import { renderTufteDocument } from "@red-cup-engineering/web-page-tiling-engine";
const html = renderTufteDocument({ tiles: [{ id: "upload", form: {
  id: "upload-form", action: "/upload", method: "post", enhance: true,
  enctype: "multipart/form-data",
  fields: [{ name: "attachment", kind: "file", label: "Attachment" }],
  submitters: [{ name: "intent", value: "publish", label: "Upload" }],
} }] });
assert.match(html, /action="\/upload"/);
assert.match(html, /enctype="multipart\/form-data"/);
assert.match(html, /data-tufte-enhance="true"/);
assert.match(html, /type="file"/);
```

Command buttons remain a separate protocol: `[data-tufte-action]` emits
`tufte:action` and sends `{action, value, revision}` as JSON to the declared
`actionEndpoint`. Native forms never become JSON command envelopes.
`applyTufteReceipt` applies partial tile updates; receipt data does not remove
tiles it omits. Explicit `live: "polite"` or `"assertive"` provides readable
status announcements where the application's user journey needs them.

## Document metadata and component lifecycle

`model.metadata` admits `title`, `description`, `language`, `themeColor`,
`robots`, `canonical`, `image`, `siteName`, `type`, and `structuredData`. A
page that declares an Open Graph `type` (`"book"`, `"website"`) also renders
Open Graph and card tags from the same values, and `structuredData` renders
one schema.org JSON-LD data block. The same definition renders SSR head tags and
updates the document during navigation. Only managed tags are replaced;
raw `headHtml` is trusted application code and is never fetched as metadata.
Navigation accepts eligible same-origin links, cancels stale requests,
preserves per-entry projection sources and scroll positions, and focuses the
destination fragment or heading. External, download, targeted, modified,
and same-page fragment links retain native browser behavior.

`tile.component = {name, props, html}` declares an enhanced island with a
trusted server-rendered fallback. `connectTufteComponents(root, factories)`
mounts each named factory once and invokes its returned `update(props)` and
`dispose()` methods. Stable tile and component identities preserve local
editor or graphics state. A removed component is disposed; disconnecting the
connection disposes all remaining instances. Props are JSON data and never
become executable script.

Use `options.scripts` and `options.stylesheets` for admitted external assets.
The HTTP adapter supplies `options.nonce` and the matching CSP header; the
renderer authorizes its generated style element and bootstrap with that
nonce and moves layout attributes into generated CSS rules. `renderTufteStyles`
exports the shared theme CSS. `html`, component fallback HTML, `headHtml`,
`styles`, and `clientScript` are trusted application code, not sanitizers for
untrusted text. Plain content and metadata are escaped. Inline raw-text assets
containing closing script/style tags are refused.

The Chromium contract tests in `test/browser-contract.test.mjs` exercise
native fallback, real file bytes, navigation races, history, metadata, focus,
CSP, active input selection, and component state. Install Playwright's Chromium
or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an installed Chromium executable
before `npm test`.

## Theming

`BASE_STYLES` has light and dark palette variants and ships only with
`renderTufteDocument` -- none of it is present
in a `renderTufteFragment` output, confirmed above in
`lifecycle-fragment-vs-document`. `BASE_STYLES` also defines five alias
custom properties onto TUFTE's own palette -- `--accent`, `--ink`,
`--ink-dim`, `--border`, `--bg` -- matching the token names the house
`shelf-chrome` artifact falls back through. This is a one-way convenience:
TUFTE defines these for another page's CSS to read, it never reads an outer
page's own tokens. It exists for a game that vendors `shelf-chrome.css` into
its *own* page and renders that page via `renderTufteDocument` -- a
`renderTufteFragment` consumer embedding TUFTE's grid inside a page it
already owns doesn't need this alias mechanism at all, since that page's own
tokens are already in scope.

`options.styles` (plain CSS text, appended after TUFTE's base and selected
theme CSS so it wins
any cascade collision) and `options.headHtml` (trusted markup injected into
`<head>`, after the `<style>` block) are the two full-document extension
points for a page-level look. `model.mastheadHtml` and `model.footerHtml`
are the two named injection points `shelf-chrome`'s own README asks for --
also full-document only.

```js
// doctest: theming-alias-tokens
import assert from "node:assert/strict";
import { renderTufteDocument, renderTufteFragment } from "@red-cup-engineering/web-page-tiling-engine";

const document_ = renderTufteDocument(
  { title: "Themed", mastheadHtml: "<p>Masthead</p>", footerHtml: "<p>Footer</p>", tiles: [{ id: "a", title: "A" }] },
  { styles: ".custom{color:red}", headHtml: '<meta name="extra" content="head-injected">' },
);
const fragment = renderTufteFragment({ tiles: [{ id: "a", title: "A" }] });

assert.ok(document_.includes("color-scheme:light dark"), "BASE_STYLES is full-document only");
assert.ok(document_.includes("--accent:var(--tufte-accent)"), "the five alias tokens ship with the full document");
assert.ok(document_.includes(".custom{color:red}"), "options.styles is appended after BASE_STYLES");
assert.ok(document_.includes('<meta name="extra" content="head-injected">'), "options.headHtml lands in <head>");
assert.ok(document_.includes("<p>Masthead</p>") && document_.includes("<p>Footer</p>"));

assert.ok(!fragment.includes("color-scheme:light dark"), "none of BASE_STYLES ships with a fragment");
assert.ok(!fragment.includes("Masthead") && !fragment.includes("Footer"), "masthead/footer are full-document-only injection points");
```

Also worth stating plainly: this storefront's own token names are
`--fg`/`--fg-muted`, not `--ink`/`--ink-dim`. A consumer who wants to opt
into the alias convention on their own page has to actually add tokens
named `--ink`/`--ink-dim` (etc.) -- TUFTE never infers the alias from a
similarly-purposed but differently-named token already in scope.

For a complete document that needs the domain-neutral warm monochrome early
Macintosh treatment, pass `theme: "early-mac"`. The renderer applies the CSS
after `BASE_STYLES`, sets `data-tufte-theme="early-mac"` on both the body and
the TUFTE root, and uses the theme's desktop color for the browser UI. The
theme keeps focus visible, disables pressed-button movement under reduced
motion, switches to compact spacing on narrow viewports, and selects a
system-font stack that includes Unicode-capable fallbacks for language text.

```js
// doctest: theming-early-mac
import assert from "node:assert/strict";
import { EARLY_MAC_THEME, renderTufteDocument } from "@red-cup-engineering/web-page-tiling-engine";

const document_ = renderTufteDocument(
  { title: "Lakhóta", tiles: [{ id: "words", title: "Čhaŋté", content: "Wašté" }] },
  { theme: "early-mac" },
);

assert.equal(EARLY_MAC_THEME.name, "early-mac");
assert.match(document_, /<body data-tufte-theme="early-mac">/);
assert.match(document_, /data-tufte-theme="early-mac"/);
assert.match(document_, /repeating-linear-gradient/);
assert.match(document_, /"Noto Sans"/);
```

## Accessibility guarantees and their limits

**Real, tested guarantees:**

- Authored tile order is DOM/tab order, always -- static render, and every
  structural patch (`lifecycle-structural-patch-order` above proves the
  patch side; the package's own `test/projection-patch-invariants.test.mjs`
  proves it under `grid-auto-flow: dense`'s visual repacking too).
- Every tile gets an automatic `aria-labelledby` pointing at its own `<h2
  id="{tile-id}-title">` -- not something a consumer opts into.
- A skip link and a `prefers-reduced-motion` rule, full-document only (see
  `lifecycle-fragment-vs-document` above -- neither ships with a fragment).
- Every text field (`title`, `eyebrow`, `content`) is escaped automatically;
  only `html` is trusted, and only because the consumer explicitly chose
  that field.

```js
// doctest: accessibility-guarantees
import assert from "node:assert/strict";
import { renderTufteDocument } from "@red-cup-engineering/web-page-tiling-engine";

const html = renderTufteDocument({
  title: "A11y",
  tiles: [
    { id: "panel", title: "Panel" },
    { id: "status", title: "Status", content: "Ready.", live: "polite" },
  ],
});

// aria-labelledby, automatic, per tile.
assert.match(html, /id="panel" data-role="standard"[^>]*aria-labelledby="panel-title"/);
assert.match(html, /<h2 id="panel-title">Panel<\/h2>/);

// The default is still silence: a tile with no `live` field renders no
// aria-live attribute at all, checked directly here, not paraphrased.
assert.doesNotMatch(html.slice(0, html.indexOf('id="status"')), /aria-live/);
// A tile that opts in with `live: "polite"` does render the pair -- see
// "Live regions and patch focus" under Wave1 for the full account of why
// this is opt-in rather than automatic, and what `applyTufteProjectionPatch`
// does with the same field when a *patched* tile's `live` value changes.
assert.match(html, /id="status"[\s\S]*?aria-live="polite" aria-atomic="true"/);
```

**Limits, stated as loudly as the guarantees:**

- **No `aria-live` region by default, and never automatically inferred.**
  The example above checks both halves directly against real output, not
  just narrates them: a tile with no `live` field renders none, one with
  `live: "polite"`/`"assertive"` renders the pair. TUFTE never infers a
  `live` value from a tile's other fields (not from `role`, not from
  `confidence`, not from anything). A page using the full live-update
  apparatus -- `autoPatch`, the action/receipt loop, all of it -- can still
  be completely silent to a screen reader unless the app author sets `live`
  on the tiles that should announce.
- **Stable identity is required for retained state.** Give controls stable IDs
  or `data-tufte-key` values. Matching elements preserve dirty values and active
  selection; replacing an element's identity or input type discards its state.
  Mounted components own their internal DOM until disposed.
- **No ARIA translation for `role`/`lifecycle`/`confidence`/`side`.** These
  are `data-*` attributes and CSS selectors only. A screen-reader user gets
  no signal that a tile is `confidence="low"` unless that fact is *also*
  present in the tile's visible, readable text -- a data attribute alone
  never carries meaning to assistive tech.
- **`side`'s signal is border-color-only.** Anyone relying on hue alone
  (not just screen-reader users -- also anyone with low color
  discrimination, a strong ambient glare, or a grayscale display) gets
  nothing from `side` at all.
- **Dense-grid visual order can diverge from authored/keyboard order for a
  sighted mouse user.** `grid-auto-flow: dense` is an intentional,
  masonry-style visual tradeoff. "Visually adjacent" is not a promise TUFTE
  makes anywhere in its contract; "keyboard-sequential, in authored order"
  is the actual, tested guarantee -- the two are not the same claim, and
  conflating them overstates what dense packing costs nothing to give up.

## Wave1: app-author patterns

Everything above this chapter documents TUFTE as it already shipped. What
follows is Wave1: the five patterns an app author hits first once a project
grows past one static page -- ranked by the checklist that scoped this work
as, in order, routing, local ephemeral state, forms/validation, async
pending state, and live-region/focus a11y. Each stays inside the same
constraint every prior chapter already held to: the typed tile vocabulary,
zero new runtime dependency, and a patch primitive, not a virtual DOM. None
of the five needed a new rendering path -- every one of them is either a
closed-vocabulary field addition (`live`, `lifecycle="pending"`), a thin
DOM helper built on `diffTufteProjection`/`applyTufteProjectionPatch` (exactly
the same primitives item 1's tile-patching already established), or, for
local state, no new code at all -- just those same primitives pointed at
data that never left the page.

### Documents as routes: `connectTufteNavigation`

TUFTE does not grow a router. There is no route table, no path-pattern
matcher, no client-side history replay engine anywhere in this package --
and Wave1 does not change that. What it adds is the observation that a
route change is not a different *kind* of update from a live data refresh:
it is the same "fetch a projection, diff it against what's on screen, patch
the DOM" loop `connectTufteDocument`'s `source` option already runs once at
connect time, just triggered by a link click instead of by connecting.

`connectTufteNavigation(root, options)` delegates `click` on
`a[data-tufte-nav]` -- opt-in, the same posture as `[data-tufte-action]`.
An ordinary `<a href="/next">` with no `data-tufte-nav` attribute is left
completely alone by this function and performs a real, working, full-page
navigation with zero JavaScript; that is the zero-JS floor, and this
function does not have to implement a fallback for it, because it was never
in this function's way to begin with. When a link *does* carry
`data-tufte-nav`, this function fetches `data-tufte-nav-source ?? href`
with `Accept: application/json`, diffs the JSON projection body it gets
back against the last one via `diffTufteProjection`, patches the DOM via
`applyTufteProjectionPatch` (with an optional view transition and destination focus), and calls
`history.pushState` -- using the link's own `href` for the address bar even
when a distinct `data-tufte-nav-source` was the URL actually fetched, since
the href is what stays shareable and reloadable.

Two server shapes both work against this same client code, and which one an
app picks is entirely a server-side decision this package has no opinion
about: content-negotiate a single URL (serve the full document for
`Accept: text/html`, that same page's projection for
`Accept: application/json` -- one route, one source of truth), or serve a
distinct sibling JSON endpoint and point `data-tufte-nav-source` at it. A
`popstate` listener (on by default; `popState: false` disables it) refetches
`location.pathname + location.search` on back/forward, `replace`-ing rather
than pushing so the history stack does not grow.

```js
// doctest: navigation-connect
import assert from "node:assert/strict";
import { normalizeTufteModel } from "@red-cup-engineering/web-page-tiling-engine";
import { connectTufteNavigation } from "@red-cup-engineering/web-page-tiling-engine/browser";
import { buildFakeTufteRoot, createFakeDocument, fakeFetch } from "../test/fake-dom.mjs";

globalThis.document = createFakeDocument();
const { root, grid } = buildFakeTufteRoot([{ id: "page", title: "Home", content: "Welcome home." }]);
root.contains = () => true;

const link = globalThis.document.createElement("a");
link.setAttribute("href", "/next");
link.setAttribute("data-tufte-nav", "");
grid.appendChild(link);

// A plain <a href> with no data-tufte-nav is never touched by this
// function -- proven here by leaving its own click unprevented.
const plainLink = globalThis.document.createElement("a");
plainLink.setAttribute("href", "/elsewhere");
grid.appendChild(plainLink);

globalThis.fetch = fakeFetch({
  "GET /next": () => ({ status: 200, json: { tiles: [{ id: "page", title: "Next", content: "You navigated." }] } }),
});

const pushed = [];
const fakeWindow = {
  history: { pushState: (...args) => pushed.push(args), replaceState() {} },
  location: { pathname: "/", search: "" },
  addEventListener() {},
  removeEventListener() {},
};

const connection = connectTufteNavigation(root, {
  projection: normalizeTufteModel({ tiles: [{ id: "page", title: "Home", content: "Welcome home." }] }),
  window: fakeWindow,
});

let prevented = false;
root.dispatchEvent({ type: "click", bubbles: true, target: link, preventDefault: () => { prevented = true; } });
await new Promise((resolve) => setTimeout(resolve, 0));

assert.ok(prevented, "connectTufteNavigation owns the click for an opted-in link");
assert.equal(grid.querySelector("#page").querySelector("h2").textContent, "Next");
assert.equal(grid.querySelector("#page").querySelector(".tufte-tile-body").innerHTML, "<p>You navigated.</p>");
assert.equal(pushed.length, 1);
assert.deepEqual(pushed[0], [{ tufteHref: "/next", tufteSource: "/next" }, "", "/next"]);

let plainPrevented = false;
root.dispatchEvent({ type: "click", bubbles: true, target: plainLink, preventDefault: () => { plainPrevented = true; } });
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(plainPrevented, false, "an undecorated <a href> is left alone -- the zero-JS floor needs no fallback code here");
assert.equal(pushed.length, 1, "no second pushState for the plain link");

connection.disconnect();
```

### Field-level validation: `tile.fields` + `applyTufteFieldErrors`

TUFTE already had the wire shape for this before Wave1: `tufte:refusal`'s
`detail.tile`, and any tile's `[extra: string]: unknown` fields surviving
`normalizeTufteModel` untouched (the same mechanism `domainScore` uses in
this handbook's own normalization example, above). What was missing was a
*name* for a specific shape of extra data, and a helper that reads it.

The convention: a refusal tile may carry a `fields` property,
`{[formFieldName]: "error message"}`. TUFTE itself never writes this shape
-- an app's own server-side validation decides which fields to name and
what to say about them, exactly the same "validation logic stays app-owned"
boundary the rest of this package holds everywhere else. What Wave1 adds is
`applyTufteFieldErrors(form, tile)`: it reads `tile.fields` and, for every
one of `form`'s own named controls, either sets `aria-invalid="true"` plus
an `aria-describedby` pointing at a freshly-inserted
`<p class="tufte-field-error">` message paragraph (if that field is named in
`fields`), or clears exactly that same state (if it is not, including on a
field that *was* named on a previous call and has since been fixed).

```js
// doctest: field-errors
import assert from "node:assert/strict";
import { applyTufteFieldErrors } from "@red-cup-engineering/web-page-tiling-engine/browser";
import { createFakeDocument } from "../test/fake-dom.mjs";

const document_ = createFakeDocument();
globalThis.document = document_;
const form = document_.createElement("form");
const nameInput = document_.createElement("input");
nameInput.name = "name";
const scoreInput = document_.createElement("input");
scoreInput.name = "score";
form.appendChild(nameInput);
form.appendChild(scoreInput);
form.elements = [nameInput, scoreInput];

// The standardized wire shape: a refusal tile's `fields` property, an
// ordinary extra field normalizeTufteModel already carries through untouched.
applyTufteFieldErrors(form, { id: "status", fields: { name: "Name must be 1-24 characters." } });

assert.equal(nameInput.getAttribute("aria-invalid"), "true");
assert.equal(nameInput.getAttribute("aria-describedby"), "name-error");
assert.equal(form.querySelector("#name-error").textContent, "Name must be 1-24 characters.");
assert.equal(scoreInput.getAttribute("aria-invalid"), null, "a field the refusal did not name is left alone");

// A later, cleared refusal removes exactly what it added.
applyTufteFieldErrors(form, { id: "status" });
assert.equal(nameInput.getAttribute("aria-invalid"), null);
assert.equal(nameInput.getAttribute("aria-describedby"), null);
assert.equal(form.querySelector("#name-error"), null);
```

Pairing this with the existing form-submission path from the action loop
chapter above is exactly one `tufte:refusal` listener:
`root.addEventListener("tufte:refusal", (e) => applyTufteFieldErrors(form, e.detail.tile))`
-- no new event, no new endpoint shape beyond naming `fields` on the tile a
server was already free to send back.

### Pending lifecycle: `lifecycle="pending"` + `withPendingLifecycle`

`lifecycle` was already a real, if binary, field: exactly one value,
`imminent`, had CSS; every other value, including the documented default
`present`, was inert (see "Tile vocabulary semantics" above). Wave1 gives a
second value real CSS: `[data-lifecycle=pending]` now shares
`[data-confidence=low]`'s exact declaration (dashed border, reduced
opacity) in `BASE_STYLES` -- zero new styling, one more selector on an
existing rule. This makes a first-round-trip loading state a real,
documented lifecycle token instead of a bespoke spinner widget every app
reinvents.

`withPendingLifecycle(root, ids, action)` marks one or more tiles pending
for the duration of an async `action`, then reverts each tile to its prior
lifecycle -- but only if that tile is *still* `"pending"` when `action`
settles. If a receipt (or any other patch) already moved a tile on to
something else while `action` was in flight, that newer state wins; the
revert never clobbers it back to a stale value.

```js
// doctest: pending-lifecycle
import assert from "node:assert/strict";
import { renderTufteDocument } from "@red-cup-engineering/web-page-tiling-engine";
import { withPendingLifecycle } from "@red-cup-engineering/web-page-tiling-engine/browser";
import { buildFakeTufteRoot, createFakeDocument } from "../test/fake-dom.mjs";

// [data-lifecycle=pending] reuses [data-confidence=low]'s CSS rule -- no
// new styling, just a second selector on the same declaration.
const html = renderTufteDocument({ tiles: [{ id: "z", title: "Z" }] });
assert.ok(html.includes(".tufte-tile[data-confidence=low],.tufte-tile[data-lifecycle=pending]{opacity:.75;border-style:dashed}"));

globalThis.document = createFakeDocument();
const { root, grid } = buildFakeTufteRoot([{ id: "score", title: "Score", lifecycle: "present", content: "12" }]);

const result = await withPendingLifecycle(root, "score", async () => {
  assert.equal(grid.querySelector("#score").dataset.lifecycle, "pending", "marked pending for the duration of the action");
  return "settled";
});

assert.equal(result, "settled");
assert.equal(grid.querySelector("#score").dataset.lifecycle, "present", "reverted once the action settled, since nothing else moved it on");
```

### Local-only projections: client state without a second reactive system

This is a pattern, not new code -- Wave1 adds nothing here beyond naming
it, because nothing needed adding. `diffTufteProjection` and
`applyTufteProjectionPatch` only ever compare two `normalizeTufteModel`
outputs; neither one has ever cared whether the "next" projection arrived
over the network or was built by hand, in memory, from a closure variable a
click handler mutated. A tab strip, an accordion, a form-in-progress
preview -- any purely client-side toggle that never needs to leave the page
-- can hold its own state in an ordinary local variable and drive the exact
same patch primitives a live server round-trip uses. This is deliberately
*not* a second reactive system: no signals, no dependency graph, no
computed properties. An app author writes one function that builds a fresh
projection from current state and calls `applyTufteProjectionPatch` with
the diff, the same shape every other patch in this package already takes.

```js
// doctest: local-projection
import assert from "node:assert/strict";
import { normalizeTufteModel, diffTufteProjection } from "@red-cup-engineering/web-page-tiling-engine";
import { applyTufteProjectionPatch } from "@red-cup-engineering/web-page-tiling-engine/browser";
import { buildFakeTufteRoot, createFakeDocument } from "../test/fake-dom.mjs";

globalThis.document = createFakeDocument();

let state = { active: "overview" };
const tileFor = (state_) => ({
  id: "panel",
  title: state_.active === "overview" ? "Overview" : "Details",
  content: state_.active === "overview" ? "The short version." : "The long version.",
});

let projection = normalizeTufteModel({ tiles: [tileFor(state)] });
const { root, grid } = buildFakeTufteRoot(projection.tiles);

function setActive(next) {
  state = { ...state, active: next };
  const nextProjection = normalizeTufteModel({ tiles: [tileFor(state)] });
  applyTufteProjectionPatch(root, diffTufteProjection(projection, nextProjection));
  projection = nextProjection;
}

setActive("details");
assert.equal(grid.querySelector("#panel").querySelector("h2").textContent, "Details");
assert.equal(grid.querySelector("#panel").querySelector(".tufte-tile-body").innerHTML, "<p>The long version.</p>");

setActive("overview");
assert.equal(grid.querySelector("#panel").querySelector("h2").textContent, "Overview");
```

### Live regions and patch focus: opt-in `tile.live` + `applyTufteProjectionPatch`'s `focusOnInsert`

Section 8 of the action-loop chapter and the accessibility chapter above
both named the same real gap: no `aria-live` region anywhere, ever,
automatically. Wave1 closes the mechanical half of that (a real, typed,
patchable field now exists) without closing the *automatic* half (TUFTE
still never infers `live` from anything -- an app author sets it). A tile's
`live` field accepts exactly `"polite"` or `"assertive"`; any other value,
including omission, coerces to absent -- the same closed-vocabulary
discipline `role`/`lifecycle`/`confidence`/`side` already use. When set, it
renders `aria-live`/`aria-atomic="true"` on that tile's own
`.tufte-tile-body`, in SSR (`renderTufteFragment`/`renderTufteDocument`),
on a browser-built inserted tile, and as a normal patchable field --
`diffTufteProjection` notices a `live` change like any other vocabulary
field, and `applyTufteProjectionPatch`/`applyTufteReceipt` write or clear
the attribute pair to match.

The second half of this item is unrelated to `aria-live` but solves the
same class of problem -- a structural change a sighted user sees but a
keyboard/screen-reader user might not notice. `applyTufteProjectionPatch`'s
`options.focusOnInsert` (default false), when true and the patch list
inserts at least one tile, moves focus to the first inserted tile's own
`<h2>` heading once the patch finishes (adding `tabindex="-1"` first if the
heading is not already focusable) -- exactly the "announce the new
landmark" pattern a route change needs, which is why
`connectTufteNavigation` forwards this same option through to every
navigation's patch call.

```js
// doctest: live-region-and-focus
import assert from "node:assert/strict";
import { normalizeTufteModel, diffTufteProjection, renderTufteFragment } from "@red-cup-engineering/web-page-tiling-engine";
import { applyTufteProjectionPatch } from "@red-cup-engineering/web-page-tiling-engine/browser";
import { buildFakeTufteRoot, createFakeDocument } from "../test/fake-dom.mjs";

// SSR: absent by default, rendered only when a tile opts in with a valid token.
const html = renderTufteFragment({
  tiles: [
    { id: "status", title: "Status", content: "Ready.", live: "polite" },
    { id: "plain", title: "Plain", content: "No live region." },
    { id: "bad", title: "Bad", content: "Ignored value.", live: "very-loud" },
  ],
});
assert.match(html, /id="status"[\s\S]*?<div class="tufte-tile-body" aria-live="polite" aria-atomic="true">/);
assert.doesNotMatch(html.slice(html.indexOf('id="plain"')), /aria-live/);

// Structural inserts + focusOnInsert: move focus to the new tile's own
// heading so a screen-reader/keyboard user hears the new landmark.
globalThis.document = createFakeDocument();
const { root, grid } = buildFakeTufteRoot([{ id: "a", title: "A" }]);
const previous = normalizeTufteModel({ tiles: [{ id: "a", title: "A" }] });
const next = normalizeTufteModel({ tiles: [{ id: "a", title: "A" }, { id: "b", title: "New section" }] });
applyTufteProjectionPatch(root, diffTufteProjection(previous, next), { focusOnInsert: true });

const heading = grid.querySelector("#b").querySelector("h2");
assert.equal(heading.getAttribute("tabindex"), "-1", "made programmatically focusable first");
assert.equal(heading.focused, true, "focus actually moved to the new landmark, not just tabindex being set");
```

### View Transitions wrap on structural patches

`applyTufteProjectionPatch`'s `options.transition` (default false), when
true and the patch list contains at least one structural op
(`insert`/`remove`/`reorder`), wraps the mutation in
`document.startViewTransition(...)` when the platform exposes it --
feature-detected, zero new dependency, a silent synchronous fallback
everywhere the API is absent, which is every environment this package's own
test suite runs in today.

This is opt-in for a reason beyond matching `autoPatch`'s posture: per
spec, `startViewTransition`'s update callback runs as a *queued* task, not
synchronously, so enabling `transition` trades away the
"patched by the time this call returns" guarantee `applyTufteProjectionPatch`
has otherwise always offered, including to every other example in this
handbook. Leave it off wherever a caller depends on that synchronous
contract (this package's own tests included -- none of them set it). The
doctest below proves the platform API gets called when present via a spy,
not a real transition; it is not evidence about real-browser timing, which
the paragraph above already states plainly instead of demonstrating, since
demonstrating a queued-task deferral honestly would require a real browser,
not `node --test`.

```js
// doctest: view-transitions
import assert from "node:assert/strict";
import { normalizeTufteModel, diffTufteProjection } from "@red-cup-engineering/web-page-tiling-engine";
import { applyTufteProjectionPatch } from "@red-cup-engineering/web-page-tiling-engine/browser";
import { buildFakeTufteRoot, createFakeDocument } from "../test/fake-dom.mjs";

globalThis.document = createFakeDocument();
const { root, grid } = buildFakeTufteRoot([{ id: "a", title: "A" }]);

// No startViewTransition here (true of every runtime this package tests
// in): options.transition silently falls back to the same synchronous
// apply as leaving it off.
const previous = normalizeTufteModel({ tiles: [{ id: "a", title: "A" }] });
const next = normalizeTufteModel({ tiles: [{ id: "a", title: "A" }, { id: "b", title: "B" }] });
applyTufteProjectionPatch(root, diffTufteProjection(previous, next), { transition: true });
assert.equal(grid.children.length, 2, "the fallback path is synchronous: patched by the time the call returns");

// When the platform does support it, TUFTE calls it -- proven by installing
// a spy in place of the real API (this spy's own callback happens to run
// synchronously; the real browser API does not, see the prose above).
let called = false;
globalThis.document.startViewTransition = (callback) => { called = true; callback(); return { ready: Promise.resolve(), finished: Promise.resolve() }; };
const { root: root2, grid: grid2 } = buildFakeTufteRoot([{ id: "x", title: "X" }]);
const previous2 = normalizeTufteModel({ tiles: [{ id: "x", title: "X" }] });
const next2 = normalizeTufteModel({ tiles: [{ id: "x", title: "X" }, { id: "y", title: "Y" }] });
applyTufteProjectionPatch(root2, diffTufteProjection(previous2, next2), { transition: true });
assert.ok(called, "document.startViewTransition was actually invoked for a structural patch");
```

## Workspace: fullscreen and undo as values

The tiling workspace (`./topology`) is a plain frozen value reduced by pure
functions, and two capabilities the reference tiling window managers all
ship fall out of that fact rather than needing machinery of their own.
`fullscreen` is an overlay on the value: one pane covers the whole surface,
the covered tiles keep their DOM order and gain `hidden`, and the split tree
underneath is untouched -- so `restore` returns the exact prior value, with
nothing to compute in reverse. Undo is the same idea one level up:
`createTufteWorkspaceHistory` is a bounded history of values, and
`connectTufteWorkspace` replays one through the identical
`applyTufteWorkspace` path a fresh page load or a persisted arrangement
takes (Alt+Z / Alt+Shift+Z, or `undo()`/`redo()` on the handle).

```js
// doctest: workspace-fullscreen-undo
import assert from "node:assert/strict";
import {
  normalizeTufteWorkspace,
  reduceTufteWorkspace,
  createTufteWorkspaceHistory,
} from "@red-cup-engineering/web-page-tiling-engine/topology";

const model = { tiles: [{ id: "log" }, { id: "prompt" }, { id: "side" }] };
const start = normalizeTufteWorkspace(
  { split: "row", sizes: [0.7, 0.3], children: [{ split: "column", children: ["log", "prompt"] }, "side"] },
  model,
);

// Fullscreen is an overlay: the split tree underneath is untouched.
const full = reduceTufteWorkspace(start, model, { kind: "fullscreen", id: "log" });
assert.equal(full.kind, "tufte.workspace.receipt");
assert.deepEqual(full.geometry.panes.map((pane) => pane.tile), ["log"]);
assert.deepEqual(full.geometry.hidden, ["prompt", "side"]);
assert.deepEqual(full.workspace.root, start.root);

// Restore reproduces the prior value exactly -- no reverse operation exists to get wrong.
const restored = reduceTufteWorkspace(full.workspace, model, { kind: "restore" });
assert.deepEqual(restored.workspace, start);

// Undo: a bounded history of values, replayed through whatever apply path the live page uses.
const history = createTufteWorkspaceHistory({ limit: 10 });
history.record(start);
const resized = reduceTufteWorkspace(start, model, { kind: "resize", path: [], index: 0, boundary: 0.5 }).workspace;
assert.deepEqual(history.undo(resized), start);
assert.deepEqual(history.redo(start), resized);
```
