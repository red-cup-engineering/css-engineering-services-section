import assert from "node:assert/strict";
import test from "node:test";

import { deriveLessons, LessonMemory, utterEvidence } from "../dist/learning/index.mjs";

test("learning posits the articulated token as positive evidence and invents no refutation", () => {
  const source = Object.freeze({
    subject: "alpha",
    predicate: "supports",
    object: "beta",
    provenance: "receipt:alpha-supports-beta",
  });
  const articulated = utterEvidence(source);
  const readings = new LessonMemory().admit(articulated).carrier();
  const assignment = readings.knowledgeLeast.extremum.seed.valuation.fibers[0].assignments[0];

  assert.deepEqual(assignment.charge.value.map(({ name }) => name), ["present", "absent"]);
  assert.deepEqual(
    assignment.charge.evidence.map((side) => side.map((witness) => witness.value)),
    [[articulated.token.mark.value], []],
  );
  assert.deepEqual(deriveLessons([source]), [{
    subject: "alpha",
    predicate: "supports",
    object: "beta",
    value: "potential",
    provenance: ["receipt:alpha-supports-beta"],
  }]);
});
