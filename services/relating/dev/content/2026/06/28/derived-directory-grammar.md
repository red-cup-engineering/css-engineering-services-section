# Derived directory grammar for `@emsenn/relating`

This is the strict form of the architecture.
The evidence for the grammar is collected in `dev/docs/derived-evidence-ledger.md`.

It names directories only when the name is forced by an existence mode:

- mathematical derivation stage;
- TypeScript package realization;
- Node process mount;
- authored figure.

It does not name directories for product identities such as RMN, RWIL, ICK, MASH, WMAP, or JSNode.
Those identities are spans through the grammar.

## Specimen Exposure Rule

The four roots correspond to the four modes of exposing a relational specimen:

```text
Material -> lib/
Phase    -> src/
Dynamics -> services/
Optics   -> apps/
```

`lib/` is material: support, ports, fibers, charge/value, constraints, intrinsic
motion, closure, and history law.

`src/` is phase: the material realized as an ESM package with runtime carriers,
registries, codecs, projections, exports, and package-local store interfaces.
This is the crystalline/package-readable phase: stable symbols, fixed module
specifiers, explicit input/output carriers, generated declarations, and normal
forms where the host requires them.

The full phase space does not belong to `src/`.
Settling without final collapse, contradiction without explosion, partial
boundary observation, nonperiodic order, mobility, basin descent, and measured
coherence failure are material laws in `lib/`.

`services/` is dynamics: live host exposure by argv/stdin/stdout, HTTP, MCP,
filesystem stores, scanners, clocks, ports, and process lifecycle.

`apps/` is optics: authored apparatus for observing, comparing, sequencing,
intervening, and making the exposure visible.

## Camera Anatomy Rule

An exposure is material admitted into an aperture.
The camera organs distribute through the four roots by existence mode:

```text
aperture law / admitted shape     -> lib/
host aperture reader              -> src/admission or services/
lens assembly law                 -> lib/
runtime lens realization          -> src/
sensor law                        -> lib/
development bath law              -> lib/
phase plate law                   -> lib/
boundary projection realization   -> src/projections, src/codecs
live projection endpoint          -> services/
authored projection optics        -> apps/
exposure ledger law               -> lib/
ledger codecs and store interface -> src/codecs, src/stores
live ledger persistence           -> services/filesystem-store
ledger inspector                  -> apps/inspector
```

## Root Grammar

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
    index.mts

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
    workspace-scanner/

  apps/
    workbench/
    inspector/
    atlas/
    cockpit/
