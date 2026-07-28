# Derived tests and examples obligations

This note derives `test/` and `examples/` from the current Hoare architecture of
`@emsenn/relating`. It does not preserve tests or examples because they already
exist. Existing files are evidence only when they prove an invariant or
demonstrate an intended exposure path.

## Meaning of `test/` and `examples/`

`test/` proves invariants.

A test is required when a relational Hoare triple commits the package to a law:

```text
{ material, world, constraints, history }
  operation
{ material', world', boundary, witness }
```

The test must prove the invariant named by that triple: material law, package
realization, live exposure, boundary/import law, or a negative ownership law. A
test is misplaced when it merely tours an exposure path without asserting the
law that would make the path safe.

`examples/` demonstrates intended exposure paths.

An example is required when a user, downstream package, or authored optic needs
to see how admitted material travels through an aperture, lens, sensor,
development bath, phase plate, projection, or exposure ledger. An example may
contain `assert` as a local guard, but if its real purpose is to prove a package
or service invariant, it belongs in `test/` as a smoke or invariant test.

## Derivation procedure

Apply this procedure to any package change before moving tests or examples:

1. Write the operation as a relational Hoare triple:

   ```text
   { material, world, constraints, history }
     operation
   { material', world', boundary, witness }
   ```

2. Classify what the operation changes:
   material law, package realization, live exposure, authored optic, exposure
   ledger, or package membrane.

3. Derive the test from the committed law:
   a test must name the invariant that would make the operation safe. If the
   operation merely shows a path through the system, it is not yet a test.

4. Derive the example from the exposure path:
   an example must show an intended aperture/lens/sensor/development/phase/
   projection/ledger path. It may guard itself with assertions, but the
   assertions are not the reason the example exists.

5. Place by organ and by representation morphology:
   material laws go under `test/lib`; package realizations under `test/src`;
   live process bindings under `test/services`; import/export/package membrane
   laws under `test/boundaries`; Lean or fixture oracles under
   `test/conformance`; examples under the camera organ they demonstrate.

6. For codecs, never place by nickname. Place by boundary substrate, syntax
   family, and refinement chain. EAVT datom JSONL is not a peer of HTML or SVG;
   it is textual JSON Lines relational row material.

7. Add the negative law whenever a surface moves:
   the old owner must not keep exporting the moved material. This is not
   preserving the old path; it is proof that ownership changed.

## Hoare class map

| Hoare-triple class | Forced root | Required test kind | Required example kind |
| --- | --- | --- | --- |
| Material law | `lib/` | Algebraic, closure, cohomology, dynamics, persistence, relational, and finite RelMath-shadow invariants over admitted material. No host facts, registries, package self-imports, or process APIs. | Small product tours over real carrier material: FOUR, predication, closure, cohomology, dynamics, probability, substitution, spectral, etc. |
| Package carrier realization | `src/carriers` | Pure schema literal realizes as runtime carrier; carrier id, validate/assert behavior, registry resolution, and declaration/shape relation are stable. | Carrier kernel path: one schema/shape becomes a carrier object, validates values, resolves by `$id`, and composes. |
| Package action realization | `src/actions` | Registered action family, domain/codomain carrier identity, dispatch result, `runTerm` gate for morphisms, boundary-action exemptions, and action count/export stability. | Action apex path: one action family projects into dispatch, OpenAPI, MCP, forms, carrier-node topology, and inspection. |
| Package codec/projection realization | `src/codecs`, `src/projections` | Decode/encode round trips, canonicalization, media type lookup, finite wire vocabulary, projector grading, deep representation-tree imports, and refusal of undecidable/wrong-rung wires. | Wire/projection path: textual JSON/JSONL/EAVT/Datom, textual XML/HTML/SVG, HTTP fields, diagram projections, and authored projector restrictions without opening a port. |
| Live exposure | `services/` | CLI/HTTP/service entrypoint smokes and route/process behavior: argv/stdin/stdout/env/port/request/response/exit. Generated projections must be usable without process binding. | Live mount path: run `relate`, `relate-serve`, or route through a service-like boundary and show the response/witness. |
| Exposure ledger / RWIL | Split: `lib/persistence`, `lib/closure`, `lib/relational`, `src/codecs`, `src/stores`, `services/filesystem-store`, `apps/inspector` | Witness-row identity, append-only law, fold/coherence law, codec normal form, in-memory store substitution, filesystem persistence as host exposure, and no second ontology for protocols. | Exposure ledger path: dispatch writes an invocation witness, projects state/record/content, shows source/channel separation. |
| Authored optics | `apps/` when shipped | App tests only after an app exists: app source must not redefine data, service lifecycle, or package law. Generated forms/docs remain projection tests. | Workbench/inspector/atlas/cockpit tours that choose a visual or interaction grammar over generated projections. |
| Node ESM / PNPM package law | package manifest, tsconfigs, `dist/` | Export-map resolution, bins resolve to `dist/services`, NodeNext `.mjs` import discipline, self-import smokes, and no old owner exports for moved surfaces. | Minimal package-use examples that import only committed public subpaths. |
| Negative ownership | all roots | Boundary check: `lib` cannot import `src/services/apps/node:*` or package self; `src` cannot import `services/apps`; services cannot import apps; `running` cannot re-export codec ownership. | No examples. Negative ownership is not a tour; it is a guardrail. |

