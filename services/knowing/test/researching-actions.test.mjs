import { test } from "node:test";
import assert from "node:assert/strict";

import { admitDocument, curriculumAction, learningAction, researchAction } from "../dist/index.mjs";

const document = (path, title) => admitDocument("test", Object.freeze({
  path,
  content: `---\ntitle: ${title}\ngenre: research\n---\n${title}\n\nSeeded memory.\n`,
}));

const memory = Object.freeze({
  kind: "knowing.memory",
  root: "test",
  documents: Object.freeze([
    document("research/alpha.md", "Alpha"),
    document("research/beta.md", "Beta"),
  ]),
  utterances: Object.freeze([]),
});

test("researchAction projects MemoryCarrier through research into a certified settled research wire", () => {
  const projection = researchAction.run(memory, {});

  assert.equal(projection.kind, "knowing.research.settled");
  assert.equal(typeof projection.regime, "string");
  assert.equal(typeof projection.certified, "boolean");
  assert.equal(projection.certified, projection.onShell);
  assert.ok(projection.stages > 0);
});

test("learning and curriculum actions are induced from the same memory research spine", () => {
  const projectedLearning = learningAction.run(memory, {});
  assert.equal(projectedLearning.kind, "knowing.wire.learning");
  assert.ok(Number.isInteger(projectedLearning.lessons));
  assert.ok(Array.isArray(projectedLearning.sample));

  const curriculum = curriculumAction.run(memory, {});
  assert.equal(curriculum.kind, "knowing.curriculum");
  assert.ok(Number.isInteger(curriculum.lessons));
  assert.ok(Array.isArray(curriculum.sequence));
});
