import { test } from "node:test";
import assert from "node:assert/strict";
import { MetricsRegistry, registry } from "../../src/observability/metrics.mjs";
test("registry() returns a fresh MetricsRegistry instance each call", ()=>{
    const a = registry();
    const b = registry();
    assert.ok(a instanceof MetricsRegistry);
    assert.notEqual(a, b);
    assert.equal(a.families.size, 0);
});
test("registerFamily is idempotent by name and returns the same family object", ()=>{
    const reg = new MetricsRegistry();
    const c1 = reg.counter("same_name", "help one", [
        "a"
    ]);
    const c2 = reg.counter("same_name", "help two - ignored on second registration", [
        "a"
    ]);
    assert.equal(c1.family, c2.family);
    assert.equal(reg.families.size, 1);
    assert.equal(c1.help, "help one");
});
test("registerFamily throws when the same name is re-registered with a different type", ()=>{
    const reg = new MetricsRegistry();
    reg.counter("thing", "help");
    assert.throws(()=>reg.gauge("thing", "help"), /already registered as counter/);
});
test("collect() renders HELP/TYPE headers plus counter and gauge sample lines", ()=>{
    const reg = new MetricsRegistry();
    const counter = reg.counter("http_requests_total", "Total requests.", [
        "method"
    ]);
    counter.inc({
        method: "GET"
    }, 3);
    const gauge = reg.gauge("inflight", "In flight.");
    gauge.set({}, 2);
    const text = reg.collect();
    assert.match(text, /# HELP http_requests_total Total requests\./);
    assert.match(text, /# TYPE http_requests_total counter/);
    assert.match(text, /http_requests_total\{method="GET"\} 3/);
    assert.match(text, /# TYPE inflight gauge/);
    assert.match(text, /^inflight 2$/m);
});
test("collect() renders histograms with cumulative bucket lines, +Inf, sum, and count", ()=>{
    const reg = new MetricsRegistry();
    const hist = reg.histogram("dur_seconds", "Duration.", [], [
        0.1,
        1
    ]);
    hist.observe({}, 0.05);
    hist.observe({}, 5);
    const text = reg.collect();
    assert.match(text, /dur_seconds_bucket\{le="0\.1"\} 1/);
    assert.match(text, /dur_seconds_bucket\{le="1"\} 1/);
    assert.match(text, /dur_seconds_bucket\{le="\+Inf"\} 2/);
    assert.match(text, /dur_seconds_sum 5\.05/);
    assert.match(text, /dur_seconds_count 2/);
});
test("collect() escapes backslashes, quotes, and newlines in label values", ()=>{
    const reg = new MetricsRegistry();
    const counter = reg.counter("weird", "help", [
        "tag"
    ]);
    counter.inc({
        tag: 'back\\slash "quote"\nline'
    });
    const text = reg.collect();
    assert.match(text, /tag="back\\\\slash \\"quote\\"\\nline"/);
});
test("reset() clears all series but keeps registered families/metadata", ()=>{
    const reg = new MetricsRegistry();
    const counter = reg.counter("c", "h");
    counter.inc();
    assert.equal(counter.get(), 1);
    reg.reset();
    assert.equal(counter.get(), 0);
    assert.equal(reg.families.size, 1, "family definitions survive reset");
});
test("render.contentType is the Prometheus text-exposition content type", ()=>{
    const reg = new MetricsRegistry();
    assert.equal(reg.render.contentType, "text/plain; version=0.0.4; charset=utf-8");
    reg.counter("x", "h").inc();
    assert.equal(reg.render(), reg.collect());
});
test("scrapeHandler() writes the rendered metrics with the correct content-type and 200 status", async ()=>{
    const reg = new MetricsRegistry();
    reg.counter("scraped_total", "h").inc(undefined, 7);
    const headers = {};
    let writtenStatus;
    let writtenBody;
    const fakeRes = {
        setHeader (name, value) {
            headers[name.toLowerCase()] = value;
        },
        writeHead (status) {
            writtenStatus = status;
            return fakeRes;
        },
        end (body) {
            writtenBody = body;
        }
    };
    const handler = reg.scrapeHandler();
    await handler({
        res: fakeRes
    });
    assert.equal(writtenStatus, 200);
    assert.equal(headers["content-type"], "text/plain; version=0.0.4; charset=utf-8");
    assert.match(writtenBody ?? "", /scraped_total 7/);
});
