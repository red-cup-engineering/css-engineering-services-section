import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { credentialPath, keepCredential } from "@red-cup-engineering/credential-custody-service/keep";

/**
 * Each Fastmail account's API token, the one the person made for the account the assisted browser knows as
 * <account>, with the scopes it was made with: a credential of the host's store, read at
 * `fastmail/<account>.json` in this process's credentials directory (CREDENTIALS_DIRECTORY). A token the person
 * pastes is kept in the store (keepCredential). FASTMAIL_CREDENTIALS_DIR instead names a directory the caller
 * owns, read and written directly. Nothing in here ever reaches output or the repository.
 */
export const credentialsDir = (env = process.env) => env.FASTMAIL_CREDENTIALS_DIR ?? credentialPath("fastmail", env);

const ACCOUNT = /^[a-z0-9][a-z0-9-]{0,62}$/u;
export const credentialsPath = (account, env) => {
  if (!ACCOUNT.test(account)) throw new TypeError(`not an account name: ${JSON.stringify(account)}`);
  return join(credentialsDir(env), `${account}.json`);
};

export function openCredentials(env = process.env) {
  return Object.freeze({
    describe: env.FASTMAIL_CREDENTIALS_DIR || env.CREDENTIALS_DIRECTORY ? credentialsDir(env) : "(this process was given no credentials)",
    async read(account) {
      // A process given no credentials holds none.
      if (!env.FASTMAIL_CREDENTIALS_DIR && !env.CREDENTIALS_DIRECTORY) return null;
      try {
        return JSON.parse(await readFile(credentialsPath(account, env), "utf8"));
      } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
      }
    },
    async write(account, value) {
      const path = credentialsPath(account, env), text = `${JSON.stringify(value, null, 2)}\n`;
      if (!env.FASTMAIL_CREDENTIALS_DIR) {
        return (await keepCredential({ id: `fastmail.${account}`, service: "fastmail", path: `fastmail/${account}.json`, value: text, kind: "token", provider: "fastmail" }, env)).path;
      }
      await mkdir(credentialsDir(env), { recursive: true, mode: 0o700 });
      await chmod(credentialsDir(env), 0o700);
      const staging = `${path}.${process.pid}.tmp`;
      await writeFile(staging, text, { mode: 0o600 });
      await chmod(staging, 0o600);
      await rename(staging, path);
      return path;
    },
  });
}
