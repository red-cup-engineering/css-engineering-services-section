// prove-webgl-browser — the webgl tier in a real browser. The island demo is served, Chromium opens
// it, and the tier must draw: with WebGPU when the browser offers it, and with WebGL2 when it does
// not (the page is opened once with `navigator.gpu` taken away). The demo is then drawn at four
// moments — clear day, dusk, night and storm — and each must look like itself: night darker than
// day, the storm unlike the clear day, high water unlike low. Screenshots land in
// $QWZSPACE_SHOTS (or the system temp directory) for a person to look at.

import { test } from "node:test";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { chromium } from "playwright";
import { ok, eq, done } from "./_harness.mjs";
import { startIslandDemo } from "../examples/island/server.mjs";

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

test("prove-webgl-browser", async () => {
  await mkdir(SHOTS, { recursive: true });
  const demo = await startIslandDemo();
  const browser = await chromium.launch({ args: ["--enable-unsafe-webgpu", "--enable-unsafe-swiftshader", "--use-angle=vulkan", "--use-vulkan=swiftshader", "--enable-features=Vulkan", "--ignore-gpu-blocklist"] });
  try {
    async function open(name, query, { withoutWebGPU = false } = {}) {
      const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
      if (withoutWebGPU) await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "gpu", { get: () => undefined, configurable: true }));
      await page.goto(`${demo.url}?${query}`);
      await page.waitForFunction(() => globalThis.island?.ready || globalThis.island?.error, null, { timeout: 90000 });
      const status = await page.evaluate(() => globalThis.island);
      ok(status.error === null, `${name}: the page drew without error${status.error ? `: ${status.error}` : ""}`);
      // Let a few frames land, then look.
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
      const png = await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
      // Errors while drawing count; a device lost as the page closes under a running frame does not.
      const drawing = [...errors];
      await page.close();
      ok(drawing.length === 0, `${name}: no page errors${drawing.length ? `: ${drawing.join("; ")}` : ""}`);
      return { status, ...look(png) };
    }

    // (c2) a browser without WebGPU draws through WebGL2.
    const fallback = await open("no-webgpu", "time=9&view=overview", { withoutWebGPU: true });
    eq(fallback.status.graphics, "webgl2", "without WebGPU the tier draws with WebGL2");
    ok(fallback.status.terrain, "the terrain resolved by its content address and was built");
    ok(fallback.spread > 12, `the WebGL2 frame is a picture, not a blank (spread ${fallback.spread.toFixed(1)})`);
    ok(fallback.status.lines[0] === "The Quay" && fallback.status.lines.some((line) => line.startsWith("Exits:")), "the text tier beside it says the room and its exits");

    const native = await open("browser-default", "time=9&view=overview");
    ok(["webgpu", "webgl2"].includes(native.status.graphics), `the browser's own choice draws (${native.status.graphics})`);
    ok(native.spread > 12, "and draws a picture");

    // (c3) terrain, tide, day and night, and weather each show.
    const day = await open("day-clear", "time=9&weather=clear&view=overview&webgl=1");
    const dusk = await open("dusk-clear", "time=17.6&weather=clear&view=overview&webgl=1");
    const night = await open("night-clear", "time=21&weather=clear&view=overview&webgl=1");
    const storm = await open("day-storm", "time=9&weather=storm&view=overview&webgl=1");
    // 4 and 52 share the sun (two days apart) but not the tide: low water, then high.
    const low = await open("low-water", "time=4&weather=clear&view=chase&webgl=1");
    const high = await open("high-water", "time=52&weather=clear&view=chase&webgl=1");
    ok(day.mean > night.mean + 30, `night is darker than day (${day.mean.toFixed(0)} vs ${night.mean.toFixed(0)})`);
    ok(dusk.mean < day.mean && dusk.mean > night.mean, `dusk falls between day and night (${dusk.mean.toFixed(0)})`);
    ok(difference(day, storm) > 8, `a storm does not look like a clear day (${difference(day, storm).toFixed(1)})`);
    ok(difference(low, high) > 1, `high water does not look like low water (${difference(low, high).toFixed(2)})`);
    console.log(`  screenshots: ${SHOTS}`);
  } finally {
    await browser.close();
    await demo.close();
  }
  done("prove-webgl-browser");
});
