import { parseCacheControl } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/cache-control";
function requestOf(info) {
    if (info instanceof Request) return info;
    return new Request(String(info instanceof URL ? info.href : info));
}
function searchOptions(ignoreSearch) {
    return ignoreSearch === undefined ? {} : {
        ignoreSearch
    };
}
function urlKey(url, { ignoreSearch = false } = {}) {
    const parsed = new URL(url);
    parsed.hash = "";
    if (ignoreSearch) parsed.search = "";
    return parsed.href;
}
function methodMatches(queryReq, storedReq, { ignoreMethod = false } = {}) {
    if (ignoreMethod) return true;
    if (queryReq.method === storedReq.method) return true;
    return queryReq.method === "HEAD" && storedReq.method === "GET";
}
function hasNoStore(cacheControl) {
    return parseCacheControl(cacheControl).noStore === true;
}
function varyMatches(queryReq, storedReq, storedRes, { ignoreVary = false } = {}) {
    if (ignoreVary) return true;
    const vary = storedRes.headers.get("vary");
    if (!vary) return true;
    if (vary.trim() === "*") return false;
    for (const raw of vary.split(",")){
        const field = raw.trim().toLowerCase();
        if (!field) continue;
        if ((queryReq.headers.get(field) ?? "") !== (storedReq.headers.get(field) ?? "")) return false;
    }
    return true;
}
async function bufferResponse(response) {
    const buf = await response.arrayBuffer();
    const nullBody = response.status === 204 || response.status === 205 || response.status === 304;
    return new Response(nullBody ? null : buf, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
    });
}
export class Cache {
    #store = new Map();
    #fetch;
    constructor(options = {}){
        this.#fetch = "fetch" in options ? options.fetch ?? null : typeof fetch === "function" ? fetch : null;
    }
    #records(request, { ignoreSearch = false } = {}) {
        if (!ignoreSearch) return this.#store.get(urlKey(request.url)) ?? [];
        const want = urlKey(request.url, {
            ignoreSearch: true
        });
        const out = [];
        for (const [key, records] of this.#store){
            if (urlKey(key, {
                ignoreSearch: true
            }) === want) out.push(...records);
        }
        return out;
    }
    #find(request, options = {}) {
        for (const record of this.#records(request, options)){
            if (!methodMatches(request, record.request, options)) continue;
            if (!varyMatches(request, record.request, record.response, options)) continue;
            return record;
        }
        return undefined;
    }
    async match(request, options = {}) {
        const record = this.#find(requestOf(request), options);
        return record ? record.response.clone() : undefined;
    }
    async matchAll(request, options = {}) {
        const out = [];
        if (request === undefined) {
            for (const records of this.#store.values()){
                for (const record of records)out.push(record.response.clone());
            }
            return out;
        }
        const req = requestOf(request);
        for (const record of this.#records(req, options)){
            if (!methodMatches(req, record.request, options)) continue;
            if (!varyMatches(req, record.request, record.response, options)) continue;
            out.push(record.response.clone());
        }
        return out;
    }
    async put(request, response) {
        const req = requestOf(request);
        if (req.method !== "GET") throw new TypeError(`Cache.put: request method ${req.method} is not GET`);
        if (response.status === 206) throw new TypeError("Cache.put: a 206 Partial Content response cannot be cached");
        if (response.status < 200 || response.status > 299) {
            if (response.status !== 0) throw new TypeError(`Cache.put: response status ${response.status} is not cacheable`);
        }
        if (response.bodyUsed) throw new TypeError("Cache.put: response body is already used");
        if (hasNoStore(response.headers.get("cache-control"))) {
            try {
                await response.clone().arrayBuffer();
            } catch  {}
            return;
        }
        const buffered = await bufferResponse(response.clone());
        const key = urlKey(req.url);
        const records = this.#store.get(key) ?? [];
        const idx = records.findIndex((record)=>varyMatches(req, record.request, record.response) && varyMatches(req, record.request, buffered));
        const next = {
            request: req.clone(),
            response: buffered
        };
        if (idx === -1) records.push(next);
        else records[idx] = next;
        this.#store.set(key, records);
    }
    async add(request) {
        await this.addAll([
            request
        ]);
    }
    async addAll(requests) {
        if (!this.#fetch) throw new TypeError("Cache.add: no fetch implementation injected");
        const reqs = requests.map(requestOf);
        const responses = await Promise.all(reqs.map(async (req)=>{
            const res = await this.#fetch(req);
            if (!res.ok) throw new TypeError(`Cache.add: request to ${req.url} failed (status ${res.status})`);
            return res;
        }));
        await Promise.all(reqs.map((req, index)=>this.put(req, responses[index])));
    }
    async delete(request, options = {}) {
        const req = requestOf(request);
        const search = searchOptions(options.ignoreSearch);
        const want = urlKey(req.url, search);
        let removed = false;
        for (const [key, records] of [
            ...this.#store
        ]){
            if (urlKey(key, search) !== want) continue;
            const kept = records.filter((record)=>!(methodMatches(req, record.request, options) && varyMatches(req, record.request, record.response, options)));
            if (kept.length === records.length) continue;
            removed = true;
            if (kept.length) this.#store.set(key, kept);
            else this.#store.delete(key);
        }
        return removed;
    }
    async keys(request, options = {}) {
        const out = [];
        if (request === undefined) {
            for (const records of this.#store.values()){
                for (const record of records)out.push(record.request.clone());
            }
            return out;
        }
        const req = requestOf(request);
        for (const record of this.#records(req, options)){
            if (!methodMatches(req, record.request, options)) continue;
            if (!varyMatches(req, record.request, record.response, options)) continue;
            out.push(record.request.clone());
        }
        return out;
    }
}
export class CacheStorage {
    #caches = new Map();
    #fetch;
    #hasFetch;
    constructor(options = {}){
        this.#hasFetch = "fetch" in options;
        this.#fetch = options.fetch;
    }
    async open(name) {
        const key = String(name);
        let cache = this.#caches.get(key);
        if (!cache) {
            cache = new Cache(this.#hasFetch ? {
                fetch: this.#fetch ?? null
            } : {});
            this.#caches.set(key, cache);
        }
        return cache;
    }
    async has(name) {
        return this.#caches.has(String(name));
    }
    async delete(name) {
        return this.#caches.delete(String(name));
    }
    async keys() {
        return [
            ...this.#caches.keys()
        ];
    }
    async match(request, options = {}) {
        if (options.cacheName !== undefined) {
            const cache = this.#caches.get(String(options.cacheName));
            return cache ? cache.match(request, options) : undefined;
        }
        for (const cache of this.#caches.values()){
            const hit = await cache.match(request, options);
            if (hit !== undefined) return hit;
        }
        return undefined;
    }
}
export const caches = new CacheStorage();
export function openCache(name, options = {}) {
    if ("fetch" in options) return new CacheStorage({
        fetch: options.fetch ?? null
    }).open(name);
    return (options.storage ?? caches).open(name);
}
