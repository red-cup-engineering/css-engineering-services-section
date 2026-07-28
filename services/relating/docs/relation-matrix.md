# Relation Matrix

The predicating surface includes a finite FOUR-valued relation matrix.
It is the smallest direct Node carrier for "a relation whose cells carry evidence polarity" rather than booleans.

The public handles are available from the package root:

- `relationMatrix`, `matrixEntryReading`, `relationFromMatrix`
- `relation`, `relationRead`, `relationReadAbsence`
- `pointProfile`, `stateProfile`, `stateExtension`
- `transpose`, `dual`
- `checkRelationTransform`, `relationTransform`, `idTransform`, `composeTransforms`, `dualTransform`

## Shape

A matrix has points, states, and sparse populated cells:

```js
import { chargeValue, relationFromMatrix, relationMatrix } from "@emsenn/relating";

const same = (left, right) => left === right;
const matrix = relationMatrix(
  { kind: "predication.entitySet", entities: ["alpha", "beta"] },
  { kind: "predication.predicateSet", predicates: ["warm", "cold"] },
  [
    ["alpha", "warm", chargeValue("potential")],
    ["alpha", "warm", chargeValue("active")],
    ["beta", "warm", chargeValue("active")],
  ],
  { samePoint: same, sameState: same },
);

const carrier = relationFromMatrix(matrix);
```

Duplicate coordinates are not duplicated rows.
They join in the FOUR knowledge order, so the two `alpha/warm` entries above settle to `stable`: evidence for and evidence against are both present.

`relationFromMatrix` turns the sparse matrix into a carrier with `read(point, state)` and `at(point, state)`.
An absent sparse cell reads as the relation's absent value, currently `active` unless the caller supplies another one.

## Reads

The matrix exposes three practical reads:

- `pointProfile(carrier, point)` returns a row: every state and the charge at that point/state cell.
- `stateProfile(carrier, state)` returns a column: every point and the charge at that point/state cell.
- `stateExtension(carrier, state)` returns the points whose truth coordinate is present, currently the cells valued `potential` or `stable`.

That gives users a small "query" surface without importing a graph database model.
The query result is still carrier-shaped data over FOUR.

## Duality And Transforms

`transpose(carrier)` swaps points and states while preserving each cell value.
`dual(carrier)` also swaps points and states, then negates each FOUR value.
This matches the Chu-space vocabulary in RelMath: a relation matrix can be viewed as a point/state pairing over the FOUR alphabet.

Transforms use the same forward/backward shape:

```js
import { checkRelationTransform } from "@emsenn/relating";

const check = checkRelationTransform(
  source,
  target,
  (sourcePoint) => targetPoint,
  (targetState) => sourceState,
);
```

The check first ensures the mapped points and states land inside the target and source carriers, then checks the cell equality `target.at(forward(point), state) === source.at(point, backward(state))` for every source point and target state.
`relationTransform` returns a transform carrier or throws if adjointness fails.

Use `checkRelationTransform` when you want the package's total judgment rather than an exception boundary.
A successful check is a `bilattice.relation.transform:witness`; a failed check is a `bilattice.relation.transform-obstruction` with an exact-natural `rank` and typed failure atoms:

- `bilattice.relation.transform.forwardDomain-obstruction`
- `bilattice.relation.transform.backwardDomain-obstruction`
- `bilattice.relation.transform.adjointness-obstruction`

The runnable example includes a deliberately non-adjoint transform whose axes land in-bounds but whose `alpha/warm` cell disagrees.
The result is a one-atom adjointness obstruction carrying both FOUR values.

## Boundary

This is not an ORM relation, SQL relation, graph database adapter, or finished Chu category runtime.
It is the finite executable relation-carrier layer:

- sparse FOUR-valued matrices
- duplicate-cell knowledge joins
- row/column/extension reads
- transpose and dual over the same charge algebra used by predication
- checked adjoint transform carriers
- total transform judgments with typed obstruction atoms

Lean proves the abstract Chu/FOUR vocabulary in `lean/RelMath/Order/LinearLogicChu.lean`, and the charge algebra in `lean/RelMath/Positing.lean`.
The Node package exposes the carrier operations above as ordinary public API and verifies them through package tests and runnable examples.

For a runnable version, see [`examples/relation-matrix.mjs`](../examples/relation-matrix.mjs).
