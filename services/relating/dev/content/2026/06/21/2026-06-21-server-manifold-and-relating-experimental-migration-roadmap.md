---
title: "Server bundling + relating-experimental migration"
description: "What the workspace is now, what we want the server to become, and the migration that gets there. Plain checkable statements."
date: 2026-06-21
status: superseded
superseded-by: 2026-06-22-faculty-refactor-master-plan.md
---

# Server bundling + relating-experimental migration

> **SUPERSEDED (2026-06-22).** The `relating-experimental → relating` collapse is DONE (`relating-experimental` no longer exists; `@emsenn/relating` is the new line).
> Kept for provenance.
> Current plan and status: [the faculty-refactor master plan](2026-06-22-faculty-refactor-master-plan.md).

## What is here now (checkable)

- Monorepo at `c:\Users\emsen\561-group`, pnpm workspace, trunk-only on `main`,
  ~63 packages under `lib/`, `apps/`, `services/`, `sites/`. `content` and the
  `sites/*` are git submodules.
- Root `package.json` has `check`/`build`/`test`/`verify` = `pnpm -r --no-bail run …`
  (added this session). 61 of 63 packages have a `check` script.
- Two import lines coexist:
  - **new** (`@emsenn/relating-experimental`): relating-experimental, communicating
    (+ -in-english/-latin/-lakota/-tokipona), knowing, animating-experimental,
    gaming-experimental, managing-operations-experimental.
  - **old** (`@emsenn/relating`, deprecated): animating, gaming, computing, trading,
    content, all `computing-with-*`, and the `services/*`.
- `lib/relating-experimental` is the boundary system. `src/acting/`:
  - `action.mts` — an `action` is one operation (verb, `in`/`out` codec,
    `run`, optional `inputSchema`/`outputSchema`).
  - `induce.mts` — `induceBins(actions)` builds one discovery carrier (the apex)
    for a package.
  - `dispatch.mts` — runs a verb as CLI; witnesses each call as EAVT.
  - `serving.mts` — `serve(actions,{induced})` binds ONE package's apex to an HTTP
    server: `GET /`, `GET /:verb` (form), `POST /:verb`, `GET /openapi.json`,
    `POST /mcp`, `GET /health`. `routeRequest` strips one `basePath`.
- Wire codecs: `string`, `json`, `eavt`, `form` (`acting/codecs.mts`).
- Schema: exactly one file today —
  `src/articulating/utterance.schema.json` (`$id: relating/articulating/utterance`).
  Carrier TS types are hand-written interfaces (e.g. `UtteranceCarrier` in
  `src/articulating/utterance.mts`), separate from the schema.
- `realize` (schema → TS type, forgetful) exists only as a CLI verb; the build is
  plain `tsc`. Nothing generates types from schemas at build time.
- Witness/holography: `log → state → record → content` projections; `dispatch`
  appends one EAVT row per call (`acting/invocation.mts`).
- The old HTTP stack (`services/http-server`, on `@emsenn/relating`) has
  `mergeApps`/`mountAt` (multi-mount) plus edge middleware (cors/csrf/auth/cache/
  compress/static/sse/ws). `sites/ops.561.group/src/app.mts` uses it.

## Goal 1 — server bundles many packages on one mount

Today `serve` mounts one package.
We want to mount a chosen set of packages on one origin, each under its own name, composing so one package's verb output feeds another's verb input.
Decisions made this session:

- **Each module is its own four-faced endpoint** (HTTP / OpenAPI / MCP / web).
- **A package mounts at the tail of whatever produces its domain carrier** — the URL path follows the data flow (a tiling), not a flat `/pkg/verb` list.
- **A "bundle" = a selected subset of the ecosystem served as one package.**
- Keep the old `http-server` edge middleware as the outer layer; the bundle is mounted inside it.
  Package-bin executable serving is dropped (the CLI/`dispatch` surface replaces it).
- Build it additively in `relating-experimental/acting`; `serve`/`routeRequest` stay as-is.

## Goal 2 — schema files are the source of truth (`schema → TypeScript → JS`)

- Author one `object.schema.json` per carrier; `$id` is the carrier's identity.
- Make `realize` a **build step**: generate carrier types from schemas; delete the hand-written interfaces.
  The schema also drives runtime validation.
- Two actions reference carriers by `$ref` in `inputSchema`/`outputSchema`; the server can match producer→consumer by `$id`.
- Instance → schema (folding witnessed values into a schema) is an on-demand tool, not the authoring path.

## Goal 3 — migration order

Rederive packages onto `relating-experimental` in dependency order: `relating-experimental → communicating → animating → gaming → managing-operations → computing → computing-with-*`.
`computing` is rederived **in place** (no `-experimental` sibling).
End state: `relating-experimental` becomes `relating`; the old deprecated `relating` and the parallel `-experimental` siblings are removed.

## First step

In `lib/relating-experimental`: author schemas for the `utterance` carrier's neighbors, wire `realize` into the build for `utterance` (delete its hand-written interface), and add a multi-package mount over `relating` + `communicating` to prove the bundle.
