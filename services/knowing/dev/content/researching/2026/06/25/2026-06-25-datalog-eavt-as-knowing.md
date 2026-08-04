---
title: "Datalog over EAVT as knowing"
description: "Records the first green brick of a knowing-face Datalog query surface over the witness ledger: EAVT rows are the extensional facts, recursive rules settle by semi-naive least-fixpoint evaluation, and no second store is introduced."
date: 2026-06-25
status: implemented
---

# Datalog over EAVT as knowing

The first brick is implemented in `lib/knowing/src/writing/datalog/` and surfaced from `@emsenn/knowing`.
It follows the joint named in `2026-06-25-protocols-as-faculty-projections.md`: **Datalog / Datomic / differential dataflow are the protocol surface for settling to a fixed point, and Datomic-style datoms are already our EAVT witnesses.**

This is an IN-face operation.
Querying accumulated facts is reflection: the agent does not emit another world, it reads what the witness ledger has already admitted and asks what follows monotonically from it.

## Shape

The extensional relation is the existing EAVT row:

```text
eavt(entity, attribute, value, time)
```

The evaluator accepts relating's public `EAVT | EAVTRecord` rows and normalizes them through `eavtRecord`.
It does not define a Datalog store, transaction log, or side ontology.
The only persistent facts are the witness ledger rows.
Datalog relations are query-time readings over those rows.

The carrier surface is single-source:

- `datalogVariableCarrier`
- `datalogAtomCarrier`
- `datalogRuleCarrier`
- `datalogQueryCarrier`
- `datalogRelationCarrier`
- `datalogEvaluationCarrier`

Each is authored as a plain JSON Schema literal and typed with relating's `carrierFrom(schema)` plus `FromSchema`.
There is no TypeBox, generated schema, or package-local validator.

## Settling

Recursive Datalog evaluation is the finite form of settling to a fixed point.
The implementation uses semi-naive evaluation:

1. Load ledger rows into the extensional `eavt` relation.
2. Treat the first delta as those ledger facts.
3. For each rule, re-evaluate bodies with exactly one atom drawn from the current delta and the rest drawn from the accumulated relation set.
4. Add only facts not already present by canonical JSON identity.
5. Continue until the delta is empty.

That last empty delta is the fixed point.
Re-evaluating the same rules over the same ledger produces the same settled evaluation.

## Proof

`lib/knowing/test/datalog.test.mjs` imports `../dist/index.mjs` and derives transitive reachability from three EAVT edge witnesses:

```text
eavt("a", "edge", "b", "t1")
eavt("b", "edge", "c", "t2")
eavt("c", "edge", "d", "t3")
```

The rules derive `edge(x,y)` from `eavt(x,"edge",y,t)`, seed `reachable(x,y)` from `edge(x,y)`, then recursively derive `reachable(x,z)` from `reachable(x,y)` and `edge(y,z)`.
The settled answer is the six transitive pairs:

```text
a -> b
a -> c
a -> d
b -> c
b -> d
c -> d
```

The test also re-runs the same evaluation and checks idempotence.

## Boundary

This brick is intentionally small.
It is not a parser, not a persistence layer, not a Datomic clone, and not a second ledger.
It is the knowing-face query carrier and evaluator over the existing witness ledger.
Future work can add a textual Datalog reader, query actions, or differential dataflow-style incremental maintenance, but those should remain projections over the same EAVT witness rows.
