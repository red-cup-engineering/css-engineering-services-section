function deny(ctx, status, message, headers = {}) {
    if (!ctx.res.headersSent) {
        ctx.res.writeHead(status, {
            "content-type": "text/plain; charset=utf-8",
            ...headers
        }).end(message);
    } else {
        try {
            ctx.res.end();
        } catch  {}
    }
    return true;
}
function defaultClientKey(ctx) {
    const forwarded = ctx.req.headers["x-forwarded-for"];
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return first?.split(",")[0]?.trim() || ctx.req.socket.remoteAddress || "unknown";
}
function assertLimit(name, value) {
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new TypeError(`${name} must be a positive safe integer`);
    }
}
export function memoryRateLimitStore() {
    const hits = new Map();
    return {
        get size () {
            return hits.size;
        },
        increment (key, windowMs, now) {
            const cutoff = now - windowMs;
            let times = hits.get(key);
            if (!times) {
                times = [];
                hits.set(key, times);
            }
            let drop = 0;
            while(drop < times.length && times[drop] <= cutoff)drop++;
            if (drop) times.splice(0, drop);
            times.push(now);
            return {
                totalHits: times.length,
                resetTime: new Date((times[0] ?? now) + windowMs)
            };
        },
        decrement (key) {
            const times = hits.get(key);
            if (!times?.length) return;
            times.pop();
            if (times.length === 0) hits.delete(key);
        },
        resetKey (key) {
            hits.delete(key);
        }
    };
}
function rateHeaderMode(opts) {
    if (opts.headers === false) return {
        legacy: false,
        standard: false
    };
    if (opts.headers === "legacy") return {
        legacy: true,
        standard: false
    };
    if (opts.headers === "standard") return {
        legacy: false,
        standard: true
    };
    if (opts.headers === "both") return {
        legacy: true,
        standard: true
    };
    return {
        legacy: opts.legacyHeaders ?? true,
        standard: opts.standardHeaders ?? false
    };
}
function secondsUntil(resetTime, now) {
    return Math.max(1, Math.ceil((resetTime.getTime() - now) / 1000));
}
function setRateLimitHeaders(ctx, opts) {
    const remaining = String(Math.max(0, opts.remaining));
    const resetEpoch = String(Math.ceil(opts.resetTime.getTime() / 1000));
    const resetDelta = String(secondsUntil(opts.resetTime, opts.now));
    const headers = {};
    if (opts.mode.legacy) {
        headers["X-RateLimit-Limit"] = String(opts.limit);
        headers["X-RateLimit-Remaining"] = remaining;
        headers["X-RateLimit-Reset"] = resetEpoch;
    }
    if (opts.mode.standard) {
        headers["RateLimit-Limit"] = String(opts.limit);
        headers["RateLimit-Remaining"] = remaining;
        headers["RateLimit-Reset"] = resetDelta;
        headers["RateLimit-Policy"] = `${opts.limit};w=${Math.ceil(opts.windowMs / 1000)}${opts.policyName ? `;name="${opts.policyName}"` : ""}`;
    }
    if (opts.retryAfter !== undefined) headers["Retry-After"] = String(opts.retryAfter);
    for (const [name, value] of Object.entries(headers))ctx.res.setHeader(name, value);
    return headers;
}
function defaultRequestWasSuccessful(ctx) {
    return ctx.res.statusCode < 400;
}
function refundRateLimitHit(ctx, store, key, opts) {
    if (!opts.skipSuccessfulRequests && !opts.skipFailedRequests) return;
    const shouldRefund = ()=>{
        const successful = (opts.requestWasSuccessful ?? defaultRequestWasSuccessful)(ctx);
        return successful && opts.skipSuccessfulRequests || !successful && opts.skipFailedRequests;
    };
    let refunded = false;
    const refund = ()=>{
        if (refunded || !shouldRefund()) return;
        refunded = true;
        void store.decrement?.(key);
    };
    ctx.res.once("finish", refund);
    ctx.res.once("close", refund);
}
export function rateLimit(opts = {}) {
    const windowMs = opts.windowMs ?? 60_000;
    const maxRequests = opts.maxRequests ?? opts.max ?? 100;
    const statusCode = opts.statusCode ?? 429;
    const message = opts.message ?? "Too Many Requests";
    assertLimit("rateLimit.windowMs", windowMs);
    assertLimit("rateLimit.maxRequests", maxRequests);
    const headerMode = rateHeaderMode(opts);
    const store = opts.store ?? memoryRateLimitStore();
    const now = opts.now ?? Date.now;
    const keyFor = opts.keyBy ?? (opts.key ? (ctx)=>opts.key(ctx.req, ctx) : defaultClientKey);
    return async (ctx)=>{
        if (opts.skip && await opts.skip(ctx)) return;
        const key = keyFor(ctx);
        const at = now();
        const hit = await store.increment(key, windowMs, at);
        const remaining = Math.max(0, maxRequests - hit.totalHits);
        if (hit.totalHits > maxRequests) {
            const retrySec = secondsUntil(hit.resetTime, at);
            const headers = setRateLimitHeaders(ctx, {
                mode: headerMode,
                limit: maxRequests,
                remaining: 0,
                resetTime: hit.resetTime,
                retryAfter: retrySec,
                windowMs,
                ...opts.policyName !== undefined ? {
                    policyName: opts.policyName
                } : {},
                now: at
            });
            return deny(ctx, statusCode, message, headers);
        }
        setRateLimitHeaders(ctx, {
            mode: headerMode,
            limit: maxRequests,
            remaining,
            resetTime: hit.resetTime,
            windowMs,
            ...opts.policyName !== undefined ? {
                policyName: opts.policyName
            } : {},
            now: at
        });
        refundRateLimitHit(ctx, store, key, opts);
    };
}
export function bodyLimit(opts = {}) {
    const maxBytes = opts.maxBytes ?? 1_048_576;
    const message = opts.message ?? "Content Too Large";
    const statusCode = opts.statusCode ?? 413;
    const headers = opts.headers ?? {};
    if (!Number.isFinite(maxBytes) || maxBytes < 0) {
        throw new TypeError("bodyLimit requires a finite non-negative maxBytes");
    }
    return (ctx)=>{
        const declaredRaw = ctx.req.headers["content-length"];
        const declared = Array.isArray(declaredRaw) ? declaredRaw[0] : declaredRaw;
        if (declared !== undefined) {
            const n = Number(declared);
            if (Number.isFinite(n) && n > maxBytes) return deny(ctx, statusCode, message, headers);
        }
        let seen = 0;
        let tripped = false;
        const onData = (chunk)=>{
            if (tripped) return;
            seen += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
            if (seen <= maxBytes) return;
            tripped = true;
            ctx.req.removeListener("data", onData);
            if (!ctx.res.headersSent) deny(ctx, statusCode, message, {
                ...headers,
                connection: "close"
            });
            try {
                ctx.req.destroy();
            } catch  {}
            try {
                ctx.req.socket?.destroy?.();
            } catch  {}
        };
        ctx.req.on("data", onData);
        ctx.req.once("end", ()=>ctx.req.removeListener("data", onData));
    };
}
export function concurrencyLimit(opts) {
    const { max, statusCode = 503, message = "Service Unavailable" } = opts;
    assertLimit("concurrencyLimit.max", max);
    const inflight = new Map();
    const keyFor = opts.keyBy ?? (opts.key ? (ctx)=>opts.key(ctx.req, ctx) : defaultClientKey);
    return (ctx)=>{
        const key = keyFor(ctx);
        const current = inflight.get(key) ?? 0;
        if (current >= max) return deny(ctx, statusCode, message, {
            "Retry-After": "1"
        });
        inflight.set(key, current + 1);
        let released = false;
        const release = ()=>{
            if (released) return;
            released = true;
            const next = (inflight.get(key) ?? 1) - 1;
            if (next <= 0) inflight.delete(key);
            else inflight.set(key, next);
        };
        ctx.res.once("finish", release);
        ctx.res.once("close", release);
    };
}
export function requestTimeout(first, fallbackMessage = "Request Timeout") {
    const options = typeof first === "number" ? {
        ms: first,
        message: fallbackMessage
    } : first;
    assertLimit("requestTimeout.ms", options.ms);
    const message = options.message ?? "Request Timeout";
    const statusCode = options.statusCode ?? 408;
    const headers = options.headers ?? {};
    const destroy = options.destroy ?? true;
    return (ctx)=>{
        const timer = setTimeout(()=>{
            options.onTimeout?.(ctx);
            if (!ctx.res.headersSent) {
                ctx.res.writeHead(statusCode, {
                    "content-type": "text/plain; charset=utf-8",
                    ...headers
                }).end(message);
            }
            if (destroy) ctx.req.destroy();
        }, options.ms);
        ctx.res.once("finish", ()=>clearTimeout(timer));
        ctx.res.once("close", ()=>clearTimeout(timer));
    };
}
export function timeouts(opts = {}) {
    return (server)=>{
        if (!server) return server;
        const headers = opts.headersMs ?? opts.requestMs;
        if (headers !== undefined && "headersTimeout" in server) server.headersTimeout = headers;
        if (opts.requestMs !== undefined && "requestTimeout" in server) server.requestTimeout = opts.requestMs;
        if (opts.idleMs !== undefined && "keepAliveTimeout" in server) server.keepAliveTimeout = opts.idleMs;
        return server;
    };
}
