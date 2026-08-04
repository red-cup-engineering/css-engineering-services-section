# Radial SVG Projection

The radial SVG surface projects charged relational data into deterministic, self-describing SVG bytes.
It is part of `@emsenn/relating/writing`: a representation boundary, not a new ontology.

The useful product shape is:

```text
PredicateFiber / Valuation -> RadialDataform -> SVG resource
```

The input remains package data until the final projection.
The output carries a `data-codec="radial"` marker, charge attributes, ring ordinals, and orbit labels so `radialProjector` can recognize the resource later.

## Public Handles

Import from the writing subpath:

```ts
import {
  projectRadial,
  radialFromValuation,
  radialFromClosureStages,
  radialProjector,
  segmentOfMeme,
  chargePalette,
} from "@emsenn/relating/writing";
```

Useful types:

- `RadialDataform`
- `RadialRing`
- `RadialSegment`
- `ChargePalette`
- `Orbit`

## API Reference

Generated TypeDoc for `@emsenn/relating/codecs/text/xml/svg/radial` names the radial dataform, projection options, palette, adapters, and `radialProjector`.
Generated TypeDoc for `@emsenn/relating/writing` shows where the same symbols are re-exported from the broader representation catalog.

## What It Reads

A radial diagram has concentric rings and charged segments:

- each ring has an `ordinal`
- each segment carries a `ChargeCarrier`
- segment fill comes from the FOUR charge value
- segment orbit is `diagonal` for self-pairs and `off-diagonal` for cross-pairs
- segment order is key-sorted before rendering, so equal data yields equal bytes

`radialFromValuation` turns a finite predication valuation into one ring per predicate fiber.
`radialFromClosureStages` turns a valuation-closure sequence into one ring per ordinal stage.

## Example

```js
import { radialFromValuation, projectRadial } from "@emsenn/relating/codecs/text/xml/svg/radial";

const radial = radialFromValuation(valuation, {
  title: "Support fiber",
});

const svg = projectRadial(radial, { center: "base" });
```

Run the full example:

```sh
pnpm run build
node examples/radial-svg-projection.mjs
```

It builds a finite FOUR-valued predicate fiber, derives a valuation, projects it to a radial dataform, renders SVG, and checks that `radialProjector` recognizes the result.

## Boundary

This surface is not a graph layout engine, canvas renderer, visualization framework, or browser component.
It has one canonical polar layout.
General placed diagrams belong to `projectSvg`; interactive UI belongs outside this package.
The radial codec exists so charged relation material can cross the representation boundary as stable, inspectable SVG bytes.
