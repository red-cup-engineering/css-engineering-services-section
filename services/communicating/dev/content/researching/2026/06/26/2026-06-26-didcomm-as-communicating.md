---
title: "DIDComm v2 as communicating"
description: "Places DIDComm v2 as the encrypted across-channel of lib/communicating: one membrane utterance sealed to portable DID identity. Sender DID is the utterance token, plaintext body is the claim, DIDComm message type is the illocutionary force, and the sealed JWM reads as private visibility (⊥ / absurd on ≤ₖ reach). Records the carrier mapping, proof, green law test, and open seams."
date: 2026-06-26
status: landed
---

# DIDComm v2 as communicating

DIDComm v2 belongs to **communicating's across face**.
The rule from the family registry and codecs-on-faces note is: a standard is owned by the face whose math admits it.
ActivityPub C2S/S2S was owned by the agency bulks because Actor/federation need glued agents and collectives.
DIDComm does not need the bulk first.
It is the private channel itself: a message crossing one membrane from one semiosphere/DID to another, sealed so only the addressed DID channel can open it.

The implemented brick is in [`lib/communicating/src/messaging/didcomm.mts`](../../../lib/communicating/src/messaging/didcomm.mts).

## The derivation

A DIDComm plaintext message is one membrane utterance:

- `from` is the sender DID and becomes the utterance token.
- `body` is the plaintext claim.
- `to[0]` is the DID at the other side of the private channel.
- `type` is the message's illocutionary force.

So a DIDComm message is not "JSON with some text in it."
It is `UtteranceCarrier(token = sender DID, claim = plaintext body)` with a force attached at the wire boundary.
That is exactly why it lives under `communicating/messaging`, not under WMAP's ActivityPub bulk.

The message `type` is the speech-act force because DIDComm's wire type is what the utterance is doing.
The implementation preserves the current communicating force taxonomy literally:

```ts
"assertive" | "directive" | "commissive" | "expressive" | "declaration"
```

No speech-act verb is collapsed to fit a generic envelope.
A directive remains a directive after seal/open; a declaration remains a declaration; the wire does not erase the act.

The sealed message is a JWM JSON serialization with literal DIDComm/JWM constants:

- `typ = application/didcomm-encrypted+json`
- `alg = dir`
- `enc = A256GCM`
- `skid = sender DID`

The ciphertext is authenticated with the protected header as AAD.
The value layer uses relating's canonical JSON boundary and Node's crypto primitives, adding no JSON-LD/JWM dependency.
The JSON-LD contexts are emitted as constants because this brick only needs the vocabulary it actually carries.

## Visibility

A sealed DIDComm message reads as private visibility:

```ts
didcommVisibility(sealed) === "absurd"
```

That is FOUR bottom (`⊥`) on `≤ₖ` reach.
The world can see that a sealed envelope exists, but the meme inside has no public epistemic reach until the DID channel opens it.
This is the private counterpart to the WMAP/ActivityPub visibility map: public/followers/unlisted/direct were reach values; DIDComm encrypted is the direct private case made cryptographic.

## What landed

- `didcommPlaintextMessageCarrier`: DIDComm plaintext as a communicating utterance view.
- `didcommSealedMessageCarrier`: encrypted JWM envelope with inline protected-header constants.
- `didcommMessageFromUtterance` / `utteranceFromDIDCommMessage`: functorial view between relating's `UtteranceCarrier` and DIDComm plaintext.
- `sealDIDCommMessage` / `openDIDCommMessage`: dependency-free AES-256-GCM JWM seal/open.
- `sealDIDCommUtterance` / `openDIDCommUtterance`: direct membrane utterance bridge.
- `didcommVisibility`: sealed messages read as `absurd` (`⊥` reach).

The law test is [`lib/communicating/test/didcomm.test.mjs`](../../../lib/communicating/test/didcomm.test.mjs): encrypt/decrypt round-trips sender/body/force losslessly and sealed visibility reads at bottom.

## Cross-links

- [`2026-06-25-relating-family-of-named-systems.md`](2026-06-25-relating-family-of-named-systems.md) — product-plane registry, now including DIDComm v2
- [`2026-06-25-codecs-on-faces-activitypub-across-scales.md`](2026-06-25-codecs-on-faces-activitypub-across-scales.md) — face-owned standards rule
- [`2026-06-25-dids-vcs-as-communicating.md`](2026-06-25-dids-vcs-as-communicating.md) — DID/VC identity substrate under WMAP
- [`2026-06-25-wmap-web-modeled-agency-protocol.md`](2026-06-25-wmap-web-modeled-agency-protocol.md) — public agency distribution surface; DIDComm is the private across-channel sibling

## Machine-readable handoff

```yaml
handoff:
  product: "DIDComm v2"
  status: "landed"
  package: "@emsenn/communicating"
  files:
    implementation:
      - "lib/communicating/src/messaging/didcomm.mts"
      - "lib/communicating/src/messaging/index.mts"
      - "lib/communicating/src/index.mts"
    tests:
      - "lib/communicating/test/didcomm.test.mjs"
    docs:
      - "dev/docs/notes/2026-06-25-relating-family-of-named-systems.md"
      - "dev/docs/notes/2026-06-26-didcomm-as-communicating.md"
  mapping:
    utterance_token: "DIDComm from / protected skid"
    utterance_claim: "DIDComm plaintext body"
    illocutionary_force: "DIDComm message type"
    private_visibility: "absurd"
    sealed_wire: "JWM JSON serialization with typ application/didcomm-encrypted+json"
  proof:
    law_test: "encrypt -> decrypt preserves sender/body/force and utterance canonical form"
    visibility_test: "sealed message reads at absurd, FOUR bottom on reach"
    gates:
      - "pnpm --filter @emsenn/communicating run check"
      - "pnpm --filter @emsenn/communicating run test"
  open_seams:
    - "Interop-grade DIDComm v2 authcrypt/anoncrypt recipient key agreement is not implemented; this value layer uses direct A256GCM with caller-supplied channel key."
    - "DID resolution and DIDComm service discovery are not implemented here; the carrier assumes caller-resolved DID channel keys."
    - "Packing multiple recipients and encrypted content encryption keys are not implemented; current sealed messages are one private channel."
    - "Attachment and return-route decorators are not implemented; add only when their communicating math is derived."
```

## Provenance

This brick derives from the 2026-06-25 family registry, the codecs-on-faces rule, the DIDs/VCs identity note, and WMAP's messaging surface (`openChannel`/`send`).
The operator's constraint was the build rule: the face owns the standard its math admits; derive, do not design.
The implementation is therefore a communicating carrier over relating's utterance and canonical JSON law, not a new messaging ontology.
