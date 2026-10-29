import { cacheControl, type CacheControl } from "@red-cup-engineering/code-http-cache-control-service";
import { httpDate } from "@red-cup-engineering/code-http-date-service";
import type { CorsOptions, SecurityHeaders, StrictTransportSecurity } from "@red-cup-engineering/http-server-application-contract-service";

export type HeaderRequest = { headers: Record<string, string | string[] | undefined> };
export type HeaderCorsOptions = Omit<CorsOptions, "origins"> & { origins?: readonly (string | RegExp)[] | ((origin: string, context: { req: HeaderRequest }) => boolean) };
export type HeaderSink = {
  hasHeader(name: string): boolean;
  getHeader(name: string): unknown;
  setHeader(name: string, value: string | number | readonly string[]): unknown;
  writeHead(status: number, headers?: Record<string, string>): { end(value?: string): unknown };
};

export function ensureDateHeader(res: HeaderSink, now: Date | number = new Date()): void { // law-allow: wall-clock-as-data — Date header is HTTP protocol testimony (RFC 9110); caller may pass now
  if (!res.hasHeader("Date")) res.setHeader("Date", httpDate(now));
}

// ── CORS ─────────────────────────────────────────────────────────────────────────────────────

export type CorsPreflightDecision = {
  ok: boolean;
  status: number;
  reason?: "origin" | "method" | "headers" | "private-network";
};

