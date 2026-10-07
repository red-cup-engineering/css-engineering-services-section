---
title: "TUFTE v-next Spec"
description: "Feature spec closing the ranked gaps from the TUFTE market teardown against the meet-and-beat mandate, with a load-bearing-vs-flavor classification and a cut list of gaps deliberately not closed."
date: 2026-08-19
keywords: ["tufte", "frontend", "web-components", "spec", "v-next"]
---


> **Superseded scope (2026-08-30).** The shipped Wave1 contracts recorded
> here remain real. The cut list and the rule against growing a complete web
> application framework do not. TUFTE must meet and
> beat current web rendering frameworks, with Tiling, User, Form, Topology,
> and Engine all load-bearing. See the
> [current framework charter](2026/08/30/2026-08-30-note-on-tufte-framework-charter.md).

Companion to `2026-08-19-note-on-tufte-market-teardown.md`. That document
found the gaps and ranked them by evidence (North Shore's live code, the
owner's `http-sse-server` duplication note, the QwzSpace recon). This
document turns the ranked, evidenced gaps into a spec: what each item builds,
which real consumer needs it, and whether the Jiangshi note
(`2026-03-05-note-on-semantic-web-jiangshi-web.md`) approves the shape of the
fix. It closes with the cut list — what is deliberately not built, and why
leaving it out is the correct call, not an oversight.

## Load-bearing vs. flavor

Every spec item below is tagged:

- **LOAD-BEARING** — the philosophy is the product; getting this wrong makes
  TUFTE a worse, slower version of a virtual-DOM framework instead of a
  better version of itself. Cutting corners here is not an option.
- **FLAVOR** — a real, useful seam, but TUFTE's identity survives if this
  ships late, ships smaller, or ships differently than specified.

Four of five feature items below are LOAD-BEARING in their *constraint*, not
their *existence* — i.e. it is load-bearing that the fix stay small and
typed, not that the fix ships on any particular day. Only the mechanical item
(TypeScript declarations) is pure FLAVOR: it is a packaging-hygiene fix with
zero philosophical content either way.

## 0. Mechanical fix (FLAVOR) — ship declarations

**Gap closed:** teardown gap 5. TUFTE is the only package in its own house
convention (`.mjs` plus ESM declarations) shipping zero type declarations.

**Customer:** every fleet consumer with a TypeScript build (North Shore's own
tooling, and any future consumer that type-checks).

**Design.** Two hand-written `.d.mts` files (`render-tufte-document.d.mts`,
`tufte-browser.d.mts`) covering the existing exports
(`renderTufteDocument`, `normalizeTufteModel`, `connectTufteDocument`, and the
browser re-export) plus whatever new exports land from items 1–3 below. Zero
new dependency (no `tsc --declaration` build step required; hand-written
types are consistent with the zero-build CLI identity). This changes nothing
about runtime behavior, vocabulary, or the render-once contract.

## 1. Tile-granularity patch primitive (LOAD-BEARING)

**Gap closed:** teardown gap 1 — the only *blocking, currently-live* gap.
North Shore's client hand-writes
`byId("confidence").closest(".tufte-tile").dataset.confidence = match.confidence`
after every `tufte:receipt`/`tufte:projection`, because `renderTufteDocument`
only ever emits a full document string and `connectTufteDocument` never
touches the DOM after wiring listeners.

**Customer:** North Shore, today, in production code — not speculative.
Every future fleet consumer that wants live data without reinventing
DOM-patching.

**Design — new exports in `./browser`, both pure/thin, zero new dependency:**

- `diffTufteProjection(previous, next)` — pure function over two
  `normalizeTufteModel` outputs. Diffs *only* the typed vocabulary TUFTE
  already owns (`role`, `lifecycle`, `confidence`, `span`, `side`, `title`,
  `eyebrow`, `html`/`content`) and tile identity/order. Returns an ordered
  patch list:
  - `{op:"update", id, changed:{...only the fields that differ...}}`
  - `{op:"insert", id, afterId, tile}` — `afterId` is `null` for
    "insert first," preserving the *authored* order, never a DOM-observed
    order.
  - `{op:"remove", id}`
  - `{op:"reorder", id, afterId}` — emitted only when order genuinely
    changed; most projections never trigger this branch.
- `applyTufteProjectionPatch(root, patches)` — thin, optional, browser-only
  DOM helper. Scalar `changed` fields become `dataset.*`/`style` writes
  (cheap). `html`/`content` changes are a **tile-granular replace**: the
  `.tufte-tile-body` innerHTML is swapped whole, never sub-node diffed — this
  is the deliberate boundary that keeps this a patch primitive, not a virtual
  DOM. `insert`/`remove`/`reorder` use `afterId` to place nodes via
  `insertAdjacentElement`, so the DOM/tab-order invariant — TUFTE's single
  most-tested property — holds under structural change, not just static
  render.
- `connectTufteDocument` gains an **opt-in** `autoPatch: true` option. Default
  behavior (emit-only, consumer decides) is unchanged. When enabled, a
  `tufte:projection` event diffs against the last-seen projection and calls
  `applyTufteProjectionPatch` automatically. Off by default: a CLI/static
  consumer never pays for this, and "the interface doesn't act until asked"
  stays the default posture.

**Design rationale.** This diffs the typed vocabulary TUFTE already governs,
nothing more. It is local (per-document, no cross-page graph), reversible (a
patch is a fresh normalize-and-diff, nothing accumulates state that can drift
out of sync with reality), and soft (an unrecognized/missing tile id is just
inserted or removed, never a reasoning failure). This is the Schema.org move,
not the Semantic Web move: extend the existing soft vocabulary's reach, don't
build a general reconciler.

## 2. Fragment-swap helper for the action/refusal loop (LOAD-BEARING)

**Gap closed:** teardown gap 3 (fragment/partial-swap primitive) fused with
the mandate's explicit ask to "design the full loop" for
`tufte:action → receipt/refusal`. Currently `tufte:receipt` hands back a raw
parsed body and stops; every consumer writes its own "put this HTML into tile
X" code, the same duplication pattern the owner already caught once
(`http-sse-server` hand-duplicated by flickering-delve/onestone before
qwzspace shipped it as a real export).

**Customer:** storefront/Today/disclosure-panel migrations — many tiles,
frequent partial updates (a price changes, a stock check refuses, a "Today"
card refreshes). North Shore's `start-ride`/`bookmark` actions are the
existing proof this pattern is real, not hypothetical.

**Design, built on item 1's primitives, three small additions to
`connectTufteDocument`:**

- `applyTufteReceipt(root, body)` — a one-line convenience: if `body` is
  shaped as `{tiles:[...]}` (a partial or full projection), it's normalized
  and diff-patched against the current DOM via item 1's primitives. If
  `body` is shaped as a single tile object, it's treated as an update to the
  one tile whose `id` matches. This makes a `tufte:receipt` handler go from
  N hand-written DOM lines to one call, without introducing a second event
  type or a template registry.
- **Form/action handling, not just button/action handling.** Today,
  `connectTufteDocument` only delegates `click` on `[data-tufte-action]`
  elements, with a single `data-tufte-value`. Extend delegation to also
  listen for `submit` on `<form data-tufte-action="...">`, serializing
  `Object.fromEntries(new FormData(form))` into `detail.value` as a plain
  object — additive, backward-compatible, the button path is untouched. This
  is what actually lets `tufte:action` carry a real form (a booking form, a
  settings form), not just one scalar value.
- **Refusal may optionally carry a tile.** `tufte:refusal`'s detail keeps its
  existing `{message}` shape (backward-compatible) but gains an optional
  `tile` field: if the server's non-ok response body is valid JSON shaped
  like a tile, it is normalized and attached as `detail.tile`, letting a
  refusal render inline ("here's why, shown as a tile") instead of only
  logging a string. Nothing about this requires the server to comply — a
  plain-text or unparseable refusal body still degrades cleanly to
  `{message}` only.

**Design rationale.** `tufte:refusal` is already the teardown's most-Daoist
trait: refusal as dispatched data, not a caught exception. Letting it
optionally carry a tile is a small, backward-compatible extension of an
already-approved pattern, not a new joint. Form handling closes an obvious
capability hole (only single-value buttons work today) without adding any new
vocabulary — a `FormData` object is still just "the value the action
carries."

## 3. Tick-bound tile seam for QwzSpace's renderer (LOAD-BEARING, narrowly scoped)

**Gap closed:** teardown gap 2. The owner's clarification: QwzSpace is a
spatiotemporal engine (fixed-tick, single-writer, interest-filtered — interest
filtering *is* spatial culling), and the same projection path should render a
live room and replay its history. TUFTE has zero source references to tick,
frame, or interpolation. If TUFTE is meant to supply the HUD/disclosure
chrome around a QwzSpace scene, "replay is free because time is
deterministic" needs to extend from the canvas to the surrounding UI, or the
chrome breaks the illusion.

**Customer:** QwzSpace's renderer (owner mandate, not yet a shipped consumer —
this is the one item in the spec built ahead of a live integration, same as
QwzSpace's own SSE transport, which currently has zero real consumers per the
recon).

