import assert from "node:assert/strict";
import test from "node:test";
import { OutlierEjector, withRetries } from "../../src/edge/retry.mjs";

test("OutlierEjector: opts.now is a required clock", () => {
    assert.throws(() => new OutlierEjector({}), /opts\.now/);
});

test("OutlierEjector: ejects after consecutive failures and readmits once probes succeed, following the injected clock", () => {
    let clockMs = 0;
    const ejector = new OutlierEjector({ now: () => clockMs, consecutiveThreshold: 2, ejectMs: 1000, probeSuccesses: 1 });
    assert.equal(ejector.isAdmissible("a"), true);
    ejector.record("a", false);
    assert.equal(ejector.isAdmissible("a"), true, "one failure is not yet enough to eject");
    ejector.record("a", false);
    assert.equal(ejector.isAdmissible("a"), false, "the consecutive-failure threshold ejects the id");
    clockMs += 1000;
    ejector.record("a", true);
    assert.equal(ejector.isAdmissible("a"), true, "a probe success after the eject window readmits the id");
});

test("withRetries: retries a failing operation until it succeeds", async () => {
    let attempts = 0;
    const value = await withRetries(async () => {
        attempts++;
        if (attempts < 3) throw Object.assign(new Error("boom"), { status: 500 });
        return "ok";
    }, { maxAttempts: 5, baseDelayMs: 1, jitter: false });
    assert.equal(value, "ok");
    assert.equal(attempts, 3);
});
