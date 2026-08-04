# Witness Projection

The running ledger surface is the package's smallest practical settling substrate:

```text
observation -> EAVT witnesses -> current state -> record/content projections
```

It is deliberately boring at the boundary.
A feed turns one observation into EAVT cells.
The store appends new cells to a JSONL witness log.
Projection folds that log into the current state view, and optional content projections cut the state into term-addressed documents.

That gives downstream code a substrate-oriented coordination pattern: write typed observations, merge by witness identity and knowledge accumulation, and derive the views needed by CLIs, sites, agents, or content tools.

The four tiers are intentionally different:

- `log`: asserted EAVT witness rows.
- `state`: the current projected read model.
- `record`: received Datoms, meaning witnessed rows plus a computed reading.
- `content`: accepted per-entity document cuts of the projected state.

## The Smallest Feed

```js
import {
  projectFeedContent,
  projectFeedState,
  witnessObservation,
} from "@emsenn/relating/running/ledger";

const feed = {
  name: "claims",
  functional: ["status"],
  cellize(observation, at) {
    return [
      {
        e: observation.claim,
        a: "status",
        v: observation.status,
        t: at,
      },
    ];
  },
};

const store = {
  logDir: ".relating/log",
  stateDir: ".relating/state",
  recordDir: ".relating/record",
  contentDir: ".relating/content",
};

witnessObservation(store, feed, { claim: "c1", status: "supported" }, "run:1");
const view = projectFeedState(store, feed);
const written = projectFeedContent(store, feed, { view });
```

The log is append-only.
`appendWitnesses` deduplicates by normalized EAVT row identity, so repeating the same observation does not grow the log.
Functional attributes use latest-witness-wins when projected into state.

## Records And Compaction

`commitRecord` is the small settlement move in this surface.
It appends Datoms to the record tier and rewrites the live log to the kept rows supplied by the caller.
The package does not decide which rows are settled, obsolete, or worth keeping; it only provides the carrier and store operation for recording that judgment.

That makes the ledger useful before there is a database, queue, or distributed consensus layer.
A package can keep a monotone witness log during live work, project a state view for tools, write content cuts for humans, and compact settled rows only when some caller has computed an explicit reading.

## What Owns Effects

The effectful boundary is `running/ledger/store`.
It imports `node:fs`, knows where tier directories live, and performs append, read, and atomic write operations.

The projection logic is otherwise ordinary data transformation:

- `Feed.cellize` maps observations to EAVT cells.
- `projectStateView` folds cells into the current entity view.
- `projectContentDocuments` renders accepted entities into documents.
- `ContentProjection.accept` is the explicit cut over the current view.

This split matters because the package wants one canonical trace field with many cheap shadows: current state, content files, audits, action witnesses, and later settled records.

## What This Is Not Yet

This is not a distributed database, queue, or consensus system.
The current Node surface is a filesystem binding plus pure projections.
It is enough to make the coordination pattern concrete: persist traces, keep contradictions visible in the substrate, and project finite views for tools that need ordinary files or JSON.

Use this surface when a downstream package needs append-only observations and derived read models.
Use [scripted invocation witnesses](scripted-invocation-witnesses.md) when the observation is an invocation of a registered carrier morphism.

For a runnable version of the same shape, see [`examples/witness-projection.mjs`](../examples/witness-projection.mjs).