## Current tests inventory

Verdicts are by obligation, not by historical filename.

### Keep as real invariant tests, then rename by law when touched

These are material-law or finite RelMath-shadow tests. They currently prove
real invariants, although many names still reflect the sedimentary public
surface `analysis`, `settling`, or product terms rather than the target
`lib/<stratum>` grammar:

```text
algebra-hierarchy.test.mjs
alexandrov-husainov.test.mjs
aperiodic-autocorrelation.test.mjs
aperiodic-classification.test.mjs
articulating.test.mjs
bigraded-cohomology.test.mjs
bigraded-diamond.test.mjs
bitopological-settling-site.test.mjs
causal.test.mjs
causal-involutivity.test.mjs
causal-manifoldlikeness.test.mjs
causal-microsupport.test.mjs
causal-mld-classification.test.mjs
causal-polarization.test.mjs
chromatic-lorentzian.test.mjs
chu.test.mjs
closure-operator-fiber.test.mjs
closure-rule-system.test.mjs
collatz.test.mjs
continuum-colimit.test.mjs
cohomology-rmn.test.mjs
coordination-cohomology.test.mjs
crdt-cohomological-calm.test.mjs
d-frame.test.mjs
dihedral-gauge.test.mjs
discrete-set-number-graph.test.mjs
dynamics-mld-hull.test.mjs
fca.test.mjs
fca-lambek-circle.test.mjs
flow.test.mjs
formats-four.test.mjs
four-corner-cell.test.mjs
frobenius-tqft.test.mjs
glass-overlap.test.mjs
graph-coloring.test.mjs
hauptvermutung.test.mjs
inconsistency-sheaf.test.mjs
internal-real.test.mjs
inverse-hull.test.mjs
jeandel-rao-witness.test.mjs
knaster-tarski.test.mjs
kz-coherent-sheaf.test.mjs
lambek-calculus.test.mjs
lax-slack.test.mjs
lawvere-harmonic-cohomology.test.mjs
lawvere-laplacian-rmn.test.mjs
linear-algebra-rmn.test.mjs
matter-topology.test.mjs
modal-kripke-four-valued.test.mjs
negative-paraconsistent-sheaf.test.mjs
number-theory.test.mjs
order-infra.test.mjs
ordinal-closure.test.mjs
pairwise-stone-clopen.test.mjs
persistent-h0.test.mjs
port-graph.test.mjs
positing.test.mjs
predicating.test.mjs
predicating-equality.test.mjs
predicating-fibration.test.mjs
predicating-quantifying.test.mjs
probability.test.mjs
quantale-enriched-sheaf.test.mjs
recurrence.test.mjs
regime-time-section.test.mjs
residuated-lattice.test.mjs
scott-coalgebra.test.mjs
settling.test.mjs
settling-associated-sheaf.test.mjs
settling-cohomology-h1.test.mjs
settling-local-constancy.test.mjs
sofic.test.mjs
spectral-rmn.test.mjs
term.test.mjs
transfinite-cell-complex.test.mjs
twist-product.test.mjs
valuation-fiber-algebra.test.mjs
value-settling.test.mjs
verification-tournament.test.mjs
weave-draft.test.mjs
```

