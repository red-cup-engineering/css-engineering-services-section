---
type: concept
class: web-protocol
depends-on: [endpoint]
see-also: [middleware]
---

# Route

The *matching of an incoming HTTP request to an [endpoint](endpoint.md)*. Routing is the substrate's request-dispatch primitive at the HTTP layer.

A route resolution involves:

1. Match the request's method against endpoint methods.
2. Match the request's URL path against endpoint URL patterns (typically using a routing tree — radix trie, regex set, or substrate-content-driven match).
3. Extract path parameters from the matched pattern (e.g., `{user-id}` from `/users/{user-id}` against `/users/123` extracts `user-id=123`).
4. Resolve middleware-chain.
5. Invoke handler with extracted parameters.

Common routing patterns:

- **Exact match.** `/about` matches only `/about`.
- **Parameter match.** `/users/{id}` matches `/users/123`, `/users/abc`, etc.
- **Wildcard match.** `/files/*path` matches `/files/foo/bar/baz`.
- **Method-specific.** `GET /users` is distinct from `POST /users`.
- **Content-type-specific.** Different handlers for `application/json` vs `application/xml`.

Per [self-representation](../../teaching/explanations/self-representation.md), the route table is substrate content. Per [witness](../../../objects/witness.md), each request's routing decision is recorded — auditors can verify which endpoint handled which request.

Per [conformance-implies-substrate-properties](../../../theorems/conformance-implies-substrate-properties.md), routing conformance is testable: present a set of test requests, verify each is routed to the expected endpoint.

Route conflicts (two endpoints that could match the same request) are resolved per the substrate's policy: typically *most specific match wins* (exact > parameter > wildcard).
