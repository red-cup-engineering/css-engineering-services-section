---
type: morphism
class: web-operation
realizes:
  - endpoint
  - route
depends-on:
  - endpoint-record
  - middleware-record
  - function-record
  - witness
  - predication-fiber-algebra
  - bilattice-accessibility-relation
  - four-bilattice
see-also:
  - emit-response
  - request-response-determinism
  - routing-as-predication-fibration-base-change
  - middleware-composability
  - status-code-classes-as-four-bilattice-values
  - doctrine-fidelity-via-faithful-interfacer-functor
---

# Handle request

The substrate operation that *processes an incoming HTTP request*: route to endpoint, apply middleware-chain, invoke handler, return response. Per [request-response-determinism](../theorems/request-response-determinism.md) (proved), handle-request is deterministic on `(request, substrate state, endpoint configuration)` *under the theorem's assumptions* — pure or effect-disciplined middleware per [function-purity-replay-fidelity](../../functional-runtime-platform/theorems/function-purity-replay-fidelity.md), and handlers whose declared determinism per [function-record](../../functional-runtime-platform/objects/function-record.md) is `pure`, `effectful` (deterministic given same state and capabilities), or `non-deterministic` with entropy recorded in the witness. Two substrate-instances with the same state and same effect-disciplined configuration, receiving the same request, produce byte-identical responses; non-deterministic handlers replay identically only when the recorded entropy is supplied.

Structurally, handle-request is the *substrate-side composition* of the platform's three core constructions: routing as [predication-fibration base-change](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/predication-fiber-algebra.md) per [routing-as-predication-fibration-base-change](../theorems/routing-as-predication-fibration-base-change.md), middleware as associative pipeline composition per [middleware-composability](../theorems/middleware-composability.md), and response emission as the wire-side `FOUR`-projection per [status-code-classes-as-four-bilattice-values](../theorems/status-code-classes-as-four-bilattice-values.md). Handle-request is not a sequence of imperative steps; it is the substrate's surface for arranging these constructions in dependency order.

## Signature

`handle-request(request) → (response, request-witness)`

Inputs:

- **`request`** — incoming HTTP request: method, URL, headers, body. Structurally a fiber-coordinate $p = (\mathrm{method}, \mathrm{path}, \mathrm{headers}, \mathrm{body})$ over the substrate's [predication fiber algebra](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/predication-fiber-algebra.md).

Outputs:

- **`response`** — outgoing HTTP response: status code, headers, body. The status-class is the substrate's verdict's wire-side `FOUR`-projection per [status-code-classes-as-four-bilattice-values](../theorems/status-code-classes-as-four-bilattice-values.md).
- **`request-witness`** — the [witness](../../../objects/witness.md) chain recording the full exchange (route match, middleware verdicts, handler invocation, response emission) for audit.

## Operational semantics

Each numbered step maps to a fixed math construction:

