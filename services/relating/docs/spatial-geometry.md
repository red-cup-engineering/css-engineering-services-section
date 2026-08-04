# Spatial Geometry

The predicating geometry surface contains exact one-dimensional cut-and-project machinery over real quadratic fields.
It is a small executable bridge between the package's predication geometry and the aperiodic/quasicrystal thread in RelMath/content.

The public handle is namespaced under the articulating subpath:

```js
import { predicating } from "@emsenn/relating/articulating";

const { spatial } = predicating.geometry;
```

Use `@emsenn/relating/writing` only when crossing a representation boundary, such as building rational coefficients from native numbers or printing lossy numeric approximations.

## What It Does

`spatial` exposes exact arithmetic in a real quadratic field `Q(sqrt(d))`:

- `quadraticRational`, `quadraticFromInts`, `quadraticFromRational`
- `quadraticAdd`, `quadraticSubtract`, `quadraticMultiply`, `quadraticScale`
- `quadraticConjugate`, `quadraticCompare`, `quadraticLess`, `quadraticLeq`, `quadraticEqual`

On top of that field, it exposes finite one-dimensional cut-and-project model set reads:

- `cutProjectScheme(slope)` admits an irrational quadratic slope.
- `latticeSite(unit, slopeCount)` names a site of `Z^2`.
- `physicalProjection(scheme, site)` reads `m + n alpha`.
- `internalProjection(scheme, site)` reads the Galois conjugate coordinate.
- `acceptanceWindow(lower, upper)` creates a half-open internal window.
- `windowAcceptance(...)
  ` returns a witness or obstruction.
- `modelSet(scheme, window, radius)` samples accepted sites in a finite square.
- `gapSpectrum(modelSet)` reads successive physical gaps as a word over distinct gap lengths.
- `refutePeriod(spectrum, period)` refutes one proposed period over the sampled gap word when it finds a mismatch.

Two of those reads are deliberately judgment-shaped:

- `windowAcceptance` returns `meme-geometry.cutProject.acceptance:witness` for a realized site and `meme-geometry.cutProject.acceptance-obstruction` for a site whose internal coordinate falls outside the half-open window.
- `refutePeriod` returns `meme-geometry.cutProject.aperiodicity:witness` only when the sampled gap word contains a mismatch for the proposed period.
  If the sample does not refute that period, it returns `meme-geometry.cutProject.aperiodicity-obstruction`.

That is the product shape: the package does not hide the finite decision inside an array filter or boolean helper.
It carries the witness or obstruction as data.

## Example

```js
import { predicating } from "@emsenn/relating/articulating";
import { fromRatio } from "@emsenn/relating/codecs/host/javascript/numbers";

const { spatial } = predicating.geometry;

const phi = spatial.quadraticRational(5, fromRatio(1, 2), fromRatio(1, 2));
const scheme = spatial.cutProjectScheme(phi);
const window = spatial.acceptanceWindow(
  spatial.quadraticFromInts(5, 0, 0),
  spatial.quadraticFromInts(5, 1, 0),
);

const sampled = spatial.modelSet(scheme, window, 4);
const spectrum = spatial.gapSpectrum(sampled);
```

For a runnable version with assertions and printed exact/approximate gap reads, see [`examples/spatial-geometry.mjs`](../examples/spatial-geometry.mjs).

## Boundary

This is not a general computational geometry library.
It currently implements:

- exact `Q(sqrt(d))` arithmetic for small nonsquare radicands
- one-dimensional `Z^2` cut-and-project schemes
- window acceptance witnesses and obstructions
- finite model-set samples
- finite gap-spectrum reads
- finite sampled period refutations and non-refutation obstructions

`refutePeriod` is deliberately scoped: it refutes a proposed period over the sampled gap word.
It is not a global proof that the generated model set is aperiodic.

The conceptual ancestry is visible in the content notes around quasicrystal and aperiodic order, especially `content/_triage/2026/06/17/2026-06-17-mysterious-spacetime-geometries-of-the-void.md`.
The implemented Node surface is narrower and more concrete: exact quadratic coordinates, Galois conjugation, window acceptance judgments, and sampled model sets.
