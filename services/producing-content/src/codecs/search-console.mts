/**
 * @red-cup-engineering/producing-content/codecs/search-console - Search Console demand codecs.
 *
 * Pure functions over values: no network, no filesystem, no clock. Search
 * Console is one irrigation source for content farms, so decoded rows are
 * carried as producing-content demand assertions instead of old content blobs.
 */
import { createSign } from "node:crypto";

import { carrierFrom, carrierToTerm, type Tm, type FromSchema } from "@red-cup-engineering/relating";
import { jsonResource } from "@red-cup-engineering/relating/writing";

export const SearchConsoleDemandAssertionSchema = { $id: "producing-content/codecs/search-console/demand-assertion", title: "SearchConsoleDemandAssertion", additionalProperties: false, type: "object", required: ["kind", "query", "clicks", "impressions", "ctr", "position"], properties: { kind: { const: "producing-content.search-console.demand-assertion" }, query: { minLength: 1, type: "string" }, clicks: { minimum: 0, type: "number" }, impressions: { minimum: 0, type: "number" }, ctr: { minimum: 0, type: "number" }, position: { minimum: 0, type: "number" } } } as const;

export const SearchConsoleDemandReadingSchema = { $id: "producing-content/codecs/search-console/demand-reading", title: "SearchConsoleDemandReading", additionalProperties: false, type: "object", required: ["kind", "assertions"], properties: { kind: { const: "producing-content.search-console.demand-reading" }, assertions: { type: "array", items: SearchConsoleDemandAssertionSchema } } } as const;

export const SearchConsoleTokenGrantSchema = { $id: "producing-content/codecs/search-console/token-grant", title: "SearchConsoleTokenGrant", additionalProperties: false, type: "object", required: ["accessToken", "expiresIn"], properties: { accessToken: { minLength: 1, type: "string" }, expiresIn: { minimum: 0, type: "number" } } } as const;

export const SearchAnalyticsQuerySchema = { $id: "producing-content/codecs/search-console/search-analytics-query", title: "SearchAnalyticsQuery", additionalProperties: false, type: "object", required: ["startDate", "endDate", "dimensions", "rowLimit"], properties: { startDate: { minLength: 10, maxLength: 10, type: "string" }, endDate: { minLength: 10, maxLength: 10, type: "string" }, dimensions: { type: "array", items: { minLength: 1, type: "string" } }, rowLimit: { minimum: 1, type: "integer" } } } as const;

export type SearchConsoleDemandAssertion = FromSchema<typeof SearchConsoleDemandAssertionSchema>;
export type DemandAssertion = Readonly<{
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}>;
export type SearchConsoleDemandReading = FromSchema<typeof SearchConsoleDemandReadingSchema>;
export type TokenGrant = FromSchema<typeof SearchConsoleTokenGrantSchema>;
export type SearchAnalyticsQuery = FromSchema<typeof SearchAnalyticsQuerySchema>;

export type ServiceAccountAssertionInput = Readonly<{
  clientEmail: string;
  privateKeyPem: string;
  scope?: string;
  audience?: string;
  issuedAt: number;
  expiresAt: number;
}>;

export type SearchAnalyticsQueryInput = Readonly<{
  startDate: string;
  endDate: string;
  dimensions?: readonly string[];
  rowLimit?: number;
}>;

export const searchConsoleDemandAssertionCarrier = carrierFrom(SearchConsoleDemandAssertionSchema);

export const searchConsoleDemandReadingCarrier = carrierFrom(SearchConsoleDemandReadingSchema);

export const searchConsoleTokenGrantCarrier = carrierFrom(SearchConsoleTokenGrantSchema);

export const searchAnalyticsQueryCarrier = carrierFrom(SearchAnalyticsQuerySchema);

export const SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
export const SEARCH_CONSOLE_TOKEN_AUDIENCE = "https://oauth2.googleapis.com/token";

