#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { openAccount } from "@red-cup-engineering/assisted-browser-services-section/accounts";
import { accountSites, createSite, siteApiKey } from "../src/neocities-account.mjs";
import { assertSitename, NeocitiesApiError, publicSiteInfo, siteInfo, siteOrigin } from "../src/neocities.mjs";
import { storedApiKey, writeApiKey } from "./credentials.mjs";

const USAGE = "usage: neocities-site <sitename>\n"
  + "  Makes <sitename>.neocities.org ready to publish: creates it on the signed-in account if it does not exist,\n"
  + "  then stores its API key. Reuses the saved Neocities session; when there is none, opens a browser window\n"
  + "  to sign in (the password, then the code Neocities emails).";

/** The stored key, if it still opens the site. */
async function workingKey(sitename, { fetch: fetchImpl, env }) {
  const key = await storedApiKey(sitename, env);
  if (!key) return false;
  try {
    return (await siteInfo({ fetch: fetchImpl, token: key })).sitename?.toLowerCase() === sitename;
  } catch (error) {
    if (error instanceof NeocitiesApiError && error.status === 403) return false;
    throw error;
  }
}

export async function provisionSite(args, {
  fetch: fetchImpl = fetch,
  env = process.env,
  notify = (message) => process.stderr.write(`${message}\n`),
  output = process.stdout,
  browser = {},
} = {}) {
  if (args.length !== 1 || args[0].startsWith("-")) throw new Error(USAGE);
  const sitename = assertSitename(args[0]);
  const report = (result) => {
    output.write(`${JSON.stringify({ sitename, origin: siteOrigin(sitename), ...result }, null, 2)}\n`);
    return result;
  };
  if (await workingKey(sitename, { fetch: fetchImpl, env })) return report({ created: false, keyGenerated: false, keyStored: "already" });

  const existing = await publicSiteInfo({ fetch: fetchImpl, sitename });
  const { page, close, signedInNow } = await openAccount("neocities", { notify }, browser);
  try {
    if (existing && !(await accountSites(page)).includes(sitename)) throw new Error(`${sitename}.neocities.org already exists on another account`);
    const { created } = existing ? { created: false } : await createSite(page, sitename);
    const { key, generated } = await siteApiKey(page, sitename);
    const info = await siteInfo({ fetch: fetchImpl, token: key });
    if (info.sitename?.toLowerCase() !== sitename) throw new Error(`the key Neocities showed belongs to ${info.sitename}, not ${sitename}; nothing stored`);
    const keyFile = await writeApiKey(sitename, key, env);
    return report({ created, keyGenerated: generated, keyStored: keyFile, signedInNow });
  } finally {
    await close();
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await provisionSite(process.argv.slice(2));
  } catch (error) {
    console.error(error.message ?? error);
    process.exitCode = 1;
  }
}
