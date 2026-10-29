# @emsenn/relating

`@emsenn/relating` is the relational substrate for the 561 Group Node ecosystem.
It gives downstream packages one category-shaped boundary system: carriers are declared once, morphisms are registered once, and the same surface projects to CLI, HTTP, OpenAPI, MCP, browser forms, TypeDoc, and durable witnesses.

The package is intentionally small at the runtime edge.
It depends on TypeBox and Ajv, targets Node `>=22.18`, ships ESM with declaration files, and uses an `exports` map as its public API contract.

## What To Import

Use the root import for the ordinary relational API:

```ts
import {
  utterance,
  articulate,
  predicate,
  posit,
  settle,
  carrier,
  action,
  induceBins,
  dispatch,
  tm,
  evaluateRunTerm,
} from "@emsenn/relating";
```

Use subpaths when you are working at a specific boundary:

| Subpath | Use it for |
| --- | --- |
| `@emsenn/relating` | The common carrier, morphism, charge, settlement, action, and term surface. |
| `@emsenn/relating` | The TypeBox/Ajv carrier kernel and morphism registry. |
| `@emsenn/relating/running` | Boundary actions, dispatch, CLI/HTTP/MCP/OpenAPI projections, and carrier-node mounting. |
| `@emsenn/relating/running/http` | HTTP app objects: representations, resources, body readers, `.well-known`, and SSE projection. |
| `@emsenn/relating/running/ledger` | Witness-log, state, record, and content projection helpers. |
| `@emsenn/relating/writing` | JSON, EAVT, markdown, HTTP, XML, SVG, and related representation writers/codecs. |
| `@emsenn/relating/writing/http` | Pure HTTP field, negotiation, cookie, stream-frame, and MCP-envelope codecs. |
| `@emsenn/relating/writing/projector` | Projection lattices from resources into typed carried content. |
| `@emsenn/relating/articulating` | Articulation, predication, typed-theory consequence, and exact spatial geometry namespaces. |
| `@emsenn/relating/settling` | Settlement-filtration readers, bounded ordinal closure search, learning-depth reads, and settling cohomology helpers. |
| `@emsenn/relating/analysis` | Exact settlement/evidence analysis: naturals, rationals, matrices, Laplacians, spectra, and distributions. |
| `@emsenn/relating/dynamics` | Finite substitution-dynamics and step-N recurrence reads downstream of settling. |
| `@emsenn/relating/notating` | Relation Model Notation terms and types. |
| `@emsenn/relating/evaluating/*` | The CHL-style term calculus, evaluation, catalogs, and carrier projection. |

The export map still carries older handles such as `/acting`, `/codecs`, `/holography`, and `/expressing/*` where they already existed, but new code should prefer the canonical names above.

The export map is the normative API.
Internal paths under `src/` are not.

## Core Model

The package carries one descent:

```text
Mark -> Utterance -> ArticulationCell -> PredicationSite -> PositPresheaf -> SettlementFiltration
```

Only admission introduces opaque `Mark` data.
Everything downstream is a typed carrier-to-carrier morphism.
The standard actions expose that descent as a pipe:

```sh
printf "token\nclaim" \
  | relate utter \
  | relate articulate \
  | relate predicate \
  | relate posit \
  | relate settle
```

`induce-relation` is the same descent as one named play.

## Carrier And Action Discipline

A carrier is authored once:

```ts
import { Type } from "@sinclair/typebox";
import { carrier } from "@emsenn/relating";

export const readingCarrier = carrier("example/reading", {
  kind: Type.Literal("example.reading"),
  value: Type.String(),
});
```

That one value supplies the static TypeScript type source, JSON Schema with a bare `$id`, and Ajv validation.
Actions consume carrier objects at their domain and codomain:

```ts
import { action, tm } from "@emsenn/relating";

export const echoReading = action({
  verb: "echo-reading",
  domain: readingCarrier,
  codomain: readingCarrier,
  runTerm: tm.lam(tm.var(0)),
});
```

Carrier morphisms should prefer `runTerm`: Relation Model Notation is the language-neutral body that dispatch, HTTP, MCP, tests, and Lean-backed conformance can all inspect.
Free TypeScript `run` bodies are reserved for true boundary admissions, codecs, transports, or effects.

## Commands

From the workspace root:

```sh
pnpm --filter @emsenn/relating run check
pnpm --filter @emsenn/relating run build
pnpm --filter @emsenn/relating test
pnpm --filter @emsenn/relating run verify
pnpm --filter @emsenn/relating run docs:api
```

The package resolves by name through `dist/`, so rebuild before running tests after source or fixture changes.

## Documentation

