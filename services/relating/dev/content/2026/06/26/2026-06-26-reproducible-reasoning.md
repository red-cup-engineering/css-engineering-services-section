---
title: "REPRODUCIBLE REASONING — RMN reasoning as a content-addressed build"
description: "Bridge #4 research spike from the cross-protocol coherence slate: an RMN reasoning term is rendered as a Nix-derivation-shaped artifact, deterministically evaluated to normal form, content-addressed by the store hash, and rebuild-checked by re-evaluating the carried term. States the exact proof boundary: this is a pure algebraic model over RMN and organizing's Nix carriers, not a real Nix invocation, not an isomorphism, and not yet a live agent cognition trace."
date: 2026-06-26
status: spike
tiles: [organizing, computing, RWIL]
---

# REPRODUCIBLE REASONING

Bridge #4 asks whether an agent conclusion can be handed over as a reproducible build:

> Here is the content address of my settled reasoning.
> Rebuild the derivation, re-evaluate the RMN term, and check that the normal form hashes to the same store path.

The spike implements the narrow version of that claim.
It does not shell out to real Nix.
It models the algebra already named in [`2026-06-26-nix-as-computing-reproducibility.md`](2026-06-26-nix-as-computing-reproducibility.md): a derivation is an RMN term, evaluation settles it to normal form, and the store path `$id` is the content id of that normal form.

## Family-registry row

| system | one-line pitch | realized by | scope | spec note |
|---|---|---|---|---|
| **REPRODUCIBLE REASONING** — RMN reasoning as a content-addressed build | agent reasoning, in the spike sense, can be rendered as a Nix-derivation-shaped artifact whose store hash is the content address of the settled RMN normal form; rebuild means re-evaluate and compare the hash | organizing: [`src/reproducible-reasoning.mts`](../../../lib/organizing/src/reproducible-reasoning.mts) (build/rebuild carriers and API) + [`src/nix.mts`](../../../lib/organizing/src/nix.mts) (Derivation/StorePath algebra) + [`test/reproducible-reasoning.test.mjs`](../../../lib/organizing/test/reproducible-reasoning.test.mjs) (determinism/rebuild laws); relating: [`src/evaluating/index.mts`](../../../lib/relating/src/evaluating/index.mts) (`dev`/`evaluate` to fixed point), [`lib/notating/index.mts`](../../../lib/relating/lib/notating/index.mts) (`Tm`), [`src/typing/carrier.mts`](../../../lib/relating/src/typing/carrier.mts) (`carrierFrom` + `FromSchema`) | organizing bridge over relating RMN and organizing Nix | this note |

## Load-bearing joint

Both sides are settled terms in the implemented model:

- RMN evaluation uses `dev` and `evaluate` from `@emsenn/relating`; `evaluate` iterates complete development until the term reaches a JSON-equal fixed point.
- Nix/Guix reproducibility is represented by `NixDerivation`, `NixStorePath`, and `NixClosure` in `lib/organizing/src/nix.mts`; `settleDerivation` evaluates the carried RMN term and hashes the canonical normal form.
- `StorePath.$id` is `nix:sha256:<hash>`, where `<hash>` is the SHA-256 of the canonical JSON normal form.

So the bridge is:

1. Admit an RMN reasoning term.
2. Render it as a `NixDerivation`.
3. Settle the derivation through the existing RMN evaluator.
4. Store the normal-form content address as `contentAddress` and `storePath.$id`.
5. Rebuild by re-running the same evaluation and comparing the expected and actual content addresses.

## API

Implementation:

- [`lib/organizing/src/reproducible-reasoning.mts`](../../../lib/organizing/src/reproducible-reasoning.mts)
- exported from [`@emsenn/organizing`](../../../lib/organizing/src/index.mts)

Public surface:

- `reproducibleReasoning(input) -> ReproducibleReasoningBuild`
- `rebuild(build) -> ReproducibleReasoningRebuild`
- `reproducibleReasoningBuildCarrier`
- `reproducibleReasoningRebuildCarrier`
- `REPRODUCIBLE_REASONING_SPIKE_ASSUMPTION`

The carriers are authored as `as const` JSON-Schema literals interpreted by `carrierFrom` + `FromSchema`.
There is no TypeBox, Ajv, codegen path, or real Nix/Guix process in the bridge.

## Laws

Law file:

- [`lib/organizing/test/reproducible-reasoning.test.mjs`](../../../lib/organizing/test/reproducible-reasoning.test.mjs)

It proves:

1. The same RMN reasoning term settles to the same store path twice.
2. A different RMN reasoning term settles to a different content address.
3. `rebuild` re-evaluates the derivation and recovers the normal form behind the hash.

Verification on 2026-06-26:

- `pnpm --filter @emsenn/organizing run check`
- `pnpm --filter @emsenn/organizing run test` — 76 tests, 0 failures

## What is real

The shipped bridge really does use the existing organizing Nix algebra and the existing relating RMN evaluator.
The hash is not a prompt-side story: it is computed from the canonical JSON bytes of the evaluated RMN normal form by `termContentId` / `storePathFromTerm`.

The determinism law is real at the package level: the same carried RMN term produces the same content address and store path when settled twice in the same implementation.

The rebuild law is real in the modeled sense: a rebuild re-evaluates the carried derivation term, recomputes the content address of the new normal form, and checks it against the stored hash.

## What is spike or gestured

This is not yet a proof that "agent cognition" in the wild is reproducible.
The test terms are stand-in RMN reasoning terms.
They are not harvested from a live Codex/Claude trace, not typed as a full RWIL reasoning-chain carrier, and not verified against an external cognitive semantics.

The RMN-term-to-Nix-derivation map is one-way in this implementation.
The code renders an RMN term as a derivation-shaped artifact; it does not prove an isomorphism `RMN reasoning term <-> Nix derivation`, and it does not recover a unique source reasoning chain from a store hash alone.

The no-real-Nix assumption is active.
The bridge models reproducibility algebra inside organizing; it does not invoke Nix builders, realize files on disk, compute a real Nix fixed-output derivation hash, or compare against the Nix daemon's store.

The strong-normalization story is inherited from RMN's design and the relating evaluator's fixed-point implementation.
This spike does not add a new Lean theorem for the rendering into derivations; it relies on the already-shipped evaluator surface and tests the observable package behavior.

## Honest conclusion

The phrase "verifiable reproducible cognition" is still ahead of what shipped.
What shipped is a precise bridge substrate:

- an RMN reasoning term can be rendered as a derivation-shaped build artifact;
- the artifact is content-addressed by the settled normal form;
- rebuilding is re-evaluation plus hash comparison;
- the package laws prove deterministic content addressing for the model.

That is enough to make bridge #4 concrete and falsifiable.
The next step, if this grows past the spike, is to admit real witnessed RWIL reasoning chains as the input carrier and prove that their RMN rendering preserves the chain's conclusion and evidence, not merely that a stand-in term hashes deterministically.

## Cross-links

- [`2026-06-26-cross-protocol-coherence-and-the-bridge-slate.md`](2026-06-26-cross-protocol-coherence-and-the-bridge-slate.md)
- [`2026-06-26-nix-as-computing-reproducibility.md`](2026-06-26-nix-as-computing-reproducibility.md)
- [`2026-06-25-relating-family-of-named-systems.md`](2026-06-25-relating-family-of-named-systems.md)
- [`2026-06-25-rwil-relation-witness-information-log.md`](2026-06-25-rwil-relation-witness-information-log.md)
