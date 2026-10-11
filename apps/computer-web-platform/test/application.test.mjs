import { bindingsProviders } from "@red-cup-engineering/computer-system-platform";
import assert from "node:assert/strict";
import test from "node:test";
import { createWebServer } from "@red-cup-engineering/computer-web-server";
import { startWebServer } from "@red-cup-engineering/computer-web-server/node";
import { createWebApplication } from "../src/application.mjs";
test("server, platform, and application specialize the same HTTP contract", async (t)=>{
    for (const engine of [
        createWebServer({
            resources: [
                {
                    match: "/value",
                    methods: [
                        "GET"
                    ],
                    handler: ()=>Response.json({
                            value: 1
                        })
                }
            ]
        }),
        createWebApplication({
            resources: [
                {
                    match: "/value",
                    methods: [
                        "GET"
                    ],
                    handler: ()=>Response.json({
                            value: 1
                        })
                }
            ]
        })
    ]){
        const server = await startWebServer(engine, {
            port: 0,
            host: "127.0.0.1"
        });
        t.after(()=>server.close());
        await new Promise((resolve)=>setTimeout(resolve, 150));
        for (const method of [
            "GET",
            "HEAD",
            "OPTIONS",
            "POST"
        ]){
            const url = `http://127.0.0.1:${server.port}/value`;
            const direct = await engine.fetch(new Request(url, {
                method
            }));
            const remote = await fetch(url, {
                method
            });
            assert.equal(remote.status, direct.status);
            assert.equal(remote.headers.get("allow"), direct.headers.get("allow"));
            assert.equal(await remote.text(), await direct.text());
        }
        if ("close" in engine) await engine.close();
    }
});
test("application input is bounded, memoized and shared across representations", async ()=>{
    const engine = createWebApplication({
        body: {
            maxBytes: 100
        },
        resources: [
            {
                match: "/input",
                methods: [
                    "POST"
                ],
                body: {
                    maxBytes: 30
                },
                handler: async (ctx)=>{
                    const first = await ctx.input.json();
                    const second = await ctx.input.json();
                    assert.equal(first, second);
                    return Response.json({
                        json: first,
                        text: await ctx.input.text(),
                        count: (await ctx.input.bytes()).length
                    });
                }
            }
        ]
    });
    const receive = (body, type = "application/json")=>engine.fetch(new Request("https://example.test/input", {
            method: "POST",
            headers: {
                "content-type": type
            },
            body
        }));
    const good = await receive('{"value":1}');
    assert.equal(good.status, 200);
    assert.deepEqual((await good.json()).json, {
        value: 1
    });
    assert.equal((await receive("x".repeat(31))).status, 413);
    assert.equal((await receive("{")).status, 400);
    assert.equal((await receive("{}", "text/plain")).status, 415);
});
test("application schema admission and OpenAPI come from the same resource", async ()=>{
    let actions = 0;
    const engine = createWebApplication({
        resources: [
            {
                match: "/values/:id",
                methods: [
                    "POST"
                ],
                validation: {
                    body: {
                        type: "object",
                        required: [
                            "value"
                        ],
                        properties: {
                            value: {
                                type: "number"
                            }
                        }
                    }
                },
                openapi: {
                    summary: "Store value"
                },
                handler: async (ctx)=>{
                    actions++;
                    return Response.json(await ctx.input.json());
                }
            }
        ]
    });
    const receive = (body)=>engine.fetch(new Request("https://example.test/values/one", {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body
        }));
    assert.equal((await receive("{}")).status, 400);
    assert.equal(actions, 0);
    assert.equal((await receive('{"value":1}')).status, 200);
    assert.equal(actions, 1);
    const paths = engine.openapi().paths;
    assert.ok(paths["/values/{id}"].post.requestBody);
});
test("application modules compose without another request dispatcher", async ()=>{
    const engine = createWebApplication({
        applications: [
            {
                resources: [
                    {
                        match: "/same",
                        methods: [
                            "GET"
                        ],
                        handler: ()=>new Response("read")
                    }
                ]
            },
            {
                resources: [
                    {
                        match: "/same",
                        methods: [
                            "POST"
                        ],
                        handler: ()=>new Response("write")
                    }
                ]
            }
        ]
    });
    assert.equal(await (await engine.fetch(new Request("https://example.test/same", {
        method: "POST"
    }))).text(), "write");
    assert.throws(()=>createWebApplication({
            applications: [
                {
                    cacheControl: "no-store"
                },
                {
                    cacheControl: "public"
                }
            ]
        }), /explicit cacheControl/);
});
test("hooks and resources share one intake while resource encoded/decoded limits still refuse", async ()=>{
    const { gzipSync } = await import("node:zlib");
    for (const mode of [
        "same",
        "decoded",
        "encoded"
    ]){
        let actions = 0;
        let pulls = 0;
        const body = new TextEncoder().encode(JSON.stringify({
            value: "x".repeat(40)
        }));
        const encoded = new Uint8Array(gzipSync(body));
        const engine = createWebApplication({
            body: {
                maxBytes: 200
            },
            onRequest: async (ctx)=>{
                ctx.locals.parsed = await ctx.input.json();
            },
            resources: [
                {
                    match: "/",
                    methods: [
                        "POST"
                    ],
                    body: mode === "decoded" ? {
                        maxBytes: 30
                    } : mode === "encoded" ? {
                        maxEncodedBytes: 10
                    } : {},
                    handler: async (ctx)=>{
                        actions++;
                        return Response.json({
                            original: ctx.locals.parsed,
                            again: await ctx.input.json()
                        });
                    }
                }
            ]
        });
        const stream = new ReadableStream({
            pull (controller) {
                pulls++;
                controller.enqueue(encoded);
                controller.close();
            }
        });
        const response = await engine.fetch(new Request("https://example.test/", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "content-encoding": "gzip"
            },
            body: stream,
            duplex: "half"
        }));
        assert.equal(pulls, 1);
        assert.equal(response.status, mode === "same" ? 200 : 413);
        assert.equal(actions, mode === "same" ? 1 : 0);
        if (mode === "same") {
            const value = await response.json();
            assert.deepEqual(value.original, value.again);
        }
    }
});
test("an application runs over its platform: providers precede child hooks and completion hooks all run after a child failure", async ()=>{
    let closes = 0;
    const engine = createWebApplication({
        platform: {
            providers: [
                {
                    name: "resource",
                    start: ()=>7,
                    close: ()=>{
                        closes++;
                    }
                }
            ]
        },
        applications: [
            {
                onRequest: (ctx)=>{
                    assert.equal(ctx.capabilities.resource, 7);
                },
                onComplete: ()=>{
                    throw new Error("child completion");
                },
                resources: [
                    {
                        match: "/",
                        handler: ()=>new Response("value")
                    }
                ]
            }
        ]
    });
    const response = await engine.fetch(new Request("https://example.test/"));
    await assert.rejects(response.text(), /completion failed/);
    await engine.close();
    assert.equal(closes, 1);
    assert.equal(engine.platform.closed(), true);
});
