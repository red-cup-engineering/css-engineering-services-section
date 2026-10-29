// The sole Node/WHATWG stream transport. Application semantics live in fetch.mts.
import type { IncomingMessage, ServerResponse } from "node:http";
import { constants as http2Constants, type Http2ServerRequest } from "node:http2";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { applyTrailerHeader, immediateResponseTrailers, resolveResponseTrailers, writeResponseTrailers } from "./trailers.mts";
import { bodyForbidden, pipeCompressed, planWebResponseCompression, writeContentCodingNotAcceptable, type WebResponseCompressionOptions } from "./web-response-compression.mts";

/** Cancelling application consumption must still permit an HTTP refusal response. */
function requestBody(req: IncomingMessage, response?: ServerResponse): ReadableStream<Uint8Array> {
  let cleanup = () => {};
  let pull = () => {};
  return new ReadableStream<Uint8Array>({
    start(controller) {
      let waiting = false, finished = false;
      const end = () => { if (finished) return; finished = true; cleanup(); controller.close(); };
      const fail = (error: Error) => { if (finished) return; finished = true; cleanup(); controller.error(error); };
      const aborted = () => fail(new Error("request aborted by client"));
      const pump = () => {
        if (!waiting || finished) return;
        const chunk = req.read();
        if (chunk !== null) { waiting = false; controller.enqueue(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk); }
        else if (req.readableEnded) end();
      };
      cleanup = () => { req.off("readable", pump); req.off("end", end); req.off("error", fail); req.off("aborted", aborted); };
      req.on("readable", pump); req.once("end", end); req.once("error", fail); req.once("aborted", aborted);
      pull = () => { waiting = true; pump(); };
    },
    pull() { pull(); },
    cancel() {
      cleanup();
      const discardError = () => {};
      req.on("error", discardError);
      req.once("close", () => req.off("error", discardError));
      // Discard without retaining bytes while the refusal is written. For an
      // unfinished HTTP/1 upload, close after that response rather than keeping
      // a connection alive to accept an unbounded remainder.
      if (response && !req.complete && req.httpVersionMajor === 1) response.shouldKeepAlive = false;
      if (response && !req.complete && req.httpVersionMajor === 2) {
        const stream = (req as unknown as Http2ServerRequest).stream;
        // Finish the refusal, then cancel only this HTTP/2 stream's upload.
        stream.once("finish", () => stream.close(http2Constants.NGHTTP2_CANCEL));
      }
      req.resume();
    },
  }, { highWaterMark: 0 });
}

export function toWebRequest(req: IncomingMessage, context: string | { url?: URL; base?: string; signal?: AbortSignal; response?: ServerResponse } = {}): Request {
  const options = typeof context === "string" ? { base: context } : context;
  const url = options.url ?? new URL(req.url ?? "/", options.base ?? `http://${req.headers.host ?? "localhost"}/`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (key.startsWith(":")) continue;
    if (Array.isArray(value)) for (const item of value) headers.append(key, item);
    else if (value !== undefined) headers.set(key, String(value));
  }
  const method = req.method ?? "GET", hasBody = method !== "GET" && method !== "HEAD";
  const init: RequestInit & { duplex?: "half" } = { method, headers,
    ...(options.signal ? { signal: options.signal } : {}),
    ...(hasBody ? { body: requestBody(req, options.response), duplex: "half" as const } : {}),
  };
  return new Request(url, init);
}
export type SendWebResponseOptions = { method?: string } & WebResponseCompressionOptions;
export function sendWebResponse(res: ServerResponse, response: Response, options?: SendWebResponseOptions): Promise<void>;
export function sendWebResponse(response: Response, res: ServerResponse, options?: SendWebResponseOptions): Promise<void>;
export async function sendWebResponse(first: ServerResponse | Response, second: ServerResponse | Response, options: SendWebResponseOptions = {}): Promise<void> {
  const response = first instanceof Response ? first : second as Response;
  const res = first instanceof Response ? second as ServerResponse : first;
  const headers: Record<string, string> = {};
  for (const [key, value] of response.headers) if (key !== "set-cookie") headers[key] = value;
  const cookies = response.headers.getSetCookie();
  if (cookies.length) res.setHeader("set-cookie", cookies);
  const plan = planWebResponseCompression(response.status, headers, options);
  applyTrailerHeader(headers, immediateResponseTrailers(response));
  const head = options.method?.toUpperCase() === "HEAD";
  if (plan.kind === "not-acceptable") {
    await response.body?.cancel();
    writeContentCodingNotAcceptable(headers);
    res.writeHead(406, headers).end(head ? undefined : "Not Acceptable");
    return;
  }
  res.writeHead(response.status, headers);
  if (!response.body || head || bodyForbidden(response.status)) {
    await response.body?.cancel();
    res.end(); return;
  }
  const source = Readable.fromWeb(response.body as unknown as NodeReadableStream<Uint8Array>);
  const compressed = pipeCompressed(source, plan);
  const cancel = () => { if (!res.writableFinished) { source.destroy(); if (compressed !== source) compressed.destroy(); } };
  res.once("close", cancel);
  try {
    // pipeline observes writable pressure and propagates cancellation/errors.
    await pipeline(compressed, res, { end: false });
    writeResponseTrailers(res, await resolveResponseTrailers(response));
    res.end();
  } finally {
    res.off("close", cancel);
    if (!source.destroyed) source.destroy();
  }
}