Verdict: keep, then split/rename only when the corresponding `lib/` stratum is
created. These are not examples.

### Keep, but split by package organ

```text
typing.test.mjs
host-neutral-carriers.test.mjs
acting.test.mjs
codecs.test.mjs
projector-grading.test.mjs
diagram-projectors.test.mjs
relational-html.test.mjs
html-carrier-css-profile.test.mjs
lean-conformance.test.mjs
```

Verdict:

- `typing.test.mjs` becomes `test/src/carriers-realization.test.mjs` plus a
  smaller `test/src/registries-schema.test.mjs`. Its `existsSync` checks against
  removed generated files are negative sediment checks; keep them only until a
  proper no-legacy-surface test replaces them.
- `host-neutral-carriers.test.mjs` belongs with boundary/package law: it proves
  carriers and writing/codecs remain host-neutral. Rename toward
  `test/boundaries/host-neutral-carriers.test.mjs`.
- `acting.test.mjs` is real, but it is an omnibus. Split into action registry,
  action apex projections, dispatch, IR morphism gate, wire vocabulary, route
  projection, carrier manifold, and witness invocation.
- `codecs.test.mjs` currently proves representation invariants but imports the
  transitional `@emsenn/relating/writing` surface. Split into
  `test/src/codecs/text/json/index.test.mjs`,
  `test/src/codecs/text/json/jsonl/eavt/datom/index.test.mjs`,
  `test/src/codecs/text/xml/html.test.mjs`,
  `test/src/codecs/text/xml/svg.test.mjs`, and
  `test/src/projections/radial-svg.test.mjs`.
- `projector-grading.test.mjs`, `diagram-projectors.test.mjs`,
  `relational-html.test.mjs`, and `html-carrier-css-profile.test.mjs` should move
  under projection/codec tests. They are not app tests unless an authored app
  exists.
- `lean-conformance.test.mjs` is a package realization/conformance test because
  it reads committed fixture files and checks the public Node/RMN surface against
  Lean-emitted vectors. Keep it as `test/conformance/lean-golden-vectors.test.mjs`.

### Move or split into live exposure tests

```text
serve-transports.test.mjs
session.test.mjs
ws-session.test.mjs
transport-work.test.mjs
ledger-stream.test.mjs
```

Verdict: keep as live exposure/package-boundary tests, but move under
`test/services/` or `test/src/projections/` according to the actual triple.
`serve-transports.test.mjs` uses `node:http`, `node:net`, temp dirs, and request
routing; it is not material law. `session.test.mjs`, `ws-session.test.mjs`,
`transport-work.test.mjs`, and `ledger-stream.test.mjs` are live or generated
runtime-boundary invariants, not examples.

### Split RWIL law, codec, store, and service obligations

```text
holography.test.mjs
ledger-standards.test.mjs
reading.test.mjs
```

Verdict:

- `holography.test.mjs` is several organs fused: append-only witness log,
  OTLP channel code, markdown/content projection, filesystem store boundary, and
  content-tier reader. Split into `test/lib/persistence-witness-law.test.mjs`,
  the appropriate OTLP substrate/syntax codec test,
  `test/src/projections-witness-content.test.mjs`,
  and `test/services/filesystem-store.test.mjs`.
