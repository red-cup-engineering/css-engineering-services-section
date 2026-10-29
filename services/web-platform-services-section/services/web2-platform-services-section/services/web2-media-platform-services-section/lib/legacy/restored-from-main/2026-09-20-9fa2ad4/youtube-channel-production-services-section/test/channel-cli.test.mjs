import { test } from "node:test";
import assert from "node:assert/strict";
import { VERB_SCRIPTS } from "../apps/channel-cli.mjs";

test("VERB_SCRIPTS wires every curriculum-channel verb to its stage script", () => {
  assert.equal(VERB_SCRIPTS["plan-lesson"], "plan-next-lesson.mjs");
  assert.equal(VERB_SCRIPTS.observe, "observe-inventory.mjs");
  assert.equal(VERB_SCRIPTS["produce-lesson"], "run-lesson-production.mjs");
});

test("VERB_SCRIPTS still wires every literature-program verb", () => {
  for (const verb of ["plan", "acquire", "generate", "render", "thumbnail", "publish", "analytics", "receipt", "produce"]) {
    assert.equal(typeof VERB_SCRIPTS[verb], "string");
  }
});
