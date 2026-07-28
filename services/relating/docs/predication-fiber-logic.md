# Predication Fiber Logic

The predication-fiber surface is where value enters a predication site without turning the site into an ordinary graph.
A `Meme` binds one predication cell to a FOUR charge; a `FiberAlgebra` collects charged cells over one predicate; a `PredicateFiber` reads a charge value at each subject/object coordinate.

The same surface also exposes the current finite linear-logic layer over FOUR: tensor-like fusion, residuum, linear negation, par, consistency checks, and truth-order residuation witnesses.
At the fiber level those operations run cellwise, and predication generators can be checked for pullback preservation and Frobenius-style behavior.

This is not a full proof search engine and not the whole Lambek/Chu program.
It is the executable finite layer where downstream Node code can carry value-bearing predication data as explicit fibers.

## Public Handle

Import through the articulating subpath:

```js
import { mark, token, claim, predicating } from "@emsenn/relating/articulating";

const { positing } = predicating;
const { logic } = positing;
```

The main public functions are:

- evidence and fibers: `meme`, `fiberCarrier`, `composeFibers`, `fiberFromAlgebra`, `valuationFromPredicateFiber`, `chargeAt`
- fiber readers: `predicateFiber`, `predicateFiberCellIdentity`, `allCells`
- orders: `knowledgeOrder`, `truthOrder`
- cellwise linear operators: `predicationFiberLinearFusion`, `predicationFiberLinearResiduum`, `leqTruthPredicateFiber`
- generator checks: `converse`, `subjectProjection`, `objectProjection`, `specialization`, `generatorPreservesLinearFusion`, `generatorPreservesLinearResiduum`, `generatorSatisfiesLinearFusionFrobenius`
- value logic: `logic.linearFusionValue`, `logic.linearResiduumValue`, `logic.linearNegationValue`, `logic.linearParValue`, `logic.chargeConsistency`, `logic.truthOrderResiduation`

## API Reference

The generated API docs expose this surface through two adjacent modules:

- `lib/articulating/predicating/positing/fiber` owns the `Meme`, `FiberAlgebra`, `Valuation`, and `PredicateFiber` carriers; the finite generator constructors; presheaf projection through `posit`; and the preservation/Frobenius checks over finite support.
- `lib/articulating/predicating/positing/logic` owns the value-level FOUR operations and witness/obstruction judgments: fusion, residuum, linear negation, par, consistency, and truth-order residuation.

That split is intentional.
`logic` is the alphabet; `fiber` is the cellwise lifting over finite predication sites.
Neither module is a complete proof-net, sequent-calculus, or Chu-transform runtime.

## What It Computes

A predicate fiber is a finite reader:

```text
(subject, object) -> FOUR charge value
```

The caller supplies the finite entity set, predicate label, and charge-value reader.
The package freezes the fiber and gives back explicit operations:

- cellwise fusion of two fibers
- cellwise residuum of two fibers
- truth-order comparison between fibers
- pullback/exists/forall along finite predication generators
- preservation/Frobenius witnesses as booleans over the finite support

The value-level linear-logic functions operate directly on FOUR charge values.
They are useful when a caller wants the alphabet facts without constructing a whole fiber.

## Example

```js
import { mark, token, claim, predicating } from "@emsenn/relating/articulating";

const { positing } = predicating;
const alpha = token(mark("alpha"));
const beta = token(mark("beta"));
const entities = predicating.entitySet([alpha, beta], predicating.termCoincides);
const supports = predicating.predicateOfClaim(claim(mark("supports")));

const fiber = positing.predicateFiber(
  supports,
  entities,
  (subject, object) =>
    predicating.termCoincides(subject, object)
      ? positing.chargeValue("potential")
      : positing.chargeValue("active"),
);

const converse = positing.converse(entities);
const pulled = converse.pullback(fiber);

positing.chargeValueName(pulled.at(beta, alpha)); // "active"
```

See `examples/predication-fiber-logic.mjs` for a runnable example covering value-level residuation, fiber-level fusion/residuum, generator preservation, and specialization support.

## Mathematical Grounding

RelMath's `Positing` module states the finite charge/valuation spine: a valuation assigns a FOUR charge to each predication cell, and the knowledge-least valuation is the bottom seed.
RelMath's `LinearLogicChu` module places FOUR as a linear-logic/Chu alphabet whose tensor/hom adjunction and involution are proven on the Lean side.

The content tree around predicate-category naturality and predicate-generator residuation describes the larger categorical setting: predicate generators act on predication fiber algebras by reindexing, existential folds, and universal folds.
The Node surface implements the finite, executable part of that story.

## Boundary

Use this surface when you need:

- finite FOUR-valued predicate fibers
- explicit value entry by evidence-bearing memes
- cellwise linear fusion and residuum over predication fibers
- pullback/exists/forall along the current finite generator constructors
- finite preservation checks for a chosen generator and support

Do not use it as:

- a full noncommutative Lambek calculus implementation
- a general proof-net or sequent-calculus engine
- a complete Chu transform category runtime
- a replacement for Lean proofs or Lean-emitted conformance vectors
