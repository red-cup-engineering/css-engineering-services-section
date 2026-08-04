---
title: "Matrix as socializing: state-resolution over a signed event-DAG is sheaf consensus"
description: "First green brick of the Matrix protocol onto organizing's across (socializing) face, by the WMAP method. The joint: a Matrix ROOM is a camp; the event DAG is the witness ledger; STATE RESOLUTION over the DAG is organizing's federation/consensus math (converge = consensusClose ∧_t / majorityClose; federate = the cross-arena Mayer–Vietoris) — branches that agree resolve coordination-free, conflicts are settled by the consensus reading (contested → ⊤ held), never last-writer-wins. No second ontology: an event is an animating Activity (a charged meme) with a DAG envelope. Parallel to the WMAP ActivityPub codec, scale-2 / real-time."
date: 2026-06-25
status: design
---

# Matrix as socializing: state-resolution over a signed event-DAG is sheaf consensus

WMAP proved the thesis for ActivityPub; this is the **Matrix** brick, by the same method.
Matrix's deep mechanism — **state-resolution over a DAG of signed events** — is not designed onto socializing; it is **discovered to be the wire-projection** of organizing's federation math for real-time.
The [standards map](2026-06-25-protocols-as-faculty-projections.md) flags it ◎; this brick turns it green against organizing's own carriers.

## The joint

| Matrix | corpus (organizing / socializing, the ACROSS face, scale-2) |
|---|---|
| **room** | a **camp** — a constituent society of member Actors (`Camp`) |
| **event** | one **charged membrane meme** — an animating `Activity` |
| **event DAG** (`prev_events`) | the **witness ledger** — the causal graph of what was said |
| **state event** `(type, state_key)` | a write to one cell of the collective's shared state |
| **state resolution** | organizing's **consensus / cross-arena Mayer–Vietoris** reading |
| federation of homeservers | **`federate` = parallel composition ‖** (WMAP's S2S, reused) |

The decisive tell, the same kind WMAP found: Matrix's resolution problem (reconcile forked branches of a signed event graph) is **literally our H¹** — "state-res is our H¹" made concrete.
Last-writer-wins is *not* the rule; conflict is settled by the sheaf/Mayer–Vietoris reading and **held as ⊤** rather than dropped.

## The brick (one green brick, parallel to WMAP brick 1)

`lib/organizing/src/writing/matrix/index.mts` — additive, alongside the ActivityPub S2S codec, barrelled into `src/index.mts`:

- **`eventCarrier`** (`organizing/writing/matrix/event`) — a Matrix event as a DAG node: `eventId`, `prevEvents` (parent ids), and the carried activity-shape (`type`, `sender`, `object`, optional `stateKey`).
  Single-source via relating's `carrier()`, bare descent-path `$id`. **No second ontology**: the body IS an Activity.
- **`asActivity`** — view an event AS the animating `Activity` it carries (drop the DAG envelope).
  The bridge that lets events flow straight into `converge`/`federate`.
- **`Room`** = `{ camp, events }` — events over a camp; **`ancestryOf`** walks one branch's causal past in topological order (Kahn over `prevEvents`).
- **`resolveState`** — **state resolution as a fold over the DAG**: for each state cell, the writers are grouped by claim into one-event "camps" and settled by organizing's **`converge`** (socializing's `consensusClose` ∧_t / `majorityClose`).
  Agreeing branches ⇒ one claim, value `potential`, coordination-free.
  Conflicting branches ⇒ value `stable` (⊤), **all candidate claims kept** (paraconsistent — no writer lost).
- **`federateRoom`** — the room's branches read through **`federateActivities`** (the cross-arena `federate`), the SAME federation cohomology WMAP's S2S uses.

## What's green

`pnpm --filter @emsenn/organizing run check` ✓ · `run build` ✓ · `node --test` ✓.
The Matrix test (`test/matrix.test.mjs`) pins, 5/5: (1) an event is a view of an Activity; (2) two branches that AGREE resolve coordination-free (`potential`); (3) a CONFLICT settles to `stable` ⊤ with both candidates retained — not silently dropped; (4) `ancestryOf` gives one branch's causal past, parents before children; (5) the room federates by the cross-arena Mayer–Vietoris (agreement glues coordination-free; a cross-branch disagreement does not lift as `shared` yet still glues, the witness kept).
Full organizing suite stays green: **50/50**.

## The frontier

- **Resolution is consensus, not Matrix's actual state-res v2 algorithm.** This brick settles conflicts by the corpus's consensus reading (`converge` + `federate`), which is the *right* math (sheaf H¹, ⊤-tolerant).
  Matrix's published state-res v2 adds an *auth-chain / power-level* ordering and reverse-topological iterative auth checks.
  That layer maps to organizing's **authority** (`officeEligibility`, the OCap `grantByOffice` already in the S2S codec) — the next brick: gate which `sender` MAY write a state cell by capability, then resolve.
  Recorded as a frontier, not faked.
- **Federation's `contested` count** is 0 for a cross-branch assert+Undo (the proven `federate` reports that disagreement as `shared === 0`, still glued).
  The held-⊤ reading lives at the **state-resolution** level (`resolveState` → `stable`), which is where Matrix's per-cell conflict actually is; the federation level reports the coarser "does not lift" reading.
  Both are the corpus's own semantics, unforced.
- **Signing** (`eventId` as a content-address, signatures) is modeled as an opaque id here; binding it to real hashing/keys is downstream transport work, like WMAP's HTTP-Signatures scope.

## Where it lives

- `lib/organizing/src/writing/matrix/index.mts` (the codec)
- `lib/organizing/test/matrix.test.mjs` (the brick's proof)
- barrelled in `lib/organizing/src/index.mts`

## Provenance

The joint (room=camp, event-DAG=ledger, state-res=consensus/H¹) is the operator's standards-map entry (◎); this note + the green codec promote it toward ✓ for the resolution brick.
The method (carrier-single-source, no-second-ontology, reuse the faculty's proven math, scope to one brick) is WMAP's, imitated.
The consensus/federation semantics are organizing's existing `converge`/`federate`, reused verbatim — checkable by the green test, not asserted by analogy.

## Cross-links

- [`2026-06-25-protocols-as-faculty-projections.md`](2026-06-25-protocols-as-faculty-projections.md) — the standards map (Matrix ◎ → resolution brick green)
- [`2026-06-25-wmap-web-modeled-agency-protocol.md`](2026-06-25-wmap-web-modeled-agency-protocol.md) — the realized exemplar this imitates
