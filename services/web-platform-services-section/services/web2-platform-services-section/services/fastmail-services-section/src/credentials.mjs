import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Private files in ~/.config/561-group/fastmail/<account>.json (dir 0700,
 * files 0600): the API token the person made for the Fastmail account the
 * assisted browser knows as <account>, with the scopes it was made with.
 * Nothing in here ever reaches output or the repository.
 */
export const credentialsDir = (env = process.env) =>
  env.FASTMAIL_CREDENTIALS_DIR ?? join(env.HOME ?? homedir(), ".config", "561-group", "fastmail");

const ACCOUNT = /^[a-z0-9][a-z0-9-]{0,62}$/u;
export const credentialsPath = (account, env) => {
  if (!ACCOUNT.test(account)) throw new TypeError(`not an account name: ${JSON.stringify(account)}`);
  return join(credentialsDir(env), `${account}.json`);
};

export function openCredentials(env = process.env) {
  return Object.freeze({
    describe: credentialsDir(env),
    async read(account) {
      try {
        return JSON.parse(await readFile(credentialsPath(account, env), "utf8"));
      } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
      }
    },
    async write(account, value) {
      const path = credentialsPath(account, env);
      await mkdir(credentialsDir(env), { recursive: true, mode: 0o700 });
      await chmod(credentialsDir(env), 0o700);
      const staging = `${path}.${process.pid}.tmp`;
      await writeFile(staging, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
      await chmod(staging, 0o600);
      await rename(staging, path);
      return path;
    },
  });
}
