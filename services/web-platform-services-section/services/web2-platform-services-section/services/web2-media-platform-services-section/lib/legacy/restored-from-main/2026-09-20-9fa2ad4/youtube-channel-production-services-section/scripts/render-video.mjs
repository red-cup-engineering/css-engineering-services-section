#!/usr/bin/env node
/**
 * @module render-video
 * Renders one generated script into an MP4 through
 * video-rendering-services-section's offline segmented renderer, given
 * the channel's presentation and voice parameters. `voice.narration ===
 * "cloudflare-aura-1"` synthesizes each segment through Cloudflare
 * Workers AI (`@cf/deepgram/aura-1`, env `API_KEY_CLOUDFLARE_WORKERS_AI`
 * / `CLOUDFLARE_ACCOUNT_ID`) before rendering, per-segment: a segment
 * whose call fails falls back to the renderer's own flite synthesis for
 * that segment only, never aborting the whole render. `"flite"` skips
 * synthesis entirely and lets every segment fall back to flite.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { renderNarratedVideo } from "@red-cup-engineering/video-rendering-services-section";
import { runJsonMain } from "@red-cup-engineering/javascript-file-main-guard-service";
import { validateChannelSpec } from "../src/youtube-channel-production.mjs";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";

const SUPPORTED_NARRATION = Object.freeze(["flite", "cloudflare-aura-1"]);
const CLOUDFLARE_TTS_MODEL = "@cf/deepgram/aura-1";

/** Default injected executor: spawns the renderer's declared ffmpeg/ffprobe commands. */
function spawnExecute({ program, args }) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(program, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => resolvePromise({ code: code ?? 1, stdout, stderr }));
  });
}

/**
 * Calls one Cloudflare Workers AI text-to-speech run for a single
 * segment's narration text. The REST endpoint returns either a JSON
 * envelope (`{success, result: {audio: base64}}`) or a raw audio body
 * depending on model/account configuration, so both shapes are handled.
 * @param {string} text
 * @param {{accountId: string, apiToken: string, model?: string, fetchImpl?: typeof fetch}} options
 * @returns {Promise<Buffer>} wav-encoded audio bytes
 * @throws {Error} on a non-ok response, a failure envelope, or an empty result
 */
