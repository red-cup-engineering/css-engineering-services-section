
import {
  httpAppSurfaceContract,
  httpResourceDescriptorContract,
  httpResourceMatchContract,

} from "./schema.mjs";

/** Resource handler over a fully matched request context. */

/** Middleware can append trace rows, continue routing, or return a response. */

/** Route-shaped resource descriptor for the small HTTP app object language. */

/** Per-request context passed to middleware and handlers after route matching. */

/** Data description of the constructed small HTTP app object language. */

function matchKind(match) {
  if (typeof match === "string") return "string";
  if (match instanceof RegExp) return "regexp";
  return "function";
}

/** Read a live HTTP resource as finite descriptor material without serializing its handler. */
export function describeHttpResource(resource) {
  return httpResourceDescriptorContract.assert(Object.freeze({
    kind: "metroplat.http.resource-descriptor",
    ...(resource.id === undefined ? {} : { id: resource.id }),
    ...(resource.name === undefined ? {} : { name: resource.name }),
    ...(resource.route === undefined ? {} : { route: resource.route }),
    match: matchKind(resource.match),
    methods: Object.freeze([...(resource.methods ?? ["GET", "HEAD"])]),
    produces: Object.freeze([...(resource.produces ?? [])]),
    languages: Object.freeze([...(resource.languages ?? [])]),
    middlewareCount: resource.middlewares?.length ?? 0,
    hasHandler: typeof resource.handler === "function",
  }), "HTTP resource descriptor");
}

/** Read the constructed HTTP app resource surface as package-owned descriptor material. */
export function describeHttpAppSurface(app) {
  const resources = Object.freeze((app.resources ?? []).map(describeHttpResource));
  return httpAppSurfaceContract.assert(Object.freeze({
    kind: "metroplat.http.app-surface",
    resources,
    resourceCount: resources.length,
    methods: [...new Set(resources.flatMap((resource) => [...resource.methods]))].sort(),
    produces: [...new Set(resources.flatMap((resource) => [...resource.produces]))].sort(),
    runnable: resources.every((resource) => resource.hasHandler),
  }), "HTTP app surface");
}

export function matchHttpResource(resource, path, method, ctx) {
  const methodAllowed = (resource.methods ?? ["GET", "HEAD"]).includes(method);
  if (!methodAllowed) {
    return httpResourceMatchContract.assert(Object.freeze({
      kind: "metroplat.http.resource-match",
      operation: "match-http-resource",
      path,
      method,
      methodAllowed,
      matched: false,
      params: Object.freeze({}),
      ...(resource.route === undefined ? {} : { route: resource.route }),
      ...(resource.id === undefined ? {} : { resourceId: resource.id }),
      ...(resource.name === undefined ? {} : { resourceName: resource.name }),
    }), "HTTP resource match");
  }

  const match = resource.match;
  let params;
  if (typeof match === "string") params = match === path ? Object.freeze({}) : undefined;
  else if (match instanceof RegExp) {
    const found = match.exec(path);
    params = found === null ? undefined : Object.freeze({ ...(found.groups ?? {}) });
  } else {
    const out = match(path, ctx);
    if (out === true) params = Object.freeze({});
    else if (out === false || out === null || out === undefined) params = undefined;
    else params = Object.freeze({ ...out });
  }

  return httpResourceMatchContract.assert(Object.freeze({
    kind: "metroplat.http.resource-match",
    operation: "match-http-resource",
    path,
    method,
    methodAllowed,
    matched: params !== undefined,
    params: params ?? Object.freeze({}),
    ...(resource.route === undefined ? {} : { route: resource.route }),
    ...(resource.id === undefined ? {} : { resourceId: resource.id }),
    ...(resource.name === undefined ? {} : { resourceName: resource.name }),
  }), "HTTP resource match");
}
