---
title: "TUFTE Competitive Position — Wave1"
description: "Re-run benchmarks, re-scored author checklist, philosophy-refusals with named alternatives, and a ranked Wave2 gap ledger, for the Wave1 (0.4.0) build against the 0.3.1 baseline — updated with the 0.4.1 fix-and-verify pass that closed both P0s."
date: 2026-08-20
keywords: ["tufte", "frontend", "benchmarks", "competitive-position"]
---


> **Historical Wave1 scorecard.** Its measurements remain evidence for the
> tested 0.4.1 artifact. TUFTE is the house web application framework and
> must meet and beat current rendering frameworks. Treat its ten capability
> “refusals” as unbuilt capability gaps unless an upstream service already
> owns the capability. The current boundary is in the
> [framework charter](../content/text/documents/articles/notes/2026/08/30/2026-08-30-note-on-tufte-framework-charter.md).

Companion to `2026-08-19-note-on-tufte-market-teardown.md` and
`2026-08-19-note-on-tufte-v-next-spec.md`. Those documents scoped TUFTE
against the fleet's needs at 0.3.1. This document re-runs the same
scratchpad benchmark harness and re-scores the same capability ground
against the Wave1 build (0.4.0), and is honest about a real regression the
re-run surfaced.

**Update, same day:** both P0s below (§1, ledger items 1–2) were
root-caused, fixed, test-covered, and published as `0.4.1`. §1's tables now
carry a third `0.4.1 (fixed)` column re-run against a **fresh Verdaccio
install** of the published tarball (not the in-source working copy), and §4
records the fix with evidence and moves both items out of the open ledger.

**Source-note caveat, stated plainly:** the checklist file this task named
(`2026-08-19-note-on-tufte-app-author-checklist.md`) does not exist on disk
in this session either, same as Wave1's own build note found. The checklist
below is reconstructed from the market teardown's parity table (§2), the
v-next spec's five feature items and cut list, and Wave1's six shipped
items — the only capability ground actually documented in-tree.

## 1. Benchmark re-run: before (0.3.1) / after (0.4.0) / fixed (0.4.1)

Harness: `scratchpad/tufte-bench/` (untouched competitor code and scenario
scripts; only the TUFTE dependency was repointed from `^0.3.1` to `^0.4.0`
and reinstalled from the internal registry, then the three `scenarioN/
tufte.mjs` scripts were re-run). Raw before/after JSON:
`scratchpad/tufte-bench/results-before/` and `.../results-after/`.

The `0.4.1 (fixed)` column below is a **separate re-run against a fresh
install**, not the in-place source: `0.4.1` was `npm publish`ed to the same
internal Verdaccio registry (`dist-tags.latest` now `0.4.1`, tarball shasum
`d87baa486f4d6216abbbf51ba003c70933844696`), `tufte-bench/tufte-install`'s
`node_modules` was deleted and reinstalled against `0.4.1` exact
(`package-lock.json` resolves to
`http://127.0.0.1:4873/@red-cup-engineering/web-page-tiling-engine/-/tufte-0.4.1.tgz`),
and the three `scenarioN/tufte.mjs` scripts were re-run unmodified through
that fresh install with `--expose-gc` (matching how the 0.3.1/0.4.0 numbers
were captured). Raw JSON: `scratchpad/tufte-bench/results-0.4.1-fresh/`.

### Scenario 1 — 1,000-tile dashboard, 200 ticks, 10 tiles changed/tick

| Metric | 0.3.1 (before) | 0.4.0 (after) | 0.4.1 (fixed) | Delta, 0.3.1→0.4.1 | Delta, 0.4.0→0.4.1 |
|---|---:|---:|---:|---:|---:|
| updateCost mean | 69.9 ms | 655–817 ms* | **4.82 ms** | 14.5× faster | 169–170× faster |
| updateCost median | 69.4 ms | 632–798 ms | **3.40 ms** | 20.4× faster | 186–235× faster |
| updateCost p95 | 94.8 ms | 867–981 ms | **7.78 ms** | 12.2× faster | 111–126× faster |
| nodesTouchedTotal | 5,009 | 5,009 | 5,009 | unchanged (identical DOM work) | unchanged |
| heapDelta (forced GC) | 3.67 MB | 3.19 MB | 3.15 MB | roughly flat | roughly flat |
| client runtime, unminified | 14,784 B | 31,149 B | 35,062 B | +137% | +13% |
| client runtime, gzip | 4,479 B | 9,307 B | 10,912 B | +144% | +17% |

**0.4.1 does not merely recover the 0.3.1 baseline — it beats it by an
order of magnitude.** The fix (§4) replaces both the 0.3.1 selector query
and the 0.4.0 array scan with a `WeakMap<grid, Map<id, element>>` cache that
resolves warm lookups in O(1) rather than re-querying or re-scanning the DOM
on every call, while keeping 0.4.0's `.tufte-tile` class guard (the genuine
correctness fix 0.4.0 was chasing). The remaining byte growth vs. 0.4.0
(+13–17%) is the cache bookkeeping and the two P0 fixes' code, not new
capability surface.

\* Run twice: once without `--expose-gc` under heavier concurrent machine
load (654.9 ms mean), once with `--expose-gc` on a quiet machine (816.9 ms
mean) — the *after* number moved further from baseline on the quieter run,
which rules out machine contention as the explanation. This is a real,
reproducible regression, not noise.

**Root cause, confirmed by diffing 0.4.0's `src/tufte-browser.mjs` against a
fresh 0.3.1 install:** `findTileById` changed from an engine-native
selector query to a full-array scan:

```js
// 0.3.1
function findTileById(grid, id) {
  return grid.querySelector?.(`#${id}`) ?? grid.querySelector?.(`[id="${id}"]`) ?? null;
}

