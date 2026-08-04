---
title: "AT Protocol as socializing"
description: "Places AT Protocol (Bluesky repos, Lexicons, and the firehose) as a second across-federation channel-code of socializing, proving the across face is protocol-agnostic rather than ActivityPub-specific. A per-actor signed repo is an RWIL witness log scoped to one observer; commits are witnesses, Lexicons are typed carriers admitted through carrierFrom, the firehose is socializing.broadcast, and repo merge is exactly the existing CRDT knowledge join."
date: 2026-06-26
status: implemented
---

# AT Protocol as socializing

AT Protocol is now the second across-federation wire in `lib/socializing`.
The point is not "also support Bluesky" as a product feature.
The point is the more important family claim: **the across face is protocol-agnostic**.
ActivityPub/WMAP and AT Protocol are two channel-codes of the same socializing mesh.

The placement follows the face rule from [`2026-06-25-codecs-on-faces-activitypub-across-scales.md`](2026-06-25-codecs-on-faces-activitypub-across-scales.md): a standard is owned by the face whose faculty-math makes it possible.
ActivityPub's Actor/C2S/S2S seam proved the WMAP path through `animating` and `organizing`.
AT Protocol lands on `socializing` because its primitive object is not the agent-as-Actor but the **inter-observer replicated repository**: signed per-account data, synchronized through repo events, with app semantics declared by Lexicon.

## The derivation

AT Protocol's repository spec says a repo is a signed per-account record store with monotone revisions, content-addressed data, and a signed commit object.
Read through RWIL:

- the **repo DID** is the observer scope
- the **repo path** is the entity address inside that observer's stalk
- the **commit operation** is the witnessed cell
- the **commit revision / CID / signature** is the witness coordinate
- the **record** is the value carried by the cell

So an AT repo is an **RWIL witness log scoped to one observer**.
Commits are not translated into a second persistence model; they are projected to `@emsenn/relating/ledger` cells.
The implementation is `witnessLogFromAtRepoCommit`, `witnessLogFromAtRepo`, and `atRepoFromWitnessLog` in [`lib/socializing/src/writing/atproto/index.mts`](../../../lib/socializing/src/writing/atproto/index.mts).

AT Protocol's sync spec names the repository event stream, commonly the firehose, as the real-time stream of repo changes.
Read through socializing: the firehose is exactly `broadcast` at the wire boundary.
`firehoseFromAtRepo` projects a repo's commit sequence as sequence-addressed commit events.
Nothing about this makes ActivityPub special; it shows the same across face can emit different public wires.

Lexicon is the carrier story.
A Lexicon does not introduce a runtime code generator here.
It is a protocol-authored typed carrier declaration.
The implementation admits Lexicon documents with `atLexiconCarrier`, translates record definitions to JSON-Schema literals with `jsonSchemaFromLexiconRecord`, then calls `carrierFrom`.
That is the same normative kernel rule used by the CRDT brick: **one `as const` schema literal, `FromSchema`, and the relating-owned validator; no TypeBox, no Ajv, no codegen**.

## Merge is already the law

The CRDT note [`2026-06-25-crdt-as-socializing-merge.md`](2026-06-25-crdt-as-socializing-merge.md) settled socializing merge as pointwise `<=_k` join:

```txt
merge(a, b)[key] = a[key] ∨_k b[key]
```

AT repo merge reuses that exact substrate.
`crdtStateFromAtRepo` lowers repo records into the existing state-CRDT carrier; `mergeAtRepos` delegates to `mergeCrdtStates`.
Concurrent different records at the same repo path are retained as multi-value writes, so the merged cell rises to `stable` (`⊤`) with both witnesses retained.
There is no last-writer-wins clock, no bespoke repository merge algorithm, and no protocol-specific conflict ontology.

## Implemented surface

Realizing files:

- [`lib/socializing/src/writing/atproto/index.mts`](../../../lib/socializing/src/writing/atproto/index.mts)
  - `AtRepoCommitSchema`, `AtRepoSchema`, `AtLexiconSchema`, `AtFirehoseCommitSchema`
  - `atRepoCommit`, `atRepo`
  - `witnessLogFromAtRepoCommit`, `witnessLogFromAtRepo`, `atRepoFromWitnessLog`
  - `firehoseCommitFromRepoCommit`, `firehoseFromAtRepo`
  - `crdtStateFromAtRepo`, `mergeAtRepos`
  - `jsonSchemaFromLexiconRecord`, `carrierFromLexiconRecord`
- [`lib/socializing/src/index.mts`](../../../lib/socializing/src/index.mts) exports the public AT surface.
- [`lib/socializing/test/atproto.test.mjs`](../../../lib/socializing/test/atproto.test.mjs) proves the laws from the public package surface after build.

The law test proves:

- an AT repo round-trips to a witnessed RWIL log
- a Lexicon validates through `carrierFrom`
- merge of two AT repos is exactly the CRDT join, with idempotent/commutative/associative behavior inherited from `mergeCrdtStates` and `⊤` retained for concurrent conflicting records

Verification:

- `pnpm --filter @emsenn/socializing run check`
- `pnpm --filter @emsenn/socializing run build`
- `pnpm --filter @emsenn/socializing run test` — 142/142 passing

## Family reading

AT Protocol does not replace WMAP.
It proves WMAP was not ActivityPub-shaped by accident: the across face can project the same socializing mesh through more than one standard wire.

| wire | channel-code | socializing reading |
|---|---|---|
| ActivityPub / WMAP | Actors, Activities, inbox/outbox, S2S delivery | agent/camp federation over the across face |
| AT Protocol | signed repos, Lexicons, firehose | observer-scoped witness logs, typed carriers, broadcast |

Both wires are lawful because both are downstream of the same substrate:

```txt
relating ledger (RWIL)
  -> socializing merge (CRDT ∨_k)
  -> across-federation channel-code
     -> ActivityPub / WMAP
     -> AT Protocol
```

The result is a cleaner product-plane statement: **socializing owns across-federation mesh law; ActivityPub and AT Protocol are protocol surfaces of that mesh.**

## Sources

- [`2026-06-25-relating-family-of-named-systems.md`](2026-06-25-relating-family-of-named-systems.md)
- [`2026-06-25-codecs-on-faces-activitypub-across-scales.md`](2026-06-25-codecs-on-faces-activitypub-across-scales.md)
- [`2026-06-25-crdt-as-socializing-merge.md`](2026-06-25-crdt-as-socializing-merge.md)
- [`2026-06-25-wmap-web-modeled-agency-protocol.md`](2026-06-25-wmap-web-modeled-agency-protocol.md)
- AT Protocol repository spec: <https://atproto.com/specs/repository>
- AT Protocol sync/firehose spec: <https://atproto.com/specs/sync>
- AT Protocol Lexicon spec: <https://atproto.com/specs/lexicon>
