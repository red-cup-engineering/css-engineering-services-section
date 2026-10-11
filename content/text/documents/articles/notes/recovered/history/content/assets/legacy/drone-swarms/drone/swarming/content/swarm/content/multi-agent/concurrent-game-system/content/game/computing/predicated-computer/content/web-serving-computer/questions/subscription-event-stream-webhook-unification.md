---
type: question
status: resolved
resolved-by: [outbound-subscription-as-cosheaf-push]
explores: [webhook, fire-webhook, endpoint, request-response-determinism]
---

# Are GraphQL subscriptions, REST event-streams, and webhooks the same morphism?

> **Resolution (see [outbound-subscription-as-cosheaf-push](teaching/explanations/outbound-subscription-as-cosheaf-push.md)).** All three are realizations of a single *cosheaf push* on the substrate's [bitopological-settling-site](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/bitopological-settling-site.md), differing in the *open-shape* the cosheaf is sampled over (single-point for webhook; connected for SSE and GraphQL subscription) and the transport-adapter that carries each section's value. Of the three options the question posed, **option 1 (one morphism, multiple transport adapters) is structurally correct** — but the unifying morphism is the cosheaf push, not an abstract `emit-subscription-event`, and the recommended engineering follow-on is to generalize [webhook-record](../objects/webhook-record.md) to `outbound-subscription-record` and [fire-webhook](../morphisms/fire-webhook.md) to `emit-cosheaf-section`, with the existing webhook atoms as the `transport-adapter = webhook-post`, `open-shape = single-point` special case. The companion theorem to [request-response-determinism](../theorems/request-response-determinism.md) on the push side — *cosheaf-section-determinism* — follows from the same fiber-functoriality applied covariantly. Per [verdier-duality-bitopological-site](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/theorems/verdier-duality-bitopological-site.md), the substrate's pull (sheaf) and push (cosheaf) sides carry the same content; the web-server-platform's full HTTP account is both directions of that duality.

## Original question

The subtheory currently treats [webhook](teaching/explanations/webhook.md) as a distinct concept with [fire-webhook](../morphisms/fire-webhook.md) as its outbound morphism. But three structurally similar mechanisms exist in current HTTP ecosystem practice for *substrate-event-driven outbound messages*:

- **Webhook.** External service registers a URL; substrate POSTs to it on selected events. One-way, fire-and-forget, retry on failure.
- **Server-Sent Events / REST event-stream.** Client opens a long-lived GET; substrate writes events into the open response body. One-way, persistent connection, ordered delivery.
- **GraphQL subscription.** Client opens a WebSocket and sends a subscription document; substrate sends typed events matching the subscription query. Two-way capable, persistent connection, typed events.

All three are substrate-event-driven outbound messages. The differences are the *transport stance* (push to a registered URL / push down an open response / push down a WebSocket) and the *event-shape* (untyped JSON / typed event with `data:` framing / typed query-shaped result). The substrate-level commitment is the same: when a closure rule fires that matches an outbound subscription, an outbound message is produced.

## Concrete cases that would resolve the question

1. **One morphism with three transport adapters.** [fire-webhook](../morphisms/fire-webhook.md) generalizes to `emit-subscription-event`; the morphism's signature commits to the substrate-event match and the bound subscription record; the transport (HTTP POST / SSE write / WebSocket send) is a per-adapter realization. The witness records the substrate event, the matched subscription, and the transport-attempt result.

2. **Three morphisms with shared substrate triggering.** Each transport has its own morphism because the operational discipline differs (retry-on-failure for webhook; in-flight-buffer for SSE; subscription-handshake for GraphQL). The shared part is the substrate-event-match; the morphisms diverge at the transport.

3. **Two morphisms.** Webhook is one (fire-and-forget, retry, no client connection state); persistent-stream is the other (client connection is substrate state; SSE and GraphQL subscription differ only in framing).

## Why the question matters

The current concepts and morphisms make case 1 ambiguous: [webhook-record](../objects/webhook-record.md) is shaped for the webhook case (registered URL, retry policy), and there are no objects for SSE-stream-state or GraphQL-subscription-state. If case 1 is right, the object should generalize to *outbound-subscription-record* with transport as a field. If case 2 or 3 is right, the subtheory needs additional objects and morphisms for the persistent-connection cases.

The question is decidable by analysis: characterize the substrate-state each mechanism requires, and characterize the discipline by which the substrate produces outbound messages on closure-rule firings. The current state has only one of the three (webhook) treated as a first-class subtheory entity, which silently asserts that the other two are not subtheory-grade — a position the subtheory has not actually defended.

A principled answer would also bear on [request-response-determinism](../theorems/request-response-determinism.md): outbound subscriptions are a counterexample to the request-response shape (no request triggers the outbound message; a substrate event does), so the subtheory's central determinism theorem may need a companion for the substrate-event-driven case.