// 0.4.0
function findTileById(grid, id) {
  const safeId = token(id, null);
  if (!safeId) return null;
  return Array.from(grid?.children ?? []).find(
    (element) => hasClass(element, "tufte-tile") && element.id === safeId
  ) ?? null;
}
```

The rewrite adds a real correctness improvement (a `.tufte-tile` class
guard, so an id collision outside the tile set can't match), but pays for
it with an unconditional `Array.from(...)` allocation plus a linear scan on
**every** call, in a grid of 1,000 children, called for every changed tile
on every tick. `nodesTouchedTotal` is identical between builds — the same
amount of DOM work is being done, just far less efficiently reaching it.
Context: React's own update-cost mean on this same 1,000-tile scenario is
16.2 ms and Svelte's is 11.7 ms (`results/scenario1-{react,svelte}.json`);
0.3.1's 69.9 ms was already several times slower than both while shipping a
~4.5 KB gzip runtime against their 100–184 KB. 0.4.0's 655–817 ms is now
**slower than HTMX's real-network, HTTP-round-trip-per-tick number**
(351.9 ms, `results/scenario1-htmx.json`) — a bar TUFTE's zero-network
local-patch path should always clear regardless of bundle-size tradeoffs.
Fixed in 0.4.1 — see §4 item 1.

Byte growth (+108–111%) is the honest, expected cost of six new shipped
capabilities (§3) — not a bug — but is reported here without rounding it
away.

### Scenario 2 — signup form, validation refusal / receipt round trip, a11y

| Metric | 0.3.1 (before) | 0.4.0 (after) | 0.4.1 (fixed) |
|---|---|---|---|
| refusalLatencyMs | 69.8 ms | **did not complete** | **68.4 ms** |
| successLatencyMs | 16.2 ms | did not complete | **18.8 ms** |
| a11y after refusal (aria-invalid, aria-describedby, focus, status text) | all correct | **never reached** — form state never updates | **all correct** — identical to 0.3.1's shape, field-by-field |

0.4.1's round trip (fresh Verdaccio install, `results-0.4.1-fresh/scenario2-tufte-0.4.1.json`) completes both the refusal and success paths at parity with 0.3.1's timing, with every a11y field (`labelAssociated`, `ariaInvalid`, `describedBy` + `describedByResolves`, `errorText`, `errorAnnounced`, `focusedIdAfterRefusal`, both status texts) matching the 0.3.1 baseline exactly — the action/refusal/navigation fetch loop this scenario exercises is no longer broken under jsdom.

**This is a hard regression, not a slower number.** Re-run twice
(`results-after/scenario2-tufte-0.4.0.err` ×2, on both a loaded and a quiet
machine) and root-caused with a minimal debug harness
(`scratchpad/tufte-debug-sc2/debug.mjs`): the submitted form's
`tufte:action` fires correctly, but the POST to the signup endpoint never
reaches the server (confirmed: zero server-side log lines) and
`tufte:refusal` fires immediately with:

```
{"message":"RequestInit: Expected signal (\"AbortSignal {}\") to be an instance of AbortSignal."}
```

**Root cause:** Wave1 added `AbortController`-based cancellation to
`dispatchTufteAction`'s `fetch` call (and to `connectTufteNavigation`'s
fetch calls), sourcing the controller from
`root.ownerDocument.defaultView.AbortController` — the DOM realm the tile
root lives in. Under jsdom (and any environment where the DOM realm's
`AbortController` isn't the *same* class as the one the active `fetch`
implementation checks with `instanceof`), the resulting `signal` fails
`fetch`'s own type guard and every network call is refused before it is
sent, unconditionally, with no opt-out. `tufte:refusal`'s `{message}`-only
shape (no `tile`) is exactly what a plain, unparseable refusal looks like
today — which is why the harness's existing refusal-handling code produces
a silent, total failure of the whole action loop rather than a visible
crash.

**Why Wave1's own 72/72 test claim didn't catch this:** the package's
hand-rolled `test/fake-dom.mjs` double does not model realm-sensitive
platform constructors — it never shadows `AbortController`, so
`connectTufteDocument` in that test environment always falls through to
`globalThis.AbortController`, which *is* the same realm as the real
`fetch` those tests run against. The failure mode only exists where the DOM
comes from a separate realm than `fetch` — which real browsers never have,
but jsdom (and this bench harness, and plausibly a future SSR-with-DOM-
emulation consumer) does. This one was worse than the performance
regression above, because it was a full capability outage, not a slowdown,
in the load-bearing action/refusal loop. Fixed in 0.4.1 — see §4 item 2.

### Scenario 3 — SSR → attach → first interaction (local-only, no network)

| Metric | 0.3.1 (before) | 0.4.0 (after) | 0.4.1 (fixed) |
|---|---:|---:|---:|
| timeToInteractiveMs | 285.4 ms | 120.2 ms | 150.9 ms |
| firstInteractionLatencyMs | 21.8 ms | 8.6 ms | 12.5 ms |
| client runtime, gzip | 4,479 B | 9,307 B | 10,912 B |

This scenario's single-tile grid never exercises `findTileById`'s O(n)
regression at any meaningful scale (n=1), so the *after* and *fixed*
numbers here are dominated by machine-load variance between runs, not a
real improvement or regression from either change — reported honestly
rather than claimed as a win. As predicted (§4), scenario 3 is unaffected
by either P0 fix. Bundle growth vs. 0.3.1 tracks scenario 1's, for the same
reason.

## 2. Sabotage-and-verify: the keyed-patch guarantee is real and tested

To confirm the "untouched siblings are never rebuilt" guarantee
(`applyTufteProjectionPatch`'s core claim, tested by
`test/tufte-browser.test.mjs`'s `"only the changed tile's body is replaced;
siblings are untouched nodes"`) is load-bearing and not just asserted, it
was broken on purpose in a scratch copy — **the real tree was never
touched**:

- Copied `src/tufte-browser.mjs`, `src/render-tufte-document.mjs`,
  `test/tufte-browser.test.mjs`, `test/fake-dom.mjs` into
  `scratchpad/tufte-sabotage/`.
- In the scratch copy only, the `"update"` patch case was changed to rebuild
  every *other* tile in the grid from scratch (fresh nodes, identical
  content) whenever any single tile updates — the "the whole list
  re-renders" failure mode TUFTE's tile-granularity patch primitive exists
  to prevent.
- `node --test test/tufte-browser.test.mjs` against the sabotaged copy:
  **42 tests, 41 pass, 1 fail** — exactly and only the targeted guarantee
  test, isolated:

```
✖ applyTufteProjectionPatch: only the changed tile's body is replaced; siblings are untouched nodes
  actual: [FakeElement]   (a freshly rebuilt node)
  expected: [FakeElement] (the original node reference)
  ...
ℹ tests 42
ℹ pass 41
ℹ fail 1
```

