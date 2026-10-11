import assert from "node:assert/strict";
import test from "node:test";
import { esiResource } from "../../src/edge/esi.mjs";
test("esiResource: a non-HTML representation passes through untouched", async ()=>{
    const handle = async ()=>({
            status: 200,
            type: "application/json",
            body: "{}"
        });
    const resolve = async ()=>"";
    const wrapped = esiResource(handle, resolve);
    const repr = await wrapped({}, {});
    assert.equal(repr?.type, "application/json");
    assert.equal(repr?.body, "{}");
});
test("esiResource: HTML without ESI markup passes through unchanged (no vary header added)", async ()=>{
    const handle = async ()=>({
            status: 200,
            type: "text/html; charset=utf-8",
            body: "<p>plain</p>"
        });
    const resolve = async ()=>"";
    const wrapped = esiResource(handle, resolve);
    const repr = await wrapped({}, {});
    assert.equal(repr?.body, "<p>plain</p>");
    assert.equal(repr?.headers?.vary, undefined);
});
test("esiResource: HTML containing an esi:include is composed via the resolver and gains a Vary header", async ()=>{
    const handle = async ()=>({
            status: 200,
            type: "text/html; charset=utf-8",
            etag: '"abc"',
            body: '<p>before</p><esi:include src="/frag"/><p>after</p>'
        });
    const resolve = async (src)=>`[${src}]`;
    const wrapped = esiResource(handle, resolve);
    const repr = await wrapped({}, {});
    assert.equal(repr?.body, "<p>before</p>[/frag]<p>after</p>");
    assert.equal(repr?.headers?.vary, "Accept");
    assert.equal(repr && "etag" in repr, false, "composition should invalidate the fragment ETag");
});
test("esiResource: a null representation from the handler passes through as null", async ()=>{
    const handle = async ()=>null;
    const resolve = async ()=>"";
    const wrapped = esiResource(handle, resolve);
    assert.equal(await wrapped({}, {}), null);
});
test("esiResource: vary:false suppresses the added Vary header even when ESI is composed", async ()=>{
    const handle = async ()=>({
            status: 200,
            type: "text/html; charset=utf-8",
            body: '<esi:include src="/frag"/>'
        });
    const resolve = async ()=>"frag-body";
    const wrapped = esiResource(handle, resolve, {
        vary: false
    });
    const repr = await wrapped({}, {});
    assert.equal(repr?.body, "frag-body");
    assert.equal(repr?.headers?.vary, undefined);
});
