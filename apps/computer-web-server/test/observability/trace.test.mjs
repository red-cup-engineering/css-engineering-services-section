import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import {
    correlationId,
    newSpanId,
    newTraceId,
    span,
    traceContext,
} from "../../src/observability/trace.mjs";
import { startMiddlewareServer } from "../edge/helpers/server.mjs";

test("newTraceId/newSpanId require an injected random-bytes function", () => {
    assert.throws(() => newTraceId(), /generateBytes/);
    assert.throws(() => newSpanId(), /generateBytes/);
    assert.equal(newTraceId(randomBytes).length, 32);
    assert.equal(newSpanId(randomBytes).length, 16);
});

test("traceContext requires an injected generateBytes and random", () => {
    assert.throws(() => traceContext({}), /generateBytes/);
    assert.throws(() => traceContext({ generateBytes: randomBytes }), /random/);
});

test("traceContext: a fresh request gets a traceparent built from the injected bytes generator, deterministically", async () => {
    const fixedBytes = (size) => Buffer.alloc(size, 1);
    const server = await startMiddlewareServer([
        traceContext({ generateBytes: fixedBytes, random: () => 0 }),
        (ctx) => {
            ctx.res.end(ctx.locals.traceContext.traceId);
        },
    ]);
    try {
        const res = await fetch(server.url);
        assert.equal(res.headers.get("traceresponse")?.startsWith("00-"), true);
        const body = await res.text();
        assert.equal(body, "01".repeat(16), "the trace id is derived from the injected bytes, not real entropy");
    } finally {
        await server.close();
    }
});

test("span (trace.mjs) requires an injected clock and random-bytes function", () => {
    assert.throws(() => span("work", {}), /now/);
    assert.throws(() => span("work", { now: () => 0 }), /generateBytes/);
});

test("correlationId requires an injected generate function and echoes the generated id", async () => {
    assert.throws(() => correlationId({}), /generate/);
    const server = await startMiddlewareServer([
        correlationId({ generate: () => "fixed-id", trustIncoming: false }),
        (ctx) => {
            ctx.res.end(ctx.requestId);
        },
    ]);
    try {
        const res = await fetch(server.url);
        assert.equal(res.headers.get("x-request-id"), "fixed-id");
        assert.equal(await res.text(), "fixed-id");
    } finally {
        await server.close();
    }
});
