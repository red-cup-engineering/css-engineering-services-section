import type { IncomingMessage } from "node:http";
import { Readable } from "node:stream";
import { decompressStream, supportedCompressionCodings, type Coding } from "@red-cup-engineering/code-http-content-coding-service";
import { parseContentType } from "@red-cup-engineering/code-http-content-type-service";
import { parseMultipartForm, type MultipartForm } from "@red-cup-engineering/code-http-multipart-form-data-service";
import { BodyReadError, readBodyStream, decodeBody, mediaType, parseJson, type BodyParseOptions, type JsonBodyOptions, type BodyDecoder } from "./body.mts";
export { BodyReadError, type BodyReadCode, type BodyParseOptions, type JsonBodyOptions } from "./body.mts";
const decode: BodyDecoder = (bytes, coding) => {
  if (!supportedCompressionCodings().includes(coding as Exclude<Coding, "identity">)) throw new BodyReadError(415, "unsupported-content-coding", `unsupported request content-encoding: ${coding}`);
  return Readable.toWeb(Readable.from([bytes]).pipe(decompressStream(coding as Coding))) as ReadableStream<Uint8Array>;
};
export async function readBody(req: IncomingMessage, options: number | BodyParseOptions = {}): Promise<Buffer> {
  const selected = typeof options === "number" ? { maxBytes: options, maxEncodedBytes: options } : options;
  const abortController = new AbortController();
  const abort = () => abortController.abort(new BodyReadError(400, "invalid-body", "request body was aborted"));
  req.once("aborted", abort);
  if (req.aborted) abort();
  try {
    return Buffer.from(await readBodyStream((Readable.toWeb(req) as ReadableStream<Uint8Array | string>).pipeThrough(new TransformStream({ transform(chunk, controller) { controller.enqueue(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk); } })), { ...selected, contentEncoding: selected.contentEncoding ?? req.headers?.["content-encoding"] }, decode, Infinity, abortController.signal));
  } finally { req.removeListener("aborted", abort); }
}
export async function readTextBody(req: IncomingMessage, options: BodyParseOptions = {}): Promise<string> {
  return decodeBody(await readBody(req, options), options.contentType ?? req.headers["content-type"]);
}
export async function readJsonBody<T = unknown>(req: IncomingMessage, options: JsonBodyOptions<T> = {}): Promise<T> {
  return parseJson(decodeBody(await readBody(req, options)), { empty: undefined, ...options } as JsonBodyOptions<T>);
}
export async function readFormBody(req: IncomingMessage, options: BodyParseOptions = {}): Promise<URLSearchParams> {
  mediaType(options.contentType ?? req.headers["content-type"], "urlencoded", false);
  return new URLSearchParams(await readTextBody(req, options));
}
export async function readMultipartBody(req: IncomingMessage, options: BodyParseOptions = {}): Promise<MultipartForm> {
  const contentType = options.contentType ?? req.headers["content-type"];
  mediaType(contentType, "multipart");
  return parseMultipartForm(await readBody(req, options), parseContentType(contentType)!.params["boundary"]);
}
