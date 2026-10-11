import assert from "node:assert/strict";
import test from "node:test";
import { circuitBreaker } from "../../src/edge/circuit.mjs";
import { startMiddlewareServer } from "./helpers/server.mjs";

test("circuitBreaker: opts.now is a required clock", () => {
    assert.throws(() => circuitBreaker(async () => {}, {}), /opts\.now/);
    assert.throws(() => circuitBreaker({}), /opts\.now/);
});

test("circuitBreaker (wrapped): opens after the failure threshold and fails fast with a Retry-After computed from the injected clock", async () => {
    let clockMs = 1_000_000;
    const clock = () => clockMs;
    const breaker = circuitBreaker(async (ctx) => {
        ctx.res.writeHead(500).end("boom");
    }, { failureThreshold: 2, coolDownMs: 5_000, now: clock });
    const server = await startMiddlewareServer([breaker]);
    try {
        await fetch(server.url);
        assert.equal(breaker.state, "closed");
        await fetch(server.url);
        assert.equal(breaker.state, "open");
        const opened = await fetch(server.url);
        assert.equal(opened.status, 503);
        assert.equal(opened.headers.get("retry-after"), "5");
        clockMs += 2_000;
        const stillOpen = await fetch(server.url);
        assert.equal(stillOpen.headers.get("retry-after"), "3", "Retry-After follows the injected clock, not the wall clock");
    } finally {
        await server.close();
    }
});
