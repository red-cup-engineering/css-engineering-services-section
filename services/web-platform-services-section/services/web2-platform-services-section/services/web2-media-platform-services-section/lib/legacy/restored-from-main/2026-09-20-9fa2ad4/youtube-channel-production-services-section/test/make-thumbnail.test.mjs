import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { makeChannelThumbnail } from "../scripts/make-thumbnail.mjs";

const spec = JSON.parse(await readFile(fileURLToPath(new URL("./fixtures/channel-spec.json", import.meta.url)), "utf8"));
const script = { title: "Fixture Topic" };

test("makeChannelThumbnail uses the generative provider when it succeeds", async () => {
  const generate = async (prompt) => {
    assert.match(prompt, /no text/i);
    return { buffer: Buffer.from([1, 2, 3]), provider: "fake-provider" };
  };
  const thumbnail = await makeChannelThumbnail({ spec, script, generate });
  assert.equal(thumbnail.provider, "fake-provider");
  assert.equal(thumbnail.byteLength, 3);
});

test("makeChannelThumbnail falls back to a deterministic text-free PNG when every provider fails", async () => {
  const generate = async () => { throw new Error("all image providers failed"); };
  const thumbnail = await makeChannelThumbnail({ spec, script, generate });
  assert.equal(thumbnail.provider, "deterministic-solid-branded-fallback");
  assert.deepEqual([...thumbnail.buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(thumbnail.sha256.startsWith("sha256:"), true);
});
