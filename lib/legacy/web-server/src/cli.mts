#!/usr/bin/env node
import process from "node:process";
import { loadEnvironmentalConfiguration } from "@red-cup-engineering/computing/codecs";
import {
  installGracefulShutdown,
  start,
  type App,
  type StartOptions,
  type StartResult,
} from "@red-cup-engineering/http-server";
import {
  createWebTicsService,
  normalizeWebTicsConfig,
  type WebTicsConfig,
} from "./service.mjs";
import {
  createWebBinaryGatewayService,
  normalizeWebBinaryGatewayConfig,
  type WebBinaryGatewayConfig,
} from "./binary-gateway.mjs";

type CliReadable = Pick<NodeJS.ReadStream, "isTTY" | "setEncoding" | "on" | "once">;

export type WebServerCliIo = Readonly<{
  cwd?: string;
  env?: Readonly<Record<string, string | undefined>>;
  stdin?: CliReadable;
  stdinText?: string;
  stdout?: Pick<NodeJS.WriteStream, "write"> | ((text: string) => void);
  stderr?: Pick<NodeJS.WriteStream, "write"> | ((text: string) => void);
  startServer?: (app: App, options: StartOptions) => Promise<StartResult>;
}>;

export type WebTicsCliIo = WebServerCliIo;

type ParsedArgs = Readonly<{
  command: string;
  config?: string;
  host?: string;
  port?: number;
  help: boolean;
}>;

export async function runCli(argv: readonly string[] = process.argv.slice(2), io: WebServerCliIo = {}): Promise<number> {
  const out = io.stdout ?? process.stdout;
  const err = io.stderr ?? process.stderr;
  try {
    const parsed = parseArgs(argv);
    if (parsed.help) {
      write(out, usage());
      return 0;
    }
    if (parsed.command !== "serve" && parsed.command !== "gateway") throw new Error(usage());

    const stdinText = io.stdinText ?? await readPipedStdin(io.stdin ?? process.stdin);
    const loaded = parsed.command === "gateway"
      ? loadEnvironmentalConfiguration({
        name: "web-server",
        cwd: io.cwd ?? process.cwd(),
        ...(parsed.config === undefined ? {} : { explicitPath: parsed.config }),
        ...(stdinText === undefined ? {} : { stdinText }),
        parse: normalizeWebBinaryGatewayConfig,
      })
      : loadEnvironmentalConfiguration({
        name: "web-server",
        cwd: io.cwd ?? process.cwd(),
        ...(parsed.config === undefined ? {} : { explicitPath: parsed.config }),
        ...(stdinText === undefined ? {} : { stdinText }),
        parse: normalizeWebTicsConfig,
      });
    const config = loaded.document;
    const env = io.env ?? process.env;
    const port = parsed.port ?? envPort(env.PORT) ?? config.port;
    const host = parsed.host ?? env.HOST ?? "127.0.0.1";
    const service = parsed.command === "gateway"
      ? createWebBinaryGatewayService(config as WebBinaryGatewayConfig)
      : createWebTicsService(config as WebTicsConfig);

    const result = await (io.startServer ?? start)(service.app, { port, host });
    installGracefulShutdown(result);
    write(out, `web-server ${parsed.command} ${config.name} listening at http://${host}:${result.port}/ (${sourceText(loaded.source)})\n`);
    await new Promise<never>(() => {});
    return 0;
  } catch (error) {
    write(err, `${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const positional: string[] = [];
  let config: string | undefined;
  let host: string | undefined;
  let port: number | undefined;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    if (arg === "--") continue;
    if (arg === "-h" || arg === "--help") help = true;
    else if (arg === "--config") {
      config = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === "--host") {
      host = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === "--port") {
      port = positiveInteger(requireValue(argv, index, arg), arg);
      index += 1;
    } else if (arg.startsWith("--")) {
      throw new TypeError(`unknown option ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  return Object.freeze({
    command: positional[0] ?? "serve",
    ...(config === undefined ? {} : { config }),
    ...(host === undefined ? {} : { host }),
    ...(port === undefined ? {} : { port }),
    help,
  });
}

export function usage(command = "web-server"): string {
  return [
    `usage: ${command} serve [--config web-server.config.json] [--host 127.0.0.1] [--port 18806]`,
    `       ${command} gateway [--config web-server.config.json] [--host 127.0.0.1] [--port 18806]`,
    "",
    "Configuration is JSON read from stdin first, then --config, then",
    "./web-server.config.json, ./.config/web-server.config.json, and",
    "~/.config/web-server.config.json.",
    "",
    "serve runs the web tier's utterance log, served locally",
    "(127.0.0.1 by default). Admission: POST /entries.json",
    "(trace entries, string terms), POST /utterances.json (bedrock wire",
    "form). Reads: GET /utterances.json, GET /recall.json?subject=&",
    "predicate=[&object=], POST /settle.json (judgment settlement),",
    "GET /snapshot.json, GET /healthz.",
    "",
    "gateway runs the HTTP-to-Node-binary gateway. Each HTTP request is",
    "serialized as a web.gateway.request JSON carrier on stdin; stdout",
    "must be a web.gateway.response JSON carrier.",
    "",
  ].join("\n");
}

function envPort(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  return positiveInteger(value, "PORT");
}

function requireValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) throw new TypeError(`${flag} requires a value`);
  return value;
}

function positiveInteger(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new TypeError(`${flag} requires a positive integer`);
  return parsed;
}

function write(target: NonNullable<WebServerCliIo["stdout"]>, text: string): void {
  if (typeof target === "function") target(text);
  else target.write(text);
}

function readPipedStdin(stdin: CliReadable): Promise<string | undefined> {
  if (stdin.isTTY) return Promise.resolve(undefined);
  return new Promise((resolve, reject) => {
    let text = "";
    stdin.setEncoding("utf8");
    stdin.on("data", (chunk: string) => {
      text += chunk;
    });
    stdin.once("end", () => resolve(text));
    stdin.once("error", reject);
  });
}

function sourceText(source: { readonly kind: string; readonly path?: string; readonly label?: string }): string {
  if (source.kind === "stdin") return "config: stdin";
  return `config: ${source.path ?? source.label ?? source.kind}`;
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href) {
  process.exitCode = await runCli();
}
