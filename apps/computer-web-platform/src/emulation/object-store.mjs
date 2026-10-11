import { TellingLog, tellSides } from "@red-cup-engineering/signchain/log";
import { promises as fsp } from "node:fs";
import { join } from "node:path";
import { sha256 } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/hash";
import { writeFileAtomicAsync } from "@red-cup-engineering/computer-system-engine/filesystem";
import { isSafeBucket, listKeys, s3Resource as s3BucketsResource } from "@red-cup-engineering/http-services-section/s3";
function strongObjectEtag(body) {
    return `"${sha256(body).toString("hex")}"`;
}
function contentTypeOf(meta) {
    return meta.contentType === undefined ? undefined : meta.contentType;
}
function userMetaOf(meta) {
    return meta.userMeta === undefined ? undefined : {
        ...meta.userMeta
    };
}
function metadataFor(key, body, meta = {}) {
    const out = {
        key,
        size: body.length,
        lastModified: new Date(),
        etag: strongObjectEtag(body)
    };
    const contentType = contentTypeOf(meta);
    const userMeta = userMetaOf(meta);
    if (contentType !== undefined) out.contentType = contentType;
    if (userMeta !== undefined) out.userMeta = userMeta;
    return out;
}
async function collectBody(body) {
    if (Buffer.isBuffer(body)) return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    if (body instanceof Uint8Array) return body;
    const chunks = [];
    for await (const chunk of body)chunks.push(chunk);
    const size = chunks.reduce((total, chunk)=>total + chunk.length, 0);
    const data = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks){
        data.set(chunk, offset);
        offset += chunk.length;
    }
    return data;
}
export class InMemoryObjectBackend {
    objects = new Map();
    async get(key) {
        const obj = this.objects.get(key);
        if (!obj) return null;
        const body = obj.body;
        async function* iter() {
            yield body;
        }
        return {
            body: iter(),
            meta: obj.meta
        };
    }
    async put(key, body, meta = {}) {
        const data = await collectBody(body);
        const m = metadataFor(key, data, meta);
        this.objects.set(key, {
            body: data,
            meta: m
        });
        return m;
    }
    async delete(key) {
        return this.objects.delete(key);
    }
    async list(prefix = "", limit = 1000) {
        return [
            ...this.objects.values()
        ].map((o)=>o.meta).filter((meta)=>meta.key.startsWith(prefix)).sort((a, b)=>a.key.localeCompare(b.key)).slice(0, limit);
    }
    async head(key) {
        return this.objects.get(key)?.meta ?? null;
    }
}
function keyToFile(key) {
    return `${Buffer.from(key, "utf8").toString("hex")}.obj`;
}
function fileToKey(name) {
    return Buffer.from(name.slice(0, -4), "hex").toString("utf8");
}
function keyToMetaFile(key) {
    return `${Buffer.from(key, "utf8").toString("hex")}.meta.json`;
}
function reviveMeta(raw) {
    if (!raw || typeof raw !== "object") return null;
    const value = raw;
    if (typeof value.key !== "string" || typeof value.size !== "number") return null;
    const meta = {
        key: value.key,
        size: value.size
    };
    if (typeof value.contentType === "string") meta.contentType = value.contentType;
    if (typeof value.etag === "string") meta.etag = value.etag;
    if (typeof value.lastModified === "string" || typeof value.lastModified === "number") {
        const date = new Date(value.lastModified);
        if (!Number.isNaN(date.getTime())) meta.lastModified = date;
    }
    if (value.userMeta && typeof value.userMeta === "object") {
        meta.userMeta = Object.fromEntries(Object.entries(value.userMeta).map(([key, item])=>[
                key,
                String(item)
            ]));
    }
    return meta;
}
export class DiskObjectBackend {
    options;
    ready;
    constructor(options){
        if (!options.dir) throw new TypeError("DiskObjectBackend: { dir } is required");
        this.options = options;
        this.ready = fsp.mkdir(options.dir, {
            recursive: true
        }).then(()=>undefined);
    }
    objectPath(key) {
        return join(this.options.dir, keyToFile(key));
    }
    metaPath(key) {
        return join(this.options.dir, keyToMetaFile(key));
    }
    async readMeta(key) {
        await this.ready;
        try {
            return reviveMeta(JSON.parse(await fsp.readFile(this.metaPath(key), "utf8")));
        } catch  {
            return null;
        }
    }
    async get(key) {
        await this.ready;
        let body;
        try {
            body = await fsp.readFile(this.objectPath(key));
        } catch  {
            return null;
        }
        const meta = await this.readMeta(key) ?? metadataFor(key, body);
        async function* iter() {
            yield body;
        }
        return {
            body: iter(),
            meta
        };
    }
    async put(key, body, meta = {}) {
        await this.ready;
        const data = await collectBody(body);
        const next = metadataFor(key, data, meta);
        await writeFileAtomicAsync(this.objectPath(key), data);
        await writeFileAtomicAsync(this.metaPath(key), JSON.stringify({
            ...next,
            lastModified: next.lastModified?.toISOString()
        }));
        return next;
    }
    async delete(key) {
        await this.ready;
        let existed = false;
        try {
            await fsp.stat(this.objectPath(key));
            existed = true;
        } catch  {}
        await fsp.rm(this.objectPath(key), {
            force: true
        });
        await fsp.rm(this.metaPath(key), {
            force: true
        });
        return existed;
    }
    async list(prefix = "", limit = 1000) {
        await this.ready;
        let names;
        try {
            names = await fsp.readdir(this.options.dir);
        } catch  {
            return [];
        }
        const metas = [];
        for (const name of names){
            if (!name.endsWith(".obj")) continue;
            let key;
            try {
                key = fileToKey(name);
            } catch  {
                continue;
            }
            if (!key.startsWith(prefix)) continue;
            const meta = await this.head(key);
            if (meta) metas.push(meta);
        }
        return metas.sort((a, b)=>a.key.localeCompare(b.key)).slice(0, limit);
    }
    async head(key) {
        await this.ready;
        const meta = await this.readMeta(key);
        if (meta) return meta;
        try {
            const body = await fsp.readFile(this.objectPath(key));
            return metadataFor(key, body);
        } catch  {
            return null;
        }
    }
}
export class ObjectStore {
    store = new TellingLog();
    backend;
    constructor(backend){
        this.backend = backend;
    }
    async get(key) {
        const memes = this.store.where({
            subject: key,
            predicate: "object"
        });
        const g = this.store.readingWhere({
            subject: key,
            predicate: "object"
        });
        if (g === "active") return null;
        const result = await this.backend.get(key);
        if (!result && g !== "stable") return null;
        return result;
    }
    async put(key, body, meta = {}) {
        const result = await this.backend.put(key, body, meta);
        tellSides(this.store, {
            subject: key,
            predicate: "object",
            object: "exists"
        }, [
            true,
            false
        ]);
        return result;
    }
    async delete(key) {
        const result = await this.backend.delete(key);
        tellSides(this.store, {
            subject: key,
            predicate: "object",
            object: "exists"
        }, [
            false,
            true
        ]);
        return result;
    }
    async list(prefix, limit) {
        return this.backend.list(prefix, limit);
    }
    async head(key) {
        return this.backend.head(key);
    }
}
export class BucketedObjectStore {
    options;
    buckets = new Map();
    ready;
    constructor(options = {}){
        this.options = options;
        this.ready = options.dir ? fsp.mkdir(options.dir, {
            recursive: true
        }).then(()=>undefined) : Promise.resolve();
    }
    assertBucket(bucket) {
        if (!isSafeBucket(bucket)) throw new TypeError(`objectStore: invalid bucket ${JSON.stringify(bucket)}`);
    }
    bucketPath(bucket) {
        if (!this.options.dir) throw new TypeError("objectStore: no disk directory configured");
        return join(this.options.dir, bucket);
    }
    async backendFor(bucket, create) {
        await this.ready;
        this.assertBucket(bucket);
        const existing = this.buckets.get(bucket);
        if (existing) return existing;
        if (!create && !await this.hasBucket(bucket)) return null;
        const backend = this.options.dir ? new DiskObjectBackend({
            dir: this.bucketPath(bucket)
        }) : new InMemoryObjectBackend();
        const store = new ObjectStore(backend);
        this.buckets.set(bucket, store);
        return store;
    }
    async createBucket(bucket) {
        await this.ready;
        this.assertBucket(bucket);
        const existed = await this.hasBucket(bucket);
        if (this.options.dir) await fsp.mkdir(this.bucketPath(bucket), {
            recursive: true
        });
        if (!this.buckets.has(bucket)) this.buckets.set(bucket, new ObjectStore(this.options.dir ? new DiskObjectBackend({
            dir: this.bucketPath(bucket)
        }) : new InMemoryObjectBackend()));
        return !existed;
    }
    async hasBucket(bucket) {
        await this.ready;
        if (!isSafeBucket(bucket)) return false;
        if (this.buckets.has(bucket)) return true;
        if (!this.options.dir) return false;
        try {
            return (await fsp.stat(this.bucketPath(bucket))).isDirectory();
        } catch  {
            return false;
        }
    }
    async listBuckets() {
        await this.ready;
        const names = new Set(this.buckets.keys());
        if (this.options.dir) {
            try {
                for (const entry of (await fsp.readdir(this.options.dir, {
                    withFileTypes: true
                }))){
                    if (entry.isDirectory() && isSafeBucket(entry.name)) names.add(entry.name);
                }
            } catch  {}
        }
        return [
            ...names
        ].sort().map((name)=>({
                name
            }));
    }
    async deleteBucket(bucket) {
        await this.ready;
        if (!isSafeBucket(bucket)) return "absent";
        const list = await this.listObjects(bucket, {});
        if (list === null) return "absent";
        if (list.keys.length || list.commonPrefixes.length) return "not-empty";
        this.buckets.delete(bucket);
        if (this.options.dir) await fsp.rm(this.bucketPath(bucket), {
            recursive: true,
            force: true
        });
        return "deleted";
    }
    async putObject(bucket, key, body, opts = {}) {
        if (!key) throw new TypeError("objectStore: a non-empty key is required");
        const store = await this.backendFor(bucket, true);
        const data = await collectBody(body);
        const metadata = await store.put(key, data, {
            contentType: opts.contentType ?? "application/octet-stream",
            userMeta: opts.metadata ?? {}
        });
        const out = {
            body: Buffer.from(data),
            size: metadata.size,
            contentType: metadata.contentType ?? "application/octet-stream",
            metadata: metadata.userMeta ?? {}
        };
        if (metadata.etag !== undefined) out.etag = metadata.etag;
        if (metadata.lastModified !== undefined) out.lastModified = metadata.lastModified;
        return out;
    }
    async getObject(bucket, key) {
        const store = await this.backendFor(bucket, false);
        if (!store) return null;
        const obj = await store.get(key);
        if (!obj) return null;
        const chunks = [];
        for await (const chunk of obj.body)chunks.push(Buffer.from(chunk));
        const out = {
            body: Buffer.concat(chunks),
            size: obj.meta.size,
            contentType: obj.meta.contentType ?? "application/octet-stream",
            metadata: obj.meta.userMeta ?? {}
        };
        if (obj.meta.etag !== undefined) out.etag = obj.meta.etag;
        if (obj.meta.lastModified !== undefined) out.lastModified = obj.meta.lastModified;
        return out;
    }
    async headObject(bucket, key) {
        const store = await this.backendFor(bucket, false);
        if (!store) return null;
        const meta = await store.head(key);
        if (!meta) return null;
        const out = {
            size: meta.size,
            contentType: meta.contentType ?? "application/octet-stream",
            metadata: meta.userMeta ?? {}
        };
        if (meta.etag !== undefined) out.etag = meta.etag;
        if (meta.lastModified !== undefined) out.lastModified = meta.lastModified;
        return out;
    }
    async deleteObject(bucket, key) {
        const store = await this.backendFor(bucket, false);
        return store ? store.delete(key) : false;
    }
    async listObjects(bucket, opts = {}) {
        const store = await this.backendFor(bucket, false);
        if (!store) return null;
        return listKeys((await store.list(opts.prefix ?? "", Number.MAX_SAFE_INTEGER)).map((meta)=>({
                key: meta.key,
                size: meta.size,
                ...meta.etag === undefined ? {} : {
                    etag: meta.etag
                },
                ...meta.lastModified === undefined ? {} : {
                    lastModified: meta.lastModified
                }
            })), opts);
    }
}
export function objectStore(options = {}) {
    return new BucketedObjectStore(options);
}
export function s3Resource(store, prefix = "/objects") {
    if (store instanceof BucketedObjectStore) {
        return s3BucketsResource(store, {
            mount: typeof prefix === "string" ? prefix : prefix.mount ?? "/"
        });
    }
    if (typeof prefix !== "string") prefix = prefix.mount ?? "/objects";
    const root = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
    const objectPrefix = `${root}/`;
    function keyFrom(path) {
        if (!path.startsWith(objectPrefix)) return null;
        const raw = path.slice(objectPrefix.length);
        if (!raw) return null;
        return raw.split("/").map((part)=>{
            try {
                return decodeURIComponent(part);
            } catch  {
                return part;
            }
        }).join("/");
    }
    function userMetaHeaders(meta) {
        const headers = {};
        for (const [key, value] of Object.entries(meta.userMeta ?? {})){
            headers[`X-Amz-Meta-${key}`] = value;
        }
        return headers;
    }
    return [
        {
            match: (path)=>{
                const key = keyFrom(path);
                return key === null ? false : {
                    key
                };
            },
            methods: [
                "GET",
                "HEAD",
                "PUT",
                "DELETE"
            ],
            handler: async (ctx)=>{
                const key = ctx.params["key"] ?? "";
                const method = ctx.req.method ?? "GET";
                if (method === "GET" || method === "HEAD") {
                    const obj = await store.get(key);
                    if (!obj) {
                        ctx.res.writeHead(404).end("Not Found");
                        return;
                    }
                    if (obj.meta.contentType) ctx.res.setHeader("Content-Type", obj.meta.contentType);
                    if (obj.meta.etag) ctx.res.setHeader("ETag", obj.meta.etag);
                    if (obj.meta.lastModified) ctx.res.setHeader("Last-Modified", obj.meta.lastModified.toUTCString());
                    for (const [name, value] of Object.entries(userMetaHeaders(obj.meta)))ctx.res.setHeader(name, value);
                    ctx.res.setHeader("Content-Length", obj.meta.size);
                    if (method === "HEAD") {
                        ctx.res.writeHead(200).end();
                        return;
                    }
                    ctx.res.writeHead(200);
                    for await (const chunk of obj.body)ctx.res.write(chunk);
                    ctx.res.end();
                } else if (method === "PUT") {
                    const chunks = [];
                    await new Promise((res, rej)=>{
                        ctx.req.on("data", (c)=>chunks.push(c));
                        ctx.req.on("end", ()=>res());
                        ctx.req.on("error", rej);
                    });
                    const body = Buffer.concat(chunks);
                    const ct = ctx.req.headers["content-type"];
                    const userMeta = {};
                    for (const [name, value] of Object.entries(ctx.req.headers)){
                        if (!name.toLowerCase().startsWith("x-amz-meta-") || value === undefined) continue;
                        userMeta[name.slice("x-amz-meta-".length)] = Array.isArray(value) ? value.join(",") : String(value);
                    }
                    const putMeta = {};
                    if (ct !== undefined) putMeta.contentType = Array.isArray(ct) ? ct[0] : ct;
                    if (Object.keys(userMeta).length) putMeta.userMeta = userMeta;
                    const meta = await store.put(key, body, putMeta);
                    if (meta.etag) ctx.res.setHeader("ETag", meta.etag);
                    ctx.res.setHeader("Content-Type", "application/json");
                    ctx.res.writeHead(200).end(JSON.stringify(meta));
                } else if (method === "DELETE") {
                    const ok = await store.delete(key);
                    ctx.res.writeHead(ok ? 204 : 404).end();
                }
            }
        },
        {
            match: root,
            methods: [
                "GET"
            ],
            handler: async (ctx)=>{
                const prefix = ctx.url.searchParams.get("prefix") ?? undefined;
                const limit = parseInt(ctx.url.searchParams.get("limit") ?? "1000", 10);
                const list = await store.list(prefix, limit);
                ctx.res.setHeader("Content-Type", "application/json");
                ctx.res.writeHead(200).end(JSON.stringify(list));
            }
        }
    ];
}
