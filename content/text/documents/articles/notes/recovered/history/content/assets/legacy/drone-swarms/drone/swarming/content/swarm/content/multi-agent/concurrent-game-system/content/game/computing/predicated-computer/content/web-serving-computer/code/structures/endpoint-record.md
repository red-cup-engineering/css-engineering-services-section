---
type: definition
class: substrate-entity
realizes: [endpoint, route]
depends-on: [endpoint, function-record, capability-record, shape-record]
see-also: [middleware-record, webhook-record]
---

# Endpoint record

A **endpoint record** is the substrate-entity formal definition of an [endpoint](teaching/explanations/endpoint.md): the predication-graph entity declaring an HTTP endpoint's method, URL pattern, handler, and middleware-chain.

## Structural fields

- **`id`** — kebab-case identifier (e.g., `get-users-list`, `post-document-create`).
- **`description`** — one-line summary.
- **`method`** — HTTP verb.
- **`url-pattern`** — the URL path, with named parameters.
- **`handler`** — reference to the [function-record](../../functional-runtime-platform/objects/function-record.md) processing requests.
- **`middleware-chain`** — references to [middleware-records](middleware-record.md) applied before handler.
- **`required-capabilities`** — references to [capability-records](../../functional-runtime-platform/objects/capability-record.md) needed.
- **`request-shape`** — reference to the [shape-record](../../../objects/shape-record.md) for request validation.
- **`response-shape`** — reference to the shape-record for response.
- **`accepted-content-types`** / **`produced-content-types`** — for content-negotiation.
- **`scope`** — reference to the [scope](../../teaching/explanations/scope.md) the endpoint operates within.
- **`closure-kind`** — `endpoint`.

## Invariants

- **Method + URL-pattern uniqueness.** Within a scope, no two endpoints share the same (method, URL-pattern) tuple.
- **Substrate-recorded.** Per [self-representation](../../teaching/explanations/self-representation.md), the endpoint is queryable.
- **Handler-resolvable.** The cited handler must exist as a function-record.

## Position in the platform

Endpoint records are the substrate's *HTTP-endpoint registry*. Per [federation-convergence](../../../theorems/federation-convergence.md), endpoint definitions federate as substrate content; multiple substrate-instances can expose the same endpoints (per [sharding](../../distributed-coordination-platform/concepts/sharding.md), they may handle different request subsets).
