---
title: "relating docs as a docs office, not solo prose"
description: "A tooling-backed workflow for documenting lib/relating through organizing-with-jsnode, dev.bare-cedar-fog.emsenn.net work surfaces, and model-worker assignments."
date: 2026-06-25
status: working-note
grounds: [relating, organizing-with-jsnode, dev.bare-cedar-fog.emsenn.net]
---

# relating docs as a docs office

The right move for `lib/relating` documentation is not "ask an agent to write better prose."
That is how Node packages end up with one great README, three stale examples, and a reference page that quietly lies by October.

Treat the docs as work in the shared field:

- `organizing-with-jsnode` reads the package into utterances and EAVT rows.
- `dev.bare-cedar-fog.emsenn.net` gives the session a work vocabulary, focus lane, locus claim, and context surfaces.
- model workers draft bounded passages from supplied evidence.
- Codex checks every claim against source, examples, tests, and generated API docs.

That is slower than freehand prose for the first page and much cheaper once the package keeps changing.

## Current surface check

Observed through repo-native tools on 2026-06-25:

- `dev.bare-cedar-fog.emsenn.net` `read-work-vocabulary` distinguishes `work`, `working`, `work-item`, `work-unit`, `trace`, `workflow`, `shared-field`, and `coordination`.
- `dev.bare-cedar-fog.emsenn.net` `orient-agent` for this task scoped the lane to `.
  `, `lib/relating`, and the potential focus `project-relating-webux`.
- `dev.bare-cedar-fog.emsenn.net` `claim-locus` recorded a conflict-free claim for this note and `lib/relating`.
- `organizing-with-jsnode` read `lib/relating` as `@emsenn/relating`: layer `lib`, lifecycle `active`, maturity `experimental`, Node `>=22.18`, bins `relate` and `relate-serve`, scripts `build`, `check`, `docs:api`, `examples`, `test`, and `verify`, runtime dependencies `@sinclair/typebox` and `ajv`, and exports across `running`, `ledger`, `writing/http/*`, `evaluating/*`, and `expressing/*`.
- NVIDIA Integrate model discovery worked from the `.envrc` key.
  A large Nemotron completion failed with account-level 404; `meta/llama-3.1-8b-instruct` completed but produced generic prose.
  Local Ollama is installed with multiple models; the small smoke test returned no useful text in this run.

The boring conclusion is useful: the remote endpoint is reachable, but model prose must be treated as a drafting worker, not as an authority.

## Workflow

1. Claim the docs locus with `dev.bare-cedar-fog.emsenn.net` before editing package docs.
2. Read the work vocabulary and orientation surface for the current prompt.
3. Read `lib/relating` through `organizing-with-jsnode` and keep the EAVT facts as the package evidence pack.
4. Read the package source, tests, examples, and generated TypeDoc for the specific surface being documented.
5. Create one model-worker assignment per page or section.
  The assignment includes only evidence the worker may use and an output contract.
6. Use NVIDIA first when the model is available for the account; use Ollama for small local passes once its runtime is warmed and returning non-empty output.
7. Promote model output only after Codex checks each API name, behavior claim, invariant, and example command against the repo.
8. Record the completed section as a work-unit trace: evidence used, files changed, verification run, and any model-worker failures.

## First assignments

### 1. README Product Seed

Office: `relating.docs.product-reader`

Input evidence:

- `README.md`
- `package.json`
- `docs/README.md`
- `organizing-with-jsnode` EAVT facts for package exports, scripts, bins, runtime dependencies, lifecycle, and maturity
- source index files for the public exports being named

Output contract:

- 250-400 words for the top of the README
- must explain the package as a TypeBox-backed relational action substrate
- must name only APIs present in source or package exports
- must include one "what it is not" paragraph

### 2. Running and Witnessing Guide

Office: `relating.docs.boundary-runner`

Input evidence:

- `src/running/*.mts`
- `src/ledger/*.mts`
- `test/acting.test.mjs`
- `test/serve-transports.test.mjs`
- examples that invoke `relate`, `relate-serve`, dispatch, feeds, or ledgers

Output contract:

- a user guide under `lib/relating/docs/`
- must distinguish direct `action.run` from dispatch and served invocation
- must explain which rows are witnessed, where they are stored, and what projection reads back
- must include one runnable example pointer and one boundary/limitation section

### 3. Carrier/Action/IR Reference Pass

Office: `relating.docs.source-reference`

Input evidence:

- `src/typing/kernel.mts`
- action and carrier source files
- TypeDoc output
- tests that assert carrier validation, run terms, and action dispatch

Output contract:

- JSDoc patch candidates, not final prose
- each proposed doc comment must identify the exact symbol and source file
- comments must describe observable contract, not implementation folklore
- every mathematical term needs either a source citation in repo docs or a plainer operational gloss

## Prose seed

`@emsenn/relating` is not a "relations in Node" utility.
A normal Node library hands you functions and asks you to remember what shape moves through them.
This package makes the shape a carrier, the move an action, the executable body a typed term where possible, and the boundary invocation something that can be projected through CLI, HTTP, MCP, OpenAPI, ledgers, feeds, and docs.
The strange part is not that it has relations; the strange part is that the relation is the product surface.
The package is trying to make software behave like a small law-bearing category without making the user carry the category theory in their teeth.

## Guardrails

- Do not let a model invent public handles.
  Check `package.json` exports and the relevant `src/**/index.mts`.
- Do not let a model flatten dispatch, direct action execution, HTTP serving, and ledgers into one vague "runtime."
  Check tests and examples for the actual boundary behavior.
- Do not describe TypeBox/Ajv as decoration.
  In this package the carrier, static type, JSON Schema, and validator are the same public contract when the code says they are.
- Do not publish categorical claims unless they are grounded in code-adjacent docs, tests, Lean artifacts, or content notes named in the assignment.
- Do not use model-generated examples unless they run through the package's `examples` or a focused `node --test` path.
- Do not treat docs as done until `check`, `build`, `docs:api`, focused examples, and relevant tests have been run for the edited package surface.

## Model-worker result

The first NVIDIA worker response was useful mostly as negative evidence: it recognized the need for workflow, assignments, prose seed, and guardrails, but it collapsed the assignments into generic module documentation and missed the core product claim.
Keep that behavior in mind.
The worker can draft, but the office must constrain the work.
