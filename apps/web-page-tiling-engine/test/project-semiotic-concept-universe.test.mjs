import assert from "node:assert/strict";
import test from "node:test";
import { createSemioticConceptUniverse } from "@red-cup-engineering/signcell/semiotic-concept-universe";
import { createSemioticConceptUniverseProjector, renderSemioticConceptUniverseSingleHtml } from "../src/publication/project-semiotic-concept-universe.mjs";

test("a universe contributes durable TUFTE index and concept HTML", () => {
  const universe = createSemioticConceptUniverse({ concepts: [{ id: "alpha", title: "Alpha & <one>", body: "Alpha *body*.", tags: [], sameAs: [], publication: { channels: ["public"] }, annotations: [{ kind: "reference", target: "missing" }] }] }).value;
  const projection = createSemioticConceptUniverseProjector({ universe, channels: ["public"] }).project();
  const page = projection.artifacts.find(({ path }) => path === "semiotic-concepts/alpha.html").body;
  assert.match(page, /Alpha &amp; &lt;one&gt;/u);
  assert.match(page, /<em>body<\/em>/u);
  assert.match(renderSemioticConceptUniverseSingleHtml(universe), /Semiotic concept universe/u);
});

test("a publisher may refuse unresolved concept references", () => {
  const universe = createSemioticConceptUniverse({ concepts: [{ id: "alpha", title: "Alpha", body: "Body.", tags: [], sameAs: [], annotations: [{ kind: "reference", target: "missing" }] }] }).value;
  const projection = createSemioticConceptUniverseProjector({ universe, unresolvedReferences: "refuse" }).project();
  assert.deepEqual(projection.diagnostics.map(({ code, subject }) => ({ code, subject })), [{ code: "SCU-unresolved-reference", subject: "alpha" }]);
});
