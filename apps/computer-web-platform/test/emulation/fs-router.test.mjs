import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileSystemRouteManifest, fileSystemRouter } from "../../src/emulation/fs-router.mjs";
async function makeDir(t, files) {
    const dir = await mkdtemp(join(tmpdir(), "fsrouter-"));
    t.after(()=>rm(dir, {
            recursive: true,
            force: true
        }));
    for (const [rel, content] of Object.entries(files)){
        const full = join(dir, rel);
        await mkdir(dirname(full), {
            recursive: true
        });
        await writeFile(full, content, "utf8");
    }
    return dir;
}
function mockReq(method, url) {
    return {
        method,
        url,
        headers: {}
    };
}
function mockRes() {
    return {
        status: undefined,
        headers: undefined,
        body: undefined,
        writeHead (status, headers) {
            this.status = status;
            this.headers = headers;
        },
        end (body) {
            this.body = body;
        }
    };
}
test("static, dynamic, and catch-all siblings sort static > dynamic > catch-all", async (t)=>{
    const dir = await makeDir(t, {
        "users/me.mjs": "export function GET(){ return { status: 200, body: 'me' }; }",
        "users/[id].mjs": "export function GET(){ return { status: 200, body: 'id' }; }",
        "users/[...rest].mjs": "export function GET(){ return { status: 200, body: 'rest' }; }"
    });
    const { routes } = await fileSystemRouter({
        dir
    });
    assert.deepEqual(routes.map((r)=>r.pattern), [
        "/users/me",
        "/users/:id",
        "/users/*rest"
    ]);
});
test("directory-level static route sorts before a catch-all beneath it", async (t)=>{
    const dir = await makeDir(t, {
        "blog/index.mjs": "export default function(){ return { status: 200, body: 'blog-index' }; }",
        "blog/[...slug].mjs": "export default function(){ return { status: 200, body: 'blog-slug' }; }"
    });
    const { routes } = await fileSystemRouter({
        dir
    });
    assert.deepEqual(routes.map((r)=>r.pattern), [
        "/blog",
        "/blog/*slug"
    ]);
});
test("index.mjs maps to '/' and sorts after a sibling static route (root is length 0)", async (t)=>{
    const dir = await makeDir(t, {
        "index.mjs": "export default function(){ return { status: 200, body: 'home' }; }",
        "about.mjs": "export function GET(){ return { status: 200, body: 'about' }; }"
    });
    const { routes } = await fileSystemRouter({
        dir
    });
    assert.deepEqual(routes.map((r)=>r.pattern), [
        "/about",
        "/"
    ]);
});
test("catch-all requires at least one path segment; optional catch-all accepts zero", async (t)=>{
    const dir = await makeDir(t, {
        "blog/[...slug].mjs": "export function GET(){ return {}; }",
        "docs/[[...slug]].mjs": "export function GET(){ return {}; }"
    });
    const { resources } = await fileSystemRouter({
        dir
    });
    const blog = resources.find((r)=>r.pattern === "/blog/*slug");
    const docs = resources.find((r)=>r.pattern === "/docs/*slug?");
    assert.equal(blog.match("/blog"), null);
    assert.deepEqual(blog.match("/blog/a/b"), {
        slug: "a/b"
    });
    assert.deepEqual(docs.match("/docs"), {
        slug: ""
    });
    assert.deepEqual(docs.match("/docs/a/b"), {
        slug: "a/b"
    });
});
test("dynamic segment values are percent-decoded; an undecodable segment falls back to the raw text", async (t)=>{
    const dir = await makeDir(t, {
        "users/[id].mjs": "export function GET(){ return {}; }"
    });
    const { resources } = await fileSystemRouter({
        dir
    });
    const users = resources.find((r)=>r.pattern === "/users/:id");
    assert.deepEqual(users.match("/users/John%20Doe"), {
        id: "John Doe"
    });
    assert.deepEqual(users.match("/users/%"), {
        id: "%"
    });
});
test("handle() dispatches by HTTP method, falls back HEAD to GET, and answers 405 with an Allow header otherwise", async (t)=>{
    const dir = await makeDir(t, {
        "items.mjs": "export function GET(){ return { status: 200, body: 'items-get' }; }"
    });
    const { resources } = await fileSystemRouter({
        dir
    });
    const items = resources[0];
    const getResult = await items.handle(mockReq("GET", "/items"), {});
    assert.deepEqual(getResult, {
        status: 200,
        body: "items-get"
    });
    const headResult = await items.handle(mockReq("HEAD", "/items"), {});
    assert.deepEqual(headResult, {
        status: 200,
        body: "items-get"
    });
    const postResult = await items.handle(mockReq("POST", "/items"), {});
    assert.equal(postResult.status, 405);
    assert.equal(postResult.headers.allow, "GET, HEAD");
});
test("handler() writes a Repr through ctx.res, omitting the body on HEAD and adding computed headers", async (t)=>{
    const dir = await makeDir(t, {
        "greet.mjs": "export default function(){ return { status: 200, type: 'text/plain', body: 'hi', headers: { 'x-custom': '1' } }; }"
    });
    const { resources } = await fileSystemRouter({
        dir
    });
    const greet = resources[0];
    const getRes = mockRes();
    await greet.handler({
        req: mockReq("GET", "/greet"),
        res: getRes
    });
    assert.equal(getRes.status, 200);
    assert.equal(getRes.headers["content-type"], "text/plain");
    assert.equal(getRes.headers["x-custom"], "1");
    assert.equal(getRes.headers["content-length"], "2");
    assert.ok(Buffer.isBuffer(getRes.body));
    assert.equal(getRes.body.toString(), "hi");
    const headRes = mockRes();
    await greet.handler({
        req: mockReq("HEAD", "/greet"),
        res: headRes
    });
    assert.equal(headRes.status, 200);
    assert.equal(headRes.body, undefined);
});
test("handler() does not touch ctx.res when the handler's return value is not Repr-shaped", async (t)=>{
    const dir = await makeDir(t, {
        "silent.mjs": "export default function(){ return { foo: 'bar' }; }"
    });
    const { resources } = await fileSystemRouter({
        dir
    });
    const res = mockRes();
    const result = await resources[0].handler({
        req: mockReq("GET", "/silent"),
        res
    });
    assert.equal(result, undefined);
    assert.equal(res.status, undefined);
});
test("params come from ctx.path when present, else from req.url (query string stripped)", async (t)=>{
    const dir = await makeDir(t, {
        "users/[id].mjs": "export function GET(req, ctx){ return { status: 200, body: ctx.params.id }; }"
    });
    const { resources } = await fileSystemRouter({
        dir
    });
    const users = resources[0];
    const byUrl = await users.handle(mockReq("GET", "/users/42?x=1"), {});
    assert.equal(byUrl.body, "42");
    const byCtxPath = await users.handle(mockReq("GET", "/ignored"), {
        path: "/users/99"
    });
    assert.equal(byCtxPath.body, "99");
});
test("lazy mode (default) reports all methods before first load; eager mode reflects the module's real exports", async (t)=>{
    const dir = await makeDir(t, {
        "hook.mjs": "export function POST(){ return { status: 201 }; }"
    });
    const lazy = await fileSystemRouter({
        dir,
        lazy: true
    });
    assert.deepEqual(lazy.resources[0].methods, [
        "GET",
        "HEAD",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS"
    ]);
    const eager = await fileSystemRouter({
        dir,
        lazy: false
    });
    assert.deepEqual(eager.resources[0].methods, [
        "POST"
    ]);
});
test("default extensions include .mts, .mjs, and .js routes", async (t)=>{
    const dir = await makeDir(t, {
        "route.mjs": "export default function(){ return { status: 200, body: 'mjs' }; }",
        "route.mts": "export default function(){ return { status: 200, body: 'mts' }; }"
    });
    const defaults = await fileSystemRouter({
        dir
    });
    assert.equal(defaults.routes.length, 2);
    assert.deepEqual(defaults.routes.map((route)=>route.file.split("/").at(-1)), [
        "route.mjs",
        "route.mts"
    ]);
    const mtsDir = await makeDir(t, {
        "only.mts": "export default function(){ return { status: 200, body: 'only-mts' }; }"
    });
    const explicit = await fileSystemRouter({
        dir: mtsDir,
        extensions: [
            "mts"
        ]
    });
    assert.equal(explicit.routes.length, 1);
    const result = await explicit.resources[0].handle(mockReq("GET", "/only"), {});
    assert.deepEqual(result, {
        status: 200,
        body: "only-mts"
    });
});
test("fileSystemRouteManifest applies canonical matching, ordering, and a static prefix without loading modules", async (t)=>{
    const dir = await makeDir(t, {
        "index.mjs": "throw new Error('manifest discovery must not import route modules');",
        "posts/new.mjs": "export default function(){}",
        "posts/[id].mjs": "export default function(){}",
        "posts/[...slug].mjs": "export default function(){}"
    });
    const manifest = await fileSystemRouteManifest({
        dir,
        prefix: "/admin"
    });
    assert.deepEqual(manifest.map((route)=>route.pattern), [
        "/admin/posts/new",
        "/admin/posts/:id",
        "/admin",
        "/admin/posts/*slug"
    ]);
    assert.deepEqual(manifest[1].match("/admin/posts/hello%20world"), {
        id: "hello world"
    });
    assert.equal(manifest[2].match("/admin/posts"), null);
});
test("fileSystemRouter rejects when `dir` is falsy and resolves empty for a directory that does not exist", async (t)=>{
    await assert.rejects(()=>fileSystemRouter({
            dir: ""
        }), /fileSystemRouter: `dir` is required/);
    const missing = await fileSystemRouter({
        dir: join(tmpdir(), "fsrouter-does-not-exist-xyz")
    });
    assert.deepEqual(missing, {
        resources: [],
        routes: []
    });
});