- `ledger-standards.test.mjs` proves standards-as-RWIL readings; split pure
  provenance/time/Memento law from codec/projection tests.
- `reading.test.mjs` proves same-witness/coherence law and should become a
  `lib/relational` law test, with any writing/EAVT pieces in codec tests.

### Convert or retire legacy-owner tests

No current test should be kept for the purpose of preserving the old surfaces
`src/actions.mts`, `src/carriers.mts`, `src/running/codecs.mts`, `scripts/cli.mts`,
`scripts/serve.mts`, or `@emsenn/relating/running` as a codec owner. Any test
whose only reason is "old import path still works" must be deleted or inverted
into a negative test.

The only old-surface checks worth keeping during migration are negative or
target-surface checks:

```text
@emsenn/relating/carriers resolves
@emsenn/relating/actions resolves
@emsenn/relating/codecs resolves
@emsenn/relating/codecs/wire resolves
@emsenn/relating/codecs/text/json resolves
@emsenn/relating/codecs/text/json/jsonl resolves
@emsenn/relating/codecs/text/json/jsonl/eavt resolves
@emsenn/relating/codecs/text/json/jsonl/eavt/datom resolves
@emsenn/relating/codecs/text/xml/html resolves
@emsenn/relating/codecs/text/xml/svg resolves
@emsenn/relating/running does not own or re-export wireCodec
dist/services/cli/main.mjs exists and parses
dist/services/http/main.mjs exists and parses
```

## Current examples inventory

### Keep as product tours of material law

These examples demonstrate finite material law or finite RelMath-shadow surfaces.
They should remain examples, though the import paths should migrate from
sediment exports (`analysis`, `settling`, `articulating`, `writing`) to target
stratum/package exports only when those exports are real commitments:

```text
algebra-hierarchy.mjs
alexandrov-husainov.mjs
aperiodic-classification.mjs
bigraded-cohomology.mjs
bigraded-diamond.mjs
bigraded-settling-cohomology.mjs
causal-lorentzian-extensions.mjs
chu-spaces.mjs
closure-flow-analysis.mjs
closure-operator-fiber.mjs
closure-regime.mjs
closure-rule-system.mjs
cohomology-rmn.mjs
coordination-cohomology.mjs
crdt-cohomological-calm.mjs
d-frame.mjs
diataxis-four.mjs
dihedral-gauge.mjs
discrete-set-number-graph.mjs
fca-lambek-circle.mjs
fixed-point-topology.mjs
firing-causality.mjs
formal-concept-analysis.mjs
formats-four.mjs
four-charge-algebra.mjs
four-corner-cell.mjs
frobenius-tqft.mjs
jeandel-rao-witness.mjs
knaster-tarski.mjs
kz-coherent-sheaf.mjs
lambek-calculus.mjs
lax-slack-diagnosis.mjs
lawvere-laplacian-rmn.mjs
learning-cycle.mjs
learning-depth.mjs
linear-algebra-rmn.mjs
modal-kripke-four-valued.mjs
negative-paraconsistent-sheaf.mjs
number-theory-factorization.mjs
optimization-settling.mjs
order-infra.mjs
ordinal-closure.mjs
pairwise-stone-clopen.mjs
predication-fiber-logic.mjs
predicating-equality.mjs
predicating-fibration.mjs
predicating-quantifying.mjs
probability-stochastic-settling.mjs
quantale-enriched-sheaf.mjs
ramsey-three-three.mjs
real-stochastic-interval.mjs
relation-matrix.mjs
residuated-lattice.mjs
scott-coalgebra.mjs
settlement-analysis.mjs
settlement-reader-terms.mjs
settling-associated-sheaf.mjs
sofic-shift.mjs
spatial-geometry.mjs
spectral-rmn.mjs
substitution-dynamics.mjs
term-products.mjs
twist-product.mjs
typed-theory-consequence.mjs
valuation-fiber-algebra.mjs
value-category-settling.mjs
value-settling-optimization.mjs
```

