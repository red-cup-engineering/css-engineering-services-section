import assert from "node:assert/strict";
import test from "node:test";
import { clearingSetCookie, readCookie, readSignedCookie, signedSetCookie } from "@red-cup-engineering/http-services-section/cookies";
test("Fetch-native signed cookies round-trip through one Request/Set-Cookie pair and refuse forgery", ()=>{
    const setCookie = signedSetCookie("session", "principal-7", "secret", {
        httpOnly: true,
        path: "/",
        maxAge: 60
    });
    assert.match(setCookie, /^session=principal-7\.[A-Za-z0-9_-]+; Max-Age=60; Path=\/; HttpOnly$/u);
    const cookie = setCookie.split(";")[0];
    const request = new Request("https://example.test/", {
        headers: {
            cookie: `other=1; ${cookie}`
        }
    });
    assert.equal(readCookie(request, "other"), "1");
    assert.equal(readSignedCookie(request, "session", "secret"), "principal-7");
    assert.equal(readSignedCookie(request, "session", "wrong"), null);
    assert.equal(readSignedCookie(new Request("https://example.test/", {
        headers: {
            cookie: "session=principal-7.forged"
        }
    }), "session", "secret"), null);
    assert.equal(readSignedCookie(new Request("https://example.test/"), "session", "secret"), null);
    assert.equal(readSignedCookie(new Request("https://example.test/", {
        headers: {
            cookie: `session=${cookie.slice(8)}`
        }
    }), "session", "secret"), "principal-7");
    assert.match(clearingSetCookie("session", {
        path: "/"
    }), /^session=; Max-Age=0; Path=\/; Expires=Thu, 01 Jan 1970 00:00:00 GMT$/u);
});
