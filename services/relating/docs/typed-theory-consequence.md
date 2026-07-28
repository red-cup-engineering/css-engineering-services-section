# Typed Theory Consequence

The typed-theory surface is a finite consequence workbench over predication base objects.
It takes the same predication data the rest of the package uses, derives inference rules from the four predication generator classes, closes those rules under composition, and searches for derivations.

This is not a general theorem prover.
It is the package's executable read of "what follows from these predication cells and specialization edges?" over the finite material you provide.

## Public Handle

Import through the articulating subpath:

```js
import { mark, token, claim, predicating } from "@emsenn/relating/articulating";

const { typedTheory } = predicating;
```

The main public functions are:

- `theoryOfData(data)` builds a typed theory from cells and specialization morphisms.
- `derive(theory, premise, conclusion)` breadth-first searches for a derivation.
- `typing(theory, premise, conclusion)` returns a typing witness or obstruction.
- `derivationClosure(theory)` closes inference rules under composition.
- `typedTheoryProofCarrier(theory)` packages closure, judgments, obstructions, and rank.
- `predicateWordArrow(...)
  `, `composePredicateWords(...)
  `, and `predicateWordResidue(...)
  ` saturate predicate-word arrows.

The underlying predication functions live beside it:

- `cell(subject, predicate, object)`
- `predicateOfClaim(claim)`
- `specializationMorphism(specialized, general)`
- `baseObjectCoincides(left, right)`

## API Reference

The generated TypeDoc module is `lib/articulating/predicating/typed-theory`.
It is the code-adjacent reference for the carrier interfaces, inference morphism names, derivation search result shapes, closure readers, and predicate-word helpers.

This page describes the product boundary.
`typedTheory.typing(...)
` is a derivability judgment inside a finite predication theory.
It is not the CHL term calculus typechecker exposed by the package's term IR surface, and it is not a replacement for Lean proofs.

## What It Computes

A cell `s -p-> o` contributes three canonical inference rules from its predication node `[s,p,o]`:

- converse: `[s,p,o] -> [o,p,s]`
- subject projection: `[s,p,o] -> s`
- object projection: `[s,p,o] -> o`

A specialization edge currently contributes a specialization rule from the general term to the specialized term.
The theory then composes rules until no new domain/codomain pair appears.

The important product shape is not "strings imply strings."
The premises and conclusions are predication base objects: terms, predicates, cells, and generated base nodes.
The output is witness-shaped data with explicit derivation steps.

## Example

```js
import { mark, token, claim, predicating } from "@emsenn/relating/articulating";

const subject = token(mark("alpha"));
const object = token(mark("beta"));
const predicate = predicating.predicateOfClaim(claim(mark("supports")));
const datum = predicating.cell(subject, predicate, object);
const node = [subject, predicate, object];

const theory = predicating.typedTheory.theoryOfData([datum]);
const judgment = predicating.typedTheory.typing(theory, node, object);

judgment.kind; // "typedTheory.typing:witness"
judgment.derivation.steps[0].rule.trace.morphisms[0].kind;
// "typedTheory.inferenceMorphism.objectProjection"
```

See `examples/typed-theory-consequence.mjs` for a runnable example that also checks closure and predicate-word residue.

## Mathematical Grounding

RelMath's predicating spine treats predication as the generator of a category: the oriented cell `(subject, predicate, object)` has converse, subject-projection, object-projection, and specialization morphisms.
The Node surface implements the finite, carrier-shaped consequence layer over those same generators.

The surrounding positing and linear-logic material matters because value later enters the same predication base by evidence and fibers.
This typed-theory surface does not compute all Lambek or Chu laws; it gives downstream Node code a small, inspectable consequence engine before value entry and settlement.

## Boundary

Use this surface when you need:

- a finite derivation witness over predication cells and specialization edges
- an obstruction with the explored frontier when no derivation is found
- composition closure of the generated inference rules
- predicate-word saturation over finite arrows

Do not use it as:

- a replacement for Lean proofs
- a full substructural proof search engine
- a complete category runtime for arbitrary predicates
- a text classifier or natural-language inference system
