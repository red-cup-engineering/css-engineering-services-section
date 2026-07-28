---
title: "Jupyter as the computing IN-face: the notebook is a witness ledger"
description: "First green brick of the Jupyter projection onto organizing's shared-compute (computing) IN face. The kernel is the OFFICE OF EXECUTION; an execute_request → execute_reply settles one unit of work and broadcasts iopub outputs; and the load-bearing insight is realized as code — a NOTEBOOK projected AS a witness ledger (cells = the append-only log, outputs = records), with the log ⇄ records projection round-tripping. Parallel to the WMAP/Matrix codecs: the wire is a projection of the faculty's math, not designed onto it."
date: 2026-06-25
status: design
grounds: [organizing, computing, jupyter, witness-ledger, standards-conformance]
builds-on:
  - 2026-06-25-protocols-as-faculty-projections.md
  - 2026-06-25-wmap-web-modeled-agency-protocol.md
  - 2026-06-25-jupyter-as-organizing-right-hand-standard.md
---

# Jupyter as the computing IN-face: the notebook is a witness ledger

## The joint

The standards map (`protocols-as-faculty-projections.md`) places **Jupyter** on the `computing` **IN** face at scale-2 (shared compute) — the interior of the collective.
The math joint, stated there and realized here:

- **kernel = the OFFICE OF EXECUTION** — a stateful, occupiable locus that runs work;
- **session = active work** — a kernel bound to a workspace path;
- **notebook = the witness ledger** — *cells are the append-only log, kernel state is state, outputs are records, and the rendered `.ipynb` is content*;
- **iopub broadcast = `broadcast`** — what the office publishes while it executes.

This is the same thesis WMAP proved for ActivityPub and the Matrix codec proved for state-resolution: a well-built protocol is **discovered to already be the wire-projection of a faculty's settled math**, not bolted on.
Jupyter's request/reply/iopub split is the office settling a unit of work and broadcasting what it witnessed.

## The brick

`lib/organizing/src/writing/jupyter/index.mts` — additive, alongside the existing seed `lib/organizing/src/jupyter.mts` (notebooks→work records, kernels→offices), whose carriers it **reuses verbatim** (`JupyterOutput`, `JupyterNotebook`, `JupyterCell`, `jupyterNotebookCarrier`, `organizingNotebook`).
No second ontology.

Two things landed:

1. **Kernel messaging carriers** (single-source via relating's `carrier()`, bare
   descent-path `$id`):
   - `execute_request` — `code` is the SAME `source` a code cell holds (a view of the
     notebook carrier);
   - `iopub` — a `status` (busy/idle = office occupied/free) or an output
     (stream/execute_result/display_data) carrying a `JupyterOutput` **verbatim**;
   - `execute_reply` — the office's settlement: `status` (ok/error/abort, the FOUR-shaped
     outcome), the monotone `executionCount` (the cell's `execution_count`), and the
     `outputs` its iopub broadcast emitted.
   - `execute(request, count, handler)` runs the office for one request: occupy (busy) →
     handler → broadcast outputs → idle, returning `{ reply, iopub }`. A `silent` request
     executes but witnesses nothing publicly (empty iopub).

2. **The notebook AS a witness ledger** (the load-bearing claim, mirroring animating's
   RWIL `ledger.mts` functor pair):
   - `runCells(sources, …)` drives a sequence through the office, accumulating a notebook
     whose **code cells ARE the append-only log** (monotone counts, each cell carrying the
     outputs its broadcast emitted);
   - `cellsToRecords` (**F**) projects the notebook's log → the RECORD tier (one record per
     executed code cell; markdown/raw cells are content, not log, so they are dropped);
   - `recordsToCells` (**G**) / `notebookFromRecords` re-emit the records as the log.
   - **`G ∘ F = id` on the code-cell log, and `F ∘ G = id` at the record tier** — the
     witness-ledger isomorphism (the notebook IS its records, viewed as a literate
     document).

## What's green

`pnpm --filter @emsenn/organizing run check` and `run build` clean; the new `test/jupyter-messaging.test.mjs` is **7/7**, and the whole organizing suite is **57/57**.
The tests pin: an `execute_request` is a view of a cell's source; `execute` settles a reply **and** broadcasts iopub (busy → output → idle); a silent request broadcasts nothing; an error handler settles `status: "error"`; `runCells` produces a notebook whose code cells are the append-only log; the **log ⇄ records projection round-trips**; and a stream output flows through the same reply/ledger path.

## The frontier

- **The kernel as a real office (capability-secured).** `execute` takes a pure `KernelHandler`; the office-of-execution claim is currently structural (busy/idle occupancy, monotone count) rather than gated by animating's `grant`/`canInvoke`.
  The principled next move: a request must name a move the holder holds (authority by *move*, as WMAP's capability layer), so a kernel session is an attenuated capability, not an ambient server.
  This is the OUT-face (`gaming`/`playing`) supplying the gate the IN-face consumes — exactly how WMAP's capability codec works.
- **iopub = `socializing.broadcast` literally.** The map names iopub as `broadcast`; here it is modeled as the office's message list.
  Wiring it to socializing's actual `broadcast` (cross-stalk linear transmission) would make the iopub channel a true scale-2 broadcast over the camp, not a per-call return value.
- **Server REST + Lab.** Kernel/session/contents REST (jupyter.mts already has the models) and a JupyterLab-facing instance for `dev.bare-cedar-fog.emsenn.net` are deferred, per the right-hand note's step ordering (carrier law first, mount later via relating's web stack).

## Provenance

The joint is the operator's standards map; the witness-ledger functor pattern is lifted directly from animating's RWIL `ledger.mts` (`activityCell`/`activityFromCell`).
The brick is realized and green against organizing's own carriers — a checkable claim, not an analogy.
The capability-gating and broadcast-wiring frontiers are recorded honestly as unbuilt.

## Cross-links

- [`2026-06-25-protocols-as-faculty-projections.md`](2026-06-25-protocols-as-faculty-projections.md) — the standards map (Jupyter row)
- [`2026-06-25-jupyter-as-organizing-right-hand-standard.md`](2026-06-25-jupyter-as-organizing-right-hand-standard.md) — the seed/handedness note
- [`2026-06-25-wmap-web-modeled-agency-protocol.md`](2026-06-25-wmap-web-modeled-agency-protocol.md) — the realized exemplar (the ledger functor lives in its `ledger.mts`)
- [`2026-06-25-matrix-as-socializing.md`](2026-06-25-matrix-as-socializing.md) — the across-face sibling brick
