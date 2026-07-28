---
name: actions, transports, and the witness log
description: How a package operation is registered once and exposed as CLI/HTTP/OpenAPI/MCP/web, and how calls are logged. States what lib/relating-experimental does.
date: 2026-06-20
status: facts + open questions
---

# Actions, transports, and the witness log

## What lib/relating-experimental does

- An operation is registered once with `action()` (`src/acting/action.mts`): a verb, an input codec, an output codec, a `run` function, and optional `inputSchema`/`outputSchema`.
- `induceBins(actions)` (`src/acting/induce.mts`) builds one discovery carrier (the apex) for a package from its actions.
- `dispatch` (`src/acting/dispatch.mts`) runs a verb as a CLI call.
- `serve(actions,{induced})` (`src/acting/serving.mts`) serves one package over HTTP: `GET /`, `GET /:verb` (HTML form), `POST /:verb`, `GET /openapi.json`, `POST /mcp`, `GET /health`.
- CLI, HTTP, OpenAPI, MCP, and web come from the one registration; there is not a separate definition per transport.
- `dispatch` appends one EAVT row per call (`src/acting/invocation.mts`): E = caller, A = verb + args, V = return value, T = timestamp.
- Data passed between scripts is the wire; its format is chosen by argv (default `string` for articulation, `json` for composition).
  EAVT is the shape of the log, not a requirement on the wire.
- Holography projects `log → state → record → content` (`src/holography/projecting/`).
- Codecs available (`src/codecs/`): json, jsonl, eavt, datom, triple, toml, turtle, text, exact-number, schema, markdown, html, xml, svg, path, evidence, spectral.
- `realize` (JSON Schema → TS structural type) is implemented as a CLI verb.
  It is not run at build time.
- One schema file exists: `src/articulating/utterance.schema.json`.
  Carrier types (e.g. `UtteranceCarrier`) are hand-written TS interfaces, separate from schemas.

## Plan (not yet done)

- Author one `object.schema.json` per carrier; make it the source of truth.
- Run `realize` at build to generate carrier types; delete the hand-written interfaces.
  The same schema also validates the boundary input.
- Field descriptions live in the schema; behaviour descriptions live in JSDoc on the `run` morphism.

## Open questions

- Whether `realize` reads the JSON Schema document directly or the EAVT rows `unfoldJson`/`foldSchema` produce.
- Where `lib/*` invocation logs are written (those packages have no `data/` dir).
