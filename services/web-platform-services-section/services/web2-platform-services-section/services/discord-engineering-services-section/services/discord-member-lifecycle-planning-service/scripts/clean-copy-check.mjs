import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url)));
assert.equal("private" in manifest, false);
assert.equal(manifest.exports["."].import, "./src/index.mjs");
console.log("clean-copy layout verified");
