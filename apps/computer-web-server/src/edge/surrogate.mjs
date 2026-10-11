import { TellingLog, tellSides } from "@red-cup-engineering/signchain/log";
import { parseCacheControl } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/cache-control";
import { parseDirectiveList } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/header-value";
const SURROGATE_CONTROL = "Surrogate-Control";
const SURROGATE_KEY = "Surrogate-Key";
const CACHE_TAG = "Cache-Tag";
export function parseTags(value) {
    const parts = Array.isArray(value) ? value : value == null ? [] : [
        String(value)
    ];
    const seen = new Set();
    for (const part of parts){
        for (const token of String(part).split(/[\s,]+/)){
            const tag = token.trim();
            if (tag) seen.add(tag);
        }
    }
    return [
        ...seen
    ];
}
function nonnegativeSeconds(value) {
    if (value === true || value == null) return null;
    const n = Number.parseInt(value, 10);
    return Number.isSafeInteger(n) && n >= 0 ? n : null;
}
export function parseSurrogateControl(value) {
    const raw = Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value);
    if (!raw.trim()) return {
        maxAge: null,
        noStore: false,
        staleWhileRevalidate: null
    };
    const directives = parseDirectiveList(raw);
    const noStore = directives["no-store"] === true;
    return {
        maxAge: noStore ? 0 : nonnegativeSeconds(directives["max-age"]),
        noStore,
        staleWhileRevalidate: nonnegativeSeconds(directives["stale-while-revalidate"])
    };
}
function cacheControlMaxAge(value) {
    const policy = parseCacheControl(Array.isArray(value) ? value : value == null ? undefined : String(value));
    return policy.sMaxage ?? policy.maxAge ?? null;
}
function cacheControlNoStore(value) {
    const policy = parseCacheControl(Array.isArray(value) ? value : value == null ? undefined : String(value));
    return policy.noStore === true || policy.visibility === "private";
}
function header(res, name) {
    return res.getHeader(name);
}
function headerRecord(res) {
    const headers = {};
    for (const [name, value] of Object.entries(res.getHeaders())){
        if (value == null) continue;
        if (Array.isArray(value)) headers[name] = value.map(String);
        else headers[name] = String(value);
    }
    return headers;
}
function applyHeaders(res, headers) {
    for (const [name, value] of Object.entries(headers))res.setHeader(name, value);
}
function defaultKey(req, varyHeaders) {
    const vary = varyHeaders.map((name)=>`${name}=${req.headers[name] ?? ""}`).join(";");
    return `${req.method ?? "GET"}:${req.url ?? "/"}:${vary}`;
}
export function surrogateCache(opts = {}) {
    if (typeof opts.now !== "function") throw new TypeError("surrogateCache: opts.now (a clock function) is required");
    const clock = opts.now;
    const strip = opts.strip !== false;
    const resolveTtl = opts.resolveTtl !== false;
    const maxEntries = opts.maxEntries ?? 1000;
    const defaultTtlMs = opts.defaultTtlMs ?? 60_000;
    const varyHeaders = opts.varyHeaders ?? [
        "accept",
        "accept-encoding"
    ];
    const keyFor = opts.keyBy ?? ((req)=>defaultKey(req, varyHeaders));
    const entries = new Map();
    const tagIndex = new Map();
    const keyTags = new Map();
    const counters = {
        hits: 0,
        misses: 0,
        purgedTags: 0,
        purgedEntries: 0,
        surrogateTtlSet: 0
    };
    function unlink(key) {
        const tags = keyTags.get(key);
        if (!tags) return;
        for (const tag of tags){
            const keys = tagIndex.get(tag);
            keys?.delete(key);
            if (keys?.size === 0) tagIndex.delete(tag);
        }
        keyTags.delete(key);
    }
    function link(key, tags) {
        unlink(key);
        if (tags.length === 0) return;
        const set = new Set(tags);
        keyTags.set(key, set);
        for (const tag of set){
            let keys = tagIndex.get(tag);
            if (!keys) {
                keys = new Set();
                tagIndex.set(tag, keys);
            }
            keys.add(key);
        }
    }
    function evictOldest() {
        const oldest = entries.keys().next().value;
        if (!oldest) return;
        entries.delete(oldest);
        unlink(oldest);
    }
    function purgeKey(key) {
        const existed = entries.delete(key);
        unlink(key);
        return existed ? 1 : 0;
    }
    function purgeTag(key) {
        const keys = tagIndex.get(key);
        if (!keys) return 0;
        let removed = 0;
        for (const cacheKey of [
            ...keys
        ])removed += purgeKey(cacheKey);
        counters.purgedTags++;
        counters.purgedEntries += removed;
        opts.onPurge?.([
            key
        ]);
        return removed;
    }
    function purgeAll() {
        const removed = entries.size;
        entries.clear();
        tagIndex.clear();
        keyTags.clear();
        counters.purgedEntries += removed;
        return removed;
    }
    const middleware = (ctx)=>{
        const { req, res } = ctx;
        const method = req.method ?? "GET";
        if (method !== "GET" && method !== "HEAD") return;
        const key = keyFor(req);
        const entry = entries.get(key);
        if (entry && entry.expiresAt > clock()) {
            counters.hits++;
            applyHeaders(res, entry.headers);
            res.setHeader("X-Cache", "HIT");
            res.setHeader("Age", String(Math.max(0, Math.floor((clock() - entry.storedAt) / 1000))));
            res.writeHead(entry.status).end(method === "HEAD" ? undefined : entry.body);
            return true;
        }
        if (entry) purgeKey(key);
        counters.misses++;
        const chunks = [];
        const origWrite = res.write.bind(res);
        const origEnd = res.end.bind(res);
        const origWriteHead = res.writeHead.bind(res);
        let finalized = false;
        let status = res.statusCode || 200;
        let tags = [];
        let shouldStore = method === "GET";
        let ttlMs = defaultTtlMs;
        const finalize = (statusCode = res.statusCode || status)=>{
            if (finalized) return;
            finalized = true;
            status = statusCode;
            tags = parseTags(header(res, SURROGATE_KEY) ?? header(res, CACHE_TAG));
            const surrogate = parseSurrogateControl(header(res, SURROGATE_CONTROL));
            const cacheControl = header(res, "Cache-Control");
            const noStore = cacheControlNoStore(cacheControl) || surrogate.noStore;
            const surrogateMaxAge = resolveTtl ? surrogate.maxAge : null;
            const maxAge = surrogateMaxAge ?? cacheControlMaxAge(cacheControl);
            if (surrogateMaxAge !== null) {
                ttlMs = surrogateMaxAge * 1000;
                counters.surrogateTtlSet++;
                if (!res.hasHeader("Cache-Control")) res.setHeader("Cache-Control", `public, max-age=${surrogateMaxAge}`);
            } else if (maxAge !== null) {
                ttlMs = maxAge * 1000;
            }
            shouldStore = shouldStore && !noStore && status === 200 && maxEntries > 0;
            if (strip) {
                res.removeHeader(SURROGATE_CONTROL);
                res.removeHeader(SURROGATE_KEY);
                res.removeHeader(CACHE_TAG);
            }
            res.setHeader("X-Cache", "MISS");
        };
        res.write = (...args)=>{
            const chunk = args[0];
            if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
            return origWrite(...args);
        };
        res.writeHead = (...args)=>{
            const statusCode = typeof args[0] === "number" ? args[0] : res.statusCode;
            const maybeHeaders = typeof args[1] === "object" && args[1] !== null ? args[1] : args[2];
            if (maybeHeaders && typeof maybeHeaders === "object") {
                for (const [name, value] of Object.entries(maybeHeaders)){
                    if (value != null) res.setHeader(name, value);
                }
            }
            finalize(statusCode);
            return typeof args[1] === "string" ? origWriteHead(statusCode, args[1]) : origWriteHead(statusCode);
        };
        res.end = (...args)=>{
            const chunk = args[0];
            if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
            finalize();
            if (shouldStore) {
                while(entries.size >= maxEntries)evictOldest();
                const stored = {
                    status,
                    headers: headerRecord(res),
                    body: Buffer.concat(chunks),
                    expiresAt: clock() + ttlMs,
                    storedAt: clock(),
                    tags
                };
                entries.set(key, stored);
                link(key, tags);
            }
            return origEnd(...args);
        };
    };
    return {
        middleware,
        purge (keys) {
            const invalidated = [];
            for (const key of keys){
                const targets = tagIndex.get(key);
                if (!targets) continue;
                for (const cacheKey of [
                    ...targets
                ]){
                    if (purgeKey(cacheKey)) invalidated.push(cacheKey);
                }
            }
            if (invalidated.length) {
                counters.purgedTags += keys.length;
                counters.purgedEntries += invalidated.length;
                opts.onPurge?.(keys);
            }
            return invalidated;
        },
        purgeTag,
        purgeAll,
        tag (ctx, keys) {
            ctx.res.setHeader(SURROGATE_KEY, parseTags(keys).join(" "));
        },
        stats () {
            return {
                entries: entries.size,
                tags: tagIndex.size,
                tagged: keyTags.size,
                hits: counters.hits,
                misses: counters.misses,
                purgedTags: counters.purgedTags,
                purgedEntries: counters.purgedEntries,
                surrogateTtlSet: counters.surrogateTtlSet
            };
        }
    };
}
export function surrogateControl(opts = {}) {
    const cache = surrogateCache({
        ...opts,
        maxEntries: 0
    });
    const store = new TellingLog();
    const recorded = new Map();
    let responseCounter = 0;
    function recordTag(responseId, keys) {
        for (const key of keys){
            let ids = recorded.get(key);
            if (!ids) {
                ids = new Set();
                recorded.set(key, ids);
            }
            ids.add(responseId);
            tellSides(store, {
                subject: responseId,
                predicate: "surrogate-key",
                object: key
            }, [
                true,
                false
            ]);
        }
    }
    return {
        middleware (ctx) {
            const responseId = `${ctx.req.method}:${ctx.req.url}:${++responseCounter}`;
            const origEnd = ctx.res.end.bind(ctx.res);
            ctx.res.end = (...args)=>{
                const keys = parseTags(ctx.res.getHeader(SURROGATE_KEY) ?? ctx.res.getHeader(CACHE_TAG));
                if (keys.length) recordTag(responseId, keys);
                return origEnd(...args);
            };
            return cache.middleware(ctx);
        },
        purge (keys) {
            const affected = [];
            for (const key of keys){
                for (const id of recorded.get(key) ?? []){
                    affected.push(id);
                    tellSides(store, {
                        subject: id,
                        predicate: "surrogate-key",
                        object: key
                    }, [
                        false,
                        true
                    ]);
                }
                recorded.delete(key);
            }
            opts.onPurge?.(keys);
            return affected;
        },
        tag: cache.tag
    };
}
function isSurrogatePurged(store, responseId) {
    const memes = store.where({
        subject: responseId,
        predicate: "surrogate-key"
    });
    if (!memes.length && !store.against({
        subject: responseId,
        predicate: "surrogate-key"
    }).length) return false;
    return store.readingWhere({
        subject: responseId,
        predicate: "surrogate-key"
    }) !== "potential";
}
export { isSurrogatePurged };
