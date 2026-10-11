// The node's one home for YouTube credentials: the shared OAuth client
// (YOUTUBE_OAUTH_CLIENT_ID, YOUTUBE_OAUTH_CLIENT_SECRET) and each channel's
// refresh token under the name its channel config declares. Every reader and
// writer on the node uses this file, whatever release or checkout it runs from.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { parseEnv } from "node:util";

const NAME = /^[A-Z][A-Z0-9_]*$/u;

export function youtubeCredentialPath(env = process.env) {
  return env.YOUTUBE_CREDENTIALS ?? join(env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "561-group", "youtube.env");
}

/** The credential file's KEY=value pairs; empty when the node holds none yet. */
export function readYouTubeCredentials(env = process.env) {
  const path = youtubeCredentialPath(env);
  return existsSync(path) ? parseEnv(readFileSync(path, "utf8")) : {};
}

/** Keep one credential, replacing any earlier value under that name, atomically and owner-only. */
export function retainYouTubeCredential(name, value, env = process.env) {
  if (!NAME.test(name)) throw new TypeError("credential name must be an environment variable name");
  if (typeof value !== "string" || value === "" || /[\r\n]/u.test(value)) throw new TypeError("credential value must be one nonempty line");
  const path = youtubeCredentialPath(env);
  const text = existsSync(path) ? readFileSync(path, "utf8") : "";
  const retained = text.split("\n").filter((line) => line.trim() !== "" && !new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`, "u").test(line));
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, `${[...retained, `${name}=${value}`].join("\n")}\n`, { mode: 0o600 });
  renameSync(temp, path);
}
