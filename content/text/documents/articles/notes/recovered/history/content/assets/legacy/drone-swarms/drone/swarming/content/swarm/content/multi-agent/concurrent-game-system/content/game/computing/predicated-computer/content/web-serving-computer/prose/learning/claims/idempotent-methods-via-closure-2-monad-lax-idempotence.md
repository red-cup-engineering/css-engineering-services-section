---
type: theorem
class: engineering-claim
status: proved
depends-on: [endpoint, handle-request, http-method-discipline-via-fibration-generators, closure-2-monad, closure-2-monad-lax-idempotence, settlement-via-closure-2-monad, insertion, retraction, application-sublocale, knowledge-order]
see-also: [routing-as-predication-fibration-base-change, status-code-classes-as-four-bilattice-values, request-response-determinism]
---

# Idempotent HTTP methods inherit idempotency from closure-2-monad lax-idempotence

**Claim.** The HTTP idempotency commitments — `PUT`, `DELETE`, `GET`, `HEAD`, `OPTIONS` produce the same substrate effect under repeated invocation as under a single invocation, modulo the substrate's response-side observation of which invocation produced the change — are corollaries of [closure-2-monad-lax-idempotence](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/theorems/closure-2-monad-lax-idempotence.md), not independent engineering disciplines. The closure 2-monad's Kelly–Lack (K1) condition descends to each of the five idempotent methods through its method-specific [http-method-discipline-via-fibration-generators](http-method-discipline-via-fibration-generators.md) action.

`POST` and `PATCH` are excluded because their generator-action is *not* a closure-2-monad algebra action: `POST` is the left-adjoint $\exists_f^k$ (which freshly enters the fiber at a chosen index) and `PATCH` is partial-value insertion (which depends on the fiber's pre-state).

## Statement

Let $h$ be a handler for an [endpoint](teaching/explanations/endpoint.md) with method $m \in \{\texttt{GET}, \texttt{HEAD}, \texttt{OPTIONS}, \texttt{PUT}, \texttt{DELETE}\}$, route morphism $f : p \to q$, and request $r$. Let $G$ be the substrate state at handler invocation. Let $G' = h(r)(G)$ be the state after one invocation, and $G'' = h(r)(G')$ the state after the immediate second invocation with the same request $r$.

Then $G'' = G'$.

## Proof

The four idempotent classes are handled separately because their generator-action differs.

**Case `GET`, `HEAD`, `OPTIONS` (read-only).** Per [http-method-discipline-via-fibration-generators](http-method-discipline-via-fibration-generators.md), each of these methods produces no in-fiber insertion or retraction; only $f^*$ (or $f_{\mathrm{conv}}^* \circ f^*$) is applied, then the fiber value is read. Per [cost-discipline-reads-free](../../../theorems/cost-discipline-reads-free.md), no successor valuation is produced: $G' = G$. The second invocation produces $G'' = G' = G$. Trivially $G'' = G'$. $\square$

**Case `PUT` (full-value insertion).** Per [http-method-discipline-via-fibration-generators](http-method-discipline-via-fibration-generators.md), `PUT` realizes [insertion](../../../morphisms/insertion.md) of a full fiber-value $v \in A_p$ at the fixed cell $(s, p, o)$ named by the route's bindings. Per [insertion](../../../morphisms/insertion.md), $G' = G[\![s, p, o \mapsto G[\![s, p, o]\!] \vee_k v]\!]$. Apply [insertion](../../../morphisms/insertion.md) again with the same $v$:

$$G'[\![s, p, o]\!] = G[\![s, p, o]\!] \vee_k v$$

so

$$G''[\![s, p, o]\!] = G'[\![s, p, o]\!] \vee_k v = (G[\![s, p, o]\!] \vee_k v) \vee_k v = G[\![s, p, o]\!] \vee_k (v \vee_k v) = G[\![s, p, o]\!] \vee_k v = G'[\![s, p, o]\!]$$

using associativity and idempotence of $\vee_k$ in the bilattice. All other cells are untouched, so $G'' = G'$. $\square$

**Case `DELETE` (sublocale-bounded retraction).** Per [http-method-discipline-via-fibration-generators](http-method-discipline-via-fibration-generators.md) and [retraction](../../../morphisms/retraction.md), `DELETE` modifies the [application sublocale](../../../objects/application-sublocale.md)'s nucleus rather than the underlying store. The nucleus update is a join in the nucleus algebra: the cell's visibility is set to "absent" by joining the absence-witness with the prior visibility. Replaying the join with the same absence-witness is idempotent by the nucleus algebra's join-idempotence (the nucleus algebra inherits its lattice structure from $A_p$'s knowledge-order; per [predication-fiber-algebra](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/predication-fiber-algebra.md), $\vee_k$ is idempotent). $\square$

## Why the proof is not a separate engineering discipline

The three idempotent-write cases (`PUT`, `DELETE`, `GET` interpreted as a settle-then-read) share a single mathematical reason: the substrate's [settlement](../../../theorems/settlement-via-closure-2-monad.md) is closure-2-monad action, the closure 2-monad is lax-idempotent (per [closure-2-monad-lax-idempotence](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/theorems/closure-2-monad-lax-idempotence.md)), and applying a lax-idempotent monad's action twice produces the same algebra element as applying it once.

