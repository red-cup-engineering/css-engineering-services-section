---
title: "Relating Math Capability Frontier"
date: 2026-06-26
status: "working note"
audience: "future Codex/self"
---

# Relating Math Capability Frontier

This note looks for mathematics already present in `lib/relating` that is not yet realized, or is only lightly realized, in the sibling capability packages `communicating`, `knowing`, `playing`, `socializing`, `computing`, and `gaming`.

The important constraint is derivational: do not move arbitrary mathematics into the faculties.
Use `relating` math when it formalizes the public theory of the package using it.

## Method

I read the root agent instructions, the workspace package list, package READMEs and manifests for the target packages, the `@emsenn/relating` root surface, and the RelMath survey note at `dev/content/researching/notes/2026-06-23-survey-of-relmath-lean-library.md`.

I then searched package source for actual use of `@emsenn/relating` math surfaces: analysis, geometry, cohomology, probability, closure regimes, fibration, quantale/KZ sheaves, aperiodicity, substitution dynamics, value settling, formal concepts, Chu spaces, and predication logic.

## Already Realized

The first wave of RelMath realization is real.
These packages are not bare shells.

- `communicating` realizes discourse graph cohomology, Laplacian/Hodge reads, causal discourse spacetime, and mutual information in `lib/communicating/src/communicate/cohesion.mts`.
- `knowing` realizes concept-map cohomology for memory neighborhoods in `lib/knowing/src/memory/carrier.mts`.
- `socializing` realizes its own bilattice-network sheaf consensus through `sheafCharges`, plus a closure-regime/federation discipline axis, in `lib/socializing/src/socialize/converge.mts`.
- `computing` realizes stochastic/value-category settling receipts for eventual-consistency/FLP decomposition in `lib/computing/src/consensus-convergence.mts`, and also has a spectral society read in `lib/computing/src/computing.mts`.
- `gaming` realizes arena conflict cohomology and exact rational analysis at the outside/evidence face in `lib/gaming/src/face.mts` and related analysis/action surfaces.

The frontier is therefore not "add RelMath everywhere."
The frontier is the second wave: richer public math surfaces in `relating` that can become actual faculty capabilities instead of only package docs or root exports.

## Frontier Candidates

### 1. Predication Fibration As Perspective Transport

`lib/relating/docs/predicating-fibration.md` exposes finite predication-category shadows, Yoneda recovery, reindexing along embeddings, bilattice-homomorphic reindexing, Grothendieck transpose receipts, temporal two-cells, and theory-relative ideals.

This is not currently realized as a cross-faculty carrier even though several packages already speak its theory:

- `communicating` has `translate`, `refer`, presupposition, and semiosis.
- `socializing` has observer-category translations `V(alpha)`.
- `knowing` has context, memory, and concept fibers.
- `gaming` has masks, symmetry, and event-name transport.

Candidate capability: a shared "perspective transport receipt" over finite predication embeddings.
Each package keeps its own theory:

- In `communicating`, translation can return a reindexing receipt showing that a meme moved between semiospheres as a bilattice-homomorphic map, not just a renamed token.
- In `socializing`, each observer translation can carry the same receipt, making `V(alpha)` inspectable at the predication-fiber layer.
- In `knowing`, memory/context selection can become a theory-relative ideal rather than an ad hoc topic filter.
- In `gaming`, masks can be seen as finite embeddings between arena-facing predication fibers, improving the relationship between strategy equivariance and semantic transport.

This would create a new relationship between communicating translation, socializing observer morphisms, knowing context, and gaming masks.

### 2. Formal Concept Analysis For Knowledge Growth

`lib/relating/docs/formal-concept-analysis.md` exposes closed RMN terms for the Boolean FCA Galois pair, concept closure, and concept-pair checking.
`knowing` already has concept-map cohomology, but memory concept formation is not yet obviously driven by the shared FCA term surface.

Candidate capability: make `knowing`'s concept formation produce a RelMath FCA receipt over memory/document predication cells:

- extent: documents, observations, memories, or agents under study;
- intent: predicates/features/tags/frontmatter fields shared by that extent;
- closure: the concept grown by the Galois pair;
- obstruction: documents or predicates that prevent a requested concept from being closed.

This would improve `knowing` by grounding "conceptualize" and "inspect topic" in the public theory of knowing as concept formation over the knowledge order.
It would also improve `communicating`: discourse topics from `cohere` could be offered as candidate extents for a knowing concept closure.

### 3. Predicating Quantifiers And Modal Knowledge

`@emsenn/relating` exports finite fibration, `existsF`, `forallF`, truth-quantifier receipts, predicating hyperdoctrine receipts, equality cells, and paraconsistent equality.
`knowing` already has `know-possibly`, `know-necessarily`, doubt/forget/reflect, and proof search, but much of that still appears as package-local epistemic behavior rather than a visible fibration/quantifier witness.

Candidate capability: epistemic modal receipts for `knowing`:

- `know-possibly` as existential quantification over accessible knowledge-state fibers;
- `know-necessarily` as universal quantification over those fibers;
- `same-pattern` or `discern` as paraconsistent equality over predication cells;
- `doubt` as a dual-hyperdoctrine or cosettling receipt where appropriate.

This is not arbitrary modal logic.
It formalizes the public theory that knowing is a comonadic/fibered movement over the bilattice knowledge order.

### 4. Value-Category Settling Beyond FOUR

`lib/relating/docs/value-category-settling.md` exposes a generic finite/sample value-category interface: callers supply equality, order, bottom, and closure, then receive partial-order, closure-law, fixed-point, least-settling, and regime witnesses.

