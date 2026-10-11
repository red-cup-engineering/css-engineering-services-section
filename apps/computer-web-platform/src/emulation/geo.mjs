import { TellingLog, tellSides } from "@red-cup-engineering/signchain/log";
import { clientIp as requestClientIp } from "@red-cup-engineering/http-services-section/address";
import { readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";
export function clientIp(req, trustProxy = false) {
    return requestClientIp(req, {
        trustProxy
    });
}
export function geoLookup(opts) {
    const store = new TellingLog();
    const ttlMs = opts.ttlMs ?? 3_600_000;
    const localsKey = opts.localsKey ?? "geo";
    const trustProxy = opts.trustProxy ?? false;
    const expiries = new Map();
    return async (ctx)=>{
        const ip = clientIp(ctx.req, trustProxy);
        const subject = `geo:${ip}`;
        const cached = store.where({
            subject: subject,
            predicate: "geo"
        });
        const expiresAt = expiries.get(subject);
        if (cached.length > 0 && expiresAt && Date.now() < expiresAt) {
            const raw = String((cached[cached.length - 1])?.object);
            try {
                const record = JSON.parse(raw);
                ctx.locals[localsKey] = record;
                if (opts.headerPrefix) injectHeaders(ctx, record, opts.headerPrefix);
                return;
            } catch  {}
        }
        try {
            const record = await opts.resolver(ip);
            if (record) {
                tellSides(store, {
                    subject,
                    predicate: "geo",
                    object: JSON.stringify(record)
                }, [
                    true,
                    false
                ]);
                expiries.set(subject, Date.now() + ttlMs);
                ctx.locals[localsKey] = record;
                if (opts.headerPrefix) injectHeaders(ctx, record, opts.headerPrefix);
            }
        } catch  {}
    };
}
function injectHeaders(ctx, record, prefix) {
    if (record.country) ctx.res.setHeader(`${prefix}Country`, record.country);
    if (record.region) ctx.res.setHeader(`${prefix}Region`, record.region);
    if (record.city) ctx.res.setHeader(`${prefix}City`, record.city);
}
export function geoBlock(opts) {
    const localsKey = opts.localsKey ?? "geo";
    return async (ctx)=>{
        const record = ctx.locals[localsKey];
        const country = record?.country ?? "";
        const allowedByAllow = opts.allow ? opts.allow.includes(country) : true;
        const deniedByAllow = opts.allow ? !opts.allow.includes(country) : false;
        const deniedByDeny = opts.deny?.includes(country) ?? false;
        const reading = readingOfSides("knowledge", allowedByAllow && !deniedByDeny, deniedByAllow || deniedByDeny);
        if (reading === "potential") return;
        await opts.onDeny?.(ctx, country);
        ctx.res.writeHead(403).end("Forbidden");
        return true;
    };
}
export function geoHeaders(prefix = "X-Geo-") {
    return (ctx)=>{
        const ip = clientIp(ctx.req);
        ctx.res.setHeader(`${prefix}Client-IP`, ip);
        return Promise.resolve(undefined);
    };
}
export function routeByGeo(map, opts = {}) {
    const { field = "country", redirect: doRedirect = true, status = 302, localsKey = "geo" } = opts;
    return async (ctx)=>{
        const record = ctx.locals[localsKey];
        const value = record?.[field];
        const target = value != null && String(value) in map ? map[String(value)] : map["*"];
        if (target == null) return;
        if (typeof target === "function") return target(ctx);
        const location = String(target);
        if (doRedirect) {
            let resolved = location;
            try {
                resolved = new URL(location, ctx.url.href).toString();
            } catch  {}
            ctx.res.setHeader("Location", resolved);
            ctx.res.writeHead(status).end(`Redirecting to ${resolved}`);
            return true;
        }
        try {
            const next = new URL(location, ctx.url.href);
            ctx.url = next;
            ctx.req.url = next.pathname + next.search;
        } catch  {}
        return;
    };
}
export function rewriteBy(select, opts = {}) {
    if (typeof select !== "function") throw new TypeError("rewriteBy: `select` must be a function");
    const { redirect: doRedirect = true, status = 302 } = opts;
    return async (ctx)=>{
        const target = await select(ctx);
        if (target == null) return;
        if (typeof target === "function") return target(ctx);
        const location = String(target);
        if (doRedirect) {
            let resolved = location;
            try {
                resolved = new URL(location, ctx.url.href).toString();
            } catch  {}
            ctx.res.setHeader("Location", resolved);
            ctx.res.writeHead(status).end(`Redirecting to ${resolved}`);
            return true;
        }
        try {
            const next = new URL(location, ctx.url.href);
            ctx.url = next;
            ctx.req.url = next.pathname + next.search;
        } catch  {}
        return;
    };
}
