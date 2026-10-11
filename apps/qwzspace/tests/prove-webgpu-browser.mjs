// prove-webgpu-browser — the WebGPU rung in a real browser. The island demo is drawn once through
// WebGPU and once through WebGL2 (`webgl=1`), at the same moment from the same frame, and the two
// must be the same picture: WebGPU is not blank, is not a different scene, and differs from WebGL2
// only by rounding of the shading. Where the browser exposes no WebGPU adapter the proof says so and
// passes nothing it did not check (the selector proofs are headless). Screenshots land in
// $QWZSPACE_SHOTS (or the system temp directory).

import { test } from "node:test";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { chromium } from "playwright";
import { ok, done } from "./_harness.mjs";
import { startIslandDemo } from "../examples/island/server.mjs";

// Chromium's headless shell can present a WebGPU canvas only over a Vulkan-backed shared image: on
// the plain SwiftShader GL path the GPU process refuses the swap-chain image and destroys the device.
const BROWSER_ARGS = ["--enable-unsafe-webgpu", "--enable-unsafe-swiftshader", "--use-angle=vulkan", "--use-vulkan=swiftshader", "--enable-features=Vulkan", "--ignore-gpu-blocklist"];
const SHOTS = process.env.QWZSPACE_SHOTS ?? path.join(tmpdir(), "qwzspace-island");

// RGBA pixels of an 8-bit RGB(A) PNG, enough for Chromium's screenshots.
function decodePng(png) {
  let offset = 8, width = 0, height = 0, channels = 4;
  const data = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset), type = png.toString("ascii", offset + 4, offset + 8);
    const body = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      channels = body[9] === 6 ? 4 : 3;
    } else if (type === "IDAT") data.push(body);
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * channels, pixels = new Uint8Array(width * height * channels);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const at = y * stride + x, value = raw[y * (stride + 1) + 1 + x];
      const a = x >= channels ? pixels[at - channels] : 0, b = y > 0 ? pixels[at - stride] : 0, c = x >= channels && y > 0 ? pixels[at - stride - channels] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const predicted = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter];
      pixels[at] = (value + predicted) & 0xff;
    }
  }
  return { width, height, channels, pixels };
}

function look(png) {
  const { pixels, channels } = decodePng(png);
  let sum = 0, sumSquares = 0, count = 0;
  for (let k = 0; k < pixels.length; k += channels) {
    const luma = 0.2126 * pixels[k] + 0.7152 * pixels[k + 1] + 0.0722 * pixels[k + 2];
    sum += luma;
    sumSquares += luma * luma;
    count++;
  }
  const mean = sum / count;
  return { mean, spread: Math.sqrt(sumSquares / count - mean * mean), pixels };
}

const difference = (left, right) => {
  let total = 0;
  for (let k = 0; k < left.pixels.length; k++) total += Math.abs(left.pixels[k] - right.pixels[k]);
  return total / left.pixels.length;
};

test("prove-webgpu-browser", async () => {
  await mkdir(SHOTS, { recursive: true });
  const demo = await startIslandDemo();
  const browser = await chromium.launch({ args: BROWSER_ARGS });
  try {
    async function open(name, query) {
      const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
      await page.goto(`${demo.url}?${query}`);
      await page.waitForFunction(() => globalThis.island?.ready || globalThis.island?.error, null, { timeout: 90000 });
      const status = await page.evaluate(() => globalThis.island);
      ok(status.error === null, `${name}: the page drew without error${status.error ? `: ${status.error}` : ""}`);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
      const png = await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
      const drawing = [...errors];
      await page.close();
      ok(drawing.length === 0, `${name}: no page errors${drawing.length ? `: ${drawing.join("; ")}` : ""}`);
      return { status, ...look(png) };
    }

    const probe = await browser.newPage();
    await probe.goto(demo.url);
    const adapter = await probe.evaluate(async () => (navigator.gpu ? (await navigator.gpu.requestAdapter()) !== null : false));
    await probe.close();
    if (!adapter) {
      console.log("  - this browser exposes no WebGPU adapter: the WebGPU frame was NOT drawn or checked");
      return;
    }
    for (const view of ["overview", "chase"]) {
      for (const [time, weather] of [[9, "clear"], [21, "clear"], [9, "storm"]]) {
        const tag = `${view}-${time}-${weather}`;
        const gpu = await open(`webgpu-${tag}`, `time=${time}&weather=${weather}&view=${view}`);
        const gl = await open(`webgl2-${tag}`, `time=${time}&weather=${weather}&view=${view}&webgl=1`);
        ok(gpu.status.graphics === "webgpu", `${tag}: the tier drew with WebGPU`);
        ok(gl.status.graphics === "webgl2", `${tag}: the control drew with WebGL2`);
        ok(gpu.status.terrain, `${tag}: the terrain was built`);
        ok(gpu.spread > 12, `${tag}: the WebGPU frame is a picture, not a blank (spread ${gpu.spread.toFixed(1)})`);
        ok(Math.abs(gpu.mean - gl.mean) < 6, `${tag}: WebGPU is as bright as WebGL2 (${gpu.mean.toFixed(1)} vs ${gl.mean.toFixed(1)})`);
        const apart = difference(gpu, gl);
        ok(apart < 10, `${tag}: WebGPU and WebGL2 draw the same picture (mean channel difference ${apart.toFixed(2)})`);
      }
    }
    console.log(`  screenshots: ${SHOTS}`);
  } finally {
    await browser.close();
    await demo.close();
  }
  done("prove-webgpu-browser");
});
