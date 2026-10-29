// test/helpers/server.mts — minimal ephemeral-HTTP-server harness for
// characterization tests. Builds a real node:http request/response pair
// (these middlewares rely on real ServerResponse behavior — event emission,
// getHeader/setHeader semantics, writeEarlyHints, streaming — that a hand
// mock would not faithfully reproduce) and a Context shaped per
// @red-cup-engineering/http-server-application-contract-service, then runs
// one or more Middleware functions against it. Always bind 127.0.0.1:0
// (OS-assigned ephemeral port) and always close the server after use.

import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Context, Middleware } from "@red-cup-engineering/http-server-application-contract-service";

export function makeContext(req: IncomingMessage, res: ServerResponse): Context {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  return {
    req,
    res,
    app: { resources: [] } as unknown as Context["app"],
    url,
    params: {},
    locals: {},
    nonce: "test-nonce",
    signal: new AbortController().signal,
    trace: { entries: [] } as unknown as Context["trace"],
    startedAt: Date.now(),
  } as Context;
}

export type RunningServer = {
  url: string;
  server: Server;
  close(): Promise<void>;
};

/**
 * Starts a real HTTP server on an ephemeral loopback port that runs the
 * given middleware chain for every request, in order, stopping early if a
 * middleware returns `true` or the response has already ended.
 */
export async function startMiddlewareServer(
  middlewares: Middleware | Middleware[],
  opts: { onUncaught?: (error: unknown) => void } = {},
): Promise<RunningServer> {
  const chain = Array.isArray(middlewares) ? middlewares : [middlewares];
  const server = createServer((req, res) => {
    void (async () => {
      const ctx = makeContext(req, res);
      try {
        for (const middleware of chain) {
          const result = await middleware(ctx);
          if (result === true || res.writableEnded) break;
        }
      } catch (error) {
        opts.onUncaught?.(error);
        if (!res.headersSent) res.writeHead(500).end(String(error));
      }
      if (!res.writableEnded) res.end();
    })();
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  // A brief settle delay avoids a sandbox-networking race where the very
  // first connection right after listen() is spuriously refused.
  await new Promise((resolve) => setTimeout(resolve, 30));

  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    server,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
