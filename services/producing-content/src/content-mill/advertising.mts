/**
 * advertising - aggregate advertising performance carriers.
 *
 * The mill owns the privacy-preserving publication packet. A site owns where it
 * stores event lines and which ad policy it mounts.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource, parseLines, requireJsonValue, serializeLines } from "@red-cup-engineering/relating/codecs";

export const AdProviderSchema = { anyOf: [{ const: "adsense" }, { const: "a-ads" }] } as const;

export const AdProviderStatusSchema = { anyOf: [{ const: "configured" }, { const: "planned" }, { const: "disabled" }] } as const;

export const AdPlacementSchema = { anyOf: [{ const: "masthead" }, { const: "home-lead" }, { const: "article-banner" }, { const: "header" }, { const: "in-article" }, { const: "footer" }, { const: "custom" }] } as const;

export const AdUnitSchema = { title: "AdUnit", additionalProperties: false, type: "object", required: ["provider", "id", "placement"], properties: { provider: AdProviderSchema, id: { minLength: 1, type: "string" }, placement: AdPlacementSchema, label: { minLength: 1, type: "string" } } } as const;

export const AdPlacementDecisionReasonSchema = { anyOf: [{ const: "selected-unit" }, { const: "no-unit" }] } as const;

export const AdPlacementDecisionSchema = { $id: "producing-content/content-mill/ad-placement-decision", title: "AdPlacementDecision", additionalProperties: false, type: "object", required: ["kind", "provider", "providerStatus", "placement", "key", "reason"], properties: { kind: { const: "producing-content.ad-placement-decision" }, provider: AdProviderSchema, providerStatus: AdProviderStatusSchema, placement: AdPlacementSchema, key: { minLength: 1, type: "string" }, unit: AdUnitSchema, reason: AdPlacementDecisionReasonSchema } } as const;

export const AdProviderParameterizationSchema = { title: "AdProviderParameterization", additionalProperties: false, type: "object", required: ["provider", "status", "units", "scriptHosts", "frameHosts", "imageHosts", "connectHosts", "adsTxtLines", "privacyFragments"], properties: { provider: AdProviderSchema, status: AdProviderStatusSchema, units: { type: "array", items: AdUnitSchema }, scriptHosts: { type: "array", items: { minLength: 1, type: "string" } }, frameHosts: { type: "array", items: { minLength: 1, type: "string" } }, imageHosts: { type: "array", items: { minLength: 1, type: "string" } }, connectHosts: { type: "array", items: { minLength: 1, type: "string" } }, adsTxtLines: { type: "array", items: { minLength: 1, type: "string" } }, privacyFragments: { type: "array", items: { minLength: 1, type: "string" } } } } as const;

export const AdvertisingPolicySchema = { $id: "producing-content/content-mill/advertising-policy", title: "AdvertisingPolicy", additionalProperties: false, type: "object", required: ["kind", "enabled", "providers", "units", "privacyParagraph", "contentSecurityPolicy", "constraints"], properties: { kind: { const: "producing-content.advertising-policy" }, enabled: { type: "boolean" }, providers: { type: "array", items: AdProviderParameterizationSchema }, units: { type: "array", items: AdUnitSchema }, adsTxt: { type: "string" }, privacyParagraph: { type: "string" }, contentSecurityPolicy: { type: "string" }, constraints: { type: "array", items: { minLength: 1, type: "string" } } } } as const;

export const AdPerformanceInputSchema = { $id: "producing-content/content-mill/ad-performance-input", title: "AdPerformanceInput", additionalProperties: false, type: "object", required: ["provider", "path", "day"], properties: { provider: AdProviderSchema, path: { minLength: 1, pattern: "^/[\\x21-\\x7e]{0,512}$", type: "string" }, day: { pattern: "^\\d{4}-\\d{2}-\\d{2}$", type: "string" }, section: { minLength: 1, type: "string" }, tags: { type: "array", items: { minLength: 1, type: "string" } }, impressions: { minimum: 0, type: "integer" }, clicks: { minimum: 0, type: "integer" }, revenueMicros: { minimum: 0, type: "integer" } } } as const;

export const AdPerformanceEventSchema = { $id: "producing-content/content-mill/ad-performance-event", title: "AdPerformanceEvent", additionalProperties: false, type: "object", required: ["kind", "at", "provider", "path", "day", "tags", "impressions", "clicks", "revenueMicros"], properties: { kind: { const: "producing-content.ad-performance-event" }, at: { minLength: 1, type: "string" }, provider: AdProviderSchema, path: { minLength: 1, type: "string" }, day: { pattern: "^\\d{4}-\\d{2}-\\d{2}$", type: "string" }, section: { minLength: 1, type: "string" }, tags: { type: "array", items: { minLength: 1, type: "string" } }, impressions: { minimum: 0, type: "integer" }, clicks: { minimum: 0, type: "integer" }, revenueMicros: { minimum: 0, type: "integer" } } } as const;

export const AdPerformanceBucketSchema = { $id: "producing-content/content-mill/ad-performance-bucket", title: "AdPerformanceBucket", additionalProperties: false, type: "object", required: ["impressions", "clicks", "revenueMicros", "rpmMicros", "cpcMicros"], properties: { impressions: { minimum: 0, type: "integer" }, clicks: { minimum: 0, type: "integer" }, revenueMicros: { minimum: 0, type: "integer" }, rpmMicros: { minimum: 0, type: "integer" }, cpcMicros: { minimum: 0, type: "integer" } } } as const;

const AdPerformanceBucketValueSchema = { title: "AdPerformanceBucketValue", additionalProperties: false, type: "object", required: AdPerformanceBucketSchema.required, properties: AdPerformanceBucketSchema.properties } as const;

export const AdPerformanceReadingSchema = { $id: "producing-content/content-mill/ad-performance-reading", title: "AdPerformanceReading", additionalProperties: false, type: "object", required: ["kind", "eventCount", "totals", "byProvider", "bySection", "byTag", "constraints"], properties: { kind: { const: "producing-content.ad-performance-reading" }, eventCount: { minimum: 0, type: "integer" }, totals: AdPerformanceBucketValueSchema, byProvider: { type: "object", additionalProperties: AdPerformanceBucketValueSchema }, bySection: { type: "object", additionalProperties: AdPerformanceBucketValueSchema }, byTag: { type: "object", additionalProperties: AdPerformanceBucketValueSchema }, constraints: { type: "array", items: { minLength: 1, type: "string" } } } } as const;

export type AdProvider = FromSchema<typeof AdProviderSchema>;
export type AdProviderStatus = FromSchema<typeof AdProviderStatusSchema>;
export type AdPlacement = FromSchema<typeof AdPlacementSchema>;
export type AdUnit = FromSchema<typeof AdUnitSchema>;
export type AdPlacementDecisionReason = FromSchema<typeof AdPlacementDecisionReasonSchema>;
export type AdPlacementDecision = FromSchema<typeof AdPlacementDecisionSchema>;
export type AdProviderParameterization = FromSchema<typeof AdProviderParameterizationSchema>;
export type AdvertisingPolicy = FromSchema<typeof AdvertisingPolicySchema>;
export type AdPerformanceInput = FromSchema<typeof AdPerformanceInputSchema>;
export type AdPerformanceEvent = FromSchema<typeof AdPerformanceEventSchema>;
export type AdPerformanceBucket = FromSchema<typeof AdPerformanceBucketSchema>;
export type AdPerformanceReading = FromSchema<typeof AdPerformanceReadingSchema>;

export const AD_PERFORMANCE_CONSTRAINTS = Object.freeze([
  "Aggregate ad-performance records only; do not include IP addresses, user agents, cookies, browser fingerprints, or reader identifiers.",
  "Provider routing can use page, section, tag, day, impressions, clicks, and revenue, but never reader identity.",
]);

export const AD_PERFORMANCE_LOG_FILE = "ad-performance.jsonl";

export const ADVERTISING_POLICY_CONSTRAINTS = Object.freeze([
  "Advertising policy is provider-parameterized; sites choose mounted units and rendering, not ad-provider law.",
  "Ad routing may use aggregate provider, path, section, tag, day, impressions, clicks, and revenue only.",
  "Do not route, personalize, or optimize ads by reader identity, IP address, user agent, cookies, browser fingerprints, or profiles.",
]);

export const adPerformanceInputCarrier = carrierFrom(AdPerformanceInputSchema);

export const advertisingPolicyCarrier = carrierFrom(AdvertisingPolicySchema);

export const adPlacementDecisionCarrier = carrierFrom(AdPlacementDecisionSchema);

export const adPerformanceEventCarrier = carrierFrom(AdPerformanceEventSchema);

export const adPerformanceBucketCarrier = carrierFrom(AdPerformanceBucketSchema);

export const adPerformanceReadingCarrier = carrierFrom(AdPerformanceReadingSchema);

function uniq(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values.filter((value) => value.trim() !== ""))]);
}

function compactText(values: readonly string[]): string {
  return values.filter((value) => value.trim() !== "").join(" ");
}

function adUnit(provider: AdProvider, id: string, placement: AdPlacement, label?: string): AdUnit {
  return {
    provider,
    id,
    placement,
    ...(label === undefined ? {} : { label }),
  };
}

export function adsenseProvider(input: Readonly<{
  client?: string;
  slots?: Partial<Record<"header" | "in-article" | "footer", string>>;
}> = {}): AdProviderParameterization {
  const client = input.client?.trim();
  const publisherId = client?.replace(/^ca-/, "");
  const slots = input.slots ?? {};
  const units = Object.entries(slots).flatMap(([placement, id]) =>
    id === undefined || id.trim() === ""
      ? []
      : [adUnit("adsense", id.trim(), placement as "header" | "in-article" | "footer")]);
  const configured = client !== undefined && client !== "";
  return {
    provider: "adsense",
    status: configured ? "configured" : "planned",
    units,
    scriptHosts: configured ? [
      "https://pagead2.googlesyndication.com",
      "https://googleads.g.doubleclick.net",
      "https://tpc.googlesyndication.com",
    ] : [],
    frameHosts: configured ? [
      "https://googleads.g.doubleclick.net",
      "https://tpc.googlesyndication.com",
    ] : [],
    imageHosts: configured ? [
      "https://*.googlesyndication.com",
      "https://*.doubleclick.net",
      "https://*.google.com",
    ] : [],
    connectHosts: configured ? [
      "https://*.googlesyndication.com",
      "https://*.doubleclick.net",
    ] : [],
    adsTxtLines: configured && publisherId !== undefined && publisherId !== ""
      ? [`google.com, ${publisherId}, DIRECT, f08c47fec0942fa0`]
      : [],
    privacyFragments: configured
      ? ["Pages may carry advertising served by Google AdSense. Google and its partners may use cookies or similar technologies to serve and measure ads; see Google's advertising technologies policy for collection and opt-out details."]
      : [],
  };
}

export function aAdsProvider(input: Readonly<{
  units?: readonly string[];
  placements?: readonly AdPlacement[];
}> = {}): AdProviderParameterization {
  const placements = input.placements ?? ["masthead", "home-lead", "article-banner", "footer"];
  const units = (input.units ?? [])
    .map((id) => id.trim())
    .filter((id) => id !== "")
    .flatMap((id) => placements.map((placement) => adUnit("a-ads", id, placement)));
  const configured = units.length > 0;
  return {
    provider: "a-ads",
    status: configured ? "configured" : "planned",
    units,
    scriptHosts: [],
    frameHosts: configured ? ["https://acceptable.a-ads.com"] : [],
    imageHosts: [],
    connectHosts: [],
    adsTxtLines: [],
    privacyFragments: configured
      ? ["Pages may carry A-Ads units in embedded frames. Those frames are served by A-Ads; the publication does not send A-Ads reader identifiers, and ad-performance records remain aggregate."]
      : [],
  };
}

export function advertisingContentSecurityPolicyFromProviders(providers: readonly AdProviderParameterization[]): string {
  const scriptHosts = uniq(providers.flatMap((provider) => provider.scriptHosts));
  const frameHosts = uniq(providers.flatMap((provider) => provider.frameHosts));
  const imageHosts = uniq(providers.flatMap((provider) => provider.imageHosts));
  const connectHosts = uniq(providers.flatMap((provider) => provider.connectHosts));
  const adScript = scriptHosts.length === 0 ? "" : ` ${scriptHosts.join(" ")}`;
  const adFrame = frameHosts.length === 0 ? "" : `frame-src ${frameHosts.join(" ")}; `;
  const adImg = imageHosts.length === 0 ? "" : ` ${imageHosts.join(" ")}`;
  const adConnect = connectHosts.length === 0 ? "" : ` ${connectHosts.join(" ")}`;
  return "default-src 'self'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; " +
    `script-src 'self' 'unsafe-inline'${adScript}; ` +
    `img-src 'self' data:${adImg}; ` +
    `connect-src 'self'${adConnect}; ` +
    adFrame +
    "base-uri 'self'; frame-ancestors 'none'; object-src 'none'";
}

export function advertisingPolicy(input: Readonly<{
  providers?: readonly AdProviderParameterization[];
  constraints?: readonly string[];
}> = {}): AdvertisingPolicy {
  const providers = Object.freeze([...(input.providers ?? [])]);
  const units = Object.freeze(providers.flatMap((provider) => provider.units));
  const adsTxt = providers.flatMap((provider) => provider.adsTxtLines).join("\n");
  const privacy = compactText([
    ...providers.flatMap((provider) => provider.privacyFragments),
    units.length === 0
      ? "Pages currently carry no third-party advertising. If that changes, this policy will say so before it does."
      : "The publication does not pass ad providers reader identity itself.",
  ]);
  return advertisingPolicyCarrier.assert({
    kind: "producing-content.advertising-policy" as const,
    enabled: units.length > 0,
    providers,
    units,
    ...(adsTxt === "" ? {} : { adsTxt: `${adsTxt}\n` }),
    privacyParagraph: privacy,
    contentSecurityPolicy: advertisingContentSecurityPolicyFromProviders(providers),
    constraints: [...(input.constraints ?? ADVERTISING_POLICY_CONSTRAINTS)],
  }, "advertising policy");
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash;
}

export function chooseAdUnit(provider: AdProviderParameterization, placement: AdPlacement, key: string): AdUnit | undefined {
  const candidates = provider.units.filter((unit) => unit.placement === placement || unit.placement === "custom");
  if (candidates.length === 0) return undefined;
  return candidates[hashString(key) % candidates.length];
}

export function adPlacementDecision(input: Readonly<{
  provider: AdProvider;
  providerStatus: AdProviderStatus;
  placement: AdPlacement;
  key: string;
  unit?: AdUnit;
}>): AdPlacementDecision {
  return adPlacementDecisionCarrier.assert({
    kind: "producing-content.ad-placement-decision" as const,
    provider: input.provider,
    providerStatus: input.providerStatus,
    placement: input.placement,
    key: input.key,
    ...(input.unit === undefined ? {} : { unit: input.unit }),
    reason: input.unit === undefined ? "no-unit" as const : "selected-unit" as const,
  }, "ad placement decision");
}

export function chooseAdPlacementDecision(provider: AdProviderParameterization, placement: AdPlacement, key: string): AdPlacementDecision {
  const unit = chooseAdUnit(provider, placement, key);
  return adPlacementDecision({
    provider: provider.provider,
    providerStatus: provider.status,
    placement,
    key,
    ...(unit === undefined ? {} : { unit }),
  });
}

export function advertisingPolicyTerm(input: AdvertisingPolicy): Tm {
  return carrierToTerm(jsonResource(advertisingPolicyCarrier.assert(input), "advertising policy"));
}

export function adPlacementDecisionTerm(input: AdPlacementDecision): Tm {
  return carrierToTerm(jsonResource(adPlacementDecisionCarrier.assert(input), "ad placement decision"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function maybeString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

function requiredProvider(value: unknown): AdProvider {
  if (value === "adsense" || value === "a-ads") return value;
  throw new TypeError("provider must be adsense or a-ads");
}

function requiredPath(value: unknown): string {
  const path = maybeString(value);
  if (path === undefined || !/^\/[\x21-\x7e]{0,512}$/.test(path)) throw new TypeError("path must be a site-relative path");
  return path;
}

function requiredDay(value: unknown): string {
  const day = maybeString(value);
  if (day === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new TypeError("day must be YYYY-MM-DD");
  return day;
}

function nonNegativeInteger(value: unknown, field: string): number {
  const number = value === undefined || value === null || value === "" ? 0 : Number(value);
  if (!Number.isInteger(number) || number < 0) throw new TypeError(`${field} must be a non-negative integer`);
  return number;
}

function optionalTags(value: unknown): readonly string[] {
  if (value === undefined || value === null || value === "") return Object.freeze([]);
  if (!Array.isArray(value)) throw new TypeError("tags must be an array");
  return Object.freeze(value.map((item, index) => {
    const tag = maybeString(item)?.trim();
    if (tag === undefined || tag === "") throw new TypeError(`tags[${index}] must be a non-empty string`);
    return tag;
  }));
}

export function normalizeAdPerformanceInput(input: unknown): AdPerformanceInput {
  if (!isRecord(input)) throw new TypeError("ad performance input must be a JSON object");
  const section = maybeString(input["section"]);
  return adPerformanceInputCarrier.assert({
    provider: requiredProvider(input["provider"]),
    path: requiredPath(input["path"]),
    day: requiredDay(input["day"]),
    ...(section === undefined ? {} : { section }),
    tags: optionalTags(input["tags"]),
    impressions: nonNegativeInteger(input["impressions"], "impressions"),
    clicks: nonNegativeInteger(input["clicks"], "clicks"),
    revenueMicros: nonNegativeInteger(input["revenueMicros"], "revenueMicros"),
  }, "ad performance input");
}

export function adPerformanceEvent(input: AdPerformanceInput, at = new Date().toISOString()): AdPerformanceEvent {
  return adPerformanceEventCarrier.assert({
    kind: "producing-content.ad-performance-event" as const,
    at,
    provider: input.provider,
    path: input.path,
    day: input.day,
    ...(input.section === undefined ? {} : { section: input.section }),
    tags: [...(input.tags ?? [])],
    impressions: input.impressions ?? 0,
    clicks: input.clicks ?? 0,
    revenueMicros: input.revenueMicros ?? 0,
  }, "ad performance event");
}

export function adPerformanceEventFromRecord(record: Readonly<Record<string, unknown>>): AdPerformanceEvent | undefined {
  if (
    record["kind"] !== "producing-content.ad-performance-event" ||
    (record["provider"] !== "adsense" && record["provider"] !== "a-ads") ||
    typeof record["path"] !== "string" ||
    typeof record["day"] !== "string"
  ) {
    return undefined;
  }
  return adPerformanceEvent({
    provider: record["provider"],
    path: record["path"],
    day: record["day"],
    ...(typeof record["section"] === "string" ? { section: record["section"] } : {}),
    tags: [...optionalTags(record["tags"])],
    impressions: nonNegativeInteger(record["impressions"], "impressions"),
    clicks: nonNegativeInteger(record["clicks"], "clicks"),
    revenueMicros: nonNegativeInteger(record["revenueMicros"], "revenueMicros"),
  }, typeof record["at"] === "string" ? record["at"] : "");
}

export function adPerformanceLogPath(dataDir: string): string {
  return join(dataDir, "logs", AD_PERFORMANCE_LOG_FILE);
}

export function ensureAdPerformanceStore(dataDir: string): void {
  mkdirSync(dirname(adPerformanceLogPath(dataDir)), { recursive: true });
}

export function recordAdPerformance(dataDir: string, input: AdPerformanceInput, at = new Date().toISOString()): AdPerformanceEvent {
  const event = adPerformanceEvent(input, at);
  ensureAdPerformanceStore(dataDir);
  appendFileSync(adPerformanceLogPath(dataDir), serializeLines([requireJsonValue(event, "ad performance")]), "utf8");
  return event;
}

export function replayAdPerformanceEvents(path: string): readonly AdPerformanceEvent[] {
  if (!existsSync(path)) return Object.freeze([]);
  const events: AdPerformanceEvent[] = [];
  for (const parsed of parseLines(readFileSync(path, "utf8"))) {
    if (!isRecord(parsed)) continue;
    const event = adPerformanceEventFromRecord(parsed);
    if (event !== undefined) events.push(event);
  }
  return Object.freeze(events);
}

export function readAdPerformanceEvents(dataDir: string): readonly AdPerformanceEvent[] {
  return replayAdPerformanceEvents(adPerformanceLogPath(dataDir));
}

function emptyBucket(): { impressions: number; clicks: number; revenueMicros: number } {
  return { impressions: 0, clicks: 0, revenueMicros: 0 };
}

function add(bucket: { impressions: number; clicks: number; revenueMicros: number }, event: AdPerformanceEvent): void {
  bucket.impressions += event.impressions;
  bucket.clicks += event.clicks;
  bucket.revenueMicros += event.revenueMicros;
}

export function adPerformanceBucket(input: Readonly<{
  impressions: number;
  clicks: number;
  revenueMicros: number;
}>): AdPerformanceBucket {
  return adPerformanceBucketCarrier.assert({
    impressions: input.impressions,
    clicks: input.clicks,
    revenueMicros: input.revenueMicros,
    rpmMicros: input.impressions === 0 ? 0 : Math.round((input.revenueMicros * 1000) / input.impressions),
    cpcMicros: input.clicks === 0 ? 0 : Math.round(input.revenueMicros / input.clicks),
  }, "ad performance bucket");
}

function finalized(record: Readonly<Record<string, { impressions: number; clicks: number; revenueMicros: number }>>): Readonly<Record<string, AdPerformanceBucket>> {
  return Object.freeze(Object.fromEntries(Object.entries(record).map(([key, bucket]) => [key, adPerformanceBucket(bucket)])));
}

export function adPerformanceReading(input: Readonly<{
  events: readonly AdPerformanceEvent[];
  constraints?: readonly string[];
}>): AdPerformanceReading {
  const totals = emptyBucket();
  const byProvider: Record<string, { impressions: number; clicks: number; revenueMicros: number }> = {};
  const bySection: Record<string, { impressions: number; clicks: number; revenueMicros: number }> = {};
  const byTag: Record<string, { impressions: number; clicks: number; revenueMicros: number }> = {};
  for (const event of input.events) {
    add(totals, event);
    byProvider[event.provider] ??= emptyBucket();
    add(byProvider[event.provider]!, event);
    if (event.section !== undefined) {
      bySection[event.section] ??= emptyBucket();
      add(bySection[event.section]!, event);
    }
    for (const tag of event.tags) {
      byTag[tag] ??= emptyBucket();
      add(byTag[tag]!, event);
    }
  }
  return adPerformanceReadingCarrier.assert({
    kind: "producing-content.ad-performance-reading" as const,
    eventCount: input.events.length,
    totals: adPerformanceBucket(totals),
    byProvider: finalized(byProvider),
    bySection: finalized(bySection),
    byTag: finalized(byTag),
    constraints: [...(input.constraints ?? AD_PERFORMANCE_CONSTRAINTS)],
  }, "ad performance reading");
}

export function readAdPerformance(dataDir: string): AdPerformanceReading {
  return adPerformanceReading({ events: readAdPerformanceEvents(dataDir) });
}

export function adPerformanceEventTerm(input: AdPerformanceEvent): Tm {
  return carrierToTerm(jsonResource(adPerformanceEventCarrier.assert(input), "ad performance event"));
}

export function adPerformanceReadingTerm(input: AdPerformanceReading): Tm {
  return carrierToTerm(jsonResource(adPerformanceReadingCarrier.assert(input), "ad performance reading"));
}