1. **Route ↔ predication-fibration base-change.** Per [route](teaching/explanations/route.md), match request against the substrate's [endpoint-records](../objects/endpoint-record.md). Per [routing-as-predication-fibration-base-change](../theorems/routing-as-predication-fibration-base-change.md), this is the base-change $f^*$ along the URL-pattern morphism, restricting the substrate's content to the fiber over the matched endpoint. On no match, the base-change yields $\bot$; the substrate emits `404 Not Found` (the wire-side $\bot$-projection in the resource-existence sub-question).
2. **Middleware-chain (request side) ↔ associative pipeline composition.** Per [middleware-composability](../theorems/middleware-composability.md), apply each middleware in declaration order; each may modify the request, refuse it, or short-circuit with a response. Per [middleware](teaching/explanations/middleware.md)'s middleware-canonical theorems, each middleware kind is a fixed math construction (authentication ↔ evidence-vector binding, rate-limit ↔ cost-quantale residuation, CORS ↔ bilattice-graded accessibility). A middleware short-circuit produces a wire-response without invoking the handler — the substrate's verdict is decided at the middleware that short-circuited.
3. **Validate request ↔ shape-conformance.** Per [validate-against-shape](../../../morphisms/validate-against-shape.md), check request body against the endpoint's `request-shape`. Shape-failure refuses with `400 Bad Request` — the wire-side $\mathbf{f}$-projection in the request-validity sub-question.
4. **Invoke handler ↔ function invocation under declared determinism.** Per [invoke-function](../../functional-runtime-platform/morphisms/invoke-function.md), call the endpoint's handler with the request and any extracted parameters. Per [function-record](../../functional-runtime-platform/objects/function-record.md), handlers declare their determinism (`pure`, `effectful`, `non-deterministic`); per [function-purity-replay-fidelity](../../functional-runtime-platform/theorems/function-purity-replay-fidelity.md), pure handlers replay byte-identically.
5. **Middleware-chain (response side) ↔ reverse-order pipeline composition.** Apply each middleware in reverse order; each may modify the response (compression, header injection, error-mapping). Per [middleware-composability](../theorems/middleware-composability.md), associativity holds in both directions.
6. **Emit response ↔ wire-side `FOUR`-projection.** Per [emit-response](emit-response.md), serialize and send. The substrate's verdict on the request projects to the response's status-code class per [status-code-classes-as-four-bilattice-values](../theorems/status-code-classes-as-four-bilattice-values.md).
7. **Witness emission ↔ provenance recording.** Per [witness](../../../objects/witness.md), record the full exchange — route match, per-middleware verdicts, handler outcome, response — so an auditor can replay the exchange and verify each step.

## Engineering invariants

- **Deterministic on substrate state under declared-determinism discipline.** Per [request-response-determinism](../theorems/request-response-determinism.md), the response is a function of `(request, substrate state)` when middleware are pure or effect-disciplined and handlers respect their declared determinism class per [function-record](../../functional-runtime-platform/objects/function-record.md). Federated substrate-instances per [federation-convergence](../../../theorems/federation-convergence.md) produce the same response on the same converged state and the same supplied entropy (for non-deterministic handlers).
- **Witnessed end-to-end.** Every request produces a witness chain covering route match, middleware verdicts, handler invocation, response emission. Per [witness-chain-as-proof-object](../../../theorems/witness-chain-as-proof-object.md), the chain is a substrate-content proof of the response's derivation.
- **Capability-checked.** Per the endpoint's `required-capabilities` and the authorization-middleware per [governance-as-modal-restriction](../../agential-orchestration-platform/theorems/governance-as-modal-restriction.md), requests without the modally-restricted capability are refused with `403 Forbidden`.
- **Shape-validated.** Per [validate-against-shape](../../../morphisms/validate-against-shape.md), malformed requests are rejected before handler invocation; the handler's contract on input shape is the substrate's pre-condition for invocation.
- **Wire-verdict matches substrate-verdict.** Per [doctrine-fidelity-via-faithful-interfacer-functor](../../../theorems/doctrine-fidelity-via-faithful-interfacer-functor.md), the response's status-code class equals the substrate's `FOUR`-valued verdict on the request — no envelope-encoded errors that contradict the wire status.

## Cacheability

Per [request-response-determinism](../theorems/request-response-determinism.md)'s engineering consequences, responses to deterministic handlers are cacheable by canonical-form-hash of `(request, substrate state)` per [cache](../../teaching/explanations/cache.md). The cache-control discipline per [cache-control-as-modal-necessity-along-time-accessibility](../theorems/cache-control-as-modal-necessity-along-time-accessibility.md) is what the handle-request operation surfaces in the response's `Cache-Control` header — the substrate's modal-necessity claim on the response along the time-accessibility relation.

## Position in the platform

Handle-request is the substrate's *primary HTTP-server primitive* — the composition of route, middleware, handler, and emit-response into a single substrate operation. Together with [emit-response](emit-response.md) (the wire-projection terminal) and the platform's three core operations grounded in math (routing as base-change, middleware as composition, negotiation as modal possibility), handle-request closes the request's path from wire-arrival to wire-departure. It is the surface on which all other web-server-platform operations are observed.
