---
type: theorem
class: engineering-claim
status: proved
depends-on: [route, endpoint, endpoint-record, handle-request, predication-fibration, predicate-specialization, predicate-subject-projection, predication-fiber-algebra]
see-also: [content-negotiation-as-modal-possibility-projection, request-response-determinism]
---

# HTTP routing is base-change in the predication fibration

**Claim.** An HTTP [route](teaching/explanations/route.md) — the matching of (method, URL pattern) to an [endpoint](teaching/explanations/endpoint.md) — implements **base-change along a [predicate-category](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/predicate-category.md) morphism** $f : p \to q$ in the substrate's [predication fibration](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/predication-fibration.md). The URL pattern's variable bindings (path parameters, query parameters) name a [predicate-specialization](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/morphisms/predicate-specialization.md) $f_{\mathrm{spec}}$ that picks out the predication scope the endpoint operates on; the request body is the input fiber-algebra value the endpoint reduces. Routing is therefore not a heuristic dispatch but a *declarative selection of a fibration substitution*: distinct routes correspond to distinct base-change functors $f^*$ on the same fiber algebra.

## Why this holds

The web server's external interface offers a finite set of routes $\{(m_i, U_i, e_i)\}_{i \in I}$ (method, URL pattern, endpoint). When a request $(m, u, b)$ arrives, the server selects the unique $i$ such that $(m, u)$ matches $(m_i, U_i)$ and dispatches to $e_i$. Per the substrate's [self-representation](../../teaching/explanations/self-representation.md), each route is itself a substrate-content predication.

Per [predication-fibration](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/predication-fibration.md), every endpoint $e_i$ operates on a predication scope $A_{p_i}$ — the fiber-algebra value at the predicate $p_i$ that names the resource the endpoint touches (e.g., `users/{id}` operates at the predicate $p = \texttt{user-with-id}$). The URL pattern $U_i$'s variable bindings define the [predicate-specialization](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/morphisms/predicate-specialization.md) $f_i : p_i \to q$ from $p_i$ to a parent predicate $q$ in the predicate category.

Routing is then the operation:

1. Match $(m, u)$ to $(m_i, U_i)$ — pick the route $i$.
2. Extract bindings from $u$ matching $U_i$'s variables — concretize $f_i$.
3. Apply $f_i^* : A_q \to A_{p_i}$ — restrict the substrate to the route's scope.
4. Hand off to $e_i$ with the restricted fiber as input.

Per the fibration's (A3), each $f_i^*$ is a bilattice-residuated homomorphism — it preserves the algebraic structure on the fiber. Per (A2), $f_i^*$ is determined by the generator class of $f_i$ (specialization in this case; for nested routes with multiple bindings, a composite of generators including [predicate-subject-projection](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/morphisms/predicate-subject-projection.md) and converse).

## Engineering consequence

- **Routes are statically auditable as fibration data.** A web server's route table is a finite presentation of the predicate-category morphisms it serves. Audit of the route table reduces to checking that each $f_i$ is a valid composite of predicate-category generators — a decidable structural check.
- **Route conflicts correspond to non-functorial overlap.** Two routes that match the same $(m, u)$ correspond to two parallel morphisms $f_i, f_j : p_i, p_j \to q$ that agree on their domain image. Per the fibration's coherence, this overlap is admissible only if $f_i^* = f_j^*$ (the same base-change). Otherwise the route table is non-functorial, and the web server's behavior on the conflicting request is undefined.
- **Nested routes are composite morphisms.** A route like `users/{u}/posts/{p}` is the composite $f = f_{u} \circ f_{p}$ in the predicate category; per the fibration, $f^* = f_p^* \circ f_u^*$. Route nesting and substitution composition agree.
- **REST-resource discipline is generator discipline.** REST's CRUD verbs map to a small set of fibration moves: GET as $f^*$ (reindex-and-read), POST as $\exists_f$ (the left adjoint, *introduce a new predication* under $f$), PUT as $f^*$ followed by an in-fiber [admission](../../../morphisms/admit.md), DELETE as the [retraction](../../../morphisms/retraction.md) under $f^*$. The discipline holds because the fibration's structure is what REST's verbs were already approximating.
- **Middleware lifts to natural transformations between $f^*$s.** Per [middleware-composability](middleware-composability.md), a middleware is a natural transformation $\eta : f^* \Rightarrow g^* \circ f^*$ that wraps the route's base-change with auxiliary structure (auth, logging, rate-limiting). Composition of middlewares is composition of natural transformations.

## What the theorem rules out

- **Routes that aren't predicate-category morphisms.** A "route" defined by an opaque function (e.g., regex with arbitrary backreference logic that doesn't correspond to a predicate-specialization) cannot be lifted into the fibration. The substrate refuses; per [self-representation](../../teaching/explanations/self-representation.md), routes must be substrate-content predications.
- **Per-request dynamic route mutation.** A route table that mutates per-request (a route that exists for some clients but not others) is not a fibration's static base — it's a non-functorial dispatch. Per the fibration's coherence, such dispatch belongs in middleware or content negotiation, not in routing.
- **Routes that bypass the fiber's algebraic structure.** A route whose handler ignores $f_i^*$'s output (handles bytes directly) is not in the predicated-computing frame. Such handlers are admissible only at the substrate boundary (request decoding, response encoding); the substrate-touching parts of the handler operate on $f_i^*(v)$.

## Position

Together with [content-negotiation-as-modal-possibility-projection](content-negotiation-as-modal-possibility-projection.md) (response-shape selection), this theorem grounds the web-server-platform's request-handling pipeline in the predication fibration. Routing is base-change; content negotiation is modal-possibility projection over an accessibility relation; middleware is natural-transformation composition. The HTTP server's three primary operations are three structural moves on the same fibration.
