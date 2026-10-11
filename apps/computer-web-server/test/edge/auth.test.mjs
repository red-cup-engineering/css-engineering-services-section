import assert from "node:assert/strict";
import test from "node:test";
import { authAdmissionReport, authenticate, basicAuth } from "../../src/edge/auth.mjs";
import { startMiddlewareServer } from "./helpers/server.mjs";

test("authAdmissionReport: now is a required input", () => {
    const trace = { id: "#", entries: [] };
    assert.throws(
        () => authAdmissionReport({ trace, evidence: [{ source: "verify", admitted: true }] }),
        /input\.now is required/,
    );
    const report = authAdmissionReport({ trace, evidence: [{ source: "verify", admitted: true }], now: 42 });
    assert.equal(report.admitted, true);
});

test("authenticate: opts.now is a required clock", () => {
    assert.throws(() => authenticate({}), /opts\.now/);
});

test("authenticate: an expired JWT (per the injected clock) is denied even though it would be valid on the wall clock", async () => {
    const payload = Buffer.from(JSON.stringify({ exp: 1_000, sub: "ada" })).toString("base64url");
    const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
    const token = `${header}.${payload}.sig`;
    const auth = authenticate({ jwt: {}, now: () => 5_000_000 });
    const server = await startMiddlewareServer([
        auth,
        (ctx) => {
            ctx.res.writeHead(200).end("ok");
        },
    ]);
    try {
        const res = await fetch(server.url, { headers: { authorization: `Bearer ${token}` } });
        assert.equal(res.status, 401);
    } finally {
        await server.close();
    }
});

test("basicAuth still works without a clock (it never reads one)", async () => {
    const auth = basicAuth({ users: { ada: "secret" } });
    const server = await startMiddlewareServer([
        auth,
        (ctx) => {
            ctx.res.writeHead(200).end("ok");
        },
    ]);
    try {
        const denied = await fetch(server.url);
        assert.equal(denied.status, 401);
        const creds = Buffer.from("ada:secret").toString("base64");
        const allowed = await fetch(server.url, { headers: { authorization: `Basic ${creds}` } });
        assert.equal(allowed.status, 200);
    } finally {
        await server.close();
    }
});
