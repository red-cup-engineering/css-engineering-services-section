---
title: "RWIL — the Relation-Witness Information Log"
description: "Names the third product of the relating family, alongside relating's RMN (Relation Model Notation) and animating/organizing's WMAP (Web-Modeled Agency Protocol). RWIL is the log->state->record->content substrate already built green in lib/relating/src/running/ledger/ ('the witness ledger as boundary-to-bulk holography'), given its product identity and theorized from information theory. The load-bearing claim: the bilattice knowledge order <=k IS an information order (Belnap), so the witness ledger is information-native, not information-flavored. The four tiers are the source and its statistics/codes; the log->state->record->content chain is a Markov chain governed by the data-processing inequality, which is also the boundary->bulk holographic arrow. RWIL is the IN-face (knowing/computing) memory standard the codecs-on-faces note left open, and WMAP's outbox is one channel-code of the RWIL log (source/channel separation = the data-form/wire-form split). The headline claim — outbox ≅ a channel-code of the log — is proven green (animating/writing/activitypub/ledger.mts + rwil-outbox-iso.test.mjs): a structure-preserving isomorphism (lossless, merge-commuting, ⊤-preserving) against the real ledger, with the rate-distortion seam (eavtId keys with time, mergeKey without) made explicit. RWIL is the wire/codec layer of witnessed relations and stays at running/ledger — no file relocation."
date: 2026-06-25
status: design
---

# RWIL — the Relation-Witness Information Log

**RWIL** is the name for the `log -> state -> record -> content` substrate built green in [`lib/relating/src/running/ledger/`](../../../lib/relating/src/running/ledger/index.mts), where its own header already calls it *"the witness ledger as boundary-to-bulk holography… event sourcing in the package's own vocabulary."* The substrate is real and in use; what it lacked was a product identity and a theory.
This note supplies both, with **information theory as the spine.**

