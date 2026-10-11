---
type: definition
class: substrate-entity
realizes: [middleware]
depends-on: [middleware, function-record]
see-also: [endpoint-record]
---

# Middleware record

A **middleware record** is the substrate-entity formal definition of a [middleware](teaching/explanations/middleware.md): the predication-graph entity declaring a request-pipeline layer.

## Structural fields

- **`id`** — kebab-case identifier (e.g., `auth-middleware`, `rate-limit-middleware`).
- **`description`** — one-line summary.
- **`middleware-kind`** — `auth`, `authorization`, `rate-limit`, `logging`, `cors`, `compression`, `tracing`, `validation`, `error-mapping`, custom.
- **`handler-function`** — reference to the [function-record](../../functional-runtime-platform/objects/function-record.md) implementing the middleware.
- **`config`** — middleware-specific configuration predications.
- **`order-priority`** — integer determining ordering within a chain (lower runs first).
- **`closure-kind`** — `middleware`.

## Invariants

- **Substrate-recorded.** Per [self-representation](../../teaching/explanations/self-representation.md).
- **Handler-resolvable.** The cited function must have appropriate signature for middleware (takes request + next, produces response).

## Position in the platform

Middleware records are the substrate's *request-pipeline registry*. Per [middleware](teaching/explanations/middleware.md), they compose through endpoint chains; their composition is structurally function composition.
