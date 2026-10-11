import { validateWebReleaseManifest } from "@red-cup-engineering/web-release-candidate-service";

const BINDING_KINDS = new Set(["assets", "kv", "r2", "durable-object", "websocket"]);
const STATE_BINDINGS = new Set(["kv", "r2", "durable-object"]);
const DEFAULT_METHODS = Object.freeze(["GET"]);
const DEFAULT_STATUSES = Object.freeze([200]);

const issue = (code, path, message) => ({ code, path, message });
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isRoute = (value) => typeof value === "string" && value.startsWith("/") && !value.includes("?") && !value.includes("#");
const isOrigin = (value) => {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === value && !url.username && !url.password;
  } catch { return false; }
};
const unique = (values) => new Set(values).size === values.length;
const frozen = (value) => Object.freeze(value);

/** Validate a provider-neutral Web surface without invoking any provider effect. */
export function validateWebSurfaceSpecification(value) {
  const issues = [];
  if (!isRecord(value)) return { ok: false, issues: [issue("surface", "", "surface must be an object")] };
  if (typeof value.id !== "string" || value.id.length === 0) issues.push(issue("id", "id", "id must be a non-empty string"));
  if (!isRecord(value.delivery) || !["application", "release"].includes(value.delivery.kind)) {
    issues.push(issue("delivery", "delivery", "delivery must classify exactly one application or release manifest"));
  } else if (value.delivery.kind === "application" && (!Object.hasOwn(value.delivery, "application") || Object.hasOwn(value.delivery, "manifest"))) {
    issues.push(issue("delivery-ambiguity", "delivery", "application delivery requires application and refuses manifest"));
  } else if (value.delivery.kind === "release" && (!Object.hasOwn(value.delivery, "manifest") || Object.hasOwn(value.delivery, "application"))) {
    issues.push(issue("delivery-ambiguity", "delivery", "release delivery requires manifest and refuses application"));
  } else if (value.delivery.kind === "release") {
    const release = validateWebReleaseManifest(value.delivery.manifest);
    if (!release.valid) issues.push(issue("release-manifest", "delivery.manifest", release.diagnostics.map((diagnostic) => diagnostic.message).join("; ")));
  }
  if (!isRecord(value.state) || !["stateless", "stateful"].includes(value.state.kind)) issues.push(issue("state", "state", "state must be classified as stateless or stateful"));
  if (value.delivery?.kind === "release" && value.state?.kind === "stateful") {
    issues.push(issue("stateful-release", "delivery", "stateful surfaces require application delivery; a release manifest is a stateless artifact inventory"));
  }
  const bindings = Array.isArray(value.bindings) ? value.bindings : [];
  if (!Array.isArray(value.bindings) || !bindings.every((binding) => BINDING_KINDS.has(binding)) || !unique(bindings)) issues.push(issue("bindings", "bindings", "bindings must be unique declared platform binding kinds"));
  if (value.state?.kind === "stateless" && Object.hasOwn(value.state, "bindings")) issues.push(issue("state-bindings", "state.bindings", "stateless surfaces must not declare state bindings"));
  if (value.state?.kind === "stateless" && bindings.some((binding) => STATE_BINDINGS.has(binding))) issues.push(issue("state-bindings", "bindings", "stateless surfaces must not bind KV, R2, or Durable Objects"));
  if (value.state?.kind === "stateful") {
    const stateBindings = value.state.bindings;
    if (!Array.isArray(stateBindings) || stateBindings.length === 0 || !stateBindings.every((binding) => STATE_BINDINGS.has(binding)) || !unique(stateBindings)) issues.push(issue("state-bindings", "state.bindings", "stateful surfaces require unique declared KV, R2, or Durable Object state"));
    else if (!stateBindings.every((binding) => bindings.includes(binding))) issues.push(issue("state-bindings", "state.bindings", "state bindings must also be platform bindings"));
  }
  const channels = Array.isArray(value.channels) ? value.channels : [];
  if (channels.length === 0) issues.push(issue("channels", "channels", "at least one standard HTTPS origin channel is required"));
  const channelRoutes = new Set();
  const channelOrigins = new Set();
  for (const [index, channel] of channels.entries()) {
    const path = `channels[${index}]`;
    if (!isRecord(channel) || !isOrigin(channel.origin) || !Array.isArray(channel.routes) || channel.routes.length === 0 || !channel.routes.every(isRoute)) {
      issues.push(issue("channel", path, "channel requires an HTTPS origin and one or more route paths"));
      continue;
    }
    if (channelOrigins.has(channel.origin)) issues.push(issue("duplicate-origin", path, `duplicate origin ${channel.origin}`));
    channelOrigins.add(channel.origin);
    for (const route of channel.routes) {
      const key = `${channel.origin}${route}`;
      if (channelRoutes.has(key)) issues.push(issue("duplicate-route", path, `duplicate origin and route ${key}`));
      channelRoutes.add(key);
    }
  }
  const probes = Array.isArray(value.probes) ? value.probes : [];
  for (const [index, probe] of probes.entries()) {
    if (!isRecord(probe) || !isOrigin(probe.origin) || !isRoute(probe.path) || (probe.methods !== undefined && (!Array.isArray(probe.methods) || !probe.methods.every((method) => typeof method === "string" && method.length > 0))) || (probe.statuses !== undefined && (!Array.isArray(probe.statuses) || !probe.statuses.every((status) => Number.isInteger(status) && status >= 100 && status <= 599)))) issues.push(issue("probe", `probes[${index}]`, "probe requires HTTPS origin, route path, and valid optional methods/statuses"));
  }
  for (const key of channelRoutes) {
    const split = key.indexOf("/", "https://".length);
    const origin = key.slice(0, split);
    const path = key.slice(split);
    if (!probes.some((probe) => probe?.origin === origin && probe?.path === path)) issues.push(issue("missing-route-probe", "probes", `declared route ${key} has no receiver probe`));
  }
  if (issues.length > 0) return { ok: false, issues: frozen(issues) };
  const delivery = value.delivery.kind === "application" ? frozen({ kind: "application", application: value.delivery.application }) : frozen({ kind: "release", manifest: value.delivery.manifest });
  const state = value.state.kind === "stateless" ? frozen({ kind: "stateless" }) : frozen({ kind: "stateful", bindings: frozen([...value.state.bindings].sort()) });
  return { ok: true, value: frozen({ id: value.id, delivery, state, bindings: frozen([...bindings].sort()), channels: frozen(channels.map((channel) => frozen({ origin: channel.origin, routes: frozen([...channel.routes].sort()) })).sort((left, right) => left.origin.localeCompare(right.origin))), probes: frozen(probes.map((probe) => frozen({ origin: probe.origin, path: probe.path, methods: frozen([...(probe.methods ?? DEFAULT_METHODS)].sort()), statuses: frozen([...(probe.statuses ?? DEFAULT_STATUSES)].sort((a, b) => a - b)) })).sort((left, right) => `${left.origin}${left.path}`.localeCompare(`${right.origin}${right.path}`))) }) };
}

