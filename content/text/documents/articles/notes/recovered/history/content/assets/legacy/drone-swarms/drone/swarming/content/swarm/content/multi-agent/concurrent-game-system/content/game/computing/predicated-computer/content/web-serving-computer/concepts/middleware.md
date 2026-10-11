---
type: concept
class: web-protocol
depends-on:
  - endpoint
  - function
  - capability
  - witness
  - bilattice-accessibility-relation
  - evidence-vector
  - cost-quantale-of-fuel
  - modal-possibility-operator
see-also:
  - route
  - middleware-composability
  - cors-as-bilattice-graded-origin-accessibility
  - rate-limiting-as-cost-quantale-residuated-authority-gate
  - bearer-token-as-bound-evidence-vector
  - content-negotiation-as-modal-possibility-projection
  - doctrine-fidelity-compositionality
---

# Middleware

A *substrate-recorded request-pipeline layer* that wraps an [endpoint](endpoint.md)'s handler, performing common tasks (authentication, rate-limiting, logging, content-validation, CORS) before / after the handler runs. Middleware composes via *chain*: request → middleware-1 → middleware-2 → ... → handler → middleware-N (response side) → ... → middleware-1 → response.

Per [middleware-composability](../theorems/middleware-composability.md) (proved), middleware composition is associative — $(m_1 \circ m_2) \circ m_3 = m_1 \circ (m_2 \circ m_3)$ — under the parent's [function-purity-replay-fidelity](../../functional-runtime-platform/theorems/function-purity-replay-fidelity.md) and [doctrine-fidelity-compositionality](../../../theorems/doctrine-fidelity-compositionality.md). For middleware with declared effects (logging, rate-limiting, witness emission), associativity holds in the substrate-content sense: the final substrate state after the composed chain is the same regardless of grouping.

## Middleware are not a heuristic gate-pile

Per the platform's three middleware-canonical theorems, the four most common middleware kinds are *not* arbitrary gate functions: each is a structured composition of a fixed predication-category construction. The substrate's middleware system is therefore *the substrate's surface for orchestrating these constructions in pipeline order*, not a generic "filter chain."

## Common middleware and their math constructions

Each item below maps to a fixed math construction whose theorem grounds it; middleware *is* the substrate-content surface of these constructions arranged in pipeline order:

- **Authentication ↔ evidence-vector binding verification per [bearer-token-as-bound-evidence-vector](../theorems/bearer-token-as-bound-evidence-vector.md).** Verify the request's bearer token; per [authenticate-user](../../interactive-application-platform/morphisms/authenticate-user.md), produce an account-record reference; refuse on $\mathbf{f}$/$\bot$/$\top$ verdict per the four-corner verification table. The middleware's substrate-side verdict is exactly the bearer-token theorem's `FOUR`-valued cell.
- **Authorization ↔ governance-as-modal-restriction.** Verify the authenticated principal has capability for the endpoint; per [governance-as-modal-restriction](../../agential-orchestration-platform/theorems/governance-as-modal-restriction.md), this is a modal-restriction check — the substrate's restriction of the request's capability cell along the principal's authority-row in the governance accessibility-relation.
- **Rate-limiting ↔ cost-quantale residuated-authority gate per [rate-limiting-as-cost-quantale-residuated-authority-gate](../theorems/rate-limiting-as-cost-quantale-residuated-authority-gate.md).** Per [resource-budget](../../teaching/explanations/resource-budget.md), the right residual $b \Rightarrow_\mathcal{V} c$ in the [cost quantale of fuel](../../../objects/cost-quantale-of-fuel.md); refuse with `429` when residual is $\bot_\mathcal{V}$.
- **CORS ↔ bilattice-graded origin-accessibility per [cors-as-bilattice-graded-origin-accessibility](../theorems/cors-as-bilattice-graded-origin-accessibility.md).** Add the wire encoding of $\Box_{R_{\mathrm{cors}}}$ on the requested (method, header, credential) cell to the response; refuse with `403` or omit headers per the four-corner CORS table.
- **Content negotiation ↔ modal possibility per [content-negotiation-as-modal-possibility-projection](../theorems/content-negotiation-as-modal-possibility-projection.md).** Compute $\Diamond_R$ over the endpoint's representation worlds given the client's `Accept-*` headers; serialize in the realized $w^*$.
- **Logging ↔ witness emission per [observability-as-reads](../../../theorems/observability-as-reads.md).** Record request/response details (typically without sensitive headers); each emission is a [witness](../../../objects/witness.md) entry. Reads are unit-cost per [cost-discipline-reads-free](../../../theorems/cost-discipline-reads-free.md), so logging-only middleware do not consume the request's fuel budget.
- **Content validation ↔ shape-conformance per [validate-against-shape](../../../morphisms/validate-against-shape.md).** Validate request body against the endpoint's expected shape; refuse with `400 Bad Request` on shape-failure. The shape itself is substrate content; the validation is canonical-form discipline.
- **Error mapping ↔ wire-side `FOUR`-projection per [status-code-classes-as-four-bilattice-values](../theorems/status-code-classes-as-four-bilattice-values.md).** Convert substrate errors to HTTP error responses with appropriate status codes; the mapping is exactly the substrate verdict's projection to the wire's `FOUR`-corner.
- **Compression ↔ encoding-axis of content-negotiation.** gzip / brotli compression is the encoding coordinate of $W$ in the content-negotiation theorem; the encoding-middleware applies the chosen $w'$'s encoding-component.
- **Tracing ↔ provenance-witness per [trace](../../teaching/explanations/trace.md).** Inject trace IDs and propagate context; the trace is a witness chain extending across the request's federation footprint.

