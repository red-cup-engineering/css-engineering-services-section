import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
describe("service bin exposure", () => {
  it("does not publish the retired package-owned CLI or socket binders", () => {
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    assert.equal(pkg.bin, undefined);
    assert.equal(existsSync(resolve(root, "dist/services/cli/main.mjs")), false);
    assert.equal(existsSync(resolve(root, "dist/services/http/main.mjs")), false);
  });
});
