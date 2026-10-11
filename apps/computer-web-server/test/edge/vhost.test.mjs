import test from "node:test";
import assert from "node:assert/strict";
import { createWebServer } from "../../src/index.mjs";
import { vhost } from "../../src/edge/vhost.mjs";
const child = createWebServer({
    resources: [
        {
            match: "/read",
            methods: [
                "GET"
            ],
            handler: (ctx)=>Response.json({
                    capability: ctx.capabilities.value,
                    remoteAddress: ctx.remoteAddress
                })
        }
    ]
});
test("virtual hosts preserve capabilities and use the portable request pipeline", async ()=>{
    const engine = createWebServer({
        middlewares: [
            vhost([
                {
                    host: "*.example.test",
                    app: child
                }
            ])
        ]
    });
    for (const host of [
        "example.test",
        "a.example.test"
    ]){
        const response = await engine.fetch(new Request(`https://${host}/read`), {
            capabilities: {
                value: 42
            },
            remoteAddress: "192.0.2.1"
        });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
            capability: 42,
            remoteAddress: "192.0.2.1"
        });
    }
    assert.equal((await engine.fetch(new Request("https://unmatched.test/read"))).status, 404);
    assert.equal((await engine.fetch(new Request("https://example.test/read", {
        method: "POST"
    }))).status, 405);
});
test("overlapping host claims refuse before either engine executes", async ()=>{
    const engine = createWebServer({
        middlewares: [
            vhost([
                {
                    host: "*.example.test",
                    app: child
                },
                {
                    host: "a.example.test",
                    app: child
                }
            ])
        ]
    });
    assert.equal((await engine.fetch(new Request("https://a.example.test/read"))).status, 503);
});
test("regular expression host matching does not depend on previous requests", async ()=>{
    const engine = createWebServer({
        middlewares: [
            vhost([
                {
                    host: /^example\.test$/g,
                    app: child
                }
            ])
        ]
    });
    for(let i = 0; i < 3; i++)assert.equal((await engine.fetch(new Request("https://example.test/read"))).status, 200);
});