export async function synthesizeSegmentCloudflare(text, { accountId, apiToken, model = CLOUDFLARE_TTS_MODEL, fetchImpl = fetch } = {}) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { authorization: `Bearer ${apiToken}`, "content-type": "application/json" },
    body: JSON.stringify({ text, encoding: "linear16", container: "wav" }),
  });
  if (!response.ok) throw new Error(`cloudflare workers ai tts request failed: HTTP ${response.status} ${(await response.text().catch(() => "")).slice(0, 300)}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await response.json();
    if (body.success === false) throw new Error(`cloudflare workers ai tts returned failure: ${JSON.stringify(body.errors ?? body)}`);
    const audioBase64 = body.result?.audio;
    if (!audioBase64) throw new Error("cloudflare workers ai tts JSON response carried no result.audio");
    return Buffer.from(audioBase64, "base64");
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error("cloudflare workers ai tts returned an empty audio body");
  return bytes;
}

/**
 * Synthesizes narration audio for every segment through Cloudflare
 * Workers AI, per segment: a segment whose call fails gets `null` (the
 * renderer falls back to flite for that one segment) rather than
 * aborting the whole batch.
 * @param {Array<{narration: string}>} segments
 * @param {string} audioDirectory
 * @param {{accountId?: string, apiToken?: string, fetchImpl?: typeof fetch, synthesize?: Function}} options
 * @returns {Promise<{narrationAudio: Array<string|null>, ttsFallbacks: Array<{segment: number, reason: string}>}>}
 */
export async function synthesizeSegmentsCloudflareWithFallback(segments, audioDirectory, { accountId, apiToken, fetchImpl = fetch, synthesize = synthesizeSegmentCloudflare } = {}) {
  if (!accountId || !apiToken) throw new Error("cloudflare-aura-1 narration requires CLOUDFLARE_ACCOUNT_ID and API_KEY_CLOUDFLARE_WORKERS_AI");
  await mkdir(audioDirectory, { recursive: true });
  const narrationAudio = [];
  const ttsFallbacks = [];
  for (const [index, segment] of segments.entries()) {
    try {
      const audioBytes = await synthesize(segment.narration, { accountId, apiToken, fetchImpl });
      const audioPath = join(audioDirectory, `segment-${String(index).padStart(3, "0")}-cloudflare-aura-1.wav`);
      await writeFile(audioPath, audioBytes);
      narrationAudio.push(audioPath);
    } catch (error) {
      narrationAudio.push(null);
      ttsFallbacks.push({ segment: index, reason: error.message });
    }
  }
  return { narrationAudio, ttsFallbacks };
}

/**
 * @param {{spec: object, script: {title: string, segments: Array<object>}, workDirectory: string, execute?: Function, environment?: NodeJS.ProcessEnv, fetchImpl?: typeof fetch, synthesize?: Function}} options
 * @returns {Promise<{artifactPath: string, sha256: string, byteLength: number, planDigest: string, provenanceDigest: string, ttsRoute: "cloudflare-aura-1"|"flite", ttsFallbacks: Array<{segment: number, reason: string}>}>}
 * @throws {Error} when the channel's voice.narration is not yet supported by this renderer wiring
 */
export async function renderChannelVideo({ spec, script, workDirectory, execute = spawnExecute, environment = process.env, fetchImpl = fetch, synthesize } = {}) {
  const validSpec = validateChannelSpec(spec);
  if (!SUPPORTED_NARRATION.includes(validSpec.voice.narration)) {
    throw new Error(`render-video does not yet wire narrationAudio for voice.narration=${validSpec.voice.narration}; supported: ${SUPPORTED_NARRATION.join(", ")}`);
  }
  if (!script || !Array.isArray(script.segments) || script.segments.length === 0) throw new TypeError("renderChannelVideo requires a script with a non-empty segments array");
  if (typeof workDirectory !== "string" || workDirectory.trim() === "") throw new TypeError("renderChannelVideo requires an explicit workDirectory");
  const segments = script.segments.map(({ heading, lines, narration }) => ({ heading, lines, narration }));

  let narrationAudio, ttsRoute, ttsFallbacks = [];
  if (validSpec.voice.narration === "cloudflare-aura-1") {
    ({ narrationAudio, ttsFallbacks } = await synthesizeSegmentsCloudflareWithFallback(segments, join(workDirectory, "tts"), {
      accountId: environment.CLOUDFLARE_ACCOUNT_ID, apiToken: environment.API_KEY_CLOUDFLARE_WORKERS_AI, fetchImpl, synthesize,
    }));
    ttsRoute = "cloudflare-aura-1";
  } else {
    narrationAudio = segments.map(() => null);
    ttsRoute = "flite";
  }

  const input = { title: script.title, segments, channelPresentation: validSpec.presentation, narrationAudio };
  const result = await renderNarratedVideo({ input, workDirectory, execute });
  const bytes = await readFile(result.artifactPath);
  if (bytes.byteLength < 12 || bytes.subarray(4, 8).toString("ascii") !== "ftyp") throw new Error("renderer did not produce an MP4 artifact");
  return {
    artifactPath: result.artifactPath,
    sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    byteLength: bytes.byteLength,
    planDigest: result.plan.planDigest,
    provenanceDigest: result.provenance.provenanceDigest,
    ttsRoute,
    ttsFallbacks,
  };
}


async function main({ argv }) {
  const specPath = argument("--spec", argv);
  const scriptPath = argument("--script", argv);
  const workDirectory = argument("--work-dir", argv);
  const outPath = argument("--out", argv);
  if (!specPath || !scriptPath || !workDirectory || !outPath) throw new Error("usage: render-video.mjs --spec <path> --script <path> --work-dir <dir> --out <path>");
  const spec = JSON.parse(await readFile(specPath, "utf8"));
  const script = JSON.parse(await readFile(scriptPath, "utf8"));
  const rendered = await renderChannelVideo({ spec, script, workDirectory });
  await writeFile(outPath, `${JSON.stringify(rendered, null, 2)}\n`, "utf8");
  return rendered;
}

runJsonMain(main, import.meta.url);
