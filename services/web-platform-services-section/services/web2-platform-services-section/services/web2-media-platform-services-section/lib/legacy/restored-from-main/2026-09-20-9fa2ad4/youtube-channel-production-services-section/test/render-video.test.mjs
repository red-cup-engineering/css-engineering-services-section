import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderChannelVideo, synthesizeSegmentCloudflare, synthesizeSegmentsCloudflareWithFallback } from "../scripts/render-video.mjs";
import { validateChannelSpec } from "../src/youtube-channel-production.mjs";

const spec = JSON.parse(await readFile(fileURLToPath(new URL("./fixtures/channel-spec.json", import.meta.url)), "utf8"));
const script = { title: "T", segments: [{ heading: "H", lines: ["line"], narration: "Narration." }] };

function fakeMp4Executor() {
  const calls = [];
  const execute = async (command) => {
    calls.push(command);
    if (command.program === "ffprobe") return { code: 0, stdout: "1.5" };
    const outputFile = command.args.at(-1);
    await writeFile(outputFile, Buffer.concat([Buffer.alloc(4), Buffer.from("ftyp"), Buffer.from("fake mp4 bytes")]));
    return { code: 0, stdout: "" };
  };
  return { execute, calls };
}

test("renderChannelVideo drives the injected executor and returns a hashed artifact", async () => {
  const workDirectory = await mkdtemp(join(tmpdir(), "render-video-test-"));
  try {
    const { execute, calls } = fakeMp4Executor();
    const result = await renderChannelVideo({ spec, script, workDirectory, execute });
    assert.match(result.sha256, /^sha256:[0-9a-f]{64}$/);
    assert.ok(result.byteLength > 0);
    assert.ok(calls.length > 0);
    assert.equal(result.ttsRoute, "flite");
    assert.deepEqual(result.ttsFallbacks, []);
  } finally {
    await rm(workDirectory, { recursive: true, force: true });
  }
});

test("validateChannelSpec refuses an unsupported narration voice (render-video's own gate depends on this enum)", () => {
  const unsupportedSpec = { ...spec, voice: { narration: "unsupported-voice" } };
  assert.throws(() => validateChannelSpec(unsupportedSpec), /voice\.narration/);
});

test("synthesizeSegmentCloudflare decodes a JSON envelope response", async () => {
  const fetchImpl = async (url, init) => {
    assert.equal(url, "https://api.cloudflare.com/client/v4/accounts/acct-1/ai/run/@cf/deepgram/aura-1");
    assert.equal(init.headers.authorization, "Bearer token-1");
    return { ok: true, headers: { get: (key) => (key === "content-type" ? "application/json" : null) }, json: async () => ({ success: true, result: { audio: Buffer.from("wav-bytes").toString("base64") } }) };
  };
  const bytes = await synthesizeSegmentCloudflare("Hello.", { accountId: "acct-1", apiToken: "token-1", fetchImpl });
  assert.equal(bytes.toString(), "wav-bytes");
});

test("synthesizeSegmentCloudflare decodes a raw audio body response", async () => {
  const fetchImpl = async () => ({ ok: true, headers: { get: () => "audio/wav" }, arrayBuffer: async () => new TextEncoder().encode("raw-wav").buffer });
  const bytes = await synthesizeSegmentCloudflare("Hello.", { accountId: "acct-1", apiToken: "token-1", fetchImpl });
  assert.equal(bytes.toString(), "raw-wav");
});

test("synthesizeSegmentCloudflare throws on a non-ok response", async () => {
  const fetchImpl = async () => ({ ok: false, status: 500, text: async () => "boom" });
  await assert.rejects(synthesizeSegmentCloudflare("Hello.", { accountId: "acct-1", apiToken: "token-1", fetchImpl }), /HTTP 500/);
});

test("synthesizeSegmentsCloudflareWithFallback writes one wav per successful segment and nulls a failed one", async () => {
  const workDirectory = await mkdtemp(join(tmpdir(), "render-video-tts-test-"));
  try {
    const segments = [{ narration: "One." }, { narration: "Two." }];
    let call = 0;
    const synthesize = async (text) => {
      call += 1;
      if (call === 2) throw new Error("provider unavailable");
      return Buffer.from(`audio-for-${text}`);
    };
    const { narrationAudio, ttsFallbacks } = await synthesizeSegmentsCloudflareWithFallback(segments, workDirectory, { accountId: "acct-1", apiToken: "token-1", synthesize });
    assert.equal(typeof narrationAudio[0], "string");
    assert.equal(narrationAudio[1], null);
    assert.equal(ttsFallbacks.length, 1);
    assert.equal(ttsFallbacks[0].segment, 1);
    assert.equal(ttsFallbacks[0].reason, "provider unavailable");
  } finally {
    await rm(workDirectory, { recursive: true, force: true });
  }
});

test("renderChannelVideo synthesizes cloudflare-aura-1 narration and reports the route", async () => {
  const workDirectory = await mkdtemp(join(tmpdir(), "render-video-cf-test-"));
  try {
    const cloudflareSpec = { ...spec, voice: { narration: "cloudflare-aura-1" } };
    const { execute } = fakeMp4Executor();
    const synthesize = async (text) => Buffer.from(`audio-for-${text}`);
    const result = await renderChannelVideo({
      spec: cloudflareSpec, script, workDirectory, execute, synthesize,
      environment: { CLOUDFLARE_ACCOUNT_ID: "acct-1", API_KEY_CLOUDFLARE_WORKERS_AI: "token-1" },
    });
    assert.equal(result.ttsRoute, "cloudflare-aura-1");
    assert.deepEqual(result.ttsFallbacks, []);
    assert.match(result.sha256, /^sha256:[0-9a-f]{64}$/);
  } finally {
    await rm(workDirectory, { recursive: true, force: true });
  }
});

test("renderChannelVideo falls back to flite for a segment whose cloudflare-aura-1 call fails", async () => {
  const workDirectory = await mkdtemp(join(tmpdir(), "render-video-cf-fallback-test-"));
  try {
    const cloudflareSpec = { ...spec, voice: { narration: "cloudflare-aura-1" } };
    const { execute } = fakeMp4Executor();
    const synthesize = async () => { throw new Error("provider unavailable"); };
    const result = await renderChannelVideo({
      spec: cloudflareSpec, script, workDirectory, execute, synthesize,
      environment: { CLOUDFLARE_ACCOUNT_ID: "acct-1", API_KEY_CLOUDFLARE_WORKERS_AI: "token-1" },
    });
    assert.equal(result.ttsRoute, "cloudflare-aura-1");
    assert.equal(result.ttsFallbacks.length, 1);
    assert.equal(result.ttsFallbacks[0].reason, "provider unavailable");
  } finally {
    await rm(workDirectory, { recursive: true, force: true });
  }
});