Concretely, [settlement-via-closure-2-monad](../../../theorems/settlement-via-closure-2-monad.md) identifies the substrate's per-step transition as $\mathrm{Cl}$-application; the [closure-2-monad-lax-idempotence](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/theorems/closure-2-monad-lax-idempotence.md) result establishes $\mu \cdot \eta_{\mathrm{Cl}} = 1_{\mathrm{Cl}}$. The composite "request-handler then substrate-settle" inherits this structure: the second invocation's contribution is absorbed by the multiplication's idempotence on already-closed input.

`PUT`'s direct $\vee_k$-idempotence and the closure 2-monad's lax-idempotence are not two facts; they are the same fact expressed at different granularities. The bilattice's $\vee_k$ idempotence is the closure 2-monad's action on the discrete (no-rules) closure operator, which is the smallest closure-rule-system the substrate admits.

## What HTTP idempotency does *not* mean

Per [witness](../../../objects/witness.md), the second invocation of a `PUT` *is* observable as a distinct event in the substrate's audit trail: two witness entries, two timestamps, two request-hashes. HTTP idempotency is the *substrate-state* claim ($G'' = G'$), not the audit-trail claim. This distinguishes:

- **Substrate-state idempotence.** $G'' = G'$. The cell value is the same after the second invocation. *This* is what the theorem proves.
- **Audit-trail idempotence.** The witness chain after the second invocation is identical to the witness chain after the first. *This is false* and intentionally so — the substrate's audit discipline (per [recovery-via-event-log-replay-determinism](../../../theorems/recovery-via-event-log-replay-determinism.md)) requires every admission to be recorded.
- **Wire-level idempotence.** The HTTP response status code is the same on the second invocation. *This is partially true*: a `PUT` that creates returns `201` on the first invocation and `200` on the second (by HTTP convention), reflecting the audit-trail distinction even though the substrate state is identical. Per [status-code-classes-as-four-bilattice-values](status-code-classes-as-four-bilattice-values.md), both responses lie in the 2xx (truth-told) class, so the *bilattice-corner* of the response is idempotent even though the specific code is not.

## Why `POST` and `PATCH` are excluded

**`POST` is $\exists_f^k$.** Per [predicate-subject-projection-quantifier-adjoints](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/theorems/predicate-subject-projection-quantifier-adjoints.md), $\exists_f^k$ is the *left adjoint* of $f^*$, not a closure-monad algebra action. Left adjoints to $f^*$ in a hyperdoctrine pick out a *fresh* fiber element on each invocation. The closure 2-monad acts on fiber elements *after* they are present; it does not absorb the freshness of the existential introduction. Two `POST`s produce two distinct diagonal cells $(s_1, s_1)$ and $(s_2, s_2)$ with $s_1 \neq s_2$, and no closure-monad reduction collapses them.

**`PATCH` is partial-value insertion.** $G'' = G'$ holds only when the second `PATCH`'s body $u$ satisfies $u \leq_k G'[\![s, p, o]\!]$ — i.e., when $u$ is already absorbed by the post-first-PATCH state. In general (other writers between the two `PATCH`es; a `PATCH` body whose interpretation depends on the pre-state), this fails. `PATCH` is therefore *conditionally* idempotent rather than structurally idempotent.

## Engineering consequence

- **Retry without compensation.** For idempotent methods, network failure or timeout is safely retried by the client without producing duplicate effects. Per [transport](../../teaching/explanations/transport.md), the substrate's at-least-once delivery discipline is sound for these methods. For non-idempotent methods (`POST`, `PATCH`), retry requires either an idempotency-key discipline at the application level or `PUT` against a client-chosen identity.
- **Idempotency-key as forced-`PUT`.** The HTTP `Idempotency-Key:` header convention can be derived from the theorem: an `Idempotency-Key`-bearing `POST` is structurally a `PUT` against the predicate $f_{\mathrm{idempotency-key}} \circ f$, where the idempotency-key serves as the client-chosen subject. The substrate's middleware can rewrite such requests at admission, recovering the closure-2-monad-lax-idempotence guarantee.
- **Cacheability.** Idempotent reads (`GET`, `HEAD`, `OPTIONS`) are unconditionally cacheable per [cache-coherence-via-functorial-projection](../../../theorems/cache-coherence-via-functorial-projection.md): the cached value is $f^*(v)$, the request's effect is $f^*(v)$, and the closure-2-monad-lax-idempotence guarantees these agree on repeat invocation.

## Position

Together with [http-method-discipline-via-fibration-generators](http-method-discipline-via-fibration-generators.md) (which fixes the action-direction) and [status-code-classes-as-four-bilattice-values](status-code-classes-as-four-bilattice-values.md) (which fixes the response-side bilattice corner), this theorem completes the web-server-platform's account of HTTP method discipline: each method's substrate-state-effect, idempotency profile, and response-class are derived from predication-categories machinery rather than asserted as HTTP-specific etiquette.
