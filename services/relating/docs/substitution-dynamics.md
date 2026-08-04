# Substitution Dynamics

The dynamics surface is the package's finite read of substitution-dynamical settling.
It sits under settlement because the implemented objects are not a general dynamical-systems library: they are the executable part of the aperiodic-settling line that the package can presently compute.

Use it from:

```js
import { dynamicsTerms, recurrenceTerms } from "@emsenn/relating";
import * as dynamics from "@emsenn/relating/dynamics";

const { recurrence } = dynamics;
```

`@emsenn/relating/settling` also exposes the same surface as the `dynamics` namespace.

## What It Contains

- substitution symbols, words, rules, carriers, and finite substitution orbits
- abelianization of a rule into an exact integer incidence matrix
- primitive-matrix, Perron-convergent, characteristic-polynomial, Smith-normal, colimit, and step-N invariant reads over exact matrices
- gauge-labeling reads that compare FOUR gauge action with substitution incidence
- the `recurrence` submodule for the step-`n` co-incrementing hierarchy
- the `mld` submodule for finite MLD-invariant comparison over colimit structures
- the `hull` submodule for finite inverse-system thread checks and the hull/colimit invariant seam
- canonical Fibonacci and Padovan rules, their incidence matrices, and their derived characteristic polynomials

The package's incidence orientation is target-by-source: rows are target letters being counted and columns are source letters being substituted.
Some prose and Lean notes display the transpose convention.
The product claim is the derived finite invariant, not a particular matrix-printing orientation.

## Step-N Recurrence

The `recurrence` namespace reads the corpus's step-`n` observation as executable carrier data:

- one natural parameter `n` controls matrix dimension, recurrence depth, alphabet size, and cohomological rank
- the canonical `n + 1` bundle increments all four controlled quantities
- Fibonacci is the worked `n = 2` case with characteristic polynomial `x^2 - x - 1`
- Padovan is the worked `n = 3` case with characteristic polynomial `x^3 - x - 1`
- the `n = 2` case aligns with the FOUR square as `4 = 2^2`

The implementation derives the characteristic polynomials from the exact incidence matrices and refuses a growth-degree witness when the declared polynomial does not match the derived one.

The root package also exports RMN identity normalizers for the finite recurrence receipts:

- `recurrenceTerms.stepNAllEqual`
- `recurrenceTerms.growthDegree`
- `recurrenceTerms.stepNHierarchy`

It also exports RMN identity normalizers for the finite classifier/hull layer:

- `dynamicsTerms.mldInvariant`
- `dynamicsTerms.mutuallyLocallyDerivable`
- `dynamicsTerms.hullThread`
- `dynamicsTerms.hullSeam`

## MLD And Hull Reads

The `mld` namespace compares the implemented finite invariant of two substitution matrices.
The invariant is the colimit structure already computed by the parent module: rank, determinant, stable determinant, Smith normal form, and localized integer module.
Equal invariants produce a `substitution.dynamics.mld:witness`; unequal invariants produce an obstruction naming the separating component.

The `hull` namespace exposes the finite inverse-system side of the same Anderson-Putnam reading.
It checks coherent finite threads, gives a binary odometer inverse system for finite prefix stages, compares visible projections, and reads `hullSeam(matrix)` back to the same finite invariant used by `mld`.

These are finite carrier tools.
They do not construct local derivation maps between arbitrary tilings, materialize an uncountable hull, or classify every aperiodic substitution.

## API Reference

Substitution carrier construction:

- `substitutionSymbol`
- `substitutionRuleEntry`
- `substitutionRule`
- `substitutionCarrier`
- `substitute`
- `iterateSubstitution`
- `substitutionOrbit`
- `fixedPointClosure`

Exact matrix and invariant reads:

- `abelianize`
- `transposeSubstitutionMatrix`
- `charPolyOver`
- `primitiveMatrix`
- `perronConvergent`
- `colimStructure`
- `substitutionDual`
- `localizedIntegerModule`
- `stepNInvariant`

Gauge and self-duality reads:

- `gaugeLabeling`
- `gaugeImage`
- `inducedPermutation`
- `substitutionRuleSelfDual`

Step-`n` recurrence reads under `dynamics.recurrence`:

