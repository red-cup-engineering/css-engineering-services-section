// The Cloudflare Workers face of a web platform: the deployment's bindings
// (D1, KV, assets, secrets, vars) are the platform's providers, already
// started by the runtime; one platform is formed per bindings object and
// reused across requests of the same isolate.
import { bindingsProviders, type CapabilityProvider } from "@red-cup-engineering/computer-platform";
import type { WebPlatformEngine } from "@red-cup-engineering/http-server-application-contract-service/web";

export type WorkerExecution = Readonly<{ waitUntil?(promise: Promise<unknown>): void; passThroughOnException?(): void }>;
export type WorkerFetch<Env extends object> = Readonly<{ fetch(request: Request, env: Env, execution?: WorkerExecution): Promise<Response> }>;

/** The platform specification a Workers deployment supplies: its bindings as providers, plus any providers with a lifecycle of their own. */
export function workersPlatform<Env extends object>(env: Env, providers: readonly CapabilityProvider[] = []): { providers: readonly CapabilityProvider[] } {
  return { providers: Object.freeze([...bindingsProviders(env as Readonly<Record<string, unknown>>), ...providers]) };
}

/** One Workers `{ fetch }` export over a platform formed once per bindings object. */
export function createWorkerFetch<Env extends object>(platformFor: (env: Env) => WebPlatformEngine): WorkerFetch<Env> {
  const platforms = new WeakMap<Env, WebPlatformEngine>();
  return Object.freeze({
    fetch(request: Request, env: Env): Promise<Response> {
      let platform = platforms.get(env);
      if (!platform) { platform = platformFor(env); platforms.set(env, platform); }
      return platform.fetch(request);
    },
  });
}
