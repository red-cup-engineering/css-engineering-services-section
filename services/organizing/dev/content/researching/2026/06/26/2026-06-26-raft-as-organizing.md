---
title: "Raft as organizing coordination"
description: "Raft is the coordinated consensus system at the exact frontier where CALM's monotonicity test rejects coordination-freedom: a leader-elected, totally ordered RWIL log that admits one command per index, dual to CRDT join's retention of concurrent values."
date: 2026-06-26
status: implemented
---

# Raft as organizing coordination

Raft is not the default organizing merge.
The default remains CALM:

```text
coordination-free <=> monotone-in-<=k
```

Monotone operations lift through organizing's federation witness with no coordination round.
Raft appears exactly at the other side of that theorem: when the CALM reading finds contested top or a federation-only H1 obstruction, the operation is non-monotone for the agreement-only read and needs a coordinated total order.

## The boundary

The implementation joint is:

- `readCalmFederation`, `readCalmCovers`, and `readCalmActivities` classify an operation as monotone or non-monotone.
- `readCalmRaftFrontier` turns that CALM reading into the explicit frontier: monotone means `raftRound = "not-required"`; non-monotone means `raftRound = "required"`.
- `coordinateByCalmOrRaft` leaves monotone operations out of Raft entirely and admits non-monotone proposals only through an elected `RaftLeadership` term.

That makes Raft the fallback the math forces, not a replacement for CRDT/CALM.
If a write is a join-semilattice operation, it has the CRDT path and no leader is owed.
If a write retracts, overwrites, or otherwise depends on absence/order, CALM rejects it and Raft supplies the missing total order.

## RWIL view

The Raft log is a functorial view over RWIL.
A `RaftLogEntry` maps to EAVT witness rows:

```text
entity = ["organizing", "raft", cluster, index]
attributes = term, leader, command, witness
time = { term, leader, witness }
```

The RWIL state projection treats those attributes as functional.
Therefore each log index has a single projected `command`, ordered by the elected leader's term witness.
The source remains append-only; the coordinated safety property is read at the functional projection:

```text
one index -> one command
```

## Dual to CRDT join

The socializing CRDT surface merges by the relating knowledge-order join:

```text
merge(a, b)[key] = a[key] v_k b[key]
```

When two replicas concurrently write different values, the multi-value register keeps both witnesses and reads the conflict as top.
That is the coordination-free side: conflict is information.

Raft is the coordinated dual.
For a given log index, the system must not keep two commands.
Instead, a leader is elected for a term and imposes the total order `T` over the log.
Concurrent non-leader proposals are rejected; conflicting leader proposals for the same index are rejected; the projected RWIL state admits one command per index.

## Green brick

Implemented surface:

- `raftLeadershipCarrier`
- `raftLogEntryCarrier`
- `raftLogCarrier`
- `raftAppendResultCarrier`
- `calmRaftFrontierCarrier`
- `emptyRaftLog`
- `raftEntry`, `raftEntryRows`, `raftLogRows`, `projectRaftState`
- `oneValuePerIndex`
- `appendRaftProposals`
- `readCalmRaftFrontier`
- `coordinateByCalmOrRaft`

The law test is `lib/organizing/test/raft.test.mjs`.
It proves:

- concurrent appends through an elected leader preserve one-value-per-index safety;
- the RWIL projection has one entity per log index with the leader's admitted command;
- monotone CALM readings lift with no Raft round;
- non-monotone CALM readings require leadership and then pass through the leader's total order.

## Registry placement

Raft is a named product-plane system, not a new top-level package.
It is realized by:

- organizing: `src/writing/raft/index.mts`;
- organizing: `src/writing/calm/index.mts`;
- relating: `src/ledger/` and EAVT writing rows.

It belongs in organizing because the boundary is social-scale coordination.
RWIL supplies the witnessed log substrate; CALM supplies the theorem boundary; Raft supplies the coordinated total order when the theorem says coordination-free execution is impossible.

## Provenance

This note follows the family registry recipe in [`2026-06-25-relating-family-of-named-systems.md`](2026-06-25-relating-family-of-named-systems.md) and contrasts directly with [`2026-06-25-calm-as-organizing-coordination.md`](2026-06-25-calm-as-organizing-coordination.md) and [`2026-06-25-crdt-as-socializing-merge.md`](2026-06-25-crdt-as-socializing-merge.md).
The RWIL substrate is registered in [`2026-06-25-rwil-relation-witness-information-log.md`](2026-06-25-rwil-relation-witness-information-log.md).
