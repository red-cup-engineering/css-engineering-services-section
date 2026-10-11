import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createContentAddressedDatasetStore } from "@red-cup-engineering/computer-content-engineering-services-section/dataset-store";
import { formPurgedWalkForwardFolds } from "@red-cup-engineering/purged-walk-forward-fold-service";

// Read the live assay as source only. Importing it would read credentials and
// start financial-account/network work; this test imports only pure providers.
test("the exported shadow assay uses declared runtime providers at their source owners", async () => {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const source = await readFile(new URL("../scripts/run-shadow-assay.mjs", import.meta.url), "utf8");
  assert.equal(typeof createContentAddressedDatasetStore, "function");
  assert.equal(typeof formPurgedWalkForwardFolds, "function");
  assert.equal(manifest.exports["./run-shadow-assay"], "./scripts/run-shadow-assay.mjs");
  assert.ok(manifest.dependencies["@red-cup-engineering/computer-content-engineering-services-section"]);
  assert.ok(manifest.dependencies["@red-cup-engineering/purged-walk-forward-fold-service"]);
  assert.equal(manifest.devDependencies["@red-cup-engineering/purged-walk-forward-fold-service"], undefined);
  assert.match(source, /from "@red-cup-engineering\/computer-content-engineering-services-section\/dataset-store"/u);
  assert.match(source, /from "@red-cup-engineering\/purged-walk-forward-fold-service"/u);
  assert.doesNotMatch(source, /@red-cup-engineering\/content-addressed-dataset-store-service|@rsc-quiescent\/(?:content-addressed-dataset-store-service|purged-walk-forward-fold-service)/u);
});