- `mkStepN`
- `stepNDataAllEqual`
- `degreeN`
- `monic`
- `samePolynomial`
- `growthDegree`
- `stepNHierarchy`
- `fibonacciSubstitution`
- `padovanSubstitution`
- `fibonacciIncidence`
- `padovanIncidence`
- `fibonacciCharacteristicPolynomial`
- `padovanCharacteristicPolynomial`
- `goldenRatioMinimalPolynomial`
- `plasticNumberMinimalPolynomial`
- `fibonacciStepN`
- `padovanStepN`

Finite classifier reads under `dynamics.mld`:

- `mldInvariant`
- `mutuallyLocallyDerivable`
- `carriersMutuallyLocallyDerivable`

Finite hull reads under `dynamics.hull`:

- `coherentThread`
- `threadsSeparated`
- `odometerHull`
- `constantHull`
- `hullSeam`

The API deliberately returns witnesses and obstructions rather than pretending a failed law check is an exception.
That is the same public posture as the rest of the package: finite carrier data in, explicit judgment out.

## Example

```js
import { dynamicsTerms, evaluateRunTerm, recurrenceTerms } from "@emsenn/relating";
import * as dynamics from "@emsenn/relating/dynamics";

const { hull, mld, recurrence } = dynamics;

const hierarchy = recurrence.stepNHierarchy(recurrence.fibonacciStepN.matrixDim);
const comparison = mld.mutuallyLocallyDerivable(
  recurrence.fibonacciIncidence,
  recurrence.fibonacciIncidence,
);
const thread = hull.coherentThread(
  hull.odometerHull(),
  ["", "0", "01"],
  (left, right) => left === right,
);

hierarchy.fibonacci.kind;
// "substitution.dynamics.recurrence.growthDegree:witness"

evaluateRunTerm(recurrenceTerms.stepNHierarchy, hierarchy).kind;
// "substitution.dynamics.recurrence.hierarchy"

evaluateRunTerm(dynamicsTerms.mutuallyLocallyDerivable, comparison).kind;
// "substitution.dynamics.mld:witness"

evaluateRunTerm(dynamicsTerms.hullThread, thread).kind;
// "substitution.dynamics.hull.thread:witness"
```

For the runnable version, see [`examples/substitution-dynamics.mjs`](../examples/substitution-dynamics.mjs).

## Product Reading

This is one of the places where the package stops sounding like "a relations library" and starts looking like a small mathematical instrument.
A substitution rule is not prose here: it is carrier data.
From that data the package derives finite words, exact incidence matrices, characteristic polynomials, primitivity/duality judgments, localized colimit reads, and step-N witnesses, all in the same witness/obstruction style as the rest of the package.

The useful product shape is not "compute all aperiodic tiling theory in Node."
It is narrower and stronger: a downstream package can ask for the finite substitution matrix, polynomial, primitive judgment, colimit read, and step-N co-incrementing witness without leaving the relating substrate.

## Mathematical Grounding

RelMath separates two claims that are easy to blur:

- `lean/RelMath/Aperiodic/StepN/Recurrence.lean` records the co-incrementing hierarchy: for canonical step-N data, matrix dimension, recurrence depth, alphabet size, and cohomological rank are one parameter.
- `lean/RelMath/Aperiodic/StepN/SubstitutionMatrix.lean` realizes the Fibonacci and Padovan substitutions as actual matrices and proves the polynomial identities around those matrices.

The content spine under `content/.../settling/content/aperiodic-settling/content/step-n-substitution-recurrence/` is broader: it discusses step-shifts, moduli, fixed points, and classifying invariants.
The Node package currently implements the finite exact matrix and witness layer adjacent to that spine.

## Boundary

This surface is not yet the full RelMath/content aperiodic program:

- it does not compute real Perron-Frobenius eigenvalues
- it does not prove a host-supplied substitution is Pisot, primitive, or MLD equivalent to another substitution beyond the finite checks exposed here
- it does not classify arbitrary substitutions up to MLD equivalence
- it does not implement the whole Anderson-Putnam direct-limit tower
- it does not expose the step-shift morphism, moduli substack, universality theorem, or every content node under aperiodic settling
- the `dynamicsTerms` RMN surface normalizes finite witness/obstruction carriers; it does not reconstruct the inverse-limit proof or an uncountable Cantor hull

The current authority is the implemented finite Node carrier surface, package tests, and the corresponding Lean/content spine:

- `lean/RelMath/Aperiodic/StepN/Recurrence.lean`
- `lean/RelMath/Aperiodic/StepN/SubstitutionMatrix.lean`
- `lean/RelMath/Aperiodic/InverseHull.lean`
- `content/.../aperiodic-settling/.../step-n-substitution-recurrence/`
