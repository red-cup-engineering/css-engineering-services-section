---
title: "Memento as RWIL's across-the-web time face"
description: "Adds Memento RFC 7089 datetime negotiation to lib/relating as state@T over the witness ledger. Accept-Datetime projects the ledger to its settled state as of a time, and TimeMaps list available record snapshots."
date: 2026-06-26
status: landed
---

# Memento as RWIL's across-the-web time face

Memento is RWIL's web-facing time projection.
An `Accept-Datetime` request is a record-tier read parameterized by `T`:

```text
GET resource + Accept-Datetime = project witness ledger to state@T
```

The implementation is additive in [`lib/relating/src/ledger/memento.mts`](../../../lib/relating/src/ledger/memento.mts).

## The derivation

RWIL already folds `log -> state -> record -> content`.
Memento asks for that fold at a chosen time.
A TimeGate is the read operation, `Accept-Datetime` is the `T` parameter, a Memento is the returned `state@T`, and a TimeMap lists available snapshot times.

## What landed

- `projectStateAt`
- `readMementoState`
- `mementoStateResponse`
- `availableMementoDatetimes`
- `timeMap`
- `mementoProjectionMonotone`
- carriers for snapshots and TimeMaps

`mementoStateResponse` returns the small `ServedResponse` shape used by `running/serving`, including `Memento-Datetime`, `Vary: Accept-Datetime`, and Memento `Link` relations.
No new dependency or route framework is introduced.

## Proof

[`lib/relating/test/ledger-standards.test.mjs`](../../../lib/relating/test/ledger-standards.test.mjs) checks that a datetime-negotiated read returns settled state as of `T`, a TimeMap lists snapshots, and the projection is prefix-monotone in `T`.

## Handoff

```yaml
handoff:
  product: "Memento RFC 7089"
  package: "@emsenn/relating"
  mapping:
    accept_datetime: "record-tier read parameterized by T"
    memento: "state@T"
    timemap: "available record snapshots"
  open_seams:
    - "The pure helper is implemented; no package-level route was mounted."
    - "Datetime parsing accepts HTTP/ISO strings and falls back to canonical ordering."
    - "Content negotiation policy remains with serving/site layers."
```

## Cross-links

- [`2026-06-25-rwil-relation-witness-information-log.md`](2026-06-25-rwil-relation-witness-information-log.md)
- [`2026-06-25-protocols-as-faculty-projections.md`](2026-06-25-protocols-as-faculty-projections.md)
