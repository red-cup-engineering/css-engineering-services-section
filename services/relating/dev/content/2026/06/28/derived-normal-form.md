# Derived normal form for `@emsenn/relating`

This is not a compatibility plan for the current tree.
It is the target shape forced by three constraints:

1. RelMath admits free data only at the top of the derivation.
2. JSNode admits host marks honestly before reading them as carriers.
3. TypeScript/ESM/Node/PNPM require a package/runtime/process distinction.

The strict directory grammar for this form is in `dev/docs/derived-directory-grammar.md`.
The TypeScript/ESM/PNPM realization contract is in `dev/docs/derived-node-realization-contract.md`.
The evidence ledger tying claims to local sources is in `dev/docs/derived-evidence-ledger.md`.
The target package export map is in `dev/docs/derived-export-map-target.md`.

The folder split is therefore not topic-based.
It is an existence-mode split.

## Specimen Modes

Relational computing is a controlled exposure of relational material, a specimen,
under constraints, through a phase regime, into an observable boundary.

A relational specimen has:

```text
support      where relation can land
ports        how it can connect
fibers       what can vary over each site
charge/value what is present, absent, asserted, denied, contradicted
constraints  what local arrangements are admissible
motion       how configurations can change
closure      how unresolved material settles
boundary     how it can be observed
history      how its exposures are witnessed
```

The four roots are the four exposure modes of that specimen:

```text
lib/       material law of the specimen
src/       phase realization of that material as a Node package
services/  dynamic exposure of that phase in a running host
apps/      optical apparatus for observing or intervening in the exposure
```

The important distinction is that mathematical motion belongs to `lib/` when it
is intrinsic material law, while live exposure-in-time belongs to `services/`.
That is why `lib/dynamics` and `services/` are not the same kind of thing.

## Phase Regime Correction

Current software computation mostly lives in the crystalline regime.

It expects:

```text
stable symbols
fixed syntax
deterministic transforms
normal forms
clear inputs/outputs
total observability
```

Even probabilistic software usually embeds probability inside crystalline code.

Relating cannot use that regime as its foundation.
It has to treat ordinary computation as one phase of relational material:

```text
classical computation =
  fully observed
  strict finite
  low-contradiction
  crystalline
  normal-form-oriented
  function-like relational materialization
```

The more general material admits:

```text
settling without final collapse
contradiction without explosion
boundary observation without bulk access
local law without periodic global order
mobility without fixed identity
history-dependent basin descent
coherence failure measured as real structure
```

Therefore `src/` is not "the computation layer."
`src/` is the Node/ESM/package phase realization, which is necessarily more
crystalline than the full relational material.

The general phase theory belongs in `lib/`: closure, cohomology, dynamics,
persistence, relational reading, and computing as derived material law.
The package phase belongs in `src/`: schemas as runtime carriers, actions as
registered morphisms, codecs, projections, exports, and package-local stores.

## Camera Anatomy

Relating is a camera for relational material.

```text
Aperture:
  admits marks / exposures

Lens assembly:
  articulates sites, ports, fibers, constraints

Sensor:
  posits charges and records valuations

Development bath:
  closure / settling / motion over time

Phase plate:
  classifies the material regime

Projection optics:
  renders a boundary view

Exposure ledger:
  records what was observed through which lens
```

An exposure is the material admitted into an aperture.
The exposure is not yet the photograph, the projection, or the product view.
It is the admitted relational material that the rest of the apparatus constrains,
charges, develops, classifies, projects, and witnesses.

Placement:

```text
aperture law and admitted material shape        -> lib/primitive, lib/articulation
host aperture readers                           -> src/admission or services
lens assembly law                               -> lib/site, lib/calculus, lib/relational
runtime lens/carrier/action realization         -> src/carriers, src/actions, src/registries
sensor law                                      -> lib/calculus, lib/closure
development bath law                            -> lib/closure, lib/dynamics, lib/persistence
phase plate law                                 -> lib/cohomology, lib/dynamics, lib/persistence
boundary projection realization                 -> src/projections, src/codecs
live projection endpoint                        -> services
authored projection optics                      -> apps
exposure ledger law                             -> lib/persistence, lib/relational
exposure ledger store/codecs                    -> src/stores, src/codecs
filesystem/live ledger                          -> services/filesystem-store
ledger inspector                                -> apps/inspector
```

## The Forced Computational Spine

RelMath's spine says:

```text
Primitive admission
  -> Articulation
  -> Language
  -> Calculus
  -> Site
  -> Closure
  -> Cohomology
  -> Dynamics
  -> Persistence
  -> Relational
  -> Computing
```

JSNode says the same thing in host form:

```text
host marks
  -> admission
  -> carriers
  -> pure arrows
  -> settled carriers
  -> transport
  -> wire
```

So the package must distinguish:

