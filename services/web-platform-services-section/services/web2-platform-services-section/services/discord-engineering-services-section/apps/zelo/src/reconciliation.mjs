import { semanticHex } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";

const key = (value, label) => { if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(value)) throw new TypeError(`${label} must be a stable identifier`); return value; };
const instant = (value, label) => { if (!Number.isFinite(Date.parse(value))) throw new TypeError(`${label} must be an ISO timestamp`); return new Date(value).toISOString(); };
export function normalizeJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") { if (!Number.isFinite(value)) throw new TypeError("JSON numbers must be finite"); return value; }
  if (Array.isArray(value)) return Object.freeze(value.map(normalizeJson));
  if (typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError("configuration specifications must contain only plain JSON values");
  const output = {};
  for (const name of Object.keys(value).sort()) output[name] = normalizeJson((value)[name]);
  return Object.freeze(output);
}
const normalize = (input, options = {}) => {
  if (input === null || typeof input !== "object" || Object.getPrototypeOf(input) !== Object.prototype || (input.type !== "DiscordCommunityDesiredConfiguration" && input.type !== "DiscordCommunityObservedConfiguration") || input.version !== 1 || !Array.isArray(input.resources)) throw new TypeError("unsupported community configuration");
  const now = options.now ?? new Date(), maxAge = options.maxObservedAgeMs ?? 60_000;
  if (!Number.isFinite(maxAge) || maxAge < 0) throw new TypeError("maxObservedAgeMs must be nonnegative");
  if (input.type === "DiscordCommunityDesiredConfiguration") key(input.revision, "desired revision");
  else { key(input.sourceRevision, "observed source revision"); const observedAt = instant(input.observedAt, "observedAt"), age = now.getTime() - Date.parse(observedAt); if (age < -5_000 || age > maxAge) throw new TypeError("observed configuration is not fresh"); }
  const seen = new Set(), resources = input.resources.map((resource) => {
    if (resource === null || typeof resource !== "object" || Object.getPrototypeOf(resource) !== Object.prototype) throw new TypeError("resource must be a plain object");
    const resourceKey = key(resource.key, "resource key"), kind = key(resource.kind, "resource kind"); if (seen.has(resourceKey)) throw new TypeError("configuration resources must have unique keys"); seen.add(resourceKey);
    const specification = normalizeJson(resource.specification); if (Array.isArray(specification) || specification === null || typeof specification !== "object") throw new TypeError("resource specification must be a JSON object");
    return Object.freeze({ key: resourceKey, kind, specification });
  }).sort((a, b) => a.key.localeCompare(b.key));
  return Object.freeze({ ...input, ...(input.type === "DiscordCommunityObservedConfiguration" ? { observedAt: instant(input.observedAt, "observedAt") } : {}), resources: Object.freeze(resources) });
};
export const normalizeDesiredCommunityConfiguration = (input) => normalize(input);
export const normalizeObservedCommunityConfiguration = (input, options) => normalize(input, options);
export function reconcileCommunityConfiguration(desiredInput, observedInput, options = {}) {
  const desired = normalizeDesiredCommunityConfiguration(desiredInput), observed = normalizeObservedCommunityConfiguration(observedInput, options), desiredByKey = new Map(desired.resources.map((resource) => [resource.key, resource])), observedByKey = new Map(observed.resources.map((resource) => [resource.key, resource]));
  const changes = [];
  for (const resourceKey of [...new Set([...desiredByKey.keys(), ...observedByKey.keys()])].sort()) {
    const expected = desiredByKey.get(resourceKey), actual = observedByKey.get(resourceKey), action = expected === undefined ? "remove" : actual === undefined ? "create" : semanticHex(expected.specification) !== semanticHex(actual.specification) || expected.kind !== actual.kind ? "update" : undefined;
    if (!action) continue;
    const resourceKind = expected?.kind ?? actual.kind, desiredDigest = expected ? semanticHex(expected.specification) : undefined, observedDigest = actual ? semanticHex(actual.specification) : undefined;
    const material = { action, resourceKey, resourceKind, desiredDigest, observedDigest, desiredRevision: desired.revision, observedRevision: observed.sourceRevision };
    changes.push(Object.freeze({ type: "DiscordCommunityConfigurationReviewProposal", version: 1, id: `discord-community-review:${semanticHex(material)}`, executable: false, authority: "review-required", action, resourceKey, resourceKind, ...(desiredDigest ? { desiredDigest } : {}), ...(observedDigest ? { observedDigest } : {}) }));
  }
  return Object.freeze({ type: "DiscordCommunityConfigurationReconciliation", version: 1, desiredRevision: desired.revision, observedRevision: observed.sourceRevision, observedAt: observed.observedAt, changes: Object.freeze(changes) });
}
export function validateCommunityConfigurationReconciliation(input, options = {}) {
  if (input === null || typeof input !== "object" || Object.getPrototypeOf(input) !== Object.prototype || input.type !== "DiscordCommunityConfigurationReconciliation" || input.version !== 1 || !Array.isArray(input.changes)) throw new TypeError("unsupported reconciliation");
  key(input.desiredRevision, "desired revision"); key(input.observedRevision, "observed revision"); const observedAt = instant(input.observedAt, "observedAt"), now = options.now ?? new Date(), maxAge = options.maxObservedAgeMs ?? 60_000;
  if (!Number.isFinite(maxAge) || maxAge < 0) throw new TypeError("maxObservedAgeMs must be nonnegative");
  if (now.getTime() - Date.parse(observedAt) > maxAge || Date.parse(observedAt) > now.getTime() + 5_000) throw new TypeError("reconciliation observation is not fresh");
  const seen = new Set(), resourceKeys = new Set(), changes = input.changes.map((change) => {
    if (change === null || typeof change !== "object" || Object.getPrototypeOf(change) !== Object.prototype || change.type !== "DiscordCommunityConfigurationReviewProposal" || change.version !== 1 || change.executable !== false || change.authority !== "review-required" || !["create", "update", "remove"].includes(change.action)) throw new TypeError("reconciliation change is not review-only");
    key(change.resourceKey, "resource key"); key(change.resourceKind, "resource kind"); if (!/^discord-community-review:[a-f0-9]{64}$/u.test(change.id) || seen.has(change.id) || resourceKeys.has(change.resourceKey)) throw new TypeError("reconciliation change id or resource is invalid"); seen.add(change.id); resourceKeys.add(change.resourceKey);
    for (const value of [change.desiredDigest, change.observedDigest]) if (value !== undefined && !/^[a-f0-9]{64}$/u.test(value)) throw new TypeError("reconciliation digest is invalid");
    if ((change.action === "create" && (change.desiredDigest === undefined || change.observedDigest !== undefined)) || (change.action === "remove" && (change.desiredDigest !== undefined || change.observedDigest === undefined)) || (change.action === "update" && (change.desiredDigest === undefined || change.observedDigest === undefined))) throw new TypeError("reconciliation digests do not match action");
    const material = { action: change.action, resourceKey: change.resourceKey, resourceKind: change.resourceKind, desiredDigest: change.desiredDigest, observedDigest: change.observedDigest, desiredRevision: input.desiredRevision, observedRevision: input.observedRevision };
    if (change.id !== `discord-community-review:${semanticHex(material)}`) throw new TypeError("reconciliation change id does not match proposal");
    return Object.freeze({ ...change });
  });
  return Object.freeze({ ...input, observedAt, changes: Object.freeze(changes) });
}
