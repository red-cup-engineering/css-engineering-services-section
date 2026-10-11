import test from "node:test";
import assert from "node:assert/strict";
import { startNativeApplication as start } from "../src/native-application.mjs";
test("remaining native application consumer uses canonical routing and representation handling", async (t)=>{
    const server = await start({
        resources: [
            {
                match: "/item/:id",
                methods: [
                    "GET"
                ],
                handler: (ctx)=>({
                        type: "application/json",
                        body: JSON.stringify({
                            id: ctx.params.id
                        })
                    })
            }
        ]
    }, {
        host: "127.0.0.1",
        port: 0
    });
    t.after(()=>server.close());
    await new Promise((resolve)=>setTimeout(resolve, 150));
    const url = `http://127.0.0.1:${server.port}/item/abc`;
    assert.deepEqual(await (await fetch(url)).json(), {
        id: "abc"
    });
    assert.equal((await fetch(url, {
        method: "POST"
    })).status, 405);
    assert.equal((await fetch(url, {
        method: "HEAD"
    })).status, 200);
    assert.equal((await fetch(url + "/missing")).status, 404);
});
