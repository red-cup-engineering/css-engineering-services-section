import type {
  App,
  Context,
  Handler,
  Repr,
  Resource,
  StartResult,
} from "../src/index.mts";

const handler = ((context) => ({
  status: 200,
  type: "text/plain; charset=utf-8",
  body: context.url.pathname,
})) satisfies Handler;

const resource = {
  match: "/health",
  methods: ["GET"],
  handler,
} satisfies Resource;

const app = { resources: [resource] } satisfies App;
const representation = { status: 204 } satisfies Repr;

type ContractAssertions = [
  App,
  Context,
  Handler,
  Repr,
  Resource,
  StartResult,
];

void app;
void representation;
void (null as unknown as ContractAssertions);

import type { WebApplication, WebContext, WebFetchHandler } from "../src/web.mts";
const portable = { resources: [{ match: "/read/:id", methods: ["GET"], handler: (context: WebContext) => Response.json(context.params) }] } satisfies WebApplication;
const portableHandler: WebFetchHandler = async (request, execution) => Response.json({ path: new URL(request.url).pathname, remote: execution?.remoteAddress });
const nodeTransport = { fetch: portableHandler } satisfies App;
// @ts-expect-error Portable resources cannot emit Node response representations.
const invalidPortable: WebApplication = { resources: [{ match: "/", handler: () => ({ status: 200, body: "invalid" }) }] };
void portable; void nodeTransport; void invalidPortable;

import type { WebApplicationSpecification, WebApplicationEngine } from "../src/web.mts";
const composed: WebApplicationSpecification = {
  body: { maxBytes: 1024 },
  resources: [{ match: "/input", methods: ["POST"], body: { maxBytes: 512 }, handler: async (context) => Response.json(await context.input.json()) }],
};
const platform: WebApplicationSpecification = { resources: [], platform: { providers: [{ name: "storage", start: async () => new Map() }] } };
const platformed: WebApplicationSpecification = { ...composed, platform: { providers: [] } };
void platformed;
void platform;
declare const applicationEngine: WebApplicationEngine;
void applicationEngine.fetch(new Request("https://example.test"));
// @ts-expect-error Transport bindings cannot replace an HTTP response with a Node response object.
const invalidEngine: WebApplicationEngine = { fetch: async () => ({ end() {} }), specification: {}, openapi: () => ({}), platform: undefined as never, start: async () => {}, close: async () => {} };
void invalidEngine;
