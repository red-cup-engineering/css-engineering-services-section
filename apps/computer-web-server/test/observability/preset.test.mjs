import assert from "node:assert/strict";
import test from "node:test";
import { observability } from "../../src/observability/preset.mjs";
import { startMiddlewareServer } from "../edge/helpers/server.mjs";

test("observability(): the default stack wires real clock/random defaults for correlation, trace and metrics", async () => {
    const app = observability();
    const server = await startMiddlewareServer([
        ...app.middlewares,
        (ctx) => {
            ctx.res.writeHead(200).end("ok");
        },
    ], { onUncaught: (error) => { throw error; } });
    try {
        const res = await fetch(server.url);
        assert.equal(res.status, 200);
        assert.ok(res.headers.get("x-request-id"), "correlationId issued a request id using the real default generator");
        assert.ok(res.headers.get("traceresponse")?.startsWith("00-"), "traceContext issued a traceparent using the real default entropy");
        await app.onResponse?.({ req: {}, res: { statusCode: 200 }, ctx: { path: "/" }, startedAt: Date.now() });
        const scraped = app.registry.collect();
        assert.match(scraped, /http_requests_total/);
    } finally {
        await server.close();
    }
});

test("observability({ trace: false, correlation: false }): subsystems can still be disabled entirely", async () => {
    const app = observability({ trace: false, correlation: false, accessLog: false });
    const server = await startMiddlewareServer([
        ...app.middlewares,
        (ctx) => {
            ctx.res.writeHead(200).end("ok");
        },
    ]);
    try {
        const res = await fetch(server.url);
        assert.equal(res.headers.get("x-request-id"), null);
        assert.equal(res.headers.get("traceresponse"), null);
    } finally {
        await server.close();
    }
});