Parse it against the code, not as a slogan: a **Relation-Witness** is exactly what an `EAVT` row is — a witness, at time `T`, of a relation cell (`writing/eavt.mts`'s `Cell` is literally `{subject, predicate, object}`); the **Information Log** is the append-only source of those witnesses, whose values live on the bilattice **information** order.
RWIL is to *witnessed time* what **RMN** (Relation Model Notation, `relating`) is to *relations as terms* and **WMAP** (Web-Modeled Agency Protocol, `animating`/`organizing`) is to *agency over the web*: a named product of one family.

- **RMN** — the substrate: relations as terms.
- **WMAP** — RMN projected *across* (agency over the web; the across face).
- **RWIL** — RMN projected *through time* (witnessed information as memory; the IN face).

## The thesis: memory is the information-loss fold of witnessed relations

We did not bolt information theory onto a log.
The substrate is *already* an information-theoretic object, for one load-bearing reason:

**The bilattice knowledge order `<=k` IS an information order.** Belnap's FOUR — the corpus's truth carrier — was introduced as a theory of information from sources: ⊥ = told nothing, t / f = told one bit, ⊤ = told both (conflict held).
`<=k` measures *how much you have been told*.
So **witnessing = climbing `<=k` = receiving information = reducing uncertainty**, and an RWIL cell's charge `⟨a₊, a₋⟩` is evidence-for / evidence-against measured on that axis.
RWIL is information-native, not information-flavored: its codomain *is* the information lattice, with `<=t` orthogonal as the assertion axis.

## The four tiers are the source and its statistics/codes

In Shannon's frame there is one primitive — **the source** — and everything else is a *code* (a re-representation for a channel) or a *statistic* (a summary for a query).
The four tiers fall exactly into that division, which is why the product is named after the **Log** (the source) and not the whole ledger: the other three carry no information the log does not.

| information-theory object | RWIL tier | the law it gives |
|---|---|---|
| **source** | **log** (`<logDir>/<feed>.jsonl`, append-only EAVT) | its true size is its **entropy**, not its event count |
| sufficient statistic | **state** (`<stateDir>/<feed>.json`, current view) | discard the log losslessly for current-value queries |
| rate-distortion code | **record** (`<recordDir>/<feed>.jsonl`, settled Datoms) | compact to the settled invariants' entropy, no smaller |
| lossy cut | **content** (`<contentDir>/<term>/…`) | browsable projection, lowest fidelity |

`state` is the minimal sufficient statistic of the log for "current value of each cell" (`projectStateView`: attributes whose latest witness wins) — delete the log, keep state, lose nothing *for that query class*.
`record` is a rate-distortion compaction (`commitRecord` keeps settled Datoms, the EAVT plus the fifth-slot *reading*, and drops the witnesses settling made redundant).
The log is the only irreducible tier. **Name the irreducible thing.**

## The chain is a Markov chain, and the data-processing inequality is the holographic arrow

`log -> state -> record -> content`: each tier a deterministic projection of the prior.
That is a Markov chain, and the **data-processing inequality** governs it — for any query `Q`, `I(Q; tierₙ) ≤ I(Q; tierₙ₋₁)`.
Information is monotone non-increasing along the fold; it is held or lost, never created.

This gives the **arrow of the holography for free**: boundary→bulk (log→bulk) = the information-loss direction = the fold direction.
The three are one arrow.
It also makes "what may a tier discard?" a theorem, not a judgement call: exactly the bits redundant for that tier's query class, no more.
State may forget history, never the current cell; record may forget superseded witnesses, never a reading.

## What information theory changes about the build

1. **Dedup is the surprisal law — and it is already there.** `appendWitnesses` content-dedups by `eavtId`; a witness already held carries `-log 1 = 0` bits, so storing it must cost nothing.
  The dedup is correctness, not optimization: the log's true size is its entropy.
  The same law fixes the compaction trigger — compact when the residual surprisal of old witnesses, *given* the settled Datom, has gone to zero.
2. **⊤ is maximal information, so holding conflict is information-optimal.** A contradicting witness is maximally surprising against a one-sided prior — it carries the most bits of any event.
  Pooling assert + `Undo` to ⊤ and keeping both witnesses is the information-correct move; discarding the conflict discards the highest-information observation.
  This is the *same* paraconsistent-information law WMAP states as "conflict as a first-class held value" — shared because both share the `<=k` codomain.
3. **The reader is a channel with a bit budget.** An agent reading RWIL through a context window is a channel; `state`/`record`/`content` exist to compress the source to fit it without losing the bits the current query needs.
  The cockpit "handoff" carrier is precisely a sufficient statistic chosen for the "what does the next session need" query — it should *be* an RWIL `projectFeedState`, not a hand-rolled blob.

## Source/channel separation = the data-form/wire-form split (and the WMAP unification)

Shannon's separation theorem: source codes and channel codes may be designed independently.
That *is* today's "no second ontology" gate.
The **data-form** is the source symbol — `EAVT` / `Datom`, fixed once.
The **wire-forms** are channel codes over transports with different loss/noise profiles: `application/eavt+jsonl` on the filesystem (the `store.mts` binding), an SSE frame, or an **ActivityStreams `OrderedCollection`**.

So the unification with the [WMAP](2026-06-25-wmap-web-modeled-agency-protocol.md) / [codecs-on-faces](2026-06-25-codecs-on-faces-activitypub-across-scales.md) work, stated exactly: **RWIL is the source; WMAP's outbox is one channel-code of it.** An Activity crossing the membrane is a log witness; the AS2 `OrderedCollection` outbox is the log; `mergeActivities` (CRDT, retains assert+Undo) is `appendWitnesses` (monotone content-dedup append); federation's `contested = ⊤` is the bilattice charge on the cell.
The boundary→bulk holography is currently built twice — once as `running/ledger` (`eavt+jsonl`), once as `animating/writing/activitypub/collections` (AS2-over-HTTP).
They are one source under two channel codes.
The first provable claim of this note is `outbox ≅ a channel code of the log`.

## The proof: the outbox IS the log (landed green 2026-06-25)

The one falsifiable claim — `outbox ≅ a channel-code of the log` — is built and green.
The functor is [`lib/animating/src/writing/activitypub/ledger.mts`](../../../lib/animating/src/writing/activitypub/ledger.mts): `F = activityCell` (Activity → EAVT witness), `G = activityFromCell` (the inverse).
It is deliberately tiny — `F` reuses the existing `utteranceFromActivity`/`activityFromUtterance` bridge verbatim; the **only** thing the EAVT form adds is carrying the activity's `published` into the witness slot `T`.
So the log is the across-face bridge, *with time*.

The claim proven is not "you can convert one format to the other" (that is merely two formats).
It is that the conversion is a **structure-preserving isomorphism** — lossless AND merge-commuting AND conflict-preserving — verified against the *real* relating ledger (`appendWitnesses`, `projectStateView`) and the *real* across-face reader (`answer`), not a mock.
The law test is [`lib/animating/test/rwil-outbox-iso.test.mjs`](../../../lib/animating/test/rwil-outbox-iso.test.mjs) (4/4 green; suite 56/56):

- **L1 lossless channel** — `G ∘ F = id` on canonical activities (round-trip drops nothing).
- **L2 surprisal-dedup** — a repeated witness is 0 bits: the ledger's idempotent append is the surprisal law, not an optimization.
- **L3 ⊤-preservation** — assert + `Undo` is held as ⊤ on *both* channels: `answer` reads knows-both on the outbox; the state set accumulates `{assert, deny}` on the log.
  No witness dropped, either side.
- **L4 the bulk merge-square + the honest seam** — the state projection's distinct standings equal exactly the time-forgotten merge partition (organizing's `mergeActivities` dedup, specified by `standingKey`).
  The square commutes **at the bulk**.

