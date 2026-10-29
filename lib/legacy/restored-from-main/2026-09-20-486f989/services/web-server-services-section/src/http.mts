// http.ts — HTTP transport mechanics: applying representations, CORS, SSE,
// body reading. Protocol representations live in atomic protocol packages.
import type { IncomingMessage, ServerResponse } from "node:http";
import { strongEtag } from "./internal/hash.mts";
import { setTrailerHeader, writeResponseTrailers } from "./internal/trailers.mts";
import {
  contentRange,
  multipartByterangesBody,
  multipartRangeBoundary,
  parseRanges,
} from "@red-cup-engineering/code-http-byte-range-service";
import { cacheControl, type CacheControl } from "@red-cup-engineering/code-http-cache-control-service";
import { httpDate } from "@red-cup-engineering/code-http-date-service";
import {
  ifMatch,
  ifModifiedSince,
  ifNoneMatch,
  ifRange,
  ifUnmodifiedSince,
} from "@red-cup-engineering/evaluate-http-conditional-request-service";
import { isCompressible } from "@red-cup-engineering/classify-http-media-type-service";
import { negotiateEncoding } from "@red-cup-engineering/negotiate-http-content-coding-service";
import { compress, supportedCompressionCodings } from "./compress.mts";
import type { Repr, Body, CorsOptions, SecurityHeaders, StrictTransportSecurity, ResponseTrailers } from "@red-cup-engineering/http-server-application-contract-service";
export { strongEtag };

export { ensureDateHeader, applyCacheControl, applySecurityHeaders, appendVary } from "./response-policy.mts";
import { ensureDateHeader, applyCacheControl, applySecurityHeaders, appendVary } from "./response-policy.mts";
import * as policy from "./response-policy.mts";
export type { CorsPreflightDecision } from "./response-policy.mts";
function headerCorsOptions(opts: CorsOptions): policy.HeaderCorsOptions {
  const origins = opts.origins;
  return { ...opts, ...(typeof origins === "function" ? { origins: (origin: string, { req }: { req: policy.HeaderRequest }) => origins(origin, { req: req as IncomingMessage }) } : {}) } as policy.HeaderCorsOptions;
}
export function corsOriginAllowed(req: IncomingMessage, opts: CorsOptions): boolean { return policy.corsOriginAllowed(req, headerCorsOptions(opts)); }
export function corsPreflightDecision(req: IncomingMessage, opts: CorsOptions): policy.CorsPreflightDecision { return policy.corsPreflightDecision(req, headerCorsOptions(opts)); }
export function applyCors(res: ServerResponse, req: IncomingMessage, opts: CorsOptions): void { policy.applyCors(res, req, headerCorsOptions(opts)); }
export function corsPreflight(req: IncomingMessage, res: ServerResponse, opts: CorsOptions, status = 204): void { policy.corsPreflight(req, res, headerCorsOptions(opts), status); }

// ── Send a Repr ───────────────────────────────────────────────────────────────────────────────