function wildcardPattern(pattern: string): RegExp | null {
  if (!pattern.includes("*")) return null;
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function originPatternAllowed(origin: string, pattern: string | RegExp): boolean {
  if (pattern instanceof RegExp) return pattern.test(origin);
  if (pattern === "*") return true;
  const wildcard = wildcardPattern(pattern);
  return wildcard ? wildcard.test(origin) : pattern === origin;
}

export function corsOriginAllowed(req: HeaderRequest, opts: HeaderCorsOptions): boolean {
  const origin = String(req.headers["origin"] ?? "");
  if (!origin) return false;
  const { origins } = opts;
  if (!origins) return true;
  if (typeof origins === "function") return origins(origin, { req });
  return origins.some((pattern) => originPatternAllowed(origin, pattern));
}

function corsAllowedOrigin(req: HeaderRequest, opts: HeaderCorsOptions): string | null {
  const origin = String(req.headers["origin"] ?? "");
  if (!origin || !corsOriginAllowed(req, opts)) return null;
  const origins = opts.origins;
  const wildcard = Array.isArray(origins) && origins.includes("*");
  return wildcard && !opts.credentials ? "*" : origin;
}

function headerTokens(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join(",") : value ?? "";
  return raw.split(",").map((part) => part.trim()).filter(Boolean);
}

function requestedMethodAllowed(req: HeaderRequest, opts: HeaderCorsOptions): boolean {
  const method = String(req.headers["access-control-request-method"] ?? "").trim().toUpperCase();
  if (!method || !opts.methods?.length) return true;
  return opts.methods.map((item) => item.toUpperCase()).includes(method);
}

function requestedHeadersAllowed(req: HeaderRequest, opts: HeaderCorsOptions): boolean {
  if (!opts.headers?.length) return true;
  const allowed = new Set(opts.headers.map((item) => item.toLowerCase()));
  return headerTokens(req.headers["access-control-request-headers"])
    .every((item) => allowed.has(item.toLowerCase()));
}

function privateNetworkAllowed(req: HeaderRequest, opts: HeaderCorsOptions): boolean {
  return String(req.headers["access-control-request-private-network"] ?? "").toLowerCase() !== "true" ||
    opts.allowPrivateNetwork === true;
}

export function corsPreflightDecision(req: HeaderRequest, opts: HeaderCorsOptions): CorsPreflightDecision {
  const denyStatus = opts.preflightDenyStatus ?? 403;
  if (!corsOriginAllowed(req, opts)) return { ok: false, status: denyStatus, reason: "origin" };
  if (!requestedMethodAllowed(req, opts)) return { ok: false, status: 405, reason: "method" };
  if (!requestedHeadersAllowed(req, opts)) return { ok: false, status: denyStatus, reason: "headers" };
  if (!privateNetworkAllowed(req, opts)) return { ok: false, status: denyStatus, reason: "private-network" };
  return { ok: true, status: 204 };
}

export function applyCors(res: HeaderSink, req: HeaderRequest, opts: HeaderCorsOptions): void {
  const origin = corsAllowedOrigin(req, opts);
  if (!origin) return;
  res.setHeader("Access-Control-Allow-Origin", origin);
  if (opts.credentials) res.setHeader("Access-Control-Allow-Credentials", "true");
  if (opts.expose?.length) res.setHeader("Access-Control-Expose-Headers", opts.expose.join(", "));
  appendVary(res, "Origin");
}

export function corsPreflight(req: HeaderRequest, res: HeaderSink, opts: HeaderCorsOptions, status = 204): void {
  appendVary(res, "Access-Control-Request-Method");
  appendVary(res, "Access-Control-Request-Headers");
  appendVary(res, "Access-Control-Request-Private-Network");
  if (opts.strictPreflight) {
    const decision = corsPreflightDecision(req, opts);
    if (!decision.ok) {
      res.writeHead(decision.status, { "content-type": "text/plain; charset=utf-8" })
        .end(decision.reason ? `CORS preflight denied: ${decision.reason}` : "CORS preflight denied");
      return;
    }
  }
  applyCors(res, req, opts);
  const reqMethod = req.headers["access-control-request-method"];
  const reqHeaders = req.headers["access-control-request-headers"];
  if (reqMethod) res.setHeader("Access-Control-Allow-Methods", opts.methods?.join(", ") ?? reqMethod);
  if (reqHeaders) res.setHeader("Access-Control-Allow-Headers", opts.headers?.join(", ") ?? reqHeaders);
  if (opts.allowPrivateNetwork && String(req.headers["access-control-request-private-network"] ?? "").toLowerCase() === "true") {
    res.setHeader("Access-Control-Allow-Private-Network", "true");
  }
  if (opts.maxAge) res.setHeader("Access-Control-Max-Age", String(opts.maxAge));
  res.writeHead(status).end();
}

export function appendVary(res: HeaderSink, field: string): void {
  const existing = res.getHeader("Vary");
  const cur = existing ? String(existing) : "";
  const fields = cur ? cur.split(",").map((s) => s.trim()) : [];
  if (!fields.some((existingField) => existingField.toLowerCase() === field.toLowerCase())) {
    res.setHeader("Vary", [...fields, field].join(", "));
  }
}

// ── Cache-Control and security headers ───────────────────────────────────────────────────────

function seconds(name: string, value: number | undefined): string | null {
  if (value === undefined) return null;
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative integer`);
  return String(value);
}

export function applyCacheControl(res: HeaderSink, policy: CacheControl | string | undefined): void {
  if (!policy || res.hasHeader("Cache-Control")) return;
  const value = cacheControl(policy);
  if (value) res.setHeader("Cache-Control", value);
}

const DEFAULT_SECURITY_HEADERS: Required<SecurityHeaders> = {
  contentSecurityPolicy: "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'",
  contentSecurityPolicyReportOnly: false,
  strictTransportSecurity: { maxAge: 31_536_000, includeSubDomains: true },
  contentTypeOptions: "nosniff",
  referrerPolicy: "no-referrer",
  frameOptions: "DENY",
  permissionsPolicy: "geolocation=(), microphone=(), camera=()",
  reportingEndpoints: false,
  crossOriginOpenerPolicy: "same-origin",
  crossOriginResourcePolicy: "same-origin",
  crossOriginEmbedderPolicy: false,
  originAgentCluster: "?1",
  dnsPrefetchControl: "off",
  downloadOptions: "noopen",
  permittedCrossDomainPolicies: "none",
};

function hsts(value: StrictTransportSecurity | undefined): string | false {
  const hstsValue: StrictTransportSecurity = value === undefined
    ? DEFAULT_SECURITY_HEADERS.strictTransportSecurity
    : value;
  if (typeof hstsValue === "string" || hstsValue === false) return hstsValue;
  const maxAge = seconds("strictTransportSecurity.maxAge", hstsValue.maxAge ?? 31_536_000);
  const parts = [`max-age=${maxAge}`];
  if (hstsValue.includeSubDomains) parts.push("includeSubDomains");
  if (hstsValue.preload) parts.push("preload");
  return parts.join("; ");
}

function securityValue<K extends keyof SecurityHeaders>(
  headers: SecurityHeaders,
  key: K,
): Required<SecurityHeaders>[K] | SecurityHeaders[K] {
  return headers[key] === undefined ? DEFAULT_SECURITY_HEADERS[key] : headers[key];
}

function setHeaderUnlessDisabled(res: HeaderSink, name: string, value: string | false | undefined): void {
  if (value === false || value === undefined || res.hasHeader(name)) return;
  res.setHeader(name, value);
}

function reportingEndpoints(value: SecurityHeaders["reportingEndpoints"]): string | false | undefined {
  if (value === false || value === undefined || typeof value === "string") return value;
  return Object.entries(value)
    .map(([name, url]) => `${name}="${String(url).replace(/"/g, '\\"')}"`)
    .join(", ");
}

