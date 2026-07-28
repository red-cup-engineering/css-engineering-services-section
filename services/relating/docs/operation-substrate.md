# Operation Substrate

The smallest useful reading of `@emsenn/relating` is:

```text
carrier + action + optional runTerm -> projected boundary
```

That is the package's operation substrate.
It is the part that turns a package API from a bag of opaque handlers into a small typed category: declared objects, declared arrows, and projected faces.

Read one layer down, the operation substrate is a convenient entrance to the settling substrate: carrier morphisms produce typed boundary facts, action witnesses can enter an append-only trace field, and holography can project that field into ordinary state or content.

## The Shape

A carrier is authored once:

- the TypeScript type comes from TypeBox
- the JSON Schema document carries the same bare `$id`
- the runtime validator is compiled from that schema
- the `$id` is the address used for composition

An action is authored once:

- `verb` names it at every boundary
- `domain` and `codomain` make it a carrier-to-carrier morphism
- `inputFormat` and `outputFormat` say how the boundary decodes and encodes
- `runTerm`, when present, carries the behavior as RMN data
- `run` is the executable body the dispatcher calls

The acting wrapper derives `run` from `runTerm` when no host callback is given.
That is the important move: pure behavior can be carried as data and evaluated at the boundary.

## What `operation-substrate.mjs` Proves

The runnable example declares a tiny `Note -> Summary` morphism:

```text
Note carrier --summarize-note--> Summary carrier
```

The body is:

```js
tm.lam(tm.field("summary", tm.var(0)))
```

So the example is intentionally small.
It only reads one field.
That is enough to show the substrate:

- both sides are carriers
- the action is classified as a morphism
- the action carries a closed `runTerm`
- `freeTsActions` reports no remaining host-only carrier morphism
- `induceBins` projects endpoint metadata, schema resources, prompts, and utterance facts
- the bound dispatcher runs the same action through the boundary

Run it with:

```sh
pnpm run build
node examples/operation-substrate.mjs
```

Or run all examples:

```sh
pnpm run examples
```

## What This Does Not Claim

This example does not claim every useful package operation is already RMN.
Raw admission, transport, filesystem, network, and other host effects remain boundaries.
It also does not claim the package is a complete proof assistant.

The current claim is narrower and stronger: when an operation is a pure carrier-to-carrier morphism, `@emsenn/relating` can carry its behavior as a typed, total, inspectable term and project the same declaration to the package's boundary faces.
