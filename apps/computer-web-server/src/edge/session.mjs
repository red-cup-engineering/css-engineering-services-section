import { deleteCookie, getSignedCookie, setSignedCookie } from "@red-cup-engineering/http-services-section/cookies";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export function memorySessionStore() {
    const records = new Map();
    const get = (id)=>{
        const record = records.get(id);
        return record ? cloneRecord(record) : undefined;
    };
    const set = (record)=>{
        records.set(record.id, cloneRecord(record));
    };
    return Object.freeze({
        get,
        set,
        delete: (id)=>records.delete(id),
        size: ()=>records.size,
        sweep (now) {
            let removed = 0;
            for (const [id, record] of records){
                if (record.expiresAt !== null && record.expiresAt <= now) {
                    records.delete(id);
                    removed++;
                }
            }
            return removed;
        },
        entries: ()=>[
                ...records.values()
            ].map(cloneRecord)
    });
}
export function session(options) {
    if (!options.secret) throw new TypeError("session: secret is required");
    if (typeof options.now !== "function") throw new TypeError("session: options.now (a clock function) is required");
    if (typeof options.generateId !== "function") throw new TypeError("session: options.generateId (a random-id function) is required");
    const cookieName = options.cookieName ?? "sid";
    const store = options.store ?? memorySessionStore();
    const ttlMs = Math.max(0, Math.trunc(options.ttlMs ?? WEEK_MS));
    const rolling = options.rolling ?? false;
    const localsKey = options.localsKey ?? "sessionHandle";
    const dataLocalsKey = options.dataLocalsKey ?? "session";
    const idLocalsKey = options.idLocalsKey ?? "sessionId";
    const now = options.now;
    const generateId = options.generateId;
    const cookie = {
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
        ...options.cookie
    };
    return (ctx)=>{
        const issued = getSignedCookie(ctx.req, cookieName, options.secret);
        const loaded = issued ? validRecord(store.get(issued), now()) : undefined;
        const start = now();
        let id = loaded?.id ?? generateId();
        let data = cloneData(loaded?.data ?? {});
        let isNew = loaded === undefined;
        let destroyed = false;
        let committed = false;
        const expiresAt = ()=>ttlMs > 0 ? now() + ttlMs : null;
        const handle = {
            get id () {
                return id;
            },
            set id (value){
                id = value;
            },
            get data () {
                return data;
            },
            set data (value){
                data = cloneData(value);
                ctx.locals[dataLocalsKey] = data;
            },
            get isNew () {
                return isNew;
            },
            set isNew (value){
                isNew = value;
            },
            get destroyed () {
                return destroyed;
            },
            set destroyed (value){
                destroyed = value;
            },
            commit () {
                if (committed || ctx.res.headersSent) return;
                committed = true;
                if (destroyed) {
                    store.delete(id);
                    deleteCookie(ctx.res, cookieName, cookie);
                    return;
                }
                const record = {
                    id,
                    data: cloneData(data),
                    createdAt: loaded?.createdAt ?? start,
                    updatedAt: now(),
                    expiresAt: expiresAt()
                };
                store.set(record);
                if (isNew || rolling) setSignedCookie(ctx.res, cookieName, id, options.secret, cookie);
            },
            destroy () {
                destroyed = true;
            },
            regenerate (nextData = {}) {
                store.delete(id);
                id = generateId();
                data = cloneData(nextData);
                isNew = true;
                destroyed = false;
                committed = false;
                ctx.locals[idLocalsKey] = id;
                ctx.locals[dataLocalsKey] = data;
            }
        };
        ctx.locals[localsKey] = handle;
        ctx.locals[idLocalsKey] = id;
        ctx.locals[dataLocalsKey] = data;
        installSessionCommitHook(ctx, handle);
    };
}
export { session as sessionMiddleware };
export function flash(options = {}) {
    const sessionLocalsKey = options.sessionLocalsKey ?? "sessionHandle";
    const localsKey = options.localsKey ?? "flash";
    const sessionKey = options.sessionKey ?? "_flash";
    return (ctx)=>{
        const sessionHandle = ctx.locals[sessionLocalsKey];
        if (!sessionHandle) throw new TypeError("flash: session middleware must run before flash middleware");
        const incoming = cloneFlashBag(sessionHandle.data[sessionKey]);
        const outgoing = new Map();
        delete sessionHandle.data[sessionKey];
        const handle = {
            peek (type) {
                return type === undefined ? freezeFlashMap(incoming) : Object.freeze([
                    ...incoming.get(type) ?? []
                ]);
            },
            consume (type) {
                if (type === undefined) {
                    const all = freezeFlashMap(incoming);
                    incoming.clear();
                    return all;
                }
                const values = Object.freeze([
                    ...incoming.get(type) ?? []
                ]);
                incoming.delete(type);
                return values;
            },
            push (type, message) {
                const key = String(type);
                const messages = outgoing.get(key) ?? [];
                messages.push(message);
                outgoing.set(key, messages);
            },
            clear (type) {
                if (type === undefined) {
                    incoming.clear();
                    outgoing.clear();
                    return;
                }
                incoming.delete(type);
                outgoing.delete(type);
            }
        };
        ctx.locals[localsKey] = handle;
        installFlashCommitHook(ctx, sessionHandle, sessionKey, outgoing);
    };
}
export { flash as flashMessages };
function installSessionCommitHook(ctx, handle) {
    const res = ctx.res;
    const originalWriteHead = res.writeHead.bind(res);
    const originalEnd = res.end.bind(res);
    res.writeHead = (...args)=>{
        handle.commit();
        return originalWriteHead(...args);
    };
    res.end = (...args)=>{
        handle.commit();
        return originalEnd(...args);
    };
}
function installFlashCommitHook(ctx, sessionHandle, sessionKey, outgoing) {
    const res = ctx.res;
    const originalWriteHead = res.writeHead.bind(res);
    const originalEnd = res.end.bind(res);
    let committed = false;
    const commit = ()=>{
        if (committed || ctx.res.headersSent || sessionHandle.destroyed) return;
        committed = true;
        const next = freezeFlashMap(outgoing);
        if (Object.keys(next).length > 0) sessionHandle.data[sessionKey] = next;
        else delete sessionHandle.data[sessionKey];
    };
    res.writeHead = (...args)=>{
        commit();
        return originalWriteHead(...args);
    };
    res.end = (...args)=>{
        commit();
        return originalEnd(...args);
    };
}
function validRecord(record, now) {
    if (!record) return undefined;
    return record.expiresAt !== null && record.expiresAt <= now ? undefined : record;
}
function cloneRecord(record) {
    return Object.freeze({
        id: record.id,
        data: cloneData(record.data),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        expiresAt: record.expiresAt
    });
}
function cloneData(data) {
    try {
        return structuredClone(data);
    } catch  {
        return {
            ...data
        };
    }
}
function cloneFlashBag(value1) {
    const out = new Map();
    if (!value1 || typeof value1 !== "object" || Array.isArray(value1)) return out;
    for (const [key, messages] of Object.entries(value1)){
        if (Array.isArray(messages)) out.set(key, [
            ...messages
        ]);
    }
    return out;
}
function freezeFlashMap(messages) {
    return Object.freeze(Object.fromEntries([
        ...messages.entries()
    ].map(([key, value1])=>[
            key,
            Object.freeze([
                ...value1
            ])
        ])));
}
