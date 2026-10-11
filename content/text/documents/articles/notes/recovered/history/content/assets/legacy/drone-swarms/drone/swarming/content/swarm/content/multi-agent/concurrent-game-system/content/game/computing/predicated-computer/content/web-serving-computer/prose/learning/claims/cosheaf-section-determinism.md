---
type: theorem
class: engineering-claim
status: proved
depends-on: [webhook, fire-webhook, request-response-determinism, quantale-enriched-cosheaf, quantale-enriched-sheaf, verdier-duality-bitopological-site, bitopological-settling-site, predication-fiber-algebra, settlement-determinism, settlement-via-closure-2-monad, doctrine-fidelity-via-faithful-interfacer-functor]
see-also: [routing-as-predication-fibration-base-change, conditional-get-as-stalk-equality, status-code-classes-as-four-bilattice-values]
---

# Cosheaf-section emission is deterministic on (event, subscription, substrate state)

**Claim.** For any substrate-event $e$ at fiber $A_p$, any registered outbound subscription $\sigma$ matching $p$, and the substrate state $\Sigma$ at the firing tick, the *cosheaf-section value* the substrate emits to $\sigma$'s recipient is deterministic on the triple $(e, \sigma, \Sigma)$. Two substrate-instances at the same $\Sigma$, with the same registered $\sigma$, observing the same $e$, emit byte-identical canonical-form section values; the recipient cannot distinguish them by inspection of the delivered content. This is the *push-side dual* of [request-response-determinism](request-response-determinism.md), and it follows from the same fiber-functoriality applied covariantly along the cosheaf rather than contravariantly along the sheaf.

The theorem governs all three outbound subscription mechanisms identified in [outbound-subscription-as-cosheaf-push](teaching/explanations/outbound-subscription-as-cosheaf-push.md): webhooks (single-point cosheaf section), server-sent events (connected cosheaf section over the response body), GraphQL subscriptions (typed cosheaf section over the WebSocket). The transport differs; the cosheaf section's canonical-form value does not.

## Why this holds

Per [outbound-subscription-as-cosheaf-push](teaching/explanations/outbound-subscription-as-cosheaf-push.md), the substrate's outbound subscription registry is a [Q-enriched cosheaf](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/quantale-enriched-cosheaf.md) $\check{F}$ on the [bitopological settling site](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/bitopological-settling-site.md). A registered subscription $\sigma$ at predicate $p$, stage $\tau$, scope $U$ is a section of $\check{F}$ over the open neighborhood $(p, \tau, U)$.

When a substrate event $e$ fires at fiber $A_p$, the cosheaf push at $\sigma$ is the colimit assembly of:

1. The fiber-algebra value $u = e(A_p) \in A_p$ produced by the firing — the new cell content.
2. The predicate-category morphism $f : p \to q$ in the cosheaf's covariant functor along which the section's view of $u$ is taken. For a webhook subscribed at $p$, $f = \mathrm{id}_p$; for a GraphQL subscription document filtering on $q$ where $p \to q$, $f$ is the cosheaf's contravariant lift.
3. The quantale-grade weight encoding the section's accessibility (per [bilattice-accessibility-relation](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/bilattice-accessibility-relation.md), the recipient's trust/visibility weight).

Per [predication-fiber-algebra](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/predication-fiber-algebra.md) axiom A3, the cosheaf's covariant functor $\check{F}(f) : \check{F}(p) \to \check{F}(q)$ is a bilattice-residuated homomorphism — it is determined uniquely by the data $(u, f, \mathrm{grade})$. The section's emitted value at $\sigma$ is therefore $\check{F}(f)(u) \otimes \mathrm{grade}(\sigma)$, computed by total functions on the substrate state.

Determinism then follows by the same argument used in [settlement-determinism](../../../theorems/settlement-determinism.md) and [request-response-determinism](request-response-determinism.md), transposed to the covariant cosheaf direction:

