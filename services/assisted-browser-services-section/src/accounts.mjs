import { chmod, mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { guidePerson } from "./assist.mjs";
import { checkpointSession, sessionFile, sessionsDirectory } from "./session-custody.mjs";
import { openHeadless, openWindow } from "./window.mjs";

/**
 * The house's accounts at outside web portals, and the browser sessions that
 * stand for them. The person at the node signs in once, in a visible window;
 * the session is then kept as Playwright storage state, live in runtime memory
 * and sealed in the host's credential store (session-custody.mjs), and reused
 * headless until it lapses. No password or cookie value ever passes through code or
 * output.
 *
 * `mapped` names the date a read-only walk confirmed the portal's signed-in
 * pages. A portal that is not yet mapped has its sign-in hosts and paths from
 * its own help pages; capturing its sign-in ends when the person says so,
 * not on a URL.
 */
const account = (value) => Object.freeze({ ...value, signIn: Object.freeze(value.signIn) });
export const ACCOUNTS = Object.freeze({
  kdp: account({
    name: "Amazon KDP", mapped: "2026-09-29",
    portal: /(^|\.)kdp\.amazon\.com$/u, start: "https://kdp.amazon.com", home: "https://kdp.amazon.com/bookshelf",
    homePath: /^\/(?:[a-z]{2}_[A-Z]{2}\/)?(?:bookshelf|dashboard)(?:\/|$)/u,
    signIn: { paths: /\/ap\/(?:signin|challenge|mfa|cvf)|\/signin/iu },
  }),
  "apple-books": account({
    name: "Apple Books for Authors", mapped: null,
    portal: /^authors\.apple\.com$/u, start: "https://authors.apple.com/", home: "https://authors.apple.com/",
    signIn: { hosts: /^(?:idmsa|appleid)\.apple\.com$/u, paths: /\/(?:sign-?in|login)(?:\/|$)/iu },
  }),
  "google-play-books": account({
    name: "Google Play Books Partner Center", mapped: null,
    portal: /^play\.google\.com$/u, portalPath: /^\/books\/publish(?:\/|$)/u, start: "https://play.google.com/books/publish/", home: "https://play.google.com/books/publish/",
    signIn: { hosts: /^accounts\.google\.com$/u },
  }),
  // Google Flow (Veo video and image generation) on the Google account that holds the AI plan
  // (labs.google/fx/tools/flow now redirects here); its credit balance shows under the profile icon.
  "google-flow": account({
    name: "Google Flow", mapped: null,
    portal: /^flow\.google\.com$/u, start: "https://flow.google.com/", home: "https://flow.google.com/",
    signIn: { hosts: /^accounts\.google\.com$/u },
  }),
  "barnes-noble-press": account({
    name: "Barnes & Noble Press", mapped: null,
    portal: /^press\.barnesandnoble\.com$/u, start: "https://press.barnesandnoble.com/", home: "https://press.barnesandnoble.com/",
    signIn: { paths: /\/(?:sign-?in|login)(?:\/|$)/iu },
  }),
  // Signing in emails a code after the password (views read 2026-09-30).
  neocities: account({
    name: "Neocities", mapped: "2026-09-30",
    portal: /^neocities\.org$/u, start: "https://neocities.org/signin", home: "https://neocities.org/settings",
    homePath: /^\/(?:settings|dashboard)?(?:\/|$)/u,
    signIn: { paths: /^\/signin(?:\/|$)/u },
  }),
  // The Group's mail: 561.group's MX is Fastmail. Personas' addresses are aliases made here by hand.
  fastmail: account({
    name: "Fastmail", mapped: null,
    portal: /^app\.fastmail\.com$/u, start: "https://app.fastmail.com/login/", home: "https://app.fastmail.com/",
    signIn: { paths: /^\/(?:login|signup)(?:\/|$)/u },
  }),
  // The founder's own KYC'd account, signed in with Google; the house only ever registers an API key's public half here.
  kalshi: account({
    name: "Kalshi", mapped: null,
    portal: /^(?:www\.)?kalshi\.com$/u, start: "https://kalshi.com/sign-in", home: "https://kalshi.com/account/profile",
    signIn: { hosts: /^accounts\.google\.com$/u, paths: /^\/(?:sign-?in|log-?in|sign-?up)(?:\/|$)/iu },
  }),
  // The Group's VPS host: Cold Red Gate is a Vultr instance. The house only ever receives an API key here, pasted
  // into a step panel (vultr-engineering-services-section provision-vultr-api-key).
  vultr: account({
    name: "Vultr", mapped: null,
    portal: /^my\.vultr\.com$/u, start: "https://my.vultr.com/", home: "https://my.vultr.com/",
    signIn: { hosts: /^login\.vultr\.com$/u, paths: /^\/(?:login|signup|2fa)(?:\/|$)/iu },
  }),
  stripe: account({
    name: "Stripe Dashboard", mapped: null,
    portal: /^dashboard\.stripe\.com$/u, start: "https://dashboard.stripe.com/login", home: "https://dashboard.stripe.com/",
    signIn: { paths: /^\/(?:login|register|reset)(?:\/|$)/u },
  }),
});

export const SIGN_IN_TIMEOUT_MS = 15 * 60 * 1000;
/** Page text that says a person, not code, must act: a challenge, a sign-in, an expired session. */
export const HUMAN_PATTERNS = /captcha|verify (?:it'?s|your) identity|two[- ]factor|2fa|one[- ]time password|sign in to your account|session expired/iu;
const notifyStderr = (message) => process.stderr.write(`${message}\n`);

export function webAccount(id) {
  if (!Object.hasOwn(ACCOUNTS, id)) throw new TypeError(`no web account ${id}; known: ${Object.keys(ACCOUNTS).join(", ")}`);
  return ACCOUNTS[id];
}

/** Sessions are in custody (session-custody.mjs); ASSISTED_BROWSER_SESSIONS_DIR instead names a directory the caller owns, for a test. */
export const sessionsDir = (env = process.env) => env.ASSISTED_BROWSER_SESSIONS_DIR ?? sessionsDirectory(env);
export const sessionPath = (id, env = process.env) => env.ASSISTED_BROWSER_SESSIONS_DIR ? join(env.ASSISTED_BROWSER_SESSIONS_DIR, `${(webAccount(id), id)}.json`) : sessionFile(`${(webAccount(id), id)}.json`, env);

/** Checkpoint a saved session into the credential store when it is one of the custodied live sessions. */
async function keepSession(path, force, env = process.env) {
  if (env.ASSISTED_BROWSER_SESSIONS_DIR || dirname(resolve(path)) !== resolve(sessionsDirectory(env))) return;
  await checkpointSession(path.slice(dirname(resolve(path)).length + 1), env, { force })
    .catch((error) => process.stderr.write(`assisted-browser: the session was saved but not checkpointed into custody: ${error.message}\n`));
}
export const signInCommand = (id) => `assisted-sign-in ${(webAccount(id), id)}`;

const parse = (value) => { try { return new URL(String(value)); } catch { return null; } };
export function onPortal(id, value) {
  const url = parse(value), { portal, portalPath } = webAccount(id);
  return Boolean(url) && url.protocol === "https:" && portal.test(url.hostname) && (!portalPath || portalPath.test(url.pathname));
}
export function signingIn(id, value) {
  const url = parse(value), { signIn } = webAccount(id);
  return Boolean(url) && Boolean(signIn.hosts?.test(url.hostname) || signIn.paths?.test(url.pathname));
}
/** A page only a signed-in account reaches: the mapped home page, or, before mapping, any portal page that is not a sign-in. */
export function atHome(id, value) {
  const { homePath } = webAccount(id);
  return onPortal(id, value) && !signingIn(id, value) && (!homePath || homePath.test(new URL(String(value)).pathname));
}
function portalUrl(id, value, what) {
  if (!onPortal(id, value)) throw new TypeError(`${webAccount(id).name} ${what} must be an HTTPS page of its portal`);
  return String(value);
}

export async function writePrivateStorageState(path, value) {
  const target = resolve(path);
  const directory = dirname(target);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  const temporary = `${target}.${process.pid}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600, flag: "wx" });
    await chmod(temporary, 0o600);
    await rename(temporary, target);
    await chmod(target, 0o600);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
  return target;
}

/** The saved session's path, or null when there is none, it is unreadable JSON, or others can read it. */
export async function savedSession(path) {
  try {
    if (((await stat(path)).mode & 0o077) !== 0) return null;
    JSON.parse(await readFile(path, "utf8"));
    return path;
  } catch (error) {
    if (error?.code === "ENOENT" || error instanceof SyntaxError) return null;
    throw error;
  }
}

/**
 * When the portal sends the page to sign-in or a challenge, wait while the
 * person at the visible window completes it, then return to the page that
 * was asked for.
 */
export async function awaitSignIn(id, page, url, { humanWaitMs = SIGN_IN_TIMEOUT_MS, notify = notifyStderr } = {}) {
  if (!signingIn(id, page.url())) return false;
  notify(`Sign in to ${webAccount(id).name} in the open browser window; waiting up to ${Math.round(humanWaitMs / 60_000)} minutes.`);
  await page.waitForURL((current) => onPortal(id, current) && !signingIn(id, current), { timeout: humanWaitMs });
  if (url && !page.url().startsWith(url)) await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  return true;
}

/** Check a saved session headlessly, without exposing any stored cookie value. */
export async function isSessionValid(id, { storageState = sessionPath(id), home = webAccount(id).home } = {}, capabilities = {}) {
  if (!(await savedSession(storageState))) return false;
  const { page, close } = await openHeadless({ storageState }, capabilities);
  try {
    await page.goto(portalUrl(id, home, "home page"), { waitUntil: "domcontentloaded" });
    const body = await page.locator("body").innerText();
    return atHome(id, page.url()) && !HUMAN_PATTERNS.test(body);
  } finally {
    await close();
  }
}

/**
 * A signed-in page of the account. Headless on the saved session when it is
 * still good and nobody needs to see the work; otherwise a visible window on
 * the account's home page, waiting while the person signs in if the portal
 * asks. `close` saves the refreshed session before closing.
 */
export async function openAccount(id, { visible = false, storageState = sessionPath(id), timeoutMs = SIGN_IN_TIMEOUT_MS, notify = notifyStderr } = {}, capabilities = {}) {
  const { home } = webAccount(id);
  const save = async (context, force = false) => { const path = await writePrivateStorageState(storageState, await context.storageState()); await keepSession(path, force); return path; };
  if (!visible && await isSessionValid(id, { storageState }, capabilities)) {
    const opened = await openHeadless({ storageState }, capabilities);
    await opened.page.goto(home, { waitUntil: "domcontentloaded" });
    return { ...opened, signedInNow: false, close: async () => { await save(opened.context).catch(() => {}); await opened.close(); } };
  }
  const opened = await openWindow({ storageState: await savedSession(storageState) }, capabilities);
  try {
    await opened.page.goto(home, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const signedInNow = await awaitSignIn(id, opened.page, home, { humanWaitMs: timeoutMs, notify });
    if (signedInNow) await save(opened.context, true);
    return { ...opened, signedInNow, close: async () => { await save(opened.context).catch(() => {}); await opened.close(); } };
  } catch (error) {
    await opened.close();
    throw error;
  }
}

/** Capture a sign-in the person completes, without ever receiving account credentials. */
export async function captureSignIn(id, options = {}, capabilities = {}) {
  if (Object.hasOwn(options, "password")) throw new TypeError("sign-in capture does not accept a password");
  const account = webAccount(id);
  const { storageStatePath = sessionPath(id), start = account.start, timeoutMs = SIGN_IN_TIMEOUT_MS } = options;
  const { context, page, close } = await openWindow({}, capabilities);
  try {
    await page.goto(portalUrl(id, start, "start page"), { waitUntil: "domcontentloaded" });
    if (account.homePath) await page.waitForURL((url) => atHome(id, String(url)), { timeout: timeoutMs });
    else await guidePerson(context, `Sign in to ${account.name}. When its dashboard shows, click Done.`, [{ label: "Done", final: true }], { timeout: timeoutMs, notify: capabilities.notify });
    const state = await context.storageState();
    const path = await writePrivateStorageState(storageStatePath, state);
    await keepSession(path, true);
    return Object.freeze({ account: id, path, cookieCount: Array.isArray(state.cookies) ? state.cookies.length : 0 });
  } finally {
    await close();
  }
}

/** Each account's saved session: whether there is one, when it was saved, and, with `verify`, whether it still signs in. */
export async function sessionStatus({ verify = false, env } = {}, capabilities = {}) {
  const rows = [];
  for (const id of Object.keys(ACCOUNTS)) {
    const path = sessionPath(id, env);
    const saved = await savedSession(path);
    const savedAt = saved ? (await stat(path)).mtime.toISOString() : null;
    rows.push({ account: id, name: ACCOUNTS[id].name, saved: Boolean(saved), savedAt, ...(verify && saved ? { valid: await isSessionValid(id, { storageState: path }, capabilities) } : {}), signIn: signInCommand(id) });
  }
  return rows;
}
