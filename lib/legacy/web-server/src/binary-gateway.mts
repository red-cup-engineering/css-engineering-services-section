// binary-gateway — a web service as transport between HTTP requests and a
// Node binary that speaks a request/response carrier over stdio.

import { spawn } from "node:child_process";
import process from "node:process";

import type { App, Context, Repr } from "@red-cup-engineering/http-server";
import { jsonRepr, readBody } from "@red-cup-engineering/http-server";

export type WebGatewayHeaderValue = string | readonly string[];
export type WebGatewayHeaders = Record<string, WebGatewayHeaderValue>;

export interface WebGatewayRequestCarrier {
  readonly kind: "web.gateway.request";
  readonly protocol: "http-node-binary/1";
  readonly method: string;
  /** The HTTP target as path plus query, never an absolute origin URL. */
  readonly url: string;
  readonly path: string;
  readonly query: string;
  readonly headers: WebGatewayHeaders;
  readonly bodyEncoding: "base64";
  readonly bodyBase64: string;
}

export interface WebGatewayResponseCarrier {
  readonly kind: "web.gateway.response";
  readonly status?: number;
  readonly headers?: WebGatewayHeaders;
  readonly type?: string;
  readonly body?: string;
  readonly bodyEncoding?: "base64";
  readonly bodyBase64?: string;
}

export interface WebBinaryGatewayConfig {
  readonly name: string;
  readonly port: number;
  readonly executable: string;
  readonly args?: readonly string[];
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly maxBodyBytes?: number;
  readonly maxStdoutBytes?: number;
  readonly maxStderrBytes?: number;
  readonly timeoutMs?: number;
}

export interface WebBinaryGatewaySnapshot {
  readonly kind: "web.binary-gateway.snapshot";
  readonly name: string;
  readonly port: number;
  readonly executable: string;
  readonly args: readonly string[];
  readonly cwd: string | null;
  readonly maxBodyBytes: number;
  readonly maxStdoutBytes: number;
  readonly maxStderrBytes: number;
  readonly timeoutMs: number;
}

export type WebBinaryGatewayRunResult = Readonly<{
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: Buffer;
  stderr: Buffer;
}>;

const DEFAULT_MAX_BODY_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_STDOUT_BYTES = 32 * 1024 * 1024;
const DEFAULT_MAX_STDERR_BYTES = 128 * 1024;
const DEFAULT_TIMEOUT_MS = 30_000;

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "content-type",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export function normalizeWebBinaryGatewayConfig(input: unknown): WebBinaryGatewayConfig {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("web gateway config must be an object");
  }
  const record = input as Record<string, unknown>;
  return Object.freeze({
    name: requiredString(record.name, "web-gateway.name"),
    port: requiredPort(record.port, "web-gateway.port"),
    executable: requiredString(record.executable, "web-gateway.executable"),
    ...(record.args === undefined ? {} : { args: stringArray(record.args, "web-gateway.args") }),
    ...(record.cwd === undefined ? {} : { cwd: requiredString(record.cwd, "web-gateway.cwd") }),
    ...(record.env === undefined ? {} : { env: stringRecord(record.env, "web-gateway.env") }),
    ...(record.maxBodyBytes === undefined ? {} : {
      maxBodyBytes: positiveInteger(record.maxBodyBytes, "web-gateway.maxBodyBytes"),
    }),
    ...(record.maxStdoutBytes === undefined ? {} : {
      maxStdoutBytes: positiveInteger(record.maxStdoutBytes, "web-gateway.maxStdoutBytes"),
    }),
    ...(record.maxStderrBytes === undefined ? {} : {
      maxStderrBytes: positiveInteger(record.maxStderrBytes, "web-gateway.maxStderrBytes"),
    }),
    ...(record.timeoutMs === undefined ? {} : {
      timeoutMs: positiveInteger(record.timeoutMs, "web-gateway.timeoutMs"),
    }),
  });
}

export class WebBinaryGatewayService {
  readonly kind = "web.binary-gateway.service";
  readonly config: WebBinaryGatewayConfig;
  readonly app: App;

