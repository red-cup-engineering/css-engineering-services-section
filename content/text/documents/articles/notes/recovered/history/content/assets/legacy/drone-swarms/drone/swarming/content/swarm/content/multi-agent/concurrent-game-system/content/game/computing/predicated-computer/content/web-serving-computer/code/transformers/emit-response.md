---
type: morphism
class: web-operation
realizes:
  - endpoint
  - content-negotiation
depends-on:
  - endpoint-record
  - encode
  - send-message
  - witness
  - four-bilattice
  - modal-necessity-operator
  - bilattice-accessibility-relation
see-also:
  - handle-request
  - status-code-classes-as-four-bilattice-values
  - content-negotiation-as-modal-possibility-projection
  - cache-control-as-modal-necessity-along-time-accessibility
  - doctrine-fidelity-via-faithful-interfacer-functor
---

# Emit response

The substrate operation that *sends an HTTP response* to a client. Per [content-negotiation](teaching/explanations/content-negotiation.md), serializes the response body in the chosen content-type and sends.

Structurally, emit-response is the substrate's *wire-projection terminal*: it takes the substrate's `FOUR`-valued verdict on the request and projects it to the wire's HTTP-response shape per [status-code-classes-as-four-bilattice-values](../theorems/status-code-classes-as-four-bilattice-values.md), serializes the response body in the world $w^*$ realized by content-negotiation's $\Diamond_R$ per [content-negotiation-as-modal-possibility-projection](../theorems/content-negotiation-as-modal-possibility-projection.md), and surfaces the substrate's modal-necessity claim along the time-accessibility relation as the response's `Cache-Control` header per [cache-control-as-modal-necessity-along-time-accessibility](../theorems/cache-control-as-modal-necessity-along-time-accessibility.md). Emit-response is not a generic "send bytes" primitive: it is the substrate's surface for projecting three modal/bilattice constructions to the single wire boundary.

## Signature

`emit-response(response, client-connection) → emit-witness`

Inputs:

- **`response`** — the response: status code, headers, body. Structurally the substrate's verdict on the request, packaged for wire emission: the status-code class is the verdict's `FOUR`-projection; the body's serialization world is content-negotiation's realized $w^*$; the cache-control headers are the substrate's $\Box_{R_{\le N}}$ commitments.
- **`client-connection`** — the [connection](../../teaching/explanations/connection.md) to send on.

Outputs:

- **`emit-witness`** — the [witness](../../../objects/witness.md) entry recording exactly which bytes the substrate emitted: status-code, headers, body-hash, emission-tick. The witness is the substrate-side proof of what was actually sent.

## Operational semantics

Each step maps to a fixed math construction:

1. **Choose response content-type ↔ content-negotiation's $\Diamond_R$ realizer.** Per [content-negotiation-as-modal-possibility-projection](../theorems/content-negotiation-as-modal-possibility-projection.md), the chosen content-type is the world $w^*$ realizing $\bigvee_t \{R(\text{request}, w') \odot u_{w'} : w' \in W\}$ over the endpoint's representation worlds. On empty join, emit `406 Not Acceptable` instead.
2. **Serialize response body ↔ encode in the realized world.** Per [encode](../../../morphisms/encode.md), serialize the response body in the format coordinate of $w^*$. The serialization is canonical-form per the format's discipline; per [hash-injectivity-under-canonical-form](../../../theorems/hash-injectivity-under-canonical-form.md), byte-equality of the serialized body witnesses the realized $w^*$.
3. **Construct HTTP response bytes ↔ wire-side `FOUR`-projection.** Status line, headers, body. The status-code class projects the substrate's verdict to the `FOUR`-corner per [status-code-classes-as-four-bilattice-values](../theorems/status-code-classes-as-four-bilattice-values.md): `2xx` ↔ $\mathbf{t}$ (told true), `3xx` ↔ $\bot$ (told nothing here; redirect to alternate fiber), `4xx` ↔ $\mathbf{f}$ (told false), `5xx` ↔ $\top$ (told both — substrate self-inconsistency). `1xx` (informational) is *not* a fifth corner: per the theorem it is a sub-step witness structurally below the bilattice — emitted as a stepping report before the eventual verdict-bearing response. The headers carry the substrate's modal-necessity claims (`Cache-Control`, `Vary`, `ETag`, `Last-Modified`) and the negotiation-realized world (`Content-Type`, `Content-Encoding`, `Content-Language`).
4. **Transmit on the client-connection ↔ send-message.** Per [send-message](../../../morphisms/send-message.md), transmit the response bytes on the connection. The transmission is the substrate's wire-side commitment to the response.
5. **Record the emission ↔ witness.** Per [witness](../../../objects/witness.md), record exactly what was emitted (bytes, tick) so an auditor can verify the substrate's wire output matched its substrate-side verdict.

