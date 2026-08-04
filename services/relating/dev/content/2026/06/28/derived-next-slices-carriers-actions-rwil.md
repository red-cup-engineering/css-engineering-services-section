# Next derived refactor slices: carriers, actions, RWIL

This document extends `derived-first-slice-language.md`.
It maps the next large product spans by current file and target existence mode.

The rule is the same throughout:

> move by what the code is, not by what it is named.

## Slice 2: Carrier Shape vs Carrier Realization

Current files:

```text
src/carriers/index.mts
src/typing/carrier.mts
src/typing/registry.mts
src/typing/schema.mts
src/typing/print.mts
lib/articulating/utterance.mts
lib/articulating/predicating/positing/fiber.mts
lib/notating/index.mts
```

Current pressure:

- `src/carriers/index.mts` already says pure schema literals belong in `lib/` and runtime `Carrier` objects belong in `src`;
- it imports pure schemas from `lib/articulating` and `lib/notating`;
- it realizes those schemas with `carrierFrom`;
- it is a package realization seam, not a mathematical stratum.

Derived targets:

```text
lib/primitive or lib/articulation
  utterance schema literal
  articulation cell schema literal

lib/language
  TySchema
  TmSchema

lib/calculus or lib/closure
  pure charge/value/settlement carrier shapes, by consumed/derived stratum

src/carriers
  carrierFrom wrappers
  runtime validators
  registry-backed carrier objects
  package-level carrier barrels

src/projections
  TypeScript declaration generation
  JSON Schema publication

src/registries
  mutable runtime carrier registry
```

Proof obligations:

- every runtime carrier in `src/carriers` is derived from a pure shape;
- no pure shape imports `src/typing`, `src/carriers`, or a registry;
- carrier registry can be cleared/rebuilt without changing carrier truth;
- declaration printing imports carrier shapes or runtime carriers, but pure carrier shapes do not import declaration printing.

Minimal first move:

```text
src/carriers.mts -> src/carriers/index.mts
```

This move is now complete in source form.
It is followed immediately by extracting `TySchema`/`TmSchema` with the language slice.
Do not split `carrierFrom` until its registry dependencies are read and mapped.

## Slice 3: Action Law vs Action Registry vs Process Projection

Current files:

```text
src/actions/index.mts
src/running/action.mts
src/running/category.mts
src/running/dispatch.mts
src/running/induce.mts
src/running/serving.mts
src/running/manifold.mts
src/running/mounting.mts
services/cli/main.mts
services/http/main.mts
```

Current pressure:

- `src/actions/index.mts` contains action declarations, admission, codomain carrier declarations, settlement read actions, inspection, and TypeScript declaration realization;
- `src/running/index.mts` presents actions, dispatch, induced bins, OpenAPI/MCP/form projections, carrier-node routing, sessions, witness invocation, and transports as one operational facade;
- `services/` contains executable process entrypoints;
- the acting/holography ADR says process loops remain the boundary users run, while pure projection constructors can move toward projection modules.

Derived targets:

```text
lib/calculus
  action/morphism composition law
  cut law
  apex law when independent of registry

lib/site
  carrier-node namespace site law
  prefix-order and local section/gluing law

lib/computing
  pure action-apex computation law
  carrier-node composition theorem shadows

src/actions
  package action declarations
  registered action family
  boundary admissions such as utterAction
  package-level action barrels

src/registries
  action/resource/prompt/category registries
  actionsByVerb
  mutable package-local lookup tables

src/projections
  OpenAPI descriptions
  MCP tool/resource/prompt descriptions
  generic action forms
  action index HTML
  operation manifolds
  carrier-node manifold descriptions

src/codecs
  wire codecs in src/codecs/wire.mts
  HTTP field/media codecs currently in src/writing/http

src/stores
  invocation store interfaces and in-memory stores

services/cli
  argv/stdin/stdout/stderr/exit binding

services/http
  port/request/response/server lifecycle binding

services/mcp
  only if a live MCP process exists
```

Important separations:

- `Action` as carrier-to-carrier morphism law is not `action()` as a registry constructor;
- `verb` is a transport-facing/action-family name, not ontology;
- OpenAPI/MCP/form HTML are generated projections, not apps;
- CLI and HTTP are process mounts, not action law;
- invocation witnessing uses RWIL but does not define RWIL.

Minimal first move:

```text
src/actions.mts -> src/actions/index.mts
src/running/codecs.mts -> src/codecs/wire.mts
scripts/cli.mts -> services/cli/main.mts
scripts/serve.mts -> services/http/main.mts
```

