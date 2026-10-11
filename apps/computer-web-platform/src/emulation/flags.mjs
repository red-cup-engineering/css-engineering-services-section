import { TellingLog, tellSides } from "@red-cup-engineering/signchain/log";
export function featureFlags(opts) {
    if (!opts.flags && typeof opts.evaluate !== "function") {
        throw new Error("featureFlags: provide `flags` and/or an `evaluate` function");
    }
    const store = new TellingLog();
    const localsKey = opts.localsKey ?? "flags";
    const cacheTtlMs = opts.cacheTtlMs ?? 30_000;
    const failClosed = opts.failClosed !== false;
    const cache = new Map();
    return async (ctx)=>{
        const userId = opts.userId ? opts.userId(ctx) : ctx.req.socket?.remoteAddress ?? "anon";
        const resolved = {};
        if (!Array.isArray(opts.flags)) {
            try {
                for (const [key, source] of Object.entries(opts.flags ?? {})){
                    resolved[key] = typeof source === "function" ? await source(ctx) : source;
                }
                const full = typeof opts.evaluate === "function" ? await opts.evaluate(ctx, resolved) : resolved;
                ctx.locals[localsKey] = full ?? resolved;
            } catch  {
                ctx.locals[localsKey] = {};
            }
            return;
        }
        if (typeof opts.evaluate !== "function") {
            throw new Error("featureFlags: array flags require an `evaluate` function");
        }
        for (const flag of opts.flags){
            const cacheKey = `${flag}:${userId}`;
            const cached = cache.get(cacheKey);
            let value;
            if (cached && Date.now() < cached.expiresAt) {
                value = cached.value;
            } else {
                try {
                    value = await opts.evaluate({
                        key: flag,
                        userId,
                        attrs: ctx.locals
                    });
                    if (cacheTtlMs > 0) cache.set(cacheKey, {
                        value,
                        expiresAt: Date.now() + cacheTtlMs
                    });
                } catch  {
                    value = !failClosed;
                }
            }
            const memeCharge = value ? "potential" : "active";
            const settled = memeCharge === "potential";
            tellSides(store, {
                subject: flag,
                predicate: "flag",
                object: userId
            }, settled ? [
                true,
                false
            ] : [
                false,
                true
            ]);
            resolved[flag] = settled;
        }
        ctx.locals[localsKey] = resolved;
    };
}
export function getFlag(ctx, flag, localsKey = "flags", fallback) {
    const flags = ctx.locals[localsKey];
    return flags && flag in flags ? flags[flag] : fallback ?? false;
}
export function staticFlags(flags) {
    return (ctx)=>flags[ctx.key] ?? false;
}
export function remoteFlagsEvaluator(url, ttlMs = 60_000) {
    let cache = {};
    let lastFetch = 0;
    return async (ctx)=>{
        if (Date.now() - lastFetch > ttlMs) {
            try {
                const res = await fetch(url);
                cache = await res.json();
                lastFetch = Date.now();
            } catch  {}
        }
        return cache[ctx.key] ?? false;
    };
}
