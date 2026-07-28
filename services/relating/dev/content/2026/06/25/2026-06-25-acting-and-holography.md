# ADR: Acting, Running, And Holography

## Status

Accepted for the current source layout.
This supersedes the earlier reading of the implementation home as `src/holography/acting`.

## Context

The public `@emsenn/relating/running` surface owns actions, dispatch, induced bins, HTTP, OpenAPI, MCP, browser forms, carrier-node mounting, serving, and invocation witnessing.
The older `@emsenn/relating/acting` handle remains wired to that same boundary.

The `writing/projector` surface owns projection lattices: resources are recognized, read, and written as carried types.
The `running/ledger` surface projects witness logs into state, records, and content.

The formal question was whether the action machinery formerly under `src/acting/` is actually a holographic projection layer.
An induced action apex is a single mathematical object whose faces are CLI, HTTP, OpenAPI, MCP, form HTML, carrier nodes, and witness feeds.
That sounds holographic: each face is a projection of the same carrier/morphism registry.

The current source tree does not take that step by placing the process loop under `holography`.
It splits the concern instead: process-facing execution lives under `src/running/`, witness projections live under `src/running/ledger/`, and the generic projector lattice lives under `src/writing/projector.mts`.

## Decision Pressure

There are two true statements in tension:

- Running is the current source and canonical public boundary vocabulary.
  Downstream packages may still import `@emsenn/relating/acting`, and the root export re-exports `action`, `dispatch`, `serve`, and `induceBins`.
- Holography is the better formal home for "one object, many faithful projections" when the object is read as mathematics rather than as transport.

## Decision

Treat `@emsenn/relating/running` as the operational boundary facade and `src/running/` as its implementation home.
The action family is still read formally as one apex with many projections, but the user-facing process loop is not itself the generic holography kernel.

Current rules:

1. Prefer `@emsenn/relating/running` as the operational import.
2. Do not introduce a second public alias such as `@emsenn/relating/holography/acting`; that would create another user handle for one surface.
3. Keep projection constructors and host bindings together in `src/running/` while the public surface is one action apex.
4. Preserve root re-exports of `action`, `dispatch`, `serve`, and `induceBins` until the normative user surface is changed deliberately.
5. When splitting further, use the formal criterion: pure projection constructors may move toward `writing/projector` or a more specific projection module; process loops remain the boundary users run.

## Formal Reading

An `Action` is a morphism carrier with optional executable realization.
An `InducedBins` value is the apex formed from a finite action family.
CLI, HTTP, OpenAPI, MCP, HTML, and witness feeds are projections of that apex into boundary representations.

Under that reading, "acting" was not wrong, but "running" is the better current Node handle.
It names what operators do at the boundary while leaving holography/projector language for the representation-theoretic part.

## Consequences

- No immediate breaking import changes: public `/acting` remains exported to the same boundary, while `/running` is the canonical handle.
- TypeDoc and source navigation now show `src/running/` as the implementation home.
- Documentation can teach acting as projection, not as ad hoc transport glue.
- Future moves can be reviewed file by file against the formal criterion above.
