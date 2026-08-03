import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  articulationCellCarrier,
  memeCarrier,
  tmCarrier,
  tyCarrier,
  utteranceCarrier,
} from "@red-cup-engineering/relating/carriers";
import { articulate, mark, utterance } from "@lenticule-science/articulating";
import { evaluateRunTerm, tm } from "@red-cup-engineering/relating";

describe("src/carriers package realization", () => {
  it("realizes pure shapes as runtime carriers with stable ids", () => {
    assert.deepEqual(
      [utteranceCarrier.id, articulationCellCarrier.id, memeCarrier.id, tyCarrier.id, tmCarrier.id],
      [
        "relating/articulating/utterance",
        "relating/articulating/articulation-cell",
        "relating/articulating/predicating/positing/meme",
        "relation-model-notation/term/ty",
        "relation-model-notation/term/tm",
      ],
    );
  });

  it("validates admitted package carriers without owning their material law", () => {
    const admitted = utterance(mark("left"), mark("right"));
    assert.equal(utteranceCarrier.validate(admitted), true);
    assert.equal(utteranceCarrier.validate({ kind: "utterance.carrier" }), false);
    assert.equal(articulationCellCarrier.validate(articulate(admitted)), true);
  });

  it("executes RMN run terms through the current evaluator", () => {
    assert.deepEqual(evaluateRunTerm(tm.lam(tm.var(0)), { value: "carried", admitted: true }), { value: "carried", admitted: true });
  });
});
