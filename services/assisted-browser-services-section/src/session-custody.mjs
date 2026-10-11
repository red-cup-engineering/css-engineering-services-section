import { createHash } from "node:crypto";
import { chmodSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { credentialPath, keepCredential } from "@red-cup-engineering/credential-custody-service/keep";

/**
 * Browser sessions in custody. A signed-in browser's saved state (Playwright storage state, a tab's session
 * storage) is a credential: the live copy a browser reads and rewrites is in runtime memory
 * (BROWSER_SESSIONS_DIRECTORY, by default $XDG_RUNTIME_DIR/browser-sessions), seeded from the host's credential
 * store when absent, and checkpointed back into the store when its cookies change: at once after a sign-in,
 * otherwise at most daily. The browser profile beside it is a disposable cache ($XDG_CACHE_HOME/browser-sessions).
 * A session is never kept in a home directory.
 */

const DAY = 24 * 60 * 60 * 1000;
const NAME = /^[a-z0-9][a-z0-9._-]{0,95}$/u;
const named = (name) => { if (!NAME.test(name)) throw new TypeError(`a session is named by a plain file name, not ${JSON.stringify(name)}`); return name; };

/** Where live sessions are. */
export function sessionsDirectory(env = process.env) {
  if (env.BROWSER_SESSIONS_DIRECTORY) return env.BROWSER_SESSIONS_DIRECTORY;
  if (!env.XDG_RUNTIME_DIR) throw new Error("BROWSER_SESSIONS_DIRECTORY or XDG_RUNTIME_DIR must name where live browser sessions are kept");
  return join(env.XDG_RUNTIME_DIR, "browser-sessions");
}

/** A session's browser profile: a cache, rebuilt from the session when lost. */
export const profileDirectory = (name, env = process.env) => join(env.XDG_CACHE_HOME ?? join(env.HOME ?? homedir(), ".cache"), "browser-sessions", `${named(name)}.profile`);

/** A live session's path, seeded from the credential store when the host holds it and no live copy exists yet. */
export function sessionFile(name, env = process.env) {
  const directory = sessionsDirectory(env), path = join(directory, named(name));
  if (!existsSync(path) && env.CREDENTIALS_DIRECTORY) {
    const kept = credentialPath(`browser-sessions/${name}`, env);
    if (existsSync(kept)) {
      mkdirSync(directory, { recursive: true, mode: 0o700 }); chmodSync(directory, 0o700);
      copyFileSync(kept, path); chmodSync(path, 0o600);
    }
  }
  return path;
}

/** What makes two saves the same session: its cookies' domains, names and values, not their refreshed expiries. */
function sessionFingerprint(text) {
  let identity = text;
  try {
    const state = JSON.parse(text);
    if (Array.isArray(state?.cookies)) identity = JSON.stringify([state.cookies.map((c) => `${c.domain}\t${c.name}\t${c.value}`).sort(), state.origins ?? null]);
  } catch { /* not JSON: the text is its own identity */ }
  return createHash("sha256").update(identity).digest("hex");
}

/**
 * Checkpoint a live session into the credential store: when it differs from the last checkpoint, and either `force`
 * (a sign-in just happened) or a day has passed. A process with no credential store configured keeps nothing.
 */
export async function checkpointSession(name, env = process.env, { force = false, now = () => new Date() } = {}) {
  if (!env.CREDENTIALS_STORE || !env.CREDENTIALS_HOST || !env.CREDENTIALS_DIRECTORY) return { kept: false, reason: "no credential store is configured" };
  const path = join(sessionsDirectory(env), named(name)), marker = `${path}.checkpoint`;
  let text;
  try { text = await readFile(path, "utf8"); } catch (error) { if (error.code === "ENOENT") return { kept: false, reason: "no live session" }; throw error; }
  const fingerprint = sessionFingerprint(text);
  let prior = null;
  try { prior = JSON.parse(await readFile(marker, "utf8")); } catch { /* never checkpointed here */ }
  if (prior?.fingerprint === fingerprint) return { kept: false, reason: "unchanged" };
  if (!force && prior && now() - Date.parse(prior.at) < DAY) return { kept: false, reason: "checkpointed within the day" };
  const kept = await keepCredential({ id: `browser-session.${name}`, service: "browser-sessions", path: `browser-sessions/${name}`, value: text, kind: "session-secret" }, env);
  await writeFile(marker, JSON.stringify({ fingerprint, at: now().toISOString() }), { mode: 0o600 });
  return { kept: true, ...kept };
}
