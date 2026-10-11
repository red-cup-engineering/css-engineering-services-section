---
type: concept
class: web-protocol
depends-on: [transport, function, witness]
see-also: [route, middleware]
---

# Endpoint

A *substrate-recorded HTTP endpoint*: a (method, URL-pattern, handler) tuple declaring which HTTP requests the substrate accepts and how they're processed.

An endpoint has the structure:

- **Method** — HTTP verb: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`. The substrate's discipline typically follows REST conventions when applicable.
- **URL pattern** — the path the endpoint handles, possibly with named parameters: `/users/{user-id}/documents/{doc-id}`.
- **Handler** — reference to the [function-record](../../functional-runtime-platform/objects/function-record.md) (per [functional-runtime-platform](../../functional-runtime-platform/_index.md)) that processes matching requests.
- **Middleware-chain** — references to [middleware-records](middleware.md) applied before the handler.
- **Required-capabilities** — references to capabilities the request must carry (typically authentication, authorization).
- **Content-types** — accepted request types (`application/json`, `multipart/form-data`) and produced response types.

Per [self-representation](../../teaching/explanations/self-representation.md), endpoints are substrate content. Per [witness](../../../objects/witness.md), every request handled at an endpoint produces a witness — an auditable record of the HTTP exchange.

Endpoints compose with the substrate's [federation-graph](../../agential-orchestration-platform/objects/federation-graph.md): some endpoints are *internal* (other substrate-instances or trusted clients only), some are *public* (open to internet traffic). The substrate's [trust-boundary](../../teaching/explanations/trust-boundary.md) and [encryption](../../teaching/explanations/encryption.md) discipline applies at the endpoint boundary.

Per [federation-convergence](../../../theorems/federation-convergence.md), endpoint-handler effects are substrate operations (admit predications, query state, dispatch to agents); the substrate's normal merge discipline applies.

REST conventions, when followed:

- `GET /resources/{id}` — read a single resource (per [cost-discipline-reads-free](../../../theorems/cost-discipline-reads-free.md), pure read).
- `GET /resources` — list resources.
- `POST /resources` — create a new resource.
- `PUT /resources/{id}` — replace.
- `PATCH /resources/{id}` — partial update.
- `DELETE /resources/{id}` — retract per [retraction](../../../morphisms/retraction.md)'s discipline.
