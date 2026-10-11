import { stat } from "node:fs/promises";
import { writePrivateStorageState } from "./accounts.mjs";
import { openHeadless } from "./window.mjs";

/**
 * reCAPTCHA Enterprise tokens for a web application's own calls, minted headless under the
 * signed-in account.
 *
 * Some applications (Google Flow's generation calls, 2026-10) carry a reCAPTCHA Enterprise token
 * with each call, minted on the application's origin with its site key and an action naming the
 * call. A token is minted in a page of the house's own on that origin: the browser is routed to
 * a stub that loads only Google's enterprise.js, so the application's code never runs. That
 * matters, since an application may wrap `grecaptcha.enterprise.execute` once it loads and stamp
 * any outside caller's action (Flow's reads "extension_hijack_detected").
 *
 * The page carries the account's storage state, since the token's assessment reads the Google
 * session. Google rotates that session's cookies when a client uses them, and other clients of the
 * same account hold the older values, so on close the context's rotated state is written back to
 * `storageStatePath` — only when the file is unchanged since it was read. A concurrent writer's
 * state is never overwritten by an older one.
 *
 * Returns `{ mint(action), close() }`; one browser serves every mint until closed.
 */
export async function openRecaptchaMinter({ origin, siteKey, storageStatePath, path = "/__recaptcha-mint" }, capabilities = {}) {
  if (!/^https:\/\//u.test(origin)) throw new TypeError("a reCAPTCHA minter needs the application's HTTPS origin");
  if (!siteKey) throw new TypeError("a reCAPTCHA minter needs the application's site key");
  const readAt = storageStatePath ? (await stat(storageStatePath)).mtimeMs : null;
  const { context, page, close: closeBrowser } = await openHeadless({ storageState: storageStatePath }, capabilities);
  const stub = new URL(path, origin).href;
  await context.route(stub, (route) => route.fulfill({
    contentType: "text/html",
    body: `<!doctype html><meta charset="utf-8"><script src="https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(siteKey)}"></script>`,
  }));
  await page.goto(stub);
  await page.waitForFunction(() => typeof window.grecaptcha?.enterprise?.execute === "function", null, { timeout: 60_000 });

  return {
    async mint(action) {
      return page.evaluate(({ key, act }) => new Promise((resolve, reject) => {
        window.grecaptcha.enterprise.ready(() => window.grecaptcha.enterprise.execute(key, { action: act }).then(resolve, reject));
      }), { key: siteKey, act: action });
    },
    async close() {
      try {
        if (storageStatePath && (await stat(storageStatePath)).mtimeMs === readAt) await writePrivateStorageState(storageStatePath, await context.storageState());
      } finally {
        await closeBrowser();
      }
    },
  };
}
