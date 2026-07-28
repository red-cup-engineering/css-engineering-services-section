import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { loadExtendedJson } from "../src/extended-json.mjs";

test("append-only JSON records may derive a bounded overlay without mutating their parent", () => {
  const root = mkdtempSync(join(tmpdir(), "union-extended-json-"));
  writeFileSync(join(root, "base.json"), JSON.stringify({ id: "base", vectors: [1, 2], stable: true }));
  writeFileSync(join(root, "revision.json"), JSON.stringify({ extends: "base.json", id: "revision", residue: ["missing assertion"] }));
  assert.deepEqual(loadExtendedJson(join(root, "revision.json")), { id: "revision", vectors: [1, 2], stable: true, residue: ["missing assertion"] });
});
