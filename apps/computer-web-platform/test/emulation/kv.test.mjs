import assert from "node:assert/strict";
import { test } from "node:test";
import { EventEmitter } from "node:events";
import { kvStore, KvStore, kvResource, memoryBackend } from "../../src/emulation/kv.mjs";
function fakeClock(startMs = 1_000_000) {
    let now = startMs;
    return {
        clock: {
            now: ()=>now,
            interval: ()=>null,
            cancel: ()=>{}
        },
        advance: (ms)=>{
            now += ms;
        }
    };
}
test("set/get/delete round-trip and versionstamp changes on every write", ()=>{
    const { clock } = fakeClock();
    const store = kvStore({
        clock,
        sweepMs: 0
    });
    const first = store.set([
        "a",
        "b"
    ], 1);
    const entry = store.get([
        "a",
        "b"
    ]);
    assert.equal(entry.value, 1);
    assert.equal(entry.versionstamp, first.versionstamp);
    const second = store.set([
        "a",
        "b"
    ], 2);
    assert.notEqual(second.versionstamp, first.versionstamp);
    assert.equal(store.get([
        "a",
        "b"
    ]).value, 2);
    store.delete([
        "a",
        "b"
    ]);
    assert.equal(store.get([
        "a",
        "b"
    ]), null);
});
test("TTL entries expire on read and are swept by an explicit sweep() call", ()=>{
    const { clock, advance } = fakeClock();
    const store = kvStore({
        clock,
        sweepMs: 0
    });
    store.set("k", "v", {
        ttlMs: 1000
    });
    assert.equal(store.get("k").value, "v");
    advance(1001);
    assert.equal(store.get("k"), null);
    store.set("k2", "v2", {
        ttlMs: 1000
    });
    advance(1001);
    store.sweep();
    assert.equal(store.list().length, 0);
});
test("list respects hierarchical prefix, reverse, and limit, and is lexicographically ordered", ()=>{
    const { clock } = fakeClock();
    const store = kvStore({
        clock,
        sweepMs: 0
    });
    store.set([
        "users",
        "1"
    ], "alice");
    store.set([
        "users",
        "2"
    ], "bob");
    store.set([
        "posts",
        "1"
    ], "hello");
    const users = store.list({
        prefix: [
            "users"
        ]
    });
    assert.deepEqual(users.map((e)=>e.value), [
        "alice",
        "bob"
    ]);
    const reversed = store.list({
        prefix: [
            "users"
        ],
        reverse: true
    });
    assert.deepEqual(reversed.map((e)=>e.value), [
        "bob",
        "alice"
    ]);
    const limited = store.list({
        limit: 1
    });
    assert.equal(limited.length, 1);
});
test("atomic() commits only when all checks pass, and fails clean on a versionstamp mismatch", ()=>{
    const { clock } = fakeClock();
    const store = kvStore({
        clock,
        sweepMs: 0
    });
    const { versionstamp } = store.set("k", "v1");
    const badCommit = store.atomic().check("k", "wrong-stamp").set("k", "v2").commit();
    assert.equal(badCommit.ok, false);
    assert.equal(store.get("k").value, "v1");
    const goodCommit = store.atomic().check("k", versionstamp).set("k", "v2").commit();
    assert.equal(goodCommit.ok, true);
    assert.equal(store.get("k").value, "v2");
});
test("applyRemote is last-write-wins by versionstamp string comparison", ()=>{
    const { clock } = fakeClock();
    const store = kvStore({
        clock,
        sweepMs: 0
    });
    const applied = store.applyRemote({
        type: "set",
        key: [
            "k"
        ],
        value: "remote-1",
        versionstamp: "0000000000000001",
        expireAt: null
    });
    assert.equal(applied.ok, true);
    assert.equal(store.get("k").value, "remote-1");
    const stale = store.applyRemote({
        type: "set",
        key: [
            "k"
        ],
        value: "remote-0",
        versionstamp: "0000000000000000",
        expireAt: null
    });
    assert.equal(stale.ok, false);
    assert.equal(store.get("k").value, "remote-1");
});
test("onChange fires with the decoded key on set, atomic commit, and delete", ()=>{
    const { clock } = fakeClock();
    const changes = [];
    const store = kvStore({
        clock,
        sweepMs: 0,
        onChange: (m)=>changes.push(m)
    });
    store.set([
        "a",
        "b"
    ], 1);
    store.delete([
        "a",
        "b"
    ]);
    store.atomic().set([
        "c"
    ], 2).commit();
    assert.deepEqual(changes.map((c)=>[
            c.type,
            c.key
        ]), [
        [
            "set",
            [
                "a",
                "b"
            ]
        ],
        [
            "delete",
            [
                "a",
                "b"
            ]
        ],
        [
            "set",
            [
                "c"
            ]
        ]
    ]);
});
test("KvStore namespaces every key so two namespaces over the same backend cannot collide", ()=>{
    const { clock } = fakeClock();
    const backend = memoryBackend();
    const users = new KvStore("users", {
        clock,
        sweepMs: 0,
        backend
    });
    const posts = new KvStore("posts", {
        clock,
        sweepMs: 0,
        backend
    });
    users.set("1", "alice");
    posts.set("1", "hello");
    assert.equal(users.get("1"), "alice");
    assert.equal(posts.get("1"), "hello");
    assert.deepEqual(users.list().map((e)=>e.key), [
        "1"
    ]);
});
test("KvStore.cas only writes when the current value deep-equals `expected`", ()=>{
    const { clock } = fakeClock();
    const store = new KvStore("ns", {
        clock,
        sweepMs: 0
    });
    store.set("k", {
        n: 1
    });
    assert.equal(store.cas("k", {
        n: 0
    }, {
        n: 2
    }), false);
    assert.deepEqual(store.get("k"), {
        n: 1
    });
    assert.equal(store.cas("k", {
        n: 1
    }, {
        n: 2
    }), true);
    assert.deepEqual(store.get("k"), {
        n: 2
    });
});
function mockReqRes(method, url, { body, headers = {} } = {}) {
    const req = new EventEmitter();
    req.method = method;
    req.headers = headers;
    const res = {
        statusCode: undefined,
        headers: {},
        body: undefined,
        setHeader (name, value) {
            this.headers[name.toLowerCase()] = value;
        },
        writeHead (status) {
            this.statusCode = status;
            return res;
        },
        end (chunk) {
            this.body = chunk;
            return res;
        }
    };
    const ctx = {
        req,
        res,
        url: new URL(url, "http://localhost")
    };
    if (body !== undefined) {
        queueMicrotask(()=>{
            req.emit("data", Buffer.from(body));
            req.emit("end");
        });
    } else if (method !== "GET" && method !== "HEAD" && method !== "DELETE") {
        queueMicrotask(()=>req.emit("end"));
    }
    return {
        req,
        res,
        ctx
    };
}
test("kvResource GET on a single key returns the JSON value with an ETag, or 404 when absent", async ()=>{
    const { clock } = fakeClock();
    const store = kvStore({
        clock,
        sweepMs: 0
    });
    store.set([
        "greeting"
    ], "hi");
    const resource = kvResource(store, {
        mount: "/kv/"
    });
    const { res, ctx } = mockReqRes("GET", "/kv/greeting");
    await resource.handler(ctx);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, JSON.stringify("hi"));
    assert.ok(res.headers.etag);
    const { res: res404, ctx: ctx404 } = mockReqRes("GET", "/kv/missing");
    await resource.handler(ctx404);
    assert.equal(res404.statusCode, 404);
});
test("kvResource PUT writes JSON body and honors If-Match against the current versionstamp", async ()=>{
    const { clock } = fakeClock();
    const store = kvStore({
        clock,
        sweepMs: 0
    });
    const resource = kvResource(store, {
        mount: "/kv/"
    });
    const { res, ctx } = mockReqRes("PUT", "/kv/x", {
        body: JSON.stringify(42)
    });
    await resource.handler(ctx);
    assert.equal(res.statusCode, 200);
    assert.equal(store.get([
        "x"
    ]).value, 42);
    const staleEtag = '"not-the-real-stamp"';
    const { res: precond, ctx: precondCtx } = mockReqRes("PUT", "/kv/x", {
        body: JSON.stringify(99),
        headers: {
            "if-match": staleEtag
        }
    });
    await resource.handler(precondCtx);
    assert.equal(precond.statusCode, 412);
    assert.equal(store.get([
        "x"
    ]).value, 42);
});
test("kvResource enforces readonly: DELETE and PUT are rejected with 405 and an Allow header", async ()=>{
    const { clock } = fakeClock();
    const store = kvStore({
        clock,
        sweepMs: 0
    });
    store.set([
        "x"
    ], 1);
    const resource = kvResource(store, {
        mount: "/kv/",
        readonly: true
    });
    assert.deepEqual(resource.methods, [
        "GET",
        "HEAD"
    ]);
    const { res, ctx } = mockReqRes("DELETE", "/kv/x");
    await resource.handler(ctx);
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.allow, "GET, HEAD");
    assert.equal(store.get([
        "x"
    ]).value, 1);
});
test("kvResource GET on the mount root lists entries as a JSON array, honoring ?limit=", async ()=>{
    const { clock } = fakeClock();
    const store = kvStore({
        clock,
        sweepMs: 0
    });
    store.set([
        "a"
    ], 1);
    store.set([
        "b"
    ], 2);
    const resource = kvResource(store, {
        mount: "/kv/"
    });
    const { res, ctx } = mockReqRes("GET", "/kv/?limit=1");
    await resource.handler(ctx);
    assert.equal(res.statusCode, 200);
    const parsed = JSON.parse(res.body);
    assert.equal(parsed.length, 1);
});
