import assert from "node:assert/strict";
import test from "node:test";
import { memoryRateLimitStore, rateLimit, bodyLimit, concurrencyLimit, requestTimeout } from "../../src/edge/limits.mjs";
import { startMiddlewareServer } from "./helpers/server.mjs";
test("memoryRateLimitStore: increments totalHits within the same window", ()=>{
    const store = memoryRateLimitStore();
    const first = store.increment("k", 1000, 0);
    const second = store.increment("k", 1000, 100);
    assert.equal(first.totalHits, 1);
    assert.equal(second.totalHits, 2);
    assert.equal(store.size, 1);
});
test("memoryRateLimitStore: drops hits that fall outside the sliding window", ()=>{
    const store = memoryRateLimitStore();
    store.increment("k", 1000, 0);
    const later = store.increment("k", 1000, 5000);
    assert.equal(later.totalHits, 1, "the hit at t=0 should have aged out of a 1000ms window by t=5000");
});
test("memoryRateLimitStore: decrement removes one hit and resetKey clears the key", ()=>{
    const store = memoryRateLimitStore();
    store.increment("k", 1000, 0);
    store.increment("k", 1000, 0);
    store.decrement?.("k");
    assert.equal(store.increment("k", 1000, 0).totalHits, 2);
    store.resetKey?.("k");
    assert.equal(store.increment("k", 1000, 0).totalHits, 1);
});
test("rateLimit: allows requests under the limit and sets legacy X-RateLimit headers by default", async ()=>{
    const server = await startMiddlewareServer(rateLimit({
        maxRequests: 2,
        windowMs: 60_000
    }));
    try {
        const res = await fetch(server.url);
        assert.equal(res.status, 200);
        assert.equal(res.headers.get("x-ratelimit-limit"), "2");
        assert.equal(res.headers.get("x-ratelimit-remaining"), "1");
    } finally{
        await server.close();
    }
});
test("rateLimit: denies with 429 and Retry-After once the limit is exceeded", async ()=>{
    const server = await startMiddlewareServer(rateLimit({
        maxRequests: 1,
        windowMs: 60_000
    }));
    try {
        const first = await fetch(server.url);
        assert.equal(first.status, 200);
        const second = await fetch(server.url);
        assert.equal(second.status, 429);
        assert.equal(await second.text(), "Too Many Requests");
        assert.ok(second.headers.get("retry-after"));
    } finally{
        await server.close();
    }
});
test("rateLimit: rejects a non-positive-integer windowMs/maxRequests", ()=>{
    assert.throws(()=>rateLimit({
            windowMs: 0
        }), TypeError);
    assert.throws(()=>rateLimit({
            maxRequests: -1
        }), TypeError);
});
test("bodyLimit: rejects a request whose Content-Length exceeds maxBytes with 413", async ()=>{
    const server = await startMiddlewareServer(bodyLimit({
        maxBytes: 10
    }));
    try {
        const res = await fetch(server.url, {
            method: "POST",
            body: "x".repeat(20)
        });
        assert.equal(res.status, 413);
        assert.equal(await res.text(), "Content Too Large");
    } finally{
        await server.close();
    }
});
test("bodyLimit: allows a request within maxBytes through to the next middleware", async ()=>{
    let ran = false;
    const server = await startMiddlewareServer([
        bodyLimit({
            maxBytes: 1024
        }),
        (ctx)=>{
            ran = true;
            ctx.res.end("ok");
        }
    ]);
    try {
        const res = await fetch(server.url, {
            method: "POST",
            body: "short"
        });
        assert.equal(res.status, 200);
        assert.equal(ran, true);
    } finally{
        await server.close();
    }
});
test("concurrencyLimit: denies with 503 once max concurrent in-flight requests is reached", async ()=>{
    let release;
    const gate = new Promise((r)=>{
        release = r;
    });
    const server = await startMiddlewareServer([
        concurrencyLimit({
            max: 1
        }),
        async (ctx)=>{
            await gate;
            ctx.res.end("done");
        }
    ]);
    try {
        const first = fetch(server.url);
        await new Promise((r)=>setTimeout(r, 50));
        const second = await fetch(server.url);
        assert.equal(second.status, 503);
        release();
        const firstRes = await first;
        assert.equal(firstRes.status, 200);
    } finally{
        await server.close();
    }
});
test("requestTimeout: responds 408 and destroys the request once the timeout elapses", async ()=>{
    const server = await startMiddlewareServer([
        requestTimeout(30),
        async (ctx)=>{
            await new Promise((r)=>setTimeout(r, 200));
            if (!ctx.res.headersSent) ctx.res.end("too slow to matter");
        }
    ]);
    try {
        const res = await fetch(server.url);
        assert.equal(res.status, 408);
        assert.equal(await res.text(), "Request Timeout");
    } finally{
        await server.close();
    }
});
