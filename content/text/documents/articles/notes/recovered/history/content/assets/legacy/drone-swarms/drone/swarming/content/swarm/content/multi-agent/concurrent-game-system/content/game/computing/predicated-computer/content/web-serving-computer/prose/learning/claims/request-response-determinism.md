---
type: theorem
class: engineering-claim
status: proved
depends-on: [endpoint, route, middleware, handle-request, settlement-determinism, function-purity-replay-fidelity]
see-also: [conformance-implies-substrate-properties]
---

# Request handling is deterministic on substrate state

**Claim.** For any HTTP request $r$ and substrate state at time of receipt, [handle-request](../morphisms/handle-request.md) produces a deterministic response (assuming pure handlers and middleware). Two substrate-instances with the same state, receiving the same request, produce byte-identical responses.

## Why this holds

The argument follows from [settlement-determinism](settlement-determinism.md) applied to request handling.

**Part 1: Routing is deterministic.** Per [route](teaching/explanations/route.md), the match between request and endpoint is computed deterministically from the substrate's [endpoint-records](../objects/endpoint-record.md).

**Part 2: Middleware is deterministic when pure.** Per [function-purity-replay-fidelity](../../functional-runtime-platform/theorems/function-purity-replay-fidelity.md), pure middleware produce identical outputs on identical inputs. Effectful middleware (e.g., logging) are deterministic given the same substrate state.

**Part 3: Handler is deterministic per its declaration.** Per [function-record](../../functional-runtime-platform/objects/function-record.md), handlers declare their determinism (`pure`, `effectful`, `non-deterministic`). Pure handlers replay byte-identically; effectful handlers replay identically given same state and capabilities; non-deterministic handlers record entropy in the witness.

**Part 4: Response emission is deterministic.** Per [encode](../../../morphisms/encode.md), the response serialization is byte-deterministic.

Combining: deterministic routing (Part 1), deterministic middleware (Part 2), deterministic handler (Part 3), deterministic response (Part 4). The full request handling is deterministic.

## Engineering consequence

- **Reproducible request handling.** Per [snapshot-replay-fidelity](../../../theorems/snapshot-replay-fidelity.md), past requests can be replayed to verify the substrate's response was correct.
- **Federation-compatible.** Per [federation-convergence](../../../theorems/federation-convergence.md), federated substrate-instances handling the same request produce the same response (modulo per-instance state).
- **Cacheable.** Per [cache](../../teaching/explanations/cache.md), responses to deterministic handlers are cacheable by canonical-form-hash of (request, state).

## What the theorem rules out

- A handler that branches on host wall-clock or random sources without recording entropy in the witness — non-deterministic in undocumented ways.
- A middleware that varies behavior across substrate-instances (e.g., reads host-specific config without declaring it as substrate content).

## What the theorem requires

- Handlers and middleware are functions per [function-record](../../functional-runtime-platform/objects/function-record.md) with proper determinism declarations.
- Per [settlement-determinism](settlement-determinism.md), the substrate's state is deterministic.