This is under-realized outside `computing`'s stochastic convergence receipt.
It would improve packages whose public theory already has value-like order but not necessarily FOUR-only value:

- `socializing`: preferences, prices, power, allocations, and coalition viability can carry finite value-category law checks instead of bare numeric ranking.
- `gaming`: payoff/order, deep-play stakes, and market-admission reads can expose whether their chosen value carrier is ordered and closure-respecting.
- `computing`: capability decisions and work classification can carry a value category receipt for resource/cost/risk lattices.
- `playing`: skill, affect, and discipline can use finite closure witnesses where their values are not simply charge values.

Candidate capability: a small shared pattern, not a new framework: every package that admits a non-FOUR ordered value can expose a `valueCategory` receipt beside the domain-specific verdict.

### 5. KZ And Quantale Sheaves For Social Translation Quality

`lib/relating/docs/kz-coherent-sheaf.md` and `lib/relating/docs/quantale-enriched-sheaf.md` are public finite runtime surfaces.
`socializing` has H1 consensus and regime coordination, but it does not yet use these receipts.

Candidate capability: enriched social coherence receipts:

- Use KZ coherence to distinguish strict/Scott observer routes whose section maps identify parallel translations from routes where coherence is a real selection condition.
- Use the FOUR/Charge quantale surface to grade social or communicative equivalence.
  A translation can be more than "exists"; it can carry a charge-valued hom/grade.
- Use quantale-enriched H0 fixed-point reads as a stronger companion to the current `common-ground` section.

This belongs in `socializing` because the package theory is explicitly a multi-observer system `V : O -> Settlings_B`.
It also relates back to `communicating` translation and `knowing` context fibers.

### 6. Aperiodic And Substitution Dynamics For Regimeful Play

`lib/relating/docs/aperiodic-classification.md`, `lib/relating/docs/substitution-dynamics.md`, and `lib/relating/docs/sofic-shift.md` expose finite aperiodic/substitution/sofic runtime surfaces: H1 coordinates, step rules, finite substitution orbits, incidence matrices, recurrence hierarchy, MLD/hull reads, and finite classifiers.

`socializing` and `gaming` already name aperiodic regimes, and `gaming` has strategy dynamics, flow, deep play, and repeated-play loops.
But the finite substitution/sofic machinery is not yet visibly realized in these capability packages.

Candidate capabilities:

- `gaming/read-regime` can distinguish merely cyclic play from substitutional or aperiodic strategy dynamics using finite recurrence or sofic witnesses.
- `playing/running` chronicles can expose a substitution-orbit receipt for repeated designs without changing the core ludics cut carrier.
- `communicating` can read semiosis or translation drift as finite substitution dynamics over sign tokens when the discourse itself repeats by rule.
- `socializing` can use aperiodic classification to decide when a federation must exchange trajectories rather than endpoint states.

This is not "math because math."
It formalizes existing public language: regimes, chronicles, semiosis, repeated play, and federation discipline.

### 7. Frobenius/TQFT For Cut And Gluing Receipts

`lib/relating/docs/frobenius-tqft.md` exposes a finite worked Frobenius algebra, degree receipts, and TQFT receipts where H0 sits on the unit axis and H1 on the top axis.

The strongest downstream fit is `playing`, because playing's public theory is star-autonomous duality and cut.
A finite Frobenius receipt could formalize composition/gluing around cuts and behaviours:

- `playing/ludics` can attach a degree receipt to interactions or behaviours, distinguishing connected closure (`H0`) from obstruction/cycle (`H1`) in the same algebraic idiom as the package's cut law.
- `gaming` can lift that receipt to multi-player arena composition.
- `socializing` can use the same degree vocabulary for common-ground gluing, making the relation between social consensus and ludic cut visible.

This would create a new relation between playing's cut, gaming's arena composition, and socializing's sheaf gluing.

### 8. Chu Spaces As A Shared Boundary Between Communication And Play

`lib/relating/docs/chu-spaces.md` exposes finite Chu pairing terms.
`playing` already speaks star-autonomous duality and `communicating` speaks endomorphic meme morphisms, but the boundary between "a message offered" and "an interaction answered" is not yet explicitly carried as a Chu pairing receipt.

Candidate capability:

- `communicating` can project a speech act as a Chu point/state lookup: speaker offering a sign, listener/context answering it.
- `playing` can use the same receipt for design/opponent compatibility without smuggling communicative language into the ludics core.
- `gaming` can lift the pairing over masks or strategies.

This is a clean relationship-builder between faculties: communication produces a paired surface that play can cut against.

## Suggested Order

1. Start with `knowing` + FCA/fibration.
  It is close to existing public theory and should produce a concrete action/result without touching the other packages.
2. Then wire predication-fibration receipts into `communicating.translate` and `socializing` observer translations as the first cross-faculty relation.
3. Add value-category receipts only where a package already admits ordered non-FOUR values, such as social price/preference or gaming payoff/stakes.
4. Keep KZ/quantale, aperiodic/substitution, Frobenius/TQFT, and Chu as second wave surfaces after the first receipts prove the carrier pattern.

## Verification Notes

No code was changed while preparing this survey.
The current worktree already had an unrelated modified nested site: `sites/relmath.bare-cedar-fog.emsenn.net`.

The report depends on source inspection, not test execution.
Before implementing any candidate above, re-read the specific package's public README, exports, and the relevant `lib/relating/docs/*.md` page, then add or adjust behavior only at the package's normative carrier/action boundary.
