import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WIRE_CODEC_NAMES, rmnCodec, wireByMediaType, wireCodec, wireOf } from "@red-cup-engineering/relating/codecs/boundary/wire";
import * as codecs from "@red-cup-engineering/relating/codecs";

describe("src/codecs boundary wire realization", () => {
  it("owns the finite wire vocabulary at the boundary/wire leaf", () => {
    assert.deepEqual(WIRE_CODEC_NAMES, ["eavt", "form", "json", "mermaid", "plantuml", "rmn", "string", "svg", "xmi"]);
    assert.equal(codecs.boundary.wire.wireCodec, wireCodec);
    assert.equal(Object.hasOwn(codecs, "wireCodec"), false);
    assert.equal(wireCodec("json").mediaType.split(";")[0], "application/json");
    assert.equal(wireCodec("rmn").mediaType.split(";")[0], "application/rmn+json");
    assert.equal(wireByMediaType("application/rmn+json"), rmnCodec);
  });

  it("round-trips admitted JSON and RMN wires canonically", () => {
    const json = wireCodec("json");
    assert.equal(json.encode(json.decode('{"b":2,"a":1}')).trim(), '{"a":1,"b":2}');
    const term = ["pair", ["star"], ["star"]];
    assert.deepEqual(rmnCodec.decode(rmnCodec.encode(term)), term);
  });

  it("refuses to turn undecidable projection readings into wires", () => {
    const projector = {
      type: "bad",
      corner: "data",
      rung: "turing",
      recognize: () => true,
      read: () => [],
      write: () => "",
    };
    assert.throws(() => wireOf(projector), /not decidable/);
  });
});
