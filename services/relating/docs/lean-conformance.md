# Lean Conformance

`@emsenn/relating` is not a Lean extraction target and does not claim the whole runtime is formally verified.
The current, implemented bridge is narrower and more useful: Lean emits golden-vector rows for small computable law surfaces, and the Node package replays those rows through the public TypeScript/RMN API.

The committed fixtures live under `test/fixtures/`:

| Fixture | Lean emitter | What it checks |
| --- | --- | --- |
| `lean-four-golden.jsonl` | `sites/relmath.bare-cedar-fog.emsenn.net/conformance/ConformanceVectors.lean` | Complete finite tables for FOUR joins, meets, orders, negation, conflation, and double gauge. |
| `lean-chl-golden.jsonl` | `sites/relmath.bare-cedar-fog.emsenn.net/conformance/ConformanceVectors.lean` | CHL term development and normal forms for representative STLC/product terms. |
| `lean-domain-term-golden.jsonl` | `sites/relmath.bare-cedar-fog.emsenn.net/conformance/ConformanceVectors.lean` | RMN domain primitive reductions for marks, FOUR constants, charge tables, orders, and settle. |
| `lean-measurement-golden.jsonl` | `sites/relmath.bare-cedar-fog.emsenn.net/conformance/MeasurementVectors.lean` | Closure-regime classification and cohomology-vanishing cores. |

The package tests read those rows in `test/lean-conformance.test.mjs`.

## What This Means

Lean is the law source for the finite algebra and calculus surfaces listed above.
The JavaScript implementation is checked against Lean-emitted data, and the tests include deliberate broken implementations to prove the oracle bites.

Carrier-specific morphisms are a different layer.
The descent terms rebuild `lib/relating` carrier serialization that RelMath does not directly model, so those are checked differentially against the real TypeScript carrier operation and canonical wire form.
That is not weaker documentation; it is the correct authority boundary.

## Example

`examples/lean-conformance.mjs` reads the committed fixtures and replays representative rows.
It is self-checking: if the fixture counts or the sampled Lean/RMN/TypeScript agreements drift, the example exits non-zero.

```sh
pnpm run build
node examples/lean-conformance.mjs
```

The output reports fixture counts and representative agreement for:

- `potential joinK active = stable`
- a CHL development sample
- closure-regime classification through both RMN and TypeScript

Use this example as the quick product-level explanation of how Lean enters the Node package today.
Use `test/lean-conformance.test.mjs` for the full replay: that harness checks all committed rows for the covered surfaces and includes deliberately broken implementations to prove the oracle catches real drift.
