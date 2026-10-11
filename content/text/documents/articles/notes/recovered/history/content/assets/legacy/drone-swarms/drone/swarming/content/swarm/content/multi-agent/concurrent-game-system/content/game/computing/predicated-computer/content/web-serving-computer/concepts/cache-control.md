---
type: concept
class: web-protocol
depends-on:
  - endpoint
  - cache
  - time-and-event-ordinals
  - witness
  - modal-necessity-operator
  - bilattice-accessibility-relation
  - world-set
  - predication-fiber-algebra
  - four-bilattice
see-also:
  - content-negotiation
  - cache-control-as-modal-necessity-along-time-accessibility
  - conditional-get-as-stalk-equality
  - status-code-classes-as-four-bilattice-values
  - doctrine-fidelity-via-faithful-interfacer-functor
---

# Cache control

The *substrate-recorded freshness discipline on a response*: the bundle of HTTP headers (`Cache-Control`, `ETag`, `Last-Modified`, `Vary`, `Age`, `Expires`) by which a substrate commits to how long a response may be reused, by whom, and under what re-validation.

Per [cache-control-as-modal-necessity-along-time-accessibility](../theorems/cache-control-as-modal-necessity-along-time-accessibility.md) (proved), this declaration is not a hint or an optimization signal: it is structurally the [modal necessity operator](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/morphisms/modal-necessity-operator.md) $\Box_{R_{\le N}}$ applied to the response cell along a [time-accessibility relation](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/bilattice-accessibility-relation.md) $R_{\le N}$ over the substrate's [world-set](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/world-set.md). A substrate that violates a `max-age` it issued is doctrine-fidelity-failing per [doctrine-fidelity-via-faithful-interfacer-functor](../../../theorems/doctrine-fidelity-via-faithful-interfacer-functor.md), even when its underlying state is unchanged — the violation is normative on the response projection, not ontological on substrate state.

## Header bundle and their math roles

A cache-control declaration on an [endpoint](endpoint.md) carries five field families, each mapping to a fixed move in the modal calculus:

