---
type: narrative
status: current
introduces: [webhook]
discusses: [fire-webhook, handle-request, request-response-determinism]
see-also: [subscription-event-stream-webhook-unification]
---

# Webhooks, server-sent events, and GraphQL subscriptions are one cosheaf push

The open question [subscription-event-stream-webhook-unification](../learning/questions/subscription-event-stream-webhook-unification.md) asked whether the three "outbound substrate-event-driven message" mechanisms — webhooks, server-sent events, GraphQL subscriptions — are one morphism with three transport adapters, three morphisms with shared triggering, or two morphisms split by connection-state. The question presented the three options without favoring one. The predication-categories machinery decides it: they are *one cosheaf push*. The transport-stance and event-shape differences are realizations of the same categorical move at different choices of cosheaf section.

This narrative does the resolution. It does not introduce new objects yet — those should follow once a captain confirms the resolution direction — but it does fix the structural picture so that the existing [webhook-record](../objects/webhook-record.md) and [fire-webhook](../morphisms/fire-webhook.md) atoms are read as the special case they are.

## The question's structural shape

The handler-side of [request-response-determinism](../theorems/request-response-determinism.md) is the *pull* discipline: the client opens a fiber by sending a request, the substrate's [routing-as-predication-fibration-base-change](../theorems/routing-as-predication-fibration-base-change.md) selects $f^*$, the handler returns the projected fiber value, the connection closes. This is the substrate functioning as a [Q-enriched sheaf](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/quantale-enriched-sheaf.md) on its own scope: the client's request is a covering-family element, the response is the sheaf's value at that element.

But the substrate also has *push* operations: closure rules fire and produce predications that no client requested. A substrate fitted with webhooks/SSE/subscriptions is one whose push operations cross the boundary back out — the substrate notifies external recipients that its state has advanced. The pull side has a categorical name; what is the push side's?

## The push side is the cosheaf

The dual of [Q-enriched sheaf](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/quantale-enriched-sheaf.md) is [Q-enriched cosheaf](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/quantale-enriched-cosheaf.md): a covariant functor $\check{F} : \mathbf{T} \to \mathbf{Q\text{-}Cat}_{\mathrm{cwl}}$ whose values "spread out" along covers via colimits rather than restricting along them via limits. Per [verdier-duality-bitopological-site](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/theorems/verdier-duality-bitopological-site.md), the sheaf and cosheaf on the substrate's [bitopological-settling-site](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/bitopological-settling-site.md) are derived-equivalent — they carry the same categorical content from opposite directions.

The substrate's push operations realize the cosheaf side. When a closure rule fires and produces a new predication at fiber $A_p$, the substrate has the choice of two structural moves:

- **Restrict (sheaf direction).** The new predication is available to be read by any future request that selects a $f^*$ landing on or below $p$. This is what [request-response-determinism](../theorems/request-response-determinism.md) governs.
- **Extend (cosheaf direction).** The new predication is *pushed out* to recipients that have registered interest in $p$ or any $q$ with $p \to q$ in the predicate category. This is the outbound-subscription move.

The cosheaf direction is what webhooks, SSE, and GraphQL subscriptions all do. They are the substrate's *cosheaf push* applied at three different choices of section.

## The three mechanisms as cosheaf-section choices

A cosheaf $\check{F}$ on the substrate's scope assigns to each open $(q, \tau, U)$ a complete weighted lattice $\check{F}(q, \tau, U)$ — the substrate's *outbound-subscription registry* at scope $U$, stage $\tau$, predicate $q$. Each registered subscription is a section of $\check{F}$ over an open neighborhood of the firing event. The three mechanisms differ in *which sections the cosheaf is sampled at* and *which transport realizes the section's value*:

**Webhook.** The section is at a *single point* of the cosheaf — the webhook's [target-url](../teaching/explanations/webhook.md) is one cell, one external address. The cosheaf's covariant extension applied at that single section produces one outbound HTTP POST per firing. The webhook is fire-and-forget because the cosheaf's section is committed at registration; the substrate doesn't keep a connection-state with the recipient. Retry-on-failure is the cosheaf's discipline of *re-attempting the colimit* — replaying the section's value until the recipient acknowledges.

**Server-sent events (SSE).** The section is over a *connected open* — the connection itself is the open over which the cosheaf is sampled. The cosheaf's covariant extension along the connection's lifetime emits successive sections as $\tau$ advances; each event is the cosheaf's value at the current $\tau$ projected through the open response body. The connection's persistence is the substrate-content fact "this section is being sampled at every $\tau$ until the open closes." The framing (`data:` lines, `event:` fields, `id:` for resumption) is the wire-encoding of the cosheaf's section sequence.

**GraphQL subscription.** The section is over a *typed open* — the subscription document declares which fibers (which fields, on which root types) the section is sampled at, and the cosheaf's value is the typed projection of those fibers. The WebSocket transport carries the cosheaf-section sequence with framing that preserves the subscription-document type. The substrate-content fact "client X subscribed to subscription document Y" is the cosheaf's section over the (client, document) open.

In all three cases the cosheaf's value at the fired event is the same — a substrate-event-content predication. What differs is the open over which the cosheaf is sampled and the transport that carries the value. Per [verdier-duality-bitopological-site](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/theorems/verdier-duality-bitopological-site.md), all three are derived-equivalent realizations of the same cosheaf, and the cosheaf is derived-equivalent to the substrate's pull-side sheaf — so push and pull, on the same fiber, are dual presentations of the same content.

