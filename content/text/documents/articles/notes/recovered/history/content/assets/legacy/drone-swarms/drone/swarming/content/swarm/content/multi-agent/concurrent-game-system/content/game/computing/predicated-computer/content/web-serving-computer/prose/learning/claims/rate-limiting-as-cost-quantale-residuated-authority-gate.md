---
type: theorem
class: engineering-claim
status: proved
depends-on: [rate-limit, middleware, principal, residuated-restriction-as-authority-gate, right-residuation-operator, twist-product-right-residual, cost-quantale-of-fuel, cost-composition-via-lawvere-quantale, cost-discipline, fuel-bound, four-bilattice, status-code-classes-as-four-bilattice-values]
see-also: [cost-discipline-reads-free, federation-fuel-as-tensor-distributivity, distributed-lock-as-residuated-authority-gate]
---

# Rate limiting is residuated authority-gating in the cost quantale

**Claim.** A [rate-limit](teaching/explanations/rate-limit.md) middleware is structurally the [residuated restriction by an authority element](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/theorems/residuated-restriction-as-authority-gate.md), with the authority element being the [principal](../../teaching/explanations/principal.md)'s remaining-budget cell in the substrate's [cost quantale of fuel](../../../objects/cost-quantale-of-fuel.md) and the residuation taken in that quantale rather than in `FOUR`. Admission of a request is the [right-residuation operator](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/morphisms/right-residuation-operator.md) $\mathrm{R}_b(c) := b \Rightarrow c$ producing a non-bottom value, where $b$ is the principal's remaining budget and $c$ is the request's cost; the wire status `429 Too Many Requests` is the substrate's `FOUR`-encoding of $\mathbf{f}$ on the budget cell after the residuation.

## Why this holds

Per [cost-composition-via-lawvere-quantale](../../../theorems/cost-composition-via-lawvere-quantale.md), every substrate operation has a cost $c \in \mathcal{V}$ in the chosen cost quantale (typically $\mathcal{V} = ([0, \infty], +, \min)$ for additive cost, or $([0, 1], \cdot, \max)$ for reliability composition). Per [cost-discipline-reads-free](../../../theorems/cost-discipline-reads-free.md), reads contribute the unit; settlements contribute positive cost.

A rate limit declares a *budget* $b \in \mathcal{V}$ per metering subject (principal, IP, tenant) per metering window. The budget is substrate state — a [fuel-bound](../../teaching/explanations/fuel-bound.md) cell on the principal-record. A request of cost $c$ is admitted iff $b$ can absorb $c$, i.e., iff $b \otimes^{-1} c \neq \bot_\mathcal{V}$ where $\otimes^{-1}$ is the quantale's right residual: $b \Rightarrow c$ in the quantale.

### Structural transposition, not literal application

[residuated-restriction-as-authority-gate](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/theorems/residuated-restriction-as-authority-gate.md) is proved on the bilattice `FOUR` with the twist-product right residual $\Rightarrow_{\mathbf{FOUR}}$. This theorem does *not* claim that the FOUR-residuation theorem applies literally to a non-FOUR value-domain. Rather, it claims that the *structural pattern* the FOUR theorem identifies — an authority element $a$ inducing a unary right-residuation operator $\mathrm{R}_a(x) := a \Rightarrow x$ in a residuated structure, whose four-row behavior classifies payloads into four admission profiles — *re-instantiates* in the cost quantale because the cost quantale is itself a residuated structure (a Lawvere quantale is a unital quantale, hence carries left and right residuals via the adjoint-functor theorem on complete lattices: $a \otimes - \dashv a \Rightarrow -$).

The bridge has two parts:

