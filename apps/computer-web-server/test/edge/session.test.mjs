import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { memorySessionStore, session, flash } from "../../src/edge/session.mjs";
import { startMiddlewareServer } from "./helpers/server.mjs";
test("memorySessionStore: set/get round-trips a record and deep-clones on both sides", ()=>{
    const store = memorySessionStore();
    const data = {
        count: 1
    };
    store.set({
        id: "a",
        data,
        createdAt: 0,
        updatedAt: 0,
        expiresAt: null
    });
    data.count = 999;
    const record = store.get("a");
    assert.equal(record?.data.count, 1);
    assert.equal(store.size(), 1);
});
test("memorySessionStore: sweep removes only expired entries", ()=>{
    const store = memorySessionStore();
    store.set({
        id: "expired",
        data: {},
        createdAt: 0,
        updatedAt: 0,
        expiresAt: 100
    });
    store.set({
        id: "fresh",
        data: {},
        createdAt: 0,
        updatedAt: 0,
        expiresAt: 100_000
    });
    const removed = store.sweep(500);
    assert.equal(removed, 1);
    assert.equal(store.get("expired"), undefined);
    assert.ok(store.get("fresh"));
});
test("session: throws synchronously without a secret", ()=>{
    assert.throws(()=>session({}), TypeError);
});
test("session: throws synchronously without an injected clock or id generator", ()=>{
    assert.throws(()=>session({ secret: "s3cr3t" }), /options\.now/);
    assert.throws(()=>session({ secret: "s3cr3t", now: () => Date.now() }), /options\.generateId/);
});
test("session: a first request is new, gets a session cookie, and persists data across requests", async ()=>{
    const store = memorySessionStore();
    const server = await startMiddlewareServer([
        session({
            secret: "s3cr3t",
            store,
            now: () => Date.now(),
            generateId: () => randomBytes(24).toString("base64url")
        }),
        (ctx)=>{
            const handle = ctx.locals.sessionHandle;
            handle.data.visits = (handle.data.visits ?? 0) + 1;
            ctx.res.end(JSON.stringify({
                isNew: handle.isNew,
                visits: handle.data.visits
            }));
        }
    ]);
    try {
        const first = await fetch(server.url);
        const firstBody = await first.json();
        assert.equal(firstBody.isNew, true);
        assert.equal(firstBody.visits, 1);
        assert.equal(store.size(), 1);
        const cookie = (first.headers.get("set-cookie") ?? "").split(";")[0];
        const second = await fetch(server.url, {
            headers: {
                cookie
            }
        });
        const secondBody = await second.json();
        assert.equal(secondBody.isNew, false);
        assert.equal(secondBody.visits, 2, "session data should persist across requests sharing the cookie");
    } finally{
        await server.close();
    }
});
test("session: destroy() removes the record from the store and clears the cookie", async ()=>{
    const store = memorySessionStore();
    const server = await startMiddlewareServer([
        session({
            secret: "s3cr3t",
            store,
            now: () => Date.now(),
            generateId: () => randomBytes(24).toString("base64url")
        }),
        (ctx)=>{
            const handle = ctx.locals.sessionHandle;
            handle.destroy();
            ctx.res.end("bye");
        }
    ]);
    try {
        const res = await fetch(server.url);
        await res.text();
        assert.equal(store.size(), 0);
        const setCookie = res.headers.get("set-cookie") ?? "";
        assert.match(setCookie, /Expires=/i);
    } finally{
        await server.close();
    }
});
test("flash: throws when no session handle is present in locals", async ()=>{
    const server = await startMiddlewareServer(flash());
    try {
        const res = await fetch(server.url);
        assert.equal(res.status, 500);
    } finally{
        await server.close();
    }
});
test("flash: a message pushed on one request is readable and consumed on the next", async ()=>{
    const store = memorySessionStore();
    const server = await startMiddlewareServer([
        session({
            secret: "s3cr3t",
            store,
            now: () => Date.now(),
            generateId: () => randomBytes(24).toString("base64url")
        }),
        flash(),
        (ctx)=>{
            const flashHandle = ctx.locals.flash;
            const url = new URL(ctx.req.url ?? "/", "http://localhost");
            if (url.searchParams.get("write") === "1") {
                flashHandle.push("notice", "saved");
                ctx.res.end("wrote");
            } else {
                ctx.res.end(JSON.stringify(flashHandle.consume("notice")));
            }
        }
    ]);
    try {
        const write = await fetch(`${server.url}/?write=1`);
        const cookie = (write.headers.get("set-cookie") ?? "").split(";")[0];
        const readFirst = await fetch(server.url, {
            headers: {
                cookie
            }
        });
        assert.deepEqual(await readFirst.json(), [
            "saved"
        ]);
        const readSecond = await fetch(server.url, {
            headers: {
                cookie
            }
        });
        assert.deepEqual(await readSecond.json(), [], "flash messages are consume-on-read");
    } finally{
        await server.close();
    }
});