Verdict: keep. These are product tours, not smoke tests, except where they are
the only executable proof of a newly introduced invariant. In that case, move
the invariant into `test/` and leave the tour behind.

### Keep as package-realization examples

```text
descent.mjs
carrier-kernel.mjs
schema-realization.mjs
carrier-term-projection.mjs
operation-substrate.mjs
morphism-inspection.mjs
action-apex.mjs
action-knowledge-vault.mjs
operations-manifold.mjs
carrier-manifold.mjs
lean-conformance.mjs
```

Verdict: keep, but treat their `assert`s as local guardrails. If a public
subpath or export moved, the corresponding invariant belongs in `test/`;
the example should remain a readable exposure path.

### Convert to smoke tests or split because they prove boundary/service behavior

```text
running-http-app.mjs
runtime-transport-work.mjs
scripted-invocation-witnesses.mjs
witness-projection.mjs
http-boundary-codecs.mjs
representation-codecs.mjs
projector-lattice.mjs
radial-svg-projection.mjs
relational-html.mjs
```

Verdict:

- `running-http-app.mjs`, `runtime-transport-work.mjs`, and
  `scripted-invocation-witnesses.mjs` are smoke tests for runtime/service or
  witnessed-dispatch exposure. Keep a short example only after the smoke
  invariant is moved to `test/services` or `test/src/projections`.
- `witness-projection.mjs` writes and reads host files. Its store/persistence
  obligations belong in tests; the example can remain as the exposure ledger tour.
- `http-boundary-codecs.mjs`, `representation-codecs.mjs`, `projector-lattice.mjs`,
  `radial-svg-projection.mjs`, and `relational-html.mjs` are codec/projection
  tours. Any round-trip, refusal, grading, escaping, or deterministic-byte claim
  belongs in tests; the examples should show the intended projection path.

### Obsolete or transitional because they demonstrate legacy/facade ownership

These examples are not conceptually obsolete, but their current import surfaces
are legacy/facade-shaped:

```text
examples importing @emsenn/relating/writing
examples importing @emsenn/relating/writing/projector
examples importing @emsenn/relating/writing/http
examples importing @emsenn/relating/running
examples importing @emsenn/relating/running/http
examples importing @emsenn/relating/ledger
examples importing @emsenn/relating/settling
examples importing @emsenn/relating/articulating
examples importing @emsenn/relating/evaluating/*
examples importing @emsenn/relating/analysis
```

Verdict: do not delete just for using transitional imports. Instead, retire the
example only if the example's story is "this legacy facade is the owner." If the
story is a real exposure path, rename/repoint it when the target export exists.

Concrete obsolete ownership stories to remove:

- `running` as owner of codecs;
- `writing/http/*` as a general home for all HTTP process concerns;
- `ledger` as a single ontology for law, codec, store, service, and inspector;
- examples that imply generated OpenAPI/MCP/forms are apps;
- examples that preserve `scripts/` as the process root.

## Target directory grammar

The exact file names can vary, but this grammar is forced by the triples:

```text
test/
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
    carriers/
    registries/
    actions/
    evaluators/
    codecs/
      text/
        json/
          index.test.mjs
          jsonl/
            index.test.mjs
            eavt/
              index.test.mjs
              datom/
                index.test.mjs
        xml/
          html.test.mjs
          svg.test.mjs
      wire/
        index.test.mjs
    projections/
    stores/
  services/
    cli/
    http/
    filesystem-store/
  boundaries/
    imports.test.mjs
    exports.test.mjs
    node-esm-pnpm.test.mjs
    no-legacy-shims.test.mjs
  conformance/
    lean-golden-vectors.test.mjs
  fixtures/
    lean-*.jsonl
    rwil-*.jsonl

examples/
  material/
    aperture/
    lens/
    sensor/
    development-bath/
    phase-plate/
  package/
    carriers/
    actions/
    codecs/
      text/
        json/
          jsonl/
            eavt/
              datom/
        xml/
          html/
          svg/
    projections/
  services/
    cli/
    http/
    ledger/
  optics/
    projection/
    inspector/
    atlas/
```

