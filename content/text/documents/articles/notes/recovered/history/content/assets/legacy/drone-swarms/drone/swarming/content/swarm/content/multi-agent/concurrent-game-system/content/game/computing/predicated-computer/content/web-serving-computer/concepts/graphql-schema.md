---
type: concept
class: web-protocol
depends-on: [endpoint, type, function]
see-also: [rest-resource]
---

# GraphQL schema

A *substrate-recorded GraphQL schema*: typed query / mutation / subscription endpoints with a schema definition language declaring available types, fields, and operations.

A GraphQL schema has the structure:

- **Type definitions** — per [type-record](../../functional-runtime-platform/objects/type-record.md), the schema's types (objects, scalars, enums, unions, interfaces).
- **Query type** — root type for read operations.
- **Mutation type** — root type for write operations.
- **Subscription type** — root type for real-time stream operations (per [stream](../../teaching/explanations/stream.md)).
- **Resolvers** — per [function-record](../../functional-runtime-platform/objects/function-record.md), functions that resolve each field from substrate content.

Compared to [rest-resource](rest-resource.md):

- **Single endpoint** — typically `/graphql` for all queries (vs REST's per-resource endpoints).
- **Client-specified projection** — clients request exactly the fields they need (vs REST's "always return the full resource").
- **Typed at schema level** — per [type-soundness](../../functional-runtime-platform/theorems/type-soundness.md), GraphQL queries are type-checked against the schema.
- **Subscriptions** — built-in real-time streams (per [stream](../../teaching/explanations/stream.md) discipline), vs REST + polling or REST + webhooks.

Per [self-representation](../../teaching/explanations/self-representation.md), the schema is substrate content. Per [check-type](../../functional-runtime-platform/morphisms/check-type.md), incoming queries are validated against the schema before execution.

Per [conformance-implies-substrate-properties](../../../theorems/conformance-implies-substrate-properties.md), GraphQL conformance is testable: present queries, verify the resolvers produce results matching the schema's type guarantees.

Per [federation-convergence](../../../theorems/federation-convergence.md), GraphQL Federation (Apollo Federation) allows multiple substrate-instances to expose a unified GraphQL schema with each instance owning a subset of types/fields — a higher-level federation pattern built on the substrate's lower-level federation.
