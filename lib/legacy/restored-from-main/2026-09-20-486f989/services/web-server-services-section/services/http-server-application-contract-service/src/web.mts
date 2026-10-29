import type { BodyParseOptions } from "@red-cup-engineering/read-http-request-body-service/web";
import type { JsonSchema } from "@red-cup-engineering/computer-data-engine";
import type { HttpCacheControl, SecurityHeaders, RequestTrace, RequestTraceEntry, CorsOptions } from "./index.mts";
import type { CapabilityProvider, ComputerPlatform, ComputerPlatformSpecification } from "@red-cup-engineering/computer-platform";

/** Runtime facts and capabilities are supplied by the real receiver. */
export type WebExecutionContext = {
  remoteAddress?: string;
  httpVersion?: string;
  capabilities?: Readonly<Record<string, unknown>>;
  now?: () => number;
  nonce?: () => string;
};
export type WebContext = {
  request: Request;
  url: URL;
  params: Readonly<Record<string, string>>;
  locals: Record<string, unknown>;
  capabilities: Readonly<Record<string, unknown>>;
  /** The computer platform the request runs over (its started capabilities are `capabilities`; its typed operations execute here); absent on a bare web server. */
  platform?: ComputerPlatform;
  remoteAddress?: string;
  httpVersion?: string;
  nonce: string;
  signal: AbortSignal;
  trace: RequestTrace;
  responseHeaders: Headers;
  startedAt: number;
  negotiatedType?: string;
  negotiatedLanguage?: string;
  route?: string;
  routeTemplate?: string;
  matchedRoute?: string;
  routeId?: string;
  routeName?: string;
};
export type WebHandler = (context: WebContext) => Response | Promise<Response>;
export type WebMiddleware = (context: WebContext) => Response | readonly RequestTraceEntry[] | void | Promise<Response | readonly RequestTraceEntry[] | void>;
export type WebResource = {
  match: string | RegExp | ((path: string, context: WebContext) => boolean | Record<string, string> | null | undefined);
  methods?: readonly string[];
  produces?: readonly string[];
  languages?: readonly string[];
  route?: string;
  id?: string;
  name?: string;
  middlewares?: readonly WebMiddleware[];
  handler: WebHandler;
};
export type WebCorsOptions = Omit<CorsOptions, "origins"> & { origins?: readonly (string | RegExp)[] | ((origin: string, request: Request) => boolean) };
export type WebApplication = {
  resources?: readonly WebResource[];
  middlewares?: readonly WebMiddleware[];
  locals?: Readonly<Record<string, unknown>>;
  cors?: WebCorsOptions;
  cacheControl?: HttpCacheControl | string;
  security?: SecurityHeaders | true;
  problems?: boolean;
  onRequest?: WebMiddleware;
  /** Called when the response is produced, before its body has finished streaming. */
  onResponse?: (response: Response, context: WebContext) => void | Promise<void>;
  /** Runs once after response body completion/cancellation, or a request fails before response. */
  onComplete?: (context: WebContext) => void;
  onError?: (error: unknown, context: WebContext) => Response | void | Promise<Response | void>;
};
export type WebFetchHandler = (request: Request, execution?: WebExecutionContext) => Promise<Response>;

export type WebServerEngine = Readonly<{ specification: WebApplication; fetch: WebFetchHandler; platform: ComputerPlatform; start(): Promise<void>; close(): Promise<void> }>;
export type WebInput = Readonly<{
  bytes(): Promise<Uint8Array>;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
  formData(): Promise<FormData>;
}>;
export type WebApplicationContext = WebContext & Readonly<{ input: WebInput }>;
export type WebApplicationHandler = (context: WebApplicationContext) => Response | Promise<Response>;
export type WebApplicationMiddleware = (context: WebApplicationContext) => ReturnType<WebMiddleware>;
export type WebInputValidation = Readonly<{
  contentType?: string | readonly string[];
  maxBytes?: number;
  params?: JsonSchema;
  query?: JsonSchema;
  headers?: JsonSchema;
  body?: JsonSchema;
}>;
export type WebApplicationResource = Omit<WebResource, "handler" | "middlewares"> & Readonly<{
  handler: WebApplicationHandler;
  middlewares?: readonly WebApplicationMiddleware[];
  body?: BodyParseOptions;
  validation?: WebInputValidation;
  openapi?: false | Readonly<Record<string, unknown>>;
}>;
export type WebApplicationSpecification = Omit<WebApplication, "resources" | "middlewares" | "onRequest" | "onError" | "onResponse" | "onComplete"> & Readonly<{
  resources?: readonly WebApplicationResource[];
  applications?: readonly WebApplicationSpecification[];
  body?: BodyParseOptions;
  middlewares?: readonly WebApplicationMiddleware[];
  onRequest?: WebApplicationMiddleware;
  onComplete?: (context: WebApplicationContext) => void;
  onError?: (error: unknown, context: WebApplicationContext) => Response | void | Promise<Response | void>;
  onResponse?: (response: Response, context: WebApplicationContext) => void | Promise<void>;
  /** The computer platform the application runs over; omitted, an empty platform is composed. */
  platform?: ComputerPlatformSpecification | ComputerPlatform;
}>;
/** The platform's capability provider; the computer platform app owns the shape, the web contract names it. */
export type WebCapabilityProvider = CapabilityProvider;
/** A web application is resources, intake, validation and OpenAPI over one web platform. */
export type WebApplicationEngine = WebServerEngine & Readonly<{
  openapi(): Readonly<Record<string, unknown>>;
}>;

/** A representation before HTTP preconditions, range selection and content coding. */
export type WebResponseRepresentation = Readonly<{
  status?: number;
  headers?: ConstructorParameters<typeof Headers>[0];
  body?: string | Uint8Array<ArrayBuffer> | ReadableStream<Uint8Array> | null;
  type?: string;
  cacheControl?: string;
  etag?: string | boolean;
  lastModified?: Date;
  compress?: boolean;
}>;
