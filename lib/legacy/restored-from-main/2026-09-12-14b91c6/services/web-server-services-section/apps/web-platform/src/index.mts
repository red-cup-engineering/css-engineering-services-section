// The web platform: one web server over one computer platform. The platform
// starts before the first request, its capabilities ride every request
// context, each request holds the platform open until its response body
// completes, and close drains before releasing. Nothing here dispatches a
// request or starts a provider on its own; web-server and computer-platform
// do, and this app composes them.
import { createComputerPlatform, isComputerPlatform, type ComputerPlatform } from "@red-cup-engineering/computer-platform";
import { createWebServer } from "@red-cup-engineering/web-server";
import type { WebApplication, WebContext, WebPlatformEngine, WebPlatformSpecification } from "@red-cup-engineering/http-server-application-contract-service/web";

export type { WebPlatformEngine, WebPlatformSpecification, WebCapabilityProvider } from "@red-cup-engineering/http-server-application-contract-service/web";
export type { CapabilityProvider, ComputerPlatform, ComputerPlatformSpecification } from "@red-cup-engineering/computer-platform";

function unavailable(): Response {
  return Response.json({ type: "about:blank", status: 503, title: "Platform unavailable" }, { status: 503 });
}

/** Fuse one web server specification with one computer platform into a lifecycle-bearing Fetch handler. */
export function createWebPlatform(specification: WebPlatformSpecification): WebPlatformEngine {
  const platform: ComputerPlatform = isComputerPlatform(specification.platform)
    ? specification.platform
    : createComputerPlatform(specification.platform ?? {});
  const server: WebApplication = specification.server;
  const releases = new WeakMap<WebContext, () => void>();
  const engine = createWebServer({
    ...server,
    onRequest: async (context) => {
      let capabilities;
      try { capabilities = await platform.start(); } catch { return unavailable(); }
      if (platform.closed()) return unavailable();
      releases.set(context, platform.acquire());
      context.capabilities = Object.freeze({ ...context.capabilities, ...capabilities });
      context.platform = platform;
      return server.onRequest?.(context);
    },
    onComplete: (context) => {
      releases.get(context)?.();
      releases.delete(context);
      server.onComplete?.(context);
    },
  });
  return Object.freeze({
    ...engine,
    platform,
    start: async () => { await platform.start(); },
    close: () => platform.close(),
  });
}
