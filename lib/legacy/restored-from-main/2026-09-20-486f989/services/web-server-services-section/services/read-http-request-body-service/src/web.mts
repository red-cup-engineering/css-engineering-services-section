import { BodyReadError, readBodyStream, decodeBody, mediaType, parseJson, type BodyParseOptions, type JsonBodyOptions, type BodyDecoder } from "./body.mts";
export { BodyReadError, type BodyReadCode, type BodyParseOptions, type JsonBodyOptions } from "./body.mts";
export const DEFAULT_BODY_LIMIT = 1024 * 1024;
const decode: BodyDecoder = (bytes, coding) => {
  let decoder: DecompressionStream;
  try { decoder = new DecompressionStream(coding as CompressionFormat); }
  catch (cause) { throw new BodyReadError(415, "unsupported-content-coding", `unsupported request content-encoding: ${coding}`, { cause }); }
  return new Blob([bytes]).stream().pipeThrough(decoder);
};
function optionsFor(request: Request, options: BodyParseOptions): BodyParseOptions {
  return { ...options, contentType: options.contentType ?? request.headers.get("content-type") ?? undefined, contentEncoding: options.contentEncoding ?? request.headers.get("content-encoding") ?? undefined };
}
export async function readBody(request: Request, options: BodyParseOptions = {}): Promise<Uint8Array<ArrayBuffer>> {
  return readBodyStream(request.body, optionsFor(request, options), decode, DEFAULT_BODY_LIMIT, request.signal);
}
export async function readTextBody(request: Request, options: BodyParseOptions = {}): Promise<string> {
  const selected = optionsFor(request, options);
  return decodeBody(await readBody(request, selected), selected.contentType);
}
export async function readJsonBody<T = unknown>(request: Request, options: JsonBodyOptions<T> = {}): Promise<T> {
  mediaType(optionsFor(request, options).contentType, "json");
  return parseJson(decodeBody(await readBody(request, options)), options);
}
export async function readFormBody(request: Request, options: BodyParseOptions = {}): Promise<URLSearchParams> {
  mediaType(optionsFor(request, options).contentType, "urlencoded");
  return new URLSearchParams(await readTextBody(request, options));
}
export async function readMultipartBody(request: Request, options: BodyParseOptions = {}): Promise<FormData> {
  mediaType(optionsFor(request, options).contentType, "multipart");
  return readFormDataBody(request, options);
}
export async function readFormDataBody(request: Request, options: BodyParseOptions = {}): Promise<FormData> {
  const selected = optionsFor(request, options);
  mediaType(selected.contentType, "form");
  const bytes = await readBody(request, selected);
  try { return await new Response(bytes, { headers: { "content-type": selected.contentType! } }).formData(); }
  catch (cause) { throw new BodyReadError(400, "invalid-form", "request body must be valid form data", { cause }); }
}
