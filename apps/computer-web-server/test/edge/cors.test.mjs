import assert from "node:assert/strict";
import test from "node:test";
import { cors } from "../../src/edge/cors.mjs";
import { startMiddlewareServer } from "./helpers/server.mjs";
test("cors: sets Access-Control-Allow-Origin for a simple request with an Origin header", async ()=>{
    const server = await startMiddlewareServer(cors({
        origins: [
            "https://allowed.example"
        ]
    }));
    try {
        const res = await fetch(server.url, {
            headers: {
                origin: "https://allowed.example"
            }
        });
        assert.equal(res.headers.get("access-control-allow-origin"), "https://allowed.example");
        assert.equal(res.headers.get("vary"), "Origin");
    } finally{
        await server.close();
    }
});
test("cors: omits CORS headers when no Origin request header is present", async ()=>{
    const server = await startMiddlewareServer(cors({
        origins: [
            "https://allowed.example"
        ]
    }));
    try {
        const res = await fetch(server.url);
        assert.equal(res.headers.get("access-control-allow-origin"), null);
    } finally{
        await server.close();
    }
});
test("cors: answers a preflight OPTIONS request with 204 and stops the chain", async ()=>{
    let secondRan = false;
    const server = await startMiddlewareServer([
        cors({
            origins: [
                "https://allowed.example"
            ],
            methods: [
                "GET",
                "POST"
            ]
        }),
        ()=>{
            secondRan = true;
        }
    ]);
    try {
        const res = await fetch(server.url, {
            method: "OPTIONS",
            headers: {
                origin: "https://allowed.example",
                "access-control-request-method": "POST"
            }
        });
        assert.equal(res.status, 204);
        assert.equal(res.headers.get("access-control-allow-methods"), "GET, POST");
        assert.equal(secondRan, false, "preflight response should short-circuit the middleware chain");
    } finally{
        await server.close();
    }
});
test("cors: default optionsSuccessStatus is 204 and is configurable", async ()=>{
    const server = await startMiddlewareServer(cors({
        origins: [
            "https://allowed.example"
        ],
        optionsSuccessStatus: 200
    }));
    try {
        const res = await fetch(server.url, {
            method: "OPTIONS",
            headers: {
                origin: "https://allowed.example",
                "access-control-request-method": "GET"
            }
        });
        assert.equal(res.status, 200);
    } finally{
        await server.close();
    }
});
