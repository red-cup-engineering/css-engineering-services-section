import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { assertSitename } from "../src/neocities.mjs";

/**
 * Private files in ~/.config/561-group/neocities (dir 0700, files 0600): one
 * <sitename>.api-key per site. The account's browser session is the assisted
 * browser's (`assisted-sign-in neocities`).
 */
export const credentialsDir = (env = process.env) =>
  env.NEOCITIES_CREDENTIALS_DIR ?? join(env.HOME ?? homedir(), ".config", "561-group", "neocities");

export const keyPath = (sitename, env) => join(credentialsDir(env), `${assertSitename(sitename)}.api-key`);

async function writePrivateFile(path, text, env) {
  const dir = credentialsDir(env);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700);
  const staging = `${path}.${process.pid}.tmp`;
  await writeFile(staging, text, { mode: 0o600 });
  await chmod(staging, 0o600);
  await rename(staging, path);
  return path;
}

/** The site's stored key, or null when none is stored. */
export async function storedApiKey(sitename, env = process.env) {
  try {
    return (await readFile(keyPath(sitename, env), "utf8")).trim() || null;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

/** NEOCITIES_API_KEY wins (for a one-off run); otherwise the site's stored key. */
export async function readApiKey(sitename, env = process.env) {
  if (env.NEOCITIES_API_KEY) return env.NEOCITIES_API_KEY.trim();
  const key = await storedApiKey(sitename, env);
  if (!key) throw new Error(`no API key for ${sitename}: run neocities-site ${sitename} (expected ${keyPath(sitename, env)})`);
  return key;
}

export const writeApiKey = (sitename, key, env = process.env) => writePrivateFile(keyPath(sitename, env), `${key}\n`, env);