```text
free host mark
admitted carrier
pure derivation
runtime realization
transport projection
process mount
authored figure
```

Those are not equivalent and must not share a module just because they concern the same semantic object.

## Root Roles

### `lib/`

`lib/` is the pure derivation body.

It contains definitions whose truth does not depend on Node, a running process, a package manifest, the filesystem, HTTP, CLI, MCP, OpenAPI, or a user interface.

It is allowed to be TypeScript because this is the Node realization of the math, but it is not allowed to be Node-hosted.

`lib/` owns:

- primitive carrier literals and constructors;
- pure articulating/predicating/positing/settling arrows;
- the term language as syntax and reduction law;
- charge, order, closure, cohomology, dynamics, persistence, and relational invariants;
- pure reading laws such as "two wires commute through the same witness";
- pure action law, where an action is a carrier-to-carrier morphism;
- finite executable shadows of RelMath theorems, with honest frontier boundaries.

`lib/` must not own:

- registries with process-local mutable state;
- validation as a Node runtime service;
- filesystem persistence;
- CLI/HTTP/MCP/OpenAPI projection;
- env vars, ports, `process.argv`, `stdin`, `stdout`;
- authored workbench/product behavior.

The internal organization of `lib/` should follow derivation role, not product topic.
For example, a witness-log system is not a top-level folder just because it has a name.
Its pieces distribute by role:

```text
primitive row shape      -> lib/primitive or lib/relational
append/fold law          -> lib/closure or lib/computing
reading/coherence law    -> lib/relational
serialization shape      -> src/codecs
filesystem store         -> services
visible log inspector    -> apps
```

### `src/`

`src/` is the TypeScript package realization.

It makes the pure derivation body usable as `@emsenn/relating` in an ESM Node workspace.

`src/` owns:

- package-root public barrels and subpath barrels;
- carrier realization from schema literal to runtime validator;
- process-local registries for carriers, morphisms, actions, resources, and prompts;
- dispatch over registered actions;
- RMN evaluator wiring when evaluation depends on package runtime or registered package state;
- JSON/EAVT/RMN/HTTP/Lean JSONL codecs;
- generated projections of the action apex: CLI descriptors, OpenAPI, MCP, HTML forms, TypeDoc-facing descriptions;
- in-memory stores or pure store interfaces needed for tests and package-level dispatch.

`src/` must not own:

- mathematical law that can be expressed without the package runtime;
- the pure reduction law of the term language;
- long-lived Node processes;
- filesystem ownership of a site or box;
- app-specific product flows.

`src/` is the membrane between mathematical body and package surface.
It is not "where all source code goes."

### `services/`

`services/` is process realization.

It contains the thin Node programs that mount the package realization as a running surface.

`services/` owns:

- CLI entrypoints that bind `argv`, `stdin`, `stdout`, `stderr`, and exit codes;
- HTTP servers that bind ports and requests;
- MCP servers if they are actual long-lived server processes;
- filesystem-backed stores for local witness data;
- environment variable reading and process lifecycle;
- service composition that mounts one or more action apexes.

`services/` must not own:

- generic action/apex law;
- generated projection logic;
- pure codecs;
- carrier definitions;
- product-specific interpretation beyond serving.

A service is distinguished by scope of mounted apex and process binding.
If it is just a generated projection of an action apex, it belongs in `src/`.
If it binds that projection to a live process, it belongs in `services/`.

### `apps/`

`apps/` is authored figuration.

It contains surfaces that a user or agent intentionally points at and that do not fall out freely from the package apex.

`apps/` owns:

- a relation workbench;
- a settlement inspector;
- a package/history carrier atlas;
- an InfoTile-style visual field;
- any opinionated workflow that chooses what to show, hide, sequence, compare, or dramatize.

`apps/` must not own:

- data;
- service process machinery;
- generic generated forms;
- OpenAPI or MCP descriptions;
- carrier/action law.

Generated HTML from an action registry is not an app.
A hand-authored visual grammar for inspecting a settled carrier is an app.

## Placement Calculus

For any candidate module, ask these questions in order.

### 1. Does it admit free host data?

If yes, it is an admission boundary.

- If it only describes the pure admitted shape, put that shape in `lib/`.
- If it touches Node/git/fs/package manifests/process reality, put the reader in `src/admission` or `services` depending on whether it is a library reader or live process.

### 2. Does it define a carrier, arrow, law, invariant, or theorem shadow?

If yes, put it in `lib/`.

The module may be named by the derivation role it occupies, not by a product label.

### 3. Does it realize a pure shape as a Node package object?

If yes, put it in `src/`.

Examples:

- schema literal -> runtime validator;
- action law -> registered dispatchable action;
- carrier -> JSON codec;
- action family -> OpenAPI/MCP/form projection;
- package category -> export map and public barrel.

