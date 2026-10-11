import assert from "node:assert/strict";
import test from "node:test";
import { surrogateCache } from "../../src/edge/surrogate.mjs";
import { startMiddlewareServer } from "./helpers/server.mjs";

test("surrogateCache: opts.now is a required clock", () => {
    assert.throws(() => surrogateCache(), /opts\.now/);
});

test("surrogateCache: MISS then HIT, and Age advances with the injected clock rather than the wall clock", async () => {
    let clockMs = 1_000_000;
    let hits = 0;
    const cache = surrogateCache({ now: () => clockMs });
    const server = await startMiddlewareServer([
        cache.middleware,
        (ctx) => {
            hits++;
            ctx.res.writeHead(200, { "surrogate-control": "max-age=60" }).end(`hit ${hits}`);
        },
    ]);
    try {
        const first = await fetch(server.url);
        assert.equal(first.headers.get("x-cache"), "MISS");
        assert.equal(await first.text(), "hit 1");
        clockMs += 5000;
        const second = await fetch(server.url);
        assert.equal(second.headers.get("x-cache"), "HIT");
        assert.equal(second.headers.get("age"), "5");
        assert.equal(hits, 1, "the downstream handler should run once");
    } finally {
        await server.close();
    }
});