export function applySecurityHeaders(res: HeaderSink, policy: SecurityHeaders | true | undefined, nonce?: string): void {
  if (!policy) return;
  const headers = policy === true ? DEFAULT_SECURITY_HEADERS : policy;
  const csp = policy === true && nonce
    ? `default-src 'self'; style-src 'nonce-${nonce}'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'`
    : securityValue(headers, "contentSecurityPolicy");
  setHeaderUnlessDisabled(res, "Content-Security-Policy", csp);
  setHeaderUnlessDisabled(res, "Content-Security-Policy-Report-Only", securityValue(headers, "contentSecurityPolicyReportOnly"));
  setHeaderUnlessDisabled(res, "Strict-Transport-Security", hsts(headers.strictTransportSecurity));
  setHeaderUnlessDisabled(res, "X-Content-Type-Options", securityValue(headers, "contentTypeOptions"));
  setHeaderUnlessDisabled(res, "Referrer-Policy", securityValue(headers, "referrerPolicy"));
  setHeaderUnlessDisabled(res, "X-Frame-Options", securityValue(headers, "frameOptions"));
  setHeaderUnlessDisabled(res, "Permissions-Policy", securityValue(headers, "permissionsPolicy"));
  setHeaderUnlessDisabled(res, "Reporting-Endpoints", reportingEndpoints(securityValue(headers, "reportingEndpoints")));
  setHeaderUnlessDisabled(res, "Cross-Origin-Opener-Policy", securityValue(headers, "crossOriginOpenerPolicy"));
  setHeaderUnlessDisabled(res, "Cross-Origin-Resource-Policy", securityValue(headers, "crossOriginResourcePolicy"));
  setHeaderUnlessDisabled(res, "Cross-Origin-Embedder-Policy", securityValue(headers, "crossOriginEmbedderPolicy"));
  setHeaderUnlessDisabled(res, "Origin-Agent-Cluster", securityValue(headers, "originAgentCluster"));
  setHeaderUnlessDisabled(res, "X-DNS-Prefetch-Control", securityValue(headers, "dnsPrefetchControl"));
  setHeaderUnlessDisabled(res, "X-Download-Options", securityValue(headers, "downloadOptions"));
  setHeaderUnlessDisabled(res, "X-Permitted-Cross-Domain-Policies", securityValue(headers, "permittedCrossDomainPolicies"));
}

