---
type: theorem
class: engineering-claim
status: proved
depends-on: [middleware, function-purity-replay-fidelity, doctrine-fidelity-compositionality]
see-also: [endpoint]
---

# Middleware composes associatively

**Claim.** For pure middleware $m_1, m_2, m_3$ in a request pipeline, the composition is associative: $(m_1 \circ m_2) \circ m_3 = m_1 \circ (m_2 \circ m_3)$. The order in which middleware are *combined into composites* doesn't matter as long as the final order in the pipeline is preserved.

Per [function-purity-replay-fidelity](../../functional-runtime-platform/theorems/function-purity-replay-fidelity.md), this is the standard function-composition associativity restricted to middleware-shaped functions.

## Why this holds

Middleware compose as functions: each takes a (request, next-handler) pair and produces a response. Function composition is associative when the functions are pure.

For middleware with effects (logging, rate-limiting), associativity holds in the substrate-content sense: the final substrate state after the composed middleware chain is the same regardless of grouping. Per [doctrine-fidelity-compositionality](../../../theorems/doctrine-fidelity-compositionality.md), this is structurally fibration-morphism composition.

## Engineering consequence

- **Refactor-safe.** Bundling related middleware into composites doesn't change pipeline behavior.
- **Reusable middleware-bundles.** Common combinations (auth + rate-limit + logging) can be packaged as a single middleware without effect.
- **Testable independently.** Each middleware can be tested in isolation; composition is guaranteed to work per the theorem.

## What the theorem requires

- Middleware are pure or effect-disciplined (declared effects, deterministic given same state).
- Per [function-record](../../functional-runtime-platform/objects/function-record.md), each middleware's signature matches the middleware contract.
