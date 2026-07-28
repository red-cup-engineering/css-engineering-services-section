# Diataxis And Learning Closure Frontier

This note records a product-shaped pressure visible from content and Lean.
Some small public `@emsenn/relating` slices now exist; the broader learner-domain and action surface remains frontier work.

## Evidence

- `content/_triage/2026/06/24/2026-06-24-settling-substrate-unification-synthesis.md` names the architectural claim: FOUR-valued settling can be one coordination substrate whose projections look like graph storage, CRDT merge, audit logs, anomaly reads, workflows, and contradiction management.
- `content/.../bilattice/learning/content/diataxis/docs/explanations/diataxis-is-the-recurring-four.md` reads the four Diataxis documentation modes as the recurring FOUR: tutorial, how-to, explanation, and reference inherit the bilattice orders and diagonal symmetries.
- `content/.../learning/content/diataxis/lean/DiataxisFour.lean` is a content-local Lean witness for that claim.
  It imports RelMath and is meant to be re-checked by copying it into the RelMath Lake project; it is not currently a built `lean/RelMath` module.
- `content/.../learning/content/learning-cycle/docs/explanations/learning-as-closure.md` reads learning as a monotone inflationary closure process whose depth is a closure-ordinal regime.
- `content/.../learning/content/learning-cycle/lean/LearningClosure.lean` is the corresponding content-local Lean witness.
  It imports RelMath closure modules and names `LearningOperator.no_cycle`, `four_depths`, and `depth_is_four`.
- `lean/RelMath/Closure/ClosureOrdinalRegime.lean` is the built RelMath support currently available to Node-facing work: `ClosureRegimeData`, `classify`, `four_regime_dichotomy`, and `regime_is_four_corner`.
- `lean/verso-docs/RelMathManual/PartVI/DiataxisCoverage.lean` records Diataxis as a RelMath documentation coverage discipline, not as a runtime package API.

## Current Node Surface

`@emsenn/relating` already has pieces this could descend into:

- FOUR charge algebra and the D4 gauge over the value square.
- A Diataxis FOUR read: `DiataxisMode`, charge transport, axis reads, diagonal dualities, `diataxisReading`, and `examples/diataxis-four.mjs`.
- Settlement readers and measurement terms for closure-regime classification.
- The closure-regime workbench, which can classify finite/sample regime data and expose the strict / Scott / transfinite / aperiodic four.
- A learning-depth read over admitted closure-regime data: rote, automatization, conceptual-change, and adaptive-expertise.
- An observed learning-cycle read over closure carriers: finite-orbit ascent, nontrivial-return, stabilization, and depth.
- The internal product docs now name Diataxis as a shipped finite read and learning depth plus observed learning cycle as shipped finite reads.
  Learning closure as registered action/learner-state process remains the remaining frontier.
- RMN terms as inspectable, total, side-effect-free morphism bodies.
- Running and ledger projections that can turn one registry and one trace field into CLI, HTTP, MCP, state, record, and content views.

That is enough to say the package is structurally prepared for this product.
It is not enough to say the product exists.

## Product Boundary

The closest honest product sentence is now:

> Relating already ships the FOUR algebra, closure-regime machinery, RMN term substrate, documentation/product map, and a code-backed Diataxis FOUR read.
> It now also ships learning depth as a read over closure-regime data and an observed learning-cycle read over closure-carrier traces.
> The content and Lean notes show the richer mathematical target for learning closure, but the package does not yet export a learner-state domain carrier or registered learning action.

That boundary matters because this package is otherwise unusually tempting to over-sell.
The Diataxis/learning material is not a marketing story pasted onto the code; it is a plausible next descent of the same finite FOUR and closure machinery.
The Diataxis descent now has a carrier and example, so it belongs in user docs.
Learning depth now has a small carrier/read, and learning cycle now has a closure-trace read.
Richer learning closure still belongs in developer/frontier notes until the package owns a learner-state domain carrier and action surface.

## Shipped Before User Docs

The first Diataxis slice is now present in the package:

- a Diataxis carrier or charge-to-Diataxis reading with a public export,
- total readers for the two Diataxis axes and the two diagonal dualities, derived from existing charge operations,
- a runnable example that asserts and prints the reading, and
- user docs that keep the boundary at finite FOUR transport.

## Still Missing Before Broader Learning User Docs

Do not document learning closure as a learner-domain process feature until the Node package has at least:

- a learner-state carrier or domain-specific closure trace beyond the generic closure carrier,
- one registered action or RMN term catalog entry that computes the learning reading, and
- a runnable example with tests or conformance vectors appropriate to the learning claim.

## Likely Implementation Route

The next package slice after the observed learning-cycle read should be deliberately small:

1. Add a registered learning action or RMN term entry over the observed learning-cycle carrier.
2. Add a learner-state lattice example when there is a real downstream use case.
3. Only then promote learning closure as a domain process rather than a closure-trace read.

Until that exists, richer learning closure belongs under "frontier product candidates."