**Design — the narrowest seam that works, and nothing more:**

- `normalizeTufteModel` gains one optional field, `tick` (a finite number,
  alongside the existing `revision` string) — passed through untouched, just
  like `revision` is today.
- `diffTufteProjection` (item 1), when both `previous.tick` and `next.tick`
  are set, treats `tick` as an ordering/idempotency token: a patch computed
  against a stale tick is a no-op rather than a silent overwrite, which is
  what makes replay-scrubbing (jumping the tick backward, then forward again)
  safe to point at the same `applyTufteProjectionPatch` call a live room
  uses.
- That is the entire seam. **TUFTE does not gain a clock, a scheduler, or
  interpolation math.** The composing app (QwzSpace's renderer, or whatever
  glues QwzSpace's `snapshot`/`delta` protocol messages to a TUFTE
  projection) is responsible for computing `tick` and for any easing/
  interpolation between ticks — that stays the canvas/render-fiber's job, per
  the owner's own note that QwzSpace "may compose existing house render
  fibers rather than reinventing them." TUFTE's only claim is: "given a
  tick-tagged projection, I render or patch it correctly, in order."

**Design rationale.** The scoping is the load-bearing part. This is exactly
the failure mode the Jiangshi note warns against if done wrong: a document
renderer growing its own notion of time, interpolation, or scheduling would
be locking a joint that was never TUFTE's to own — the totalizing move,
solving "sometimes data arrives on a clock" by building clock machinery into
the thing that draws boxes. The approved version reads an opaque ordering tag
a caller already computed, exactly the same shape as the existing `revision`
field. Nothing here is model-then-execute; it's "accept what the situation
(QwzSpace's tick) already determined."

## 4. Composition — narrow fragment export, not nested documents (LOAD-BEARING rejection of the broad framing; FLAVOR narrow version)

**Gap addressed:** teardown gap 4, and the mandate's candidate framing ("tile
documents embedding tile documents — the apps-compose-services shape in the UI
layer"). **The broad framing is rejected; a narrow version is confirmed.**

**Why the broad version is rejected:** literal document-in-document nesting
(iframes, shadow roots, a recursive tile-document schema) would require TUFTE
to either give up its single governed DOM/tab-order invariant across a nesting
boundary, or build a new formal recursion schema to preserve it — exactly the
model-then-execute, totalizing generalization the Jiangshi note diagnoses:
solving "sometimes a tile wants to contain a grid of tiles" by growing a
recursive component schema is the Semantic Web's move (build the ontology,
then require all future data to conform), not Schema.org's (soft, local,
zero new formal commitment). The teardown's own beat thesis already rejected
"a component system or a custom-element registry" as scope creep; the mandate
candidate's broad framing would reopen exactly that.

