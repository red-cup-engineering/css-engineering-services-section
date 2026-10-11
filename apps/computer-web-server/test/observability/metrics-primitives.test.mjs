import { test } from "node:test";
import assert from "node:assert/strict";
import { Counter, Gauge, Histogram, MetricsRegistry, DEFAULT_BUCKETS } from "../../src/observability/metrics.mjs";
test("DEFAULT_BUCKETS is the documented Prometheus-style bucket ladder", ()=>{
    assert.deepEqual(DEFAULT_BUCKETS, [
        0.005,
        0.01,
        0.025,
        0.05,
        0.1,
        0.25,
        0.5,
        1,
        2.5,
        5,
        10
    ]);
});
test("Counter.inc accumulates per label-set and .get reads it back", ()=>{
    const reg = new MetricsRegistry();
    const counter = reg.counter("requests_total", "help text", [
        "method"
    ]);
    counter.inc({
        method: "GET"
    });
    counter.inc({
        method: "GET"
    }, 4);
    counter.inc({
        method: "POST"
    });
    assert.equal(counter.get({
        method: "GET"
    }), 5);
    assert.equal(counter.get({
        method: "POST"
    }), 1);
    assert.equal(counter.get({
        method: "DELETE"
    }), 0, "unseen label combos read as 0");
});
test("Counter.inc rejects a negative delta (counters cannot decrease)", ()=>{
    const reg = new MetricsRegistry();
    const counter = reg.counter("c", "h");
    assert.throws(()=>counter.inc({}, -1), /counter cannot decrease/);
});
test("Counter exposes name/help/labelNames from its family", ()=>{
    const reg = new MetricsRegistry();
    const counter = reg.counter("my_counter", "my help", [
        "a",
        "b"
    ]);
    assert.equal(counter.name, "my_counter");
    assert.equal(counter.help, "my help");
    assert.deepEqual(counter.labelNames, [
        "a",
        "b"
    ]);
});
test("Gauge supports set/inc/dec independently per label-set", ()=>{
    const reg = new MetricsRegistry();
    const gauge = reg.gauge("inflight", "help", [
        "route"
    ]);
    gauge.set({
        route: "/a"
    }, 10);
    gauge.inc({
        route: "/a"
    });
    gauge.inc({
        route: "/a"
    }, 2);
    gauge.dec({
        route: "/a"
    }, 5);
    assert.equal(gauge.get({
        route: "/a"
    }), 8);
    assert.equal(gauge.get({
        route: "/b"
    }), 0, "default value for unset series is 0");
});
test("Gauge.inc/dec default delta is 1 when omitted", ()=>{
    const reg = new MetricsRegistry();
    const gauge = reg.gauge("g", "h");
    gauge.inc();
    gauge.inc();
    gauge.dec();
    assert.equal(gauge.get(), 1);
});
test("Histogram.observe buckets cumulatively (le semantics) and tracks sum/count", ()=>{
    const reg = new MetricsRegistry();
    const hist = reg.histogram("dur", "help", [], [
        1,
        5,
        10
    ]);
    hist.observe({}, 0.5);
    hist.observe({}, 3);
    hist.observe({}, 7);
    const series = hist.get({});
    assert.ok(series);
    assert.deepEqual(series.counts, [
        1,
        2,
        3
    ]);
    assert.equal(series.count, 3);
    assert.equal(series.sum, 10.5);
});
test("Histogram with default buckets de-dupes and sorts non-finite-filtered bucket boundaries", ()=>{
    const reg = new MetricsRegistry();
    const hist = reg.histogram("dur2", "help", [], [
        5,
        1,
        5,
        Infinity,
        10
    ]);
    hist.observe({}, 2);
    const series = hist.get({});
    assert.equal(series.counts.length, 3);
});
