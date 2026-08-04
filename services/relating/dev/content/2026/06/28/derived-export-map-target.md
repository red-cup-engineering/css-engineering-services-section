# Derived package export-map target

This is the target package surface implied by the derived architecture.
It is not a request to expose every folder.
Exports are commitments.

## Current Pressure

Current public exports include:

```text
.
./articulating
./notating
./analysis
./geometry
./settling
./dynamics
./typing
./writing
./writing/projector
./writing/http
./writing/http/*
./writing/lean
./running
./running/http
./ledger
./evaluating
./evaluating/*
./package.json
```

This mixes:

- derivation strata (`articulating`, `settling`, `dynamics`);
- product labels (`notating`, `ledger`);
- package realization (`typing`, `writing`, `evaluating`, `running`);
- transport/media details (`writing/http/*`);
- analysis workbench surfaces (`analysis`, `geometry`).

That surface is usable sediment.
It is not the ideal map.

## Target Export Classes

### Root

```json
".": {
  "types": "./dist/src/index.d.mts",
  "import": "./dist/src/index.mjs"
}
```

The root remains the universal package call surface.
It should expose stable carrier constructors, action apex entrypoints, and the common public API.

### Pure Derivation Commitments

Expose only strata that have a real public law surface:

```json
"./primitive": {
  "types": "./dist/lib/primitive/index.d.mts",
  "import": "./dist/lib/primitive/index.mjs"
},
"./articulation": {
  "types": "./dist/lib/articulation/index.d.mts",
  "import": "./dist/lib/articulation/index.mjs"
},
"./language": {
  "types": "./dist/lib/language/index.d.mts",
  "import": "./dist/lib/language/index.mjs"
},
"./calculus": {
  "types": "./dist/lib/calculus/index.d.mts",
  "import": "./dist/lib/calculus/index.mjs"
},
"./site": {
  "types": "./dist/lib/site/index.d.mts",
  "import": "./dist/lib/site/index.mjs"
},
"./closure": {
  "types": "./dist/lib/closure/index.d.mts",
  "import": "./dist/lib/closure/index.mjs"
},
"./cohomology": {
  "types": "./dist/lib/cohomology/index.d.mts",
  "import": "./dist/lib/cohomology/index.mjs"
},
"./dynamics": {
  "types": "./dist/lib/dynamics/index.d.mts",
  "import": "./dist/lib/dynamics/index.mjs"
},
"./persistence": {
  "types": "./dist/lib/persistence/index.d.mts",
  "import": "./dist/lib/persistence/index.mjs"
},
"./relational": {
  "types": "./dist/lib/relational/index.d.mts",
  "import": "./dist/lib/relational/index.mjs"
},
"./computing": {
  "types": "./dist/lib/computing/index.d.mts",
  "import": "./dist/lib/computing/index.mjs"
}
```

Do not expose a stratum until it has an intentional `index.mts` and tests stating its law.

### Package Realization Commitments

```json
"./admission": {
  "types": "./dist/src/admission/index.d.mts",
  "import": "./dist/src/admission/index.mjs"
},
"./carriers": {
  "types": "./dist/src/carriers/index.d.mts",
  "import": "./dist/src/carriers/index.mjs"
},
"./actions": {
  "types": "./dist/src/actions/index.d.mts",
  "import": "./dist/src/actions/index.mjs"
},
"./evaluators": {
  "types": "./dist/src/evaluators/index.d.mts",
  "import": "./dist/src/evaluators/index.mjs"
},
"./codecs": {
  "types": "./dist/src/codecs/index.d.mts",
  "import": "./dist/src/codecs/index.mjs"
},
"./projections": {
  "types": "./dist/src/projections/index.d.mts",
  "import": "./dist/src/projections/index.mjs"
},
"./stores": {
  "types": "./dist/src/stores/index.d.mts",
  "import": "./dist/src/stores/index.mjs"
}
```

These are package organs, not mathematical strata.

### Narrow Codec/Projection Subpaths

Narrow subpaths are allowed only when the boundary is itself a real commitment.

Examples:

```json
"./codecs/json": {
  "types": "./dist/src/codecs/json.d.mts",
  "import": "./dist/src/codecs/json.mjs"
},
"./codecs/eavt": {
  "types": "./dist/src/codecs/eavt.d.mts",
  "import": "./dist/src/codecs/eavt.mjs"
},
"./codecs/lean-jsonl": {
  "types": "./dist/src/codecs/lean-jsonl.d.mts",
  "import": "./dist/src/codecs/lean-jsonl.mjs"
},
"./projections/openapi": {
  "types": "./dist/src/projections/openapi.d.mts",
  "import": "./dist/src/projections/openapi.mjs"
},
"./projections/mcp": {
  "types": "./dist/src/projections/mcp.d.mts",
  "import": "./dist/src/projections/mcp.mjs"
}
```

Avoid exporting every transport grammar under `./writing/http/*`.
HTTP field grammars are codec commitments only if downstream packages actually build on them as representation boundaries.

### Services

Services are primarily bins:

```json
"bin": {
  "relate": "./dist/services/cli/main.mjs",
  "relate-serve": "./dist/services/http/main.mjs"
}
```

Do not add broad importable service exports by default.
If callers need reusable server construction, that construction belongs in `src/projections` or `src/actions`; the process mount remains in `services`.

### Apps

Apps are not exported until they are intentionally shipped package surfaces.
If an app is shipped, use explicit product names:

```json
"./apps/workbench": {
  "types": "./dist/apps/workbench/index.d.mts",
  "import": "./dist/apps/workbench/index.mjs"
}
```

An app export means "this authored figure is part of the package contract."
It does not mean every app folder is public.

### Transitional Aliases

Current aliases may exist while code moves:

```json
"./articulating": "./dist/lib/articulation/index.mjs",
"./notating": "./dist/lib/language/index.mjs",
"./typing": "./dist/src/carriers/index.mjs",
"./writing": "./dist/src/codecs/index.mjs",
"./evaluating": "./dist/src/evaluators/index.mjs",
"./running": "./dist/src/actions/index.mjs",
"./ledger": "./dist/src/projections/witness-ledger/index.mjs"
```

But each alias must be marked transitional in docs and should have a target replacement.
An alias must not continue to determine source placement.

## Target Build Manifest Changes

The target package scripts become:

```json
"build": "tsc -p tsconfig.lib.json && tsc -p tsconfig.src.json && tsc -p tsconfig.services.json && node copy-dist-assets.mjs && chmod +x dist/services/cli/main.mjs dist/services/http/main.mjs",
"check": "tsc --noEmit",
"test": "node --test \"test/*.test.mjs\""
```

with compiler projects:

```text
tsconfig.lib.json       include lib/**/*.mts
tsconfig.src.json       include src/**/*.mts
tsconfig.services.json  include services/**/*.mts
tsconfig.apps.json      include apps/**/*.mts, only if apps are shipped
```

During migration, an umbrella `tsconfig.build.json` may remain, but it should be understood as scaffolding.

## Export Proof Gates

For every new export:

```text
pnpm --filter @emsenn/relating build
node --input-type=module -e "import('@emsenn/relating/<subpath>').then(m => console.log(Object.keys(m).length))"
```

For every transitional alias:

```text
node --input-type=module -e "Promise.all([import('@emsenn/relating/<old>'), import('@emsenn/relating/<new>')]).then(([a,b]) => console.log(Object.keys(a).length, Object.keys(b).length))"
```

The proof is not that the file exists.
The proof is that PNPM/Node can resolve the committed surface and that tests state the law it exports.