The scratch copy (sabotaged source + failing-test evidence) is left at
`scratchpad/tufte-sabotage/` and is not part of the published package.

## 3. Checklist, re-scored (provides / pattern / gap / refusal)

Built from the market teardown's parity table + the v-next spec's items and
cut list + Wave1's six shipped items — every row that document set ever
named as a capability question, scored once, with alternatives named for
every refusal per the mandate (no silent absence).

| # | Capability | Score | Notes / alternative |
|---|---|---|---|
| 1 | Tile-granularity diff/patch (`diffTufteProjection`/`applyTufteProjectionPatch`) | **provides** | shipped pre-Wave1 (v-next item 1); performance regressed in 0.4.0, see §1 |
| 2 | Composition via nested `renderTufteFragment` calls + named tile-shape helpers | **pattern** | plain function composition, held by the caller, not a schema |
| 3 | Full component system / custom-element registry (broad composition framing) | **refusal** | alt: row 2. Broad nesting would hide the governed DOM/tab-order invariant behind a recursion boundary — rejected by the v-next spec on this ground explicitly |
| 4 | Server-first / SSR-by-default | **provides** | core identity, unchanged |
| 5 | Zero-build CLI pipe render | **provides** | core identity, unchanged |
| 6 | Fragment/partial-swap primitive (`applyTufteReceipt`) | **provides** | shipped pre-Wave1 (v-next item 2) |
| 7 | Island / partial hydration | **refusal** | alt: nothing hydrates until `connectTufteDocument` is called — there is no default hydration cost to island away from |
| 8 | Shadow DOM / custom-element encapsulation | **refusal** | alt: row 2's narrow fragment export. A registered element would put the one governed invariant behind a harder-to-audit boundary for a need no consumer has evidenced |
| 9 | Semantic reading order as governed invariant | **provides** | headline feature, test-enforced, unchanged |
| 10 | Role / lifecycle / confidence / live as first-class vocabulary | **provides** | extended in Wave1 (`live`, `lifecycle="pending"`) |
| 11 | Refusal as a dispatched UI event, optionally carrying a tile or per-field messages | **provides** | extended in Wave1 (`applyTufteFieldErrors` + `tile.fields`); see §1 for a live regression currently blocking this loop under jsdom |
| 12 | Grid/tile layout driven by semantic data | **provides** | unchanged |
| 13 | Drag/resize end-user layout editing | **refusal** | alt: authored `role`/`span` placement. Live drag/resize would require TUFTE to own mutable runtime layout state, contradicting the pure-function identity |
| 14 | Chart/visualization primitives | **refusal** | alt: `tile.html` bring-your-own-chart, already documented and working |
| 15 | Data-source plugin architecture / alerting | **refusal** | alt: none needed — server/business logic stays entirely outside TUFTE's domain-neutral boundary |
| 16 | TypeScript declarations | **provides** | shipped pre-Wave1 (v-next item 0) |
| 17 | Tick as an ordering/idempotency token | **provides** | narrow, shipped pre-Wave1 (v-next item 3) |
| 18 | Clock / scheduler / interpolation owned by TUFTE | **refusal** | alt: row 17. The caller (QwzSpace's render fiber) owns the clock; TUFTE only reads an opaque tick it did not compute |
| 19 | Transport-specific concept (SSE etc.) in TUFTE | **refusal** | alt: row 17's `tick` is transport-agnostic — WS, SSE, and a replay log all look identical once they reach it |
| 20 | Signals-style implicit reactivity model | **refusal** | alt: row 1 — an explicit, caller-invoked diff on the caller's own schedule, not an implicit dependency graph |
| 21 | Devtools / hot-reload / IDE snippet pack / ecosystem | **refusal** | alt: there is nothing to hot-reload — the CLI pipe already gives zero-latency save-to-visible-output without tooling |
| 22 | Progressive-disclosure (expand/collapse) primitive | **gap** | no consumer evidence yet (teardown gap 6, deliberately deferred); revisit when a disclosure-panel migration starts |
| 23 | Theming tokens compatible with `shelf-chrome` | **provides** | shipped pre-Wave1 (v-next item 5) |
| 24 | Documents-as-routes client navigation (`connectTufteNavigation`) | **provides** | Wave1 item 1 |
| 25 | Field-level error convention (`applyTufteFieldErrors` + `tile.fields`) | **provides** | Wave1 item 2 |
| 26 | Pending/optimistic lifecycle state (`withPendingLifecycle`) | **provides** | Wave1 item 3 |
| 27 | Local-only (no-fetch) projections | **pattern** | Wave1 item 4 — documented usage of existing diff/patch primitives against a closure variable instead of a fetch response; no new code |
| 28 | Live regions + focus management on insert (`tile.live`, `focusOnInsert`) | **provides** | Wave1 item 5 |
| 29 | View Transitions opt-in wrapper | **provides** | Wave1 item 6 |

### Counts

| Score | Count |
|---|---:|
| provides | 16 |
| pattern | 2 |
| gap | 1 |
| refusal | 10 |
| **total** | **29** |

**Caveat on rows 1 and 11, updated:** both are scored `provides` on
documented capability/intent, matching how the rest of this checklist
scores shape, not runtime health. At the time this checklist was first
scored, both had a real, shipped regression undermining them in practice
(0.4.0, §1) — the score was not silently repaired by omission. As of 0.4.1
(§4), both regressions are fixed with bench and test evidence; the score
and the runtime now agree.

## 4. Fixed with evidence (0.4.1)

Both items that were ranked P0 in the original Wave2 ledger are now closed.
Source: `src/tufte-browser.mjs` in the package tree; version bumped
`0.4.0` → `0.4.1` in `package.json`/`package-lock.json`; published to the
internal registry (`npm publish --registry http://127.0.0.1:4873/`,
dist-tags `latest: 0.4.1`, tarball shasum
`d87baa486f4d6216abbbf51ba003c70933844696`, 18 files, 51.0 kB).

1. **[fixed, performance] `findTileById`'s O(n) scan.** Replaced the
   per-call `Array.from(grid.children).find(...)` with a
   `WeakMap<grid, Map<id, element>>` cache: built lazily, self-healing
   (every hit is verified against `parentNode === grid` and the
   `.tufte-tile` class before being trusted, with a rescan on miss or
   staleness), and proactively maintained on tile insert/remove — so the
   0.4.0 correctness fix (the class guard, preventing a heading-id or
   author-HTML-id collision from resolving to the wrong node) is fully
   preserved, not traded away for speed. Bench evidence: §1 scenario 1,
   1,000-tile/200-tick median `updateCostMs` 798 ms (0.4.0) → 3.40 ms
   (0.4.1), against a fresh Verdaccio install of the published tarball —
   169–235× faster than 0.4.0, and 12–20× faster than the original 0.3.1
   baseline it regressed from. Test evidence: `test/tufte-browser.test.mjs`
   adds an operation-count assertion (50 lookups on a 500-tile grid must
   touch ≤150 elements via an instrumented DOM, not ~12,500) plus a
   collision-correctness companion test; both were run red-first against a
   scratch copy with only this fix reverted (8,725 touches vs. the 150
   bound) before being confirmed green against the real fix.

2. **[fixed, correctness] Cross-realm `AbortSignal` mismatch broke the
   action/refusal/navigation fetch loop.** `connectTufteDocument` and
   `connectTufteNavigation` built their `AbortController` from
   `root.ownerDocument.defaultView.AbortController` — the DOM realm — but
   called the bare, always-global `fetch`, so under jsdom (or any
   environment where the DOM realm differs from `fetch`'s realm) every
   request's signal failed `fetch`'s own `instanceof` brand-check and was
   refused before send. Fix: build the controller from `globalThis`
   (matching where the bare `fetch` call actually resolves) at all three
   call sites (source projection, action dispatch, navigation), feature-
   detecting to "no signal, request still sent" if `globalThis.AbortController`
   is absent, rather than aborting outright on a realm mismatch; `win` is
   still used for `history`/`location`/`popstate`, which is genuinely
   window-realm-bound. Bench evidence: §1 scenario 2, refusal round trip
   went from a hard timeout with zero server-side log lines to completing
   both refusal (68.4 ms) and success (18.8 ms) paths with a11y output
   identical to the 0.3.1 baseline, against the same fresh Verdaccio
   install. Test evidence: `test/fake-dom.mjs` now models realm-sensitive
   constructors (`ForeignAbortController`/`ForeignAbortSignal`,
   `foreignRealmWindow()`, `realmCheckedFetch()` — closing the test-coverage
   gap this defect shipped behind); 3 new regression tests in
   `test/tufte-browser.test.mjs` cover all three fetch call sites, each
   confirmed red-first against a scratch copy with only this fix reverted
   (`requestSent === false` in all three) before being confirmed green.

Full suite: 72/72 green before any change (reproducing "green despite the
defects"), **77/77 green after** (`node --test test/*.test.mjs
examples/head-to-head/test/*.test.mjs`). Wave1's
six shipped capabilities (navigation, field errors, pending lifecycle,
aria-live, `focusOnInsert`, view transitions) are untouched and still
passing.

## 5. Wave2 ledger, ranked (remaining)

1. **[P1, evidence-gated] Progressive-disclosure primitive** (checklist row
   22) — still correctly deferred; no consumer evidence yet. Revisit only
   once a disclosure-panel migration starts and shows real friction, held
   to the same evidentiary bar row 1's original patch primitive met before
   it was built.

2. **[P2, packaging] Client runtime more than doubled in Wave1** (14.8 KB →
   31.1 KB unminified, 4.5 KB → 9.3 KB gzip in 0.4.0; 35.1 KB / 10.9 KB
   gzip in 0.4.1, the cache bookkeeping and both P0 fixes' code added on
   top) for six real, additive capabilities plus the 0.4.1 fixes — an
   honest cost, not a defect, but worth a tree-shakeable export split
   (e.g. `connectTufteNavigation` as its own entry point) for a consumer
   that only wants the smaller pre-Wave1 surface.

3. **[P2, test-coverage — closed by the 0.4.1 fix, kept here as a
   standing practice] The package's own `test/fake-dom.mjs` double didn't
   model realm-sensitive platform constructors**, which is exactly how
   both P0s above shipped behind a 72/72-passing test claim. 0.4.1 closed
   the specific gap (§4); the recommendation going forward is to keep at
   least one pre-publish test pass against a real DOM implementation
   (jsdom), even though the fast hand-rolled fake stays the default for
   the rest of the suite, so a *future* realm-sensitive rewrite doesn't
   reopen the same hole.

## 6. Tiling-window-manager arena (added 2026-09-02)

The 2026-08-30 [framework charter](../content/text/documents/articles/notes/2026/08/30/2026-08-30-note-on-tufte-framework-charter.md) makes tiling a named, load-bearing capability of TUFTE, and the current mandate is for TUFTE to be the world's best tiling window manager as well as meeting/beating rendering frameworks. Sections 1–5 above measure TUFTE only against the reactive-rendering-framework arena (React/Svelte/HTMX/etc., via `2026-08-19-note-on-tufte-market-teardown.md`). This section runs the same discipline against the tiling arena, which that teardown never covered.

### 6.1 Arena bound and receiver classification

**Receiver:** a TUFTE application author who wants to give end users a keyboard-driven, persistent, arbitrarily-nested arrangement of live panes within one application surface (`describeTufteTopology`/`reduceTufteTopology` for flat tile membership and reading order; `normalizeTufteWorkspace`/`computeTufteWorkspaceGeometry`/`reduceTufteWorkspace`/`applyTufteWorkspace`/`connectTufteWorkspace` for the nested split-tree workspace — all in `src/tufte-topology.mjs`, read in full for this pass).

**Classification:** i3, sway, Hyprland, bspwm, and xmonad are **same-job reference implementations of tiling semantics, not incumbents a receiver could choose instead of TUFTE** — a WM tiles OS-level windows (processes it does not render); TUFTE tiles already-rendered DOM tiles inside one web application it does render. No receiver picks "run sway" instead of "adopt TUFTE's workspace API" — the substrates differ (process/window vs. DOM/pane). What is genuinely comparable, and what this section measures, is the **tiling model itself**: split algebra, focus/move/swap semantics, resize, workspace-switching, floating exceptions, fullscreen, layout persistence, keyboard-first completeness, IPC/scriptability, multi-viewport handling, and gaps/decoration.

### 6.2 Incumbent portfolio and evidence

All rows below are `documented` evidence (first-party docs/man pages), `assayed` in `public` mode (the account/config surface any user of the software can read), observed 2026-09-02 UTC. Published/updated dates are the source's own, where the source states one; undated content is marked `unknown`.

| Reference implementation | Source | Published/updated | Observed |
|---|---|---|---|
| i3 | [i3 User's Guide](https://i3wm.org/docs/userguide.html) | unknown (page text names features through i3 v4.24) | 2026-09-02 |
| i3 | [Layout saving](https://i3wm.org/docs/layout-saving.html) | i3 ≥ v4.8 | 2026-09-02 |
| sway | [sway(5) man page](https://man.archlinux.org/man/sway.5), Arch package build | 1:1.12-4 (2026-06-23) | 2026-09-02 |
| bspwm | [bspwm(1) man page](https://man.archlinux.org/man/bspwm.1), Arch package build | 0.9.12-1 (2025-10-08) | 2026-09-02 |
| Hyprland | [Dwindle Layout](https://wiki.hypr.land/Configuring/Layouts/Dwindle-Layout/), [IPC](https://wiki.hypr.land/IPC/), [Workspace Rules](https://wiki.hypr.land/Configuring/Basics/Workspace-Rules/) | latest-git wiki, page `article:modified_time` 2026-08-26 | 2026-09-02 |
| xmonad | [xmonad.org Configuration Tutorial](https://xmonad.org/TUTORIAL.html) | unknown (tutorial targets xmonad ≥ 0.17) | 2026-09-02 |

### 6.3 WM-side measured table

| Capability | i3 | sway | Hyprland | bspwm | xmonad |
|---|---|---|---|---|---|
| Split model | Manual tree; every container is `splith`/`splitv` and "there is no limit on how deep your hierarchy of splits can be," plus `stacking`/`tabbed` container modes | Same manual-tree model as i3 (shared config-language lineage): horizontal/vertical splits, `stacking`/`tabbed` | Binary tree per workspace (dwindle): split axis chosen dynamically from the parent node's W/H ratio unless `preserve_split` is set; separate `master`/stack layout is a config-time alternative, not a runtime mix | Full binary tree ("bspwm... represents windows as the leaves of a full binary tree"); split direction via `--presel-dir`, ratio via `--presel-ratio`/`--ratio` | Master-stack ("Tall nmaster delta ratio") is the shipped default; the real model is Haskell layout combinators (`XMonad.Layout.LayoutCombinators`) that compose arbitrary layout algebras, including custom ones written by the user |
| Focus navigation | `focus left\|right\|up\|down`, `focus parent\|child`, `focus next\|prev [sibling]`, `focus floating\|tiling\|mode_toggle`, `focus output ...` | Same command surface as i3 | Directional/cyclic focus dispatchers (`movefocus`, `cyclenext`) | `bspc node -f` with directional, cyclic, and history (`last`/`newest`/`older`/`newer`) selectors | `M-j`/`M-k` cycle focus through the stack order |
| Move/swap | `move <dir>`, `move container to workspace/output/mark`; `swap container with id\|con_id\|mark` exchanges "position and geometry" of two containers (not valid between parent/child) | Same `move`/`swap` commands as i3 ("swaps the position, geometry, and fullscreen status of two containers") | `movewindow`/`swapwindow` dispatchers along the dwindle tree | `bspc node -m/--to-monitor\|--to-desktop` (move), `-s/--swap NODE_SEL` (swap), both take `--follow` | `M-Shift-j/k` swaps a window's stack order; `M-Return` promotes the focused window to master (there is no arbitrary-pane swap primitive — reordering is stack-position only) |
| Resize | `resize grow\|shrink <dir> [px\|ppt]`, `resize set [w] [h]`; mouse border-drag | Same `resize` grammar as i3 | Dwindle ratio adjustment via dispatchers; drag-resize on tiled borders | `bspc node -z/--resize <corner> dx dy`, plus `--rotate`/`--flip`/`--equalize`/`--balance` for tree-wide reflow | `M-h`/`M-l` adjust the master/stack ratio (`delta`); no arbitrary per-pane resize outside the master-stack axis |
| Workspaces | Named/numbered, dynamically created, `workspace <name> output <output>` pins a workspace to an output, `move workspace to output ...` relocates a whole workspace, one workspace created per output at startup | Same workspace model as i3, including `workspace <name> output <outputs...>` | Numbered by default (1–10), nameable; per-monitor default assignment and `persistent` workspace rules (`Workspace Rules`) | Desktops (bspwm's workspace unit) attach to monitors; `bspc desktop --to-monitor` transfers a desktop between monitors | Numbered workspaces (called workspaces, ~conceptually xmonad's "tags"); switch/move-window-to-workspace bindings are user-defined in the Haskell config |
| Floating exceptions | `floating_modifier`, `for_window [criteria] floating enable`, `floating_minimum/maximum_size`, floating always above tiling, `sticky` | Same floating model as i3, default `floating_minimum_size` 75×50 | Floating toggle + `windowrulev2 float, ...` criteria rules | Per-node `state=floating` via `bspc rule --add`/`bspc node --state` | `manageHook` rules, e.g. `className =? "Gimp" --> doFloat` |
| Fullscreen | `fullscreen toggle\|enable\|disable [global]`; `popup_during_fullscreen` controls popup interruption | Same `fullscreen` command, `global` spans all outputs | `fullscreen` dispatcher, fake-fullscreen variant | `bspc node --state fullscreen` (fills the monitor, no border) | `ewmhFullscreen` layout modifier gives EWMH-compliant fullscreen |
| Layout persistence | `i3-save-tree` dumps JSON that is explicitly "**NOT useful**" until hand-edited with swallow criteria; `append_layout` loads it; **placeholder windows only** — real application processes are never restored, only "swallowed" back in if a freshly-launched window matches the criteria | `swaymsg -t get_tree` gives the live tree as JSON for external tooling; no documented equivalent to `append_layout`/window-swallow restore in the fetched pages | No documented save/restore-to-JSON layout primitive in the fetched pages (dwindle splits are ephemeral except where `preserve_split` pins them) | `bspc wm --dump-state` / `--load-state <path>` serialize and reload the **whole WM tree state** natively, closest of the five to a first-class persisted layout | No documented layout-persistence primitive; `M-q` reloads the Haskell config live but does not serialize/replay pane arrangement — xmonad's own process state simply survives a config reload |
| Keyboard-first completeness | Documented design intent: focus "control[led] only by using your keyboard," full default keymap covers focus/move/resize/workspace/layout | Same design lineage and default keymap as i3 | Full `bind`/dispatcher keymap covers focus/move/resize/workspace | No shipped keybindings; 100% of control is via `bspc`, bound by the user's own WM-agnostic key daemon (sxhkd) — "keyboard-first" is total but external to bspwm itself | Full default keymap (`M-<key>` conventions) covers focus/swap/promote/resize/workspace |
| IPC/scripting | Unix-socket IPC (`i3-msg`, documented wire protocol, `get_tree`/subscribe) explicitly "allows third-party programs to get information from i3... and to control i3" | `sway-ipc(7)`, wire-compatible with i3's protocol; `swaymsg` | Two sockets: `.socket.sock` (hyprctl-style requests, JSON via `-j`) and `.socket2.sock` (a live event stream: workspace/window/monitor changes) | `bspc` client/socket protocol plus `bspc subscribe (report\|monitor\|desktop\|node...)` event stream | None at the WM-protocol level — the "scripting interface" *is* the statically-compiled Haskell config; runtime introspection goes through EWMH properties, not a documented IPC socket |
| Multi-viewport (monitor) | Full RandR-aware output model; workspaces bind to outputs, windows/workspaces move between outputs by direction or name | Same output model as i3 | Multi-monitor with per-monitor default workspace and workspace rules | Full monitor model; desktops move between monitors, primary-monitor concept | Xinerama-based multi-screen support, one workspace visible per screen |
| Gaps/decoration | `gaps inner/outer/horizontal/vertical/...`, `smart_gaps`, per-workspace gap overrides, `default_border normal\|none\|pixel`, `hide_edge_borders`, full `client.*` color scheme | Same `gaps`/border grammar as i3, plus `csd` (client-side decoration) support | `general.gaps_in`/`gaps_out` (single value or 4-value table), workspace-rule gap overrides | `window_gap`, `border_width`, `borderless_monocle`/`gapless_monocle`/`borderless_singleton` toggles | Not in xmonad core (deliberately minimalist); gaps/borders are `xmonad-contrib` extensions the user opts into |

### 6.4 MEET ledger — TUFTE workspace against the WM-side table

Present evidence states use the vocabulary the WM-side table above is held to: `absent` (no code), `source-only` (shipped, undocumented-by-test), `tested` (covered by `test/tufte-topology.test.mjs`), `deployed`/`receiver-accepted` (not yet reached by any row below).

| # | Capability | Incumbent baseline | TUFTE present evidence | Smallest acceptance assay | Gap / owning capability |
|---|---|---|---|---|---|
| 1 | Split model | Manual tree (i3/sway) or binary tree (Hyprland/bspwm) universally supported; **tabbed/stacked container mode** is a named alternative in i3/sway/bspwm | `source-only`/`tested` for the split tree itself (`normalizeTufteWorkspace`, `computeTufteWorkspaceGeometry` — tree normalization is `tested`); **`tested`: absent** for tabbed/stacked — no `kind:"tabbed"` node exists in `normalizeNode` | Add a `{kind:"tabbed", children}` node type that renders one visible child at a time with a tab strip, threaded through `computeTufteWorkspaceGeometry` | Gap. Owning capability: `tufte-topology.mjs` split-tree node kinds |
| 2 | Focus navigation | Independent `focus <dir>` that moves the browser's/WM's attention without moving any pane, on all five | `tested` — `connectTufteWorkspace`'s keydown handler now carries the same focus/move modifier split i3/sway/Hyprland ship: Alt+Arrow moves DOM focus to the spatial neighbor (`describeTufteWorkspace`'s edge graph) without touching workspace data or emitting a `tufte:workspace` event; Alt+Shift+Arrow keeps the existing swap. Covered by `test/tufte-topology.test.mjs` | Met (2026-09-02) | Closed. Owning capability: `connectTufteWorkspace` keydown handler |
| 3 | Move/swap | `swap` and `move`, both on all five (xmonad only via stack-position swap, still present) | `tested` — `reduceTufteWorkspace` `swap` and `move` are both implemented and covered by `test/tufte-topology.test.mjs` (`"reduceTufteWorkspace swap exchanges two panes' tiles in place"`, `"...move re-seats a pane against a named edge..."`); reachable in the browser via Alt+Shift+Arrow (swap only — `move` has no bound gesture yet) | Bind a keyboard or drag-and-drop gesture to `move`, mirroring the existing swap binding | Present at the reducer/data layer; UI-gesture coverage for `move` is a gap |
| 4 | Resize | Keyboard step-resize + drag-resize on all five (xmonad: axis-limited to master/stack ratio) | `tested` — keyboard arrow-key resize on a focused splitter (Home/End to extremes) and pointer drag, both covered by `test/tufte-topology.test.mjs` (`"connectTufteWorkspace: arrow keys on a focused splitter resize..."`); pointer-drag path (`onPointerMove`) has no dedicated unit test | Add a jsdom pointer-event test exercising `onPointerDown`/`onPointerMove`/`onPointerUp` | `source-only` for the pointer-drag path specifically; the reducer and keyboard path are `tested` |
| 5 | Workspaces (plural, switchable, per-output) | All five: multiple named/numbered workspaces the user switches between, each optionally pinned to a monitor/output | `tested` for the core plural layer — `normalizeTufteWorkspaces`/`reduceTufteWorkspaces` in `tufte-topology.mjs` add a `tufte.workspaces` value (`{active, workspaces: {name: TufteWorkspace}}`, distinct from the existing single-tree `tufte.workspace`, resolving the naming collision this row originally flagged) with `switch` (create-or-switch, matching i3's `workspace <name>` convention) and `move` (relocate one tile to a named workspace, creating it if absent) operations, pure and DOM-free. Covered by `test/tufte-topology.test.mjs`. Per-viewport default workspace assignment is not built | Met for switch/move (2026-09-02) | Core switch/move-tile-to-workspace closed. Owning capability: `tufte-topology.mjs`'s `normalizeTufteWorkspaces`/`reduceTufteWorkspaces`. Remaining gap: per-viewport default assignment (no consumer evidence yet, same evidence-gated posture as row 11) and no keyboard binding yet (tracked by row 9) |
| 6 | Floating exceptions | All five: a documented floating layer with size/rule exceptions, always paintable above tiles | `absent` — no `floating` concept anywhere in `src/` (confirmed by grep) | Either (a) add a floating pane kind to the split-tree model, or (b) document that TUFTE deliberately routes the "floating" job to native `<dialog>`/popover elements outside the tiling model and is not attempting to own it | Gap, or a named refusal-with-alternative once (b) is decided and documented — currently neither is true; it is a silent absence |
| 7 | Fullscreen | All five: a toggle that temporarily collapses one pane/window to the full output, with clean restore | `absent` — no fullscreen operation in `reduceTufteWorkspace`; the browser's native Fullscreen API can be invoked by a consumer directly on one tile's element, but that bypasses the workspace's reducer/receipt model entirely (no refusal path, no restore-to-prior-arrangement receipt) | Add a `{kind:"fullscreen", id}` operation to `reduceTufteWorkspace` that stores the prior root and a `{kind:"restore"}` counterpart | Gap. Owning capability: `reduceTufteWorkspace` operation set |
| 8 | Layout persistence / session restore | i3/sway: manual JSON export + hand-added swallow criteria, placeholders only, real processes never restored. bspwm: native whole-tree `--dump-state`/`--load-state`. Hyprland/xmonad: no documented save/restore primitive in the fetched pages | `source-only` — `connectTufteWorkspace`'s `storageKey` option automatically persists every accepted `reduceTufteWorkspace` receipt to `localStorage` and restores it on next load; no dedicated persistence unit test exists (`localStorage`/`storageKey` do not appear in `test/tufte-topology.test.mjs`) | Add a jsdom test asserting a receipt round-trips through a fake `localStorage` and reloads to the same normalized workspace | `source-only`; the mechanism is real and already more automatic than i3/sway's (no manual export step, no swallow criteria) — see §6.5 for why this is a candidate BEAT point, not yet a proven one |
| 9 | Keyboard-first completeness | i3/sway/Hyprland/xmonad ship full default keymaps covering focus/move/resize/workspace; bspwm covers it entirely outside the WM via a paired key daemon | `source-only`, partial — resize (keyboard + Home/End), swap (Alt+Shift+Arrow), and now focus navigation (Alt+Arrow, row 2) are keyboard-reachable and `tested`; move (pane-to-edge), fullscreen, and tabbed/floating have no keyboard path because those operations don't exist yet (rows 1, 6, 7); workspace switch/move-to-workspace (row 5) now exist as tested pure reducers but are not yet bound to `connectTufteWorkspace`'s keydown handler | Once rows 1 and 6–7 close, and row 5's reducers gain a default key binding, bind each to a key matching the existing resize/swap/focus pattern | Gap narrows: rows 1, 6, 7 still fully unbuilt; row 5 is data-complete and needs only a keyboard binding, not new reducer work |
| 10 | IPC/scriptability | All five except xmonad expose a documented socket protocol (request + subscribe) for external, cross-process control. xmonad's real "IPC" is its statically-compiled Haskell config plus EWMH | `absent` for cross-process control — `connectTufteWorkspace` emits a DOM `tufte:workspace` `CustomEvent` on every receipt/refusal and exposes `arrange()`/`workspace()`/`topology()` as in-realm JS functions, but nothing external to the page's own JS realm (a separate process, a CLI, another tab) can query or drive it today | Define a `postMessage`-based bridge (browser) or a server-side control channel (SSR host) that proxies to the same `reduceTufteWorkspace` calls the in-page API already uses | Gap. The DOM-event/function-call surface is real and inspectable in-realm (arguably richer than a wire protocol, since it *is* the same JS objects, not a serialized round-trip) but does not yet reach outside the page |
| 11 | Multi-viewport (monitor) analog | All five: full multi-output model, workspace-to-output binding, cross-output move | `absent` — one `connectTufteWorkspace` instance owns one grid; there is no concept of multiple coordinated grids/viewports (browser windows, tabs, or `<iframe>`s) sharing or exchanging panes | Define what "multi-viewport" means for a DOM tiling engine (likely: cross-window `BroadcastChannel`-coordinated workspaces) before building — no consumer evidence yet, matching the framework charter's existing evidence-gated posture on speculative rows | Gap, evidence-gated — do not build ahead of a real multi-window TUFTE consumer |
| 12 | Gaps/decoration | All five: first-class, named config surface (`gaps_in`/`gaps_out`, `window_gap`, `gaps inner/outer`) | `pattern` — `computeTufteWorkspaceGeometry` emits CSS grid tracks in `fr` units; visible gaps/borders are whatever CSS the consumer applies to `.tufte-workspace`/`.tufte-tile`/`.tufte-splitter`, not a configurable option `reduceTufteWorkspace` or `applyTufteWorkspace` exposes | If gap consistency across resize/swap/move becomes a real authoring pain point, promote it from "caller's CSS" to a first-class `geometry.gap` parameter | Not a functional gap today (CSS already achieves it), but it is a naming/API gap against how every reference implementation surfaces the same knob |

### 6.5 BEAT hypothesis

**Candidate structural fact X:** TUFTE's tiling arrangement is a plain, frozen JSON value (`tufte.workspace`) produced and consumed entirely by pure, exported functions — `normalizeTufteWorkspace`, `computeTufteWorkspaceGeometry`, `reduceTufteWorkspace`, `describeTufteWorkspace` — that any host (a Node server doing SSR, a test file, or the browser) can call directly, without a running WM process, a DOM, or any singleton runtime state. Every user gesture (`connectTufteWorkspace`) is required to round-trip through the same `reduceTufteWorkspace` reducer as a receipt-or-refusal, so the exact operation a pointer drag performs is also the exact operation a server-rendered initial layout, a unit test, or a future undo stack would replay.

**Falsification pass against the measured incumbents (§6.3), before claiming it:**

- **i3/sway** come closest with `i3-save-tree`/`swaymsg -t get_tree` emitting JSON, but that JSON is (a) explicitly **not** consumable as-authored — i3's own docs call `i3-save-tree`'s raw output "**NOT useful**" until a human hand-edits in swallow criteria — and (b) a one-way export/import into the WM's internal C tree; there is no documented pure function a third party calls to *compute* a new tree from an old one plus an operation and get back data, receipt-or-refusal, the way `reduceTufteWorkspace` does. The tree is state you dump, not a value you reduce.
- **bspwm**'s `--dump-state`/`--load-state` is the strongest counter-candidate: a native, whole-tree, round-trippable serialization. It still does not falsify X, because it is a private state dump of a running C process — there is no documented, versioned, host-independent function library a caller imports to normalize, geometrize, or reduce that state outside `bspwm` itself. TUFTE's four functions are importable and callable with zero runtime (`node --test` calls them directly, with no browser and no server, per `test/tufte-topology.test.mjs`).
- **Hyprland** and **xmonad** have no documented save/restore-to-JSON primitive at all in the fetched pages (Hyprland's dwindle splits are ephemeral by default; xmonad's arrangement lives only in the running Haskell process's memory and is lost across a process restart, only surviving a config *reload* via `M-q`).
- None of the five expose their layout algebra as a small set of pure, unit-testable, cross-runtime functions independent of the WM's own process — which is the actual claim, not merely "has JSON somewhere."

**Named caveat, stated plainly rather than elided:** the comparison is not fully apples-to-apples, and X's easier availability to TUFTE is partly a substrate fact, not only a design win. A WM's panes are *other processes' windows* it does not render — restoring a layout means relaunching or waiting for those processes and matching them back in (why swallow criteria exist at all). TUFTE's panes are DOM content the same rendering pipeline already produced (server-first, per the framework charter) — there is no analogous "relaunch and hope the criteria match" problem for TUFTE to solve, so its persistence path is structurally simpler by having less to reconstruct, not only by better engineering. The fair claim is: **given a tiling engine whose tiles are content it renders, TUFTE's is a first-class replayable value, and none of the five reference WMs — whose tiles are content they don't render — expose an equivalent pure-function library for their tree state.** That is still a real, falsifiable, receiver-visible advantage (a TUFTE app author gets unit-testable, server-callable layout logic for free; a WM user does not get an equivalent library at all, for a different reason), but it is reported here without the substrate difference smoothed away.

**Status:** retained as a research hypothesis, not yet shipped as a receiver-visible wedge — §6.4 row 8's persistence path is `source-only` (real, but untested), and no consumer has yet exercised replay/SSR/undo against the same workspace value to accept it. The falsification pass found no counterexample among the five measured incumbents, which strengthens X; it does not, by the meet-then-beat discipline's own rule, count as proof from a single architectural read.

### 6.6 Next wedge

The smallest receiver-visible slice that both closes a MEET gap and makes §6.5's hypothesis more testable: **row 7 (fullscreen)** — add `{kind:"fullscreen", id}`/`{kind:"restore"}` to `reduceTufteWorkspace`, bind it to a default key alongside the existing resize/swap gestures, and add a unit test asserting the restore receipt reproduces the pre-fullscreen workspace value exactly (a direct, cheap exercise of "the value is the truth, replay reproduces it," the same property §6.5 claims). This is chosen over row 5 (plural workspaces) because it is a single new operation on the existing single-tree primitive rather than a new layer above it, and over row 2 (focus navigation) because fullscreen has no existing partial implementation to conflict with.

## Sources

Benchmark artifacts: `scratchpad/tufte-bench/results-before/`,
`.../results-after/`, `.../results-0.4.1-fresh/` (fresh-install re-run
against published `0.4.1`), `.../results-fixed/` (in-source re-run used
during the fix-and-verify pass), `scratchpad/tufte-browser-0.3.1-vs-0.4.0.diff`,
`scratchpad/tufte-debug-sc2/debug.mjs`. Sabotage evidence:
`scratchpad/tufte-sabotage/`. Prior art:
`2026-08-19-note-on-tufte-market-teardown.md`,
`2026-08-19-note-on-tufte-v-next-spec.md`. Package versions compared: `0.3.1`
→ `0.4.0` → `0.4.1`, all installed from the internal registry
(`http://127.0.0.1:4873/`).

**Storefront check (2026-08-20):** `sites/play.561.group` (path:
`.../public-services-section/.../public-media-services-section/services/public-games-services-section/services/public-web-games-services-section/sites/play.561.group/`)
depends on and has vendored `@red-cup-engineering/web-page-tiling-engine@0.3.1`
exactly — both `package.json`'s `dependencies` and the installed
`node_modules/@red-cup-engineering/web-page-tiling-engine/package.json`
agree. It was never on `0.4.0` and so never carried either P0 defect; it
was **not** upgraded as part of this pass (the pilot is live and healthy,
and upgrading it is a deliberate step of its own, not a side effect of a
library-side fix). Safe upgrade path when that step is taken: bump the
dependency to `0.4.1` directly (skip `0.4.0`, which never should have gone
out as `latest`), reinstall, run the storefront's own `npm test`/`npm run
check`, and redeploy per the storefront's normal runbook — 0.4.1 is a
drop-in, no-API-change patch release for a caller already on 0.3.1's
surface.

**§6 (tiling-window-manager arena) sources, all fetched 2026-09-02:**
[i3 User's Guide](https://i3wm.org/docs/userguide.html),
[i3 layout saving](https://i3wm.org/docs/layout-saving.html),
[sway(5)](https://man.archlinux.org/man/sway.5) (Arch package 1:1.12-4,
2026-06-23), [bspwm(1)](https://man.archlinux.org/man/bspwm.1) (Arch
package 0.9.12-1, 2025-10-08), [Hyprland: Dwindle
Layout](https://wiki.hypr.land/Configuring/Layouts/Dwindle-Layout/),
[Hyprland: IPC](https://wiki.hypr.land/IPC/), [Hyprland: Workspace
Rules](https://wiki.hypr.land/Configuring/Basics/Workspace-Rules/) (wiki
pages dated 2026-08-26), [xmonad Configuration
Tutorial](https://xmonad.org/TUTORIAL.html). TUFTE-side evidence: direct
read of `src/tufte-topology.mjs` and `test/tufte-topology.test.mjs` at
this pass's original HEAD (`package.json` version `0.6.0`), plus a grep of
`src/` confirming zero occurrences of `float`, `fullscreen`, and
`workspaces` (plural) at that HEAD. Rows 2 and 5 above closed in `0.7.0`
the same day (focus navigation and the plural `tufte.workspaces` layer,
the latter the source of `workspaces`'s now-real occurrence in `src/`);
`float` and `fullscreen` remain zero occurrences.