  constructor(config: WebBinaryGatewayConfig) {
    this.config = normalizeWebBinaryGatewayConfig(config);
    this.app = { resources: this.#resources() };
  }

  snapshot(): WebBinaryGatewaySnapshot {
    return Object.freeze({
      kind: "web.binary-gateway.snapshot" as const,
      name: this.config.name,
      port: this.config.port,
      executable: this.config.executable,
      args: Object.freeze([...(this.config.args ?? [])]),
      cwd: this.config.cwd ?? null,
      maxBodyBytes: this.config.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES,
      maxStdoutBytes: this.config.maxStdoutBytes ?? DEFAULT_MAX_STDOUT_BYTES,
      maxStderrBytes: this.config.maxStderrBytes ?? DEFAULT_MAX_STDERR_BYTES,
      timeoutMs: this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    });
  }

  async handle(ctx: Context): Promise<Repr> {
    let request: WebGatewayRequestCarrier;
    try {
      const body = await readBody(ctx.req, {
        maxBytes: this.config.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES,
        decodeContentEncoding: false,
      });
      request = webGatewayRequestCarrier(ctx, body);
    } catch (error) {
      return jsonRepr({ error: errorMessage(error) }, statusForInputError(error));
    }

    let result: WebBinaryGatewayRunResult;
    try {
      result = await runWebBinaryGateway(this.config, request);
    } catch (error) {
      return jsonRepr({ error: errorMessage(error) }, 502);
    }

    if (result.code !== 0) {
      return jsonRepr({
        error: "web gateway binary exited non-zero",
        code: result.code,
        signal: result.signal,
        stderr: result.stderr.toString("utf8"),
      }, 502);
    }

    try {
      return reprFromWebGatewayResponse(parseWebGatewayResponse(result.stdout));
    } catch (error) {
      return jsonRepr({
        error: errorMessage(error),
        stdout: result.stdout.toString("utf8"),
        stderr: result.stderr.toString("utf8"),
      }, 502);
    }
  }

  #resources(): NonNullable<App["resources"]> {
    return Object.freeze([
      {
        id: "web-binary-gateway.healthz",
        name: "Web Binary Gateway Health",
        route: "/healthz",
        match: "/healthz",
        methods: ["GET"],
        produces: ["application/json"],
        handler: () => jsonRepr(this.snapshot()),
      },
      {
        id: "web-binary-gateway.request",
        name: "Web Binary Gateway Request",
        route: "/{path*}",
        match: () => true,
        methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        produces: ["*/*"],
        handler: (ctx: Context) => this.handle(ctx),
      },
    ]);
  }
}

export function createWebBinaryGatewayService(config: WebBinaryGatewayConfig): WebBinaryGatewayService {
  return new WebBinaryGatewayService(config);
}

export function webGatewayRequestCarrier(ctx: Context, body: Buffer): WebGatewayRequestCarrier {
  return Object.freeze({
    kind: "web.gateway.request" as const,
    protocol: "http-node-binary/1" as const,
    method: ctx.req.method ?? "GET",
    url: `${ctx.url.pathname}${ctx.url.search}`,
    path: ctx.url.pathname,
    query: ctx.url.search,
    headers: normalizeRequestHeaders(ctx.req.headers),
    bodyEncoding: "base64" as const,
    bodyBase64: body.toString("base64"),
  });
}

export function parseWebGatewayResponse(stdout: Buffer): WebGatewayResponseCarrier {
  const text = stdout.toString("utf8").trim();
  if (text === "") throw new TypeError("web gateway binary emitted an empty response");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    throw new TypeError(`web gateway binary emitted non-JSON stdout: ${errorMessage(error)}`);
  }
  return normalizeWebGatewayResponse(parsed);
}

export function reprFromWebGatewayResponse(response: WebGatewayResponseCarrier): Repr {
  const headers = normalizeResponseHeaders(response.headers ?? {});
  const type = response.type ?? headerValue(response.headers ?? {}, "content-type") ?? "application/octet-stream";
  const body = response.bodyBase64 === undefined
    ? response.body
    : Buffer.from(response.bodyBase64, "base64");
  return {
    status: response.status ?? 200,
    headers,
    type,
    ...(body === undefined ? {} : { body }),
  };
}

