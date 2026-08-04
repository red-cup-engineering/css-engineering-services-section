---
title: "in-toto/SLSA/Sigstore as RWIL provenance"
description: "Adds in-toto/SLSA/Sigstore to lib/relating as the witness-ledger provenance standard. A link is a Datom whose fifth slot carries a signed-source reading; the supply-chain DAG is the witness log's provenance order; verification is the record tier's settled judgement."
date: 2026-06-26
status: landed
---

# in-toto/SLSA/Sigstore as RWIL provenance

in-toto, SLSA, and Sigstore belong in the witness ledger.
Their shape is already RWIL's record tier with signed provenance:

```text
SLSA / in-toto link = Datom [E, A, V, T, reading]
```

The fifth-slot `reading` carries the signed source and verification judgement.
The implementation is additive in [`lib/relating/src/ledger/provenance.mts`](../../../lib/relating/src/ledger/provenance.mts).

## The derivation

- `E` is the attested artifact or package.
- `A` is the provenance predicate type.
- `V` is the predicate payload.
- `T` is the witness time.
- `reading.signedSource` is the signed source carried by the record tier.

A supply-chain DAG is a provenance order over the witness log: one link's products become another link's materials.
Verification is the record tier's settled judgement, not a separate authority layer.

## What landed

- `createAttestationLink`, `attestationLinkToDatom`, and `attestationLinkFromDatom`
- `verifyAttestationLink` and `verifyAttestationDatom`
- `provenanceOrder`
- carriers for structural signatures, signed provenance sources, links, and provenance readings

`sigstore.structural` is a deterministic canonical-JSON commitment.
It is not real Sigstore, Rekor, Fulcio, keyless signing, or certificate-chain validation.

## Proof

[`lib/relating/test/ledger-standards.test.mjs`](../../../lib/relating/test/ledger-standards.test.mjs) checks that an attestation round-trips as a record-tier Datom, a tampered link fails verification, and the chain reads as the witness log's provenance order.

## Handoff

```yaml
handoff:
  product: "in-toto/SLSA/Sigstore provenance"
  package: "@emsenn/relating"
  mapping:
    link: "record-tier Datom"
    signed_source: "Datom fifth-slot reading"
    supply_chain_dag: "RWIL provenance order"
    verification: "record-tier settled judgement"
  open_seams:
    - "Signatures are structural commitments, not real Sigstore."
    - "No Rekor inclusion proof or certificate-chain verification is implemented."
    - "SLSA predicate payloads remain generic JSON."
```

## Cross-links

- [`2026-06-25-rwil-relation-witness-information-log.md`](2026-06-25-rwil-relation-witness-information-log.md)
- [`2026-06-25-protocols-as-faculty-projections.md`](2026-06-25-protocols-as-faculty-projections.md)
