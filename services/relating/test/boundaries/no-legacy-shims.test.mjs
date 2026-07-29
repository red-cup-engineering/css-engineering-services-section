import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("no compatibility ownership shims", () => {
  it("does not keep moved source files as facade surfaces", () => {
    const oldPaths = [
      "src/actions.mts",
      "src/carriers.mts",
      "src/running/codecs.mts",
      "scripts/cli.mts",
      "scripts/serve.mts",
      "src/writing/eavt.mts",
      "src/writing/datom.mts",
      "src/writing/triple.mts",
      "src/writing/json.mts",
      "src/writing/html.mts",
      "src/writing/exact-number.mts",
      "src/writing/lean/index.mts",
      "src/writing/xml/index.mts",
      "src/writing/xml/svg/index.mts",
      "src/writing/xml/svg/radial/index.mts",
      "src/codecs/eavt.mts",
      "src/codecs/datom.mts",
      "src/codecs/triple.mts",
      "src/codecs/wire.mts",
    ];
    assert.deepEqual(oldPaths.filter((path) => existsSync(resolve(root, path))), []);
  });

  it("publishes the nested codec tree without flat package shims", async () => {
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    for (const subpath of [
      "./carriers",
      "./actions",
      "./codecs",
      "./codecs/text",
      "./carriers/codecs/text/json/jsonl/eavt/lean/serialization",
      "./codecs/text/xml/svg",
      "./codecs/boundary/wire",
    ]) {
      assert.ok(pkg.exports[subpath], `${subpath} must be an explicit export`);
    }
    assert.equal(pkg.exports["./running/codecs"], undefined);
    assert.equal(pkg.exports["./codecs/wire"], undefined);
    assert.equal(pkg.exports["./codecs/eavt"], undefined);
    assert.equal(pkg.exports["./codecs/text/json"], undefined);
    assert.equal(pkg.exports["./codecs/text/json/jsonl/eavt"], undefined);
    assert.equal(pkg.exports["./codecs/text/xml/html"], undefined);
    assert.equal(pkg.exports["./writing/lean"], undefined);

    const running = await import("@red-cup-engineering/relating/running");
    for (const name of ["wireCodec", "wireOf", "WIRE_CODEC_NAMES", "rmnCodec"]) {
      assert.equal(Object.hasOwn(running, name), false, `running must not own ${name}`);
    }

    const codecs = await import("@red-cup-engineering/relating/codecs");
    assert.equal(typeof codecs.boundary.wire.wireCodec, "function");
    assert.equal(Object.hasOwn(codecs, "wireCodec"), false);

    const writing = await import("@red-cup-engineering/relating/writing");
    for (const name of ["canonical", "parseJson", "eavtProjector", "datom", "triple", "projectRadial", "svgProjector"]) {
      assert.equal(Object.hasOwn(writing, name), false, `writing must not re-export ${name}`);
    }
  });
});
