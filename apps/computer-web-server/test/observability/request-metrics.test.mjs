import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { randomBytes } from "node:crypto";
import { metrics, requestMetrics, span, registry } from "../../src/observability/metrics.mjs";
const now = () => Date.now();
const generateId = (n) => randomBytes(n).toString("hex");
function makeRes() {
    const emitter = new EventEmitter();
    return Object.assign(emitter, {
        statusCode: 200,
        headers: {},
        getHeader (name) {
            return this.headers[name];
        },
        setHeader (name, value) {
            this.headers[name] = value;
        },
        writeHead (status) {
            this.statusCode = status;
            return this;
        },
        end (_body) {}
    });
}
test("metrics() and span() require an injected clock and id generator", ()=>{
    assert.throws(() => metrics(), /options\.now/);
    assert.throws(() => metrics({ now }), /options\.generateId/);
    assert.throws(() => span({}), /now/);
    assert.throws(() => span({ now }), /generateId/);
});
test("metrics().middleware increments/decrements the in-flight gauge around finish", ()=>{
    const surface = metrics({ now, generateId });
    const res = makeRes();
    const ctx = {
        url: new URL("http://x/orders"),
        res
    };
    surface.middleware(ctx);
    assert.equal(surface.registry.families.get("http_requests_in_flight").series.get("").value, 1);
    res.emit("finish");
    assert.equal(surface.registry.families.get("http_requests_in_flight").series.get("").value, 0);
});
test("metrics().middleware is a no-op on the /metrics scrape path itself", ()=>{
    const surface = metrics({ now, generateId });
    const res = makeRes();
    const ctx = {
        url: new URL("http://x/metrics"),
        res
    };
    surface.middleware(ctx);
    assert.equal(res.listenerCount("finish"), 0);
});
test("metrics().middleware settles the in-flight gauge only once even if both finish and close fire", ()=>{
    const surface = metrics({ now, generateId });
    const res = makeRes();
    const ctx = {
        url: new URL("http://x/a"),
        res
    };
    surface.middleware(ctx);
    res.emit("finish");
    res.emit("close");
    assert.equal(surface.registry.families.get("http_requests_in_flight").series.get("").value, 0);
});
test("metrics().onResponse records total requests and duration histogram by method/route/status", ()=>{
    const surface = metrics({ now, generateId });
    const req = {
        method: "POST",
        url: "/users/42"
    };
    const res = {
        statusCode: 201
    };
    surface.onResponse({
        req,
        res,
        ctx: {
            path: "/users/42"
        },
        status: 201,
        ms: 12.5
    });
    const text = surface.registry.collect();
    assert.match(text, /http_requests_total\{method="POST",route="\/users\/:id",status="201"\}\s1/);
    assert.match(text, /http_request_duration_seconds_count\{method="POST",route="\/users\/:id"\}\s1/);
});
test("metrics().resource exposes the Prometheus scrape endpoint at /metrics by default", async ()=>{
    const surface = metrics({ now, generateId });
    assert.equal(surface.resource.match, "/metrics");
    assert.deepEqual(surface.resource.methods, [
        "GET"
    ]);
    assert.deepEqual(surface.resource.produces, [
        "text/plain; version=0.0.4; charset=utf-8"
    ]);
});
test("metrics().span merges a package-level default exporter when the call site provides none", ()=>{
    const exported = [];
    const surface = metrics({
        now,
        generateId,
        exporter: (s)=>exported.push(s)
    });
    const active = surface.span({
        name: "work"
    });
    active.end();
    assert.equal(exported.length, 1);
    assert.equal(exported[0].name, "work");
});
test("metrics() accepts a shared registry via options.registry instead of creating its own", ()=>{
    const shared = registry();
    const surface = metrics({
        registry: shared,
        now,
        generateId
    });
    assert.equal(surface.registry, shared);
});
test("requestMetrics() records onResponse when res emits finish, honoring labelFn overrides", ()=>{
    const reg = registry();
    const res = makeRes();
    res.statusCode = 404;
    const req = {
        method: "GET",
        url: "/things/1"
    };
    const ctx = {
        url: new URL("http://x/things/1"),
        req,
        res
    };
    const mw = requestMetrics({
        registry: reg,
        now,
        generateId,
        labelFn: ()=>({
                route: "/things/:custom"
            })
    });
    mw(ctx);
    res.emit("finish");
    const text = reg.collect();
    assert.match(text, /http_requests_total\{method="GET",route="\/things\/:custom",status="404"\}\s1/);
});
test("requestMetrics() falls back to ctx.url.pathname as the route label when labelFn is absent", ()=>{
    const reg = registry();
    const res = makeRes();
    const req = {
        method: "GET",
        url: "/plain"
    };
    const ctx = {
        url: new URL("http://x/plain"),
        req,
        res
    };
    const mw = requestMetrics({
        registry: reg,
        now,
        generateId
    });
    mw(ctx);
    res.emit("finish");
    const text = reg.collect();
    assert.match(text, /route="\/plain"/);
});
test("span() lifecycle: setAttribute/setStatus/end produce a well-formed OTLP-shaped span exactly once", ()=>{
    const exported = [];
    const s = span({
        name: "handler",
        attrs: {
            "http.route": "/x"
        },
        now,
        generateId,
        exporter: (sp)=>exported.push(sp)
    });
    s.setAttribute("extra", 1);
    s.setStatus("OK");
    const first = s.end({
        "http.status_code": 200
    });
    const second = s.end();
    assert.equal(exported.length, 1);
    assert.equal(second, null);
    assert.equal(first.name, "handler");
    assert.equal(first.attributes["http.route"], "/x");
    assert.equal(first.attributes.extra, 1);
    assert.equal(first.attributes["http.status_code"], 200);
    assert.deepEqual(first.status, {
        code: "OK"
    });
    assert.equal(typeof first.traceId, "string");
    assert.equal(first.traceId.length, 32);
    assert.equal(first.spanId.length, 16);
});
