---
title: "UCAN as portable capability"
description: "Records the first UCAN brick in animating: a UCAN token is a signed, portable envelope for the existing Capability carrier, with delegation verified as attenuation."
date: 2026-06-25
status: implemented
---

# UCAN as portable capability

UCAN is the portable twin of the in-process OCap layer.
The first implementation lives at `lib/animating/src/writing/ucan/` and deliberately does not introduce a second authority ontology: a token's `authority` is the same `Capability` carrier already used by the ActivityPub OCap and CapTP bricks.

The map is direct:

- UCAN token = an attenuable `Capability` with signed provenance.
- Delegation chain = the existing capability `delegate` story, represented by each token's parent link.
- Ability narrowing = `attenuate`; verification rejects any child grant that widens its parent.
- Revocation = `revoke` over the carried capability.
- Proof = RSA-SHA256 through the same `signRequest` / `verifyRequest` primitive used for ActivityPub S2S signatures.

`issueUcan` signs the capability payload, issuer, audience, parent, and timestamp into the token proof.
`verifyUcan` walks the supplied ancestry, verifies every RSA proof, checks that each child issuer is the previous audience, checks that the token audience is the capability holder, and checks that each capability grant attenuates its parent.
A valid signature on a widened grant is still invalid as a UCAN.

The first green brick uses exact grants plus wildcard-prefix grants (`ledger|*` may attenuate to `ledger|read`) as the initial observable order.
Caveat algebra can be added later as more structure on the same `Capability` carrier, not as a parallel permission model.
