---
type: theorem
class: engineering-claim
status: proved
depends-on: [endpoint, handle-request, emit-response, http-method-discipline-via-fibration-generators, status-code-classes-as-four-bilattice-values, cache-coherence-via-functorial-projection, hash-injectivity-under-canonical-form, d-frame-valued-sheaf, bitopological-settling-site, four-bilattice]
see-also: [routing-as-predication-fibration-base-change, idempotent-methods-via-closure-2-monad-lax-idempotence]
---

# Conditional GET is stalk-equality on the d-frame-valued sheaf

**Claim.** HTTP's conditional-GET protocol — the `ETag`/`If-None-Match` and `Last-Modified`/`If-Modified-Since` header pairs, with the `304 Not Modified` response — is not a discretionary caching convention layered on top of HTTP. It is the substrate's *stalk-equality check* on the [d-frame-valued sheaf](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/d-frame-valued-sheaf.md) over the [bitopological-settling-site](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/bitopological-settling-site.md), realized via the substrate's content-addressed hash discipline. The `ETag` is the canonical hash of the stalk; `If-None-Match` is the client's stalk-identity assertion; `304` is the `FOUR`-corner $\bot$ verdict ("nothing here that you don't already have"); `Last-Modified` is the stalk's settling-ordinal projection.

## Statement

For an [endpoint](teaching/explanations/endpoint.md) bound by [routing-as-predication-fibration-base-change](routing-as-predication-fibration-base-change.md) to morphism $f : p \to q$ at scope $U$, with method `GET` (per [http-method-discipline-via-fibration-generators](http-method-discipline-via-fibration-generators.md), action $\alpha_{\texttt{GET}} = f^*$), let:

- $\mathbb{F}_v(q, \tau, U)$ be the d-frame-valued sheaf's stalk at the endpoint's scope, predicate, and current settling stage;
- $H(\mathbb{F}_v(q, \tau, U))$ be the canonical hash of that stalk per [hash-injectivity-under-canonical-form](hash-injectivity-under-canonical-form.md);
- $H_{\mathrm{client}}$ be the client's `If-None-Match` header value (a previously received `ETag`).

Then the substrate's response is determined by the stalk-equality check:

- $H(\mathbb{F}_v(q, \tau, U)) = H_{\mathrm{client}}$ ⟹ response class is $\bot$ (`304 Not Modified`); body is suppressed;
- $H(\mathbb{F}_v(q, \tau, U)) \neq H_{\mathrm{client}}$ ⟹ response class is $\mathbf{t}$ (`200 OK`); body is the projected stalk; new `ETag` is $H(\mathbb{F}_v(q, \tau, U))$.

The same statement with `Last-Modified`/`If-Modified-Since` substitutes the settling-ordinal $\tau$ for the canonical hash: the equality check becomes $\tau \leq \tau_{\mathrm{client}}$.

## Proof

The argument decomposes into four steps.

**Step 1: The endpoint's response body is the stalk projection.** Per [http-method-discipline-via-fibration-generators](http-method-discipline-via-fibration-generators.md), `GET` realizes $f^* : A_q \to A_p$ then reads. Per [routing-as-predication-fibration-base-change](routing-as-predication-fibration-base-change.md), the route's fiber $A_p$ at scope $U$ is the stalk $\mathbb{F}_v(q, \tau, U)$ of the d-frame-valued sheaf. The response body is therefore a serialization of the stalk's $L_+$ component (the truth-positive cells covered at $U$); per [doctrine-fidelity-via-faithful-interfacer-functor](../../../theorems/doctrine-fidelity-via-faithful-interfacer-functor.md), the serialization is doctrine-fidel — the body's bytes determine the stalk modulo canonicalization.

**Step 2: The ETag is the canonical hash of the stalk.** Per [hash-injectivity-under-canonical-form](hash-injectivity-under-canonical-form.md), the canonical hash $H$ is injective on substrate content modulo canonicalization. Setting `ETag := H(\mathbb{F}_v(q, \tau, U))` therefore makes the ETag a *content identifier* for the stalk: two substrate states whose stalks at $(q, \tau, U)$ are equal as d-frame elements produce the same ETag; two substrate states whose stalks differ produce different ETags (modulo collision-resistance). The ETag is exactly the substrate-side fingerprint of the response body's source content.

