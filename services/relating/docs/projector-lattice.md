# Holography Projector Lattice

The projector kernel is the small surface behind the package's representation boundaries.
A `Projector<T>` recognizes a boundary resource, can optionally read it into carried values of type `T`, and can optionally write those values back.

This is exposed at:

```ts
import { define, restrict, classify, entails } from "@emsenn/relating/projections";
```

The broader writing catalog also re-exports `classify`, `entails`, and `restrict` for ordinary codec use:

```ts
import { classify, entails } from "@emsenn/relating/projections";
import { xmlProjector as xml } from "@emsenn/relating/codecs/text/xml";
import { radialProjector } from "@emsenn/relating/codecs/text/xml/svg/radial";
import { svgProjector } from "@emsenn/relating/codecs/text/xml/svg";
```

## The Shape

`define` creates a root projector.
`restrict(parent, spec)` creates a child whose recognition entails the parent:

```text
recognize(child) = recognize(parent) and recognize(local)
```

If a child does not provide its own `read` or `write`, it inherits those morphisms from the parent.
`entails(projector)` returns the child-to-root chain.
`classify(resource, catalog)` returns the deepest recognizing projector from a catalog.

The built-in XML/SVG/radial branch is the clearest package example:

```text
xml <- svg.xml <- svg.radial
```

A radial SVG resource is still XML and still SVG, but its most specific projector is `svg.radial`.

## Example

Run:

```sh
pnpm run build
node examples/projector-lattice.mjs
```

The example:

- renders a radial SVG resource
- classifies it through `xml.xmlProjector`, `svgProjector`, and `radialProjector`
- prints the entailment chain `svg.radial -> svg.xml -> xml`
- defines a tiny custom text-line projector and a restricted note-line child
- checks that the child inherits `read` and `write`

## Boundary

This is not filesystem routing, not action dispatch, and not a plugin registry.
The action boundary lives under `@emsenn/relating/running`.
The projector kernel is representation-facing: it says how a resource can be recognized, read, and written as carried data.

The older `/holography` export points at this projector kernel.
New code should prefer `@emsenn/relating/projections`.
