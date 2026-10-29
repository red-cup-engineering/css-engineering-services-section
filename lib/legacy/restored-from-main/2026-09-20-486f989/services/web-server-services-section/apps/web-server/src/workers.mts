import type { WebServerEngine } from "@red-cup-engineering/http-server-application-contract-service/web";

export type WorkerExecution = Readonly<{ waitUntil?(promise: Promise<unknown>): void; passThroughOnException?(): void }>;
export type WorkerFetch<Env extends object> = Readonly<{ fetch(request: Request, env: Env, execution?: WorkerExecution): Promise<Response> }>;

/** One Workers `{ fetch }` export over a platform formed once per bindings object. */
export function createWorkerFetch<Env extends object>(platformFor: (env: Env) => WebServerEngine): WorkerFetch<Env> {
  const platforms = new WeakMap<Env, WebServerEngine>();
  return Object.freeze({
    fetch(request: Request, env: Env): Promise<Response> {
      let platform = platforms.get(env);
      if (!platform) { platform = platformFor(env); platforms.set(env, platform); }
      return platform.fetch(request);
    },
  });
}
