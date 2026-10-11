// The node's YouTube credentials: the shared OAuth client (YOUTUBE_OAUTH_CLIENT_ID, YOUTUBE_OAUTH_CLIENT_SECRET)
// and each channel's refresh token under the name its channel config declares. They are credentials of the host's
// store, read from `youtube.env` in this process's credentials directory (CREDENTIALS_DIRECTORY); a token an OAuth
// grant returns is kept in the store (keepCredential). YOUTUBE_CREDENTIALS instead names a file the caller owns,
// read and written directly.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseEnv } from "node:util";
import { credentialPath, keepCredential } from "@red-cup-engineering/credential-custody-service/keep";

const NAME = /^[A-Z][A-Z0-9_]*$/u;

export function youtubeCredentialPath(env = process.env) {
  return env.YOUTUBE_CREDENTIALS ?? credentialPath("youtube.env", env);
}

/** The credential file's KEY=value pairs; empty when the node holds none yet, or this process was given no credentials. */
export function readYouTubeCredentials(env = process.env) {
  if (!env.YOUTUBE_CREDENTIALS && !env.CREDENTIALS_DIRECTORY) return {};
  const path = youtubeCredentialPath(env);
  return existsSync(path) ? parseEnv(readFileSync(path, "utf8")) : {};
}

/** Keep one credential, replacing any earlier value under that name. */
export async function retainYouTubeCredential(name, value, env = process.env) {
  if (!NAME.test(name)) throw new TypeError("credential name must be an environment variable name");
  if (typeof value !== "string" || value === "" || /[\r\n]/u.test(value)) throw new TypeError("credential value must be one nonempty line");
  if (!env.YOUTUBE_CREDENTIALS) {
    await keepCredential({ service: "youtube", variable: name, value, kind: /REFRESH_TOKEN$/u.test(name) ? "oauth-refresh-token" : "other", provider: "google" }, env);
    return;
  }
  const path = env.YOUTUBE_CREDENTIALS;
  const text = existsSync(path) ? readFileSync(path, "utf8") : "";
  const retained = text.split("\n").filter((line) => line.trim() !== "" && !new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`, "u").test(line));
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, `${[...retained, `${name}=${value}`].join("\n")}\n`, { mode: 0o600 });
  renameSync(temp, path);
}
