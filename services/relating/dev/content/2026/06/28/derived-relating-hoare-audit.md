# Relating Hoare audit ledger

This ledger applies `relational-hoare-package-procedure.md` to
`@emsenn/relating`.

It is not a second architecture.
It is the working table that forces each module family to justify its placement
by the relational Hoare triples its functions realize.

## Audit grain

Audit one function family when its members share the same precondition substrate,
world frame, and evidence type.

Do not audit by historical file.
Do not audit by product nickname.

The smallest useful record is:

```text
family:
current files:
representative symbols:

triple:
  precondition:
  operation:
  postcondition:
  world frame:
  witness:

classification:
  precondition substrate:
  postcondition product:
  failure mode:
  motion:
  boundary:
  evidence:

forced placement:
split required:
next move:
verification:
```

## Global import invariant

The audit implies this import order:

```text
apps      -> src, lib, remote service boundaries
services  -> src, lib
src       -> lib
lib       -> lib only, plus pure external dependencies if any
```

The current mechanical checker for this invariant is:

```text
node dev/scripts/check-derived-boundaries.mjs
```

## Row 1: pure carrier shape

```text
family:
  pure carrier schemas

current files:
  lib/articulating/utterance.mts
  lib/articulating/predicating/positing/fiber.mts
  lib/notating/index.mts
  lib/primitive/schema.mts

representative symbols:
  utteranceSchema
  articulationCellSchema
  memeSchema
  TySchema
  TmSchema
  FromSchema

triple:
  precondition:
    admitted primitive shape vocabulary and the mathematical constraints of the
    stratum
  operation:
    state a carrier shape as pure data
  postcondition:
    schema literal and type-level inhabitant relation
  world frame:
    W' = W; no registry, file, process, validator, or package export changes
  witness:
    the shape itself, plus type-level interpretation

classification:
  precondition substrate:
    material
  postcondition product:
    admissible material shape
  failure mode:
    no host failure; ill-formedness is a material/schema error
  motion:
    none
  boundary:
    bulk shape, not an observation boundary
  evidence:
    shape/type certificate

forced placement:
  lib/<derivation-stratum>

split required:
  yes, if any `carrierFrom`, registry, validation, or package self-import appears

next move:
  continue extracting current schema literals into the derived lib strata:
  primitive, articulation, language, calculus, closure

verification:
  `lib` imports no `src/*`, no package self-surfaces, and no Node builtins
```

## Row 2: runtime carrier realization

```text
family:
  package carrier realization

current files:
  src/carriers/index.mts
  src/typing/carrier.mts
  src/typing/registry.mts
  src/typing/schema.mts

representative symbols:
  utteranceCarrier
  articulationCellCarrier
  memeCarrier
  tyCarrier
  tmCarrier
  carrierFrom
  schemaRegistry

triple:
  precondition:
    pure schema literal is available as an ESM package symbol; package validator
    machinery and registry semantics are available
  operation:
    realize the schema as a runtime Carrier object
  postcondition:
    importable carrier with validate/assert behavior and registry identity
  world frame:
    W' = W; package symbol graph and registry state may be extended or consulted
  witness:
    carrier object and validation receipt

classification:
  precondition substrate:
    package phase
  postcondition product:
    runtime carrier / normal form
  failure mode:
    validation or schema-realization failure
  motion:
    registry realization, not host process motion
  boundary:
    package import boundary
  evidence:
    validation receipt and stable carrier id

forced placement:
  src/carriers and src/registries

split required:
  yes: pure schema stays in lib; registry-backed carrier object stays in src

next move:
  finish the carrier split by moving registry effects toward src/registries and
  keeping src/carriers as the package carrier barrel

verification:
  package export `./carriers` points at `dist/src/carriers/index.mjs`;
  internal imports use `./carriers/index.mjs`
```

## Row 3: action declarations

```text
family:
  package action declarations

current files:
  src/actions/index.mts
  src/running/action.mts
  src/running/dispatch.mts
  src/running/induce.mts

representative symbols:
  actions
  action
  dispatch
  induceBins
  morphismCarrier

triple:
  precondition:
    domain carrier, codomain carrier, package evaluator or TypeScript boundary
    implementation, and action registry vocabulary
  operation:
    declare or dispatch a carrier-to-carrier morphism in the package phase
  postcondition:
    action result, dispatch result, or action-apex discovery surface
  world frame:
    W' = W for pure dispatch over provided inputs; host world changes only after
    a service binds the dispatch to stdin, HTTP, MCP, files, or clocks
  witness:
    action declaration, invocation receipt, dispatch result

classification:
  precondition substrate:
    package phase
  postcondition product:
    package morphism realization or dispatch receipt
  failure mode:
    carrier admission failure, unknown action, evaluator failure
  motion:
    registered morphism dispatch
  boundary:
    package boundary; not a process boundary by itself
  evidence:
    invocation witness

forced placement:
  src/actions, src/registries, src/evaluators

split required:
  yes: pure action/morphism laws move to lib/calculus, lib/site, or
  lib/computing; process bindings move to services

next move:
  split src/actions/index.mts into smaller package-phase action families after
  the root move is stable

verification:
  package export `./actions` points at `dist/src/actions/index.mjs`;
  no action declaration reads argv, env, filesystem, socket, or clock directly
```

## Row 4: codecs and projections

```text
family:
  wire codecs and boundary projections

current files:
  src/codecs/wire.mts
  src/writing/**
  src/evaluating/projecting/**

representative symbols:
  JSON codecs
  EAVT/Datom/triple codecs
  HTTP field codecs
  RMN text codecs
  SVG/HTML/XML projections
  Lean golden vector codecs

triple:
  precondition:
    admitted material or unknown wire value plus a declared representation law
  operation:
    decode, encode, or project across a boundary format
  postcondition:
    admitted value, wire value, normal form, or boundary representation
  world frame:
    W' = W unless the function also reads/writes host resources
  witness:
    decoded value, encoded value, projection receipt, parse error

classification:
  precondition substrate:
    package phase, unless the law is purely mathematical
  postcondition product:
    normal form or boundary representation
  failure mode:
    representation/admission failure
  motion:
    no intrinsic host motion
  boundary:
    wire or projection boundary
  evidence:
    codec receipt or projection artifact

forced placement:
  src/codecs and src/projections

split required:
  yes if a codec currently contains host reads/writes or app session state

next move:
  continue quotienting src/writing into src/codecs for wire/data formats and
  src/projections for boundary views, while leaving historical export aliases
  until the target export map is intentionally switched

verification:
  package export `./codecs` points at `dist/src/codecs/index.mjs`;
  package export `./codecs/wire` points at `dist/src/codecs/wire.mjs`;
  codecs do not import services or apps; live protocol servers import codecs
```

## Row 5: live process exposure

```text
family:
  process and protocol entrypoints

current files:
  services/cli/main.mts
  services/http/main.mts
  src/running/http.mts
  src/running/serving.mts

representative symbols:
  relate CLI entrypoint
  relate-serve entrypoint
  routeRequest
  serveManifold

triple:
  precondition:
    argv, stdin/stdout, HTTP request, socket/server lifecycle, env, filesystem,
    or host clock
  operation:
    admit host exposure into package carriers/actions/projections
  postcondition:
    process output, served response, running server, or exposure witness
  world frame:
    W' may change; H' extends by a live exposure witness
  witness:
    response, exit code, request record, server handle, ledger row

classification:
  precondition substrate:
    live exposure
  postcondition product:
    host-observable effect
  failure mode:
    host/process/protocol failure
  motion:
    process lifecycle and protocol routing
  boundary:
    live boundary
  evidence:
    exposure ledger or response receipt

forced placement:
  services/<protocol-or-host-aperture>

split required:
  yes: host admission stays in services; pure codecs, carriers, actions, and
  projections stay in src/lib

next move:
  keep bins pointed at dist/services and move remaining process-loop code out of
  src/running when it requires host lifecycle ownership

verification:
  package bins point to dist/services; services import src/lib but not apps
```

## Row 6: exposure ledger

```text
family:
  relation-witness / exposure ledger

current files:
  src/ledger/**
  src/writing/eavt.mts
  src/writing/datom.mts
  src/writing/triple.mts

representative symbols:
  Reading
  LogReading
  cohere
  witness log row codecs
  EAVT/Datom/triple projections

triple:
  precondition:
    observed exposure rows, prior history, and coherence law
  operation:
    read, fold, cohere, encode, or project witnessed exposures
  postcondition:
    history reading, coherence judgment, row projection, or obstruction
  world frame:
    W' = W for pure folds/codecs; H' is read or extended by service stores
  witness:
    ledger reading, row, coherence certificate, obstruction

classification:
  precondition substrate:
    material for coherence law; package phase for row codecs/store interfaces;
    live exposure for actual persistence
  postcondition product:
    history law, codec normal form, or persisted witness
  failure mode:
    incoherence, representation failure, or host store failure
  motion:
    history fold and exposure persistence
  boundary:
    ledger boundary between observed exposure and re-readable history
  evidence:
    witness row or coherence certificate

forced placement:
  lib/persistence and lib/relational for law;
  src/codecs and src/stores for package realization;
  services/filesystem-store for host persistence

split required:
  yes: ledger law, wire rows, store interface, and live store are different
  triples

next move:
  split current src/ledger into pure law candidates, package store interfaces,
  and live store implementations only after callers are mapped

verification:
  no live store writes in src/ledger law/codecs; services own host persistence
```

## Immediate status

The first Hoare-forced carrier move is complete in source form:

```text
src/carriers.mts -> src/carriers/index.mts
```

The first Hoare-forced action move is complete in source form:

```text
src/actions.mts -> src/actions/index.mts
```

The first Hoare-forced codec move is complete in source form, without a
`running` compatibility export:

```text
src/running/codecs.mts -> src/codecs/wire.mts
```

Current proof run for the carrier/action/codec root moves:

```text
node dev/scripts/check-derived-boundaries.mjs
derived boundary check passed

pnpm check
$ tsc --noEmit

pnpm build
$ tsc -p tsconfig.build.json && tsc -p tsconfig.services.json && node copy-dist-assets.mjs && chmod +x dist/services/cli/main.mjs dist/services/http/main.mjs
copy-dist-assets: 0 asset(s) -> dist/

node --input-type=module -e "import('@emsenn/relating/carriers').then((m) => console.log(m.utteranceCarrier.id))"
relating/articulating/utterance

node --input-type=module -e "import('@emsenn/relating/actions').then((m) => console.log(m.actions.length))"
25

node --input-type=module -e "import('@emsenn/relating/codecs').then((m) => console.log(m.wireCodec('json').mediaType.split(';')[0]))"
application/json

node --input-type=module -e "import('@emsenn/relating/codecs/wire').then((m) => console.log(m.WIRE_CODEC_NAMES.includes('rmn')))"
true

node --input-type=module -e "import('@emsenn/relating/running').then((m) => console.log(Object.hasOwn(m,'wireCodec') ? 'bad' : 'no-wireCodec'))"
no-wireCodec

node --check dist/services/cli/main.mjs
node --check dist/services/http/main.mjs

node --test test/acting.test.mjs
tests 40
suites 12
pass 40
fail 0

node examples/action-apex.mjs
actionCount 25
wireVocabulary includes rmn/application-rmn+json/scott

pnpm test
tests 613
suites 213
pass 613
fail 0
```

The audit remains active until every family has:

- a triple;
- a forced root;
- a split decision;
- a current-state path;
- a verification handle.
