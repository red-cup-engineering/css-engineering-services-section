import type { WebApplication, WebApplicationContext, WebApplicationEngine, WebApplicationMiddleware, WebApplicationResource, WebApplicationSpecification, WebContext, WebInput, WebMiddleware } from "@red-cup-engineering/http-server-application-contract-service/web";
import { BodyReadError, readBody, readTextBody, readJsonBody, readFormDataBody, DEFAULT_BODY_LIMIT, type BodyParseOptions } from "@red-cup-engineering/read-http-request-body-service/web";
import { createWebServerEngine } from "./web-server-engine.mts";
import { requestValidation } from "./validation.mts";
import { openApiDocument, openApiRoutesFromApp } from "./openapi.mts";
import { appendEntries } from "./request.mts";

type Intake = { read: boolean; encoded: () => Promise<Uint8Array<ArrayBuffer>>; inputs: Map<string, WebInput> };
function intakeFor(context: WebContext, options: BodyParseOptions = {}): Intake {
  let encoded: Promise<Uint8Array<ArrayBuffer>> | undefined;
  const maximum = options.maxEncodedBytes ?? options.maxBytes;
  const intake: Intake = { read: false, inputs: new Map(), encoded: () => { intake.read = true; return encoded ??= readBody(context.request, {
    decodeContentEncoding: false, ...(maximum !== undefined ? { maxBytes: maximum, maxEncodedBytes: maximum } : {}),
  }); } };
  return intake;
}
function inputFor(context: WebContext, intake: Intake, options: BodyParseOptions = {}): WebInput {
  const key = JSON.stringify([options.maxBytes ?? null, options.maxEncodedBytes ?? null, options.contentType ?? null, options.contentEncoding ?? null, options.decodeContentEncoding ?? true]);
  const existing = intake.inputs.get(key); if (existing) return existing;
  let bytes: Promise<Uint8Array<ArrayBuffer>> | undefined;
  const requestFor = (body: Uint8Array<ArrayBuffer>, decoded = false) => {
    const headers = new Headers(context.request.headers); headers.delete("content-length");
    if (decoded) headers.delete("content-encoding");
    return new Request(context.request.url, { method: "POST", headers, body, signal: context.signal });
  };
  const collect = () => bytes ??= intake.encoded().then((encoded) => readBody(requestFor(encoded), options));
  const projections = new Map<string, Promise<unknown>>();
  async function project<T>(name: string, read: (request: Request, options: BodyParseOptions) => Promise<T>): Promise<T> {
    let value = projections.get(name);
    if (!value) {
      value = collect().then((body) => read(requestFor(body, true), {
        ...options, contentEncoding: "identity", decodeContentEncoding: false,
        maxEncodedBytes: options.maxBytes ?? DEFAULT_BODY_LIMIT,
      }));
      projections.set(name, value);
    }
    return value as Promise<T>;
  }
  const input = Object.freeze({
    bytes: async () => (await collect()).slice(),
    text: () => project("text", readTextBody),
    json: <T = unknown,>() => project<T>("json", readJsonBody<T>),
    formData: () => project("formData", readFormDataBody),
  });
  intake.inputs.set(key, input); return input;
}
function compose(spec: WebApplicationSpecification): WebApplicationSpecification {
  const parts = (spec.applications ?? []).map(compose);
  if (!parts.length) return spec;
  const inherited: Record<string, unknown> = {};
  for (const key of ["cors", "cacheControl", "security", "problems", "onError", "body"] as const) {
    if (spec[key] !== undefined) continue;
    const values = parts.map((part) => part[key]).filter((value) => value !== undefined);
    if (values.some((value) => value !== values[0])) throw new TypeError(`application composition requires an explicit ${key} policy`);
    if (values.length) inherited[key] = values[0];
  }
  const requests = [spec.onRequest, ...parts.map((part) => part.onRequest)].filter((hook): hook is WebApplicationMiddleware => Boolean(hook));
  const completions = [...parts.map((part) => part.onComplete), spec.onComplete].filter(Boolean);
  const responses = [...parts.map((part) => part.onResponse), spec.onResponse].filter(Boolean);
  const { applications: _applications, ...own } = spec;
  return {
    ...inherited, ...own,
    resources: [...parts.flatMap((part) => part.resources ?? []), ...(spec.resources ?? [])],
    middlewares: [...(spec.middlewares ?? []), ...parts.flatMap((part) => part.middlewares ?? [])],
    locals: Object.assign({}, ...parts.map((part) => part.locals), spec.locals),
    onRequest: async (ctx) => {
      for (const hook of requests) {
        const value = await hook(ctx);
        if (value instanceof Response) return value;
        if (Array.isArray(value)) ctx.trace = appendEntries(ctx.trace, value);
      }
    },
    onComplete: (ctx) => {
      const failures: unknown[] = [];
      for (const hook of completions) { try { hook!(ctx); } catch (error) { failures.push(error); } }
      if (failures.length) throw new AggregateError(failures, "application completion failed");
    },
    onResponse: async (response, ctx) => { for (const hook of responses) await hook!(response, ctx); },
  } as WebApplicationSpecification;
}

/** Compose application resources, intake and validation into the common server engine. */
export function createWebApplicationEngine(specification: WebApplicationSpecification): WebApplicationEngine {
  const spec = compose(specification);
  const intakes = new WeakMap<WebContext, Intake>();
  const bind = (context: WebContext, options: BodyParseOptions | undefined, replace = false): WebApplicationContext => {
    let intake = intakes.get(context);
    if (!intake) { intake = intakeFor(context, spec.body); intakes.set(context, intake); }
    if (replace || !("input" in context)) Object.assign(context, { input: inputFor(context, intake, options) });
    return context as WebApplicationContext;
  };
  const stage = (middleware: WebApplicationMiddleware): WebMiddleware => (ctx) => middleware(bind(ctx, spec.body));
  const resources = (spec.resources ?? []).map((resource: WebApplicationResource) => ({
    ...resource,
    middlewares: [
      async (ctx: WebContext) => {
        const bound = bind(ctx, { ...spec.body, ...(resource.validation?.maxBytes !== undefined ? { maxBytes: resource.validation.maxBytes } : {}), ...resource.body }, true);
        if (intakes.get(ctx)?.read) await bound.input.bytes();
      },
      ...(resource.validation ? [stage(requestValidation(resource.validation))] : []),
      ...(resource.middlewares ?? []).map(stage),
    ],
    handler: (ctx: WebContext) => resource.handler(bind(ctx, spec.body)),
  }));
  const { onRequest: _request, onResponse: _response, onError: _error, onComplete: _complete, ...base } = spec;
  const app: WebApplication = {
    ...base, resources, middlewares: (spec.middlewares ?? []).map(stage),
    ...(spec.onRequest ? { onRequest: stage(spec.onRequest) } : {}),
    ...(spec.onResponse ? { onResponse: (response, ctx) => spec.onResponse!(response, bind(ctx, spec.body)) } : {}),
    ...(spec.onComplete ? { onComplete: (ctx: WebContext) => spec.onComplete!(bind(ctx, spec.body)) } : {}),
    onError: async (error, ctx) => {
      const response = await spec.onError?.(error, bind(ctx, spec.body));
      if (response) return response;
      if (error instanceof BodyReadError) return Response.json({ type: "about:blank", status: error.status, title: error.message, code: error.code }, { status: error.status, headers: { "content-type": "application/problem+json" } });
    },
  };
  const server = createWebServerEngine(app);
  return Object.freeze({ ...server, openapi: () => openApiDocument(openApiRoutesFromApp(spec), { title: "Web application", version: "1.0.0" }) });
}