## Engineering invariants

- **Format-respected.** Per [content-negotiation-as-modal-possibility-projection](../theorems/content-negotiation-as-modal-possibility-projection.md), the response format matches the realized $w^*$, or returns `406 Not Acceptable` if no client preference matches any realized world ($\Diamond_R$ at $\bot$).
- **Wire-verdict matches substrate-verdict.** Per [doctrine-fidelity-via-faithful-interfacer-functor](../../../theorems/doctrine-fidelity-via-faithful-interfacer-functor.md), the status-code class equals the substrate's `FOUR`-projection on the request. An envelope-encoded error in a `200 OK` body whose substrate-side verdict is $\mathbf{f}$ is doctrine-fidelity failure.
- **Cache-control honored.** Per [cache-control-as-modal-necessity-along-time-accessibility](../theorems/cache-control-as-modal-necessity-along-time-accessibility.md), the emitted `Cache-Control` header *is* the substrate's modal-necessity commitment $\Box_{R_{\le N}}$ on the response along the time-accessibility relation. The substrate must not subsequently revise the response within the necessity window.
- **`Vary` declares the fiber.** Per the cache-control theorem, the emitted `Vary` header declares which request coordinates index the response's fiber; caches must key per the declared `Vary` axes.
- **Witnessed.** Per [witness](../../../objects/witness.md), every emission is recorded; the witness chain per [witness-chain-as-proof-object](../../../theorems/witness-chain-as-proof-object.md) is the substrate-side proof of the wire output.

## What the discipline refuses

- **Wire-decoupled status.** Returning `200 OK` for a request the substrate refused, with the refusal encoded as a body envelope, projects the substrate's $\mathbf{f}$ verdict to the wire's $\mathbf{t}$ corner — the doctrine-fidelity failure called out in [doctrine-fidelity-via-faithful-interfacer-functor](../../../theorems/doctrine-fidelity-via-faithful-interfacer-functor.md).
- **Cache-control claims the substrate cannot honor.** Emitting `Cache-Control: max-age=3600` while the substrate's revision discipline allows the response to change within the hour is a substrate-side over-commitment to $\Box_{R_{\le N}}$ — the substrate cannot witness the necessity claim it issued.
- **`Vary` omitted on negotiated responses.** A response whose body depends on `Accept-*` axes but whose `Vary` header omits those axes invites caches to serve the wrong fiber to subsequent requests; the substrate's emission is then non-functorial per [routing-as-predication-fibration-base-change](../theorems/routing-as-predication-fibration-base-change.md).
- **Headers declared after body emission.** HTTP/1.1 forbids modifying headers after the body has begun streaming; structurally, the substrate's wire commitment to the headers must be made before the body's emission begins. The witness records the complete header-and-body emission as a single substrate event.

## Position in the platform

Emit-response is the substrate's *HTTP-response primitive* — the wire-projection terminal of the request's path. Together with [handle-request](handle-request.md) (the substrate's primary request primitive composing routing, middleware, and handler) it completes the request/response cycle. Where handle-request orchestrates the substrate's three core constructions (routing as base-change, middleware as composition, content-negotiation as modal possibility), emit-response *projects them to the wire*: the verdict to the status-code's `FOUR`-corner, the negotiated world to the body's serialization, and the necessity commitment to the cache-control header. The wire's HTTP-response is exactly the trace of these three projections.