- **Lift.** The right residual $\Rightarrow_\mathcal{V}$ in the cost quantale is the unique operator satisfying $a \otimes b \le c \iff b \le a \Rightarrow c$. For $\mathcal{V} = ([0, \infty], +, \min)$ the explicit form is $a \Rightarrow_\mathcal{V} c = \max(c - a, 0)$ (with the order-reversal convention that smaller cost is greater); for $\mathcal{V} = ([0, 1], \cdot, \max)$ it is $a \Rightarrow_\mathcal{V} c = c / a$ when $a > 0$ and $1$ otherwise. The unary operator $\mathrm{R}_b(c) := b \Rightarrow_\mathcal{V} c$ is well-defined per the quantale's complete-lattice structure. The *structural form* of the FOUR theorem — fixed authority element induces a four-profile classifier on payloads — depends only on residuation, not on FOUR itself; it carries to any unital quantale.
- **Projection to FOUR for wire semantics.** HTTP wire codes are FOUR-valued per [status-code-classes-as-four-bilattice-values](status-code-classes-as-four-bilattice-values.md). The rate-limit's wire verdict is a *projection* $\pi_{\mathcal{V} \to \mathbf{FOUR}}$ from the post-residuation budget cell to the FOUR corner that classifies the wire response. Concretely, with $b' := b - c$ (the budget after admission would be $b'$):
  - $b' \ge_\mathcal{V} 0$ and consumption recorded $\to \mathbf{t}$ → admission, `2xx`-class wire response from the handler.
  - $b' <_\mathcal{V} 0$ → $\mathbf{f}$ → refusal, `429 Too Many Requests`.
  - Budget cell currently being computed (replicas converging) → $\bot$ → queue or pessimistic refusal pending convergence.
  - Budget cell at $\top$ (replica disagreement) → $\top$ → escalate per [repair-as-top-cell-resolution](../../../theorems/repair-as-top-cell-resolution.md).
  
  The projection $\pi$ is the substrate's wire-side encoding of the residuation's verdict; the FOUR-corner mapping is per the four-row pattern of the cited PC theorem, *now applied to the wire-corner classification rather than to the residuation itself*. The four-row analogy below is mnemonic — the cost-quantale residuation is the engine; the FOUR-projection is the wire encoding.

The four authority profiles in the cited PC theorem (silent, affirming, denying, paraconsistent) transpose to four budget-cell shapes via this projection:

| Authority $a$ | `FOUR` reading | Cost-quantale reading (`max-budget` $= M$) |
|---|---|---|
| $\bot$ | silent authority | $b = \infty$ — *unbounded budget*, request always admitted; equivalent to no rate limit |
| $\mathbf{t}$ | affirming authority | $b = M$ — *full budget*, identity on most requests, rejects only requests of cost $> M$ |
| $\mathbf{f}$ | denying authority | $b = 0$ — *no budget*, every request refused (`429`) |
| $\top$ | paraconsistent authority | $b = $ *contested-budget cell* (per-replica disagreement); request held pending [repair](../../teaching/explanations/repair.md) |

The four-row pattern from the bilattice theorem maps onto the four substrate disciplines for an arriving request: refuse, admit, queue (the substrate's $\bot$-output discipline equivalent), and escalate.

## The four engineering disciplines

For request cost $c$ against principal budget $b$, the residuation $b \Rightarrow c$ in the cost quantale produces one of four engineering outcomes — the wire-side projection to `FOUR` of the post-residuation budget cell:

- **Admit ($\mathbf{t}$).** $b \ge_\mathcal{V} c$; budget absorbs; substrate decrements $b \mapsto b - c$ (or $b \cdot c^{-1}$ in the multiplicative quantale); request proceeds. Wire: substrate runs the handler, returns `2xx`/`3xx`/`4xx` per the handler's verdict, and surfaces `X-RateLimit-Remaining: <b - c>`.
- **Refuse ($\mathbf{f}$).** $b <_\mathcal{V} c$; budget cannot absorb; substrate refuses without invoking the handler. Wire: `429 Too Many Requests` with `Retry-After: <ticks until next admission>` and `X-RateLimit-Remaining: <b>` (unchanged).
- **Queue ($\bot$).** Substrate accepts the request but defers handler invocation until the budget refills (token-bucket discipline with finite queue depth). Wire: connection held open until admission or queue-timeout; on timeout, `503 Service Unavailable` per the substrate's overload discipline. Structurally a $\bot$-output: the residuation has produced no committed verdict yet; the witness records the queueing rather than the admission.
- **Escalate ($\top$).** The budget cell is at $\top$ (per-replica disagreement on remaining quota; common in federated rate-limits where replicas have not yet synchronized fuel consumption). Per [repair-as-top-cell-resolution](../../../theorems/repair-as-top-cell-resolution.md), the substrate must resolve before responding. Wire: `5xx` if no resolution rule applies; otherwise the resolved budget's verdict.

The four cases recover the engineering rate-limit discipline exactly.

## Federation extends via tensor distributivity

Per [federation-fuel-as-tensor-distributivity](../../../theorems/federation-fuel-as-tensor-distributivity.md), fuel composes across federation peers via the cost quantale's tensor product distributing over the bilattice's joins. A federated rate limit (a budget shared across multiple substrate-instances serving the same principal) inherits the federation-fuel composition: each instance's local budget cell $b_i$ is a section of the federated budget cosheaf; the residuation gate at one instance accounts for fuel consumed at sibling instances via the cosheaf push.

Two engineering shapes follow:

- **Local-only rate limits** (no federation cosheaf): each substrate-instance enforces its own $b_i$ independently. A principal's effective budget is $\sum_i b_i$ — over-provisioning by the federation breadth. Acceptable for low-stakes endpoints; insufficient for billed/abuse-control limits.
- **Federated rate limits** (with cosheaf): the substrate carries one shared $b$ as substrate content; consumption at each instance is replicated via the substrate's [federation-convergence](../../../theorems/federation-convergence.md). The residuation at each instance reads the converged $b$. Eventual-consistency latency may produce transient $\top$-cells (instance $A$ admitted a request while instance $B$ also admitted, jointly exceeding the budget); per the escalate discipline, the substrate resolves to a documented overage policy.

## `Retry-After` is the right-residual's $\tau$-distance witness

When the residuation refuses ($b < c$), the substrate computes the substrate-clock distance until $b$ refills to $\ge c$ — which, for a token-bucket of refill rate $r$, is $(c - b) / r$ ticks. Per [cost-composition-via-lawvere-quantale](../../../theorems/cost-composition-via-lawvere-quantale.md), this is the cost quantale's *temporal projection* of the residuation: the smallest $\tau$ such that $b + r\tau \ge c$. The `Retry-After: <ticks>` header is the substrate's witness of that projection — the substrate's commitment that, absent intervening consumption, the same request will admit at $\tau$ ticks hence.

Per [cache-control-as-modal-necessity-along-time-accessibility](cache-control-as-modal-necessity-along-time-accessibility.md), this is the dual of `max-age`'s necessity claim: `max-age` is the substrate's commitment that *the response holds along $R_{\le N}$*; `Retry-After` is the substrate's commitment that *the budget cell will admit along $R_{\le N}$*. Both are necessity-along-time claims at the substrate's wire boundary.

## Engineering consequence

- **`X-RateLimit-Remaining` is the substrate's budget-cell projection.** The header surfaces the budget cell after the request's residuation. Per the substrate's [self-representation](../../teaching/explanations/self-representation.md), the wire-side header must equal the substrate-side budget cell; a divergence is doctrine-fidelity failure per [doctrine-fidelity-via-faithful-interfacer-functor](../../../theorems/doctrine-fidelity-via-faithful-interfacer-functor.md).
- **Composing rate limits is residual composition.** A request gated by multiple rate limits (per-IP and per-account, say) admits iff the residuation at each gate produces a non-bottom result: $\mathrm{R}_{b_{\mathrm{ip}}} \circ \mathrm{R}_{b_{\mathrm{acct}}}$ on the request cost. The composition is associative per the cost quantale's associativity; the order in which gates are evaluated does not affect the verdict, only which gate's `Retry-After` is surfaced on refusal.
- **Cost-aware rate limits.** Different request shapes have different costs (a complex query is more expensive than a simple GET). Per [cost-discipline](../../teaching/explanations/cost-discipline.md), the substrate computes per-request cost from the endpoint's declared cost-class; the residuation against the budget uses that cost rather than counting requests uniformly. Standard "100 requests/minute" is the cost-1 specialization; `100 cost-units/minute` with per-endpoint cost is the general form.
- **Federation-aware fuel accounting.** Per [federation-fuel-as-tensor-distributivity](../../../theorems/federation-fuel-as-tensor-distributivity.md), a request that fans out to $k$ federated peers consumes $\sum_i c_i$ from the principal's budget where $c_i$ is the per-peer cost; the residuation at the entry point must account for the full federated cost, not just the local cost.

## What the theorem rules out

- **Boolean rate limits.** A rate limit modeled as "request count $\le$ threshold" without a cost dimension cannot represent unequal-cost endpoints (heavy queries and trivial reads are accounted alike). The cost-quantale formulation subsumes the count-based shape (when all requests have unit cost) and admits the weighted shape uniformly.
- **Silent admission on budget-cell $\top$.** A federated rate limit whose replicas disagree on remaining budget is at $\top$. Implementations that silently pick one replica's value (typically the local one) and admit on it produce over-budget admission and surface a wire-side `X-RateLimit-Remaining` that does not match the converged substrate state. Per [repair-as-top-cell-resolution](../../../theorems/repair-as-top-cell-resolution.md), the substrate must either resolve the $\top$-cell (e.g., refuse pessimistically until convergence) or escalate to `5xx`.
- **`Retry-After: 0`.** The substrate's commitment that the budget will admit *immediately* contradicts the same request having just been refused. If the request is currently refused, the budget cannot also be currently admitting; `Retry-After: 0` is a substrate-side timing inconsistency. Conformant substrates emit a positive `Retry-After` matching the actual projection or omit the header entirely.
- **Tunneling rate-limit refusal as `200 OK`.** An envelope-encoded `200 OK` with body `{"error": "rate limited", ...}` is the same wire-doctrine failure called out in [http-method-discipline-via-fibration-generators](http-method-discipline-via-fibration-generators.md): the wire-side bilattice corner ($\mathbf{t}$ for `200`) does not match the substrate's verdict ($\mathbf{f}$ for refused). The honest wire shape is `429`.

## Position

This theorem is the engineering corollary of [residuated-restriction-as-authority-gate](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/theorems/residuated-restriction-as-authority-gate.md) at the cost-quantale boundary, paralleling [distributed-lock-as-residuated-authority-gate](../../distributed-coordination-platform/theorems/distributed-lock-as-residuated-authority-gate.md) at the `FOUR`-bilattice boundary: rate limiting and distributed locking are *the same structural move* — residuated authority-gating — applied in two different value-domains (cost quantale for fuel; `FOUR` for exclusive access). Together they exhaust the substrate's discipline of *gated access*: time-and-fuel for rate limits, single-holder-permission for locks. Both are first-class substrate content per [self-representation](../../teaching/explanations/self-representation.md), both are auditable per [witness](../../../objects/witness.md), both compose under the same residuation calculus at different value-domain choices.
