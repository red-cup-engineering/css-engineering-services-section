# Scripted Invocation Witnesses

Scripted invocation witnesses are the action-boundary trace for `@emsenn/relating`.

When an action runs through `dispatch`, `dispatchAsync`, an HTTP POST, MCP tool call, or form route with `dataRoot` configured, the package appends one EAVT row to a dated invocation log:

```text
E = caller descriptor
A = verb + args + morphism carrier
V = returned value
T = witness timestamp
```

That row is not a debug log bolted onto the side.
It is the package's smallest runtime witness that "this carrier morphism was played at this boundary by this caller and produced this value."

## What Is Witnessed

The witnessed path is the scripted boundary:

- `dispatch(...)
  `
- `dispatchAsync(...)
  `
- `routeRequest(...)
  ` and `routeRequestAsync(...)
  ` for POST routes
- MCP tool calls and generated form routes, because they route through dispatch
- live `services/http/server` bindings
  ` when given `dataRoot`

A direct in-process `action.run(input, args)` is not witnessed.
It is just a local call.
That distinction matters: invocation witnesses describe boundary plays, not every possible use of the JavaScript value.

## Store Shape

`invocationStore(root, namespace, at)` derives the dated store:

```text
<root>/data/log/YYYY/MM/DD/YYYY-MM-DD-<namespace>-log.jsonl
<root>/data/state/YYYY/MM/DD/
<root>/data/record/YYYY/MM/DD/
```

The invocation writer appends the log form.
State and record are the corresponding dated form roots used when a projection is committed.
The log feed name is the date plus a filesystem-safe namespace slug plus `-log`.
For example, namespace `example/scripted-invocation-witnesses` at `2026-06-25T12:34:56.000Z` writes:

```text
data/log/2026/06/25/2026-06-25-example-scripted-invocation-witnesses-log.jsonl
```

The row's `a.action` is the serializable morphism carrier when the action has one.
For IR-backed actions this includes `runTerm`, so the witness records the typed body shape rather than only the verb string.

## Reading It Back

`projectInvocations(store, feed)` folds the current invocation log into the same state-view projection used by the ledger surface.
The live HTTP projection also uses the same log: `GET /feed` streams rows as resumable SSE `datom` events when the server has a `dataRoot`.

This gives a downstream package a boring but powerful runtime loop:

1. register carrier morphisms once;
2. run them through a projected boundary;
3. leave one append-only EAVT trace per successful play;
4. read the trace back as state, records, content, or event stream.

## Boundaries

This is not a database, queue, or consensus protocol.
The filesystem store is a small append-only Node binding with dedupe and projection helpers.
Witnessing is best-effort and must not change an action's output.
Failed dispatches return their error without writing an invocation row.

Use this surface when the observation is an invocation of a registered action.
Use the lower-level witness-ledger surface when the observation is some other domain event.

## Public Handles

- `dispatch`, `dispatchAsync`
- `witnessInvocation`
- `invocationStore`
- `invocationFeed`
- `projectInvocations`
- `routeRequest`, `routeRequestAsync`
- `services/http/server` exports `serve`, `serveAsync`, `serveManifold`, `serveManifoldAsync`
- `streamWitnessLog`, `feedResponse`, `EAVT_EVENT`

## Verification

The runnable example is [`examples/scripted-invocation-witnesses.mjs`](../examples/scripted-invocation-witnesses.mjs).
It asserts that direct `action.run` writes no log, then dispatches the same IR-backed action with `dataRoot` and reads the single EAVT row back.

The focused test coverage is in `test/acting.test.mjs` and `test/serve-transports.test.mjs`.
