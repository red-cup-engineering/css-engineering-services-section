---
type: concept
class: web-protocol
depends-on:
  - endpoint
  - principal
  - principal-session
  - witness
  - signature
  - identity-key
  - evidence-vector
  - canonical-form
  - four-bilattice
see-also:
  - middleware
  - bearer-token-as-bound-evidence-vector
  - evidence-vector-as-canonical-binding-attestation
  - signature-binds-witness-to-identity
  - federation-trust-bilattice-graded
  - cors-as-bilattice-graded-origin-accessibility
---

# Bearer token

A *substrate-recorded credential carried in a request's `Authorization: Bearer <token>` header* (or equivalent — `Cookie` carrying a session token, signed query parameter, etc.) that binds the request to a [principal](../../teaching/explanations/principal.md) and the principal's authorized capabilities. Per RFC 6750, possession of the bearer token *is* the authorization — the substrate's verification is purely possession-of-a-canonical-form-binding, not a per-request handshake.

Per [bearer-token-as-bound-evidence-vector](../theorems/bearer-token-as-bound-evidence-vector.md) (proved), a bearer token is *structurally an [evidence vector](../../teaching/explanations/evidence-vector.md)* per [evidence-vector-as-canonical-binding-attestation](../../../theorems/evidence-vector-as-canonical-binding-attestation.md): a tuple of canonical-form digests over (issuer, subject, audience, scope, freshness window, nonce) with a [signature binding to identity](../../../theorems/signature-binds-witness-to-identity.md). Verification *binds* the request to the issuer's claim — it does not *attest* that the issuer's underlying authorization decision was sound. Conflating those two attestation strengths is the substrate's most common authorization-discipline failure.

## Two representational shapes for the same evidence vector

Bearer-token implementations come in two structural shapes that *differ in where the canonical-form bytes live* but agree in the underlying evidence-vector content:

- **Self-contained tokens** (JWT, PASETO, signed cookies, Macaroons, Biscuits). The canonical-form bytes of each evidence-vector entry are encoded *in the token itself* (typically base64url-canonicalized JSON or CBOR). The signature over the encoded vector is also in the token. The verifier reconstructs the vector from the token's bytes alone and checks the signature against the issuer's public [identity-key](../../teaching/explanations/identity-key.md). No substrate-side state is consulted for the binding check.
- **Handle tokens** (opaque session tokens, OAuth opaque access tokens). The token is a *handle* — a high-entropy random string — that names a substrate-recorded [principal-session](../../teaching/explanations/principal-session.md) entry; the evidence-vector entries live in that entry. Verification dereferences the handle to the entry and reads the canonical-form bytes from there. The substrate's own audit discipline plays the signature role: the entry's existence and integrity is what the substrate vouches for.

Both shapes are evidence vectors per the parent theorem; they differ in *the locus of the canonical-form bytes* and *the binding mechanism* (cryptographic signature vs substrate-recorded entry-integrity). The trade-off is between revocation latency (handle tokens revoke instantly; self-contained tokens revoke only at `exp` or via additional revocation lookup) and verification independence (self-contained tokens verifiable without contacting the issuer; handle tokens require issuer-store access directly or via RFC 7662 introspection).

## Common bearer-token shapes (refined by the two-locus distinction)

- **Opaque session token** — handle-shape; lookup against [principal-session](../../teaching/explanations/principal-session.md).
- **JWT (JSON Web Token)** — self-contained-shape; header + claims (`sub`, `iss`, `aud`, `exp`, `iat`, `scope`, `jti`) + signature using an [identity-key](../../teaching/explanations/identity-key.md) per [signature-binds-witness-to-identity](../../../theorems/signature-binds-witness-to-identity.md).
- **PASETO / Macaroon / Biscuit** — self-contained variants strengthening canonical-form discipline, adding caveat-attenuation as additional evidence-vector entries, or using authenticated encryption rather than signature.
- **OAuth access token** — issued by a separate authorization server; opaque (handle-shape, introspected via RFC 7662) or JWT (self-contained-shape).

## Endpoint declaration fields and their math roles

A bearer-token declaration on an [endpoint](endpoint.md) names five field families, each mapping to a fixed coordinate of the evidence-vector verification:

- **Required scopes ↔ the scope coordinate of the evidence vector.** The capability claims the token must carry to admit the request. Verification confirms the token's scope-claim covers the operation's required scope; this is a substrate-local check against the verifier's policy, not part of the binding.
- **Trusted issuers ↔ the issuer-trust accessibility-relation cell.** For JWT/OAuth, the [identity-key](../../teaching/explanations/identity-key.md) records whose signatures are accepted. Per [federation-trust-bilattice-graded](../../../theorems/federation-trust-bilattice-graded.md), the verifier's trust in issuer $I$ is a `FOUR`-valued cell; the token's binding is in $\mathbf{t}$ only when *both* signature-verification succeeds *and* $R_{\mathrm{fed}}(\mathrm{this}, I) = \mathbf{t}$.
- **Audience ↔ the audience canonical-form-hash entry.** The endpoint's substrate identifier; tokens with `aud` not matching the verifier are refused. The substrate must verify `aud == self`, *not* `aud ∈ trust-list` — the latter is the confused-deputy failure called out below.
- **Freshness window ↔ the necessity-along-time claim on the binding.** `exp` enforcement; tokens past expiry are refused. Per [cache-control-as-modal-necessity-along-time-accessibility](../theorems/cache-control-as-modal-necessity-along-time-accessibility.md), the freshness window is the issuer's modal-necessity claim along the time-accessibility relation; tokens past `exp` are *outside the issuer's necessity claim* and the substrate refuses them.
- **Revocation check ↔ the post-binding refinement source.** For opaque tokens, lookup against the session record; for JWT, optional revocation list. The verifier may consult a revocation source that strengthens the verdict from $\bot$ (have-not-checked) to $\mathbf{t}$ or $\mathbf{f}$.

