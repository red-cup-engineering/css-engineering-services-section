import assert from "node:assert/strict";
import test from "node:test";
import { securityHeaders, helmet } from "../../src/edge/security.mjs";
import { startMiddlewareServer } from "./helpers/server.mjs";
test("securityHeaders: default policy (true) sets the standard header set", async ()=>{
    const server = await startMiddlewareServer(securityHeaders());
    try {
        const res = await fetch(server.url);
        assert.ok(res.headers.get("x-content-type-options"));
        assert.ok(res.headers.get("x-frame-options"));
        assert.ok(res.headers.get("referrer-policy"));
    } finally{
        await server.close();
    }
});
test("securityHeaders: a custom policy object overrides individual header values", async ()=>{
    const server = await startMiddlewareServer(securityHeaders({
        frameOptions: "SAMEORIGIN"
    }));
    try {
        const res = await fetch(server.url);
        assert.equal(res.headers.get("x-frame-options"), "SAMEORIGIN");
    } finally{
        await server.close();
    }
});
test("helmet is an alias for securityHeaders", ()=>{
    assert.equal(helmet, securityHeaders);
});
