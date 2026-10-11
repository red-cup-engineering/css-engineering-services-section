import { bindingsProviders } from "@red-cup-engineering/computer-system-platform";
import assert from "node:assert/strict";
import test from "node:test";
import { createComputerPlatform } from "@red-cup-engineering/computer-system-platform";
import { startWebServer } from "@red-cup-engineering/computer-web-server/node";
import { createWebPlatform as createWebServer } from "../src/index.mjs";
import { createWorkerFetch } from "@red-cup-engineering/computer-web-server/workers";
test("platform provider activation is shared, effects are visible, and release is ordered", async ()=>{
    const events = [];
    const engine = createWebServer({
        platform: {
            providers: [
                {
                    name: "storage",
                    start: ()=>{
                        events.push("storage+");
                        return new Map([
                            [
                                "value",
                                7
                            ]
                        ]);
                    },
                    close: ()=>{
                        events.push("storage-");
                    }
                },
                {
                    name: "clock",
                    start: ()=>{
                        events.push("clock+");
                        return ()=>123;
                    },
                    close: ()=>{
                        events.push("clock-");
                    }
                }
            ]
        },
        ...{
            resources: [
                {
                    match: "/",
                    handler: (ctx)=>Response.json({
                            value: ctx.capabilities.storage.get("value"),
                            time: ctx.capabilities.clock()
                        })
                }
            ]
        }
    });
    assert.deepEqual(events, []);
    const responses = await Promise.all([
        engine.fetch(new Request("https://example.test")),
        engine.fetch(new Request("https://example.test"))
    ]);
    assert.deepEqual(await responses[0].json(), {
        value: 7,
        time: 123
    });
    assert.deepEqual(events, [
        "storage+",
        "clock+"
    ]);
    await responses[1].arrayBuffer();
    await engine.close();
    await engine.close();
    assert.deepEqual(events, [
        "storage+",
        "clock+",
        "clock-",
        "storage-"
    ]);
    const closed = await engine.fetch(new Request("https://example.test", {
        method: "HEAD"
    }));
    assert.equal(closed.status, 503);
    assert.equal(closed.body, null);
});
test("an already-formed computer platform is composed as-is", async ()=>{
    const platform = createComputerPlatform({
        id: "shared",
        providers: [
            {
                name: "value",
                start: ()=>9
            }
        ]
    });
    const engine = createWebServer({
        platform,
        ...{
            resources: [
                {
                    match: "/",
                    handler: (ctx)=>Response.json({
                            value: ctx.capabilities.value,
                            samePlatform: ctx.platform === platform
                        })
                }
            ]
        }
    });
    assert.equal(engine.platform, platform);
    assert.deepEqual(await (await engine.fetch(new Request("https://example.test/"))).json(), {
        value: 9,
        samePlatform: true
    });
    await engine.close();
});
test("platform startup failure releases earlier capabilities and refuses through the same pipeline", async ()=>{
    let released = 0, actions = 0;
    const engine = createWebServer({
        platform: {
            providers: [
                {
                    name: "storage",
                    start: ()=>new Map(),
                    close: ()=>{
                        released++;
                    }
                },
                {
                    name: "unavailable",
                    start: ()=>{
                        throw new Error("private provider details");
                    }
                }
            ]
        },
        ...{
            resources: [
                {
                    match: "/",
                    handler: ()=>{
                        actions++;
                        return new Response("bad");
                    }
                }
            ]
        }
    });
    const response = await engine.fetch(new Request("https://example.test"));
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /private/);
    assert.equal(released, 1);
    assert.equal(actions, 0);
    await engine.close();
    assert.equal(released, 1);
});
test("closing during provider startup prevents an admitted action and releases once", async ()=>{
    let ready, entered;
    const starting = new Promise((resolve)=>{
        entered = resolve;
    });
    const pending = new Promise((resolve)=>{
        ready = resolve;
    });
    let releases = 0, actions = 0;
    const engine = createWebServer({
        platform: {
            providers: [
                {
                    name: "resource",
                    start: async ()=>{
                        entered();
                        await pending;
                        return {};
                    },
                    close: ()=>{
                        releases++;
                    }
                }
            ]
        },
        ...{
            resources: [
                {
                    match: "/",
                    handler: ()=>{
                        actions++;
                        return new Response("value");
                    }
                }
            ]
        }
    });
    const request = engine.fetch(new Request("https://example.test/"));
    await starting;
    const closing = engine.close();
    ready();
    assert.equal((await request).status, 503);
    await closing;
    assert.equal(actions, 0);
    assert.equal(releases, 1);
});
test("Node lifecycle starts and releases platform capabilities around its listener", async ()=>{
    let starts = 0, closes = 0;
    const engine = createWebServer({
        platform: {
            providers: [
                {
                    name: "resource",
                    start: ()=>{
                        starts++;
                        return {};
                    },
                    close: ()=>{
                        closes++;
                    }
                }
            ]
        },
        ...{}
    });
    const server = await startWebServer(engine, {
        port: 0,
        host: "127.0.0.1"
    });
    assert.equal(starts, 1);
    await server.close();
    assert.equal(closes, 1);
});
test("platform shutdown waits for active response stream completion or cancellation", async ()=>{
    for (const terminal of [
        "end",
        "cancel",
        "abort"
    ]){
        let closes = 0;
        let controller;
        const engine = createWebServer({
            platform: {
                providers: [
                    {
                        name: "stream",
                        start: ()=>({}),
                        close: ()=>{
                            closes++;
                        }
                    }
                ]
            },
            ...{
                resources: [
                    {
                        match: "/",
                        handler: ()=>new Response(new ReadableStream({
                                start (value) {
                                    controller = value;
                                    value.enqueue(new Uint8Array([
                                        1
                                    ]));
                                }
                            }))
                    }
                ]
            }
        });
        const abort = new AbortController();
        const response = await engine.fetch(new Request("https://example.test/", {
            signal: abort.signal
        }));
        const reader = response.body.getReader();
        await reader.read();
        const closing = engine.close();
        await Promise.resolve();
        assert.equal(closes, 0);
        if (terminal === "end") {
            controller.close();
            await reader.read();
        } else if (terminal === "cancel") await reader.cancel();
        else {
            abort.abort();
            await assert.rejects(reader.read());
        }
        await closing;
        assert.equal(closes, 1);
    }
});
test("provider release waits for asynchronous stream cancellation cleanup", async ()=>{
    for (const terminal of [
        "cancel",
        "abort",
        "HEAD"
    ]){
        const events = [];
        let finish, entered;
        const gate = new Promise((resolve)=>{
            finish = resolve;
        });
        const cancelling = new Promise((resolve)=>{
            entered = resolve;
        });
        const engine = createWebServer({
            platform: {
                providers: [
                    {
                        name: "connection",
                        start: ()=>({}),
                        close: ()=>{
                            events.push("release");
                        }
                    }
                ]
            },
            ...{
                resources: [
                    {
                        match: "/",
                        handler: ()=>new Response(new ReadableStream({
                                async cancel () {
                                    events.push("cancel-start");
                                    entered();
                                    await gate;
                                    events.push("cancel-end");
                                }
                            }))
                    }
                ]
            }
        });
        const abort = new AbortController();
        const fetching = engine.fetch(new Request("https://example.test/", {
            method: terminal === "HEAD" ? "HEAD" : "GET",
            signal: abort.signal
        }));
        let cancellation;
        if (terminal !== "HEAD") {
            const response = await fetching;
            if (terminal === "cancel") cancellation = response.body.cancel();
            else abort.abort();
        }
        await cancelling;
        const closing = engine.close();
        await Promise.resolve();
        assert.deepEqual(events, [
            "cancel-start"
        ]);
        finish();
        await Promise.all([
            fetching,
            cancellation,
            closing
        ]);
        assert.deepEqual(events, [
            "cancel-start",
            "cancel-end",
            "release"
        ]);
    }
});
test("Node startup failure releases acquired capabilities", async ()=>{
    let closes = 0;
    const engine = createWebServer({
        platform: {
            providers: [
                {
                    name: "resource",
                    start: ()=>({}),
                    close: ()=>{
                        closes++;
                    }
                }
            ]
        },
        ...{}
    });
    await assert.rejects(startWebServer(engine, {
        port: 0,
        tls: {
            key: "invalid private key",
            cert: "invalid certificate"
        }
    }));
    assert.equal(closes, 1);
});
test("a throwing Node stop hook cannot release capabilities before transport drain", async (t)=>{
    let controller, closes = 0;
    const engine = createWebServer({
        platform: {
            providers: [
                {
                    name: "resource",
                    start: ()=>({}),
                    close: ()=>{
                        closes++;
                    }
                }
            ]
        },
        ...{
            resources: [
                {
                    match: "/",
                    handler: ()=>new Response(new ReadableStream({
                            start (value) {
                                controller = value;
                                value.enqueue(new Uint8Array([
                                    1
                                ]));
                            }
                        }))
                }
            ]
        }
    });
    const server = await startWebServer(engine, {
        port: 0,
        host: "127.0.0.1",
        onStop: ()=>{
            throw new Error("stop failed");
        }
    });
    t.after(()=>server.close().catch(()=>{}));
    await new Promise((resolve)=>setTimeout(resolve, 150));
    const response = await fetch(`http://127.0.0.1:${server.port}/`);
    const reader = response.body.getReader();
    await reader.read();
    const stopped = assert.rejects(server.close(), /shutdown failed/);
    await Promise.resolve();
    assert.equal(closes, 0);
    controller.close();
    await reader.read();
    await stopped;
    assert.equal(closes, 1);
});
test("Workers bindings are the platform's providers and one platform serves one bindings object", async ()=>{
    let formed = 0;
    const worker = createWorkerFetch((env)=>{
        formed++;
        return createWebServer({
            platform: {
                providers: bindingsProviders(env)
            },
            ...{
                resources: [
                    {
                        match: "/",
                        handler: (ctx)=>Response.json({
                                db: ctx.capabilities.DB.name,
                                secret: ctx.capabilities.SECRET
                            })
                    }
                ]
            }
        });
    });
    const env = {
        DB: {
            name: "assist"
        },
        SECRET: "s"
    };
    const first = await worker.fetch(new Request("https://example.test/"), env);
    const second = await worker.fetch(new Request("https://example.test/"), env);
    assert.deepEqual(await first.json(), {
        db: "assist",
        secret: "s"
    });
    assert.equal(second.status, 200);
    assert.equal(formed, 1);
    await worker.fetch(new Request("https://example.test/"), {
        ...env
    });
    assert.equal(formed, 2);
});
