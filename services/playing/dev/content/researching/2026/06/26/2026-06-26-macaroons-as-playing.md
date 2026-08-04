---
title: "Macaroons and biscuit as playing: caveat-attenuated capability tokens"
description: "Adds macaroons/biscuit to the relating family as the playing/OUT-face portable capability-token projection. A caveat is attenuation/dualize, a caveat-chain is monotone authority narrowing, verification is canInvoke after every caveat holds, and a third-party caveat discharges by delegated name-passing. Records the structural crypto model and law tests in lib/playing."
date: 2026-06-26
status: implemented
---

# Macaroons and biscuit as playing: caveat-attenuated capability tokens

Macaroons and biscuit are portable capability tokens whose authority is narrowed by caveats.
In platform language, a root token is attenuated by appending caveats; a service verifies the chain and then admits the request only if every caveat is satisfied.
Biscuit adds a logic-flavored authorization language, but the authority shape is the same: token plus monotone caveat constraints.

In the relating family this is the cleanest OUT-face fit on the board:

| macaroons / biscuit | playing / OCap theorem |
|---|---|
| root token | a view of an existing `CapabilityView` |
| caveat | `attenuate` = dualize / restriction |
| caveat chain | monotone authority narrowing |
| verification | `canInvoke` after all caveats hold |
| third-party caveat | delegated discharge = name-passing |

So a macaroon is not a new permission ontology.
It is a functorial view over the same capability carrier used by the WMAP/OCap, UCAN, CapTP, and WASI bricks: `grant` gives a held move, `attenuate` narrows it, `invoke` exercises it, and `canInvoke` remains the soundness gate.

## What landed

The implementation lives in `lib/playing`, because macaroons/biscuit are a scale-1 OUT-face wire for exercising attenuated capability tokens:

- `lib/playing/src/carriers/index.mts`
  - `playing/macaroons/caveat`: first- or third-party caveat, carrying the
    narrowed grant.
  - `playing/macaroons/token`: token plus carried `CapabilityView`, caveats, and
    structural HMAC-chain witness.
  - `playing/macaroons/discharge`: delegated third-party caveat discharge.
  - `playing/macaroons/invocation`: invocation admission result.
- `lib/playing/src/macaroons.mts`
  - `macaroonFromCapability`, `caveat`, `thirdPartyCaveat`, `attenuate`,
    `discharge`, `verifyMacaroon`, `canInvoke`, and `invoke`.
- `lib/playing/test/macaroons.test.mjs`
  - adding a caveat narrows authority monotonically;
  - a macaroon is exercisable iff every caveat is satisfied and the move is
    held by `canInvoke`;
  - a third-party caveat discharges by delegated name-passing.

The carriers are literal JSON Schema declarations with `as const`, `carrierFrom`, and `FromSchema`.
There is no TypeBox, Ajv, codegen, or new dependency.

## Crypto modeling assumption

This brick models the HMAC caveat-chain structurally.
The token `signature` field records the previous signature plus the caveat id, predicate, and narrowed grant as a deterministic witness string.
That proves the carrier law and attenuation shape without pretending to be production cryptography.

Real HMAC signing, biscuit Datalog authorization, root-key handling, nonce binding, and replay controls belong at a future wire package boundary.
The playing layer settles the capability algebra first: caveat append is authority narrowing, and verification is the cut against held affordances.

## Why this is the same theorem as UCAN and WASI

The UCAN brick in `animating` verifies real RSA delegation proofs and checks that each child token attenuates its parent.
This macaroon brick imports that lesson but keeps playing focused on the OUT-face law: the caveat chain is the attenuation chain, and a third-party caveat is a delegated discharge.

The WASI brick in `playing` already exposes `CapabilityView` and `canInvoke` as a local sandbox handle.
Macaroons/biscuit are the portable token version: the token can travel offline, but it only converges when its final narrowed grant is still a move the holder has.

## Handoff

```json
{
  "system": "Macaroons / biscuit",
  "package": "@emsenn/playing",
  "mapping": {
    "token": "CapabilityView carried as portable OUT-face authority",
    "caveat": "attenuate/dualize",
    "caveatChain": "monotone authority narrowing",
    "verify": "all caveats satisfied, then canInvoke",
    "thirdPartyCaveat": "delegated discharge by name-passing"
  },
  "implemented_files": [
    "lib/playing/src/carriers/index.mts",
    "lib/playing/src/macaroons.mts",
    "lib/playing/src/index.mts",
    "lib/playing/test/macaroons.test.mjs",
    "dev/docs/notes/2026-06-25-relating-family-of-named-systems.md",
    "dev/docs/notes/2026-06-25-protocols-as-faculty-projections.md",
    "dev/docs/notes/2026-06-26-macaroons-as-playing.md"
  ],
  "proofs": [
    "adding a caveat narrows authority monotonically",
    "a macaroon is exercisable iff every caveat is satisfied and the move is held",
    "a third-party caveat discharges by delegated name-passing"
  ],
  "verification_gate": [
    "pnpm --filter @emsenn/playing run check",
    "pnpm --filter @emsenn/playing run test"
  ],
  "open_seams": [
    "HMAC signatures are structurally modeled, not cryptographically executed.",
    "Biscuit's full Datalog authorizer is not implemented in this brick.",
    "The grant order supports wildcard-prefix and existing playing/WASI path narrowing; a richer capability lattice can refine it later without changing the carrier theorem."
  ]
}
```

## Cross-links

- [`2026-06-25-relating-family-of-named-systems.md`](2026-06-25-relating-family-of-named-systems.md)
- [`2026-06-25-protocols-as-faculty-projections.md`](2026-06-25-protocols-as-faculty-projections.md)
- [`2026-06-25-ucan-as-capability.md`](2026-06-25-ucan-as-capability.md)
- [`2026-06-26-wasi-as-playing.md`](2026-06-26-wasi-as-playing.md)
- [`2026-06-25-captp-as-playing.md`](2026-06-25-captp-as-playing.md)