```

The `lib/` names are not copied from Lean as folders.
They are the quotient classes of pure TypeScript modules under the relation:

> two modules share a directory iff they consume the same prior kind of carrier and derive the same next kind of mathematical object.

The fact that these names align with the RelMath spine is evidence that the quotient was computed correctly.
The directory is wrong if it can be justified only by a topic label.

## `lib/`: Derivation Stages

`lib/primitive/`

- owns admitted base values and carrier atoms;
- owns the pure boundary between free mark and carried mark;
- does not read host files, package manifests, git, argv, env, stdin, or HTTP.

Examples: opaque marks, primitive identifiers, finite value carriers, base FOUR values if used as a primitive carrier.

`lib/articulation/`

- owns the first relational act over primitive marks;
- turns admitted marks into utterances, cells, token/claim pairings, and articulation carriers;
- may define constructors and local invariants, but no runtime registry.

Examples: utterance carriers, articulation cells, predication slots before settlement.

`lib/language/`

- owns RMN as syntax;
- owns substitution, renaming, normalization, and reduction when they are pure;
- does not own package evaluator dispatch or Lean/vector wire forms.

Examples: term ASTs, type formation, pure term equality, syntactic products.

`lib/calculus/`

- owns operations over the language and carrier arrows;
- owns morphism composition, action law, cut, residuation, and algebraic calculi;
- does not own registered action families or transport verbs.

Examples: carrier-to-carrier morphism law, apex composition law, Lambek/linear/residuated calculi.

`lib/site/`

- owns local-to-global shape;
- owns stalks, sections, covers, namespace sites, carrier-node prefix order, and gluing conditions;
- does not own a served URL tree.

Examples: package namespace as carrier-node site, section restriction, sheaf interface law.

`lib/closure/`

- owns monotone operators, fixed points, settling, folds, and sufficient-statistic laws;
- owns the pure part of `log -> state` when read as a closure/fold;
- does not own persisted log files.

Examples: Tarski/Lawvere closure, settlement operators, state projection as query-class statistic.

`lib/cohomology/`

- owns obstruction objects and harmonic/local-to-global witnesses;
- owns H0/H1, Laplacian shadows, inconsistency classes, and failure-to-glue as information;
- does not own diagnostics UI.

Examples: bigraded cohomology, Lawvere harmonic classes, cohomological CALM witnesses.

`lib/dynamics/`

- owns iteration, flows, substitutions, recurrence, orbit facts, and regime movement;
- owns no process scheduler.

Examples: aperiodic substitution, MLD hulls, recurrence, non-oscillation theorems.

`lib/persistence/`

- owns information through time;
- owns witness-time identity, entropy/retention laws, topological persistence, Landauer/H1 readings, and irreducible source laws;
- does not own JSONL append, filesystem stores, or SSE feeds.

Examples: RWIL row identity as relation-witness time, log entropy law, source/statistic/code order, persistence thresholds.

`lib/relational/`

- owns cross-reading and same-object-through-many-faces law;
- owns commute-through-pivot, holographic return, protocol-as-reading, and no-second-ontology constraints;
- does not own a protocol codec.

Examples: lenticular return projection law, source/channel separation, relation between ActivityPub outbox and witness source.

`lib/computing/`

- owns pure computation as a theorem about the substrate;
- owns distributed/coherence/action-apex computation laws that are independent of Node process state;
- does not own `process.argv`, sockets, fs watchers, or package execution.

Examples: pure dispatch algebra, CRDT law as carrier computation, proof-carrying synchronization law.

## `src/`: Package Realization

`src/` is the ESM package membrane.
It may know about TypeScript module boundaries, package exports, JSON Schema, runtime validation, public barrels, and generated descriptions.
It may not own long-lived processes.

`src/admission/`

- reads host marks as library functions;
- covers package manifests, lockfiles, git refs, source paths, wire documents, and already-present boundary data;
- returns admitted carriers or admission failures.

If a reader watches the filesystem, opens a port, or owns process lifecycle, the watcher belongs in `services/`.

`src/carriers/`

- realizes pure carrier shapes as runtime validators and TypeScript-facing objects;
- owns registry-local validation and assertion helpers;
- does not define the mathematical truth of the carrier.

`src/registries/`

- owns mutable package-local registries for carriers, actions, resources, prompts, codecs, and projections;
- may be cleared and rebuilt without changing mathematical truth.

`src/actions/`

- owns the registered package action family;
- binds pure morphism/action law to dispatchable declarations;
- does not own CLI or HTTP process entrypoints.

`src/evaluators/`

- owns package evaluator entrypoints when evaluation depends on registries, fixtures, package state, or public dispatch contracts;
- delegates pure reduction/type law to `lib/language` and `lib/calculus`.

`src/codecs/`

- owns reversible or law-tested wire encodings;
- names source carrier, target representation, and round-trip or loss boundary;
- covers JSON, JSONL, EAVT, Datom, triples, RMN text, Lean JSONL, HTTP field grammars, XML/SVG/HTML serialization when treated as wire.

`src/projections/`

- owns generated return views from carriers and action apexes;
- covers OpenAPI, MCP descriptions, CLI descriptors, generic HTML forms, RDF/package graphs, TypeDoc descriptions, index/tile/manifold documents;
- must not bind ports or pretend to be an authored app.

`src/stores/`

- owns abstract store interfaces and in-memory stores used by package dispatch/tests;
- does not own local disk as a site.

`src/exports/`

- owns explicit public surface shaping when it cannot live in `index.mts`;
- treats package exports as commitments, not convenience mirrors of the source tree.

## `services/`: Process Mounts

`services/` is what Node makes unavoidable: a live process must bind host reality somewhere.

`services/cli/`

- binds argv, stdin, stdout, stderr, exit codes, and shell conventions;
- calls `src/actions`, `src/projections`, and `src/codecs`;
- contains no carrier or action law.

`services/http/`

- binds ports, requests, responses, cookies, SSE/WebSocket lifecycles, and server health;
- calls generated projections and package dispatch;
- contains no OpenAPI generation law beyond serving the projection.

`services/mcp/`

- exists only for a long-lived MCP server process;
- generated MCP tool descriptions stay in `src/projections`.

`services/filesystem-store/`

- binds RWIL/source/store abstractions to actual directories and files;
- owns locks, paths, recovery, and append mechanics;
- does not define witness-time law.

`services/workspace-scanner/`

- binds JSNode admission to a live workspace scan or watcher;
- reads package roots, pnpm workspace state, lockfiles, git state, and import graphs as host marks;
- emits admitted package/history/dependency carriers through `src/admission`.

## `apps/`: Authored Figures

`apps/` exists only where generated projections stop being enough.

`apps/workbench/`

- authored relation/RMN/action work surface;
- chooses sequence, comparison, editing, and interpretation.

`apps/inspector/`

- authored inspection of witness logs, settling, obstructions, carrier history, or transport commutation;
- visualizes what a generated projection cannot responsibly decide.

`apps/atlas/`

- authored package/carrier/workspace map;
- reads generated package graph projections but chooses a navigational figure.

`apps/cockpit/`

- authored operational/handoff view over a running or remembered kernel;
- may use sufficient statistics from RWIL, but does not own RWIL data.

## Product Spans

### RMN

```text
syntax/reduction/type law       -> lib/language
calculus over terms             -> lib/calculus
package evaluator               -> src/evaluators
text/Lean/vector encodings      -> src/codecs
interactive explorer/workbench  -> apps/workbench
```

### RWIL

```text
witness-time/source identity          -> lib/persistence
log-to-state closure/statistic law    -> lib/closure
obstruction / information retention   -> lib/cohomology or lib/persistence
cross-channel source law              -> lib/relational
EAVT/Datom/JSONL/SSE encodings        -> src/codecs
store interfaces and in-memory stores -> src/stores
filesystem persistence                -> services/filesystem-store
visible log/state/record inspection   -> apps/inspector
```

### ICK / JSNode

```text
claim-substrate and carrier law       -> lib/primitive through lib/relational
host mark admission                   -> src/admission
package/runtime registries            -> src/registries
generated faces over the apex          -> src/projections
running kernel/service process         -> services/http, services/mcp, services/cli
workspace scanner                      -> services/workspace-scanner
package atlas or cockpit               -> apps/atlas, apps/cockpit
```

### Lenticular Holography

```text
same carrier through many readings     -> lib/relational
information-loss fold                  -> lib/closure and lib/persistence
wire-specific return projection        -> src/codecs or src/projections
live endpoint                          -> services
chosen comparison/diagnostic view      -> apps
```

## Import Law

Allowed source dependency direction:

```text
services -> src -> lib
apps     -> src -> lib
```

An app may communicate with a running service over a protocol at runtime.
That does not mean browser-capable app source should import Node process modules.

and within `lib/`:

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

This is an acyclic dependency order, not a claim that every theorem imports every prior directory.
Backward imports are evidence that a module is placed too high or is smuggling a runtime realization into pure law.

## Export Law

The package export map should expose commitments, not the directory grammar.

Pure commitments may export from `dist/lib/...`.
Package commitments export from `dist/src/...`.
Process entrypoints are `bin` targets into `dist/services/...`.
Apps are exported only when they are package-supported product surfaces.

No public export should exist merely because a folder exists.
