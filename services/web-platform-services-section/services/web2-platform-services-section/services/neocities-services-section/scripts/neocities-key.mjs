#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { apiKey, assertSitename, siteInfo } from "../src/neocities.mjs";
import { writeApiKey } from "./credentials.mjs";

const USAGE = "usage: neocities-key <sitename> [--password]\n"
  + "  default: paste the key from https://neocities.org/settings/<sitename> (API section)\n"
  + "  --password: exchange the account password for the key (refused for a site never edited in the web UI)";

/** Read one secret line: hidden when typed at a terminal, otherwise the first line of stdin. */
async function readSecret(prompt, { input = process.stdin, output = process.stderr } = {}) {
  if (!input.isTTY) {
    let text = "";
    for await (const chunk of input) text += chunk;
    return text.split(/\r?\n/u)[0].trim();
  }
  output.write(prompt);
  input.setRawMode(true);
  input.resume();
  input.setEncoding("utf8");
  return new Promise((resolve, reject) => {
    let value = "";
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\u0003") {
          cleanup();
          reject(new Error("cancelled"));
          return;
        }
        if (char === "\r" || char === "\n") {
          cleanup();
          output.write("\n");
          resolve(value.trim());
          return;
        }
        value = char === "\u007f" ? value.slice(0, -1) : value + char;
      }
    };
    const cleanup = () => {
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
    };
    input.on("data", onData);
  });
}

export async function storeKey(args, { fetch: fetchImpl = fetch, env = process.env, read = readSecret, output = process.stdout } = {}) {
  const [name, ...flags] = args;
  if (!name || flags.some((flag) => flag !== "--password")) throw new Error(USAGE);
  const sitename = assertSitename(name);
  const key = flags.includes("--password")
    ? await apiKey({ fetch: fetchImpl, sitename, password: await read(`Neocities password for ${sitename}: `) })
    : await read(`API key for ${sitename}: `);
  if (!key) throw new Error("no key given");
  const info = await siteInfo({ fetch: fetchImpl, token: key });
  if (info.sitename?.toLowerCase() !== sitename) throw new Error(`that key belongs to ${info.sitename}, not ${sitename}; nothing stored`);
  const path = await writeApiKey(sitename, key, env);
  output.write(`${JSON.stringify({ sitename, stored: path, supporter: info.supporter })}\n`);
  return path;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await storeKey(process.argv.slice(2));
  } catch (error) {
    console.error(error.message ?? error);
    process.exitCode = 1;
  }
}
