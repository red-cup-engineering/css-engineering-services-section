import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeRoute } from "../../src/observability/metrics.mjs";
test("normalizeRoute prefers an explicit ctx.route over path derivation", ()=>{
    assert.equal(normalizeRoute({
        route: "/users/:id"
    }, {
        url: "/users/42"
    }), "/users/:id");
});
test("normalizeRoute falls back to matchedRoute then routeTemplate when route is absent", ()=>{
    assert.equal(normalizeRoute({
        matchedRoute: "/m"
    }), "/m");
    assert.equal(normalizeRoute({
        routeTemplate: "/t"
    }), "/t");
});
test("normalizeRoute replaces purely-numeric segments with :id", ()=>{
    assert.equal(normalizeRoute(undefined, {
        url: "/users/42/orders/7"
    }), "/users/:id/orders/:id");
});
test("normalizeRoute replaces UUID segments with :uuid", ()=>{
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    assert.equal(normalizeRoute(undefined, {
        url: `/things/${uuid}`
    }), "/things/:uuid");
});
test("normalizeRoute replaces long hex segments with :hash", ()=>{
    assert.equal(normalizeRoute(undefined, {
        url: "/blobs/deadbeefdeadbeef"
    }), "/blobs/:hash");
});
test("normalizeRoute leaves non-numeric, non-hash segments untouched", ()=>{
    assert.equal(normalizeRoute(undefined, {
        url: "/users/profile"
    }), "/users/profile");
});
test('normalizeRoute returns "/" for root path and empty path', ()=>{
    assert.equal(normalizeRoute(undefined, {
        url: "/"
    }), "/");
    assert.equal(normalizeRoute({
        path: ""
    }), "/");
});
test("normalizeRoute uses ctx.path directly when present as a string", ()=>{
    assert.equal(normalizeRoute({
        path: "/from/ctx/path/123"
    }), "/from/ctx/path/:id");
});
test("normalizeRoute falls back to the raw req.url (still template-substituted) when URL parsing throws", ()=>{
    const weird = {
        url: "http://bad url with spaces/42"
    };
    assert.equal(normalizeRoute(undefined, weird), "http://bad url with spaces/:id");
});
