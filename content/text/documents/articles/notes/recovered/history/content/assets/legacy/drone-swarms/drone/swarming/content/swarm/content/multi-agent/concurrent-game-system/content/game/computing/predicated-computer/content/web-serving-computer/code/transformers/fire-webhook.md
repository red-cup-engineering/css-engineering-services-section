---
type: morphism
class: web-operation
realizes: [webhook]
depends-on: [webhook-record, send-message, sign, witness]
see-also: [handle-request]
---

# Fire webhook

The substrate operation that *invokes a [webhook](teaching/explanations/webhook.md)*: constructs and sends an outbound HTTP request to an external service.

## Signature

`fire-webhook(webhook-record-id, triggering-event) → (delivery-witness | failure-witness)`

Inputs:

- **`webhook-record-id`** — reference to the [webhook-record](../objects/webhook-record.md).
- **`triggering-event`** — the substrate event that triggered.

Outputs:

- **`delivery-witness`** — records the request sent and the response received.
- **`failure-witness`** — on delivery failure, records the failure (network error, non-2xx response, etc.).

## Operational semantics

1. Resolve the webhook-record; verify it's active.
2. Per the body-template function, construct the request body from the triggering event.
3. Add headers including auth credentials (decrypted from auth-credentials per [decrypt-region](../../../morphisms/decrypt-region.md)).
4. If signing-key cited, per [sign](../../../morphisms/sign.md), sign the request.
5. Per [send-message](../../../morphisms/send-message.md), transmit to target-url.
6. Wait for response (per [latency-budget](../../teaching/explanations/latency-budget.md)).
7. Per the retry-policy, handle failures.
8. Per [witness](../../../objects/witness.md), record outcome.

## Engineering invariants

- **Witnessed.** Every firing produces a witness regardless of outcome.
- **Retry-respecting.** Per the retry-policy, failed deliveries are retried per substrate-recorded discipline.
- **Auth-protected.** Credentials are encrypted at rest, decrypted only at firing time.

## Position in the platform

Fire-webhook is the substrate's *outbound-notification primitive*. Per [federation-convergence](../../../theorems/federation-convergence.md), webhook firings federate (multiple substrates may fire the same webhook on the same event); recipients deduplicate.