`examples/optics` is allowed before `apps/` exists only as a tour of intended
optical exposure. It must not pretend to test a shipped app.

## Must-exist tests

### Material law

- `lib` imports no `src`, `services`, `apps`, `node:*`, or package self surfaces.
- Pure carrier schemas are data only; they do not call `carrierFrom`, registries,
  validators, process APIs, or package exports.
- Term syntax, substitution, reduction, type checking, and evaluator-normal-form
  laws are tested independently from dispatch and service bindings.
- Closure, cohomology, dynamics, persistence, relational reading, and computing
  laws each have at least one finite carrier invariant test.
- Lean conformance vectors remain package-visible conformance tests, not hidden
  example-only smokes.

### Package realization

- `@emsenn/relating/carriers` resolves by package self-import and exports
  `utteranceCarrier`, `articulationCellCarrier`, `memeCarrier`, `tyCarrier`, and
  `tmCarrier` with stable ids and validators.
- Every runtime carrier in `src/carriers` is derived from a pure schema literal.
- `@emsenn/relating/actions` resolves and exports the registered `actions` list;
  action count, required verbs, and domain/codomain carrier identities are pinned.
- Every action with both domain and codomain carriers carries `runTerm`, unless
  it is computably classified as a boundary.
- Boundary actions such as admission and realization are exempt by rule, not by a
  curated exception list.
- `@emsenn/relating/codecs` and `@emsenn/relating/codecs/wire` resolve; JSON,
  form, EAVT, RMN, SVG, Mermaid, XMI, and PlantUML wire names remain finite and
  intentional.
- Deep codec imports resolve through the representation tree:
  `@emsenn/relating/codecs/text/json`,
  `@emsenn/relating/codecs/text/json/jsonl`,
  `@emsenn/relating/codecs/text/json/jsonl/eavt`,
  `@emsenn/relating/codecs/text/json/jsonl/eavt/datom`,
  `@emsenn/relating/codecs/text/xml/html`, and
  `@emsenn/relating/codecs/text/xml/svg`.
- `wireOf` rejects undecidable/Turing-rung projectors.
- EAVT, Datom, and triple codecs live under the textual JSONL codec tests, not
  `writing` tests and not flat codec peer tests.
- Generated projections can be produced without opening a port or reading
  environment variables.

### Live exposure

- `bin.relate` points to `dist/services/cli/main.mjs`.
- `bin.relate-serve` points to `dist/services/http/main.mjs`.
- Built CLI and HTTP service entrypoints parse under `node --check`.
- CLI binds argv/stdin/stdout/stderr/env and delegates to package dispatch.
- HTTP binds port/request/response/env and delegates to package dispatch and
  generated projections.
- Route/request tests distinguish generated projection behavior from server
  lifecycle behavior.

### Exposure ledger

- Witness append is append-only and direct in-process action runs do not create a
  scripted-play witness.
- Witness row identity is independent of filesystem path.
- Log-to-state and reading/coherence are tested as pure folds/laws.
- EAVT/Datom/triple/OTLP/Memento/OpenTimestamps/in-toto/SLSA/Sigstore surfaces
  are tested as codecs/readings, not new ontologies.
- Filesystem store tests are isolated under service/store tests with temp dirs.

### Boundary/import/export

- `node dev/scripts/check-derived-boundaries.mjs` is part of the focused gate.
- There is a dedicated import-boundary test for:
  - `lib` cannot import `src`, `services`, `apps`, `node:*`, or package self.
  - `src` cannot import `services` or `apps`.
  - `services` cannot import `apps`.
  - browser-capable future `apps` cannot import Node process/server modules.