### 4. Does it bind to an operating process?

If yes, put it in `services/`.

Examples:

- CLI executable;
- HTTP server;
- MCP server;
- filesystem-backed witness store;
- env/config/process lifecycle.

### 5. Does it author a particular experience over the substrate?

If yes, put it in `apps/`.

Examples:

- workbench;
- cockpit;
- inspector;
- atlas;
- visual field.

## Consequences For This Package

The package should be rewritten toward this normal form:

```text
relating/
  lib/
    primitive/
    articulation/
    language/
    calculus/
    site/
    closure/
    cohomology/
    dynamics/
    persistence/
    relational/
    computing/

  src/
    index.mts
    exports/
    admission/
    carriers/
    registries/
    actions/
    evaluators/
    codecs/
    projections/
    stores/

  services/
    cli/
    http/
    mcp/
    filesystem-store/

  apps/
    workbench/
    inspector/
    atlas/
    cockpit/
```

The names under `lib/` are derivation strata, not semantic products and not a command to mirror every Lean path.
The rule is: a `lib/` module may introduce only the next derived thing allowed by the spine.
The directory is chosen by the module's input and output strata, not by a product name.

The names under `src/` are Node package organs.
They are allowed to know that this is TypeScript, ESM, JSON Schema, package exports, and PNPM.

The names under `services/` are process mounts.
They are allowed to know about the host.

The names under `apps/` are figures.
They are allowed to make choices for a user.

## Organ Spans

Named systems are spans through the existence modes.
This is the crucial rule that prevents semantic folders.

### Primitive Admission

Primitive admission is the passage from free mark to carried object.

```text
pure admitted shape       -> lib/
host/file/git/package read -> src/admission or services/
schema/runtime validation -> src/carriers
visible admission workflow -> apps/
```

RelMath allows free data only at the primitive/articulation edge.
JSNode makes the host impurity honest: package files, git refs, paths, exports, and lockfiles are marks until admitted.

### Carrier

A carrier is an object address plus its admissible shape.

```text
schema literal / object law       -> lib/
runtime validator / registry      -> src/carriers
JSON Schema export / declarations -> src/projections or src/exports
form/editor for authoring         -> apps/
```

The schema literal is not the same organ as the runtime validator.
The validator realizes the carrier for Node; it does not define the carrier's mathematical role.

### Term Language

The term language is syntax plus reduction/equivalence law.

```text
syntax, substitution, reduction law, type law -> lib/
package-level evaluator entrypoint            -> src/
Lean/vector codec                             -> src/codecs
interactive term explorer                     -> apps/
```

If an evaluator is pure and only reduces terms, it belongs to `lib/`.
If it depends on package registries, dispatch contracts, committed fixtures, or Node codec surfaces, the wiring belongs to `src/`.

### Action

An action is not a route and not a CLI command.
It is first a carrier-to-carrier morphism with a boundary name.

```text
morphism/action/apex law            -> lib/
registered package action family    -> src/actions
dispatch over the registered family -> src/registries or src/actions
CLI/OpenAPI/MCP/form projection     -> src/projections
running CLI/HTTP/MCP process        -> services/
authored action workbench           -> apps/
```

The `verb` is the stable transport-facing name.
It is not the ontology of action.

### Witness Log

A witness log is not one module.
It is memory as relation-witness time plus its folds and projections.

```text
witness row and fold law            -> lib/
coherence/readings through witness  -> lib/
JSONL/EAVT/codecs                   -> src/codecs
in-memory/package store interfaces  -> src/stores
filesystem-backed persistence       -> services/
log browser / inspector / InfoTile  -> apps/
```

The witness-log system must not become a top-level semantic folder.
Its parts are separated by what kind of existence they have.

### Reading / Coherence Kernel

A reading is a lawful way for one carrier to appear as another surface without becoming another ontology.

```text
reading law and commute-through-pivot law -> lib/
wire codecs and round-trip tests          -> src/codecs
generated API/tool descriptions           -> src/projections
running compatibility endpoint            -> services/
manual comparison/diagnostic UI           -> apps/
```

The rule is: protocols are readings, not sovereign adapters.

### Projection

A projection is a return view of the same carrier.

```text
pure projection law       -> lib/
serializable projection   -> src/projections
transport-bound response  -> services/
chosen human/agent view   -> apps/
```

Generated OpenAPI, MCP, form HTML, TypeDoc metadata, RDF, and package graphs are not apps.
They become app material only when a product deliberately chooses a workflow over them.

### JSNode Workspace Reading

JSNode is the host/workspace instance of the same anatomy.

```text
host marks: package.json, lockfile, git refs, imports, exports
  -> admission reader
  -> manifest/history/dependency carriers
  -> topology settlement
  -> fixed-point workspace carrier
  -> package atlas / audit / RDF / graph / cockpit projections
```

