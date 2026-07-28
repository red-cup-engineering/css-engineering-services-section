# Diataxis FOUR Read

`@emsenn/relating` exposes Diataxis as a small value-level read over the package's existing FOUR charge algebra.
It does not introduce a second algebra for tutorial / how-to / explanation / reference; it transports those four modes through `ChargeValue`.

This is the package-side executable slice of the broader Diataxis/learning frontier.
It is useful when a caller wants to classify a fourfold surface by the same paraconsistent charge vocabulary already used by predication, positing, and settling.

The point is not that `@emsenn/relating` now manages a documentation site.
The point is smaller and more reusable: the documentation quartet can be treated as another finite read of the same FOUR carrier that already powers charge, duality, relation matrices, and settlement products.

## Public Handles

Import from the package root:

```ts
import {
  chargeValueOfDiataxisMode,
  diataxisApplication,
  diataxisCognition,
  diataxisDoingDual,
  diataxisLookupDual,
  diataxisMode,
  diataxisModeOfCharge,
  diataxisReading,
} from "@emsenn/relating";
```

Or through the shaped namespace:

```ts
import { predicating } from "@emsenn/relating/articulating";

const reading = predicating.positing.diataxisReading();
```

## API Reference

Generated TypeDoc for `lib/articulating/predicating/positing/diataxis` documents the exported mode names, `DiataxisReading`, charge transport helpers, axis reads, and duality functions.
This page is the product reading: Diataxis is currently a finite FOUR read, not a documentation-management subsystem.

## Mapping

The Node mapping is by bilattice role:

| Diataxis mode | Package `ChargeValue` | Application | Cognition |
| --- | --- | --- | --- |
| `tutorial` | `absurd` | `false` | `false` |
| `how-to` | `potential` | `true` | `false` |
| `explanation` | `active` | `false` | `true` |
| `reference` | `stable` | `true` | `true` |

That means:

- `diataxisLookupDual` is existing charge conflation: `tutorial <-> reference`, with `how-to` and `explanation` fixed.
- `diataxisDoingDual` is existing charge negation: `how-to <-> explanation`, with `tutorial` and `reference` fixed.
- `diataxisAntipode` is the composite FOUR gauge element.

RelMath/content notes sometimes name the recurring corners directly as `potential`, `active`, `stable`, and `absurd`.
The package's `ChargeValue` names carry evidence-coordinate semantics: `absurd` is no evidence, `potential` is the truth side, `active` is the falsity side, and `stable` is both sides.
This module therefore maps Diataxis by role into the package charge square rather than by surface label coincidence.

The content-local Lean witness `content/.../learning/content/diataxis/lean/DiataxisFour.lean` proves the Diataxis quartet as a recurring FOUR over RelMath's `Corner` vocabulary.
That file is not currently a built `lean/RelMath` module in this checkout.
The Node surface here is the corresponding package carrier read over exported `ChargeValue` data.

## Example

Run:

```sh
pnpm run build
node examples/diataxis-four.mjs
```

It prints:

- each Diataxis mode
- the carried FOUR charge value
- the application and cognition axis reads
- lookup, doing, and antipode duals

The example also asserts the mapping and dualities before printing.

## Boundary

This surface is not a documentation generator, a Diataxis site map, or a learning-cycle engine.
It is the first code-backed package slice: a total finite read over FOUR.

What exists now:

- a public `DiataxisMode` carrier;
- a transport between Diataxis modes and package `ChargeValue`s;
- application/cognition axis reads;
- lookup, doing, and antipode dualities derived from existing charge operations;
- a runnable example that asserts the mapping before printing it.

What does not exist yet:

- a Diataxis coverage analyzer over real documentation files;
- a learning-cycle or learning-depth carrier;
- a registered learning action or RMN term catalog entry for learning closure;
- an educational measurement API.
