import { toWebRequest } from "@red-cup-engineering/http-services-section/web-bridge";
function firstDefined(apps, key) {
  for (const app of apps) {
    if (app[key] !== undefined) return app[key];
  }
  return undefined;
}

export function mergeApps(...apps) {
  const merged = {
    resources: apps.flatMap((app) => app.resources ?? []),
    middlewares: apps.flatMap((app) => app.middlewares ?? []),
    upgrades: apps.flatMap((app) => app.upgrades ?? []),
  };

  const startHooks = apps.map((app) => app.onStart).filter(Boolean);
  if (startHooks.length) merged.onStart = async (app) => {
    for (const hook of startHooks) await hook(app);
  };

  const stopHooks = apps.map((app) => app.onStop).filter(Boolean);
  if (stopHooks.length) merged.onStop = async (app) => {
    for (const hook of stopHooks) await hook(app);
  };

  const connectionHooks = apps.map((app) => app.onConnection).filter(Boolean);
  if (connectionHooks.length) merged.onConnection = (socket) => {
    for (const hook of connectionHooks) hook(socket);
  };

  const lifecycles = apps.map((app) => app.lifecycle).filter(Boolean);
  if (lifecycles.length) {
    const lifecycle = {};
    const starts = lifecycles.map((value) => value.onStart).filter(Boolean);
    const stops = lifecycles.map((value) => value.onStop).filter(Boolean);
    const connections = lifecycles.map((value) => value.onConnection).filter(Boolean);
    if (starts.length) lifecycle.onStart = async (server) => {
      for (const hook of starts) await hook(server);
    };
    if (stops.length) lifecycle.onStop = async (server) => {
      for (const hook of stops) await hook(server);
    };
    if (connections.length) lifecycle.onConnection = (socket) => {
      for (const hook of connections) hook(socket);
    };
    merged.lifecycle = lifecycle;
  }

  const responseHooks = apps.map((app) => app.onResponse).filter(Boolean);
  if (responseHooks.length) merged.onResponse = async (context) => {
    for (const hook of responseHooks) await hook(context);
  };

  const requestHooks = apps.map((app) => app.onRequest).filter(Boolean);
  if (requestHooks.length) merged.onRequest = async (context) => {
    for (const hook of requestHooks) {
      const result = await hook(context);
      if (result !== false && result !== undefined && result !== null) return result;
    }
    return undefined;
  };

  const onError = apps.find((app) => app.onError)?.onError;
  if (onError) merged.onError = onError;

  for (const key of [
    "tls",
    "http2",
    "cors",
    "base",
    "trustProxy",
    "cacheControl",
    "security",
    "problems",
    "expectContinue",
    "clientError",
  ]) {
    const value = firstDefined(apps, key);
    if (value !== undefined) merged[key] = value;
  }

  const locals = apps.map((app) => app.locals).filter(Boolean);
  if (locals.length) merged.locals = Object.assign({}, ...locals);
  return merged;
}

export function compose(app, ...plugins) {
  return plugins.reduce((current, plugin) => plugin(current), app);
}

/** A fetch handler (Request -> Response) as an application of this server: it answers the requests
 *  `matches` claims, and only those have their body taken; every other request keeps its stream. */
export function fetchApplication(fetchHandler, { matches }) {
  if (typeof fetchHandler !== "function") throw new TypeError("fetchApplication requires a fetch handler");
  if (typeof matches !== "function") throw new TypeError("fetchApplication requires a request predicate");
  return {
    middlewares: [(context) => {
      if (!matches(toWebRequest(context.req, { url: context.url, body: false }))) return null;
      return fetchHandler(toWebRequest(context.req, { url: context.url, signal: context.signal, response: context.res }), context);
    }],
  };
}
