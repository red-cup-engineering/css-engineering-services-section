import { readFile } from "node:fs/promises";

import { normalizeCommunityResponseProgram } from "@red-cup-engineering/programmable-community-response-service";

const identifier = (value, label) => { if (typeof value !== "string" || !/^[A-Za-z][A-Za-z0-9._:-]{0,127}$/u.test(value)) throw new TypeError(`${label} must be an identifier`); return value; };
function parseCommunityResponseConfig(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new TypeError("community response config must be an object");
  const value = input, provider = value["rateBudgetObservationProvider"];
  if (value["type"] !== "ZeloCommunityResponseShadowConfig" || value["version"] !== 1 || provider === null || typeof provider !== "object" || Array.isArray(provider)) throw new TypeError("invalid community response config");
  const providerValue = provider, maxObservationAgeMs = providerValue["maxObservationAgeMs"];
  if (providerValue["type"] !== "ZeloRateBudgetObservationProviderConfig" || providerValue["version"] !== 1 || !Number.isSafeInteger(maxObservationAgeMs) || (maxObservationAgeMs) < 1 || (maxObservationAgeMs) > 300_000) throw new TypeError("invalid rate budget observation provider config");
  const program = normalizeCommunityResponseProgram(value["program"]);
  return Object.freeze({ type: "ZeloCommunityResponseShadowConfig", version: 1, program, rateBudgetObservationProvider: Object.freeze({ type: "ZeloRateBudgetObservationProviderConfig", version: 1, id: identifier(providerValue["id"], "rate budget provider id"), maxObservationAgeMs: maxObservationAgeMs }) });
}
function parseModerationConfig(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new TypeError("moderation config must be an object");
  const value = input, maxStateAgeMs = value["maxStateAgeMs"];
  if (value["type"] !== "ZeloModerationShadowConfig" || value["version"] !== 1 || !Number.isSafeInteger(maxStateAgeMs) || (maxStateAgeMs) < 1 || (maxStateAgeMs) > 300_000) throw new TypeError("invalid moderation config");
  return Object.freeze({ type: "ZeloModerationShadowConfig", version: 1, purpose: identifier(value["purpose"], "moderation purpose"), maxStateAgeMs: maxStateAgeMs });
}
function parseMemberLifecycleConfig(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new TypeError("member lifecycle config must be an object");
  const value = input, kinds = value["permittedKinds"], policy = value["policy"];
  if (value["type"] !== "ZeloMemberLifecycleShadowConfig" || value["version"] !== 1 || !Array.isArray(kinds) || kinds.length === 0 || policy === null || typeof policy !== "object" || Array.isArray(policy)) throw new TypeError("invalid member lifecycle config");
  const permittedKinds = kinds.map((kind) => {
    if (kind !== "arrival" && kind !== "leave" && kind !== "milestone" && kind !== "reengagement") throw new TypeError("invalid member lifecycle kind");
    return kind;
  });
  if (new Set(permittedKinds).size !== permittedKinds.length) throw new TypeError("duplicate member lifecycle kind");
  return Object.freeze({ type: "ZeloMemberLifecycleShadowConfig", version: 1, communityId: identifier(value["communityId"], "member lifecycle community id"), purpose: identifier(value["purpose"], "member lifecycle purpose"), permittedKinds: Object.freeze(permittedKinds), policy: policy });
}
export function parseZeloRuntimeConfig(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Zelo config must be an object");
  const value = input, mode = value["mode"], bindings = value["bindings"], projectionKey = value["projectionKey"], communityResponse = value["communityResponse"], moderation = value["moderation"], memberLifecycle = value["memberLifecycle"];
  if (value["type"] !== "ZeloRuntimeConfig" || value["version"] !== 1 || !["disabled", "shadow"].includes(String(mode)) || !Array.isArray(bindings) || typeof projectionKey !== "string" || projectionKey.length < 32) throw new TypeError("invalid Zelo config");
  return Object.freeze({ type: "ZeloRuntimeConfig", version: 1, mode: mode, bindings: Object.freeze(bindings), projectionKey, ...(communityResponse === undefined ? {} : { communityResponse: parseCommunityResponseConfig(communityResponse) }), ...(moderation === undefined ? {} : { moderation: parseModerationConfig(moderation) }), ...(memberLifecycle === undefined ? {} : { memberLifecycle: parseMemberLifecycleConfig(memberLifecycle) }) });
}
export async function loadZeloRuntimeConfig(source = process.env) {
  const file = source["ZELO_REACTION_CONFIG_FILE"]; if (!file) throw new Error("ZELO_REACTION_CONFIG_FILE is required");
  const config = parseZeloRuntimeConfig(JSON.parse(await readFile(file, "utf8"))), override = source["ZELO_REACTION_MODE"];
  if (override !== undefined && override !== "disabled" && override !== "shadow") throw new Error("ZELO_REACTION_MODE may only disable or shadow");
  return Object.freeze({ ...config, mode: override ?? config.mode });
}
