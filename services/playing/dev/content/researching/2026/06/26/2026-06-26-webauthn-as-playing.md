---
title: "WebAuthn, passkeys, and FIDO2 as playing: one-shot proof of possession"
description: "Adds WebAuthn/passkeys/FIDO2 to the relating family as the playing/OUT-face proof-of-possession ceremony. animating owns the coherent identity facet; playing owns registration-as-grant, challenge-as-one-shot, assertion-as-invoke, and the challenge-to-assertion cut."
date: 2026-06-26
status: implemented
---

# WebAuthn, passkeys, and FIDO2 as playing: one-shot proof of possession

WebAuthn is the OUT-face proof-of-possession standard.
The credential is not a new identity ontology here: bridge #5 already made the passkey credential a coherent facet of `AgentIdentity` in `lib/animating/src/writing/identity`. playing consumes that facet and owns the ceremony.

| WebAuthn term | playing reading |
|---|---|
| registration | `grant` of the credential as a held `CapabilityView` |
| credential id + RP id | the held locus, `webauthn:<rpId>:<credentialId>` |
| challenge | a one-shot invitation to exercise that locus |
| assertion | `invoke`: proof-of-possession of the held credential |
| challenge to assertion | the *-autonomous cut |

That is why a WebAuthn assertion exercises a HELD locus: proof-of-possession is a one-shot `invoke` whose authority is the held credential.
Registration grants the credential locus; the challenge names it once; the assertion converges only when `canInvoke` says the locus is held and the challenge has not already been spent.

## What landed

The implementation lives in `lib/playing`, coordinated with the existing animating identity facet:

- `lib/playing/src/carriers/index.mts`
  - `playing/webauthn/identity-facet`: a structural view of animating's
    `animating.webauthn-credential` facet, not a duplicate identity root.
  - `playing/webauthn/registration`: registration as a `CapabilityView` grant.
  - `playing/webauthn/challenge`: one-shot challenge naming the registered locus.
  - `playing/webauthn/assertion`: structural challenge-bound assertion.
  - `playing/webauthn/cut`: convergence witness for the ceremony.
- `lib/playing/src/webauthn.mts`
  - `register`, `challenge`, `verify`, `canAssert`, `assertCredential`, `cut`.
- `lib/playing/src/index.mts`
  - root exports under `webauthn` plus passkey/WebAuthn convenience names.
- `lib/playing/test/webauthn.test.mjs`
  - registration grants the animating facet as a held playing locus;
  - a credential is assertable iff the move is held (`canInvoke` soundness);
  - a fresh challenge prevents replay;
  - registration to challenge to assertion round-trips through the cut.

The family registry row is promoted in `2026-06-25-relating-family-of-named-systems.md`, and the standards-map row is promoted from candidate to built in `2026-06-25-protocols-as-faculty-projections.md`.

## Coherence With Animating

The authoritative identity facet remains in `lib/animating/src/writing/identity/index.mts` as `webauthnCredentialSchema` and `webauthnOfIdentity`.
It derives the credential id, RP id, public key, and key id from the single `AgentIdentity` root alongside Actor, DID, Agent Card, and VC subject facets.

playing imports none of that package and creates no second identity root.
Its `playing/webauthn/identity-facet` carrier is deliberately a view of the same wire shape (`kind: "animating.webauthn-credential"`), so the package boundary stays: animating owns identity, playing owns the ceremony/assertion.

## Crypto Modeling Assumption

This is a structural ceremony model.
It does not call a browser WebAuthn API, platform authenticator, CTAP device, attestation verifier, signature verifier, or cryptographic hash implementation.
The assertion's `clientDataHash`, `authenticatorData`, and `signature` are deterministic witness strings that bind credential, challenge, RP id, key id, and public key in the carrier.

That is enough for the faculty law landed here: registration is grant, assertion is invoke, freshness prevents replay, and convergence is exactly the cut against held authority.
Real cryptography belongs at a future wire/runtime boundary.

## Verification

`pnpm --filter @emsenn/playing run check` passed.

`pnpm --filter @emsenn/playing run build` passed so the dist-based tests would exercise the new exports.

`pnpm --filter @emsenn/playing run test` passed: 85 tests, 85 pass, 0 fail.
The new WebAuthn proof surface contributes 4 tests.

## Handoff

```json
{
  "system": "WebAuthn / passkeys / FIDO2",
  "package": "@emsenn/playing",
  "mapping": {
    "registration": "grant",
    "credential": "held locus",
    "challenge": "one-shot invitation",
    "assertion": "invoke",
    "challengeToAssertion": "*-autonomous cut"
  },
  "implemented_files": [
    "lib/playing/src/carriers/index.mts",
    "lib/playing/src/webauthn.mts",
    "lib/playing/src/index.mts",
    "lib/playing/test/webauthn.test.mjs",
    "dev/docs/notes/2026-06-25-relating-family-of-named-systems.md",
    "dev/docs/notes/2026-06-25-protocols-as-faculty-projections.md",
    "dev/docs/notes/2026-06-26-webauthn-as-playing.md"
  ],
  "coherent_with": [
    "lib/animating/src/writing/identity/index.mts"
  ],
  "proofs": [
    "credential assertable iff the move is held",
    "fresh challenge prevents replay",
    "registration to challenge to assertion round-trips through the cut"
  ],
  "open_seams": [
    "Cryptography and authenticator execution are structurally modeled, not performed.",
    "Challenge spending is represented by the caller's used-challenge ledger, not a persistent store in playing.",
    "Attestation formats and browser/WebAuthn wire codecs remain future runtime-boundary work."
  ]
}
```

## Cross-links

- [`2026-06-25-relating-family-of-named-systems.md`](2026-06-25-relating-family-of-named-systems.md)
- [`2026-06-25-protocols-as-faculty-projections.md`](2026-06-25-protocols-as-faculty-projections.md)
- [`2026-06-26-cross-protocol-coherence-and-the-bridge-slate.md`](2026-06-26-cross-protocol-coherence-and-the-bridge-slate.md)
- [`2026-06-26-unified-agent-identity.md`](2026-06-26-unified-agent-identity.md)
- [`2026-06-26-macaroons-as-playing.md`](2026-06-26-macaroons-as-playing.md)
- [`2026-06-26-wasi-as-playing.md`](2026-06-26-wasi-as-playing.md)
