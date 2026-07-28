---
title: "Organizing default Jupyter views"
description: "Records the default data-science notebook projection shipped by lib/organizing: every organizing instance can export its RWIL ledger, MASH activity, federation H1 reports, accountable records, and package mesh into standard ipynb notebooks without a bespoke dashboard."
date: 2026-06-26
status: implementation
grounds: [organizing, jupyter, witness-ledger, data-science, default-projection]
builds-on:
  - 2026-06-25-jupyter-as-computing-in-face.md
  - 2026-06-25-jupyter-as-organizing-right-hand-standard.md
---

# Organizing default Jupyter views

`@emsenn/organizing/default-jupyter-views` is the default projection of an organizing instance into Jupyter.
It extends the existing standard rather than replacing it: the emitted documents are ordinary `.ipynb` notebooks built with `organizingNotebook` from [`lib/organizing/src/jupyter.mts`](../../../lib/organizing/src/jupyter.mts), following the notebook-as-witness-ledger brick recorded in [`2026-06-25-jupyter-as-computing-in-face.md`](2026-06-25-jupyter-as-computing-in-face.md) and the right-hand standard boundary in [`2026-06-25-jupyter-as-organizing-right-hand-standard.md`](2026-06-25-jupyter-as-organizing-right-hand-standard.md).

This is not a site dashboard.
It is an organizing-owned data export plus a standard notebook set.
Instances such as `dev.bare-cedar-fog.emsenn.net`, `ops.
561.group`, or a future deployment pass their own carriers to the package and receive the same views.

## API

The one-line consumer is:

```ts
writeOrganizingDefaultJupyterViews({
  instance: "ops.561.group",
  outDir: "public/jupyter",
  witnessLedger: { store, feeds: ["agent", "operations"] },
  sessionEvents,
  camps,
  federationReports,
  accountableTransactions,
  accountabilityReports,
  accountableClaims,
  packageMesh,
});
```

The function writes:

- `data/*.jsonl` slices for the organizing instance's carriers;
- `notebooks/*.ipynb` documents whose Python cells use `pandas`, `altair`, `plotly`, and `networkx` over those exported slices.

Core organizing does not import `@emsenn/organizing-with-jsnode`; that would point upstream at a downstream package.
Instead, the default projection accepts the package mesh shape that `organizing-with-jsnode` already exports: package rows, dependency edges, exports, bins, scripts, and test/check script names.

## Notebook Set

- `witness-ledger.ipynb` answers: what did this instance witness?
  It loads the RWIL EAVT JSONL rows as a DataFrame with `charge`, `leq_k`, `leq_t`, `truth_side`, and `falsity_side` columns.
- `package-mesh.ipynb` answers: how is the workspace package mesh shaped?
  It renders the dependency graph with `networkx` plus `plotly`, then shows per-package deps, exports, bins, scripts, and tests/checks.
- `activity-timeseries.ipynb` answers: when did sessions and ledger rows happen?
  It folds MASH session events and witness rows into an hourly activity series.
- `four-charge-bilattice.ipynb` answers: where is the instance in FOUR?
  It charts the charge distribution and the `leq_k` by `leq_t` bilattice heatmap, faceted by witness source.
- `h1-coordination-cost.ipynb` answers: where is coordination actually costly?
  It charts `federateGraded` H1 rank, affected cells, decomposition counts, and whether a Raft round was required.

## Exporters

The thin exporter added here is the normalized default-view slice: `organizingDefaultJupyterViewArtifacts(input)`.
It admits the package's existing carriers and writes only projection rows:

- witness rows from either `witnessRows` or a `WitnessStore` handle via `readWitnessLog`;
- session/MASH event rows;
- camp rows;
- H1 rows from `GradedConsensus`;
- accountable rows from transaction witnesses, accountability reports, and cockpit accountable claims;
- package/package-edge rows supplied by an instance's package mesh exporter.

No data is faked by the notebooks.
The test fixture supplies fixture carriers to prove the projection shape; a live instance supplies its own handles.
