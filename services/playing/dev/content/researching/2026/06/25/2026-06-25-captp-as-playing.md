---
title: "CapTP as playing: the out-face object-capability transport"
description: "First green brick of OCapN/CapTP on @emsenn/animating, realized through the OUT (playing) face. A capability is a locus you may play; invocation is the playing cut; promise pipelining is the *-autonomous composition — the cut composed before resolution. The sturdyref + delivery carriers are VIEWS of the activitypub Capability, not a second ontology; canInvoke (here `admit`) gates delivery by move. Parallel to the WMAP ActivityPub notes: the joint, the brick, what's green, the frontier."
date: 2026-06-25
status: design
---

# CapTP as playing: the out-face object-capability transport

WMAP realized ActivityPub on the ACROSS face (`communicating`/`socializing`).
CapTP is its **OUT-face twin**: where an `Activity` is a meme crossing the membrane, a CapTP `Delivery` is a **move played at a locus**.
The standards map flagged this as the strongest unbuilt joint (◎, "the literal next move after WMAP's OCap layer"); this is its first green brick on `@emsenn/animating`.

## The joint (settled, not re-derived here)

CapTP — the object-capability wire of the E / Spritely-Goblins / OCapN lineage — carries unforgeable object references across a network, delivers messages to them, and **pipelines promises**: a message may be sent to the *not-yet-resolved result* of a prior message, so a multi-call interaction settles in **one round trip**.
That is our OUT face exactly:

| CapTP | playing |
|---|---|
| sturdyref (unforgeable object ref) | a **locus** you may play, named + its holder |
| delivery / `op:deliver` (invocation) | the **cut** / interaction normal form |
| a promise (unresolved answer) | the codomain `1·1·…` side of the cut the prior play opens |
| **promise pipelining** | the **cut composed BEFORE resolution** (\*-autonomous composition) |
| delivery soundness | `canInvoke` — authority by **move**, not by possessing the bytes |

## The brick (what landed)

`lib/animating/src/writing/captp/index.mts` — a **pure value layer** (carriers + compose/invoke functions; no socket):

- **`sturdyRefCarrier` / `SturdyRef`** — the unforgeable remote ref naming a `locus`
  + `holder`.
    `refOf(capability)` projects it straight off the activitypub **`Capability`** carrier (`locus` = `grants`, `holder` = `holder`, ref bytes = cap `id`). **No second ontology** — the CapTP cap *is* the WMAP OCap cap, viewed.
- **`deliveryCarrier` / `Delivery`** — a message (`method` + `args`) to a `target`, producing a promise (`answer`).
  `deliver(ref, …)` for the settled-target root case; `pipeline(prior, …)` builds a delivery whose `target` is `prior.answer` and which records `pipelinedOn` — the promise-pipelining case.
- **`composePipeline(prior, follow)`** — REALIZES pipelining as the genuine `@emsenn/playing` **`cut`**: the prior delivery's `resultDesign` (a Daimon at the answer locus on the codomain side `1.1`) cut against the follow-on's `followOnDesign` (the dual move on the domain side `0`).
  The shared answer interface is dual (Daimon collision ⇒ converges, per playing's `bDual`), the cut HIDES it, and a **non-empty composite** witnesses that the follow-on was delivered to the promise *without waiting for it to settle*.
  Pipelining proven as a \*-autonomous composition, not asserted.
- **`admit(affordances, ref)`** — the delivery gate, the same OCap soundness check as the activitypub brick's `canInvoke`: a delivery is admissible iff the ref's locus is a move the holder actually holds.
  An unforgeable ref to an unheld locus is undeliverable.

## What's green

`pnpm --filter @emsenn/animating run check && run build && node --test "test/*.test.mjs"` — see the run record in the work summary.
`test/captp.test.mjs` (5 tests) witnesses:

1. a pipelined invocation (`.foo()` then `.bar()` on the promised result in one round) **composes via the cut before resolution** (non-empty composite, ≥1 converging play);
2. an unrelated (non-pipelined) delivery does **not** compose (no shared answer locus);
3. a held locus is admitted (authority by move);
4. an **unheld capability cannot be delivered** even with the ref bytes;
5. `refOf` is a faithful view of the `Capability` (no second authority model).

## The frontier (honest, not faked)

This is a value/semantics brick, not the wire.
Deferred, and where each lands:

- **The CapTP session framing** — the bootstrap object (`op:bootstrap`), the import/export descriptor tables, GC (`op:drop`/`op:gc-export`), abort/return.
  These are transport bookkeeping; they belong beside `serving.mts`, downstream of this value layer.
- **Three-party handoff** (the OCapN gift/handoff so a ref can be introduced between vats that don't yet share a connection) — this is name-passing across arenas, i.e. **scale-2 `gaming`/`organizing`**, not scale-1 `animating`.
  Record it there.
- **Resolution** — `composePipeline` proves the pipeline *composes*; actually settling the promise (running the result and substituting it) is the cut's normal form being *consumed*, a `resolve`/`op:return` brick on top of this one.
- **A richer result design** — `resultDesign` currently opens a single Daimon answer locus (sufficient to witness convergence).
  Carrying the method's actual return design (so the composite's codomain projection IS the typed answer, the way playing's `cut(Fax_B, d)` recovers `d`) is the next refinement.

## Cross-links

- [`2026-06-25-protocols-as-faculty-projections.md`](2026-06-25-protocols-as-faculty-projections.md) — the map (CapTP = `playing` out, scale-1, ◎ → now a green brick)
- [`2026-06-25-wmap-web-modeled-agency-protocol.md`](2026-06-25-wmap-web-modeled-agency-protocol.md) — the across-face exemplar this imitates
- `lib/animating/src/writing/activitypub/capability.mjs` — the OCap brick this reuses (`Capability`, `canInvoke`)
- `lib/playing/src/structuring/concurrent-game/with-symmetry/ludicizing/composition.mts` — the genuine `cut` `composePipeline` calls

## Provenance

The joint is from the standards-map note (operator-confirmed prior research); this note records the first **built, green** projection.
The cut convergence construction (codomain `1.1` Daimon vs domain `0` Daimon) is imitated from `playing`'s own green `composition.test.mjs` (the copycat-dispute test), so the pipeline composes through the package's real composition engine, not a look-alike.