**Step 3: The conditional check is stalk equality.** A client's `If-None-Match: H_client` request asserts: "I previously received a response with `ETag: H_client`; if the current stalk has the same hash, I already have its content." Per [hash-injectivity-under-canonical-form](hash-injectivity-under-canonical-form.md), $H(\mathbb{F}_v(q, \tau, U)) = H_{\mathrm{client}}$ implies the current stalk is byte-identical (after canonicalization) to the stalk the client previously received. The substrate has *no new content* to send for this request.

**Step 4: The response class is the `FOUR` corner of "nothing new here."** Per [status-code-classes-as-four-bilattice-values](status-code-classes-as-four-bilattice-values.md), the `3xx` class is $\bot \in \mathbf{FOUR}$ — *told nothing*. A `304 Not Modified` is the substrate's verdict "I have no fiber-content to send you that you don't already have"; the client should look at the cached value it received under the matching ETag rather than at the response body. This matches $\bot$'s twist-product cell $\langle 0, 0 \rangle$: no new positive evidence, no new negative evidence, the substrate's contribution to the request's fulfillment is empty *because the client already holds the answer*. The `Location:`-style direction (per the `3xx`-as-$\bot$ assignment) is implicit: "look at your cache." $\square$

## Why `Last-Modified` is the same theorem at coarser resolution

