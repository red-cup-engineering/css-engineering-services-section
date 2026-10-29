#!/usr/bin/env node
import process from "node:process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";

import { installGracefulShutdown, start } from "@emsenn/http-server";

function usage() {
  return [
    "usage: node services/web-server/scripts/serve.mjs --site-dir <dir> --module <path-or-specifier> [--factory createApp]",
    "",
    "Imports a site app factory, starts the returned @emsenn/web App, and keeps",
    "process supervision details out of the site package.",
    "",
    "Environment:",
    "  HOST       bind host, default 127.0.0.1",
    "  PORT       bind port, default 0",
    "  BASE_URL   public base URL passed to the factory",
    "",
  ].join("\n");
}

function take(args, index, flag) {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) throw new TypeError(`${flag} requires a value`);
  return value;
}

function parseArgs(argv) {
  const parsed = { factory: "createApp" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--site-dir") {
      parsed.siteDir = take(argv, index, arg);
      index += 1;
    } else if (arg === "--module") {
      parsed.module = take(argv, index, arg);
      index += 1;
    } else if (arg === "--factory") {
      parsed.factory = take(argv, index, arg);
      index += 1;
    } else {
      throw new TypeError(`unknown option ${arg}`);
    }
  }
  return parsed;
}

function findRepoRoot(start) {
  let dir = path.resolve(start);
  while (true) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new TypeError(`no pnpm-workspace.yaml above ${start}`);
    dir = parent;
  }
}

function importTarget(siteDir, specifier) {
  if (specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("..")) {
    return pathToFileURL(path.resolve(siteDir, specifier)).href;
  }
  return specifier;
}

function portFromEnv() {
  const raw = process.env.PORT;
  if (raw === undefined || raw.trim() === "") return 0;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) throw new TypeError(`invalid PORT: ${raw}`);
  return port;
}

export async function runWebSite(argv = process.argv.slice(2), env = process.env) {
  const parsed = parseArgs(argv);
  if (parsed.help) {
    process.stdout.write(usage());
    return 0;
  }
  if (!parsed.siteDir) throw new TypeError("--site-dir is required");
  if (!parsed.module) throw new TypeError("--module is required");

  const siteDir = path.resolve(parsed.siteDir);
  const repoRoot = findRepoRoot(siteDir);
  const imported = await import(importTarget(siteDir, parsed.module));
  const factory = imported[parsed.factory] ?? imported.default;
  if (typeof factory !== "function") {
    throw new TypeError(`${parsed.module} does not export factory ${parsed.factory} or a default function`);
  }

  const host = env.HOST ?? "127.0.0.1";
  const port = portFromEnv();
  const publicBaseUrl = (env.PUBLIC_BASE_URL ?? env.BASE_URL ?? `http://${host}:${port}`).replace(/\/$/, "");
  const app = await factory({ repoRoot, siteDir, publicBaseUrl, baseUrl: publicBaseUrl, env });
  const running = await start(app, { host, port });
  installGracefulShutdown(running);
  process.stderr.write(`web-site ${siteDir} listening on ${host}:${running.port} for ${publicBaseUrl}\n`);
  await new Promise(() => {});
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runWebSite().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
