import assert from "node:assert/strict";
import test from "node:test";
import { responseCache } from "../../src/edge/cache.mjs";
import { startMiddlewareServer } from "./helpers/server.mjs";
test("responseCache: MISS then HIT for a repeated GET with an s-maxage response", async ()=>{
    let hits = 0;
    const cache = responseCache({ now: () => Date.now() });
    const server = await startMiddlewareServer([
        cache,
        (ctx)=>{
            hits++;
            ctx.res.writeHead(200, {
                "content-type": "text/plain",
                "cache-control": "s-maxage=60"
            }).end(`hit ${hits}`);
        }
    ]);
    try {
        const first = await fetch(server.url);
        assert.equal(first.headers.get("x-cache"), "MISS");
        assert.equal(await first.text(), "hit 1");
        const second = await fetch(server.url);
        assert.equal(second.headers.get("x-cache"), "HIT");
        assert.equal(await second.text(), "hit 1", "the cached body should be replayed, not regenerated");
        assert.equal(hits, 1, "the downstream handler should run once");
        const stats = cache.stats();
        assert.equal(stats.hits, 1);
        assert.equal(stats.misses, 1);
        assert.equal(stats.entries, 1);
    } finally{
        await server.close();
    }
});
test("responseCache: Cache-Control: no-store on the response is never stored", async ()=>{
    const cache = responseCache({ now: () => Date.now() });
    const server = await startMiddlewareServer([
        cache,
        (ctx)=>{
            ctx.res.writeHead(200, {
                "cache-control": "no-store"
            }).end("secret");
        }
    ]);
    try {
        await fetch(server.url);
        await fetch(server.url);
        assert.equal(cache.stats().entries, 0);
        assert.equal(cache.stats().stores, 0);
    } finally{
        await server.close();
    }
});
test("responseCache: a request Cache-Control: no-store bypasses the cache without counting as hit/miss", async ()=>{
    const cache = responseCache({ now: () => Date.now() });
    const server = await startMiddlewareServer([
        cache,
        (ctx)=>{
            ctx.res.writeHead(200, {
                "cache-control": "s-maxage=60"
            }).end("body");
        }
    ]);
    try {
        const res = await fetch(server.url, {
            headers: {
                "cache-control": "no-store"
            }
        });
        assert.equal(res.headers.get("x-cache"), null);
        assert.equal(cache.stats().bypasses, 1);
        assert.equal(cache.stats().entries, 0);
    } finally{
        await server.close();
    }
});
test("responseCache: POST requests bypass storage and are not cached", async ()=>{
    const cache = responseCache({ now: () => Date.now() });
    const server = await startMiddlewareServer([
        cache,
        (ctx)=>{
            ctx.res.writeHead(200, {
                "cache-control": "s-maxage=60"
            }).end("posted");
        }
    ]);
    try {
        const res = await fetch(server.url, {
            method: "POST"
        });
        assert.equal(res.headers.get("x-cache"), null);
        assert.equal(cache.stats().entries, 0);
    } finally{
        await server.close();
    }
});
test("responseCache: purge() with no predicate clears every entry and returns the count removed", async ()=>{
    const cache = responseCache({ now: () => Date.now() });
    const server = await startMiddlewareServer([
        cache,
        (ctx)=>{
            ctx.res.writeHead(200, {
                "cache-control": "s-maxage=60"
            }).end("x");
        }
    ]);
    try {
        await fetch(`${server.url}/a`);
        await fetch(`${server.url}/b`);
        assert.equal(cache.stats().entries, 2);
        const removed = cache.purge();
        assert.equal(removed, 2);
        assert.equal(cache.stats().entries, 0);
    } finally{
        await server.close();
    }
});
test("responseCache: a Set-Cookie response is never stored", async ()=>{
    const cache = responseCache({ now: () => Date.now() });
    const server = await startMiddlewareServer([
        cache,
        (ctx)=>{
            ctx.res.writeHead(200, {
                "cache-control": "s-maxage=60",
                "set-cookie": "sid=1"
            }).end("body");
        }
    ]);
    try {
        await fetch(server.url);
        assert.equal(cache.stats().entries, 0, "responses that set cookies must not be cached");
    } finally{
        await server.close();
    }
});
