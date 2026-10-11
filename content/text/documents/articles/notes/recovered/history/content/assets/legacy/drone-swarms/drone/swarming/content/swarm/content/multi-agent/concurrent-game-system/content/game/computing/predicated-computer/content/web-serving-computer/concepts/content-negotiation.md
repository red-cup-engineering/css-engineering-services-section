---
type: concept
class: web-protocol
depends-on:
  - endpoint
  - serialization-format
  - encode
  - modal-possibility-operator
  - bilattice-accessibility-relation
  - world-set
  - predication-fiber-algebra
  - twist-product-fusion
  - truth-order
see-also:
  - middleware
  - content-negotiation-as-modal-possibility-projection
  - cache-control-as-modal-necessity-along-time-accessibility
  - routing-as-predication-fibration-base-change
  - graded-dispatch-via-q-enriched-fusion
---

# Content negotiation

The *protocol by which client and server agree on response format*. The client expresses preferences via headers (`Accept`, `Accept-Language`, `Accept-Encoding`); the server selects from its available formats and produces a response in the chosen format.

Per [content-negotiation-as-modal-possibility-projection](../theorems/content-negotiation-as-modal-possibility-projection.md) (proved), this selection is *not* an ad-hoc preference-matching algorithm: it is structurally the [modal-possibility operator](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/morphisms/modal-possibility-operator.md) $\Diamond_R$ applied to the endpoint's representation family, where $R$ is the [bilattice-accessibility relation](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/bilattice-accessibility-relation.md) encoding the client's `Accept-*` weights and the [world set](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/objects/world-set.md) $W$ is the set of representations the endpoint can serve. The selected representation is the $\bigvee_t$-maximum (per the [truth-order](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/concepts/truth-order.md)) over $w' \in W$ of $R(\text{request}, w') \odot u_{w'}$ — a [twist-product fusion](../../../../../../../../../humanities/theories/math/theories/categories/theories/predication-categories/morphisms/twist-product-fusion.md) of preference-weight and representation-availability.

This is the dual of [cache-control](cache-control.md): cache-control is modal *necessity* along the time-accessibility relation; content-negotiation is modal *possibility* along the representation-accessibility relation. Together with [conditional-get-as-stalk-equality](../theorems/conditional-get-as-stalk-equality.md) they exhaust the modal account of HTTP response shape.

## Negotiation axes and their math roles

A content-negotiation declaration carries four axis families, each contributing one coordinate to the world-set $W$ over which $\Diamond_R$ joins:

- **Content-Type / Accept ↔ media-type axis of $W$.** `application/json` vs `application/xml` vs `application/yaml`. Per [serialization-format](../../teaching/explanations/serialization-format.md), the substrate may support multiple formats per endpoint; each supported format is a world $w' \in W$ carrying its own representation predication $u_{w'}$.
- **Language / Accept-Language ↔ language axis of $W$.** `Accept-Language: en, fr;q=0.8` enumerates language-worlds with truth-order weights. The $q$-parameter is a $\leq_t$-graded preference per the theorem's "Quality-values $q$ inhabit the truth-order" consequence.
- **Encoding / Accept-Encoding ↔ encoding axis of $W$.** `Accept-Encoding: gzip, br` enumerates encoding-worlds; the substrate selects an encoding the client admits (and the substrate supports) and applies the corresponding representation-rendering.
- **Character set / Accept-Charset ↔ charset axis of $W$.** Almost always UTF-8 in modern systems; structurally a world-axis with one dominant world.

The full $W$ is the product of axis-worlds; each $w' \in W$ corresponds to one substrate-recorded representation predication $u_{w'} \in A_p$ (the resource's value rendered in $w'$). The substrate's "available formats" enumeration *is* the substrate's listing of which axis-world combinations are realizable.

## The negotiation algorithm as $\Diamond_R$ computation

The conventional negotiation algorithm reduces step-by-step to evaluating $\Diamond_R$:

