---
type: concept
class: web-protocol
depends-on: [transport, send-message, witness, signature]
see-also: [endpoint]
---

# Webhook

An *outbound HTTP request from the substrate to an external service*, triggered by a substrate event. Webhooks are how the substrate notifies external systems of events without those systems having to poll.

A webhook has the structure:

- **Webhook-id** — substrate identifier.
- **Triggering event** — what substrate event fires the webhook (predication match, scope edit, scheduled time, federation message).
- **Target URL** — external HTTP endpoint to call.
- **Method + headers + body template** — how to construct the request from the event's content.
- **Authentication** — credentials for the external service (typically encrypted per [encryption](../../teaching/explanations/encryption.md)).
- **Signature** — per [signature-binds-witness-to-identity](../../../theorems/signature-binds-witness-to-identity.md), the webhook may sign its outbound request so the recipient can verify its origin.
- **Retry policy** — per [transport](../../teaching/explanations/transport.md), what to do on delivery failure (retry-with-backoff, fail-permanent, escalate).

Per [self-representation](../../teaching/explanations/self-representation.md), webhooks are substrate content. Per [witness](../../../objects/witness.md), each webhook firing produces a witness with the request, response, and outcome.

Per [send-message](../../../morphisms/send-message.md), webhooks are a specific shape of outbound message — addressed to an external HTTP endpoint rather than a federated peer.

Per [federation-convergence](../../../theorems/federation-convergence.md), webhooks federate naturally: a substrate-event that fires a webhook at substrate $A$ also fires the same webhook at peer substrate $B$ if both have the webhook configured. Deduplication may be needed at the recipient (the recipient sees the same webhook from multiple substrates); per [hash-injectivity-under-canonical-form](../../../theorems/hash-injectivity-under-canonical-form.md), the recipient can deduplicate by canonical-form-hash of the payload.

Per [observability-as-reads](../../../theorems/observability-as-reads.md), webhook firing patterns are observable as substrate content; auditors can review webhook delivery.
