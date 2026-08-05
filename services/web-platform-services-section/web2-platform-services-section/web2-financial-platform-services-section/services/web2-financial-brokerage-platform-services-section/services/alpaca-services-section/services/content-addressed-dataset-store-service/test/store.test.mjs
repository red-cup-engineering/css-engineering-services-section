import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createContentAddressedDatasetStore } from "../src/store.mjs";

test("stores deterministic RMN/CBOR once and replays exact relational data", async () => {
  const root = await mkdtemp(join(tmpdir(), "dataset-store-"));
  const store = createContentAddressedDatasetStore({ root });
  const input = { rows: [{ at: "2026-07-22T00:00:00Z", value: 1.5 }] };
  const first = await store.storeDataset({ dataset: input, observedAt: "2026-07-22T01:00:00Z", provenance: ["urn:source:test"] });
  const second = await store.storeDataset({ dataset: input, observedAt: "2026-07-22T01:00:00Z", provenance: ["urn:source:test"] });
  assert.equal(first.id, second.id);
  assert.deepEqual(await store.readDataset(first), input);
  await assert.rejects(() => store.storeDataset({ dataset: { apiSecret: "no" }, observedAt: "2026-07-22T01:00:00Z" }), /credential-bearing/);
});