Per [self-representation](../../teaching/explanations/self-representation.md), bearer-token policy is substrate content. Per [witness](../../../objects/witness.md), every accepted and rejected verification is recorded.

## Binding vs derivation: what verification does and does not attest

The token attests *that the issuer said this*. It does not attest *that what the issuer said is justified*. Concretely, the verifier sees `scope: ["transfer:funds"]` on a token signed by issuer $I$, and confirms $I$ committed to that scope claim. The verifier does *not* learn:

- That $I$ verified the principal's identity correctly before issuing the token (the issuer's authentication discipline).
- That $I$ had authority to grant the scope (the issuer's authorization discipline).
- That $I$'s policy at issuance time still holds at request time (the issuer's revocation discipline).
- That $I$ itself is trusted by the substrate to grant that scope (the verifier's federation-trust discipline).

These derivation attestations are *not in the evidence vector*. The verifier obtains them separately: issuer trust per [federation-trust-bilattice-graded](../../../theorems/federation-trust-bilattice-graded.md), revocation per substrate-side or out-of-band lookup, authorization decision per substrate-local policy.

## The four-corner verification verdict

Composing token binding, issuer trust, freshness, revocation, and scope produces a `FOUR`-valued verdict on the token's authorization for this request — matching the [status-code-classes-as-four-bilattice-values](../theorems/status-code-classes-as-four-bilattice-values.md) decomposition applied to the authorization sub-question:

- $\mathbf{t}$ — *valid authorization*: signature binds, issuer trusted ($\mathbf{t}$), within freshness window, not revoked, scope covers operation. Wire: substrate proceeds with the request under the principal's authority.
- $\mathbf{f}$ — *explicit refusal*: signature binds but issuer is denied ($\mathbf{f}$), token past `exp`, on revocation list, or scope insufficient. Wire: `401 Unauthorized` (signature/freshness/revocation problem) or `403 Forbidden` (scope insufficient).
- $\bot$ — *binding failure*: signature does not verify, token is malformed, issuer is unknown ($\bot$-trust). Wire: `401 Unauthorized` with `WWW-Authenticate: Bearer error="invalid_token"`.
- $\top$ — *contested*: issuer's trust at $\top$ (federation-disputed), or two revocation sources disagree, or substrate's revocation list is in $\top$ for this token. Wire: `5xx` until [repair-as-top-cell-resolution](../../../theorems/repair-as-top-cell-resolution.md) resolves.

## What the discipline refuses

- **Treating signature validity as authorization sufficiency.** A substrate that admits any request bearing a valid signature from any issuer in its trust list — without checking `aud`, `exp`, scope, or revocation — has elided the derivation-attestation step entirely. The signature only attests *that the issuer said this*; the substrate must additionally check *that what the issuer said authorizes the request*.
- **`alg: none` JWTs.** A JWT with `alg: none` carries no signature; the evidence vector is structurally absent. Implementations that admit such tokens have replaced binding with $\bot$-trust on every issuer claim. Refused unconditionally per the discipline.
- **`exp`-less tokens.** A bearer token without an explicit freshness window is the issuer's claim that the binding holds *forever* — a maximally-strong necessity claim per [cache-control-as-modal-necessity-along-time-accessibility](../theorems/cache-control-as-modal-necessity-along-time-accessibility.md) that is rarely the issuer's actual intent. Conformant issuers always set `exp`; conformant verifiers refuse `exp`-less tokens unless an out-of-band agreement justifies the unbounded necessity.
- **Confused-deputy across audiences.** Accepting a token whose `aud` is some other audience because that audience shares the trust-list with `self` is the substrate's failure to distinguish *this verifier's* `aud` cell from *another verifier's*. The `aud` claim is canonical-form bytes binding the token to a specific audience.
- **Storing bearer tokens unencrypted at rest.** A bearer token in possession is the credential; logging request `Authorization` headers records credentials. Per [encryption](../../teaching/explanations/encryption.md) and [identity-key-custody](../../teaching/explanations/identity-key-custody.md), tokens must be encrypted at rest, redacted from logs, and treated as the credential they are.
- **Reflecting tokens across hops.** Forwarding a bearer token to a downstream substrate is sharing a credential bound to `self` with another principal; the downstream's `aud == self` check should refuse it. Multi-hop authorization uses token-exchange (RFC 8693, fresh token per hop) or sender-constrained tokens (DPoP, mTLS-bound), not credential forwarding.
- **Canonical-form divergence between issuer and verifier.** A JWT's signature is over the base64url-encoded canonical form of (header || "." || payload). Per [hash-injectivity-under-canonical-form](../../../theorems/hash-injectivity-under-canonical-form.md), divergence in canonical-form discipline (JSON canonicalization, base64url alphabet, signing algorithm) produces verification failures even on legitimate tokens.

## Position

Bearer tokens are the web-server-platform's instantiation of the substrate's evidence-vector binding discipline at the per-request authorization boundary. Together with [cors-policy](cors-policy.md) (origin admission as bilattice-graded accessibility) and [rate-limit](rate-limit.md) (consumption gating as cost-quantale residuation), they ground the platform's three middleware-canonical disciplines — authentication, cross-origin admission, rate limiting — in the same predication-categories apparatus the substrate uses for federation, governance, and cost. The substrate's middleware is not a heuristic gate-pile; it is a structured composition of evidence-vector binding, accessibility-relation modal restriction, and cost-quantale residuation.
