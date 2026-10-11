import { timingSafeEqual } from "node:crypto";
import { TellingLog, tellSides } from "@red-cup-engineering/signchain/log";
import { settleRequestTrace } from "@red-cup-engineering/http-services-section/request-trace";
function base64urlDecode(s) {
    const padded = s + "=".repeat((4 - s.length % 4) % 4);
    return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}
function decodeJwt(token) {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    try {
        const header = JSON.parse(base64urlDecode(parts[0]));
        const payload = JSON.parse(base64urlDecode(parts[1]));
        return {
            header,
            payload
        };
    } catch  {
        return null;
    }
}
function extractBearer(req) {
    const auth = req.headers["authorization"];
    if (!auth || !auth.startsWith("Bearer ")) return undefined;
    return auth.slice(7).trim();
}
function constantTimeEqual(a, b) {
    const left = Buffer.from(String(a), "utf8");
    const right = Buffer.from(String(b), "utf8");
    const probe = right.length === left.length ? right : Buffer.alloc(left.length);
    return timingSafeEqual(left, probe) && left.length === right.length;
}
function authParam(name, value) {
    if (value == null) return null;
    return `${name}="${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
function challenge(ctx, scheme, params, body = "Unauthorized") {
    const rendered = Object.entries(params).map(([name, value])=>authParam(name, value)).filter((value)=>value !== null);
    ctx.res.setHeader("WWW-Authenticate", rendered.length ? `${scheme} ${rendered.join(", ")}` : scheme);
    ctx.res.writeHead(401, {
        "content-type": "text/plain; charset=utf-8"
    }).end(body);
    return true;
}
function parseBasicHeader(ctx) {
    const header = ctx.req.headers.authorization;
    if (!header) return null;
    const value = Array.isArray(header) ? header[0] : header;
    const match = /^Basic\s+(.+)$/i.exec(value.trim());
    if (!match) return null;
    let decoded;
    try {
        decoded = Buffer.from(match[1], "base64").toString("utf8");
    } catch  {
        return null;
    }
    const split = decoded.indexOf(":");
    if (split === -1) return null;
    return {
        user: decoded.slice(0, split),
        pass: decoded.slice(split + 1)
    };
}
function setPrincipal(ctx, principal) {
    ctx.locals.principal = principal;
    ctx.principal = principal;
}
function authValue(evidence) {
    const admitted = evidence.some((item)=>item.admitted);
    const denied = evidence.some((item)=>!item.admitted);
    if (admitted && denied) return "stable";
    if (admitted) return "potential";
    return "active";
}
function authReason(evidence, value) {
    if (value === "potential") return "authentication admitted";
    if (value === "stable") return "contradicted authentication evidence";
    return evidence.find((item)=>!item.admitted && item.reason)?.reason ?? "unauthorized";
}
function authClaims(evidence) {
    const claims = evidence.find((item)=>item.admitted && item.claims !== undefined)?.claims;
    return claims ? Object.freeze({
        ...claims
    }) : null;
}
function authEntries(trace, claims, claimsAttribute, t) {
    if (!claims) return Object.freeze([]);
    return Object.freeze(Object.entries(claims).map(([k, v])=>Object.freeze({
            e: trace.id,
            a: `${claimsAttribute}.${k}`,
            v: String(v),
            t
        })));
}
function chargeBits(value) {
    if (value === "potential") return [
        true,
        false
    ];
    if (value === "active") return [
        false,
        true
    ];
    if (value === "stable") return [
        true,
        true
    ];
    return [
        false,
        false
    ];
}
export function authAdmissionJudgments(input) {
    const value = authValue(input.evidence);
    const reason = authReason(input.evidence, value);
    return Object.freeze([
        {
            name: "auth",
            value,
            reason,
            path: input.trace.id
        }
    ]);
}
export function authAdmissionReport(input) {
    const judgments = authAdmissionJudgments(input);
    const settled = settleRequestTrace(input.trace, judgments);
    const value = settled.value;
    const claims = value === "potential" ? authClaims(input.evidence) : null;
    if (input.now === undefined) throw new TypeError("authAdmissionReport: input.now is required");
    const entries = authEntries(input.trace, claims, input.claimsAttribute ?? "auth.claims", input.now);
    return Object.freeze({
        trace: input.trace,
        settled,
        judgments,
        value,
        admitted: value === "potential",
        denied: value === "active",
        contradicted: value === "stable",
        reason: authReason(input.evidence, value),
        claims,
        entries
    });
}
export function basicAuth(opts = {}) {
    if (!opts.verify && !opts.users) throw new Error("basicAuth: provide `users` or `verify`");
    const realm = opts.realm ?? "restricted";
    const users = opts.users ?? {};
    return async (ctx)=>{
        const credentials = parseBasicHeader(ctx);
        if (!credentials) return challenge(ctx, "Basic", {
            realm,
            charset: "UTF-8"
        });
        const ok = opts.verify ? await opts.verify(credentials.user, credentials.pass, ctx) : Object.prototype.hasOwnProperty.call(users, credentials.user) && constantTimeEqual(credentials.pass, users[credentials.user] ?? "");
        if (!ok) return challenge(ctx, "Basic", {
            realm,
            charset: "UTF-8"
        });
        setPrincipal(ctx, {
            name: credentials.user
        });
        return;
    };
}
function parseBearerHeader(ctx) {
    const header = ctx.req.headers.authorization;
    if (!header) return null;
    const value = Array.isArray(header) ? header[0] : header;
    const match = /^Bearer\s+([A-Za-z0-9\-._~+/]+=*)\s*$/.exec(value.trim());
    return match?.[1] ?? null;
}
export function bearerAuth(opts) {
    if (typeof opts.verify !== "function") throw new Error("bearerAuth: `verify` must be a function");
    const realm = opts.realm ?? "restricted";
    return async (ctx)=>{
        const token = parseBearerHeader(ctx);
        const base = {
            realm,
            scope: opts.scope
        };
        if (!token) return challenge(ctx, "Bearer", base);
        let principal;
        try {
            principal = await opts.verify(token, ctx);
        } catch  {
            principal = false;
        }
        if (!principal) return challenge(ctx, "Bearer", {
            ...base,
            error: "invalid_token"
        });
        setPrincipal(ctx, principal === true ? {
            token
        } : principal);
        return;
    };
}
export function authenticate(opts = {}) {
    if (typeof opts.now !== "function") throw new TypeError("authenticate: opts.now (a clock function) is required");
    const clock = opts.now;
    const store = new TellingLog();
    const claimsAttr = opts.claimsAttribute ?? "auth.claims";
    return async (ctx)=>{
        const t = String(clock());
        const evidence = [];
        let admittedClaims = null;
        if (opts.jwt) {
            const jwtOpts = opts.jwt;
            const token = jwtOpts.tokenFrom ? jwtOpts.tokenFrom(ctx) : extractBearer(ctx.req);
            if (token) {
                const decoded = decodeJwt(token);
                if (!decoded) {
                    evidence.push({
                        source: "jwt",
                        admitted: false,
                        reason: "malformed JWT"
                    });
                } else {
                    const { payload } = decoded;
                    const now = clock();
                    const skew = jwtOpts.clockSkewMs ?? 30_000;
                    const expOk = !payload["exp"] || payload["exp"] * 1000 + skew > now;
                    const nbfOk = !payload["nbf"] || payload["nbf"] * 1000 - skew <= now;
                    const issOk = !jwtOpts.issuer || payload["iss"] === jwtOpts.issuer;
                    const audOk = !jwtOpts.audience || payload["aud"] === jwtOpts.audience || Array.isArray(payload["aud"]) && payload["aud"].includes(jwtOpts.audience);
                    if (expOk && nbfOk && issOk && audOk) {
                        evidence.push({
                            source: "jwt",
                            admitted: true,
                            claims: payload
                        });
                        admittedClaims = payload;
                    } else {
                        evidence.push({
                            source: "jwt",
                            admitted: false,
                            reason: !expOk ? "token expired" : !nbfOk ? "token not yet valid" : !issOk ? "issuer mismatch" : "audience mismatch"
                        });
                    }
                }
            }
        }
        if (opts.basic && !admittedClaims) {
            const auth = ctx.req.headers["authorization"];
            if (auth?.startsWith("Basic ")) {
                const creds = Buffer.from(auth.slice(6), "base64").toString("utf8");
                const sep = creds.indexOf(":");
                const user = creds.slice(0, sep);
                const pass = creds.slice(sep + 1);
                const ok = await opts.basic.verify(user, pass, ctx);
                if (ok) {
                    admittedClaims = {
                        sub: user
                    };
                    evidence.push({
                        source: "basic",
                        admitted: true,
                        claims: admittedClaims
                    });
                } else {
                    evidence.push({
                        source: "basic",
                        admitted: false,
                        reason: "invalid credentials"
                    });
                }
            }
        }
        if (opts.apiKey && !admittedClaims) {
            const keyOpts = opts.apiKey;
            const header = keyOpts.header ?? "X-Api-Key";
            let key = ctx.req.headers[header.toLowerCase()];
            if (!key && keyOpts.query) key = ctx.url.searchParams.get(keyOpts.query) ?? undefined;
            if (key) {
                const ok = typeof keyOpts.keys === "function" ? await keyOpts.keys(key, ctx) : keyOpts.keys instanceof Set ? keyOpts.keys.has(key) : keyOpts.keys.includes(key);
                if (ok) {
                    admittedClaims = {
                        key
                    };
                    evidence.push({
                        source: "api-key",
                        admitted: true,
                        claims: admittedClaims
                    });
                } else {
                    evidence.push({
                        source: "api-key",
                        admitted: false,
                        reason: "invalid API key"
                    });
                }
            }
        }
        if (opts.verify) {
            const ok = await opts.verify(ctx);
            evidence.push(ok ? {
                source: "verify",
                admitted: true
            } : {
                source: "verify",
                admitted: false,
                reason: "unauthorized"
            });
        }
        const report = authAdmissionReport({
            trace: ctx.trace,
            evidence,
            claimsAttribute: claimsAttr,
            now: t
        });
        const memeCharge = report.value;
        const denialReason = evidence.length ? report.reason : "";
        tellSides(store, {
            subject: ctx.url.pathname,
            predicate: "auth",
            object: memeCharge
        }, chargeBits(memeCharge));
        if (report.admitted) {
            return [
                ...report.entries
            ];
        }
        if (report.contradicted) {
            await opts.onDeny?.(ctx, "contradiction");
            ctx.res.writeHead(503).end("Service Unavailable");
            return true;
        }
        await opts.onDeny?.(ctx, denialReason);
        if (opts.basic && !ctx.req.headers["authorization"]) {
            ctx.res.setHeader("WWW-Authenticate", `Basic realm="${opts.basic.realm ?? "Restricted"}"`);
            ctx.res.writeHead(401).end("Unauthorized");
        } else if (denialReason) {
            ctx.res.writeHead(401).end("Unauthorized");
        } else {
            ctx.res.writeHead(403).end("Forbidden");
        }
        return true;
    };
}
export function requireClaim(attribute, value, opts = {}) {
    const claimsAttr = opts.claimsAttribute ?? "auth.claims";
    const fullAttr = `${claimsAttr}.${attribute}`;
    return (ctx)=>{
        const entry = ctx.trace.entries.find((item)=>item.a === fullAttr);
        const val = entry?.v;
        const ok = val !== undefined && (typeof value === "function" ? value(String(val)) : String(val) === value);
        if (!ok) {
            ctx.res.writeHead(403).end("Forbidden");
            return Promise.resolve(true);
        }
        return Promise.resolve(undefined);
    };
}