The seam L4 makes explicit is the interesting part, not a flaw.
The two channels do *not* dedup by the same identity: the log's `eavtId` keys on `[E, A, V, T]` (with time); the outbox's `mergeKey` keys on `(actor, type, claim)` (no time).
So two acts identical in `(who, polarity, what)` at different times are **two rows** in the log but **one standing** in the merged outbox.
That is the rate-distortion boundary made visible: **the log is a strict time-refinement (the richer source); the merged outbox is its sufficient statistic for "standing," where time has already done its latest-wins job.** Source ⊒ statistic, and they agree exactly at the bulk — the data-processing inequality, demonstrated in code.

The scale-2 leg is closed too: [`lib/organizing/test/rwil-merge.test.mjs`](../../../lib/organizing/test/rwil-merge.test.mjs) (3/3; suite 45/45) binds L4 to the *real* federation CRDT — `mergeActivities` dedups Activities by exactly the `(who, polarity, what)` standing partition, and the CRDT laws (idempotent / commutative / associative) and cross-camp ⊤-retention hold.
The square commutes against the actual S2S merge, not just the `standingKey` spec.
(Scope: the canonical `{Create, Undo}` outbox form, the iso's stated domain.)

## Placement: RWIL is a first-class capability (landed 2026-06-25)

RWIL's witness ROW codecs (EAVT/Datom/triple) are wire forms and stay in `writing/` (like `rmn.mts`); its projection ENGINE — log→state→record→content — was extracted from `running/ledger/` to a first-class **`src/ledger/`**, peer to `writing`/`evaluating`/`running` rather than buried as a child of `running`.
This mirrors how RMN is first-class via two homes (a `writing/rmn` codec + the `evaluating/` engine); RWIL is now first-class via a `writing/{eavt,datom,triple}` codec leaf + the `ledger/` engine.
Public subpath **`@emsenn/relating/ledger`**, with the legacy **`@emsenn/relating/running/ledger`** kept as a stable alias (zero downstream breakage; relating 241/241, cross-package 4/4 green).
The *invocation* ledger (`E = caller, A = morphism + args, V = return, T = time`) stays a `running/` concern that witnesses its dispatches into RWIL — a feed, a use of the engine.

## Maturity (said plainly)

Real, green, dogfooded — research-grade, not hardened.
The four tiers, EAVT/Datom, dedup, state projection, record compaction, and the fs binding all exist and pass (`lib/relating/test/holography.test.mjs`).
The `outbox ≅ log` unification with WMAP is now also built and green (the proof section above; `rwil-outbox-iso.test.mjs`, suite 56/56).
What remains *new* is the identity and the theory: the name and the information-theoretic reading.
Those claims (Belnap `<=k` as information order; the four tiers as source/statistics/codes; DPI as the holographic arrow; source/channel = data-form/wire-form) are checkable design claims against the built ledger — and L1–L4 now check one corner of them mechanically — not settled citations.

## Where it lives

- Engine: [`lib/relating/src/ledger/`](../../../lib/relating/src/ledger/index.mts) (`store`, `state`, `feed`, `content`, `cells`, `stream`) — first-class, subpath `./ledger`.
- Row codecs: `writing/{eavt, datom, triple}` (wire forms, stay in the codec layer).
- Proof / WMAP bridge: [`lib/animating/src/writing/activitypub/ledger.mts`](../../../lib/animating/src/writing/activitypub/ledger.mts)
  + [`lib/animating/test/rwil-outbox-iso.test.mjs`](../../../lib/animating/test/rwil-outbox-iso.test.mjs).
- Sibling products: [RMN]; WMAP at [`2026-06-25-wmap-web-modeled-agency-protocol.md`](2026-06-25-wmap-web-modeled-agency-protocol.md) and the placement principle at [`2026-06-25-codecs-on-faces-activitypub-across-scales.md`](2026-06-25-codecs-on-faces-activitypub-across-scales.md).

## Provenance

The name RWIL — Relation-Witness Information Log — is the operator's (2026-06-25), with the information-theory lens his steer.
Grounded in code read this session (`running/ledger/{index,store}.mts`, `writing/eavt.mts`) and in the WMAP and codecs-on-faces notes.
The `<=k`-is-an-information-order reading (Belnap), the source/statistic reading of the four tiers, the DPI-as-holographic-arrow, the surprisal/rate-distortion readings of dedup and compaction, and the `outbox ≅ channel-code-of-the-log` unification are this session's synthesis — checkable claims to verify against the built ledger, not settled citations.
