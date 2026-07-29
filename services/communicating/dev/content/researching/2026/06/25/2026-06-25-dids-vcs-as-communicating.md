---
title: "DIDs + Verifiable Credentials as communicating: identity under WMAP"
description: "First green brick mapping W3C DIDs and Verifiable Credentials onto animating's communicating face + the capability layer — identity UNDER WMAP. A did:web DID is a portable re-reading of the WMAP Actor's host+path (it round-trips to the Actor IRI); a Verifiable Credential is exactly relating's charged claim (claim + FOUR charge) with an RSA proof produced by the SAME crypto as HTTP Signatures; a credential-as-capability reuses the activitypub Capability carrier verbatim. The joint, the brick, what's green, the frontier. Companion to the WMAP and protocols-as-faculty-projections notes."
date: 2026-06-25
status: design
---

# DIDs + Verifiable Credentials as communicating: identity under WMAP

The protocols map (`2026-06-25-protocols-as-faculty-projections.md`) flagged **DIDs + Verifiable Credentials** ◎ as *identity under WMAP*: a DID is an Actor id that isn't server-bound (it fixes the account-portability gap the C2S memo flagged); a VC is a capability-shaped, signed, portable claim.
This note records the first green brick that discharges that ◎ against animating's own carriers.

## The joint

WMAP gave the agent an **Actor** (`actorOfAgent`) — but the Actor `id` is a server-bound IRI: it names *where the agent's endpoints live*, so the identity dies with the server.
A **DID** is the same identity made **portable**.
The no-registry method `did:web` derives the identifier from the host + path the Actor already has — so it is **not a second identity** but a re-reading of the Actor's own address:

```
Actor.id  https://dev.bare-cedar-fog.emsenn.net/agents/sol
   ⇄
DID       did:web:dev.bare-cedar-fog.emsenn.net:agents:sol
```

A **Verifiable Credential** is, term-for-term, what `relating` already has: a **charged claim with provenance.**

- `credentialSubject` **is relating's `claim`** — token = who (the subject DID), claim = what is attested of them.
  (`claimOfCredential` reads the relating `claim` back out.)
