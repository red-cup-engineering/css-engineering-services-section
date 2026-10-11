---
type: concept
class: web-protocol
depends-on: [endpoint, route]
see-also: [graphql-schema]
---

# REST resource

A *substrate-recorded mapping between a substrate entity (or entity collection) and a set of HTTP endpoints* following REST conventions.

A REST resource declares:

- **Base URL pattern.** `/users/{user-id}` for the user resource.
- **Conventional endpoints**:
  - `GET /users` — list.
  - `POST /users` — create.
  - `GET /users/{user-id}` — read.
  - `PUT /users/{user-id}` — replace.
  - `PATCH /users/{user-id}` — partial update.
  - `DELETE /users/{user-id}` — remove (per [retraction](../../../morphisms/retraction.md)'s discipline — typically a sublocale-bounded retraction).
- **Sub-resources**:
  - `GET /users/{user-id}/documents` — user's documents.
  - `POST /users/{user-id}/documents` — create document for user.
- **Content shape.** Per [shape-record](../../../objects/shape-record.md), the resource's request and response shapes.

Per [self-representation](../../teaching/explanations/self-representation.md), the REST resource declaration is substrate content. The substrate can derive the [endpoint](endpoint.md) records automatically from the resource declaration (saving the engineer from declaring each endpoint manually).

REST conventions:

- **Cacheable.** GET responses are cacheable (per [cache](../../teaching/explanations/cache.md)) by default; the substrate's cache headers signal cacheability.
- **Stateless.** Each request is independent; no server-side session for the request itself (but per [session-record](../../agential-orchestration-platform/objects/session-record.md), the substrate may have a separate session concept).
- **Uniform interface.** All resources expose the same conventional endpoints.

Per [conformance-implies-substrate-properties](../../../theorems/conformance-implies-substrate-properties.md), REST conformance is testable: present requests, verify the resource handlers respect REST conventions.

REST is one possible API style; alternatives include [graphql-schema](graphql-schema.md) (single endpoint with typed queries) and gRPC (binary RPC).
