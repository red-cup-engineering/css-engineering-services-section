import { TellingLog, tellSides } from "@red-cup-engineering/signchain/log";
import * as http from "node:http";
import * as https from "node:https";
import { clientIp } from "@red-cup-engineering/http-services-section/address";
export class ProxyUpstreamError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 502, code = "PROXY_UPSTREAM_ERROR"){
        super(message);
        this.name = "ProxyUpstreamError";
        this.statusCode = statusCode;
        this.code = code;
    }
}
const HOP_BY_HOP = [
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "http2-settings"
];
export const DEFAULT_PROXY_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_METHODS = new Set([
    "GET",
    "HEAD",
    "OPTIONS",
    "TRACE"
]);
function connectionTokens(value) {
    const raw = Array.isArray(value) ? value.join(",") : value == null ? "" : String(value);
    return raw.split(",").map((token)=>token.trim().toLowerCase()).filter(Boolean);
}
function stripHopByHop(headers) {
    const out = {
        ...headers
    };
    for (const header of connectionTokens(headers.connection))delete out[header];
    for (const header of HOP_BY_HOP)delete out[header];
    return out;
}
function pickTarget(targets, balancer, counter) {
    const healthy = targets.filter((t)=>t.healthy !== false);
    if (!healthy.length) return null;
    if (balancer === "random") return healthy[Math.floor(Math.random() * healthy.length)];
    if (balancer === "weighted-random") {
        const total = healthy.reduce((s, t)=>s + (t.weight ?? 1), 0);
        let r = Math.random() * total;
        for (const t of healthy){
            r -= t.weight ?? 1;
            if (r <= 0) return t;
        }
        return healthy[healthy.length - 1];
    }
    const idx = counter.n % healthy.length;
    counter.n++;
    return healthy[idx];
}
export function abortProxyOnClientAbort(signal, proxyReq, reason = "client aborted proxied request") {
    const abort = ()=>{
        if (!proxyReq.destroyed) proxyReq.destroy(new Error(reason));
    };
    if (signal.aborted) {
        abort();
        return;
    }
    signal.addEventListener("abort", abort, {
        once: true
    });
    proxyReq.once("close", ()=>signal.removeEventListener("abort", abort));
}
function retryMethodAllowed(method, policy) {
    const normalized = (method ?? "GET").toUpperCase();
    if (policy === "all") return true;
    if (Array.isArray(policy)) return policy.some((entry)=>entry.toUpperCase() === normalized);
    return DEFAULT_RETRY_METHODS.has(normalized);
}
function headerValues(value) {
    if (value === undefined) return [];
    return Array.isArray(value) ? value : [
        value
    ];
}
function requestDeclaresBody(req) {
    if (req.headers["transfer-encoding"] !== undefined) return true;
    const lengths = headerValues(req.headers["content-length"]);
    if (!lengths.length) return false;
    return lengths.some((value)=>{
        const length = Number.parseInt(value, 10);
        return !Number.isFinite(length) || length > 0;
    });
}
function canRetryProxyFailure(ctx, opts, attempt, retries) {
    return attempt < retries && !ctx.signal.aborted && !ctx.res.headersSent && !ctx.res.writableEnded && !requestDeclaresBody(ctx.req) && retryMethodAllowed(ctx.req.method, opts.retryMethods);
}
export function proxyTimeoutMs(timeout) {
    return timeout === 0 ? undefined : timeout ?? DEFAULT_PROXY_TIMEOUT_MS;
}
export function upstreamTimeoutError() {
    return new ProxyUpstreamError("upstream timeout", 504, "PROXY_UPSTREAM_TIMEOUT");
}
export function proxyFailureStatus(error) {
    return error instanceof ProxyUpstreamError ? error.statusCode : 502;
}
export function writeProxyFailureResponse(res, error) {
    if (res.headersSent || res.writableEnded) return;
    const status = proxyFailureStatus(error);
    const body = status === 504 ? "Gateway Timeout" : "Bad Gateway";
    res.writeHead(status, {
        "content-type": "text/plain; charset=utf-8"
    }).end(body);
}
function forwardRequest(target, ctx, opts) {
    return new Promise((resolve, reject)=>{
        const { req, res } = ctx;
        const targetUrl = new URL(target.url);
        let pathname = ctx.url.pathname;
        if (opts.stripPrefix && pathname.startsWith(opts.stripPrefix)) {
            pathname = pathname.slice(opts.stripPrefix.length) || "/";
        }
        if (opts.rewritePath) pathname = opts.rewritePath(pathname, ctx);
        const search = ctx.url.search;
        const isHttps = targetUrl.protocol === "https:";
        const mod = isHttps ? https : http;
        const port = targetUrl.port ? parseInt(targetUrl.port, 10) : isHttps ? 443 : 80;
        const headers = {
            ...stripHopByHop(req.headers),
            ...opts.headers ?? {}
        };
        if (!opts.preserveHost) headers["host"] = targetUrl.host;
        if (opts.xForwardedFor !== false) {
            const existing = req.headers["x-forwarded-for"];
            const ip = clientIp(req);
            headers["x-forwarded-for"] = existing ? `${existing}, ${ip}` : ip;
        }
        const proto = req.socket.encrypted ? "https" : "http";
        headers["x-forwarded-proto"] = req.headers["x-forwarded-proto"] ?? proto;
        headers["x-forwarded-host"] = req.headers["x-forwarded-host"] ?? req.headers.host ?? "";
        headers["x-meme-process"] = ctx.trace.id;
        const proxyReq = mod.request({
            hostname: targetUrl.hostname,
            port,
            path: pathname + search,
            method: req.method,
            headers
        });
        const timeoutMs = proxyTimeoutMs(opts.timeout);
        if (timeoutMs !== undefined) proxyReq.setTimeout(timeoutMs, ()=>proxyReq.destroy(upstreamTimeoutError()));
        abortProxyOnClientAbort(ctx.signal, proxyReq);
        opts.onProxyReq?.(proxyReq, req, res);
        proxyReq.on("response", (proxyRes)=>{
            opts.onProxyRes?.(proxyRes, req, res);
            res.writeHead(proxyRes.statusCode ?? 502, stripHopByHop(proxyRes.headers));
            proxyRes.pipe(res);
            proxyRes.on("end", ()=>resolve(true));
        });
        proxyReq.on("error", reject);
        if (requestDeclaresBody(req)) req.pipe(proxyReq);
        else proxyReq.end();
    });
}
export function proxy(opts) {
    const store = new TellingLog();
    const counter = {
        n: 0
    };
    const balancer = opts.balancer ?? "round-robin";
    const retries = opts.retries ?? 0;
    for (const target of opts.targets){
        const id = target.url;
        tellSides(store, {
            subject: id,
            predicate: "target",
            object: "registered"
        }, [
            true,
            false
        ]);
        if (target.healthy !== false) {
            tellSides(store, {
                subject: id,
                predicate: "health",
                object: "up"
            }, [
                true,
                false
            ]);
        }
    }
    return async (ctx)=>{
        for(let attempt = 0; attempt <= retries; attempt++){
            const target = pickTarget(opts.targets, balancer, counter);
            if (!target) {
                ctx.res.writeHead(503).end("No healthy upstream");
                return true;
            }
            const healthMemes = store.where({
                subject: target.url,
                predicate: "health",
                object: "up"
            });
            const memeCharge = store.readingWhere({
                subject: target.url,
                predicate: "health",
                object: "up"
            });
            if (memeCharge !== "potential") {
                target.healthy = false;
                continue;
            }
            try {
                return await forwardRequest(target, ctx, opts);
            } catch (error) {
                if (ctx.signal.aborted || ctx.res.headersSent || ctx.res.writableEnded) return true;
                tellSides(store, {
                    subject: target.url,
                    predicate: "health",
                    object: "up"
                }, [
                    false,
                    true
                ]);
                target.healthy = false;
                if (!canRetryProxyFailure(ctx, opts, attempt, retries)) {
                    writeProxyFailureResponse(ctx.res, error);
                    return true;
                }
            }
        }
        ctx.res.writeHead(503).end("Service Unavailable");
        return true;
    };
}
export function proxyHealthToggle(targets, url, healthy) {
    const t = targets.find((t)=>t.url === url);
    if (t) t.healthy = healthy;
}
export function proxyPass(target, options = {}) {
    const upstream = new URL(target);
    const mod = upstream.protocol === "https:" ? https : http;
    const basePath = upstream.pathname.replace(/\/$/, "");
    const { changeOrigin = true, xfwd = true, pathRewrite, timeout, headers: extraHeaders, onError } = options;
    return (ctx)=>new Promise((resolve)=>{
            const { req, res } = ctx;
            let path = `${ctx.url.pathname}${ctx.url.search}`;
            if (pathRewrite) path = pathRewrite(path, ctx);
            const headers = stripHopByHop(req.headers);
            if (changeOrigin) headers.host = upstream.host;
            if (xfwd) {
                const proto = req.socket.encrypted ? "https" : "http";
                const prior = req.headers["x-forwarded-for"];
                const addr = clientIp(req);
                headers["x-forwarded-for"] = prior ? `${prior}, ${addr}` : addr;
                headers["x-forwarded-proto"] = req.headers["x-forwarded-proto"] ?? proto;
                headers["x-forwarded-host"] = req.headers["x-forwarded-host"] ?? req.headers.host ?? "";
            }
            Object.assign(headers, extraHeaders ?? {});
            const fail = (err)=>{
                if (ctx.signal.aborted || res.writableEnded) {
                    resolve(true);
                    return;
                }
                if (onError) {
                    try {
                        onError(err, req, res);
                    } catch  {}
                } else if (!res.headersSent) {
                    writeProxyFailureResponse(res, err);
                } else {
                    try {
                        res.end();
                    } catch  {}
                }
                resolve(true);
            };
            const proxyReq = mod.request({
                protocol: upstream.protocol,
                hostname: upstream.hostname,
                port: upstream.port || (upstream.protocol === "https:" ? 443 : 80),
                method: req.method,
                path: basePath + path,
                headers
            }, (proxyRes)=>{
                res.writeHead(proxyRes.statusCode ?? 502, stripHopByHop(proxyRes.headers));
                proxyRes.on("error", ()=>{
                    try {
                        res.end();
                    } catch  {}
                    resolve(true);
                });
                proxyRes.on("end", ()=>resolve(true));
                proxyRes.pipe(res);
            });
            proxyReq.on("error", fail);
            const timeoutMs = proxyTimeoutMs(timeout);
            if (timeoutMs !== undefined) proxyReq.setTimeout(timeoutMs, ()=>proxyReq.destroy(upstreamTimeoutError()));
            abortProxyOnClientAbort(ctx.signal, proxyReq);
            req.pipe(proxyReq);
        });
}
