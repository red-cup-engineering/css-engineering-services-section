import type { RequestTrace, RequestTraceEntry } from "./request.mts";
import { appendEntries, claimOf } from "./request.mts";
import { routeAdmissionReport, routeAllowHeader, routeMethodAllowed } from "./route-admission.mts";

/** The request semantics shared by Fetch and the native Node transport. */
export type PipelineContext = {
  url: URL;
  params: Readonly<Record<string, string>>;
  trace: RequestTrace;
  negotiatedType?: string;
  negotiatedLanguage?: string;
  route?: string;
  routeTemplate?: string;
  matchedRoute?: string;
  routeId?: string;
  routeName?: string;
};
export type PipelineResource<C> = {
  match: string | RegExp | ((path: string, context: C) => boolean | Record<string, string> | null | undefined);
  methods?: readonly string[];
  produces?: readonly string[];
  languages?: readonly string[];
  route?: string;
  id?: string;
  name?: string;
  middlewares?: readonly ((context: C) => unknown)[];
  handler: (context: C) => unknown;
};
export type PipelineApplication<C> = {
  resources?: readonly PipelineResource<C>[];
  middlewares?: readonly ((context: C) => unknown)[];
  onRequest?: (context: C) => unknown;
};
export type PipelineRefusal = { status: number; title: string; headers?: Record<string, string>; evidence?: unknown };
export type PipelineEffects<C> = {
  accept(value: unknown, context: C): Promise<boolean>;
  refuse(refusal: PipelineRefusal, context: C): Promise<void>;
  preflight?(context: C): Promise<boolean>;
  admitted?(context: C): void;
  matched?(resource: PipelineResource<C>, context: C): void;
};

export function matchResource<C>(resource: PipelineResource<C>, path: string, context: C): Record<string, string> | false {
  const match = resource.match;
  if (typeof match === "function") {
    const result = match(path, context);
    return result ? typeof result === "object" ? result : {} : false;
  }
  if (match instanceof RegExp) {
    // Reusing a global/sticky regular expression must not change route identity.
    const result = new RegExp(match.source, match.flags.replace(/[gy]/g, "")).exec(path);
    return result ? { ...result.groups } : false;
  }
  if (!match.includes(":")) return match === path ? {} : false;
  const parts = match.split("/"), actual = path.split("/");
  if (parts.length !== actual.length) return false;
  const params: Record<string, string> = {};
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index]!, value = actual[index]!;
    if (part.startsWith(":")) params[part.slice(1)] = decodeURIComponent(value);
    else if (part !== value) return false;
  }
  return params;
}

/** One ordered middleware, routing and admission pipeline; effects belong to the caller's transport. */
export async function dispatchApplication<C extends PipelineContext>(
  application: PipelineApplication<C>, context: C,
  request: { method: string; accept?: string; acceptLanguage?: string }, effects: PipelineEffects<C>,
): Promise<void> {
  async function stages(stages: readonly ((context: C) => unknown)[]): Promise<boolean> {
    for (const stage of stages) {
      const result = await stage(context);
      if (Array.isArray(result)) {
        context.trace = appendEntries(context.trace, result as RequestTraceEntry[]);
      } else if (result === true || await effects.accept(result, context)) return true;
    }
    return false;
  }
  if (application.onRequest && await stages([application.onRequest])) return;
  if (await effects.preflight?.(context)) return;
  if (await stages(application.middlewares ?? [])) return;
  const method = claimOf(context.trace, "method") ?? request.method;
  type Match = { resource: PipelineResource<C>; params: Record<string, string> };
  let selected: Match | null = null;
  let firstMatch: Match | null = null;
  const matchingMethods = new Set<string>();
  let unrestricted = false;
  try {
    // Malformed URL escapes are a request refusal, never an application exception.
    decodeURI(context.url.pathname);
    for (const resource of application.resources ?? []) {
      const params = matchResource(resource, context.url.pathname, context);
      if (params === false) continue;
      firstMatch ??= { resource, params };
      if (resource.methods) for (const allowed of resource.methods) matchingMethods.add(allowed);
      else unrestricted = true;
      if (!selected && routeMethodAllowed(resource, method)) selected = { resource, params };
      // Declaration order resolves overlapping routes. Method-disjoint resources
      // can share a path; representation refusal does not select another route.
      // OPTIONS and 405 need all path matches to report the complete Allow set.
      if (selected && method.toUpperCase() !== "OPTIONS") break;
    }
  } catch (error) {
    if (!(error instanceof URIError)) throw error;
    await effects.refuse({ status: 400, title: "Bad Request" }, context);
    return;
  }
  selected ??= firstMatch;
  const found = selected?.resource ?? null;
  const allow = firstMatch && !unrestricted ? routeAllowHeader({ methods: [...matchingMethods] }) : null;
  if (selected) {
    const resource = selected.resource;
    const route = resource.route ?? (typeof resource.match === "string" ? resource.match : resource.match instanceof RegExp ? resource.match.toString() : "function");
    context.params = Object.freeze(selected.params);
    context.route = context.routeTemplate = context.matchedRoute = route;
    if (resource.id !== undefined) context.routeId = resource.id;
    if (resource.name !== undefined) context.routeName = resource.name;
    effects.matched?.(resource, context);
  }
  if (found && method.toUpperCase() === "OPTIONS" && found.methods) {
    await effects.refuse({ status: 204, title: "", ...(allow ? { headers: { Allow: allow } } : {}) }, context);
    return;
  }
  const admission = routeAdmissionReport({
    trace: context.trace, resource: found, method,
    ...(request.accept !== undefined ? { accept: request.accept } : {}),
    ...(request.acceptLanguage !== undefined ? { acceptLanguage: request.acceptLanguage } : {}),
  });
  if (admission.negotiatedType !== undefined) context.negotiatedType = admission.negotiatedType;
  if (admission.negotiatedLanguage !== undefined) context.negotiatedLanguage = admission.negotiatedLanguage;
  effects.admitted?.(context);
  const settled = admission.settled;
  if (settled.value !== "potential") {
    const status = settled.value === "absurd" ? 404 : settled.value === "stable" ? 500
      : admission.denial === "method" ? 405 : admission.denial === "accept" || admission.denial === "accept-language" ? 406 : 403;
    const title = ({ 404: "Not Found", 500: "Contradicted Request Evidence", 405: "Method Not Allowed", 406: "Not Acceptable", 403: "Forbidden" })[status]!;
    await effects.refuse({ status, title,
      ...(allow && status === 405 ? { headers: { Allow: allow } } : {}),
      ...(status === 500 ? { evidence: settled.section.contradicted } : {}),
    }, context);
    return;
  }
  context.trace = settled.trace;
  if (await stages(found!.middlewares ?? [])) return;
  await effects.accept(await found!.handler(context), context);
}
