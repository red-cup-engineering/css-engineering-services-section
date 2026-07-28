# API Surface

The `exports` map is the public contract.
Prefer explicit subpaths when a module is responsible for a boundary or representation.

## Root

`@emsenn/relating` rolls up the common category surface:

- articulating, predicating, positing, and settling carriers and morphisms
- finite typed-theory consequence over predication base objects through the articulating/predicating namespace
- finite FOUR-valued relation matrices, profiles, duals, and transforms
- FOUR charge algebra helpers
- bigraded settling-cohomology helpers over FOUR census data
- D4 gauge and order-swap helpers for the FOUR value square
- Diataxis mode, axis, and duality reads over the FOUR value square
- boundary action registration and dispatch
- carrier declaration helpers
- Relation Model Notation constructors and evaluators
- JSON codec helpers

Use it for normal downstream package work.

## Articulating

`@emsenn/relating/articulating` owns the base admission and the namespaces that derive from it:

- marks, tokens, claims, utterances, and articulation cells
- `predicating`, including finite predication sites and relation matrices
- `predicating.typedTheory`, the finite consequence workbench over predication base objects
- `predicating.positing`, including FOUR charges, predication fibers, and the finite value/fiber linear-logic layer, plus the Diataxis FOUR read
- `predicating.geometry.spatial`, the exact quadratic cut-and-project surface

Use this subpath when you need the shaped namespaces instead of the root rollup.
The typed-theory surface currently lives here because it is consequence over predication data, before positing admits evidence and settling closes it.

## Typing

`@emsenn/relating` owns the single-source carrier kernel:

- `carrier(id, shape)`
- `schemaCarrier(id, schema)`
- `action(spec)` at the registry layer
- `registeredCategory`
- `morphismCarrier(action)`
- `actionIrAudit(actions)` and `freeTsActions(actions)`
- `realize`, `realizeDefs`, `printType`, and `generateDeclaration`

Reach here when you need to inspect or build the category registry itself.
For a boundary-level inspection of a serialized action body, dispatch the registered `inspect` action over `morphismCarrier(action)`.

Use the realization/printer helpers when you need a structural TypeScript-shaped projection of a JSON Schema.
They forget refinement predicates such as `minLength`, `pattern`, and `format`; those remain schema-validator law, not printed type structure.

## Running

`@emsenn/relating/running` is the public action-boundary subpath.
Its source lives under `src/running` because this layer owns the process-facing act of running an action family: dispatch, serving, routing, transport projections, and invocation witnessing.

- `action(spec)`, the public wrapper that validates codecs and evaluates `runTerm`
- `dispatch(...)
  `, the one argv/stdin boundary runner
- `induceBins(...)
  `, the action-family apex that projects discovery, resources, prompts, endpoint metadata, and a bound dispatch function
- `resource(...)
  `, `literalResource(...)
  `, and `prompt(...)
  `, the package knowledge-vault legs collected into the same induced apex
- HTTP, OpenAPI, MCP, and form projections
- `services/http/app`, the lower-level Node HTTP app object language for representations, resource descriptors, `.well-known` resources, request body readers, and projected SSE events
- `TRANSPORT_WORK`, `workType`, `determination`, `sessionWork`, and the claim-session helpers that read runtime transports through the four `Procedure` / `Process` / `Derivation` / `Inquiry` work types
- `operationsManifoldOf`, `operationsManifoldGraphOf`, `operationsManifoldUri`, and `operationsManifoldResource`, the topology read over induced package apices and their carrier extrema
- `witnessInvocation`, `invocationStore`, `invocationFeed`, and `projectInvocations`, the one-row-per-scripted-play invocation witness surface
- carrier-node manifold routing and serving
- invocation witnessing

## Codecs

`@emsenn/relating/codecs` is the public package-phase codec subpath.
Its source lives under `src/codecs` because codec functions decode, encode, and
project boundary representations without owning process lifecycle.

- `wireCodec`, `wireByMediaType`, `wireOf`, and `WIRE_CODEC_NAMES`, the finite graded wire vocabulary for stdin/stdout and HTTP response selection

## Running Ledger

`@emsenn/relating/running/ledger` owns witness-log projections:

- append-only witness logs
- projected state views
- settled record tiers
- content-document cuts
- the one effectful filesystem store binding

See [Witness projection](witness-projection.md) for the user-facing shape of that log-to-view-to-content path.
See [Scripted invocation witnesses](scripted-invocation-witnesses.md) for the action-boundary feed that writes one EAVT row per successful dispatched play.

The package still exports `/holography/projecting` to this same surface for the older handle.

## Writing

`@emsenn/relating/writing` and its subpaths own representation boundaries.
Writers and codecs translate between carriers and wire formats; they do not define the ontology of the carrier.

