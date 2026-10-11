import assert from "node:assert/strict";
import test from "node:test";
import { acme } from "../../src/edge/acme.mjs";

test("acme: opts.now is a required clock", () => {
    assert.throws(() => acme({ domains: ["example.test"], order: async () => ({ cert: "c", key: "k" }) }), /opts\.now/);
});

test("acme: a freshly renewed certificate is not due for renewal until the injected clock nears its expiry", async () => {
    let clockMs = 0;
    const manager = acme({
        domains: ["example.test"],
        order: async () => ({ cert: "cert", key: "key" }),
        now: () => clockMs,
        checkIntervalMs: 1e9,
    });
    try {
        assert.equal(manager.credentials(), null);
        await manager.renew();
        assert.deepEqual(manager.credentials(), { cert: "cert", key: "key" });
        clockMs += 1000;
        assert.deepEqual(manager.credentials(), { cert: "cert", key: "key" }, "credentials survive a clock advance that is not near expiry");
    } finally {
        manager.stop();
    }
});