- **Per [settlement-via-closure-2-monad](../../../theorems/settlement-via-closure-2-monad.md), the firing event $e$ is determined by $\Sigma$.** The closure-rule application that produces $u = e(A_p)$ is functorial in $\Sigma$ and in the rule's premise atoms; substrate-instances at byte-equal $\Sigma$ produce byte-equal $u$.
- **The subscription's section-spec $\sigma$ is substrate content.** Per the cosheaf's section-registration discipline, $\sigma$ records its $(p, \tau, U, f, \mathrm{grade})$ as canonical-form substrate cells. Two instances at the same $\Sigma$ have the same registered $\sigma$.
- **The covariant functor $\check{F}(f)$ is a substrate-implementation-independent total function on $A_p \to A_q$.** Per axiom A3, $\check{F}(f)$ is determined by $f$'s generator class; per the [canonical-form](../../teaching/explanations/canonical-form.md) discipline, two implementations agree on the byte-encoding of $\check{F}(f)(u)$.
- **The quantale-grade composition is associative and unital per [cost-composition-via-lawvere-quantale](../../../theorems/cost-composition-via-lawvere-quantale.md).** Two implementations apply the same $\otimes$ at the same operands and produce the same canonical-form result.

Concatenating: $(e, \sigma, \Sigma) \mapsto \check{F}(f)(u) \otimes \mathrm{grade}(\sigma)$ is a total deterministic function whose canonical-form output is byte-identical across conformant implementations. $\square$

## What the theorem covers and what it does not

The theorem governs the *cosheaf section value* — the canonical-form bytes the substrate commits to push. It does *not* govern:

- **Transport delivery.** Whether the recipient receives the bytes (network failure, recipient unavailable, retry exhaustion) is the *transport adapter*'s concern. Per [transport-tolerance-of-federation](../../../theorems/transport-tolerance-of-federation.md), the substrate's commitment is to emit the canonical-form bytes; delivery is best-effort with substrate-recorded retry discipline.
- **Wire framing.** Webhook bytes are wrapped in HTTP request framing, SSE bytes in `data:`/`event:` lines, GraphQL subscription bytes in WebSocket frames. The framing is per-transport; the framed payload's canonical-form content is the cosheaf section value.
- **Connection-state sequencing for connected-open sections.** SSE and GraphQL subscription emit a *sequence* of section values as $\tau$ advances. Each value in the sequence is deterministic per this theorem; the sequence's order is determined by the substrate-clock's ordering, which by [monotonic-clock-discipline](../../../theorems/monotonic-clock-discipline.md) is total.

## Verdier-duality with request-response-determinism

Per [verdier-duality-bitopological-site](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/theorems/verdier-duality-bitopological-site.md), the sheaf $F$ and cosheaf $\check{F}$ on the substrate's bitopological settling site are derived-equivalent. The pull side ([request-response-determinism](request-response-determinism.md), $F$-deterministic) and the push side (this theorem, $\check{F}$-deterministic) carry the same content from opposite directions: a sheaf section is determined by a covering family's restrictions; a cosheaf section is determined by a covering family's colimits. Both are deterministic on substrate state; both produce canonical-form witnesses; both are auditable.

The two determinism theorems together exhaust the substrate's wire-side commitment under HTTP:

| Direction | Theorem | Determined-on | Trigger |
|---|---|---|---|
| Pull (sheaf) | [request-response-determinism](request-response-determinism.md) | (request, configuration, $\Sigma$) | client-initiated request |
| Push (cosheaf) | this theorem | (event, subscription, $\Sigma$) | substrate-event firing |

Together they imply that, for any pair of substrate-instances at the same $\Sigma$ and the same configuration, the *complete* HTTP-wire behavior — every response to every request, every push to every subscription — is byte-identical. This is the substrate's full doctrine-fidelity guarantee at the HTTP boundary per [doctrine-fidelity-via-faithful-interfacer-functor](../../../theorems/doctrine-fidelity-via-faithful-interfacer-functor.md).

