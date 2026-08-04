# Settlement Reader Terms

`readerTerms` is the package's settlement-reading catalog expressed as RMN.

Each reader is shaped as:

```text
read . free
```

The input is the slim settlement-filtration generator carrier produced by the descent actions.
The term first applies the free settlement construction, then computes the requested read inside the term calculus.

## Public Handles

Use the root catalog when you want the carrier readers as portable term bodies:

```ts
import {
  evaluateRunTerm,
  readerTerms,
} from "@emsenn/relating";
```

The catalog currently contains:

- `readClassification`
- `readDepth`
- `readDepthFiniteStageJudgment`
- `readLimitStages`
- `readNonScottFirings`
- `readFirstCohomology`
- `readGradedGap`
- `readGradedGapFirstCohomologyRankIdentity`
- `readClosureInvariant`

The direct TypeScript readers remain available through the settlement API, for example `readClassificationOfSettlementFiltration`.
The RMN terms are the portable morphism bodies; the TypeScript readers are the local package implementation they are checked against.

## What The Terms Do

The reader terms are not reading an already-materialized settlement object.
They expect the package's generator-shaped settlement carrier, then rebuild the settlement with `settlingTerms.free`.

That matters because the package stores and transports the slim carrier:

```text
SettlementFiltrationGenerators
  -> freeSettlementFiltration
  -> SettlementFiltration
  -> read
```

The term catalog expresses that whole path as data.
A reader can therefore be inspected, serialized, served through action metadata, replayed in tests, and compared through canonical bytes.

## Lean Boundary

The measurement core below the readers is Lean-grounded.
In `lean/RelMath/Closure/ClosureOrdinalRegime.lean`, `classify` decides the four closure regimes from the finite/Scott/countable-cofinality characterization, and `cohomologyVanishes` gives the strict/Scott versus transfinite/aperiodic table.

The Node reader terms sit one layer above that.
They also know the package's carrier serialization: stages, cell sets, limit stages, first cohomology, graded gaps, and closure invariants.
That carrier-specific shape is not a Lean fixture.
It is checked differentially against the real TypeScript readers over the real carrier and by canonical wire equality.

## Example

The runnable example:

```sh
node examples/settlement-reader-terms.mjs
```

checks the catalog over a generated settlement:

- every reader term agrees with `read . freeSettlementFiltration`
- classification lands in the finite closure regime for the ordinary descent
- first-cohomology rank equals graded-gap rank
- the rank-identity reader returns a witness
- the reader bodies remain closed RMN terms with inspectable opcodes

## Boundary

These are finite package readers over the settlement carrier that exists today.
They are not a general cohomology engine, transfinite ordinal runtime, or proof searcher.

The regime classifier and cohomology-vanishing table are Lean-backed.
The carrier-specific reader composition is checked against this package's TypeScript carrier implementation because RelMath does not own the Node wire format.
