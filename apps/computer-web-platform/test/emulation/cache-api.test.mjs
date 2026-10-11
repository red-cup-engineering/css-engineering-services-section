import assert from "node:assert/strict";
import { test } from "node:test";
import { Cache, CacheStorage, caches, openCache } from "../../src/emulation/cache-api.mjs";
test("put + match round-trips a cloned response body and status", async ()=>{
    const cache = new Cache();
    await cache.put("https://example.com/a", new Response("hello", {
        status: 200
    }));
    const hit = await cache.match("https://example.com/a");
    assert.ok(hit);
    assert.equal(hit.status, 200);
    assert.equal(await hit.text(), "hello");
    const hit2 = await cache.match("https://example.com/a");
    assert.equal(await hit2.text(), "hello");
});
test("match ignores search by default distinction, honoring ignoreSearch option", async ()=>{
    const cache = new Cache();
    await cache.put("https://example.com/a?x=1", new Response("v1"));
    assert.equal(await cache.match("https://example.com/a?x=2"), undefined);
    const hit = await cache.match("https://example.com/a?x=2", {
        ignoreSearch: true
    });
    assert.ok(hit);
    assert.equal(await hit.text(), "v1");
});
test("HEAD queries match a stored GET response, but not the reverse", async ()=>{
    const cache = new Cache();
    await cache.put("https://example.com/a", new Response("body"));
    const headReq = new Request("https://example.com/a", {
        method: "HEAD"
    });
    assert.ok(await cache.match(headReq));
});
test("put rejects non-GET requests, 206 responses, and out-of-range statuses", async ()=>{
    const cache = new Cache();
    await assert.rejects(()=>cache.put(new Request("https://example.com/a", {
            method: "POST"
        }), new Response("x")), TypeError);
    await assert.rejects(()=>cache.put("https://example.com/a", new Response("x", {
            status: 206
        })), TypeError);
    await assert.rejects(()=>cache.put("https://example.com/a", new Response("x", {
            status: 404
        })), TypeError);
});
test("a response with Cache-Control: no-store is silently dropped, not stored", async ()=>{
    const cache = new Cache();
    await cache.put("https://example.com/a", new Response("x", {
        headers: {
            "cache-control": "no-store"
        }
    }));
    assert.equal(await cache.match("https://example.com/a"), undefined);
});
test("Vary matching: a second put with a differing vary-relevant header adds a distinct record", async ()=>{
    const cache = new Cache();
    await cache.put(new Request("https://example.com/a", {
        headers: {
            "accept-language": "en"
        }
    }), new Response("en-body", {
        headers: {
            vary: "Accept-Language"
        }
    }));
    await cache.put(new Request("https://example.com/a", {
        headers: {
            "accept-language": "fr"
        }
    }), new Response("fr-body", {
        headers: {
            vary: "Accept-Language"
        }
    }));
    const enHit = await cache.match(new Request("https://example.com/a", {
        headers: {
            "accept-language": "en"
        }
    }));
    const frHit = await cache.match(new Request("https://example.com/a", {
        headers: {
            "accept-language": "fr"
        }
    }));
    assert.equal(await enHit.text(), "en-body");
    assert.equal(await frHit.text(), "fr-body");
    assert.equal((await cache.matchAll(undefined)).length, 2);
});
test("delete removes matching records and reports whether anything was removed", async ()=>{
    const cache = new Cache();
    await cache.put("https://example.com/a", new Response("x"));
    assert.equal(await cache.delete("https://example.com/does-not-exist"), false);
    assert.equal(await cache.delete("https://example.com/a"), true);
    assert.equal(await cache.match("https://example.com/a"), undefined);
});
test("addAll uses the injected fetch and rejects on a non-ok response", async ()=>{
    let called = 0;
    const fakeFetch = async (req)=>{
        called++;
        if (String(req.url ?? req).endsWith("/missing")) return new Response("nope", {
            status: 404
        });
        return new Response("fetched", {
            status: 200
        });
    };
    const cache = new Cache({
        fetch: fakeFetch
    });
    await cache.addAll([
        "https://example.com/ok"
    ]);
    assert.equal(called, 1);
    assert.equal(await (await cache.match("https://example.com/ok")).text(), "fetched");
    await assert.rejects(()=>cache.addAll([
            "https://example.com/missing"
        ]), TypeError);
});
test("addAll without an injected fetch (and none global) throws", async ()=>{
    const cache = new Cache({
        fetch: null
    });
    await assert.rejects(()=>cache.add("https://example.com/x"), TypeError);
});
test("CacheStorage.open memoizes caches by name; keys/has/delete manage the namespace map", async ()=>{
    const storage = new CacheStorage();
    const a1 = await storage.open("a");
    const a2 = await storage.open("a");
    assert.equal(a1, a2);
    assert.deepEqual(await storage.keys(), [
        "a"
    ]);
    assert.equal(await storage.has("a"), true);
    assert.equal(await storage.has("b"), false);
    assert.equal(await storage.delete("a"), true);
    assert.deepEqual(await storage.keys(), []);
});
test("openCache defaults to the shared module-level `caches` singleton, but accepts an explicit storage", async ()=>{
    const cache = await openCache("shared-test-cache");
    assert.equal(await caches.has("shared-test-cache"), true);
    const isolated = new CacheStorage();
    const scoped = await openCache("scoped", {
        storage: isolated
    });
    assert.equal(await isolated.has("scoped"), true);
    assert.equal(await caches.has("scoped"), false);
    assert.notEqual(cache, scoped);
});
