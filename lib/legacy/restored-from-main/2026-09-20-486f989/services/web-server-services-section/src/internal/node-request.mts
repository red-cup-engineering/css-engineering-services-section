import type { IncomingMessage, ServerResponse } from "node:http";
export type Transport = { base?: string; trustProxy?: boolean | number };
export function requestAbortSignal(req: IncomingMessage, res: ServerResponse): AbortSignal {
  const controller = new AbortController();
  // Node.js v24+ adds IncomingMessage.signal, but it aborts on normal req.close
  // (after body fully read), not only on premature client disconnect. Propagating
  // it would abort ctx.signal the moment the request body ends, which breaks
  // any middleware (e.g. proxyPass) that still needs to write a response. Genuine
  // client-disconnect aborts are covered by res.once("close") below.
  let completed = false;
  const abort = (reason: string) => {
    if (!completed && !controller.signal.aborted) controller.abort(new Error(reason));
  };
  res.once("finish", () => { completed = true; });
  res.once("close", () => abort("response closed before completion"));
  res.once("error", () => abort("response stream error"));
  req.once("aborted", () => abort("request aborted by client"));
  req.once("error", () => abort("request stream error"));
  // A bridged WHATWG Request (appToFetch) has no socket to emit close/aborted;
  // its cancellation arrives as an explicit upstream signal. Distinct property,
  // NOT req.signal — see the IncomingMessage.signal caveat above.
  const upstream = (req as { webAbortSignal?: unknown }).webAbortSignal;
  if (upstream instanceof AbortSignal) {
    if (upstream.aborted) abort("request aborted upstream");
    else upstream.addEventListener("abort", () => abort("request aborted upstream"), { once: true });
  }
  return controller.signal;
}

export function requestTarget(raw: string): string {
  try {
    const absolute = new URL(raw);
    return `${absolute.pathname}${absolute.search}${absolute.hash}`;
  } catch {
    return raw;
  }
}

export function requestBase(req: IncomingMessage, app: Transport): string {
  const configured = absoluteHttpBase(app.base);
  if (configured) return configured;

  const forwarded = app.trustProxy ? forwardedAuthority(req) : {};
  const proto = forwarded.proto ?? directProtocol(req);
  const host = forwarded.host ?? firstHeaderValue(req.headers.host) ?? "localhost";
  return safeOrigin(proto, host);
}

function absoluteHttpBase(base: string | undefined): string | null {
  if (!base) return null;
  try {
    const url = new URL(base);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch {}
  return null;
}

function forwardedAuthority(req: IncomingMessage): { proto?: string; host?: string } {
  const forwarded = parseForwarded(firstHeaderValue(req.headers.forwarded));
  const proto = forwarded.proto ?? firstHeaderValue(req.headers["x-forwarded-proto"]);
  const host = forwarded.host ?? firstHeaderValue(req.headers["x-forwarded-host"]);
  return {
    ...(proto !== undefined ? { proto } : {}),
    ...(host !== undefined ? { host } : {}),
  };
}

function parseForwarded(value: string | undefined): { proto?: string; host?: string } {
  if (!value) return {};
  const first = value.split(",")[0] ?? "";
  const out: { proto?: string; host?: string } = {};
  for (const part of first.split(";")) {
    const [rawKey, ...rest] = part.split("=");
    const key = rawKey?.trim().toLowerCase();
    if (key !== "proto" && key !== "host") continue;
    const rawValue = rest.join("=").trim();
    const unquoted = rawValue.startsWith("\"") && rawValue.endsWith("\"")
      ? rawValue.slice(1, -1).replace(/\\(["\\])/g, "$1")
      : rawValue;
    if (key === "proto") out.proto = unquoted;
    if (key === "host") out.host = unquoted;
  }
  return out;
}

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  const text = Array.isArray(value) ? value[0] : value;
  const first = text?.split(",")[0]?.trim();
  return first || undefined;
}

function directProtocol(req: IncomingMessage): string {
  return (req.socket as { encrypted?: boolean }).encrypted ? "https" : "http";
}

function safeOrigin(proto: string, host: string): string {
  const protocol = proto.trim().toLowerCase() === "https" ? "https" : "http";
  const trimmedHost = host.trim();
  try {
    return new URL(`${protocol}://${trimmedHost}/`).href;
  } catch {
    return `${protocol}://localhost/`;
  }
}


