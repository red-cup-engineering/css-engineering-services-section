import type { WebCapabilityProvider, WebPlatformEngine, WebPlatformSpecification } from "@red-cup-engineering/http-server-application-contract-service/web";
import { createWebApplicationEngine } from "./web-application-engine.mts";

/** Bind existing storage/time/network providers to an application; provider owners implement their mechanics. */
export function createWebPlatformEngine(specification: WebPlatformSpecification): WebPlatformEngine {
  const providers = specification.providers ?? [];
  if (new Set(providers.map((provider) => provider.name)).size !== providers.length) throw new TypeError("platform capability names must be unique");
  const capabilities: Record<string, unknown> = {};
  const started: WebCapabilityProvider[] = [];
  const active = new Set<object>();
  const drained: (() => void)[] = [];
  let starting: Promise<void> | undefined, closing: Promise<void> | undefined, closed = false;
  async function release(): Promise<void> {
    const failures: unknown[] = [];
    for (const provider of started.splice(0).reverse()) {
      try { await provider.close?.(capabilities[provider.name]); } catch (error) { failures.push(error); }
      delete capabilities[provider.name];
    }
    if (failures.length) throw new AggregateError(failures, "platform capability release failed");
  }
  const start = (): Promise<void> => {
    if (closed) return Promise.reject(new Error("platform is closed"));
    return starting ??= (async () => {
      try {
        for (const provider of providers) { capabilities[provider.name] = await provider.start(); started.push(provider); }
      } catch (error) {
        try { await release(); } catch (cleanup) { throw new AggregateError([error, cleanup], "platform startup failed"); }
        throw error;
      }
    })();
  };
  const close = (): Promise<void> => closing ??= (async () => {
    closed = true;
    try { await starting; } catch { /* startup already released its capabilities */ }
    if (active.size) await new Promise<void>((resolve) => drained.push(resolve));
    await release();
  })();
  const application = createWebApplicationEngine({ ...specification.application,
    onRequest: async (context) => {
      try { await start(); } catch { return Response.json({ type: "about:blank", status: 503, title: "Platform unavailable" }, { status: 503 }); }
      if (closed) return Response.json({ type: "about:blank", status: 503, title: "Platform unavailable" }, { status: 503 });
      active.add(context);
      context.capabilities = Object.freeze({ ...context.capabilities, ...capabilities });
      return specification.application.onRequest?.(context);
    },
    onComplete: (context) => {
      active.delete(context);
      if (!active.size) for (const resolve of drained.splice(0)) resolve();
      specification.application.onComplete?.(context);
    },
  });
  return Object.freeze({ ...application, start, close });
}
