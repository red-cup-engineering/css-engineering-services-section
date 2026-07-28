import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cli = resolve(root, "dist/services/cli/main.mjs");
const http = resolve(root, "dist/services/http/main.mjs");

describe("service bin exposure", () => {
  it("binds package bins to services, not scripts", () => {
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    assert.deepEqual(pkg.bin, {
      relate: "./dist/services/cli/main.mjs",
      "relate-serve": "./dist/services/http/main.mjs",
    });
  });

  it("ships parseable service entrypoints after build", () => {
    for (const file of [cli, http]) {
      assert.equal(existsSync(file), true, `${file} missing; run pnpm build first`);
      const checked = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
      assert.equal(checked.status, 0, checked.stderr);
    }
  });

  it("CLI binds stdin and argv to package dispatch", () => {
    assert.equal(existsSync(cli), true, `${cli} missing; run pnpm build first`);
    const run = spawnSync(process.execPath, [cli, "canonicalize"], {
      input: '{"b":2,"a":1}',
      encoding: "utf8",
    });
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout.trim(), '{"a":1,"b":2}');
  });
});