The writing barrel also exposes `quadraticToNumber` for the lossy native-number read of the exact spatial geometry surface.
Exact quadratic arithmetic itself is under `@emsenn/relating/articulating` at `predicating.geometry.spatial`.

`@emsenn/relating/projections` owns projection lattices: a resource is recognized, read, and written as a carried type through projector morphisms.
The package still exports `/codecs` and `/holography` to these current surfaces for older handles.

Use `define` and `restrict` from `@emsenn/relating/projections` when you need to author a new resource type.
Use `classify` and `entails` when you need to read the most specific projector that recognizes a resource and the child-to-root chain it entails.

The writing catalog also exposes `projectRadial`, `radialFromValuation`, `radialFromClosureStages`, and `radialProjector` for deterministic SVG projection of charged predication valuations.
Use that surface when relation material needs to cross into inspectable visual bytes without introducing a layout engine.

The writing catalog also exposes the RMN executable-document gate: `rmnProjector`, `isRelationalTerm`, `parseRmn`, `settleRmn`, `htmlIsRelational`, `extractRelationalScripts`, `settleRelationalHtml`, `sessionIsRelational`, and `settleRelationalSession`.
Use it when an HTML document or open message stream should carry RMN morphism bodies while rejecting ordinary JavaScript or plain data as executable content.

`@emsenn/relating/writing/http` and its subpaths own pure HTTP representation codecs: header fields, negotiation, cookies, compression, multipart forms, SSE frames, WebSocket frames, and MCP JSON-RPC envelopes.
They do not own a server adapter.
Import `/writing/http/mcp` when you need only the MCP-over-HTTP envelope helpers.

## Analysis

`@emsenn/relating/analysis` owns exact analytical reads downstream of settlement:

- exact naturals, integers, rationals, matrices, determinants, characteristic polynomials, Smith normal form, and rank
- graded rationals and conservation checks
- relation-graph Laplacians, harmonic judgments, component counts, spectrum polynomials, and spanning-tree counts
- FOUR charge distributions, evidence coordinates, majorization/mixedness, independence, distortion, and screening-off

Use it when you need carrier-valued analysis, not floating-point numerical helpers.

## Settling

`@emsenn/relating/settling` owns settlement-shaped reads exported from the predication/positing line:

- settlement classification, depth, limit-stage, increment, firing, and cofinality reads
- fixed-point topology reads: knowledge/truth least and greatest fixed points, gap verdicts, fixed-point information, sections, and topology vitals
- firing and causal-order reads: charge-valued firing cohomology, negation orbits, firing independence, temporal firing events, cones, timelike/spacelike separation, and exact finite ordering fractions
- bounded ordinal closure search and finite / Scott / transfinite regime reads
- learning-depth reads over admitted closure-regime data
- observed learning-cycle reads over a closure carrier's finite recorded orbit
- value-category settling helpers: finite/sample partial-order and closure-law judgments, regime data, value-independence, and Boolean/FOUR recovery
- optimization helpers that read measure, constraints, and improvement as value-category settling, with optimum fixed-point witnesses
- finite probability and stochastic-settling helpers: counting-measure valuation, conditioning/reindex witnesses, Markov advance, and stationary fixed-point witnesses
- first-cohomology and graded-gap reads
- FOUR census helpers for the current bigraded settling-cohomology read
- substitution-dynamics and step-N recurrence reads exposed as `dynamics`

Use it when you need settlement structure itself.
Use `@emsenn/relating/analysis` when you need exact arithmetic, graph, spectral, or evidence-distribution analysis downstream of settlement-shaped data.

## Dynamics

`@emsenn/relating/dynamics` owns the finite substitution-dynamical read downstream of aperiodic settling:

- substitution symbols, rules, abelianization, finite orbits, and fixed-point closure carriers
- exact incidence-matrix reads: characteristic polynomial, primitivity, colimit, duality, and step-N invariant
- `recurrence`, the step-`n` co-incrementing hierarchy with worked Fibonacci and Padovan instances

Use it when you need the executable finite substitution workbench.
Do not treat it as the full aperiodic-moduli or universality surface.

## Notating And Evaluating

`@emsenn/relating/notating` and `@emsenn/relating/evaluating/*` own Relation Model Notation:

- `notating`: term and type constructors
- `evaluating`: reduction, evaluation, type checking, and term reads
- `evaluating/connecting`: Formal Concept Analysis Galois-connection terms
- `evaluating/pairing`: finite Chu-space pairing terms over FOUR
- `evaluating/projecting`: deterministic carrier-to-term and term-to-carrier bridges, plus `objectTerm`, `arrayTerm`, and `stringTerm` builders
- root catalogs: `nat`, `settlingTerms`, `readerTerms`, and `measurement` collect portable term bodies for natural counting, settlement free construction, settlement readers, and Lean-grounded regime measurements

Carrier morphism bodies should live here as data whenever the operation is pure.
The package still exports `/expressing/*` to these current surfaces for older handles.
