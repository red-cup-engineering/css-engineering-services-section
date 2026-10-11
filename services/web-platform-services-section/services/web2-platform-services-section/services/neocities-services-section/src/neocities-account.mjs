import { assertSitename, NEOCITIES_ORIGIN } from "./neocities.mjs";

/**
 * Account operations Neocities offers only through its signed-in web pages:
 * creating a site (Supporter plans) and generating a site's API key. Each takes
 * an injected, signed-in browser page (Playwright's Page) and never reads the
 * environment or stores anything; the caller owns the session and the key.
 * Signing in and keeping the session are the assisted browser's (its
 * `neocities` account).
 *
 * Selectors follow Neocities' own views (github.com/neocities/neocities,
 * views/settings/account/sites.erb and views/settings/site/api_key.erb, read
 * 2026-09-30).
 */

export class SignInRequired extends Error {
  constructor() {
    super("the Neocities session is not signed in");
    this.name = "SignInRequired";
  }
}

const at = (origin, path) => new URL(path, origin).href;
const onSignIn = (url) => new URL(String(url)).pathname.startsWith("/signin");

async function visit(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  if (onSignIn(page.url())) throw new SignInRequired();
}

/**
 * Submit a form as its submit button would, and wait for the page it leads to.
 * The settings page keeps each section in a tab, so a form may be hidden; a
 * click needs it visible, requestSubmit does not.
 */
async function submit(page, form) {
  const loaded = page.waitForEvent("load");
  await form.evaluate((element) => element.requestSubmit());
  await loaded;
}

/** The names of the sites on the signed-in account. */
export async function accountSites(page, { origin = NEOCITIES_ORIGIN } = {}) {
  await visit(page, at(origin, "/settings"));
  return readSiteList(page);
}

const readSiteList = async (page) =>
  (await page.locator(".settings-site-row .settings-site-copy strong").allTextContents()).map((name) => name.trim().toLowerCase());

/** Neocities reports a refused form as a flash message on the page it redirects to. */
async function flashText(page) {
  const texts = await page.locator("[class*=flash], [class*=alert], [class*=error]").allInnerTexts();
  return texts.map((text) => text.trim()).filter(Boolean).join(" ") || "no message shown";
}

/** Create a site on the account; a site the account already has is left alone. */
export async function createSite(page, sitename, { origin = NEOCITIES_ORIGIN } = {}) {
  const name = assertSitename(sitename);
  if ((await accountSites(page, { origin })).includes(name)) return { sitename: name, created: false };
  const form = page.locator('form[action="/settings/create_child"]');
  if (!(await form.count())) throw new Error("this Neocities account cannot create sites (it needs the Supporter plan)");
  await form.locator('input[name="username"]').fill(name);
  await submit(page, form);
  if (!(await readSiteList(page)).includes(name)) throw new Error(`Neocities did not create ${name}: ${await flashText(page)}`);
  return { sitename: name, created: true };
}

/**
 * The site's API key: the active key if it has one (never regenerated, which
 * would cut off every tool using it), otherwise a newly generated one.
 */
export async function siteApiKey(page, sitename, { origin = NEOCITIES_ORIGIN } = {}) {
  const name = assertSitename(sitename);
  await visit(page, at(origin, `/settings/${name}#api_key`));
  const shown = page.locator(".settings-key-card code");
  let generated = false;
  if (!(await shown.count())) {
    const form = page.locator(`form[action="/settings/${name}/generate_api_key"]`);
    if (!(await form.count())) throw new Error(`no API key section in ${name}'s settings`);
    await submit(page, form);
    generated = true;
  }
  const key = (await shown.first().textContent({ timeout: 10_000 }))?.trim();
  if (!key) throw new Error(`Neocities showed no API key for ${name}: ${await flashText(page)}`);
  return { key, generated };
}
