---
type: narrative
status: current
introduces: [endpoint, route, content-negotiation]
discusses: [middleware, rest-resource, webhook]
---

# HTTP as transport with protocol structure

The parent corpus has [transport](../../../teaching/explanations/transport.md): bytes go from one process to another over a wire, and the substrate's [send-message](../../../morphisms/send-message.md) and [receive-message](../../../morphisms/receive-message.md) handle the byte-pump. That is enough to build any messaging discipline you like. It is not enough to be the web.

What HTTP adds on top of bare transport is *protocol structure* that the substrate would otherwise have to invent. Web-server-platform names that structure explicitly so the substrate's commitments under HTTP can be reasoned about.

## What HTTP supplies that transport doesn't

- **Method semantics.** HTTP commits to a small set of verbs (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS) with shared semantics — GET is safe and idempotent, PUT is idempotent, POST is neither, DELETE is idempotent. The substrate can use the methods to type incoming messages: a GET is a [read-discipline](../../../teaching/explanations/read-discipline.md) request, a PUT is an idempotent write request, a POST is a non-idempotent write request whose effect requires explicit dedup discipline at the application level. Bare transport has no analog; every message would need its own type field. The [request-response-determinism](../theorems/request-response-determinism.md) theorem applies to all methods that do not produce side effects beyond substrate cells, so the discipline of typing requests by method is what makes the determinism claim well-formed.
- **URL routing.** A URL is a hierarchical name with structure (scheme, host, path, query, fragment). The path is a route — a name that the server can match against registered patterns to dispatch handlers. The substrate's [endpoint](../teaching/explanations/endpoint.md) and [route](../teaching/explanations/route.md) inherit URL structure as their addressing discipline.
- **Status codes.** HTTP commits to a three-digit code with a class semantic (1xx informational, 2xx success, 3xx redirect, 4xx client error, 5xx server error). The substrate can map closure-rule outcomes onto status codes — a successful settlement is 2xx, a precondition failure is 4xx, an internal contradiction is 5xx. Bare transport has no notion of outcome class.
- **Content negotiation.** HTTP commits to the negotiation discipline: client says what it can accept (Accept, Accept-Language, Accept-Encoding); server picks a representation. The substrate's [content-negotiation](../teaching/explanations/content-negotiation.md) inherits the discipline rather than having to invent a representation-selection mechanism.
- **Header conventions.** Many HTTP headers are conventions for cross-cutting concerns (Cache-Control, ETag, Authorization, Content-Type) with shared semantics across implementations. The substrate inherits these conventions; it doesn't have to specify caching, conditional requests, or authentication transport from scratch.
- **Statelessness as a discipline.** HTTP requires servers to be stateless across requests (state lives in the substrate, not in the server's request-handler memory). The substrate is already stateless-across-requests — its state is in predication cells. The match is exact.

## Specialization, not layer

The relationship is the same one [substrate-is-already-a-graph-database](../../database-platform/narratives/substrate-is-already-a-graph-database.md) describes for the database case. Web-server-platform is not a layer of code wrapped around the substrate's transport. It is a *specialization* of how the substrate uses transport — a commitment to using HTTP-protocol structure as the message format and to interpreting the protocol's semantics in substrate terms.

A layer would mean two truths: HTTP servers maintain their own routing tables, their own middleware chains, their own response state, and the substrate is just an event log they write to. Two systems, two truths, reconciliation work.

A specialization means one truth: routes are substrate cells, middleware are substrate cells, request lifecycle is substrate closure-rule application, response is a substrate-emitted message. The HTTP protocol structure binds the substrate's existing operations to specific HTTP semantics.

The engineering consequence: a web-server-platform realization (e.g., the [Express.js example](../examples/expressjs.md)) maps Express's in-memory routing table and middleware chain to substrate cells with closure rules that synchronize the in-memory state. The HTTP server *runs* in process; its configuration *lives* in the substrate.

## What this leaves open

The narrative does not commit to which HTTP version, which transport encoding (HTTP/1.1 over TCP, HTTP/2 over TCP, HTTP/3 over QUIC), or which auxiliary protocols (WebSocket, SSE) are first-class. Those are open questions for the subtheory; the [subscription-event-stream-webhook-unification question](../learning/questions/subscription-event-stream-webhook-unification.md) is the central unresolved one. This narrative establishes the *frame* — HTTP as transport with protocol structure — within which those questions get answered.