Placement:

```text
host readers                    -> src/admission or services
workspace carrier laws          -> lib/
topology/fixed-point laws       -> lib/
package graph/audit/RDF codecs  -> src/projections
live scanner                    -> services/
workspace cockpit or atlas      -> apps/
```

The package graph is not a report.
It is a return projection of a settled package/history carrier.

## Refactor Sequence

The rewrite should proceed by uncoupling existence modes, not by renaming directories first.

### Phase 1: Split Pure Terms From Runtime Wiring

Goal: all term syntax, substitution, reduction, and type laws live in `lib/`.

Move only package-facing evaluator wiring, fixture loading, dispatch integration, and codec entrypoints to `src/`.

Proof obligation:

- pure term tests import from `lib/`;
- package dispatch tests import from public `src` exports;
- no `lib/` term module imports package registries, filesystem, fixtures, or process state.

### Phase 2: Split Carrier Shape From Carrier Realization

Goal: carrier literals and object laws live in `lib/`; runtime validation and registry live in `src/carriers`.

Proof obligation:

- every carrier has a pure shape address;
- every runtime validator is derived from that shape;
- no pure carrier module depends on the runtime registry;
- export map commits to realized package surfaces, not internal pure paths by accident.

### Phase 3: Split Action Law From Action Registry

Goal: action as morphism, composition, and apex law live in `lib/`; registered package action families live in `src/actions`.

Proof obligation:

- an action can be reasoned about without CLI, HTTP, MCP, or OpenAPI;
- a registered action family can be projected without re-authoring action semantics;
- `verb` is documented as transport-facing name, not ontology;
- dispatch imports registry/projection code, not the other way around.

### Phase 4: Split Reading Law From Wire Codecs

Goal: reading/coherence law lives in `lib/`; JSON, EAVT, RMN, HTTP, Lean JSONL, and other wire codecs live in `src/codecs`.

Proof obligation:

- a reading states the witness pivot and commutation law without naming a wire parser;
- codecs prove or test their round trip through the reading;
- protocols do not introduce parallel carrier ontologies.

### Phase 5: Split Projections From Processes

Goal: generated projections live in `src/projections`; live bindings live in `services/`.

Proof obligation:

- OpenAPI/MCP/form/manifest/graph projections can be generated without opening a port or reading `process.env`;
- CLI and HTTP services are thin process mounts over the same package apex;
- service code owns host lifecycle only.

### Phase 6: Admit Apps Only After Free Projections Are Exhausted

Goal: `apps/` contains only authored figures that cannot be generated from the apex.

Proof obligation:

- if a surface is just an action form, generated docs, or API description, it stays in `src/projections`;
- if a surface chooses an interpretive workflow, visual grammar, or product sequence, it may enter `apps/`;
- apps do not own data or redefine service/process machinery.

## Non-Negotiable Invariants

1. No free data below admission.
2. No Node host facts in pure derivation modules.
3. No process state in `lib/` or ordinary `src/` package law.
4. No hand-authored app behavior hidden inside generated projections.
5. No semantic named system gets a folder merely because it has a name.
6. Named systems are spans through the strata.
7. Transport forms are witnesses, not ontology.
8. Export maps are commitments, not conveniences.
9. Import graphs must not smuggle higher ontology downward.
10. A service mounts an apex; it does not redefine the apex.

## Example: Action

`Action` is not merely runtime dispatch.

It spans:

```text
lib/...        action as carrier-to-carrier morphism, composition law, apex law
src/actions    registered package action family and dispatchable declarations
src/projections CLI/OpenAPI/MCP/form projections of that family
services/cli   process binding for argv/stdin/stdout
services/http  process binding for HTTP
apps/...       authored action workbench, if one exists
```

So moving "actions" wholesale to one folder would be wrong.
The correct move is to split the action span by existence mode.

## Example: Witness Log

The witness-log system is also a span:

```text
lib/primitive or lib/relational   witness row shape
lib/closure or lib/computing      fold law from log to state/record/content
lib/relational                    cross-reading/coherence law
src/codecs                        JSONL/EAVT/transport codecs
src/stores                        in-memory or package-level store interfaces
services/filesystem-store          actual filesystem persistence
apps/inspector                    visible witness-log inspection
```

It should not become a top-level semantic folder.

## Example: JSNode Workspace Reading

A JSNode workspace reading is not a special exception.

```text
host package.json/git/lockfile/path marks -> services or src/admission
admitted manifest/history/dependency carriers -> lib/primitive or lib/relational
topology settlement law -> lib/closure/cohomology/relational
package graph/RDF/audit/OpenAPI projection -> src/projections
running workspace scanner -> services
package atlas or cockpit -> apps
```

The package graph is not a report.
It is a return projection of a settled package/history carrier.