## What this fixes

The question's three options resolve as follows:

- **Option 1 (one morphism, three adapters) is the right structural picture but undersells the unity.** The shared morphism is not just an abstract `emit-subscription-event`; it is a *cosheaf push* whose section-shape is configured by the subscription record. Webhook, SSE, and subscription are three section-types of a single cosheaf, not three transport-flavors of an arbitrary outbound message.
- **Option 2 (three morphisms with shared triggering) is wrong about the morphism count but right that operational disciplines differ.** The differences (retry-on-failure for webhook, in-flight-buffer for SSE, subscription-handshake for GraphQL) are not morphism-level differences; they are *section-realization* details — what the cosheaf does when its section's transport stalls. The sheaf/cosheaf framework already has the technical apparatus for these details (section restrictability, sieve-completion, open-neighborhood subdivision); they don't need to live as separate morphisms.
- **Option 3 (two morphisms, persistent vs fire-and-forget) is closest to a pragmatic engineering split.** It corresponds to *whether the cosheaf's section is over a connected open* (persistent: SSE, subscription) *or over a single-point open* (fire-and-forget: webhook). But the categorical machinery sees no reason to split — both are cosheaf sections, just over different open shapes. The two-morphism split is admissible as an engineering convenience without being a structural commitment.

## What changes in the subtheory

This narrative resolves the open question without immediately demanding restructuring. The existing [webhook-record](../objects/webhook-record.md) and [fire-webhook](../morphisms/fire-webhook.md) atoms remain valid as the *single-point cosheaf-section* case. What follows from the resolution, in the order the captain may choose to commission:

1. **Generalize [webhook-record](../objects/webhook-record.md) to `outbound-subscription-record`.** The general object carries a `transport-adapter` field (one of `webhook-post`, `sse-stream`, `graphql-subscription`), an `open-shape` field (single-point vs connected), a `section-spec` field (which fibers the cosheaf is sampled at — for webhooks this is the triggering-event match; for SSE/subscription this is the subscription-document filter), and the existing per-transport details. The existing webhook-record specializes by `transport-adapter = webhook-post` and `open-shape = single-point`.

2. **Generalize [fire-webhook](../morphisms/fire-webhook.md) to `emit-cosheaf-section`.** The general morphism takes (subscription-record-id, triggering-event, current-section-state) and produces (delivered-section, witness, transport-status). The existing fire-webhook specializes by reducing the section-state to the empty/trivial case (no connection state to track).

3. **Add `connection-state-record` for the connected-open cases.** SSE and subscription require the substrate to record the potential connection as substrate content (per [self-representation](../../../teaching/explanations/self-representation.md)) — when the connection opened, what subscription it carries, what events have been sent on it, what the resumption-cursor is. This is the cosheaf's section-state for connected-open sections.

4. **Add a companion to [request-response-determinism](../theorems/request-response-determinism.md) for the cosheaf side: `cosheaf-section-determinism`.** The claim is the dual: for any substrate-event $e$ at fiber $A_p$, the cosheaf section's value at every registered subscription-record matching $p$ is determined by $(e, \text{subscription-spec}, \text{substrate-state})$. This is the push-side analog of pull-side request determinism, and it follows from the same fiber-functoriality used in [request-response-determinism](../theorems/request-response-determinism.md), just applied covariantly.

The first two are the structural changes the question called for. Items 3 and 4 follow from those. None of these changes is required to record the resolution — the open question is closed by the structural fact that all three mechanisms are cosheaf sections, regardless of when the subtheory's atoms catch up to that fact.

## Why the bitopological-settling-site is the right cosheaf base

A reader might ask why this works on the [bitopological-settling-site](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/bitopological-settling-site.md) rather than just the predicate category. The answer is that outbound subscriptions are *temporal*: a section is registered at one $\tau$, fires at later $\tau$s, and the recipient may filter on stage as well as on predicate. The bitopological settling site has $(q, \tau, U)$-triples — predicate, stage, scope — exactly matching the three coordinates a subscription is parameterized over. The site's positive and negative topologies further accommodate the [paraconsistency-as-substrate-discipline](../../../theorems/paraconsistency-as-substrate-discipline.md) commitment: a subscription receiving a $\top$-class event (substrate inconsistency at the fired fiber) is the cosheaf's value-token for "told both," and the recipient can decide independently how to handle that, just as an HTTP client decides how to handle a `5xx` per [status-code-classes-as-four-bilattice-values](../theorems/status-code-classes-as-four-bilattice-values.md).

The pull side (request-response) operates on the sheaf over the same site; the push side (subscription) operates on the cosheaf over the same site. Per [verdier-duality-bitopological-site](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/theorems/verdier-duality-bitopological-site.md), they carry the same content. The web-server-platform's full account of HTTP is *both directions of that duality on the substrate's bitopological settling site*: routing/methods/responses for the sheaf, subscriptions/events for the cosheaf.

## Position

This narrative resolves the standing open question on outbound-subscription unification. It supplies the structural reason — sheaf/cosheaf duality on the bitopological settling site — and identifies the existing webhook atoms as the single-point-open special case. The follow-on engineering changes (generalized record, generalized morphism, connection-state record, cosheaf-determinism theorem) are sequenced but not blocked on each other. With this resolution, the web-server-platform's two faces — pull (sheaf) and push (cosheaf) — sit symmetrically on the same predication-categories machinery as routing, methods, and status-codes.
