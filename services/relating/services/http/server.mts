/**
 * HTTP server service bindings for relating action routers.
 *
 * `src/running` owns pure route decisions over induced apices. This service
 * module binds those routes to `node:http` sockets.
 */
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { Action } from "../../src/running/action.mjs";
import { induceBins, type InducedBins } from "../../src/running/induce.mjs";
import {
  routeManifold,
  routeManifoldAsync,
  routeRequest,
  routeRequestAsync,
  type ManifoldMount,
  type ServedRequest,
  type ServeOptions,
} from "../../src/running/serving.mjs";
import {
  routeCarrierManifold,
  routeCarrierManifoldAsync,
  type CarrierMount,
} from "../../src/running/mounting.mjs";
import type { SchemaRegistry } from "../../src/carriers/kernel/registry.mjs";
import { attachClaimSession } from "./ws-session.mjs";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => { body += chunk; });
    req.on("end", () => resolve(body));
  });
}

function lastEventIdOf(req: IncomingMessage): string | undefined {
  const id = req.headers["last-event-id"];
  return typeof id === "string" ? id : undefined;
}

async function servedRequest(req: IncomingMessage): Promise<ServedRequest> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const query: Record<string, string> = {};
  for (const [key, value] of url.searchParams) query[key] = value;
  const accept = req.headers["accept"];
  return {
    method: req.method ?? "GET",
    path: url.pathname,
    query,
    body: req.method === "POST" ? await readBody(req) : "",
    accept: typeof accept === "string" ? accept : undefined,
    lastEventId: lastEventIdOf(req),
  };
}

export function serveManifold(mounts: readonly ManifoldMount[], options: ServeOptions = {}): Server {
  const witnessLog = options.witnessLog;
  const server = createServer((req, res) => {
    void (async () => {
      const request = await servedRequest(req);
      const response = routeManifold(mounts, request, { ...options, witnessLog });
      res.writeHead(response.status, { "content-type": response.type, ...(response.headers ?? {}) });
      res.end(response.body);
    })();
  });
  attachClaimSession(server);
  return server;
}

export function serveManifoldAsync(mounts: readonly ManifoldMount[], options: ServeOptions = {}): Server {
  const witnessLog = options.witnessLog;
  const server = createServer((req, res) => {
    void (async () => {
      const request = await servedRequest(req);
      const response = await routeManifoldAsync(mounts, request, { ...options, witnessLog });
      res.writeHead(response.status, { "content-type": response.type, ...(response.headers ?? {}) });
      res.end(response.body);
    })();
  });
  attachClaimSession(server);
  return server;
}

export function serve(actions: readonly Action[], options: ServeOptions & { readonly induced?: InducedBins } = {}): Server {
  const inducedRef = options.induced;
  const witnessLog = options.witnessLog;
  const server = createServer((req, res) => {
    void (async () => {
      const request = await servedRequest(req);
      const induced = inducedRef ?? induceBins(actions);
      const response = routeRequest(induced, request, { ...options, witnessLog });
      res.writeHead(response.status, { "content-type": response.type, ...(response.headers ?? {}) });
      res.end(response.body);
    })();
  });
  attachClaimSession(server);
  return server;
}

export function serveAsync(actions: readonly Action[], options: ServeOptions & { readonly induced?: InducedBins } = {}): Server {
  const inducedRef = options.induced;
  const witnessLog = options.witnessLog;
  const server = createServer((req, res) => {
    void (async () => {
      const request = await servedRequest(req);
      const induced = inducedRef ?? induceBins(actions);
      const response = await routeRequestAsync(induced, request, { ...options, witnessLog });
      res.writeHead(response.status, { "content-type": response.type, ...(response.headers ?? {}) });
      res.end(response.body);
    })();
  });
  attachClaimSession(server);
  return server;
}

export function serveCarrierManifold(
  mounts: readonly CarrierMount[],
  options: ServeOptions = {},
  registry?: SchemaRegistry,
): Server {
  return createServer((req, res) => {
    void (async () => {
      const request = await servedRequest(req);
      const response = routeCarrierManifold(mounts, request, options, registry);
      res.writeHead(response.status, { "content-type": response.type, ...(response.headers ?? {}) });
      res.end(response.body);
    })();
  });
}

export function serveCarrierManifoldAsync(
  mounts: readonly CarrierMount[],
  options: ServeOptions = {},
  registry?: SchemaRegistry,
): Server {
  return createServer((req, res) => {
    void (async () => {
      const request = await servedRequest(req);
      const response = await routeCarrierManifoldAsync(mounts, request, options, registry);
      res.writeHead(response.status, { "content-type": response.type, ...(response.headers ?? {}) });
      res.end(response.body);
    })();
  });
}