export async function send(req: IncomingMessage, res: ServerResponse, repr: Repr): Promise<void> {
  const { status = 200, headers = {}, body, type = "application/octet-stream" } = repr;

  ensureDateHeader(res);
  applyCacheControl(res, repr.cacheControl);
  applySecurityHeaders(res, repr.security);

  // RFC 9110 conditional requests: failed preconditions become 412 before
  // cache validators can turn safe methods into 304 responses.
  if (repr.etag) {
    res.setHeader("ETag", repr.etag);
    if (!ifMatch(req.headers["if-match"], repr.etag)) { res.writeHead(412).end(); return; }
  }
  if (repr.lastModified) {
    res.setHeader("Last-Modified", httpDate(repr.lastModified));
    if (!ifUnmodifiedSince(req.headers["if-unmodified-since"], repr.lastModified)) { res.writeHead(412).end(); return; }
  }
  if (repr.etag && ifNoneMatch(req.headers["if-none-match"], repr.etag)) {
    res.writeHead(req.method === "GET" || req.method === "HEAD" ? 304 : 412).end();
    return;
  }
  if (!repr.etag && repr.lastModified && ifModifiedSince(req.headers["if-modified-since"], repr.lastModified)) {
    res.writeHead(req.method === "GET" || req.method === "HEAD" ? 304 : 412).end();
    return;
  }

  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.setHeader("Content-Type", type);

  // Buffer the body to apply compression and range
  if (!body) { res.writeHead(status).end(); return; }

  if (typeof body === "string" || Buffer.isBuffer(body)) {
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(body, "utf8");

    // Range
    const ranges = ifRange(req.headers["if-range"], {
      ...(repr.etag !== undefined ? { etag: repr.etag } : {}),
      ...(repr.lastModified !== undefined ? { lastModified: repr.lastModified } : {}),
    })
      ? parseRanges(req.headers["range"], buf.length)
      : null;
    if (ranges === 416) {
      res.setHeader("Content-Range", contentRange(null, buf.length));
      res.writeHead(416).end();
      return;
    }
    if (ranges) {
      const coding = negotiateEncoding(req.headers["accept-encoding"] as string | undefined, ["identity"]);
      if (coding === null) {
        appendVary(res, "Accept-Encoding");
        res.writeHead(406, { "Content-Type": "text/plain; charset=utf-8" }).end(req.method === "HEAD" ? undefined : "Not Acceptable");
        return;
      }
      if (ranges.length > 1) {
        const boundary = multipartRangeBoundary(buf.length, ranges);
        const body = multipartByterangesBody(buf, ranges, type, boundary);
        res.setHeader("Content-Type", `multipart/byteranges; boundary=${boundary}`);
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader("Content-Length", body.length);
        res.writeHead(206).end(req.method === "HEAD" ? undefined : body);
        return;
      }
      const range = ranges[0]!;
      const slice = buf.slice(range.start, range.end + 1);
      res.setHeader("Content-Range", contentRange(range, buf.length));
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Length", slice.length);
      res.writeHead(206).end(req.method === "HEAD" ? undefined : slice);
      return;
    }

    // Full response with optional compression
    const compressible = isCompressible(type);
    const coding = negotiateEncoding(req.headers["accept-encoding"] as string | undefined, compressible ? [...supportedCompressionCodings(), "identity"] : ["identity"]);
    if (coding === null) {
      appendVary(res, "Accept-Encoding");
      res.writeHead(406, { "Content-Type": "text/plain; charset=utf-8" }).end(req.method === "HEAD" ? undefined : "Not Acceptable");
      return;
    }
    if (compressible) {
      appendVary(res, "Accept-Encoding");
      if (coding !== "identity") {
        const out = await compress(buf, coding);
        const trailers = req.method === "HEAD" ? undefined : repr.trailers;
        const hasTrailers = setTrailerHeader(res, trailers);
        res.setHeader("Content-Encoding", coding);
        if (!hasTrailers) res.setHeader("Content-Length", out.length);
        res.writeHead(status);
        endWithTrailers(res, req.method === "HEAD" ? undefined : out, trailers);
        return;
      }
    }
    const trailers = req.method === "HEAD" ? undefined : repr.trailers;
    const hasTrailers = setTrailerHeader(res, trailers);
    if (!hasTrailers) res.setHeader("Content-Length", buf.length);
    res.setHeader("Accept-Ranges", "bytes");
    res.writeHead(status);
    endWithTrailers(res, req.method === "HEAD" ? undefined : buf, trailers);
  } else {
    // Streaming body
    if (req.method === "HEAD") { res.writeHead(status).end(); return; }
    setTrailerHeader(res, repr.trailers);
    res.writeHead(status);
    await pipeBody(body, res, repr.trailers);
  }
}

function endWithTrailers(
  res: ServerResponse,
  chunk: Buffer | string | Uint8Array | undefined,
  trailers: ResponseTrailers | undefined,
): void {
  writeResponseTrailers(res, trailers);
  res.end(chunk);
}

function pipeBody(body: Body, res: ServerResponse, trailers: ResponseTrailers | undefined): Promise<void> {
  const finish = () => {
    writeResponseTrailers(res, trailers);
    res.end();
  };
  if (body instanceof ReadableStream) {
    const reader = body.getReader();
    return new Promise((resolve) => {
      const pump = (): void => {
        reader.read().then(({ done, value }) => {
          if (done) { finish(); resolve(); return; }
          res.write(value);
          pump();
        }).catch(() => { res.end(); resolve(); });
      };
      pump();
    });
  } else if (typeof (body as NodeJS.ReadableStream).pipe === "function") {
    return new Promise((resolve) => {
      const stream = body as NodeJS.ReadableStream;
      stream.on("error", () => { res.end(); resolve(); });
      stream.on("end", () => { finish(); resolve(); });
      stream.pipe(res, { end: false });
    });
  } else {
    // async iterable
    return (async () => {
      try {
        for await (const chunk of body as AsyncIterable<Uint8Array>) {
          res.write(chunk);
        }
        finish();
      } catch {
        res.end();
      }
    })();
  }
}
