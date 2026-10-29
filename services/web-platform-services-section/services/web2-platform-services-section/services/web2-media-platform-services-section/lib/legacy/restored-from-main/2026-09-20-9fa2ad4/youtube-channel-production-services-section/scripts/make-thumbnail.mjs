#!/usr/bin/env node
/**
 * @module make-thumbnail
 * Produces one channel-branded PNG thumbnail: tries
 * image-generation-inference-team's provider-fallback text-free
 * generator first, and when every provider fails (no keys configured,
 * or all requests refused) falls back to a deterministic solid-color
 * branded PNG so production is never blocked on a thumbnail.
 */
import { createHash } from "node:crypto";
import { writeFile, readFile } from "node:fs/promises";
import { generateImageWithFallback } from "@red-cup-engineering/image-generation-inference-team";
import { runJsonMain } from "@red-cup-engineering/javascript-file-main-guard-service";
import { validateChannelSpec } from "../src/youtube-channel-production.mjs";
import { buildThumbnailPrompt, encodeSolidBrandedPng, parseAssColor, parseFfmpegColor } from "../src/deterministic-thumbnail.mjs";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";

/**
 * @param {{spec: object, script: {title: string}, generate?: Function}} options
 * @returns {Promise<{buffer: Buffer, provider: string, sha256: string, byteLength: number}>}
 */
export async function makeChannelThumbnail({ spec, script, generate = generateImageWithFallback } = {}) {
  const validSpec = validateChannelSpec(spec);
  if (!script || typeof script.title !== "string") throw new TypeError("makeChannelThumbnail requires a script with a title");
  const prompt = buildThumbnailPrompt(validSpec, script);
  let buffer, provider;
  try {
    const generated = await generate(prompt);
    buffer = generated.buffer;
    provider = generated.provider;
  } catch {
    buffer = encodeSolidBrandedPng({
      width: validSpec.presentation.width,
      height: validSpec.presentation.height,
      background: parseFfmpegColor(validSpec.presentation.backgroundColor),
      foreground: parseAssColor(validSpec.presentation.foregroundColor),
    });
    provider = "deterministic-solid-branded-fallback";
  }
  return { buffer, provider, sha256: `sha256:${createHash("sha256").update(buffer).digest("hex")}`, byteLength: buffer.byteLength };
}


async function main({ argv }) {
  const specPath = argument("--spec", argv);
  const scriptPath = argument("--script", argv);
  const outPath = argument("--out", argv);
  if (!specPath || !scriptPath || !outPath) throw new Error("usage: make-thumbnail.mjs --spec <path> --script <path> --out <path.png>");
  const spec = JSON.parse(await readFile(specPath, "utf8"));
  const script = JSON.parse(await readFile(scriptPath, "utf8"));
  const thumbnail = await makeChannelThumbnail({ spec, script });
  await writeFile(outPath, thumbnail.buffer);
  return { provider: thumbnail.provider, sha256: thumbnail.sha256, byteLength: thumbnail.byteLength, outPath };
}

runJsonMain(main, import.meta.url);
