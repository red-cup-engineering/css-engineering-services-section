---
title: "CRDT as socializing merge"
description: "The first green CRDT brick in socializing: state-based CRDT merge as relating's knowledge-order join, plus a multi-value register that preserves concurrent conflict as top."
date: 2026-06-25
status: implemented
---

# CRDT as socializing merge

The CRDT joint is now a concrete socializing writing surface: `lib/socializing/src/writing/crdt/`.

The implementation keeps the protocol-projection discipline from WMAP.
It does not model a second document ontology beside the faculty.
A state-CRDT is a JSON carrier whose cells are keyed replicated-state entries, and its merge is the pointwise knowledge-order join already exported by `@emsenn/relating`:

```txt
merge(a, b)[key] = a[key] ∨_k b[key]
```

In code that is `mergeCrdtStates`, which folds equal keys with `joinKnowledge`.
The normal form sorts cells by key, so replicas that have observed the same writes converge to byte-stable JSON regardless of merge order.

The multi-value register is the register-shaped projection of the same state carrier.
Each write has a deterministic dot, replica, JSON value, bilattice standing, and witness.
`mergeMultiValueRegisters` lifts the two registers into the state carrier, uses `mergeCrdtStates`, then projects the merged cell back to the register.
It therefore inherits the CRDT laws from the same `∨_k` path.

Concurrent conflict is not last-writer-wins.
Opposing concurrent writes remain in `writes`, and different concurrent values are read as a told-both register standing: the canonical first value supplies the truth-side representative and the other value witnesses supply the falsity-side representatives.
The standing then joins to `stable` (⊤).
The register can therefore say: both witnesses are held, the conflict is known, and no write was erased by an arbitrary clock choice.

## Green Brick

Exported public surface:

- `stateCrdtCarrier`, `StateCrdtSchema`, `crdtCell`, `crdtState`, `emptyCrdtState`, `mergeCrdtStates`
- `multiValueRegisterCarrier`, `MultiValueRegisterSchema`, `mvRegister`, `mergeMultiValueRegisters`, `multiValueRegisterStanding`
- `joinCrdtStanding` as the value-level algebra witness over `joinKnowledgeValue`

The behavioral test is `lib/socializing/test/crdt.test.mjs`, run against `../dist/index.mjs`.
It asserts idempotence, commutativity, and associativity over three replicas, then asserts that two concurrent conflicting register writes merge to ⊤ with both witnesses retained.

## Lineage

The protocol note names CRDTs as `socializing.merge` made interoperable: document sync is the `≤_k` join with both witnesses kept.
The WMAP ActivityPub exemplar showed the method: consume stable root surfaces, define a single-source carrier via `carrierFrom(schema)` plus `FromSchema`, and write a codec/projection that is just the faculty's settled math in a wire form.

This CRDT brick follows that pattern.
It imports only the relating root apex: `carrierFrom`, `FromSchema`, `joinKnowledge`, `joinKnowledgeValue`, charge constructors, JSON canonicalization, and marks.
It does not import TypeBox or a relating subpath.