export function searchAnalyticsEndpoint(property: string): string {
  const name = requiredString(property, "searchConsole.property");
  return `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(name)}/searchAnalytics/query`;
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function encodeServiceAccountAssertion(input: ServiceAccountAssertionInput): string {
  const clientEmail = requiredString(input.clientEmail, "assertion.clientEmail");
  const privateKeyPem = requiredString(input.privateKeyPem, "assertion.privateKeyPem");
  const scope = input.scope === undefined ? SEARCH_CONSOLE_SCOPE : requiredString(input.scope, "assertion.scope");
  const audience = input.audience === undefined ? SEARCH_CONSOLE_TOKEN_AUDIENCE : requiredString(input.audience, "assertion.audience");
  const issuedAt = requiredSeconds(input.issuedAt, "assertion.issuedAt");
  const expiresAt = requiredSeconds(input.expiresAt, "assertion.expiresAt");
  if (expiresAt <= issuedAt) throw new TypeError("assertion.expiresAt must be after assertion.issuedAt");
  const header = base64UrlJson({ alg: "RS256", typ: "JWT" });
  const payload = base64UrlJson({ iss: clientEmail, scope, aud: audience, iat: issuedAt, exp: expiresAt });
  const signingInput = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(privateKeyPem).toString("base64url");
  return `${signingInput}.${signature}`;
}

export function encodeSearchAnalyticsQuery(input: SearchAnalyticsQueryInput): SearchAnalyticsQuery {
  const startDate = isoDate(input.startDate, "searchAnalytics.startDate");
  const endDate = isoDate(input.endDate, "searchAnalytics.endDate");
  const dimensions = input.dimensions === undefined
    ? ["query"]
    : input.dimensions.map((dimension, index) => requiredString(dimension, `searchAnalytics.dimensions[${index}]`));
  const rowLimit = input.rowLimit === undefined ? 250 : requiredCount(input.rowLimit, "searchAnalytics.rowLimit");
  return searchAnalyticsQueryCarrier.assert({ startDate, endDate, dimensions, rowLimit }, "search analytics query");
}

export function decodeTokenResponse(json: unknown): TokenGrant {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw new TypeError("token response must be an object");
  }
  const record = json as { access_token?: unknown; expires_in?: unknown };
  return searchConsoleTokenGrantCarrier.assert({
    accessToken: requiredString(record.access_token, "tokenResponse.access_token"),
    expiresIn: metricNumber(record.expires_in, "tokenResponse.expires_in"),
  }, "search console token grant");
}

export function searchConsoleDemandAssertion(input: Omit<SearchConsoleDemandAssertion, "kind">): SearchConsoleDemandAssertion {
  return searchConsoleDemandAssertionCarrier.assert({
    kind: "producing-content.search-console.demand-assertion" as const,
    query: requiredString(input.query, "searchConsole.query"),
    clicks: metricNumber(input.clicks, "searchConsole.clicks"),
    impressions: metricNumber(input.impressions, "searchConsole.impressions"),
    ctr: metricNumber(input.ctr, "searchConsole.ctr"),
    position: metricNumber(input.position, "searchConsole.position"),
  }, "search console demand assertion");
}

export function searchConsoleDemandReading(assertions: readonly SearchConsoleDemandAssertion[]): SearchConsoleDemandReading {
  return searchConsoleDemandReadingCarrier.assert({
    kind: "producing-content.search-console.demand-reading" as const,
    assertions: assertions.map((assertion) => searchConsoleDemandAssertion(assertion)),
  }, "search console demand reading");
}

export function decodeSearchAnalyticsRows(json: unknown): readonly DemandAssertion[] {
  return Object.freeze(decodeSearchAnalyticsReading(json).assertions.map((assertion) => Object.freeze({
    query: assertion.query,
    clicks: assertion.clicks,
    impressions: assertion.impressions,
    ctr: assertion.ctr,
    position: assertion.position,
  })));
}

export function decodeSearchAnalyticsReading(json: unknown): SearchConsoleDemandReading {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw new TypeError("search analytics response must be an object");
  }
  const rows = (json as { rows?: unknown }).rows;
  if (rows === undefined) return searchConsoleDemandReading([]);
  if (!Array.isArray(rows)) throw new TypeError("searchAnalytics.rows must be an array when present");
  return searchConsoleDemandReading(rows.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new TypeError(`searchAnalytics.rows[${index}] must be an object`);
    }
    const record = row as { keys?: unknown; clicks?: unknown; impressions?: unknown; ctr?: unknown; position?: unknown };
    if (!Array.isArray(record.keys) || typeof record.keys[0] !== "string") {
      throw new TypeError(`searchAnalytics.rows[${index}].keys must lead with the query string`);
    }
    return searchConsoleDemandAssertion({
      query: record.keys[0],
      clicks: metricNumber(record.clicks, `searchAnalytics.rows[${index}].clicks`),
      impressions: metricNumber(record.impressions, `searchAnalytics.rows[${index}].impressions`),
      ctr: metricNumber(record.ctr, `searchAnalytics.rows[${index}].ctr`),
      position: metricNumber(record.position, `searchAnalytics.rows[${index}].position`),
    });
  }));
}

export function searchConsoleDemandAssertionTerm(input: SearchConsoleDemandAssertion): Tm {
  return carrierToTerm(jsonResource(searchConsoleDemandAssertionCarrier.assert(input), "search console demand assertion"));
}

export function searchConsoleDemandReadingTerm(input: SearchConsoleDemandReading): Tm {
  return carrierToTerm(jsonResource(searchConsoleDemandReadingCarrier.assert(input), "search console demand reading"));
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${path} must be a non-empty string`);
  return value;
}

function metricNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new TypeError(`${path} must be a non-negative finite number`);
  return value;
}

function requiredSeconds(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new TypeError(`${path} must be a non-negative integer of seconds`);
  }
  return value;
}

function requiredCount(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${path} must be a positive integer`);
  }
  return value;
}

function isoDate(value: unknown, path: string): string {
  const text = requiredString(value, path);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new TypeError(`${path} must be a YYYY-MM-DD date string`);
  return text;
}