- **Freshness lifetime ↔ the necessity window's $N$.** `max-age=N`, `s-maxage=N` parameterize the time-accessibility relation $R_{\le N}(w, w') = \mathbf{t}$ iff $0 \le \tau(w') - \tau(w) \le N$. The substrate's `max-age` declaration *is* the substrate-side claim $\Box_{R_{\le N}} u = u$ at the response's settling world. `s-maxage` is the same declaration scoped to the shared-cache audience coordinate of the world-set; the private-cache coordinate may carry a different (or no) necessity claim.
- **Audience ↔ which world-set coordinate carries the necessity.** `public`, `private`, `no-store` choose which audience-axis coordinate the substrate claims necessity on. `no-store` is structurally distinct: the substrate forbids any party from holding $u$ — the necessity claim is *defective*, the substrate cannot itself assert $u$ holds at any future $w'$. Common when the cell is at $\top$ (mid-repair contradiction) or per-request fresh by intent.
- **Re-validation discipline ↔ behavior at window expiry.** `must-revalidate` forbids stale reuse — at $\tau(w') > \tau(w) + N$ the cache must re-fetch. `no-cache` is `max-age=0, must-revalidate` — the substrate makes no necessity claim. `stale-while-revalidate=M` admits *paraconsistent reuse* in the window $(N, N+M]$ per [paraconsistency-as-substrate-discipline](../../../theorems/paraconsistency-as-substrate-discipline.md): the cache may serve $u$ marked $\top$-class (told-this, told-this-is-stale) until revalidation completes.
- **Validators ↔ the equality witness for re-extension.** `ETag: "<canonical-form-hash>"` is strong: per [hash-injectivity-under-canonical-form](../../../theorems/hash-injectivity-under-canonical-form.md) it witnesses byte-equal canonical encoding (the strongest equality on the fiber). `Last-Modified: <substrate-clock-tick>` is weak: substrate-clock equality on the fiber's last-write tick. Both feed `If-None-Match` / `If-Modified-Since` re-validation per [conditional-get-as-stalk-equality](../theorems/conditional-get-as-stalk-equality.md) — a `304 Not Modified` re-extends the necessity window with a fresh `max-age=N'`; a `200` overrides $u$ with $u'$ and a fresh window.
- **Vary axes ↔ the fiber-indexing declaration.** `Vary: Accept, Accept-Language, Authorization` declares that $u$ is at fiber $A_p$ where $p$ depends on the (Accept, Accept-Language, Authorization) coordinates of the request. Two requests differing on a `Vary` axis are at *different fibers* — different $u$s, different $\Box_{R_{\le N}}$ claims, different cache keys. The necessity is per-fiber: along time, *holding the fiber fixed*. Conflating fibers (caching across a declared `Vary` axis) is non-functorial per [routing-as-predication-fibration-base-change](../theorems/routing-as-predication-fibration-base-change.md).

Per [self-representation](../../teaching/explanations/self-representation.md), the cache-control declaration is substrate content: the endpoint-record carries the freshness and audience commitments that responses inherit. Per [witness](../../../objects/witness.md), every issued response's effective cache-control is recorded, so an auditor can verify the substrate honored its declaration.

## Composition with the parent's cache discipline

Cache-control composes with the parent-level [cache](../../teaching/explanations/cache.md) discipline at two levels:

- **Parent [cache-coherence-via-functorial-projection](../../../theorems/cache-coherence-via-functorial-projection.md) governs cache validity in terms of substrate state** — whether the cached value still equals re-computation from current state.
- **Cache-control governs the temporal envelope** — the time-window during which the substrate has committed not to revise the answer regardless of state changes. The two compose: a cache hit within the necessity window is sound *both* by parent functorial projection (state-equality) *and* by cache-control's $\Box_{R_{\le N}}$ (substrate's normative commitment); the substrate's discipline must not violate either.

The asymmetry: necessity is monotone in the truth-order. The substrate may *strengthen* its commitment within the window (return a value with strictly higher truth-component — e.g., resolve a $\bot$-cell to $\mathbf{t}$) per the strong-implication semantics on `FOUR`. It may not *retreat*. This asymmetry is what `stale-while-revalidate` formalizes: the cache may return its stored $u$ even when the substrate's value has risen, accepting a known-stale lower bound for the duration of revalidation.

## Federation-aware cache-control

Per [federation-convergence](../../../theorems/federation-convergence.md), a federated response's $u$ is the $\vee_k$ of peers' values; per [federation-trust-bilattice-graded](../../../theorems/federation-trust-bilattice-graded.md), the necessity along $R_{\le N}$ is the $\wedge_k$-meet of peers' necessity claims. The substrate's effective `max-age` on a federated response is therefore the *minimum* of per-peer `max-age`s, which the substrate must compute and surface in the wire response. A federated substrate that issues `max-age=N` exceeding the minimum of its peers' commitments is asserting a necessity claim no single peer underwrote — a structural over-claim.

The `Age: A` header on a cached response is the substrate's $\tau$-distance witness: $A$ seconds elapsed since $u_w$ was computed. Combined with `max-age=N`, the remaining necessity window is $N - A$ seconds — the arithmetic is the substrate's witness of its position in $R_{\le N}$.

## What the discipline refuses

- **`max-age` returned with response classes that cannot be necessitated.** A `5xx` response (substrate at $\top$ — paraconsistent contradiction per [status-code-classes-as-four-bilattice-values](../theorems/status-code-classes-as-four-bilattice-values.md)) cannot legitimately carry a positive `max-age`: the substrate is in a $\top$-cell, has no settled value to necessitate, and any cache of the response would extend the contradiction. Conformant substrates emit `no-store` (or omit cache-control entirely, defaulting to no-store) on `5xx`.
- **`Vary: *`.** Declaring every request coordinate as a fiber-axis is the substrate's admission that it cannot determine the response's fiber-indexing. Structurally equivalent to refusing to cache; the substrate is more honest emitting `no-store`.
- **Body-envelope tunneled cache-control.** Returning `200 OK, Cache-Control: max-age=3600` with a body envelope `{"cached_at": ..., "max_age": ...}` that application code respects but caches do not is a doctrine violation per [doctrine-fidelity-via-faithful-interfacer-functor](../../../theorems/doctrine-fidelity-via-faithful-interfacer-functor.md): the substrate's cache-control commitment is at the wire layer, not the body layer.
- **Caches reusing responses lacking `Cache-Control`.** A cache that reuses a response without a substrate-side $\Box_{R_{\le N}}$ commitment (relying on heuristic freshness, browser defaults, or proxy guesses) is operating *outside* substrate-issued necessity. Such reuse is admissible only if the cache treats the response as $\bot$-class — a hint, not a substrate commitment. The discipline failure is on the cache's side, not the substrate's.

## Position

Cache-control is the web-server-platform's instantiation of modal necessity along the time-accessibility relation. Together with [content-negotiation](content-negotiation.md) (modal possibility along the representation-accessibility relation per [content-negotiation-as-modal-possibility-projection](../theorems/content-negotiation-as-modal-possibility-projection.md)) and conditional GET (the equality query at the bitopological-settling-site stalk per [conditional-get-as-stalk-equality](../theorems/conditional-get-as-stalk-equality.md)), it completes the modal account of HTTP response shape: necessity in time, possibility in representation, equality at the stalk. The substrate's HTTP response is, in every coordinate, a modal projection on the predication fiber.
