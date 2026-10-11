import { test } from "node:test";
import assert from "node:assert/strict";
import { createWebServer } from "@red-cup-engineering/computer-web-server";
import { startWebServer } from "@red-cup-engineering/computer-web-server/node";
test("portable application starts streaming without Node emulation or fabricated identity", async ()=>{
    let stream;
    const engine = createWebServer({
        resources: [
            {
                match: "/events",
                handler: (context)=>{
                    assert.equal(context.remoteAddress, undefined);
                    assert.equal("req" in context, false);
                    return new Response(new ReadableStream({
                        start (controller) {
                            stream = controller;
                            controller.enqueue(new TextEncoder().encode("first"));
                        }
                    }));
                }
            }
        ]
    });
    const response = await engine.fetch(new Request("https://actual.example/events"));
    const reader = response.body.getReader();
    assert.equal(new TextDecoder().decode((await reader.read()).value), "first");
    stream.close();
    assert.equal((await reader.read()).done, true);
});
test("Fetch handler mounted on native Node receives actual request URL and transports cookies", async (t)=>{
    const server = await startWebServer(createWebServer({
        middlewares: [
            (ctx)=>{
                const headers = new Headers();
                headers.append("set-cookie", "a=1");
                headers.append("set-cookie", "b=2");
                return new Response(ctx.url.pathname, {
                    headers
                });
            }
        ]
    }), {
        port: 0,
        host: "127.0.0.1"
    });
    t.after(()=>server.close());
    await new Promise((resolve)=>setTimeout(resolve, 150));
    const response = await fetch(`http://127.0.0.1:${server.port}/observed`);
    assert.equal(await response.text(), "/observed");
    assert.deepEqual(response.headers.getSetCookie(), [
        "a=1",
        "b=2"
    ]);
});
