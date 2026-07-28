# Wiring: unify the running WireCodec with the graded Projector catalog

**Date:** 2026-06-25 **Status:** landed (2026-06-25) and later moved to the package codec organ. **Touches:** [src/codecs/wire.mts](../../src/codecs/wire.mts), [src/running/serving.mts](../../src/running/serving.mts), [src/running/http.mts](../../src/running/http.mts) **Builds on:** the projector gradings (`Corner`/`Rung`, `readIsDecidable`, `admitsTranscode`, `transcode`, `negotiateRepresentation`) and the `rmnProjector` in [src/writing/](../../src/writing/projector.mts); see [dev/docs/notes/2026-06-25-rmn-in-html-decidable-documents.md](../docs/notes/2026-06-25-rmn-in-html-decidable-documents.md).

---

## Why

The `writing/` layer now carries two semantic gradings on every codec — its content **corner** ⟨addressability, assertivity⟩ (the Belnap bilattice **4**) and its completion **rung** — with the decidability invariant (`readIsDecidable`), the admissible-transcode rule (`admitsTranscode`/`transcode`), and corner-aware negotiation (`negotiateRepresentation`: settle down, never fabricate up).

The `running/` layer does **not** use any of it.
It runs an independent, hand-rolled codec vocabulary that re-implements what the graded `Projector` already provides, and serves representations without the bilattice asymmetry.
Three concrete gaps:

### 1. `WireCodec` is a shadow of `Projector` — derive it, don't duplicate

The former `running/codecs.mts` defined `WireCodec { name, mediaType, decode, encode }` and hand-wrote `stringCodec`, `jsonCodec`, the EAVT wire, etc. Its own header admitted the duplication: *"Each codec is the boundary face of a holography projector."* But `decode`/`encode` re-implemented `Projector.read`/`write`, and the wire carried **no** `corner`/`rung`.

**Change:** derive the wire vocabulary from the `writing` projector catalog.
A `WireCodec` should be a thin view over a `Projector<JsonValue>` — `decode = read`, `encode = write`, `mediaType` from a corner-tagged table, and `corner`/`rung` inherited.
Then the wire inherits the decidability invariant for free (no wire whose read is non-monotone/Turing) instead of by accident.

### 2. The serve path hardcodes representations — use `negotiateRepresentation`

[running/serving.mts](../../src/running/serving.mts) exposes `json()` / `html()` helpers with fixed media types and selects them directly; it never consults the `Accept` header through the corner-aware negotiator.
So a `data`-corner value can be served as an `assertion` form (fabrication up), which the bilattice forbids.

**Change:** route response selection through `negotiateRepresentation(acceptHeader, offered, valueCorner)` so the served representation is the best `Accept` match whose corner does **not exceed** the settled value's.
Serve a value down a corner; never synthesize a richer one.

### 3. Admit `rmnProjector` as a wire — the action body travels

The RMN spec's thesis: *"an action is not an endpoint; an endpoint is one projection of an action; the action itself is a relation model."* With `rmnProjector` (corner `assertion`, rung `scott` — total, decidable) now a real codec, an action's **RMN body can travel as the wire** — inspected, cached, composed, replayed, type-checked — rather than hiding behind the endpoint.

**Change:** add `application/rmn+json` to the wire vocabulary (via change #1, it comes along once `rmnProjector` is in the derived catalog) and let `--input-format rmn` / `Accept: application/rmn+json` select it.
A served action may then emit its own total morphism; a request may carry one.
This is the wiring payoff of the closure-hierarchy work: the four transports (CLI / HTTP / OpenAPI / MCP / web) become projections of one RMN-bodied action.

## How (sketch)

1. In the wire codec module, replace the bespoke `WireCodec` constants with a `wireOf(projector: Projector<JsonValue>): WireCodec` adapter and a registry built from the `writing` catalog (`stringProjector`, `jsonProjector`, `eavtProjector`, `rmnProjector`, …).
  Keep `--input-format`/`--output-format` name selection.
2. Add a media-type → corner step in serving so `negotiateRepresentation` can run; map each offered representation through `mediaTypeCorner`.
3. Thread the settled value's corner into the serve path (the action knows its output carrier's corner) and negotiate against it.
4. Tests: a `data` value cannot be served as turtle/rmn; an `assertion` value can; an RMN-bodied action round-trips through the `application/rmn+json` wire.

## Why not yet (resolved)

These three files (`running/codecs.mts`, `serving.mts`, `http.mts`) were the most peer-contested in the package and were mid-migration (the typing→writing move) when this was written.
The `running/` refactor has since quiesced, so the scoped pass landed cleanly — all three changes, capability-preserving.

## Landed (2026-06-25)

All three changes shipped; nothing was deleted or weakened, the count rose:

1. **WireCodec derived from the projector catalog.** `src/codecs/wire.mts` now builds every wire through `wireOf(projector, overrides?)
  `: a `WireCodec` is a thin view over a `Projector<JsonValue>` — `decode`/`encode` default to the projector's `read`/`write`, `corner`/`rung` are inherited (`cornerOf`/`rungOf`), and the decidability invariant is enforced HERE (`wireOf` throws if `!readIsDecidable`, so a Turing/non-monotone read can never become a wire).
  The registry is built from the `writing` catalog (`stringProjector`, `jsonProjector`, `eavtProjector`, `rmnProjector`) plus a locally-`define`d `formProjector` (the urlencoded form is a boundary-form concern with no writing-catalog peer).
  The `WireCodec` interface gained `readonly corner: Corner` and `readonly rung: Rung`.
  Per-wire byte forms are preserved exactly via `overrides` (string canonicalizes a non-string, json keeps its trailing newline, eavt normalizes rows).
  `--input-format`/`--output-format` name selection is unchanged.
  New: `wireByMediaType(mediaType)` (the media-type→wire inverse).

2. **Serve path negotiates via `negotiateRepresentation`.** `running/serving.mts` threads the `Accept` header into `ServedRequest.accept` (populated by all four `serve*` node bindings) and routes output selection through `negotiateOutputWire(endpoint, explicitOutName, accept)`: an explicit `output-format` wins by name; otherwise `negotiateRepresentation(accept, offered, valueCorner(endpoint))` picks the best `Accept` match whose corner does not exceed the settled value's.
  A `data` value is therefore never served as turtle/rmn (`assertion`) — fabrication up is forbidden — while an `assertion` value may be settled down to json when asked.

3. **`rmnProjector` admitted as a wire.** `application/rmn+json` is now in the wire vocabulary (`rmnCodec`, exported); `--input-format rmn` / `Accept: application/rmn+json` select it, so an action's total RMN morphism can travel as the wire and round-trips (`encode ∘ decode` is the identity on a closed term).

Tests added in `test/acting.test.mjs` (two new `describe` blocks, +7 cases): wire grading/decidability, the rmn wire admission + round-trip, `wireOf`'s undecidable-rung rejection, the data-value-can't-fabricate-up negotiation, the assertion-value-settles-down negotiation, the rmn-bodied HTTP round-trip, and explicit-format-wins-by-name.
Verified: `npm run check` (0 errors), `npm test` (216/216, up from 209), `npm run build` (exit 0).