## Engineering consequence

- **Replay produces byte-identical pushes.** Per [recovery-via-event-log-replay-determinism](../../../theorems/recovery-via-event-log-replay-determinism.md), a substrate replayed from event log with the same subscription registry produces the same outbound section values. Recovery testing for outbound subscriptions reduces to byte-comparison on the canonical-form section values, identical in shape to recovery testing for sheaf-side responses.
- **Federated subscriptions converge.** When two substrate-instances share a subscription registry (federated push), each instance's outbound section value at a fired event is deterministic per this theorem; the recipient sees byte-identical pushes from both, deduplicating per [hash-injectivity-under-canonical-form](../../../theorems/hash-injectivity-under-canonical-form.md). Recipients implementing exactly-once delivery rely on this byte-equality.
- **Subscription audit reduces to section-value recompute.** An auditor verifying that a substrate's pushed section to subscription $\sigma$ at event $e$ was correct recomputes the canonical-form value from $(e, \sigma, \Sigma)$ and compares to the recorded push witness. Per the canonical-form discipline, the recompute is deterministic and byte-comparable.
- **`Last-Event-ID` (SSE) and subscription resumption recover deterministic position.** When an SSE connection drops and resumes via `Last-Event-ID`, the substrate replays the cosheaf section sequence from the recorded position; per this theorem, the replayed values are byte-identical to the values originally emitted. The recipient cannot distinguish a fresh push from a resumed push of the same section.

## What the theorem rules out

- **Per-recipient randomized push content.** A subscription mechanism that includes a per-push random nonce in the canonical-form section value (rather than in the transport framing) is non-deterministic on $(e, \sigma, \Sigma)$ — the same triple produces different bytes on different attempts. Per the substrate's discipline, randomness must live in transport framing (request IDs, connection nonces) or in substrate state (per-issuance nonces stored as substrate content), not in the section value.
- **Wall-clock time embedded in section value.** A section value that includes the substrate's wall-clock time at push (rather than the substrate-clock tick of the firing event) is non-deterministic on $\Sigma$. Per [time-and-event-ordinals](../../teaching/explanations/time-and-event-ordinals.md), substrate-time is the firing event's recorded ordinal — substrate content — not the wall-clock time of the push action.
- **Section value depending on transport state.** A subscription mechanism whose pushed value depends on the transport adapter (e.g., SSE pushes JSON but webhook pushes XML for the same event) decouples the section value from $(e, \sigma, \Sigma)$. Per the cosheaf discipline, the section value is per-cosheaf-section, not per-transport; transport-specific encoding belongs in the framing, not the value.
- **Silent drop of unmatched events.** A substrate that drops events not matching any subscription without recording the drop (no witness) violates the audit requirement: the substrate must witness the cosheaf push attempt even when the section has no recipient, just as the sheaf side witnesses every request including 404s. The witness records "event $e$ produced no matched subscription," which is a deterministic projection of $(e, \Sigma)$.

## Position

This theorem is the engineering follow-on commissioned by [outbound-subscription-as-cosheaf-push](teaching/explanations/outbound-subscription-as-cosheaf-push.md) §"What changes in the subtheory" item 4. It closes the determinism account of the web-server-platform: pull-side determinism per [request-response-determinism](request-response-determinism.md), push-side determinism per this theorem, both grounded in the substrate's underlying [settlement-determinism](../../../theorems/settlement-determinism.md) and projected through the [verdier-duality-bitopological-site](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/theorems/verdier-duality-bitopological-site.md) sheaf/cosheaf duality. Together with [routing-as-predication-fibration-base-change](routing-as-predication-fibration-base-change.md) (sheaf-side base change) and the as-yet-uncommissioned `cosheaf-section-spec-as-cofibration-over-bitopological-site` (cosheaf-side specification), it commits the web-server-platform to the same determinism discipline on both faces of HTTP.
