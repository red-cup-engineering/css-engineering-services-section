import { validatePublicRelease } from "@red-cup-engineering/web-release-candidate-service";
import { validateWebSurfaceSpecification } from "./web-surface.mjs";

const CAPABILITY_KEYS = new Set(["assets", "kv", "r2", "durableObjects", "websocket"]);
const BINDING_NAMES = /^[A-Z][A-Z0-9_]{0,127}$/u;
const IDENTIFIERS = /^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/u;
const freeze = (value) => Object.freeze(value);
const issue = (code, path, message) => ({ code, path, message });
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const unique = (values) => new Set(values).size === values.length;
const named = (value, field) => isRecord(value) && typeof value.binding === "string" && BINDING_NAMES.test(value.binding) && typeof value[field] === "string" && IDENTIFIERS.test(value[field]);

/** Project a declared Web surface into typed Cloudflare Worker binding input without an effect. */
export function projectCloudflareWorkerBinding(input) {
  const issues = [];
  if (!isRecord(input)) return { ok: false, issues: freeze([issue("input", "", "input must be an object")]) };
  const checkedSurface = validateWebSurfaceSpecification(input.surface);
  if (!checkedSurface.ok) issues.push(...checkedSurface.issues.map((entry) => ({ ...entry, path: `surface.${entry.path}` })));
  const release = validatePublicRelease(input.release);
  if (!release.valid) issues.push(...release.diagnostics.map((diagnostic) => issue("public-release", "release", diagnostic.message)));
  if (issues.length > 0) return { ok: false, issues: freeze(issues) };
  const surface = checkedSurface.value;
  const publicRelease = input.release;
  if (surface.delivery.kind === "release" && publicRelease.artifact.manifest.digest !== surface.delivery.manifest.digest) issues.push(issue("artifact-manifest", "release.artifact.manifest", "release artifact manifest must equal the surface release manifest"));
  const capabilities = input.capabilities ?? {};
  if (!isRecord(capabilities) || Object.keys(capabilities).some((key) => !CAPABILITY_KEYS.has(key))) issues.push(issue("capabilities", "capabilities", "capabilities may contain only assets, kv, r2, durableObjects, and websocket"));
  const declared = new Set(surface.bindings);
  const requireDeclared = (kind, present) => { if (present && !declared.has(kind)) issues.push(issue("undeclared-capability", `capabilities.${kind}`, `${kind} is not declared by the Web surface`)); };
  const capabilityArrays = [["kv", "kv", "namespaceId"], ["r2", "r2", "bucketName"], ["durableObjects", "durable-object", "className"]];
  if (isRecord(capabilities.assets)) {
    requireDeclared("assets", true);
    if (typeof capabilities.assets.binding !== "string" || !BINDING_NAMES.test(capabilities.assets.binding)) issues.push(issue("assets", "capabilities.assets.binding", "assets binding must be an uppercase Worker binding name"));
  } else if (capabilities.assets !== undefined) issues.push(issue("assets", "capabilities.assets", "assets must be a binding record"));
  for (const [property, declaration, field] of capabilityArrays) {
    const values = capabilities[property];
    if (values !== undefined) {
      requireDeclared(declaration, true);
      if (!Array.isArray(values) || values.length === 0 || !values.every((value) => named(value, field)) || !unique(values.map((value) => value.binding))) issues.push(issue("capability", `capabilities.${property}`, `${property} must be non-empty records with unique binding names`));
    }
  }
  if (capabilities.websocket !== undefined) {
    requireDeclared("websocket", capabilities.websocket === true);
    if (capabilities.websocket !== true) issues.push(issue("websocket", "capabilities.websocket", "websocket capability must be true when declared"));
  }
  const provided = new Set([...(capabilities.assets === undefined ? [] : ["assets"]), ...(capabilities.kv === undefined ? [] : ["kv"]), ...(capabilities.r2 === undefined ? [] : ["r2"]), ...(capabilities.durableObjects === undefined ? [] : ["durable-object"]), ...(capabilities.websocket === undefined ? [] : ["websocket"])]);
  for (const declaration of declared) if (!provided.has(declaration)) issues.push(issue("missing-capability", "capabilities", `${declaration} is declared by the Web surface but absent from the Worker binding`));
  if (issues.length > 0) return { ok: false, issues: freeze(issues) };
  const routes = surface.channels.flatMap((channel) => channel.routes.map((path) => freeze({ origin: channel.origin, path })));
  return { ok: true, value: freeze({
    kind: "cloudflare-worker-binding", version: 1, surfaceId: surface.id,
    releaseDigest: publicRelease.digest, artifactManifestDigest: publicRelease.artifact.manifest.digest,
    routes: freeze(routes), probes: surface.probes, state: surface.state.kind,
    capabilities: freeze({
      ...(capabilities.assets === undefined ? {} : { assets: freeze({ binding: capabilities.assets.binding }) }),
      ...(capabilities.kv === undefined ? {} : { kv: freeze(capabilities.kv.map((value) => freeze({ binding: value.binding, namespaceId: value.namespaceId })).sort((left, right) => left.binding.localeCompare(right.binding))) }),
      ...(capabilities.r2 === undefined ? {} : { r2: freeze(capabilities.r2.map((value) => freeze({ binding: value.binding, bucketName: value.bucketName })).sort((left, right) => left.binding.localeCompare(right.binding))) }),
      ...(capabilities.durableObjects === undefined ? {} : { durableObjects: freeze(capabilities.durableObjects.map((value) => freeze({ binding: value.binding, className: value.className })).sort((left, right) => left.binding.localeCompare(right.binding))) }),
      ...(capabilities.websocket === undefined ? {} : { websocket: true }),
    }),
  }) };
}