export function runWebBinaryGateway(
  configInput: WebBinaryGatewayConfig,
  request: WebGatewayRequestCarrier,
): Promise<WebBinaryGatewayRunResult> {
  const config = normalizeWebBinaryGatewayConfig(configInput);
  const stdin = `${JSON.stringify(request)}\n`;
  const args = [...(config.args ?? [])];
  const maxStdoutBytes = config.maxStdoutBytes ?? DEFAULT_MAX_STDOUT_BYTES;
  const maxStderrBytes = config.maxStderrBytes ?? DEFAULT_MAX_STDERR_BYTES;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    const child = spawn(config.executable, args, {
      cwd: config.cwd,
      env: config.env === undefined ? process.env : { ...process.env, ...config.env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let failure: Error | null = null;
    const timer = setTimeout(() => {
      failure = new Error(`web gateway binary timed out after ${timeoutMs}ms`);
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      stdoutBytes += data.length;
      if (stdoutBytes > maxStdoutBytes && failure === null) {
        failure = new Error(`web gateway binary stdout exceeded ${maxStdoutBytes} bytes`);
        child.kill("SIGKILL");
        return;
      }
      stdout.push(data);
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      stderrBytes += data.length;
      if (stderrBytes > maxStderrBytes && failure === null) {
        failure = new Error(`web gateway binary stderr exceeded ${maxStderrBytes} bytes`);
        child.kill("SIGKILL");
        return;
      }
      stderr.push(data);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (failure !== null) {
        reject(failure);
        return;
      }
      resolve({
        code,
        signal,
        stdout: Buffer.concat(stdout, stdoutBytes),
        stderr: Buffer.concat(stderr, stderrBytes),
      });
    });
    child.stdin.end(stdin);
  });
}

function normalizeWebGatewayResponse(input: unknown): WebGatewayResponseCarrier {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("web gateway response must be an object");
  }
  const record = input as Record<string, unknown>;
  if (record.kind !== "web.gateway.response") {
    throw new TypeError("web gateway response kind must be web.gateway.response");
  }
  if (record.body !== undefined && typeof record.body !== "string") {
    throw new TypeError("web gateway response body must be a string when present");
  }
  if (record.bodyEncoding !== undefined && record.bodyEncoding !== "base64") {
    throw new TypeError("web gateway response bodyEncoding must be base64 when present");
  }
  if (record.bodyBase64 !== undefined && typeof record.bodyBase64 !== "string") {
    throw new TypeError("web gateway response bodyBase64 must be a string when present");
  }
  if (record.body !== undefined && record.bodyBase64 !== undefined) {
    throw new TypeError("web gateway response must not include both body and bodyBase64");
  }
  return Object.freeze({
    kind: "web.gateway.response" as const,
    ...(record.status === undefined ? {} : { status: requiredStatus(record.status, "status") }),
    ...(record.headers === undefined ? {} : { headers: normalizeGatewayHeaders(record.headers, "headers") }),
    ...(record.type === undefined ? {} : { type: requiredString(record.type, "type") }),
    ...(record.body === undefined ? {} : { body: record.body as string }),
    ...(record.bodyEncoding === undefined ? {} : { bodyEncoding: "base64" as const }),
    ...(record.bodyBase64 === undefined ? {} : { bodyBase64: record.bodyBase64 as string }),
  });
}

function normalizeRequestHeaders(headers: Context["req"]["headers"]): WebGatewayHeaders {
  const out: WebGatewayHeaders = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    out[name] = Array.isArray(value) ? Object.freeze([...value]) : value;
  }
  return Object.freeze(out);
}

function normalizeResponseHeaders(headers: WebGatewayHeaders): WebGatewayHeaders {
  const out: WebGatewayHeaders = {};
  for (const [name, value] of Object.entries(headers)) {
    if (HOP_BY_HOP_HEADERS.has(name.toLowerCase())) continue;
    out[name] = Array.isArray(value) ? Object.freeze([...value]) : value;
  }
  return Object.freeze(out);
}

function normalizeGatewayHeaders(input: unknown, path: string): WebGatewayHeaders {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${path} must be an object`);
  }
  const out: WebGatewayHeaders = {};
  for (const [name, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value === "string") {
      out[name] = value;
      continue;
    }
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      out[name] = Object.freeze([...value]);
      continue;
    }
    throw new TypeError(`${path}.${name} must be a string or string array`);
  }
  return Object.freeze(out);
}

function headerValue(headers: WebGatewayHeaders, name: string): string | undefined {
  const pair = Object.entries(headers).find(([key]) => key.toLowerCase() === name);
  const value = pair?.[1];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

function statusForInputError(error: unknown): number {
  return error instanceof RangeError ? 413 : 400;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${path} must be a non-empty string`);
  return value;
}

function requiredPort(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 65_535) {
    throw new TypeError(`${path} must be a TCP port`);
  }
  return value;
}

function requiredStatus(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 100 || value > 999) {
    throw new TypeError(`${path} must be an HTTP status code`);
  }
  return value;
}

function positiveInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${path} must be a positive integer`);
  }
  return value;
}

function stringArray(value: unknown, path: string): readonly string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new TypeError(`${path} must be an array of strings`);
  }
  return Object.freeze([...value]);
}

function stringRecord(value: unknown, path: string): Readonly<Record<string, string>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object`);
  }
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item !== "string") throw new TypeError(`${path}.${key} must be a string`);
    out[key] = item;
  }
  return Object.freeze(out);
}
