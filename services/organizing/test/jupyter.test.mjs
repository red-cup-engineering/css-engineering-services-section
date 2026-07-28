import test from "node:test";
import assert from "node:assert/strict";

import {
  articulate,
  documentOfFixedPoint,
  fixedPoints,
  mark,
  posit,
  predicate,
  utterance,
} from "@red-cup-engineering/relating";
import { completeGraphWeights } from "@red-cup-engineering/relating/analysis";
import { htmlCarrierOf } from "@red-cup-engineering/relating/writing";
import {
  actions,
  jupyterDefaultViewsAction,
  jupyterRunCellsAction,
  jupyterNotebookAction,
} from "../dist/index.mjs";
import {
  ORGANIZING_JUPYTER_METADATA_KEY,
  decodeIpynb,
  encodeIpynb,
  organizingContentsModel,
  organizingIpynbCodec,
  organizingKernelModel,
  organizingKernelSpec,
  organizingNotebook,
  organizingSessionModel,
  jupyterHtmlRenderProfile,
  jupyterNotebookHtmlFiber,
  jupyterKernelSpecCarrier,
  jupyterNotebookCarrier,
} from "../dist/jupyter.mjs";

test("organizing registers Jupyter projection actions for ICK", () => {
  const verbs = actions.map((act) => act.verb);
  assert.equal(verbs.includes("jupyter-notebook"), true);
  assert.equal(verbs.includes("jupyter-run-cells"), true);
  assert.equal(verbs.includes("jupyter-default-views"), true);

  const notebook = jupyterNotebookAction.run({ id: "work:action", title: "Action Notebook" }, {});
  assert.equal(notebook.nbformat, 4);
  assert.equal(notebook.metadata[ORGANIZING_JUPYTER_METADATA_KEY].id, "work:action");

  const runNotebook = jupyterRunCellsAction.run({
    id: "work:run",
    title: "Run Notebook",
    cells: ["1 + 1"],
  }, {});
  assert.equal(runNotebook.nbformat, 4);
  assert.equal(runNotebook.cells.filter((cell) => cell.cell_type === "code").length, 1);

  const views = jupyterDefaultViewsAction.run({ instance: "fixture.organizing" }, {});
  assert.equal(views.notebooks.length, 6);
  assert.equal(views.data.length, 8);
});

test("organizing projects its own notebook carrier to nbformat 4 ipynb JSON", () => {
  const notebook = organizingNotebook({
    id: "work:demo",
    title: "Demo Work",
    summary: "A small organizing work notebook.",
    cells: [
      { kind: "markdown", source: "# Demo Work\n" },
      { kind: "code", source: "organize({ socializing: 'demo' })", executionCount: 1 },
    ],
  });

  assert.equal(notebook.nbformat, 4);
  assert.equal(notebook.nbformat_minor, 5);
  assert.equal(jupyterNotebookCarrier.validate(notebook), true);
  assert.equal(jupyterNotebookCarrier.id, "organizing/jupyter/notebook");
  assert.equal(notebook.cells.length, 2);
  assert.equal(notebook.cells[1].cell_type, "code");
  assert.deepEqual(notebook.cells[1].outputs, []);
  assert.deepEqual(notebook.metadata[ORGANIZING_JUPYTER_METADATA_KEY], {
    id: "work:demo",
    title: "Demo Work",
    renderProfile: "jupyter-html",
    summary: "A small organizing work notebook.",
  });

  const encoded = encodeIpynb(notebook);
  assert.equal(encoded, organizingIpynbCodec.encode(notebook));
  assert.deepEqual(decodeIpynb(encoded), notebook);
  assert.deepEqual(organizingIpynbCodec.decode(encoded), notebook);
});

test("organizing owns Jupyter runtime models for kernels, sessions, and contents", () => {
  const spec = organizingKernelSpec({
    argv: ["node", "kernel.mjs", "{connection_file}"],
    displayName: "Organizing JS",
    language: "typescript",
  });
  assert.equal(jupyterKernelSpecCarrier.validate(spec), true);
  assert.equal(jupyterKernelSpecCarrier.id, "organizing/jupyter/kernelspec");
  assert.deepEqual(spec.argv, ["node", "kernel.mjs", "{connection_file}"]);
  assert.equal(spec.display_name, "Organizing JS");

  const kernel = organizingKernelModel({
    id: "kernel-1",
    name: "organizing-js",
    executionState: "idle",
    connections: 2,
  });
  const session = organizingSessionModel({
    id: "session-1",
    path: "work/demo.ipynb",
    name: "Demo Work",
    kernel,
  });
  assert.equal(session.type, "notebook");
  assert.equal(session.kernel.id, "kernel-1");

  const contents = organizingContentsModel({
    name: "demo.ipynb",
    path: "work/demo.ipynb",
    type: "notebook",
    created: "2026-06-25T00:00:00.000Z",
    lastModified: "2026-06-25T00:00:00.000Z",
    content: organizingNotebook({ id: "work:demo", title: "Demo Work" }),
    format: "json",
  });
  assert.equal(contents.type, "notebook");
  assert.equal(contents.mimetype, null);
  assert.equal(contents.format, "json");
});

test("Jupyter HTML presentation is a profile fiber over relating's render machinery", () => {
  const fixed = fixedPoints(posit(predicate(articulate(utterance(mark("notebook"), mark("has-cell"))))));
  const document = documentOfFixedPoint(fixed);
  assert.equal(document.kind, "settledDocument.fixedPoint");

  const nodes = document.addresses.map((address, index) => Object.freeze({
    kind: "rendering.htmlCarrier.node",
    nodeId: `cell-${index}`,
    element: "span",
    semanticAddress: address.key,
    valuationSite: address.key,
  }));
  const carrier = htmlCarrierOf(document, nodes);
  assert.equal(carrier.kind, "rendering.htmlCarrier");

  const notebook = organizingNotebook({
    id: "work:html-fiber",
    title: "HTML Fiber",
    cells: [{ kind: "markdown", source: "# HTML Fiber\n" }],
  });
  const system = Object.freeze({
    kind: "rendering.css.system",
    carrier,
    completionRegime: "ordinal.closure.regime.finite",
    declarations: Object.freeze([
      Object.freeze({
        kind: "rendering.css.declaration",
        nodeId: nodes[0].nodeId,
        property: "font-family",
        value: "monospace",
        sourceOrder: 0,
      }),
    ]),
    classFactorMap: Object.freeze({
      kind: "rendering.css.classFactorMap",
      constraintGraph: completeGraphWeights(nodes.length),
      nodeIds: nodes.map((node) => node.nodeId),
      classes: nodes.map((_node, index) => index),
      alphabet: nodes.map((_node, index) => `jp-${index}`),
    }),
  });
  const fiber = jupyterNotebookHtmlFiber({ notebook, carrier, system, styleBehavior: "static" });

  assert.equal(jupyterHtmlRenderProfile.name, "jupyter-html");
  assert.equal(fiber.kind, "organizing.jupyter.htmlProfileFiber:witness");
  assert.equal(fiber.renderFiber.kind, "rendering.profile_forms_render_fiber:witness");
  assert.equal(notebook.metadata[ORGANIZING_JUPYTER_METADATA_KEY].renderProfile, "jupyter-html");
});

test("organizing rejects non-notebook JSON at the ipynb boundary", () => {
  assert.throws(
    () => decodeIpynb(JSON.stringify({ nbformat: 3, metadata: {}, cells: [] })),
    /ipynb:/u,
  );
  assert.throws(
    () => organizingKernelSpec({ argv: [], displayName: "Broken", language: "typescript" }),
    /organizingKernelSpec:/u,
  );
});