## Middleware as functions

Per [function](../../functional-runtime-platform/concepts/function.md), middleware are functions with a specific signature: take a (request, next-handler) pair and produce a response (possibly invoking next-handler with a modified request). Per [function-purity-replay-fidelity](../../functional-runtime-platform/theorems/function-purity-replay-fidelity.md), pure middleware compose deterministically — same inputs produce same outputs across replays.

For middleware with effects, the effects are declared per the parent's [effect](../../functional-runtime-platform/concepts/effect.md) discipline: rate-limit middleware declares budget-consumption; logging declares witness-emission; auth declares principal-record reads. Per [doctrine-fidelity-compositionality](../../../theorems/doctrine-fidelity-compositionality.md), the chain's substrate-side effects are the composition of declared effects in pipeline order; per [middleware-composability](../theorems/middleware-composability.md), this composition is associative.

Per [self-representation](../../teaching/explanations/self-representation.md), middleware records are substrate content — the pipeline's composition is queryable, the per-middleware effects are declared, and the per-request execution is reproducible. Per [witness](../../../objects/witness.md), middleware effects are auditable.

## What the discipline refuses

- **Effect-undeclared middleware.** A middleware that consumes fuel, emits witnesses, or modifies substrate state without declaring those effects breaks the parent effect-discipline; per [function-purity-replay-fidelity](../../functional-runtime-platform/theorems/function-purity-replay-fidelity.md), undeclared effects compromise replay fidelity. Such middleware are admissible only in test/scaffold contexts, not in conformant pipelines.
- **Order-dependent composition without effect declaration.** Per [middleware-composability](../theorems/middleware-composability.md), associativity holds for pure or effect-disciplined middleware. A pipeline whose final substrate state depends on the *grouping* of middleware composites (not just their final order) contains middleware whose effects are not properly declared; the grouping-dependence is the symptom.
- **Wire-decoupled middleware verdicts.** A middleware that decides a request's verdict ($\mathbf{f}$ refuse) but lets the handler emit `200 OK` anyway (with an envelope-encoded error in the body) is the same wire-doctrine failure called out across the platform's middleware-canonical theorems: the wire-side bilattice corner must equal the substrate's verdict per [doctrine-fidelity-via-faithful-interfacer-functor](../../../theorems/doctrine-fidelity-via-faithful-interfacer-functor.md).

## Position

Middleware is the web-server-platform's pipeline-orchestration surface for the substrate's per-request constructions. The pipeline is not a heuristic chain of filters: it is the substrate's substrate-content arrangement of the platform's canonical math constructions (evidence-vector binding, accessibility-relation modal restriction, cost-quantale residuation, modal possibility, witness emission) in dependency order. Together with [endpoint](endpoint.md) (the unit of routing), [route](route.md) (the routing-fibration base-change surface), and the four middleware-canonical disciplines, middleware completes the platform's account of the request's path from wire to handler and back.
