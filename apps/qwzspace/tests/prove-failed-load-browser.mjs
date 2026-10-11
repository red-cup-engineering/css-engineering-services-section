import { test } from "node:test";
import { chromium } from "playwright";
import { ok, eq, done } from "./_harness.mjs";
import { startIslandDemo } from "../examples/island/server.mjs";

test("prove-failed-load-browser", async () => {
  const demo = await startIslandDemo();
  const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
    await page.route("**/world.json", (route) => route.abort("failed"));
    await page.goto(demo.url);
    await page.waitForFunction(() => globalThis.island?.error);
    const status = await page.evaluate(() => globalThis.island);
    const visibleText = (await page.textContent("#text"))?.trim();
    ok(status.error !== null, "failed island data is recorded in public client status");
    eq(visibleText, "The island could not be displayed.", "failed island data is announced through the accessible text tier");
    await page.close();
  } finally {
    await browser.close();
    await demo.close();
  }
  done("prove-failed-load-browser");
});