1. **Parse `Accept` header(s) → construct $R$.** Per the theorem's "`Accept-*` header parsing is accessibility-relation construction" consequence, header parsing translates directly into a bilattice-accessibility relation; no ad-hoc parser logic beyond mapping the header grammar to $R$ values.
2. **Match against the substrate's available formats → restrict to realized $w' \in W$.** Worlds the substrate cannot serve carry $u_{w'} = \bot$; $\bot$-cells contribute nothing to $\bigvee_t$.
3. **Compute the join** $\bigvee_t \{R(\text{request}, w') \odot u_{w'} : w' \in W\}$ — this is the selection step. The selected $w^*$ is the realizer of the join.
4. **`406 Not Acceptable` on $\bot$-join.** When all $R(\text{request}, w') = \bot$ (no client preference matches any realized world), $\Diamond_R$ returns $\bot$; the server emits `406`. This is the wire-side projection of the empty-join case.
5. **Encode in the chosen world.** Per [encode](../../../morphisms/encode.md), serialize the response in the format coordinate of $w^*$; set `Content-Type` and (if applicable) `Content-Encoding` to the wire-side names of the axes' values.

## Standard cases as $\Diamond_R$ corner shapes

- **Single-acceptable representation.** Only one $w'$ has $R(\text{request}, w') > \bot$; $\Diamond_R$ trivially selects it.
- **Multiple-acceptable, ordered preference.** `Accept: application/json;q=1.0, application/xml;q=0.5` weights JSON higher than XML in the truth-order; $\Diamond_R$ picks JSON if available, XML otherwise.
- **None acceptable.** All $R(\text{request}, w') = \bot$; $\Diamond_R$ returns $\bot$; wire `406 Not Acceptable`.
- **Wildcard acceptance.** `Accept: */*` makes $R(\text{request}, w') > \bot$ for every $w'$; the substrate picks per its own policy encoded in the $u_{w'}$ values (e.g., a default-representation predication is the one with highest $u$-truth among ties).

## Server-side override via $\odot$ asymmetry

When server policy must override client preference (e.g., refuse `Accept: text/html` for a JSON-only API), the substrate sets $u_{w'}$ at the html-world to $\mathbf{f}$ in the truth coordinate. Per the twist-product's absorbing behavior, $\mathbf{f}$ is absorbing in $\odot$ — forcing the candidate out of the $\bigvee_t$ even if $R$ ranks it highly. The substrate's policy is encoded as substrate content on the representation cells, not as a separate filter pass.

## Composition with parent disciplines

- **Composes with routing.** Per [routing-as-predication-fibration-base-change](../theorems/routing-as-predication-fibration-base-change.md), routing is the base-change $f^*$; content negotiation is $\Diamond_R$ on $f^*(v)$. The two operations commute on disjoint coordinates (routing picks the resource; negotiation picks the representation), so the order is immaterial.
- **Composes with caching.** The `Vary` header (per [cache-control](cache-control.md)) declares which `Accept-*` axes index the response's fiber; per [cache-control-as-modal-necessity-along-time-accessibility](../theorems/cache-control-as-modal-necessity-along-time-accessibility.md), cache-control's $\Box_{R_{\le N}}$ is per-fiber. Content-negotiation's $\Diamond_R$ chooses *which fiber* the response lives in; cache-control's $\Box_{R_{\le N}}$ commits *to that fiber's value's stability along time*.
- **Composes with cost.** Per [graded-dispatch-via-q-enriched-fusion](../../../theorems/graded-dispatch-via-q-enriched-fusion.md), enriching $R$ with a quantale grade lets the substrate prefer cheaper representations (smaller payload, cached, locally precomputed) among $\leq_t$-equivalent candidates — multiplicative grade composition with bilattice tag composition.

Per [conformance-implies-substrate-properties](../../../theorems/conformance-implies-substrate-properties.md), content-negotiation conformance is testable: present requests with various `Accept` headers, verify the substrate selects the representation realizing $\bigvee_t$. Per [round-trip-fidelity-per-format](../../../theorems/round-trip-fidelity-per-format.md), the substrate's content remains semantically equivalent across format-worlds; clients can request whichever representation they prefer without semantic loss.

## What the discipline refuses

- **Out-of-band negotiation.** A "negotiation" decided by client IP, geolocation, or other side-channel that is not part of the request's `Accept-*` payload sits outside $R$'s definition. Per [self-representation](../../teaching/explanations/self-representation.md), all selection criteria must be substrate content; out-of-band selection is non-conformant.
- **Hidden defaults.** A negotiation that returns a representation no client header endorsed (and is not a documented server-default) is not a $\bigvee_t$ over the accessibility relation. The server's default policy must be encoded in $R$ or $u_{w'}$ as substrate content, not in negotiation logic.
- **Non-monotone preference.** A client preference scheme where adding more `Accept` entries causes the server to *refuse* a representation it would have served on the smaller `Accept` set is non-monotone in $\leq_t$ — outside the modal-possibility frame.

## Position

Content negotiation is the web-server-platform's instantiation of modal possibility along the representation-accessibility relation. Together with [routing-as-predication-fibration-base-change](../theorems/routing-as-predication-fibration-base-change.md) (resource selection as base-change) and [middleware-composability](../theorems/middleware-composability.md) (request pipeline as natural-transformation composition), it grounds the web-server's three core operations in the predication-categories apparatus: routing is base-change, negotiation is modal possibility, middleware is composition. Together with [cache-control](cache-control.md)'s $\Box_{R_{\le N}}$ (necessity in time) and [conditional-get](../theorems/conditional-get-as-stalk-equality.md)'s stalk-equality (re-extension of necessity), content-negotiation's $\Diamond_R$ completes the modal account of HTTP response shape: necessity in time, possibility in representation, equality at the stalk.