**What actually closes the real pain — plain function composition:**
North Shore's confidence-badge/big-readout markup lives entirely in its own
render function today, copy-pasted rather than reused, because there is no
export smaller than "the whole document" to reuse. The fix: extract the
existing tile-grid rendering out of `renderTufteDocument` into its own export,
`renderTufteFragment(model, options)`, returning just the
`<div class="tufte-grid">...</div>` markup (no `<html>`/`<head>`/masthead) —
a pure refactor of code that already exists inside `renderTufteDocument`,
not a new primitive. A caller can now literally set one tile's `html` to the
output of a *nested* `renderTufteFragment(...)` call in its own code — nested
grids compose, in order, because it's just string interpolation the caller
controls, the same trust boundary `tile.html` already documents. No new
event, no new attribute, no new schema.

Separately, the teardown's own recommendation for the badge/readout
duplication specifically — named tile-shape helper functions
(`confidenceBadgeTile(...)`, `disclosurePanelTile(...)`) as an optional
second export — ships alongside this as the other half of "composition": pure
functions returning an `html` string for a well-known pattern, still zero
runtime deps, still server-renderable.

**Customer:** North Shore (confidence badge duplication, evidenced today) and
any future consumer wanting "the same kind of tile" without hand-copying
markup.

**Design rationale — approve the narrow version, reject the broad one.** The
Daoist objection named in the note is not to structure per se — ritual
Daoism is elaborately formalized — but to structure that has calcified past
the situation it was built for. A hand-written nested `renderTufteFragment`
call, composed in the *caller's* own code, is structure held lightly: it can
be un-nested by deleting a function call, not by migrating off a schema.
Confirmed as the "apps-compose-services shape in the UI layer" the mandate
asked about — just without TUFTE itself having to know what composition
means.

## 5. Theming tokens compatible with shelf-chrome (FLAVOR, cheap and confirmed)

