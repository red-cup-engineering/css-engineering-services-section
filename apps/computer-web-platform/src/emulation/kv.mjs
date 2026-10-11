import { randomBytes } from "node:crypto";
import { ifMatch } from "@red-cup-engineering/http-services-section/conditional-request";
import { diskStore, memoryStore } from "./store.mjs";
import { realClock } from "./clock.mjs";
const SEP = "\u0000";
function encodeKey(key) {
    if (typeof key === "string") return key;
    if (!Array.isArray(key) || key.length === 0) throw new TypeError("kv: array keys must be non-empty");
    return key.map((part)=>{
        if (typeof part !== "string") throw new TypeError("kv: key parts must be strings");
        return part;
    }).join(SEP);
}
function decodeKey(encoded) {
    return encoded.split(SEP);
}
function keyMatchesPrefix(encoded, prefix) {
    if (prefix === undefined) return true;
    const encPrefix = encodeKey(prefix);
    if (typeof prefix === "string") return encoded.startsWith(encPrefix);
    return encoded === encPrefix || encoded.startsWith(`${encPrefix}${SEP}`);
}
function makeStamper(now) {
    let last = 0n;
    return ()=>{
        const tick = BigInt(Math.max(0, Math.floor(now()))) * 1000n;
        last = tick > last ? tick : last + 1n;
        return `${last.toString(16).padStart(16, "0")}${randomBytes(2).toString("hex")}`;
    };
}
function isExpired(record, now) {
    return record !== null && record.expireAt !== null && record.expireAt <= now;
}
export function storeBackend(store) {
    const map = new Map();
    let tail = Promise.resolve();
    const through = (fn)=>{
        tail = tail.then(fn, fn).then(()=>undefined, ()=>undefined);
    };
    const ready = (async ()=>{
        for await (const [key, value] of store.entries()){
            if (!map.has(key)) map.set(key, value);
        }
    })();
    return {
        get (key) {
            return map.get(key) ?? null;
        },
        set (key, record) {
            map.set(key, record);
            through(()=>store.set(key, record));
        },
        delete (key) {
            map.delete(key);
            through(()=>store.delete(key));
        },
        *entries () {
            yield* map.entries();
        },
        clear () {
            map.clear();
            through(()=>store.clear());
        },
        close () {
            return tail.then(()=>store.close()).then(()=>undefined, ()=>undefined);
        },
        ready,
        flush: ()=>tail,
        store
    };
}
export function memoryBackend() {
    return storeBackend(memoryStore());
}
export function diskBackend({ dir }) {
    if (!dir) throw new TypeError("diskBackend: { dir } is required");
    return storeBackend(diskStore({
        dir
    }));
}
export function kvStore(options = {}) {
    const clock = options.clock ?? realClock();
    const now = options.now ?? clock.now;
    const backend = options.backend ?? (options.store ? storeBackend(options.store) : memoryBackend());
    const stamp = makeStamper(now);
    const defaultTtlMs = options.defaultTtlMs ?? 0;
    const sweepMs = options.sweepMs ?? 60_000;
    function readRecord(encoded) {
        const record = backend.get(encoded);
        if (record === null) return null;
        if (isExpired(record, now())) {
            backend.delete(encoded);
            return null;
        }
        return record;
    }
    function entryFor(encoded, record) {
        return {
            key: decodeKey(encoded),
            value: record.value,
            versionstamp: record.versionstamp,
            expireAt: record.expireAt
        };
    }
    function expiryFor(ttlMs) {
        const ttl = ttlMs ?? defaultTtlMs;
        return ttl > 0 ? now() + ttl : null;
    }
    function writeRecord(encoded, value, opts = {}) {
        const record = {
            value,
            versionstamp: opts.versionstamp ?? stamp(),
            expireAt: opts.expireAt ?? null
        };
        backend.set(encoded, record);
        return record;
    }
    function set(key, value, opts = {}) {
        const encoded = encodeKey(key);
        const record = writeRecord(encoded, value, {
            expireAt: expiryFor(opts.ttlMs)
        });
        options.onChange?.({
            type: "set",
            key: decodeKey(encoded),
            value,
            versionstamp: record.versionstamp,
            expireAt: record.expireAt
        });
        return {
            ok: true,
            versionstamp: record.versionstamp
        };
    }
    function del(key) {
        const encoded = encodeKey(key);
        const current = backend.get(encoded);
        backend.delete(encoded);
        const mutation = {
            type: "delete",
            key: decodeKey(encoded)
        };
        if (current?.versionstamp !== undefined) mutation.versionstamp = current.versionstamp;
        options.onChange?.(mutation);
    }
    function get(key) {
        const encoded = encodeKey(key);
        const record = readRecord(encoded);
        return record === null ? null : entryFor(encoded, record);
    }
    function list(opts = {}) {
        const out = [];
        const t = now();
        for (const [encoded, record] of backend.entries()){
            if (!keyMatchesPrefix(encoded, opts.prefix)) continue;
            if (isExpired(record, t)) {
                backend.delete(encoded);
                continue;
            }
            out.push({
                ...entryFor(encoded, record),
                encoded
            });
        }
        out.sort((a, b)=>a.encoded.localeCompare(b.encoded));
        if (opts.reverse) out.reverse();
        const limited = opts.limit !== undefined && opts.limit >= 0 ? out.slice(0, opts.limit) : out;
        return limited.map(({ encoded: _encoded, ...entry })=>entry);
    }
    function atomic() {
        const checks = [];
        const mutations = [];
        const tx = {
            check (key, versionstamp) {
                checks.push({
                    encoded: encodeKey(key),
                    expected: versionstamp ?? null
                });
                return tx;
            },
            set (key, value, opts = {}) {
                const mutation = {
                    type: "set",
                    encoded: encodeKey(key),
                    value
                };
                if (opts.ttlMs !== undefined) mutation.ttlMs = opts.ttlMs;
                mutations.push(mutation);
                return tx;
            },
            delete (key) {
                mutations.push({
                    type: "delete",
                    encoded: encodeKey(key)
                });
                return tx;
            },
            commit () {
                for (const check of checks){
                    const current = readRecord(check.encoded)?.versionstamp ?? null;
                    if (current !== check.expected) return {
                        ok: false
                    };
                }
                let lastStamp;
                for (const mutation of mutations){
                    if (mutation.type === "set") {
                        const record = writeRecord(mutation.encoded, mutation.value, {
                            expireAt: expiryFor(mutation.ttlMs)
                        });
                        lastStamp = record.versionstamp;
                        options.onChange?.({
                            type: "set",
                            key: decodeKey(mutation.encoded),
                            value: mutation.value,
                            versionstamp: record.versionstamp,
                            expireAt: record.expireAt
                        });
                    } else {
                        backend.delete(mutation.encoded);
                        options.onChange?.({
                            type: "delete",
                            key: decodeKey(mutation.encoded)
                        });
                    }
                }
                return lastStamp === undefined ? {
                    ok: true
                } : {
                    ok: true,
                    versionstamp: lastStamp
                };
            }
        };
        return tx;
    }
    function applyRemote(mutation) {
        const encoded = encodeKey(mutation.key);
        const local = backend.get(encoded);
        if (mutation.type === "delete") {
            if (local && mutation.versionstamp && local.versionstamp > mutation.versionstamp) return {
                ok: false
            };
            backend.delete(encoded);
            return {
                ok: true
            };
        }
        if (local && local.versionstamp >= mutation.versionstamp) return {
            ok: false
        };
        writeRecord(encoded, mutation.value, {
            expireAt: mutation.expireAt,
            versionstamp: mutation.versionstamp
        });
        return {
            ok: true
        };
    }
    function sweep() {
        const t = now();
        for (const [encoded, record] of [
            ...backend.entries()
        ]){
            if (isExpired(record, t)) backend.delete(encoded);
        }
    }
    let timer = null;
    if (sweepMs > 0) timer = clock.interval(sweepMs, sweep);
    function close() {
        if (timer !== null) {
            clock.cancel(timer);
            timer = null;
        }
        return backend.close?.();
    }
    return {
        get,
        set,
        delete: del,
        list,
        atomic,
        applyRemote,
        sweep,
        close,
        encodeKey,
        backend,
        ready: backend.ready ?? Promise.resolve(),
        flush: ()=>backend.flush?.() ?? Promise.resolve()
    };
}
export class KvStore {
    namespace;
    core;
    constructor(namespace = "kv", options = {}){
        this.namespace = namespace;
        this.core = kvStore(options);
    }
    scoped(key) {
        return typeof key === "string" ? [
            this.namespace,
            key
        ] : [
            this.namespace,
            ...key
        ];
    }
    get ready() {
        return this.core.ready;
    }
    flush() {
        return this.core.flush();
    }
    close() {
        return this.core.close();
    }
    getEntry(key) {
        const entry = this.core.get(this.scoped(key));
        if (!entry) return null;
        return {
            ...entry,
            key: entry.key.slice(1)
        };
    }
    set(key, value, opts = {}) {
        return this.core.set(this.scoped(key), value, opts);
    }
    get(key, opts = {}) {
        const entry = this.getEntry(key);
        if (!entry) return null;
        if (opts.asJson && typeof entry.value === "string") return JSON.parse(entry.value);
        return entry.value;
    }
    has(key) {
        return this.getEntry(key) !== null;
    }
    delete(key) {
        this.core.delete(this.scoped(key));
    }
    list(opts = {}) {
        const prefix = opts.prefix === undefined ? [
            this.namespace
        ] : this.scoped(opts.prefix);
        return this.core.list({
            ...opts,
            prefix
        }).map((entry)=>({
                key: entry.key.length === 2 ? entry.key[1] : entry.key.slice(1),
                value: entry.value,
                expiresAt: entry.expireAt,
                versionstamp: entry.versionstamp
            }));
    }
    increment(key, by = 1, opts = {}) {
        const current = Number(this.get(key) ?? 0);
        const next = current + by;
        this.set(key, next, opts);
        return next;
    }
    cas(key, expected, next, opts = {}) {
        const current = this.get(key);
        if (JSON.stringify(current) !== JSON.stringify(expected)) return false;
        this.set(key, next, opts);
        return true;
    }
}
function resourceEntry(store, key) {
    if (store instanceof KvStore) return store.getEntry(key);
    return store.get(key);
}
function resourceSet(store, key, value, opts) {
    return store.set(key, value, opts);
}
function resourceDelete(store, key) {
    store.delete(key);
}
function resourceList(store, opts) {
    return store.list(opts);
}
export function kvResource(store, opts = {}) {
    const { mount = "/kv/", readonly = false, parse: parseFn = (text)=>text ? JSON.parse(text) : null, serialize: serializeFn = (value)=>JSON.stringify(value) } = opts;
    const prefix = mount.endsWith("/") ? mount : `${mount}/`;
    const methods = readonly ? [
        "GET",
        "HEAD"
    ] : [
        "GET",
        "HEAD",
        "PUT",
        "DELETE"
    ];
    function keyOf(pathname) {
        const rel = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname.slice(mount.length);
        const isList = rel === "" || rel.endsWith("/");
        const parts = rel.split("/").map((part)=>decodeURIComponent(part)).filter(Boolean);
        return {
            parts,
            isList
        };
    }
    return {
        match: (path)=>path === mount || path === prefix || path.startsWith(prefix) ? true : false,
        methods,
        handler: async (ctx)=>{
            const method = ctx.req.method ?? "GET";
            const { parts, isList } = keyOf(ctx.url.pathname);
            if (method === "GET" || method === "HEAD") {
                if (isList) {
                    const limitQ = ctx.url.searchParams.get("limit");
                    const reverse = ctx.url.searchParams.get("reverse") === "true";
                    const entries = resourceList(store, {
                        ...parts.length ? {
                            prefix: parts
                        } : {},
                        ...limitQ !== null ? {
                            limit: parseInt(limitQ, 10)
                        } : {},
                        reverse
                    });
                    ctx.res.setHeader("Content-Type", "application/json; charset=utf-8");
                    ctx.res.writeHead(200);
                    if (method === "HEAD") ctx.res.end();
                    else ctx.res.end(serializeFn(entries));
                    return;
                }
                const entry = resourceEntry(store, parts);
                if (!entry) {
                    ctx.res.writeHead(404).end("Not Found");
                    return;
                }
                ctx.res.setHeader("Content-Type", "application/json; charset=utf-8");
                ctx.res.setHeader("ETag", `"${entry.versionstamp}"`);
                ctx.res.writeHead(200);
                if (method === "HEAD") ctx.res.end();
                else ctx.res.end(serializeFn(entry.value));
                return;
            }
            if (method === "PUT" && !readonly) {
                if (isList) {
                    ctx.res.writeHead(400).end("Cannot PUT a prefix");
                    return;
                }
                const current = resourceEntry(store, parts);
                if (current && !ifMatch(ctx.req.headers["if-match"], `"${current.versionstamp}"`)) {
                    ctx.res.writeHead(412).end("Precondition Failed");
                    return;
                }
                const chunks = [];
                await new Promise((resolve, reject)=>{
                    ctx.req.on("data", (chunk)=>chunks.push(chunk));
                    ctx.req.on("end", resolve);
                    ctx.req.on("error", reject);
                });
                let value;
                try {
                    value = parseFn(Buffer.concat(chunks).toString("utf8"));
                } catch  {
                    ctx.res.writeHead(400).end("Bad Request (unparseable body)");
                    return;
                }
                const ttlQ = ctx.url.searchParams.get("ttlMs");
                const setOpts = {};
                if (ttlQ !== null) setOpts.ttlMs = parseInt(ttlQ, 10);
                const result = resourceSet(store, parts, value, setOpts);
                ctx.res.setHeader("Content-Type", "application/json; charset=utf-8");
                ctx.res.setHeader("ETag", `"${result.versionstamp}"`);
                ctx.res.writeHead(200).end(serializeFn(result));
                return;
            }
            if (method === "DELETE" && !readonly) {
                if (isList) {
                    ctx.res.writeHead(400).end("Cannot DELETE a prefix");
                    return;
                }
                resourceDelete(store, parts);
                ctx.res.writeHead(204).end();
                return;
            }
            ctx.res.setHeader("Allow", methods.join(", "));
            ctx.res.writeHead(405).end("Method Not Allowed");
        }
    };
}
