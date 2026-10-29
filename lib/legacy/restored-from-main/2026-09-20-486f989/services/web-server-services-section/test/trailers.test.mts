import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyTrailerHeader,
  setTrailerHeader,
  writeResponseTrailers,
  immediateResponseTrailers,
  resolveResponseTrailers,
} from "../src/internal/trailers.mts";

function fakeServerResponse(initialHeaders: Record<string, string> = {}) {
  const headers: Record<string, string> = { ...initialHeaders };
  let trailersWritten: Record<string, string> | undefined;
  let addTrailersThrows = false;
  return {
    getHeader: (name: string) => headers[name],
    setHeader: (name: string, value: string) => { headers[name] = value; },
    removeHeader: (name: string) => { delete headers[name]; },
    addTrailers(t: Record<string, string>) {
      if (addTrailersThrows) throw new Error("boom");
      trailersWritten = t;
    },
    _headers: headers,
    _trailersWritten: () => trailersWritten,
    _makeAddTrailersThrow: () => { addTrailersThrows = true; },
  };
}

test("applyTrailerHeader sets the Trailer header and strips Content-Length, returning true", () => {
  const headers: Record<string, string> = { "content-length": "42", "Content-Length": "42" };
  const changed = applyTrailerHeader(headers, { "x-checksum": "abc" });
  assert.equal(changed, true);
  assert.equal(headers.trailer, "x-checksum");
  assert.equal("content-length" in headers, false);
  assert.equal("Content-Length" in headers, false);
});

test("applyTrailerHeader returns false and leaves headers untouched when there are no valid trailer names", () => {
  const headers: Record<string, string> = { "content-length": "10" };
  const changed = applyTrailerHeader(headers, { "content-type": "text/plain" }); // forbidden trailer name
  assert.equal(changed, false);
  assert.equal(headers["content-length"], "10");
});

test("applyTrailerHeader merges with an existing Trailer header and de-duplicates case-insensitively", () => {
  const headers: Record<string, string> = { trailer: "X-Existing" };
  applyTrailerHeader(headers, { "x-existing": "1", "x-new": "2" });
  assert.equal(headers.trailer, "X-Existing, x-new");
});

test("setTrailerHeader writes the Trailer header on a ServerResponse-like object and removes Content-Length", () => {
  const res = fakeServerResponse({ "Content-Length": "5" });
  const changed = setTrailerHeader(res as any, { "x-checksum": "abc" });
  assert.equal(changed, true);
  assert.equal(res._headers.Trailer, "x-checksum");
  assert.equal("Content-Length" in res._headers, false);
});

test("setTrailerHeader returns false when trailers are undefined or empty", () => {
  const res = fakeServerResponse();
  assert.equal(setTrailerHeader(res as any, undefined), false);
  assert.equal(setTrailerHeader(res as any, {}), false);
});

test("writeResponseTrailers calls res.addTrailers with stringified values, joining arrays, and is a no-op for empty trailers", () => {
  const res = fakeServerResponse();
  writeResponseTrailers(res as any, { "x-a": "1", "x-b": ["2", "3"] });
  assert.deepEqual(res._trailersWritten(), { "x-a": "1", "x-b": "2, 3" });

  const res2 = fakeServerResponse();
  writeResponseTrailers(res2 as any, undefined);
  assert.equal(res2._trailersWritten(), undefined);
});

test("writeResponseTrailers swallows errors thrown by res.addTrailers", () => {
  const res = fakeServerResponse();
  res._makeAddTrailersThrow();
  assert.doesNotThrow(() => writeResponseTrailers(res as any, { "x-a": "1" }));
});

test("immediateResponseTrailers reads a plain-object trailers value synchronously", () => {
  const response = new Response("body") as any;
  response.trailers = { "x-a": "1" };
  assert.deepEqual(immediateResponseTrailers(response), { "x-a": "1" });
});

test("immediateResponseTrailers converts a Headers instance to a plain object", () => {
  const response = new Response("body") as any;
  response.trailers = new Headers({ "x-a": "1", "x-b": "2" });
  assert.deepEqual(immediateResponseTrailers(response), { "x-a": "1", "x-b": "2" });
});

test("immediateResponseTrailers returns undefined for a pending Promise or absent trailers", () => {
  const withPromise = new Response("body") as any;
  withPromise.trailers = Promise.resolve({ "x-a": "1" });
  assert.equal(immediateResponseTrailers(withPromise), undefined);

  const withoutTrailers = new Response("body") as any;
  assert.equal(immediateResponseTrailers(withoutTrailers), undefined);
});

test("resolveResponseTrailers awaits a Promise-valued trailers source", async () => {
  const response = new Response("body") as any;
  response.trailers = Promise.resolve({ "x-a": "1" });
  assert.deepEqual(await resolveResponseTrailers(response), { "x-a": "1" });
});

test("resolveResponseTrailers resolves a synchronous trailers value too", async () => {
  const response = new Response("body") as any;
  response.trailers = { "x-a": "1" };
  assert.deepEqual(await resolveResponseTrailers(response), { "x-a": "1" });
});
