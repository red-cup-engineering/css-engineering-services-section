---
type: definition
class: substrate-entity
realizes: [webhook]
depends-on: [webhook, encryption, signature, transport-record]
see-also: [endpoint-record]
---

# Webhook record

A **webhook record** is the substrate-entity formal definition of a [webhook](teaching/explanations/webhook.md): the predication-graph entity declaring an outbound HTTP notification triggered by substrate events.

## Structural fields

- **`id`** — kebab-case identifier.
- **`description`** — one-line summary.
- **`triggering-event`** — substrate-event predicate that fires this webhook.
- **`target-url`** — external HTTP endpoint to call.
- **`method`** — typically `POST`; sometimes `PUT` or `PATCH`.
- **`body-template`** — reference to a [function-record](../../functional-runtime-platform/objects/function-record.md) producing the request body from the triggering event.
- **`headers`** — request headers including `Content-Type`, `Authorization`, custom headers.
- **`auth-credentials`** — encrypted reference to credentials for the external service.
- **`signing-key`** — for signed webhooks, reference to the [identity-record](../../../objects/identity-record.md) used to sign.
- **`retry-policy`** — `none`, `exponential-backoff-N`, `fixed-interval-N`, `escalate-after-N`.
- **`recent-firings`** — derived view of recent webhook deliveries with success/failure status.
- **`closure-kind`** — `webhook`.

## Invariants

- **Substrate-recorded.** Per [self-representation](../../teaching/explanations/self-representation.md).
- **Target-URL-resolvable.** The cited URL must be reachable per the substrate's network policy.
- **Auth-encrypted.** Per [encryption](../../teaching/explanations/encryption.md), credentials are encrypted at rest.

## Position in the platform

Webhook records are the substrate's *outbound-notification registry*. Per [witness](../../../objects/witness.md), webhook firings are auditable; per [federation-convergence](../../../theorems/federation-convergence.md), webhook definitions federate.