The settling-ordinal $\tau$ is the [bitopological-settling-site](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/bitopological-settling-site.md)'s temporal coordinate. The stalk $\mathbb{F}_v(q, \tau, U)$ depends on $\tau$ functorially: per the d-frame-valued sheaf's construction, for $\tau' \leq \tau$ the inclusion of stalks $\mathbb{F}_v(q, \tau', U) \hookrightarrow \mathbb{F}_v(q, \tau, U)$ is a d-frame morphism (the new stalk extends the old by adding cells settled between $\tau'$ and $\tau$). The `Last-Modified` value is the maximum $\tau$ at which a cell in the stalk was first set; the `If-Modified-Since: \tau_client` check is the assertion "the stalk hasn't grown since $\tau_{\mathrm{client}}$." If the maximum stalk-settling-ordinal $\tau \leq \tau_{\mathrm{client}}$, the client has the content; the response is `304`.

`Last-Modified` is coarser than `ETag` because the settling-ordinal is monotone in time but does not distinguish stalks that happen to coincide as d-frame elements at different $\tau$s (e.g., a transient cell that was set and then sublocale-retracted by [retraction](../../../morphisms/retraction.md), leaving the stalk's d-frame value the same as before). `ETag` distinguishes stalks by content; `Last-Modified` distinguishes them by stage. Both are projections of the same sheaf-stalk to a comparable witness; the protocol uses whichever the substrate can produce.

## Why this composes with cache-coherence

Per [cache-coherence-via-functorial-projection](../../../theorems/cache-coherence-via-functorial-projection.md), a content-addressed cache on a fibration functor is structurally coherent — the cached value at hash key $\kappa(v)$ equals $f^*(v)$ unconditionally. The client's local cache, keyed by ETag, *is* such a content-addressed cache: the ETag is $\kappa$, the cached body is the stalk projection, the functor $f^*$ is the endpoint's `GET` action.

The substrate's `304` therefore is not the substrate "saying" the cache is valid; it is the substrate's *check* that the substrate-side stalk hash agrees with the client's cache key. Per [cache-coherence-via-functorial-projection](../../../theorems/cache-coherence-via-functorial-projection.md), if the keys agree, the values agree by construction — so the substrate need not transmit the body. The `304` is a substrate-side projection that the client's cache is the same content-addressed entry the substrate would freshly compute, justified entirely by the cache-coherence theorem.

## What the theorem rules out

- **ETags that are not content-derived.** A substrate that emits `ETag: <random-uuid-per-request>` or `ETag: <wall-clock-timestamp>` violates the theorem: the ETag is no longer the canonical hash of the stalk, so $H(\mathbb{F}_v) = H_{\mathrm{client}}$ no longer implies stalk equality, and `304` no longer carries the "you already have it" guarantee. Per [hash-injectivity-under-canonical-form](hash-injectivity-under-canonical-form.md), only canonical-form-hash-derived ETags inherit the injectivity needed for the conditional check to be sound.

- **`304` for changed content.** A substrate that returns `304` when the stalk has actually changed silently coerces $\mathbf{t}$ (or $\mathbf{f}$ if the change inverted prior content) to $\bot$, mis-classifying the `FOUR` corner. Per [paraconsistency-as-substrate-discipline](../../../theorems/paraconsistency-as-substrate-discipline.md), this is a substrate-state misrepresentation; per [status-code-classes-as-four-bilattice-values](status-code-classes-as-four-bilattice-values.md), it is a fibration violation surfaceable at [run-conformance-test](../../../morphisms/run-conformance-test.md).

- **Conditional `POST`/`PUT`/`PATCH`/`DELETE` interpreted as conditional GET.** HTTP's `If-Match` (the contrapositive condition) on write methods is a *different* check: it asserts "only proceed if the stalk's current hash matches what I last saw." This is the optimistic-concurrency-control discipline — the substrate refuses the write with `412 Precondition Failed` (a `4xx`/$\mathbf{f}$ verdict: client's view of the stalk is no longer current, the write is attributable falsity at this fiber) when the hashes disagree. The conditional-GET theorem covers only the read direction; the conditional-write direction is the same machinery mirrored to reject rather than skip, with the verdict mapped to $\mathbf{f}$ rather than $\bot$. A substrate that conflates the two — returning `304` on a conditional write or `412` on a conditional read — has the bilattice-corner wrong.

## Engineering consequence

- **Caching is sound by construction.** A client following HTTP conditional-GET correctly never serves stale content: per the proof, ETag equality means stalk equality, which means body equality. The substrate's `304` is an honest substrate-side check, not a client-trust assertion.

- **ETag-stable across federation.** Per [federation-convergence](../../../theorems/federation-convergence.md), federated substrates settling on the same content produce stalks with the same canonical hash. ETags are therefore federation-active: a client cache populated by responses from substrate $A$ continues to satisfy `If-None-Match` against substrate $B$ when both have settled the same stalk. The federation merge does not require ETag re-computation; the hash is the merge-side identity.

- **`304` is structurally cheap.** The substrate's `304` work is: compute the stalk hash (per [hash-discipline](../../teaching/explanations/hash-discipline.md), this is reads-free per [cost-discipline-reads-free](../../../theorems/cost-discipline-reads-free.md)), compare to client's `If-None-Match`, return without serializing the body. Per [cost-discipline-reads-free](../../../theorems/cost-discipline-reads-free.md), the entire conditional-GET cycle advances no settling ordinal.

- **`Vary:` is the indexing of the sheaf-stalk by the request's content-negotiation choice.** The HTTP `Vary:` response header tells the client cache which request headers index distinct stalks. Per [content-negotiation-as-modal-possibility-projection](content-negotiation-as-modal-possibility-projection.md), the negotiated representation is a modal projection of the underlying fiber; per the present theorem, each negotiated projection has its own ETag because each is a distinct stalk on a refinement of the bitopological settling site. `Vary: Accept` declares that the cache should index by the request's `Accept` header — i.e., the cache's key is `(URL, Accept-value)`, not just `URL`, because the d-frame-valued sheaf has been refined along the modal-possibility axis.

## Position

This theorem completes the web-server-platform's account of HTTP caching by grounding the conditional-GET protocol in the substrate's d-frame-valued sheaf and content-addressed hash discipline. With the four predication-categories-grounded theorems now present — [routing-as-predication-fibration-base-change](routing-as-predication-fibration-base-change.md), [http-method-discipline-via-fibration-generators](http-method-discipline-via-fibration-generators.md), [idempotent-methods-via-closure-2-monad-lax-idempotence](idempotent-methods-via-closure-2-monad-lax-idempotence.md), [status-code-classes-as-four-bilattice-values](status-code-classes-as-four-bilattice-values.md), and this one — plus [outbound-subscription-as-cosheaf-push](teaching/explanations/outbound-subscription-as-cosheaf-push.md) on the push side, every cross-cutting structural commitment HTTP makes (routing, methods, idempotency, status, caching, subscriptions) is derived from the same sheaf/cosheaf-on-the-bitopological-settling-site machinery rather than asserted as protocol convention.