/** Validate a whole public family and refuse cross-surface origin/route collisions. */
export function createWebSurfacePlatform(surfaces) {
  if (!Array.isArray(surfaces)) return { ok: false, issues: [issue("surfaces", "surfaces", "surfaces must be an array")] };
  const values = [];
  const issues = [];
  const routeOwners = new Map();
  const ids = new Set();
  for (const [index, candidate] of surfaces.entries()) {
    const result = validateWebSurfaceSpecification(candidate);
    if (!result.ok) { issues.push(...result.issues.map((entry) => ({ ...entry, path: `surfaces[${index}].${entry.path}` }))); continue; }
    if (ids.has(result.value.id)) issues.push(issue("duplicate-id", `surfaces[${index}].id`, `duplicate surface id ${result.value.id}`));
    ids.add(result.value.id);
    for (const channel of result.value.channels) for (const route of channel.routes) {
      const key = `${channel.origin}${route}`;
      const owner = routeOwners.get(key);
      if (owner !== undefined) issues.push(issue("duplicate-route", `surfaces[${index}].channels`, `${key} is already owned by ${owner}`));
      else routeOwners.set(key, result.value.id);
    }
    values.push(result.value);
  }
  if (issues.length > 0) return { ok: false, issues: frozen(issues) };
  return { ok: true, value: frozen({ surfaces: frozen(values.sort((left, right) => left.id.localeCompare(right.id))) }) };
}

/** Pure provider-input projection. A Cloudflare adapter can consume this without recovering site-local configuration. */
export function projectWebSurfaceBinding(surface) {
  const checked = validateWebSurfaceSpecification(surface);
  if (!checked.ok) throw new TypeError(checked.issues.map((entry) => entry.message).join("; "));
  const value = checked.value;
  return frozen({ id: value.id, delivery: value.delivery.kind, state: value.state.kind, origins: value.channels, bindings: value.bindings, probes: value.probes });
}