The `src/actions` and `services` moves are now complete in source form.
The `src/running/codecs.mts -> src/codecs/wire.mts` move is now complete in source form.

Only after the build contract is updated:

```text
tsconfig.services.json
package.json bin targets
copy-dist-assets.mjs source roots
```

Proof obligations:

- generated projections can be produced without opening a port;
- service entrypoints contain process binding only;
- dispatch imports registry/projection code, not the reverse;
- actions with pure `runTerm` can be audited without CLI/HTTP/MCP;
- admissions and host inspections are explicitly marked as boundaries.

## Slice 4: RWIL Source, Folds, Readings, Stores, Services

Current files:

```text
src/ledger/cells.mts
src/ledger/state.mts
src/ledger/store.mts
src/ledger/content.mts
src/ledger/feed.mts
src/ledger/stream.mts
src/ledger/reading.mts
src/ledger/provenance.mts
src/ledger/time-anchor.mts
src/ledger/memento.mts
src/writing/eavt.mts
src/writing/datom.mts
src/writing/triple.mts
```

Current pressure:

- `src/ledger/index.mts` correctly states RWIL as a first-class product surface;
- the RWIL research note says log/state/record/content is source/statistic/code/lossy cut;
- `store.mts` is the filesystem binding;
- `stream.mts` is an SSE transport projection;
- `reading.mts` contains coherence/readings through witnesses;
- EAVT/Datom/triple are wire/data-form codecs in `src/writing`.

Derived targets:

```text
lib/persistence
  witness identity
  witness-time law
  source entropy / surprisal / retention law
  row identity independent of JSONL/filesystem

lib/closure
  log-to-state fold law
  state as sufficient statistic
  record/content as deterministic folds when stated without filesystem

lib/cohomology
  obstruction/information-retention laws where failure-to-glue or H1 rank is the point

lib/relational
  same-witness / same-log coherence law
  source/channel separation
  cross-channel commutation law

src/codecs
  EAVT
  Datom
  triple
  JSONL
  SSE frame encoding if treated as wire
  Memento/OpenTimestamps wire encodings when present

src/stores
  WitnessStore interface
  in-memory stores
  package-level store abstractions

src/projections
  feed/state/record/content documents as return projections
  content tree projection
  coherence reports as serializable descriptions

services/filesystem-store
  paths
  directory creation
  atomic file writes
  JSONL append/read
  filesystem confinement

services/http or services/sse
  live SSE response binding

apps/inspector
  visible log/state/record/content/coherence inspection
```

Minimal first move:

```text
src/writing/eavt.mts  -> src/codecs/eavt.mts
src/writing/datom.mts -> src/codecs/datom.mts
src/writing/triple.mts -> src/codecs/triple.mts
```

Then split:

```text
src/ledger/store.mts
  pure interfaces          -> src/stores/witness-store.mts
  filesystem implementation -> services/filesystem-store/index.mts

src/ledger/state.mts
  pure fold law -> lib/closure/witness-state.mts
  package projection wrapper -> src/projections/witness-state.mts

src/ledger/reading.mts
  pure same-witness/coherence law -> lib/relational/witness-reading.mts
  runtime carrier registration    -> src/carriers or src/projections
  reading registry                -> src/registries
```

Proof obligations:

- EAVT row identity is defined without file paths;
- log-to-state can be tested as a pure fold;
- filesystem store can be replaced by in-memory store without changing witness law;
- SSE/feed response is a projection or service binding, not RWIL ontology;
- `src/ledger` either disappears as a product alias or becomes an alias barrel over the split surfaces.

## Shared Tests To Preserve During These Slices

Current tests likely covering these spans:

```text
test/typing.test.mjs
test/acting.test.mjs
test/serve-transports.test.mjs
test/transport-work.test.mjs
test/ledger-stream.test.mjs
test/ledger-standards.test.mjs
test/holography.test.mjs
test/codecs.test.mjs
```

Target test classes:

```text
test/carriers.test.mjs
test/actions.test.mjs
test/projections-action-apex.test.mjs
test/services-cli.test.mjs
test/services-http.test.mjs
test/persistence-witness.test.mjs
test/closure-witness-state.test.mjs
test/relational-witness-reading.test.mjs
test/codecs-eavt.test.mjs
test/stores-filesystem.test.mjs
```

These test names are not mandatory.
The law they prove is mandatory.
