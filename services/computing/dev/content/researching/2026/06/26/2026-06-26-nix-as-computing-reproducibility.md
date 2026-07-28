---
title: "Nix/Guix as computing reproducibility"
description: "Places Nix/Guix as the scale-2 computing/IN-face reproducibility standard hosted on organizing: a derivation is a settled RMN term, deterministic evaluation reaches a fixed-point normal form, the store hash is the term content id, and a closure is the transitive settled dependency set witnessed in the ledger."
date: 2026-06-26
status: built
---

# Nix/Guix as computing reproducibility

Nix/Guix belongs to the `computing` / IN face at scale 2, but its home is `organizing`, not `computing`.
The rule is the same one used by [`jupyter.mts`](../../../lib/organizing/src/jupyter.mts): scale-2 standards live on the organizing bulk; the face supplies the math.
Jupyter reads a shared compute session as notebook/kernel/session carriers.
Nix/Guix reads a shared compute result as derivation/store-path/closure carriers.

## Load-bearing joint

A Nix derivation is a settled term.
In the implemented carrier:

- `Derivation` is an RMN term plus dependency ids.
- evaluation is Relating's deterministic RMN normalization to a fixed point.
- `StorePath.$id` is the content id of the normal form, `nix:sha256:<hash>`.
- `StorePath.path` is the conventional `/nix/store/<hash>-<name>` projection.
- `Closure` is the transitive settled dependency set, with witness-ledger rows recording each settlement and input edge.

This is build-as-settling, not host execution.
The implementation deliberately does not invoke a real `nix` or `guix` binary, does not run builders, and does not touch the filesystem.
It models the algebra that makes reproducibility lawful.

## Realizing files

| system | realized by | laws |
|---|---|---|
| **Nix/Guix Computing Reproducibility** | [`lib/organizing/src/nix.mts`](../../../lib/organizing/src/nix.mts) | derivation determinism, closure transitivity, store-path id equals settled term content id |
| law tests | [`lib/organizing/test/nix.test.mjs`](../../../lib/organizing/test/nix.test.mjs) | `evaluateDerivation` twice yields the same hash; `closureOf` returns the transitive settled dependency set; `StorePath.$id === termContentId(normalForm)` |

## Registry placement

This note follows the family-registry recipe: name, one-line pitch, realizing files, and spec note.
The named system is not a new package.
It is an organizing IN-face slice over existing Relating machinery: `carrierFrom`, `FromSchema`, `Tm`, `evaluate`, and canonical JSON content addressing.

Cross-links:

- [`2026-06-25-relating-family-of-named-systems.md`](2026-06-25-relating-family-of-named-systems.md) records the product-plane row.
- [`2026-06-25-protocols-as-faculty-projections.md`](2026-06-25-protocols-as-faculty-projections.md) records the face/scale map.
- [`2026-06-25-codecs-on-faces-activitypub-across-scales.md`](2026-06-25-codecs-on-faces-activitypub-across-scales.md) gives the hosting rule: standards live with the face math at the proper agency scale.
- [`2026-06-26-reproducible-reasoning.md`](2026-06-26-reproducible-reasoning.md) uses this derivation algebra for bridge #4's RMN reasoning build spike.

## Assumption

No-real-Nix assumption: this is a standards projection and reproducibility algebra, not a package-manager binding.
A future site, service, or provider package can bind these carriers to a real Nix or Guix installation, but the organizing law surface stays pure and deterministic.