- User docs start at [docs/README.md](docs/README.md).
- The agency architecture (action → capability → faculty → face → edge → bulk → boundary) is at [docs/agency-architecture.md](docs/agency-architecture.md).
- Product-shaped orientation starts at [docs/internal-products.md](docs/internal-products.md).
- Action knowledge-vault docs are at [docs/action-knowledge-vault.md](docs/action-knowledge-vault.md).
- Operations manifold topology docs are at [docs/operations-manifold.md](docs/operations-manifold.md).
- Scripted invocation witness docs are at [docs/scripted-invocation-witnesses.md](docs/scripted-invocation-witnesses.md).
- Graded wire codec docs are at [docs/wire-codecs.md](docs/wire-codecs.md).
- Morphism inspection docs are at [docs/morphism-inspection.md](docs/morphism-inspection.md).
- Carrier-term projection docs are at [docs/carrier-term-projection.md](docs/carrier-term-projection.md).
- Settlement reader term docs are at [docs/settlement-reader-terms.md](docs/settlement-reader-terms.md).
- Schema realization docs are at [docs/schema-realization.md](docs/schema-realization.md).
- Dihedral gauge docs are at [docs/dihedral-gauge.md](docs/dihedral-gauge.md).
- Diataxis FOUR read docs are at [docs/diataxis-four.md](docs/diataxis-four.md).
- Relation matrix docs are at [docs/relation-matrix.md](docs/relation-matrix.md).
- Bigraded settling cohomology docs are at [docs/bigraded-settling-cohomology.md](docs/bigraded-settling-cohomology.md).
- Bigraded diamond docs are at [docs/bigraded-diamond.md](docs/bigraded-diamond.md).
- Bigraded cohomology docs are at [docs/bigraded-cohomology.md](docs/bigraded-cohomology.md).
- Ordinal closure docs are at [docs/ordinal-closure.md](docs/ordinal-closure.md).
- Scott coalgebra docs are at [docs/scott-coalgebra.md](docs/scott-coalgebra.md).
- Aperiodic classification docs are at [docs/aperiodic-classification.md](docs/aperiodic-classification.md).
- Jeandel-Rao finite witness docs are at [docs/jeandel-rao-witness.md](docs/jeandel-rao-witness.md).
- Settling Frobenius TQFT docs are at [docs/frobenius-tqft.md](docs/frobenius-tqft.md).
- Pairwise Stone clopen docs are at [docs/pairwise-stone-clopen.md](docs/pairwise-stone-clopen.md).
- Settling associated sheaf docs are at [docs/settling-associated-sheaf.md](docs/settling-associated-sheaf.md).
- Negative paraconsistent sheaf docs are at [docs/negative-paraconsistent-sheaf.md](docs/negative-paraconsistent-sheaf.md).
- Quantale-enriched sheaf docs are at [docs/quantale-enriched-sheaf.md](docs/quantale-enriched-sheaf.md).
- Alexandrov/Husainov docs are at [docs/alexandrov-husainov.md](docs/alexandrov-husainov.md).
- CRDT/CALM docs are at [docs/crdt-cohomological-calm.md](docs/crdt-cohomological-calm.md).
- KZ-coherent sheaf docs are at [docs/kz-coherent-sheaf.md](docs/kz-coherent-sheaf.md).
- Coordination cohomology docs are at [docs/coordination-cohomology.md](docs/coordination-cohomology.md).
- D-frame docs are at [docs/d-frame.md](docs/d-frame.md).
- Spatial geometry docs are at [docs/spatial-geometry.md](docs/spatial-geometry.md).
- Typed-theory consequence docs are at [docs/typed-theory-consequence.md](docs/typed-theory-consequence.md).
- Predication fiber logic docs are at [docs/predication-fiber-logic.md](docs/predication-fiber-logic.md).
- Exact analysis docs are at [docs/settlement-analysis.md](docs/settlement-analysis.md).
- Fixed-point topology docs are at [docs/fixed-point-topology.md](docs/fixed-point-topology.md).
- Firing causality docs are at [docs/firing-causality.md](docs/firing-causality.md).
- Closure regime docs are at [docs/closure-regime.md](docs/closure-regime.md).
- Learning depth docs are at [docs/learning-depth.md](docs/learning-depth.md).
- Observed learning-cycle docs are at [docs/learning-cycle.md](docs/learning-cycle.md).
- Value-category settling docs are at [docs/value-category-settling.md](docs/value-category-settling.md).
- Optimization settling docs are at [docs/optimization-settling.md](docs/optimization-settling.md).
- Probability and stochastic settling docs are at [docs/probability-stochastic-settling.md](docs/probability-stochastic-settling.md).
- Substitution dynamics docs are at [docs/substitution-dynamics.md](docs/substitution-dynamics.md).
- Holography projector lattice docs are at [docs/projector-lattice.md](docs/projector-lattice.md).
- Relational HTML docs are at [docs/relational-html.md](docs/relational-html.md).
- Radial SVG projection docs are at [docs/radial-svg-projection.md](docs/radial-svg-projection.md).
- HTTP boundary codec docs are at [docs/http-boundary-codecs.md](docs/http-boundary-codecs.md).
- Running HTTP app docs are at [docs/running-http-app.md](docs/running-http-app.md).
- Runtime transport work docs are at [docs/runtime-transport-work.md](docs/runtime-transport-work.md).
- Runnable examples live in [examples/](examples/README.md).
- Developer docs start at [dev/docs/README.md](dev/docs/README.md).
- The acting/holography placement question is tracked in [dev/docs/adr/2026-06-25-acting-and-holography.md](dev/docs/adr/2026-06-25-acting-and-holography.md).

The source JSDoc and generated TypeDoc are the closest documentation to the machine contract.
Handwritten docs explain how to use and evolve that contract; they should not contradict the package `exports` map or source declarations.
