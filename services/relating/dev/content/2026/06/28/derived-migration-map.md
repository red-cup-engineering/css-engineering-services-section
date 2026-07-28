# Derived migration map for `@emsenn/relating`

This map applies the normal form in `dev/docs/derived-normal-form.md` to the current package groups.
The strict target directory grammar is `dev/docs/derived-directory-grammar.md`.
The Node realization contract is `dev/docs/derived-node-realization-contract.md`.
The first concrete file-level slice is `dev/docs/derived-first-slice-language.md`.
The next carrier/action/RWIL slices are `dev/docs/derived-next-slices-carriers-actions-rwil.md`.
The target package export map is `dev/docs/derived-export-map-target.md`.
The evidence ledger is `dev/docs/derived-evidence-ledger.md`.
It is not a preservation map.
It says what each group must become when rewritten toward the derived architecture.

## Current Pressure Points

The package currently exposes:

- public root from `dist/src/index.mjs`;
- pure-ish subpaths from `dist/lib/...` such as `./articulating`, `./notating`, `./analysis`, `./settling`, and `./dynamics`;
- runtime/package subpaths from `dist/src/...` such as `./typing`, `./writing`, `./running`, `./ledger`, and `./evaluating`;
- bins from `dist/scripts/cli.mjs` and `dist/scripts/serve.mjs`;
- no package-root `apps/` or `services/` directories.

That means the current tree has already noticed two strata, but not enough:

```text
lib/      pure derivation material, incomplete and semantically nested
src/      mixed package realization, runtime law, codecs, projections, and some pure term work
scripts/  process entrypoints masquerading as scripts
apps/     absent
services/ absent
```

The rewrite should make the strata explicit.

## Group Migration

### `lib/articulating`

Current role:

- pure-ish derivation body for marks, utterances, articulation, predication, positing, settling, analysis, geometry, and dynamics.

Derived target:

```text
lib/primitive
lib/articulation
lib/language
lib/calculus
lib/site
lib/closure
lib/cohomology
lib/dynamics
lib/persistence
lib/relational
lib/computing
```

Required split:

- keep pure constructors, arrows, charge/order laws, settlement laws, cohomology/dynamics/persistence shadows in `lib/`;
- remove any runtime/package realization concerns into `src/`;
- split very deep semantic nesting when it hides stratum changes.

The target is not necessarily a single `lib/articulating` subtree.
The target is a derivation body where every module consumes an earlier stratum and derives the next one.

Proof obligation:

- no imports from `src/`, `services/`, `apps/`, `scripts/`, Node builtins, package registries, or process state;
- module names describe derivation role, not product name.

### `lib/notating`

Current role:

- RMN/term syntax and related type material.

Derived target:

```text
lib/language
```

Required split:

- pure syntax, type formation, substitution, normalization, and reduction law stay in `lib/`;
- evaluator entrypoints that depend on registries, package dispatch, fixtures, or codecs move to `src/evaluators`;
- Lean/vector serialization stays in `src/codecs`.

Proof obligation:

- a pure term reduction can run without the package action registry;
- runtime evaluator exports can be rebuilt from pure language law plus package wiring.

### `src/typing`

Current role:

- carrier runtime, schema interpretation, validation, registry, structural realization.

Derived target:

```text
lib/<stratum>/carrier-shapes
src/carriers
src/projections/declarations
```

Required split:

- carrier schema literals and object addresses move or remain with the pure stratum that owns them;
- runtime validation, process-local registry, and assertion helpers move to `src/carriers`;
- TypeScript declaration printing and JSON Schema publication are projections, not carrier law.

Proof obligation:

- every runtime carrier is derived from a pure shape;
- no pure carrier shape depends on the registry;
- the registry can be cleared/rebuilt without changing carrier truth.

### `src/evaluating`

Current role:

- mixed term evaluation, projection, measuring, connecting, pairing, reading, and settlement term surfaces.

Derived target:

```text
lib/language
lib/calculus
lib/closure
lib/cohomology
lib/dynamics
lib/persistence
src/evaluators
src/projections
```

Required split:

- pure RMN syntax/reduction/type law to `lib/language` or `lib/calculus`;
- pure finite theorem shadows to the derivation stratum they witness;
- package-level evaluator wiring and public evaluator barrels to `src/evaluators`;
- carrier-to-wire projection helpers to `src/projections` or `src/codecs`.

Proof obligation:

- finite math workbenches are not treated as runtime helpers;
- package evaluator surfaces import pure law, not the reverse.

### `src/actions/index.mts`

Current role:

- registered package action family, admission actions, descent actions, settlement reads, inspection, and codomain carrier declarations.

Derived target:

```text
lib/<strata>/action-law
src/actions
src/admission
src/projections
```

Required split:

- action/morphism/apex law goes to `lib/`;
- package-specific action declarations go to `src/actions`;
- raw mark admission actions go to `src/admission` if they parse host/wire input, with pure admitted shapes in `lib/`;
- inspection of package metadata remains `src/projections` or `src/actions/inspection`;
- codomain carrier shapes move to the stratum that owns their meaning, runtime wrappers to `src/carriers`.

Proof obligation:

- action law is independent of transport;
- registered actions are projections of pure morphisms where possible;
- free TypeScript `run` bodies are isolated as admission, codec, transport, or effect boundaries.

### `src/running`

Current role:

- action construction, category registry, dispatch, resources/prompts, induced bins, manifold, invocation witnesses, sessions, HTTP serving, OpenAPI/MCP/forms.

Derived target:

```text
lib/<strata>/action-apex-law
src/registries
src/actions
src/projections
src/stores
services/*
```

Required split:

- pure action composition/apex law to `lib/`;
- mutable category/action/resource/prompt registries to `src/registries`;
- package dispatch over registered action families to `src/actions`;
- OpenAPI/MCP/form/index/tile/manifold descriptions to `src/projections`;
- invocation witness interfaces and in-memory package stores to `src/stores`;
- live HTTP/CLI/MCP process mounts to `services/`.

Proof obligation:

- generated projections do not read `process.env`, open ports, or own filesystem paths;
- service processes are thin mounts over the same projections;
- manifold/apex descriptions are reproducible from registered package data.

### `src/writing`

Current role:

- JSON, EAVT, markdown, HTTP fields, XML/SVG, Lean JSONL, projectors, representation writers.

Derived target:

```text
src/codecs
src/projections
apps/* only for authored views
```

Required split:

- reversible or law-tested wire encodings to `src/codecs`;
- one-way return views and serializable descriptions to `src/projections`;
- authored visual grammars only to `apps/`, if they choose a workflow or figure beyond generated representation.

Proof obligation:

- a codec states its admitted carrier and round-trip obligation;
- a projection states the carrier it views and whether it is lossy;
- no visual/product choice hides inside a generic writer.

### `src/ledger`

Current role:

- witness feed, stream, store, state, content, provenance, reading, memento, time anchors.

Derived target:

```text
lib/<strata>/witness-time
lib/<strata>/reading-law
src/codecs
src/stores
src/projections
services/filesystem-store
apps/inspector
```

Required split:

- witness row/time/fold law to `lib/`;
- reading/coherence law to `lib/`;
- JSONL/EAVT/SSE encodings to `src/codecs`;
- in-memory or abstract store interfaces to `src/stores`;
- feed/state/content projections to `src/projections`;
- filesystem store and live streams to `services/`;
- visible inspection to `apps/`.

Proof obligation:

- no top-level semantic witness-log folder;
- persistence is not confused with witness law;
- feeds and state documents are projections of the same witness substrate.

### `scripts`

Current role:

- executable CLI and HTTP server entrypoints.

Derived target:

```text
services/cli
services/http
```

Required split:

- `relate` becomes `services/cli/main.mts`;
- `relate-serve` becomes `services/http/main.mts`;
- package `bin` entries point at built service entrypoints;
- shared service helpers live under `services/<kind>/` only if they bind process concerns.

Proof obligation:

- service entrypoints contain process binding and no domain law;
- CLI and HTTP use the same registered package apex through `src/`.

### `examples`

Current role:

- runnable demonstrations, conformance smoke, product examples.

Derived target:

```text
examples/ remains as examples, but must import only public surfaces
```

Required split:

- examples are not architecture organs;
- if an example becomes a maintained workflow, graduate it to `apps/`;
- if an example encodes a law, move the law to `lib/` and leave the example as a demonstration.

Proof obligation:

- examples do not become hidden tests for internal paths;
- examples do not own reusable behavior.

### `docs` and `dev`

Current role:

- user docs, developer notes, research notes, decisions, planning.

Derived target:

```text
docs/ user-facing package docs
dev/ derivation notes, plans, decisions, research
```

Required split:

- docs explain public commitments;
- dev records derivation, frontier, and refactor reasoning;
- neither docs nor dev may override the package export map or source law.

## First Concrete Refactor Slice

Start with term language because it is the cleanest way to test the existence-mode split.

Target:

```text
lib/language/...
src/evaluators/...
src/codecs/lean-jsonl...
```

Move in this order:

1. Pure term syntax and constructors.
2. Pure substitution/renaming.
3. Pure step/evaluation/reduction.
4. Pure type checking if independent of package registries.
5. Package evaluator barrel and dispatch wiring.
6. Lean JSONL/vector codecs.
7. Tests split into pure language tests and package evaluator tests.

Do not move:

- action registry integration;
- committed fixture loading;
- public package barrel decisions;
- dispatch tests.

Proof gates:

```text
pnpm --filter @emsenn/relating build
node --test test/<pure-language-test>.test.mjs
node --test test/acting.test.mjs
pnpm --filter @emsenn/relating test
```

The first broad suite may be expensive, but the final proof must include it because the package resolves by name to `dist/`.
