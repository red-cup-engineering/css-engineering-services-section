import assert from "node:assert/strict";
import { test } from "node:test";
import { applyTrailerHeader, setTrailerHeader, writeResponseTrailers, immediateResponseTrailers, resolveResponseTrailers } from "@red-cup-engineering/http-services-section/trailers";
function fakeServerResponse(initialHeaders = {}) {
    const headers = {
        ...initialHeaders
    };
    let trailersWritten;
    let addTrailersThrows = false;
    return {
        getHeader: (name)=>headers[name],
        setHeader: (name, value)=>{
            headers[name] = value;
        },
        removeHeader: (name)=>{
            delete headers[name];
        },
        addTrailers (t) {
            if (addTrailersThrows) throw new Error("boom");
            trailersWritten = t;
        },
        _headers: headers,
        _trailersWritten: ()=>trailersWritten,
        _makeAddTrailersThrow: ()=>{
            addTrailersThrows = true;
        }
    };
}
test("applyTrailerHeader sets the Trailer header and strips Content-Length, returning true", ()=>{
    const headers = {
        "content-length": "42",
        "Content-Length": "42"
    };
    const changed = applyTrailerHeader(headers, {
        "x-checksum": "abc"
    });
    assert.equal(changed, true);
    assert.equal(headers.trailer, "x-checksum");
    assert.equal("content-length" in headers, false);
    assert.equal("Content-Length" in headers, false);
});
test("applyTrailerHeader returns false and leaves headers untouched when there are no valid trailer names", ()=>{
    const headers = {
        "content-length": "10"
    };
    const changed = applyTrailerHeader(headers, {
        "content-type": "text/plain"
    });
    assert.equal(changed, false);
    assert.equal(headers["content-length"], "10");
});
test("applyTrailerHeader merges with an existing Trailer header and de-duplicates case-insensitively", ()=>{
    const headers = {
        trailer: "X-Existing"
    };
    applyTrailerHeader(headers, {
        "x-existing": "1",
        "x-new": "2"
    });
    assert.equal(headers.trailer, "X-Existing, x-new");
});
test("setTrailerHeader writes the Trailer header on a ServerResponse-like object and removes Content-Length", ()=>{
    const res = fakeServerResponse({
        "Content-Length": "5"
    });
    const changed = setTrailerHeader(res, {
        "x-checksum": "abc"
    });
    assert.equal(changed, true);
    assert.equal(res._headers.Trailer, "x-checksum");
    assert.equal("Content-Length" in res._headers, false);
});
test("setTrailerHeader returns false when trailers are undefined or empty", ()=>{
    const res = fakeServerResponse();
    assert.equal(setTrailerHeader(res, undefined), false);
    assert.equal(setTrailerHeader(res, {}), false);
});
test("writeResponseTrailers calls res.addTrailers with stringified values, joining arrays, and is a no-op for empty trailers", ()=>{
    const res = fakeServerResponse();
    writeResponseTrailers(res, {
        "x-a": "1",
        "x-b": [
            "2",
            "3"
        ]
    });
    assert.deepEqual(res._trailersWritten(), {
        "x-a": "1",
        "x-b": "2, 3"
    });
    const res2 = fakeServerResponse();
    writeResponseTrailers(res2, undefined);
    assert.equal(res2._trailersWritten(), undefined);
});
test("writeResponseTrailers swallows errors thrown by res.addTrailers", ()=>{
    const res = fakeServerResponse();
    res._makeAddTrailersThrow();
    assert.doesNotThrow(()=>writeResponseTrailers(res, {
            "x-a": "1"
        }));
});
test("immediateResponseTrailers reads a plain-object trailers value synchronously", ()=>{
    const response = new Response("body");
    response.trailers = {
        "x-a": "1"
    };
    assert.deepEqual(immediateResponseTrailers(response), {
        "x-a": "1"
    });
});
test("immediateResponseTrailers converts a Headers instance to a plain object", ()=>{
    const response = new Response("body");
    response.trailers = new Headers({
        "x-a": "1",
        "x-b": "2"
    });
    assert.deepEqual(immediateResponseTrailers(response), {
        "x-a": "1",
        "x-b": "2"
    });
});
test("immediateResponseTrailers returns undefined for a pending Promise or absent trailers", ()=>{
    const withPromise = new Response("body");
    withPromise.trailers = Promise.resolve({
        "x-a": "1"
    });
    assert.equal(immediateResponseTrailers(withPromise), undefined);
    const withoutTrailers = new Response("body");
    assert.equal(immediateResponseTrailers(withoutTrailers), undefined);
});
test("resolveResponseTrailers awaits a Promise-valued trailers source", async ()=>{
    const response = new Response("body");
    response.trailers = Promise.resolve({
        "x-a": "1"
    });
    assert.deepEqual(await resolveResponseTrailers(response), {
        "x-a": "1"
    });
});
test("resolveResponseTrailers resolves a synchronous trailers value too", async ()=>{
    const response = new Response("body");
    response.trailers = {
        "x-a": "1"
    };
    assert.deepEqual(await resolveResponseTrailers(response), {
        "x-a": "1"
    });
});
