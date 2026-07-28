---
title: "OpenTimestamps and RFC-3161 as RWIL time anchors"
description: "Adds OpenTimestamps/RFC-3161 to lib/relating as the witness-ledger TIME-ANCHOR standard. A timestamp proof is a witnessed commitment binding a witness hash to an external time attestation, moving EAVT's T from caller-asserted to externally verifiable."
date: 2026-06-26
status: landed
---

# OpenTimestamps and RFC-3161 as RWIL time anchors

OpenTimestamps and RFC-3161 belong on RWIL's `T` axis.
A timestamp proof anchors an EAVT row to an external clock:

```text
timestamp proof = witnessed commitment(hash(EAVT row)) + external attested time
```

The implementation is additive in [`lib/relating/src/ledger/time-anchor.mts`](../../../lib/relating/src/ledger/time-anchor.mts).

## The derivation

The row still carries caller-authored `T`, but the time-anchor reading carries a commitment to the witness hash, the calendar/authority, the externally attested time, and the verification result.
That moves `T` from merely asserted to externally verifiable.

## What landed

- `anchorWitnessTime`
- `verifyTimestampedWitness`
- `timestampedWitnessToDatom`
- `externallyAnchoredTime`
- `anchoredTimeMonotone`
- carriers for anchors, timestamped witnesses, and time-anchor readings

`opentimestamps/rfc3161.structural` is a deterministic commitment model.
It is not an OpenTimestamps calendar client, Bitcoin anchoring, a real RFC-3161 TSA token, or certificate validation.

## Proof

[`lib/relating/test/ledger-standards.test.mjs`](../../../lib/relating/test/ledger-standards.test.mjs) checks that a timestamped witness verifies against its anchor, a forged external time fails, and anchored `T` is monotone with log order.

## Handoff

```yaml
handoff:
  product: "OpenTimestamps/RFC-3161 time anchor"
  package: "@emsenn/relating"
  mapping:
    timestamp_proof: "witnessed commitment over the EAVT row hash"
    external_clock: "calendar/authority attestedTime"
    ledger_T_axis: "caller T plus externally verifiable anchor"
  open_seams:
    - "No OpenTimestamps calendar server is contacted."
    - "No Bitcoin/Merkle proof validation is implemented."
    - "No real RFC-3161 TSA token or certificate validation is implemented."
```

## Cross-links

- [`2026-06-25-rwil-relation-witness-information-log.md`](2026-06-25-rwil-relation-witness-information-log.md)
- [`2026-06-25-protocols-as-faculty-projections.md`](2026-06-25-protocols-as-faculty-projections.md)
