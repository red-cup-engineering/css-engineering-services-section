import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  atHome, captureSignIn, isSessionValid, onPortal, savedSession, sessionPath, signInCommand, signingIn, webAccount, writePrivateStorageState,
} from "../src/accounts.mjs";
import { WINDOW_VIEWPORT } from "../src/window.mjs";

function fakeBrowser({ url = "https://kdp.amazon.com/en_US/bookshelf", body = "Bookshelf", state = { cookies: [], origins: [] } } = {}) {
  const contexts = [];
  const browser = {
    async newContext(options = {}) {
      contexts.push(options);
      return {
        async newPage() {
          return {
            async goto() {},
            async waitForURL(predicate) { assert.equal(predicate(new URL(url)), true); },
            url: () => url,
            locator: () => ({ innerText: async () => body }),
          };
        },
        async storageState() { return state; },
      };
    },
    async close() {},
  };
  return { browser, contexts };
}

test("an account is known by its id, and its sign-in is one command", () => {
  assert.equal(webAccount("kdp").name, "Amazon KDP");
  assert.throws(() => webAccount("nowhere"), /no web account nowhere/u);
  assert.equal(signInCommand("kdp"), "assisted-sign-in kdp");
  assert.equal(sessionPath("kdp", { ASSISTED_BROWSER_SESSIONS_DIR: "/sessions" }), "/sessions/kdp.json");
});

test("a mapped portal's home is its signed-in pages, never a sign-in or another page", () => {
  assert.equal(onPortal("kdp", "https://kdp.amazon.com/bookshelf"), true);
  assert.equal(onPortal("kdp", "http://kdp.amazon.com/bookshelf"), false);
  assert.equal(onPortal("kdp", "https://kdp.amazon.com.example/bookshelf"), false);
  assert.equal(signingIn("kdp", "https://www.amazon.com/ap/signin?openid.return_to=x"), true);
  assert.equal(atHome("kdp", "https://kdp.amazon.com/en_US/bookshelf"), true);
  assert.equal(atHome("kdp", "https://kdp.amazon.com/dashboard"), true);
  assert.equal(atHome("kdp", "https://kdp.amazon.com/ap/signin"), false);
  assert.equal(atHome("kdp", "https://kdp.amazon.com/en_US/title-setup/kindle/new/details"), false);
});

test("an unmapped portal's home is any of its pages that is not a sign-in", () => {
  assert.equal(atHome("google-play-books", "https://play.google.com/books/publish/u/0/"), true);
  assert.equal(atHome("google-play-books", "https://play.google.com/store/books"), false);
  assert.equal(atHome("google-play-books", "https://accounts.google.com/v3/signin"), false);
});

test("a session is written private, and only a private, readable session counts as saved", async () => {
  const root = await mkdtemp(join(tmpdir(), "assisted-browser-"));
  const path = await writePrivateStorageState(join(root, "private", "kdp.json"), { cookies: [], origins: [] });
  assert.equal((await stat(path)).mode & 0o777, 0o600);
  assert.equal((await stat(dirname(path))).mode & 0o777, 0o700);
  assert.deepEqual(JSON.parse(await readFile(path, "utf8")), { cookies: [], origins: [] });
  assert.equal(await savedSession(path), path);
  await chmod(path, 0o640);
  assert.equal(await savedSession(path), null);
  const malformed = join(root, "malformed.json");
  await writeFile(malformed, "{", { mode: 0o600 });
  assert.equal(await savedSession(malformed), null);
  assert.equal(await savedSession(join(root, "missing.json")), null);
});

test("a session check runs headless on the saved session and tells the home page from a sign-in", async () => {
  const root = await mkdtemp(join(tmpdir(), "assisted-browser-"));
  const path = join(root, "kdp.json");
  await writeFile(path, '{"cookies":[],"origins":[]}\n', { mode: 0o600 });
  const valid = fakeBrowser();
  let launch;
  assert.equal(await isSessionValid("kdp", { storageState: path }, { launchChromium: async (options) => { launch = options; return valid.browser; } }), true);
  assert.deepEqual(launch, { headless: true });
  assert.deepEqual(valid.contexts, [{ storageState: path, viewport: WINDOW_VIEWPORT }]);

  const expired = fakeBrowser({ url: "https://www.amazon.com/ap/signin", body: "Sign in to your account" });
  assert.equal(await isSessionValid("kdp", { storageState: path }, { launchChromium: async () => expired.browser }), false);
  const challenged = fakeBrowser({ body: "Verify it's you: enter the one-time password" });
  assert.equal(await isSessionValid("kdp", { storageState: path }, { launchChromium: async () => challenged.browser }), false);
  assert.equal(await isSessionValid("kdp", { storageState: join(root, "missing.json") }, { launchChromium: async () => { throw new Error("must not launch"); } }), false);
});

test("a sign-in is captured in a visible window, never from a password, and reports no cookie value", async () => {
  const root = await mkdtemp(join(tmpdir(), "assisted-browser-"));
  const path = join(root, "sessions", "kdp.json");
  const secret = "SECRET_COOKIE_VALUE";
  const fake = fakeBrowser({ state: { cookies: [{ name: "session-id", value: secret }], origins: [] } });
  let launch;
  const capabilities = { window: "chromium", launchChromium: async (options) => { launch = options; return fake.browser; } };
  const result = await captureSignIn("kdp", { storageStatePath: path }, capabilities);
  assert.deepEqual(launch, { headless: false });
  assert.deepEqual(result, { account: "kdp", path, cookieCount: 1 });
  assert.equal((await stat(path)).mode & 0o777, 0o600);
  assert.doesNotMatch(JSON.stringify(result), /SECRET/u);
  await assert.rejects(() => captureSignIn("kdp", { password: secret }, capabilities), /does not accept a password/u);
});
