import { Readable } from "node:stream";
import { sendWebResponse, toWebRequest } from "@red-cup-engineering/http-services-section/web-bridge";
import { sha256 } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/hash";
import { memoryStore } from "./store.mjs";
import { realClock } from "./clock.mjs";
const ALARM_KEY = "\u0000durable.alarm";
const SAFE_ID = /^[A-Za-z0-9._~-]+$/;
const DELETED = Symbol("durable.deleted");
function clone(value) {
    if (value === undefined || value === null) return value;
    try {
        return structuredClone(value);
    } catch  {
        return value;
    }
}
function through(tail, fn) {
    tail.current = tail.current.then(fn, fn).then(()=>undefined, ()=>undefined);
}
function makeBackend(store) {
    const map = new Map();
    const tail = {
        current: Promise.resolve()
    };
    let alarm = null;
    const ready = (async ()=>{
        for await (const [key, value] of store.entries()){
            if (key === ALARM_KEY) alarm = typeof value === "number" ? value : null;
            else map.set(key, value);
        }
    })();
    return {
        get (key) {
            return map.has(key) ? clone(map.get(key)) : undefined;
        },
        has (key) {
            return map.has(key);
        },
        put (key, value) {
            const stored = clone(value);
            map.set(key, stored);
            through(tail, ()=>store.set(key, stored));
        },
        delete (key) {
            const had = map.delete(key);
            if (had) through(tail, ()=>store.delete(key));
            return had;
        },
        list () {
            return [
                ...map.entries()
            ].map(([key, value])=>[
                    key,
                    clone(value)
                ]);
        },
        getAlarm () {
            return alarm;
        },
        setAlarm (atMs) {
            alarm = atMs;
            through(tail, ()=>store.set(ALARM_KEY, atMs));
        },
        deleteAlarm () {
            alarm = null;
            through(tail, ()=>store.delete(ALARM_KEY));
        },
        ready,
        flush: ()=>tail.current,
        close: ()=>tail.current.then(()=>store.close()).then(()=>undefined, ()=>undefined)
    };
}
export function memoryStorage() {
    return ()=>makeBackend(memoryStore());
}
function transactionalStorage(backend) {
    function makeFace(overlay, read) {
        const readKey = (key)=>{
            if (overlay?.has(key)) {
                const value = overlay.get(key);
                return value === DELETED ? undefined : clone(value);
            }
            return read(key);
        };
        const hasKey = (key)=>{
            if (overlay?.has(key)) return overlay.get(key) !== DELETED;
            return readKey(key) !== undefined;
        };
        const face = {
            get (key) {
                if (typeof key !== "string") {
                    const out = new Map();
                    for (const item of key){
                        const value = readKey(item);
                        if (value !== undefined) out.set(item, value);
                    }
                    return out;
                }
                return readKey(key);
            },
            has (key) {
                return hasKey(key);
            },
            put (key, value) {
                if (typeof key !== "string") {
                    for (const [itemKey, itemValue] of Object.entries(key))face.put(itemKey, itemValue);
                    return;
                }
                if (overlay) overlay.set(key, clone(value));
                else backend.put(key, value);
            },
            set (key, value) {
                face.put(key, value);
            },
            delete (key) {
                if (typeof key !== "string") {
                    let count = 0;
                    for (const item of key)if (face.delete(item)) count++;
                    return count;
                }
                const existed = hasKey(key);
                if (overlay) overlay.set(key, DELETED);
                else backend.delete(key);
                return existed;
            },
            list () {
                const entries = new Map(backend.list());
                if (overlay) {
                    for (const [key, value] of overlay){
                        if (value === DELETED) entries.delete(key);
                        else entries.set(key, clone(value));
                    }
                }
                return [
                    ...entries.entries()
                ].map(([key, value])=>[
                        key,
                        clone(value)
                    ]);
            },
            async transaction (fn) {
                const child = new Map();
                const childFace = makeFace(child, readKey);
                const result = await fn(childFace);
                for (const [key, value] of child){
                    if (overlay) overlay.set(key, value);
                    else if (value === DELETED) backend.delete(key);
                    else backend.put(key, value);
                }
                return result;
            }
        };
        return face;
    }
    return makeFace(null, (key)=>backend.get(key));
}
function makeMailbox() {
    let tail = Promise.resolve();
    return (op)=>{
        const run = tail.then(op, op);
        tail = run.then(()=>undefined, ()=>undefined);
        return run;
    };
}
export function idFromName(name) {
    return sha256(Buffer.from(String(name))).toString("hex");
}
function responseFromError(error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(`Durable Object error: ${message}`, {
        status: 500
    });
}
function mountPattern(mount) {
    const escaped = mount.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^${escaped}([^/]+)(/.*)?$`);
}
export class DurableObjectNamespace {
    resource;
    alarms;
    objects = new Map();
    options;
    storageFactory;
    legacyHandler;
    constructor(options){
        const isModern = "factory" in options;
        const legacyHandler = isModern ? null : options;
        let resolved;
        if (legacyHandler) {
            resolved = {
                factory: (_id, state)=>{
                    const instance = {
                        fetch: async (_request, ctx)=>{
                            if (!ctx) return new Response("Durable Object legacy context is required", {
                                status: 500
                            });
                            await legacyHandler.fetch(state, ctx);
                            return new Response(null, {
                                status: 204
                            });
                        }
                    };
                    if (legacyHandler.alarm) instance.alarm = ()=>legacyHandler.alarm?.(state);
                    return instance;
                }
            };
        } else {
            resolved = options;
        }
        if (typeof resolved.factory !== "function") {
            throw new TypeError("durableObjects({ factory }): factory(id, state) is required");
        }
        if (resolved.storage !== undefined && typeof resolved.storage !== "function") {
            throw new TypeError("durableObjects({ storage }): storage must be a factory");
        }
        if (resolved.store !== undefined && typeof resolved.store !== "function") {
            throw new TypeError("durableObjects({ store }): store must be a factory");
        }
        this.options = {
            ...resolved,
            factory: resolved.factory,
            clock: resolved.clock ?? realClock(),
            idParam: resolved.idParam ?? "id",
            mount: resolved.mount ?? "/object/"
        };
        this.legacyHandler = legacyHandler;
        const storeFactory = resolved.store ?? (()=>memoryStore());
        this.storageFactory = resolved.storage ?? ((id)=>makeBackend(storeFactory(id)));
        const mountRe = mountPattern(this.options.mount);
        this.resource = {
            methods: [
                "GET",
                "HEAD",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "OPTIONS"
            ],
            match: (path, ctx)=>{
                if (this.options.idFromRequest) {
                    const id = this.options.idFromRequest(ctx.req, ctx);
                    return id == null ? null : {
                        [this.options.idParam]: String(id)
                    };
                }
                const match = mountRe.exec(path);
                return match ? {
                    [this.options.idParam]: decodeURIComponent(match[1]),
                    rest: match[2] ?? ""
                } : null;
            },
            handler: async (ctx)=>{
                const raw = ctx.params[this.options.idParam];
                const id = raw === undefined ? "" : String(raw);
                if (!id || !SAFE_ID.test(id)) {
                    ctx.res.writeHead(400, {
                        "content-type": "text/plain; charset=utf-8"
                    }).end("Bad Request (invalid object id)");
                    return;
                }
                const response = await this.get(id).fetch(toWebRequest(ctx.req, ctx), ctx);
                await this.send(ctx, response);
            }
        };
        this.alarms = {
            fire: async (id)=>{
                const record = this.objects.get(String(id));
                if (!record) return;
                await record.enqueue(async ()=>{
                    const fn = record.instance.alarm ?? record.instance.onAlarm;
                    if (typeof fn === "function") await fn.call(record.instance);
                });
            }
        };
    }
    get size() {
        return this.objects.size;
    }
    idFromName(name) {
        return idFromName(name);
    }
    ids() {
        return [
            ...this.objects.keys()
        ];
    }
    get(id) {
        const record = this.recordFor(String(id));
        return {
            id: record.id,
            get storage () {
                return record.storage;
            },
            get ready () {
                return record.ready;
            },
            flush: ()=>record.backend.flush?.() ?? Promise.resolve(),
            fetch: (request, ctx)=>record.enqueue(async ()=>{
                    await record.ready;
                    const fn = record.instance.fetch;
                    if (typeof fn !== "function") return new Response("Durable Object has no fetch handler", {
                        status: 500
                    });
                    try {
                        const response = await fn.call(record.instance, request, ctx);
                        if (!(response instanceof Response)) return new Response("Durable Object fetch must return a Response", {
                            status: 500
                        });
                        return response;
                    } catch (error) {
                        return responseFromError(error);
                    }
                }),
            call: (fn)=>record.enqueue(async ()=>{
                    await record.ready;
                    return fn(record.instance, record.storage);
                })
        };
    }
    async fetch(id, ctx) {
        if (!this.legacyHandler) {
            const response = await this.get(id).fetch(toWebRequest(ctx.req, ctx), ctx);
            await this.send(ctx, response);
            return;
        }
        await this.get(id).fetch(new Request("http://localhost/"), ctx);
    }
    async alarm(id) {
        await this.alarms.fire(id);
    }
    router(keyFn) {
        return async (ctx)=>{
            await this.fetch(keyFn(ctx), ctx);
        };
    }
    recordFor(id) {
        let record = this.objects.get(id);
        if (!record) {
            record = this.instantiate(id);
            this.objects.set(id, record);
        }
        return record;
    }
    send(ctx, response) {
        const options = ctx.req.method === undefined ? undefined : {
            method: ctx.req.method
        };
        return options === undefined ? sendWebResponse(ctx.res, response) : sendWebResponse(ctx.res, response, options);
    }
    instantiate(id) {
        const backend = this.storageFactory(id);
        const storage = transactionalStorage(backend);
        const enqueue = makeMailbox();
        const record = {
            id,
            backend,
            storage,
            enqueue,
            instance: {},
            clockHandle: null,
            ready: backend.ready ?? Promise.resolve()
        };
        const armAlarm = ()=>{
            if (record.clockHandle !== null) {
                this.options.clock.cancel(record.clockHandle);
                record.clockHandle = null;
            }
            const at = backend.getAlarm();
            if (at === null) return;
            record.clockHandle = this.options.clock.schedule(at, ()=>{
                record.clockHandle = null;
                record.enqueue(runAlarm).catch(()=>undefined);
            });
        };
        const runAlarm = async ()=>{
            await record.ready;
            const at = backend.getAlarm();
            if (at === null) return;
            backend.deleteAlarm();
            const fn = record.instance.alarm ?? record.instance.onAlarm;
            if (typeof fn === "function") await fn.call(record.instance);
            armAlarm();
        };
        const state = {
            id,
            storage,
            getAlarm: ()=>backend.getAlarm(),
            setAlarm: (atMs)=>{
                const value = atMs instanceof Date ? atMs.getTime() : Number(atMs);
                backend.setAlarm(value);
                armAlarm();
            },
            deleteAlarm: ()=>{
                backend.deleteAlarm();
                armAlarm();
            },
            blockConcurrencyWhile: (fn)=>record.enqueue(fn)
        };
        const instance = this.options.factory(id, state);
        if (!instance || typeof instance !== "object") {
            throw new TypeError(`durableObjects: factory(${JSON.stringify(id)}, state) returned no object`);
        }
        record.instance = instance;
        armAlarm();
        record.ready.then(armAlarm, ()=>undefined);
        return record;
    }
}
export function durableObjects(options) {
    return new DurableObjectNamespace(options);
}
export function bodyToNode(webBody) {
    if (webBody === null) return null;
    if (webBody instanceof Readable) return webBody;
    return Readable.fromWeb(webBody);
}
