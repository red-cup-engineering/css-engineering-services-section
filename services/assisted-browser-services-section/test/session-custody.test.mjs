import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { checkpointSession, sessionFile, sessionsDirectory } from "../src/session-custody.mjs";

test("live sessions are in runtime memory, never a home directory", () => {
  assert.equal(sessionsDirectory({ BROWSER_SESSIONS_DIRECTORY: "/live", XDG_RUNTIME_DIR: "/run/user/1" }), "/live");
  assert.equal(sessionsDirectory({ XDG_RUNTIME_DIR: "/run/user/1", HOME: "/home/x" }), "/run/user/1/browser-sessions");
  assert.throws(() => sessionsDirectory({ HOME: "/home/x" }), /XDG_RUNTIME_DIR must name/u);
});

test("a session is named by a plain file name", () => {
  for (const name of ["../kdp.json", "a/b.json", ".hidden", ""]) assert.throws(() => sessionFile(name, { BROWSER_SESSIONS_DIRECTORY: "/live" }), /plain file name/u);
});

test("a missing live session is seeded, private, from the host's credential store", async () => {
  const root = await mkdtemp(join(tmpdir(), "session-custody-"));
  const store = join(root, "credentials"), live = join(root, "live");
  await mkdir(join(store, "browser-sessions"), { recursive: true });
  await writeFile(join(store, "browser-sessions", "kdp.json"), '{"cookies":[]}\n', { mode: 0o600 });
  const env = { BROWSER_SESSIONS_DIRECTORY: live, CREDENTIALS_DIRECTORY: store };
  const path = sessionFile("kdp.json", env);
  assert.equal(path, join(live, "kdp.json"));
  assert.equal(await readFile(path, "utf8"), '{"cookies":[]}\n');
  assert.equal((await stat(path)).mode & 0o777, 0o600);
  assert.equal((await stat(live)).mode & 0o777, 0o700);
});

test("a process with no credential store keeps nothing", async () => {
  assert.deepEqual(await checkpointSession("kdp.json", { BROWSER_SESSIONS_DIRECTORY: "/live" }), { kept: false, reason: "no credential store is configured" });
});