- the credential's `charge` **is relating's FOUR bilattice value** — the issuer's evidenced truth-lean on the claim (`potential` / `active` / `stable` ⊤ / `stable` ⊥), not a boolean "valid".
- the `proof` is an **RSA-SHA256 signature** — the provenance that makes the charged claim *verifiable* rather than merely stated, produced by the **same `signRequest` / `verifyRequest` crypto the S2S HTTP-Signatures brick uses** (draft-cavage signing string over the credential's canonical fields).
  A VC proof is an HTTP Signature over the claim, not a new crypto stack.

So: **VC = charged claim + signature**; **DID = a portable Actor id**.
No second ontology — the protocol's objects are views of carriers that already exist.

## The brick

`lib/animating/src/writing/did/index.mts` (pure value layer; barrelled into `src/index.mts`):

- **did:web** — `didFromActor(actor, {publicKeyPem?})
  ` resolves an Actor to a DID document (`alsoKnownAs` → the Actor IRI; `service` → the inbox/outbox = the perceive/act legs; an optional published RSA key as a verification method).
  `didOfIri` / `iriOfDid` / `actorIdFromDid` are the spec-conformant address algebra (host-root → `did:web:host` resolving at `/.well-known/did.json`; path → colon-joined segments resolving at `…/did.json`).
- **Verifiable Credentials** — `issueCredential(issuerDid, subjectId, claim, charge, privateKeyPem, opts)` signs a charged claim; `verifyCredential(vc, publicKeyPem)` re-derives the canonical signing string and checks the RSA signature; the whole charged claim is bound (issuer/subject/claim/charge/date), so tampering **any** component fails verification.
  `claimOfCredential` is the inverse view.
- **credential-as-capability** — `issueCapabilityCredential(issuerDid, capability, privateKeyPem)` issues a VC whose subject **IS the activitypub `Capability`** (holder = subject, grants = the move), tagged `CapabilityCredential`, reusing the existing `Capability` carrier verbatim.
  Authority remains by **move**, not by paper: the holder is still gated by `canInvoke` — a signed VC for a move you do not hold is unexercisable.

Carriers are single-source via relating's `carrier()` (TypeBox, bare descent-path `$id`: `animating/writing/did/document`, `animating/writing/did/credential`).
Imports are only the stable apex (`@emsenn/relating` root: `carrier`, `mark`, `claim`, `charge`-name type) and animating's own sibling bricks (`Actor`, `signatures`, `Capability`).

## What's green

`test/did.test.mjs` — 6/6:

1. a did:web DID round-trips with an Actor (`actorId → did → actorId` is the identity);
2. a host-root actor yields a bare `did:web` with the well-known resolution URL;
3. a published RSA key rides the DID document as a verification method;
4. a signed VC verifies and its charged claim reads back as the exact relating `claim`;
5. a tampered VC fails — separately for a forged **claim**, **charge**, and **subject** (the proof binds the whole charged claim, not a part);
6. a credential-as-capability reuses the `Capability` carrier and is still `canInvoke`-gated.

Full animating suite stays green (72/72) — the barrel append broke no sibling.

> Build note: `pnpm --filter @emsenn/animating run check` currently reports 4 errors in `src/becoming/**` — these are an **in-progress peer FromSchema migration** (the `TSchema`/`Static` mismatches from "drop typebox+ajv"), entirely outside this brick.
> This brick's own files are clean (`tsc` emitted `dist/writing/did/` with no did errors) and its tests pass against `dist/index.mjs`.
> Do not "fix" the becoming errors here.

## The frontier

This is brick 1 — the value layer (carriers + resolve/issue/verify), like WMAP's first brick.
Deferred, all recorded so none is faked:

- **DID resolution transport** — the live `GET /.well-known/did.json` (and path `did.json`) route, the did:web twin of `routeActor`/`webfinger`.
  The address algebra is here; the HTTP binding is a later brick (transport in lib, not a site — the WMAP rule).
- **Key rotation & multi-key** — DID documents currently publish one `keys-1`; rotation, `authentication` vs `assertionMethod` relationships, and key history are unhandled.
- **Revocation / status** — a VC carries no `credentialStatus`; revocation should reuse the capability brick's `revoke` (`Undo` = truth-axis `negate`, grant ⊔ revocation → ⊤), giving a paraconsistent status list rather than a boolean CRL.
  Not yet built.
- **JSON-LD data-integrity proofs & selective disclosure** — the proof here is a plain RSA-SHA256 over a draft-cavage signing string (the HTTP-Signatures primitive), not a canonicalized JSON-LD `DataIntegrityProof`, and there is no BBS+ selective disclosure.
  A real interop brick would add URDNA2015 canonicalization; deferred deliberately to avoid a JSON-LD-processor dependency in the value layer.
- **did:key / did:plc** — only did:web is realized (it needs no registry and re-reads the Actor).
  Other methods are separate bricks.

## Cross-links

- [`2026-06-25-wmap-web-modeled-agency-protocol.md`](2026-06-25-wmap-web-modeled-agency-protocol.md) — the WMAP substrate this is identity *under*
- [`2026-06-25-protocols-as-faculty-projections.md`](2026-06-25-protocols-as-faculty-projections.md) — the map (DIDs+VCs ◎, now one brick toward ✓)
- [`2026-06-25-captp-as-playing.md`](2026-06-25-captp-as-playing.md) — the sibling out-face brick that likewise reuses the `Capability` carrier

## Provenance

The DIDs+VCs ◎ mapping is the operator's protocols map.
The joint (VC = charged claim + signature; DID = portable Actor id; credential-as-capability) is this session's realization, checkable against the built carriers and the green test — not a settled citation. did:web address algebra follows the W3C did:web method spec; the VC shape follows W3C VC Data Model v1 (with a deliberately simplified RSA proof, see frontier).
