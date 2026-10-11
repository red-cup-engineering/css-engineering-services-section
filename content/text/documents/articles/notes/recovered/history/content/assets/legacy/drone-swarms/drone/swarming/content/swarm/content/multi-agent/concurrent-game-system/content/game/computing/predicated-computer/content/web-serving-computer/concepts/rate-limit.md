---
type: concept
class: web-protocol
depends-on:
  - endpoint
  - middleware
  - resource-budget
  - principal
  - witness
  - cost-quantale-of-fuel
  - fuel-bound
  - right-residuation-operator
  - four-bilattice
see-also:
  - cost-discipline
  - rate-limiting-as-cost-quantale-residuated-authority-gate
  - distributed-lock-as-residuated-authority-gate
  - federation-fuel-as-tensor-distributivity
  - status-code-classes-as-four-bilattice-values
---

# Rate limit

A *substrate-recorded budget on the rate at which a [principal](../../teaching/explanations/principal.md) may invoke an [endpoint](endpoint.md) or scope*. Implemented as [middleware](middleware.md) gating request admission; declared as substrate content so the policy is auditable and federable.

Per [rate-limiting-as-cost-quantale-residuated-authority-gate](../theorems/rate-limiting-as-cost-quantale-residuated-authority-gate.md) (proved), a rate-limit middleware is *not* a counter-and-threshold heuristic: it is structurally the [residuated restriction by an authority element](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/theorems/residuated-restriction-as-authority-gate.md) where the authority element is the principal's remaining-budget cell in the substrate's [cost quantale of fuel](../../../objects/cost-quantale-of-fuel.md) and the residuation is taken in that quantale rather than in `FOUR`. Admission is the [right-residuation operator](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/morphisms/right-residuation-operator.md) $\mathrm{R}_b(c) := b \Rightarrow c$ producing a non-bottom value; the wire status `429 Too Many Requests` is the substrate's `FOUR`-projection of $\mathbf{f}$ on the budget cell after the residuation.

## Declaration fields and their math roles

A rate-limit declaration carries five field families, each mapping to a fixed coordinate of the residuated-authority-gate construction:

- **Subject of metering ↔ which principal-record carries the authority element $b$.** Per-API-key, per-IP, per-account, per-tenant, per-route. The subject choice selects which substrate-content cell holds the budget; multiple gates on the same request compose under the cost-quantale's residuation associativity per the theorem's "composing rate limits is residual composition" consequence.
- **Window ↔ the temporal projection of $b$.** Per-second, per-minute, per-hour, sliding-window, token-bucket fill rate. The window determines the refill discipline: in a token-bucket of refill rate $r$, $b$ refills as $b + r\tau$ along the substrate-clock; in a fixed-window discipline, $b$ resets to $M$ at window boundaries. Both shapes produce a $\tau$-indexed family of authority elements $b(\tau)$.
- **Budget ↔ the value $M$ of the authority element at full state.** The [fuel-bound](../../teaching/explanations/fuel-bound.md) admitted in the window (e.g., `1000 requests / minute`, or weighted `100 cost-units / minute` per [cost-discipline](../../teaching/explanations/cost-discipline.md)). Per the theorem's table, $b = M$ corresponds to the *affirming-authority* row — the substrate admits most requests; $b = 0$ corresponds to the *denying-authority* row — every request refused; $b = \infty$ corresponds to the *silent-authority* row — equivalent to no rate limit at all.
- **Overage discipline ↔ the wire-side projection $\pi_{\mathcal{V} \to \mathbf{FOUR}}$ of the four budget-cell shapes.** `429 Too Many Requests` (the standard, projecting $\mathbf{f}$); `503 Service Unavailable` (substrate-wide overload, projecting the substrate's $\top$-resolution to refusal); `200` with degraded response (best-effort, projecting $\bot$-output); queue-and-delay (the substrate's $\bot$-output discipline, deferring the verdict). Per the theorem's "four engineering disciplines" — admit, refuse, queue, escalate — these correspond exactly to the four `FOUR` corners on the post-residuation budget cell.
- **Surfaced budget state ↔ the substrate's wire-side budget-cell projection.** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`. Per [self-representation](../../teaching/explanations/self-representation.md), the wire headers must equal the substrate-side budget cell; a divergence is doctrine-fidelity failure per [doctrine-fidelity-via-faithful-interfacer-functor](../../../theorems/doctrine-fidelity-via-faithful-interfacer-functor.md).

Per [witness](../../../objects/witness.md), every admission and every refusal is recorded so an auditor can verify the substrate honored its declaration.

## The four engineering disciplines

For request cost $c$ against principal budget $b$, the residuation $b \Rightarrow_\mathcal{V} c$ produces one of four outcomes — the wire-side `FOUR`-projection of the post-residuation budget cell. The four cases recover the engineering rate-limit discipline exactly:

