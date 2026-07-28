# Derived Node realization contract for `@emsenn/relating`

This document records what the derived architecture means under TypeScript, ESM Node, and PNPM.

The math gives the existence modes.
Node gives the build and loading obligations.
Both are binding.

## Current Mechanical Facts

Current package facts:

- `package.json` has `"type": "module"`;
- `tsconfig.json` uses `module: "NodeNext"` and `moduleResolution: "NodeNext"`;
- source imports therefore spell emitted paths with `.mjs` specifiers;
- `tsconfig.build.json` emits `lib/**/*.mts` and `src/**/*.mts` with `rootDir: "."` into `dist/`;
- `tsconfig.scripts.json` separately emits `scripts/**/*.mts` into `dist/scripts`;
- `copy-dist-assets.mjs` mirrors non-TS assets only from `lib/` and `src/`;
- `bin` currently points at `dist/scripts/cli.mjs` and `dist/scripts/serve.mjs`;
- package exports mix pure surfaces from `dist/lib/...` with package/runtime surfaces from `dist/src/...`.

These are not architecture.
They are host facts the architecture must satisfy.

## Build Projects

The derived roots require separate compiler project intent:

```text
tsconfig.lib.json       lib/**/*.mts
tsconfig.src.json       src/**/*.mts
tsconfig.services.json  services/**/*.mts
tsconfig.apps.json      apps/**/*.mts, only when an app is shipped as package code
```

The current `tsconfig.build.json` can remain as a temporary umbrella while migration is in motion, but the target build must make the root modes visible.

Required target:

```text
dist/lib/...       pure derivation modules
dist/src/...       package realization modules
dist/services/...  Node process entrypoints and mounts
dist/apps/...      shipped authored figures, if any
```

Why this is forced:

- ESM package exports can commit to `dist/lib` and `dist/src` separately only if emitted paths remain stable;
- service bins cannot remain under `scripts/` once `services/` is the process root;
- process-only code should not be included in the same proof surface as pure/package code by accident;
- PNPM workspace consumers resolve only declared package exports and bins, not source-tree intention.

## Import Law Under NodeNext

Source imports must keep explicit `.mjs` specifiers because TypeScript is compiling to native ESM.

Allowed dependency direction:

```text
services -> src -> lib
apps     -> src -> lib
```

`apps` may call a running service over a protocol at runtime, but shipped app source should not import Node process modules unless the app itself is a Node app.
Browser-capable apps import `src/projections`, `src/codecs`, and pure `lib` surfaces, not `services/http`.

Within `lib`:

```text
primitive
  -> articulation
  -> language
  -> calculus
  -> site
  -> closure
  -> cohomology
  -> dynamics
  -> persistence
  -> relational
  -> computing
```

Forbidden imports:

- `lib/**` importing `src/**`, `services/**`, `apps/**`, `node:*`, or package self names;
- `src/codecs/**` importing `services/**`;
- `src/projections/**` importing `services/**`;
- `services/**` importing unpublished internal files when a public package surface exists for the same commitment;
- `apps/**` importing filesystem/process/server modules unless the app is explicitly a Node app.

Mechanical verifier:

```text
rg -n 'from ["''](\\.\\.?/.*services|node:|@emsenn/relating/(running|ledger|writing/http))' lib src apps services -g '*.mts'
```

The exact verifier can be refined, but the criterion is architectural: lower strata must not import higher realization.

## Export Law

Package exports are commitments, not a directory listing.

Target export classes:

```text
./primitive
./articulation
./language
./calculus
./site
./closure
./cohomology
./dynamics
./persistence
./relational
./computing
```

for pure commitments, only where the package intentionally supports that pure surface.

Package realization commitments:

```text
./carriers
./actions
./evaluators
./codecs
./projections
./stores
```

Service commitments are normally bins, not importable libraries:

```text
bin.relate       -> dist/services/cli/main.mjs
bin.relate-serve -> dist/services/http/main.mjs
```

If a service helper is imported, it should be because the helper is itself a package realization in `src/`, not because callers reached into `services/`.

Transitional exports such as `./articulating`, `./notating`, `./writing`, `./running`, `./ledger`, and `./evaluating` are current compatibility surfaces.
They are not target architecture.
The target must eventually publish stratum commitments and product spans, not sediment names.

## Asset Law

`copy-dist-assets.mjs` currently copies assets from `lib/` and `src/`.

Target:

```text
lib assets       -> copied only if pure derivation fixtures are shipped
src assets       -> copied for codecs/projections/package data
services assets  -> copied only for process templates/static service fixtures
apps assets      -> copied or built through an app bundler, not silently mirrored
```

This prevents authored app assets and process fixtures from being treated as mathematical source material.

## Bin Law

`scripts/` is not a target root.

Former:

```text
scripts/cli.mts   -> dist/scripts/cli.mjs
scripts/serve.mts -> dist/scripts/serve.mjs
```

Current target:

```text
services/cli/main.mts  -> dist/services/cli/main.mjs
services/http/main.mts -> dist/services/http/main.mjs
```

The executable files own:

- argv/stdin/stdout/stderr;
- exit codes;
- environment variables;
- port binding;
- process lifecycle.

They import package realization from `src/` and pure law through `src` or direct `lib` public surfaces.
They do not define actions, carriers, codecs, or projections.

## PNPM Workspace Law

The package must build and typecheck from its own directory.
The existing `tsconfig.json` says this explicitly by not extending a parent workspace file.

Therefore the architecture cannot rely on implicit root path aliases or workspace-only resolution.
Any cross-package relation must be one of:

- a declared dependency;
- a PNPM workspace protocol dependency;
- a package export;
- an admitted host mark read through JSNode admission.

Import graphs are host marks only after admission.
They are not an excuse for pure math modules to inspect the workspace.

## Completion Gates For A Real Refactor

A refactor slice has not proven itself until:

```text
pnpm --filter @emsenn/relating check
pnpm --filter @emsenn/relating build
node --test test/<slice-specific>.test.mjs
pnpm --filter @emsenn/relating test
```

For slices touching bins or service roots, add:

```text
node dist/services/cli/main.mjs --help
node dist/services/http/main.mjs --help
```

or the equivalent existing smoke path for those entrypoints.

For slices touching export map commitments, add a package self-import smoke:

```text
node --input-type=module -e "import('@emsenn/relating/<subpath>').then(m => console.log(Object.keys(m).length))"
```

from an environment where the package resolves by name.