- Package self-import smokes exist for every new export commitment:
  `./carriers`, `./actions`, `./codecs`, `./codecs/wire`.
- Negative self-import or object-shape tests prove `@emsenn/relating/running`
  does not re-export codec ownership such as `wireCodec`.
- No test imports moved source files by their old locations.

## Must-exist examples

These examples are required by the camera/exposure model:

- Aperture: admit marks/encounters into an utterance or carrier, showing the free
  mark boundary and the first admitted carrier.
- Lens assembly: articulate sites, ports, fibers, and constraints; carrier
  manifold and operations manifold are the current best examples.
- Sensor: posit charges/valuations over admitted material; FOUR charge algebra,
  predication fiber logic, relation matrix, and valuation-fiber algebra are the
  current examples.
- Development bath: closure, settling, motion over time; closure regime,
  settlement analysis, closure flow, value-category settling, optimization,
  learning cycle/depth, and substitution dynamics are current examples.
- Phase plate: classify regimes and obstruction/coherence forms; bigraded
  cohomology, d-frame, modal Kripke, aperiodic classification, and cohomological
  examples cover this path.
- Projection optics: render boundary views without claiming bulk access; radial
  SVG, relational HTML, diagram projections, representation codecs, and projector
  lattice cover generated optics. Authored app optics must wait for `apps/`.
- Exposure ledger: record what was observed through which lens; scripted
  invocation witnesses and witness projection cover the current path, but their
  store invariants must move into tests.
- Package membrane: carrier kernel, schema realization, action apex,
  action-knowledge-vault, operation substrate, morphism inspection,
  operations-manifold, carrier-manifold, and carrier-term-projection.
- Service exposure: CLI and HTTP examples should exist only as thin service
  exposure tours after the service smoke tests exist.

## Must-not-exist checklist

- No tests whose purpose is to keep `src/actions.mts`, `src/carriers.mts`,
  `src/running/codecs.mts`, `scripts/cli.mts`, or `scripts/serve.mts` working.
- No tests that make `@emsenn/relating/running` the codec owner.
- No examples presenting `running` as the owner of codecs.
- No tests or examples treating EAVT, Datom, triple, HTML, SVG, JSON, and JSONL
  as peer codec names.
- No `lib` tests importing `@emsenn/relating` root or `src/*`; material tests
  must prove material law directly.
- No `src` tests that require a live port, env, filesystem store, or process
  lifecycle unless the test is explicitly a service exposure test.
- No app tests until `apps/` exists as an authored package surface.
- No examples preserving `writing/http/*` as if it owns live HTTP process
  dynamics.
- No RWIL tests that keep law, row codec, store interface, filesystem store,
  service feed, and inspector collapsed as one `ledger` ontology.
- No test naming by product nickname when the asserted invariant is a Hoare
  class/root-mode law.

## Missing tests caused by the carrier/action/codec moves

The source moves now visible in this checkout force the first new tests:

```text
src/carriers.mts        -> src/carriers/index.mts
src/actions.mts         -> src/actions/index.mts
src/running/codecs.mts  -> src/codecs/wire.mts
scripts/cli.mts         -> services/cli/main.mts
scripts/serve.mts       -> services/http/main.mts
```

Missing obligations:

- `test/src/carriers/root-export.test.mjs`: self-import
  `@emsenn/relating/carriers`, verify known carrier ids, validation, and no
  runtime registry in pure shapes.
- `test/src/actions/root-export.test.mjs`: self-import
  `@emsenn/relating/actions`, verify required verbs, action count, carrier edges,
  and `runTerm` gate.
- `test/src/codecs/wire-root-export.test.mjs`: self-import
  `@emsenn/relating/codecs` and `@emsenn/relating/codecs/wire`, verify finite
  vocabulary, RMN media type, JSON canonical round trip, and undecidable-wire
  rejection.
