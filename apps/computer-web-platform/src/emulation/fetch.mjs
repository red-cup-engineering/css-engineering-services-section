import * as http from "node:http";
import * as https from "node:https";
import { TellingLog, tellSides } from "@red-cup-engineering/signchain/log";
const store = new TellingLog();
async function doFetch(url, opts, redirectsLeft) {
    return new Promise((resolve, reject)=>{
        const parsedUrl = new URL(url);
        const mod = parsedUrl.protocol === "https:" ? https : http;
        const headers = {
            ...opts.headers ?? {}
        };
        if (opts.body) headers["Content-Length"] = String(Buffer.byteLength(opts.body));
        const req = mod.request({
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: opts.method ?? "GET",
            headers
        }, (res)=>{
            if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) && res.headers.location && redirectsLeft > 0) {
                const nextUrl = new URL(res.headers.location, url).toString();
                res.resume();
                const nextMethod = res.statusCode === 302 || res.statusCode === 301 ? opts.method ?? "GET" : opts.method ?? "GET";
                doFetch(nextUrl, {
                    ...opts,
                    method: nextMethod
                }, redirectsLeft - 1).then(resolve, reject);
                return;
            }
            const h = {};
            for (const [k, v] of Object.entries(res.headers)){
                if (typeof v === "string") h[k] = v;
                else if (Array.isArray(v)) h[k] = v.join(", ");
            }
            let bodyPromise = null;
            const getBody = ()=>{
                if (bodyPromise) return bodyPromise;
                bodyPromise = new Promise((r, rej)=>{
                    const chunks = [];
                    res.on("data", (c)=>chunks.push(c));
                    res.on("end", ()=>r(Buffer.concat(chunks)));
                    res.on("error", rej);
                });
                return bodyPromise;
            };
            resolve({
                status: res.statusCode ?? 0,
                headers: h,
                body: getBody,
                async json () {
                    return JSON.parse((await getBody()).toString("utf8"));
                },
                async text () {
                    return (await getBody()).toString("utf8");
                }
            });
        });
        if (opts.timeoutMs) req.setTimeout(opts.timeoutMs, ()=>req.destroy(new Error("fetch timeout")));
        req.on("error", reject);
        if (opts.body) req.write(opts.body);
        req.end();
    });
}
export async function fetch(url, opts = {}) {
    const retries = opts.retries ?? 0;
    const retryDelayMs = opts.retryDelayMs ?? 1000;
    const retryOn = opts.retryOn ?? ((s)=>s >= 500);
    const followRedirects = opts.followRedirects ?? 5;
    for(let attempt = 0; attempt <= retries; attempt++){
        let response = null;
        let fetchErr = null;
        try {
            response = await doFetch(url, {
                ...opts,
                timeoutMs: opts.timeoutMs ?? 30_000
            }, followRedirects);
        } catch (err) {
            fetchErr = err;
        }
        const status = response?.status ?? 0;
        const success = response !== null && !retryOn(status);
        const memeCharge = success ? "potential" : "active";
        tellSides(store, {
            subject: url,
            predicate: "fetch",
            object: memeCharge
        }, success ? [
            true,
            false
        ] : [
            false,
            true
        ]);
        if (memeCharge === "potential") return response;
        if (attempt < retries) {
            await new Promise((r)=>setTimeout(r, retryDelayMs * (attempt + 1)));
            continue;
        }
        if (fetchErr) throw fetchErr;
        return response;
    }
    throw new Error(`fetch failed after ${retries + 1} attempts: ${url}`);
}
export async function fetchJson(url, body, opts = {}) {
    const res = await fetch(url, {
        ...opts,
        method: opts.method ?? "POST",
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json",
            ...opts.headers ?? {}
        }
    });
    return res.json();
}
