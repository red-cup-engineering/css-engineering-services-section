#!/usr/bin/env node
import { parseArgs } from "node:util";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import { startMarkdownSite } from "./semantic-site-server/index.mjs";
import { installGracefulShutdown } from "@red-cup-engineering/http-services-section/node-server";

const { values } = parseArgs({ options: {
  config: { type: "string" }, host: { type: "string" }, port: { type: "string" },
} });
if (!values.config) throw new Error("Usage: semantic-site --config <site.json|site.mjs> [--host <address>] [--port <number>]");
const configPath = resolve(values.config);
const config = configPath.endsWith(".json")
  ? JSON.parse(await readFile(configPath, "utf8"))
  : (await import(pathToFileURL(configPath))).default;
const port = Number(values.port ?? process.env.PORT ?? 8080);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new RangeError("port must be an integer between 0 and 65535");
const host = values.host ?? process.env.HOST ?? "127.0.0.1";
const running = await startMarkdownSite({ ...config, root: resolve(dirname(configPath), config.root ?? "content") }, { host, port });
installGracefulShutdown(running);
console.log(`${config.title} listening on ${host}:${running.port}`);
