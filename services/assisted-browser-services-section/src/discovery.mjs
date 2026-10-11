import { chmod, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { awaitSignIn, onPortal, sessionPath, webAccount, writePrivateStorageState } from "./accounts.mjs";
import { guidePerson } from "./assist.mjs";
import { openWindow } from "./window.mjs";

/**
 * Read-only discovery of a web account portal's forms, in a browser the person at
 * the node supervises. It records form-control descriptors (tag, type, id, name,
 * label, visible option texts), which is what a live driver's selectors are
 * written from. It never reads a control's value, and it clicks and saves
 * nothing on the portal.
 *
 * Two modes. Given page URLs, it loads each one. Walking, the person moves
 * through the portal (a new title's setup, which only exists once they start
 * one) and clicks "Record this page" on each form.
 */

export const discoveryRoot = (account) => join(homedir(), ".local", "state", "561-group", "portal-discovery", account);

/** Runs in the page (or frame). */
function describeControls() {
  const label = (element) => {
    if (element.id) { const labelled = document.querySelector(`label[for="${CSS.escape(element.id)}"]`); if (labelled) return labelled.innerText.trim().slice(0, 120); }
    const wrapping = element.closest("label"); if (wrapping) return wrapping.innerText.trim().slice(0, 120);
    const described = element.getAttribute("aria-labelledby"); if (described) return described.split(/\s+/u).map((id) => document.getElementById(id)?.innerText.trim() ?? "").join(" ").slice(0, 120);
    return (element.getAttribute("aria-label") || element.getAttribute("placeholder") || "").slice(0, 120);
  };
  const section = (element) => element.closest("fieldset, section, [data-a-expander-name], .a-section")?.querySelector("legend, h2, h3, h4, .a-form-label")?.innerText.trim().slice(0, 120) ?? null;
  const controls = [...document.querySelectorAll("input, select, textarea, button, [role=button], [role=radio], [role=checkbox], [role=combobox], [role=listbox], [contenteditable=true], iframe")]
    .filter((element) => element.type !== "hidden" && !element.closest("#house-guide, #house-assist"))
    .map((element) => ({
      tag: element.tagName.toLowerCase(), type: element.type || element.getAttribute("role") || null, id: element.id || null, name: element.name || null,
      testId: element.getAttribute("data-testid") || element.getAttribute("data-action") || null,
      cls: typeof element.className === "string" ? element.className.slice(0, 100) : null,
      label: label(element), section: section(element),
      text: ["BUTTON", "A"].includes(element.tagName) || element.getAttribute("role") === "button" ? element.innerText.trim().slice(0, 80) : null,
      options: element.tagName === "SELECT" ? [...element.options].map((option) => `${option.value}=${option.text.trim()}`).slice(0, 60) : null,
      visible: Boolean(element.offsetWidth || element.offsetHeight),
    }));
  const headings = [...document.querySelectorAll("h1, h2, h3, h4, legend, .a-form-label")].filter((heading) => !heading.closest("#house-guide, #house-assist")).map((heading) => heading.innerText.trim().slice(0, 160)).filter(Boolean).slice(0, 200);
  return { controls, headings };
}

const bare = (url) => url.replace(/[?#].*$/u, "");

/** The page's controls, and those of each child frame that has any (portals put upload and editor widgets in frames). */
async function observe(page) {
  const main = await page.evaluate(describeControls);
  const frames = [];
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    const described = await frame.evaluate(describeControls).catch(() => null);
    if (described?.controls.length) frames.push({ url: bare(frame.url()), ...described });
  }
  return { finalUrl: bare(page.url()), title: await page.title().catch(() => ""), ...main, ...(frames.length ? { frames } : {}) };
}

async function writePrivate(out, value) {
  await mkdir(dirname(out), { recursive: true, mode: 0o700 });
  await chmod(dirname(out), 0o700);
  await writeFile(out, `${JSON.stringify(value, null, 1)}\n`, { mode: 0o600 });
  await chmod(out, 0o600);
  return out;
}
const defaultOut = (account) => join(discoveryRoot(account), `${new Date().toISOString().replace(/[:.]/gu, "-")}.json`);

/** Load each given portal page, wait out any sign-in, and record its controls. */
export async function discoverPortalForms(account, { pages, out = defaultOut(account), storageStatePath = sessionPath(account), humanWaitMs = 10 * 60_000 }, capabilities = {}) {
  for (const url of pages) if (!onPortal(account, url)) throw new TypeError(`${url} is not a ${webAccount(account).name} portal page`);
  const { context, page, close } = await openWindow({ storageState: storageStatePath }, capabilities);
  try {
    const observed = {};
    for (const url of pages) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await awaitSignIn(account, page, url, { humanWaitMs });
      await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
      observed[url] = await observe(page);
      process.stderr.write(`${url}: ${observed[url].controls.length} controls\n`);
    }
    await writePrivateStorageState(storageStatePath, await context.storageState());
    await writePrivate(resolve(out), observed);
    return Object.freeze({ account, out: resolve(out), pages: Object.keys(observed).length });
  } finally {
    await close();
  }
}

/**
 * The founder walks the portal; each "Record this page" records the page in
 * front of them, and Finish ends the walk. The output is written after every
 * recording, so a closed window loses nothing.
 */
export async function walkPortalForms(account, { out = defaultOut(account), start = webAccount(account).start, storageStatePath = sessionPath(account), timeout = 90 * 60_000 } = {}, capabilities = {}) {
  if (!onPortal(account, start)) throw new TypeError(`${start} is not a ${webAccount(account).name} portal page`);
  const { context, page, close } = await openWindow({ storageState: storageStatePath }, capabilities);
  const observed = {};
  const target = resolve(out);
  try {
    await page.goto(start, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await guidePerson(context, `Discovery of ${webAccount(account).name}: sign in, go through a book's setup, and click Record on every form page. Save or publish nothing. Finish when done.`, [{ label: "Record this page" }, { label: "Finish", final: true }], {
      timeout,
      notify: capabilities.notify,
      onChoice: async (_, current) => {
        const seen = await observe(current);
        // A page recorded twice (a form revealed by an earlier answer) keeps each view.
        const key = observed[seen.finalUrl] ? `${seen.finalUrl}#${Object.keys(observed).filter((url) => url.startsWith(seen.finalUrl)).length + 1}` : seen.finalUrl;
        observed[key] = { recordedAt: new Date().toISOString(), ...seen };
        await writePrivate(target, observed);
        process.stderr.write(`${key}: ${seen.controls.length} controls\n`);
      },
    });
    await writePrivateStorageState(storageStatePath, await context.storageState());
    return Object.freeze({ account, out: target, pages: Object.keys(observed).length });
  } finally {
    await close().catch(() => {});
  }
}