- **Admit ($\mathbf{t}$).** $b \ge_\mathcal{V} c$; budget absorbs; substrate decrements $b \mapsto b - c$ (additive quantale) or $b \cdot c^{-1}$ (multiplicative quantale); substrate runs the handler, returns `2xx`/`3xx`/`4xx` per the handler's verdict, and surfaces `X-RateLimit-Remaining: <b - c>`.
- **Refuse ($\mathbf{f}$).** $b <_\mathcal{V} c$; budget cannot absorb; substrate refuses without invoking the handler. Wire: `429 Too Many Requests` with `Retry-After: <ticks>` and `X-RateLimit-Remaining: <b>` unchanged.
- **Queue ($\bot$).** Substrate accepts the request but defers handler invocation until the budget refills (token-bucket discipline with finite queue depth). Connection held open until admission or queue-timeout; on timeout, `503` per the substrate's overload discipline. Structurally a $\bot$-output: the residuation has produced no committed verdict yet.
- **Escalate ($\top$).** The budget cell is at $\top$ (per-replica disagreement on remaining quota; common in federated rate-limits where replicas have not yet synchronized fuel consumption). Per [repair-as-top-cell-resolution](../../../theorems/repair-as-top-cell-resolution.md), the substrate must resolve before responding. Wire: `5xx` if no resolution rule applies; otherwise the resolved budget's verdict.

## Composition with parent disciplines

Rate limiting composes the substrate's [resource-budget](../../teaching/explanations/resource-budget.md) discipline (the parent's general budget machinery) with the substrate's [cost-discipline](../../teaching/explanations/cost-discipline.md) (per-operation cost in the cost quantale per [cost-composition-via-lawvere-quantale](../../../theorems/cost-composition-via-lawvere-quantale.md)). Per [cost-discipline-reads-free](../../../theorems/cost-discipline-reads-free.md), reads contribute the unit and settlements contribute positive cost; the rate-limit budget meters settlement cost rather than counting requests uniformly.

**Federation-aware fuel accounting.** Per [federation-fuel-as-tensor-distributivity](../../../theorems/federation-fuel-as-tensor-distributivity.md), fuel composes across federation peers via the cost quantale's tensor product distributing over the bilattice's joins. Two engineering shapes follow:

- **Local-only rate limits** (no federation cosheaf): each substrate-instance enforces its own $b_i$ independently. A principal's effective budget is $\sum_i b_i$ — over-provisioning by the federation breadth. Acceptable for low-stakes endpoints; insufficient for billed/abuse-control limits.
- **Federated rate limits** (with cosheaf): the substrate carries one shared $b$ as substrate content; consumption at each instance replicates via [federation-convergence](../../../theorems/federation-convergence.md). Eventual-consistency latency may produce transient $\top$-cells; per the escalate discipline, the substrate resolves to a documented overage policy.

## `Retry-After` is the right-residual's $\tau$-distance witness

When the residuation refuses ($b < c$), the substrate computes the substrate-clock distance until $b$ refills to $\ge c$ — for a token-bucket of refill rate $r$, this is $(c - b) / r$ ticks. Per the theorem's `Retry-After` analysis, this is the cost quantale's *temporal projection* of the residuation: the smallest $\tau$ such that $b + r\tau \ge c$. The header is the substrate's witness of that projection — a commitment that, absent intervening consumption, the same request will admit at $\tau$ ticks hence.

Per [cache-control-as-modal-necessity-along-time-accessibility](../theorems/cache-control-as-modal-necessity-along-time-accessibility.md), `Retry-After` is the *dual* of `max-age`'s necessity claim: `max-age` says *the response holds along $R_{\le N}$*; `Retry-After` says *the budget cell will admit along $R_{\le N}$*. Both are necessity-along-time claims at the substrate's wire boundary.

## What the discipline refuses

- **Boolean count-based rate limits.** Modeling a rate limit as "request count $\le$ threshold" without a cost dimension cannot represent unequal-cost endpoints (heavy queries and trivial reads accounted alike). The cost-quantale formulation subsumes the count-based shape (when all requests have unit cost) and admits the weighted shape uniformly.
- **Silent admission on budget-cell $\top$.** A federated rate limit whose replicas disagree on remaining budget is at $\top$. Implementations that silently pick one replica's value (typically the local one) and admit on it produce over-budget admission and surface a wire-side `X-RateLimit-Remaining` that does not match the converged substrate state. Per [repair-as-top-cell-resolution](../../../theorems/repair-as-top-cell-resolution.md), the substrate must either resolve the $\top$-cell or escalate to `5xx`.
- **`Retry-After: 0`.** The substrate's commitment that the budget will admit *immediately* contradicts the same request having just been refused. If the request is currently refused, the budget cannot also be currently admitting; `Retry-After: 0` is a substrate-side timing inconsistency.
- **Tunneling rate-limit refusal as `200 OK`.** An envelope-encoded `200 OK` with body `{"error": "rate limited", ...}` is the wire-doctrine failure called out in [http-method-discipline-via-fibration-generators](../theorems/http-method-discipline-via-fibration-generators.md): the wire-side bilattice corner ($\mathbf{t}$ for `200`) does not match the substrate's verdict ($\mathbf{f}$ for refused). The honest wire shape is `429`.

## Position

Rate limiting is the web-server-platform's instantiation of residuated authority-gating in the cost quantale — paralleling [distributed-lock-as-residuated-authority-gate](../../distributed-coordination-platform/theorems/distributed-lock-as-residuated-authority-gate.md) at the `FOUR`-bilattice boundary. Rate limiting and distributed locking are *the same structural move* — residuated authority-gating — applied in two different value-domains (cost quantale for fuel; `FOUR` for exclusive access). Together they exhaust the substrate's discipline of *gated access*: time-and-fuel for rate limits, single-holder-permission for locks. Both are first-class substrate content per [self-representation](../../teaching/explanations/self-representation.md), both are auditable per [witness](../../../objects/witness.md), both compose under the same residuation calculus at different value-domain choices.