- `test/src/codecs/text/json/jsonl/eavt/datom/index.test.mjs`: self-import
  the deep EAVT/Datom textual JSONL path, verify row identity, parse/serialize
  normal form, and prove the same surface is not owned by `writing` or
  `running`.
- `test/src/codecs/text/xml/html.test.mjs` and
  `test/src/codecs/text/xml/svg.test.mjs`: self-import the deep XML-family
  paths and prove escaping/projector recognition without service or app
  ownership.
- `test/boundaries/no-legacy-shims.test.mjs`: prove the old moved source files
  are not imported and the old ownership surfaces do not reappear. In particular,
  `Object.hasOwn(await import("@emsenn/relating/running"), "wireCodec")` must be
  false.
- `test/boundaries/import-order.test.mjs`: promote the derived boundary checker
  into the test suite or run it as an explicit focused gate.
- `test/services/bins.test.mjs`: after build, verify `bin` targets point to
  `dist/services/*` and parse with `node --check`.
- `test/src/projections/no-process-binding.test.mjs`: generated OpenAPI/MCP/form
  and carrier-node projections can be produced without opening a port.

## Phased implementation plan

1. Smallest proof of the moves:
   add `test/boundaries/no-legacy-shims.test.mjs`,
   `test/src/carriers/root-export.test.mjs`,
   `test/src/actions/root-export.test.mjs`, and
   `test/src/codecs/wire-root-export.test.mjs`. Run
   `node dev/scripts/check-derived-boundaries.mjs`, `pnpm check`, `pnpm build`,
   and the focused tests. This phase proves the carrier/action/codec roots
   without reorganizing the whole suite.

2. Split `acting.test.mjs`:
   keep action registration and `runTerm` gate in `test/src/actions/`; move wire
   vocabulary to `test/src/codecs/`; move OpenAPI/MCP/forms/carrier manifold to
   `test/src/projections/`; move witnessed dispatch and route request exposure to
   `test/services/` or `test/src/stores/` according to host dependency.

3. Split codecs/projections:
   move `codecs.test.mjs`, `projector-grading.test.mjs`,
   `diagram-projectors.test.mjs`, `relational-html.test.mjs`, and
   `html-carrier-css-profile.test.mjs` into codec/projection law files. Codec
   tests must follow the deep substrate/syntax/refinement tree, beginning with
   `test/src/codecs/text/json/jsonl/eavt/datom/`,
   `test/src/codecs/text/xml/html.test.mjs`, and
   `test/src/codecs/text/xml/svg.test.mjs`. Stop using `writing` as the
   directory name for new tests.

4. Split RWIL:
   divide `holography.test.mjs`, `ledger-standards.test.mjs`, and
   `reading.test.mjs` into persistence law, closure fold, relational coherence,
   codec, projection, store, and filesystem-service tests.

5. Rehome service exposure:
   move `serve-transports.test.mjs`, `ledger-stream.test.mjs`,
   `session.test.mjs`, `ws-session.test.mjs`, and `transport-work.test.mjs`
   under the services/projections boundary grammar.

6. Reorganize examples only after tests name the laws:
   leave product tours intact while extracting their smoke assertions into tests.
   Then group examples by camera organ and exposure path. Do not build an
   `apps/` example category as shipped app evidence until `apps/` exists.

## Lightweight verification run during this note

The focused architecture checker currently passes:

```text
node dev/scripts/check-derived-boundaries.mjs
derived boundary check passed
```

Current package evidence also shows:

- `package.json` already points `bin.relate` and `bin.relate-serve` to
  `dist/services/cli/main.mjs` and `dist/services/http/main.mjs`.
- `package.json` already exposes `./carriers`, `./actions`, `./codecs`, and
  `./codecs/wire`.
- Transitional exports still exist for `./writing`, `./running`, and `./ledger`.
- `src/running` imports `../codecs/wire.mjs`; `src/codecs` does not import
  `running` or services.
- `apps/` does not currently exist.
