import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { canonical, parse as parseJson } from "@red-cup-engineering/relating/codecs/text/json";
import { parse as parseEavt, serialize as serializeEavt } from "@red-cup-engineering/relating/codecs/text/json/jsonl/eavt";
import { datom, foldObjectDatoms } from "@red-cup-engineering/relating/codecs/text/json/jsonl/eavt/datom";
import { escapeText } from "@red-cup-engineering/relating/codecs/text/xml/html";
import { svgProjector } from "@red-cup-engineering/relating/codecs/text/xml/svg";
import { fromRatio, toNumber } from "@red-cup-engineering/relating/codecs/host/javascript/numbers";
import {
  decodeLeanGoldenVectorJsonl,
  encodeLeanGoldenVectorJsonl,
} from "@red-cup-engineering/relating/codecs/text/json/jsonl/eavt/lean";

describe("nested codec boundary tree", () => {
  it("imports textual JSON and JSONL EAVT through their syntax refinement path", () => {
    assert.equal(canonical(parseJson('{"b":2,"a":1}')), '{"a":1,"b":2}');
    const rows = parseEavt('["entity","attribute","value","time"]\n');
    assert.deepEqual(rows, [{ e: "entity", a: "attribute", v: "value", t: "time" }]);
    assert.equal(serializeEavt(rows), '{"a":"attribute","e":"entity","t":"time","v":"value"}\n');
  });

  it("keeps datom specialization below the EAVT JSONL row branch", () => {
    assert.deepEqual(datom(["e", "a", "v", "t"], "read"), ["e", "a", "v", "t", "read"]);
    const section = foldObjectDatoms([
      { e: "e", a: "a", v: "v", tx: "t1", op: "assert" },
      { e: "e", a: "a", v: "v", tx: "t2", op: "retract" },
    ]);
    assert.equal(section.cells[0].value, "stable");
  });

  it("imports XML-family HTML and SVG through text/xml", () => {
    assert.equal(escapeText("<stable & active>"), "&lt;stable &amp; active&gt;");
    assert.equal(svgProjector.recognize({ path: "x.svg", content: "<svg></svg>" }), true);
  });

  it("imports host JavaScript number codecs under host/javascript/numbers", () => {
    assert.equal(toNumber(fromRatio(1, 2)), 0.5);
  });

  it("places Lean golden vectors under the EAVT JSONL branch", () => {
    const rows = decodeLeanGoldenVectorJsonl(
      '{"$schema":"relating/conformance/golden-vector","e":"lean","a":"checks","v":true,"t":"1"}\n',
    );
    assert.equal(encodeLeanGoldenVectorJsonl(rows), '{"$schema":"relating/conformance/golden-vector","e":"lean","a":"checks","v":true,"t":"1"}\n');
  });
});