**Gap closed:** the mandate's fourth candidate, cross-checked against the
actual `shelf-chrome` house artifact
(`play.561.group/chrome/shelf-chrome.css` + its README) rather than assumed.
Shelf-chrome is deliberately small — it owns only the shelf mark, the footer
line, and focus-visible/reduced-motion/type-scale rules — and is explicit that
"every game keeps its own background, panel, ink, and accent tokens." It falls
back through `--accent`, `--ink-dim`/`--text-dim`, `--border`, `--bg`, `--ink`
to a neutral default when a game doesn't define those names.

TUFTE's own `BASE_STYLES` defines an equivalent palette under different names:
`--tufte-accent`, `--tufte-muted`, `--tufte-line`, `--tufte-bg`,
`--tufte-ink`. A shelf-chrome copy vendored into a TUFTE-rendered page today
would silently miss TUFTE's real palette and fall through to shelf-chrome's
neutral default — a real, cheap, mechanical compatibility gap, confirmed by
reading both token sets side by side.

**Customer:** any shelf game (crucible, gambling-trainer, flickering-delve,
onestone, weiqi-web today; any future shelf game) that renders its chrome
through TUFTE rather than hand-authored HTML.

**Design:** add five alias custom properties to `BASE_STYLES`:
`--accent: var(--tufte-accent); --ink: var(--tufte-ink);
--ink-dim: var(--tufte-muted); --border: var(--tufte-line);
--bg: var(--tufte-bg);` — nothing else changes. The mark/footer injection
points shelf-chrome's own README already asks for ("next to the game's own
title," "inside or beside the game's existing footer") are already served by
the existing `options.headHtml`/`model.mastheadHtml`/`model.footerHtml`
seams — no new primitive needed there.

**Design rationale.** This is TUFTE adopting a pattern the house already
committed to independently: vendor a copy, not a live import; every consumer
keeps its own palette; fall back softly rather than force a shared theme
engine. Aliasing five token names costs nothing and adds zero new
commitments — same card back, different felt, now also true when the felt is
TUFTE's.

## Cut List — gaps deliberately not closed

1. **Progressive-disclosure primitive (teardown gap 6) — not closed.** The
   teardown itself flagged this as lower-confidence: no concrete consumer
   demonstrates the pain today, unlike gap 1's North Shore evidence. Building
   an expand/collapse primitive ahead of a real disclosure-panel migration
   would be prescribing a pattern before the situation calls for it — the
   exact model-then-execute move the design-rationale check exists to catch.
   Revisit once a disclosure-panel migration actually starts and shows real
   friction, holding it to the same evidentiary bar gap 1 met.

2. **Devtools, hot reload, IDE snippet pack, package ecosystem (teardown gap
   7) — not chased, on principle.** The mandate is explicit that v-next must
   beat the competition "without becoming a virtual-DOM framework cosplay."
   Chasing framework tooling parity is definitionally the thing the mandate
   forbids becoming, not an oversight to fix later.

3. **Shadow DOM / custom-element registry (parity vs. Lit) — rejected, not
   deferred.** A registered custom element with shadow encapsulation would
   put TUFTE's one governed invariant — DOM/tab order matching authored tile
   order — behind a boundary that's harder to keep honestly testable, for a
   need no actual consumer has expressed. Item 4's narrow fragment-export
   composition covers the real "reuse a tile shape" need without it.

4. **Drag/resize end-user layout editing (parity vs. gridstack) — rejected.**
   TUFTE's tiles are placed by authored semantic data (role/span), not
   end-user free-form coordinates; supporting live drag/resize would require
   TUFTE to own mutable layout state at runtime, contradicting its
   pure-function/no-runtime-store identity. The teardown's own parity table
   already calls this "not the framework's job" for TUFTE's chosen ground.
   No consumer evidence exists for it either.

5. **Chart/visualization primitives (parity vs. Tremor/Grafana) — rejected.**
   `tile.html` already composes with any chart library the caller brings —
   documented, working, bring-your-own-chart. Baking chart types into TUFTE
   would import exactly the kind of domain-specific ontology (a taxonomy of
   chart kinds) the Jiangshi critique warns against building into
   infrastructure that's supposed to stay domain-neutral.

6. **Data-source plugin architecture / alerting (parity vs. Grafana) —
   rejected outright, doesn't reach the "would we build it" bar.** This is
   server/business logic. TUFTE's own README already states domain
   vocabularies stay outside the package; a data-source plugin system would
   be the single largest violation of that boundary available in the entire
   parity table.

7. **SSE transport as a TUFTE-native concept — not built, and correctly so.**
   Not a teardown gap at all: `http-sse-server` is a QwzSpace export, not a
   TUFTE concern, and QwzSpace's own recon already flags it as tested but
   consumer-less today. Naming it here only to be explicit that TUFTE's tick
   seam (item 3) reads whatever the caller hands it and stays agnostic to
   which transport produced it — WS, SSE, or a replay log all look identical
   once they reach `tick`.
