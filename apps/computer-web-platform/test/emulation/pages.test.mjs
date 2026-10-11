import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileSystemRouter } from "../../src/emulation/fs-router.mjs";
import { loadPages, pagesApp, devPages, pagesSite } from "../../src/emulation/pages.mjs";
async function makeDir(t, files) {
    const dir = await mkdtemp(join(tmpdir(), "pages-"));
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
function mockCtx(method, url) {
    const headers = {};
    const req = {
        method,
        url,
        headers
    };
    const res = {
        statusCode: undefined,
        _headers: {},
        body: undefined,
        headersSent: false,
        setHeader (name, value) {
            this._headers[name.toLowerCase()] = value;
        },
        hasHeader (name) {
            return name.toLowerCase() in this._headers;
        },
        getHeader (name) {
            return this._headers[name.toLowerCase()];
        },
        writeHead (status, hdrs) {
            this.statusCode = status;
            if (hdrs) for (const [k, v] of Object.entries(hdrs))this._headers[k.toLowerCase()] = v;
            this.headersSent = true;
            return this;
        },
        end (chunk) {
            this.body = chunk;
            return this;
        }
    };
    const ctx = {
        req,
        res,
        url: new URL(url, "http://localhost")
    };
    return ctx;
}
test("loadPages converts nested files to routes: static, dynamic [param], and nested index", async (t)=>{
    const dir = await makeDir(t, {
        "about.mjs": "export function handler(){ return 'about'; }",
        "blog/[id].mjs": "export function handler(){ return 'post'; }",
        "blog/index.mjs": "export function handler(){ return 'blog-home'; }"
    });
    const resources = await loadPages({
        dir
    });
    const routes = resources.map((r)=>r.match).sort();
    assert.deepEqual(routes, [
        "/about",
        "/blog",
        "/blog/:id"
    ]);
});
test("loadPages maps a top-level index module to the canonical root route", async (t)=>{
    const dir = await makeDir(t, {
        "index.mjs": "export function handler(){ return 'home'; }"
    });
    const resources = await loadPages({
        dir
    });
    assert.equal(resources.length, 1);
    assert.equal(resources[0].match, "/");
});
test("loadPages and fileSystemRouter share canonical precedence, dynamic, and catch-all route manifests", async (t)=>{
    const dir = await makeDir(t, {
        "index.mjs": "export function handler(){ return 'home'; }",
        "posts/new.mjs": "export function handler(){ return 'new'; }",
        "posts/[id].mjs": "export function handler(){ return 'post'; }",
        "posts/[...slug].mjs": "export function handler(){ return 'archive'; }",
        "docs/[[...slug]].mjs": "export function handler(){ return 'docs'; }"
    });
    const pages = await loadPages({
        dir
    });
    const filesystem = await fileSystemRouter({
        dir
    });
    assert.deepEqual(pages.map((resource)=>resource.match), filesystem.routes.map((route)=>route.pattern));
    assert.deepEqual(pages.map((resource)=>resource.match), [
        "/posts/new",
        "/posts/:id",
        "/",
        "/posts/*slug",
        "/docs/*slug?"
    ]);
});
test("loadPages applies prefixes through the canonical manifest", async (t)=>{
    const dir = await makeDir(t, {
        "index.mjs": "export function handler(){ return 'home'; }",
        "users/[id].mjs": "export function handler(){ return 'user'; }"
    });
    const resources = await loadPages({
        dir,
        prefix: "/admin"
    });
    assert.deepEqual(resources.map((resource)=>resource.match), [
        "/admin/users/:id",
        "/admin"
    ]);
});
test("loadPages prefers a named `handler` export over `default`, and falls back to default when handler is absent", async (t)=>{
    const dir = await makeDir(t, {
        "a.mjs": "export function handler(){ return 'named'; } export default function(){ return 'default'; }",
        "b.mjs": "export default function(){ return 'only-default'; }"
    });
    const resources = await loadPages({
        dir
    });
    const a = resources.find((r)=>r.match === "/a");
    const b = resources.find((r)=>r.match === "/b");
    assert.equal(await a.handler(), "named");
    assert.equal(await b.handler(), "only-default");
});
test("loadPages attaches an explicit `methods` export to the resource, and skips modules with no handler or that throw on import", async (t)=>{
    const dir = await makeDir(t, {
        "api.mjs": "export function handler(){}; export const methods=['GET','POST'];",
        "no-handler.mjs": "export const notAHandler = 1;",
        "broken.mjs": "throw new Error('boom');"
    });
    const resources = await loadPages({
        dir
    });
    assert.equal(resources.length, 1);
    assert.equal(resources[0].match, "/api");
    assert.deepEqual(resources[0].methods, [
        "GET",
        "POST"
    ]);
});
test("loadPages returns an empty array for a pages directory that does not exist", async ()=>{
    const resources = await loadPages({
        dir: join(tmpdir(), "pages-missing-xyz")
    });
    assert.deepEqual(resources, []);
});
test("pagesApp wraps loadPages's result as an App; devPages rescans and mutates ctx.app.resources on each call", async (t)=>{
    const dir = await makeDir(t, {
        "a.mjs": "export function handler(){ return 'a'; }"
    });
    const app = await pagesApp({
        dir
    });
    assert.equal(app.resources.length, 1);
    const onRequest = devPages({
        dir
    });
    const ctxApp = {
        resources: []
    };
    await onRequest({
        app: ctxApp
    });
    assert.equal(ctxApp.resources.length, 1);
    await writeFile(join(dir, "b.mjs"), "export function handler(){ return 'b'; }", "utf8");
    await onRequest({
        app: ctxApp
    });
    assert.equal(ctxApp.resources.length, 2);
});
test("pagesSite resource.handler serves index.html for '/' and a file for its clean path", async (t)=>{
    const dir = await makeDir(t, {
        "index.html": "<h1>home</h1>",
        "about.html": "<h1>about</h1>"
    });
    const site = pagesSite({
        dir
    });
    const rootCtx = mockCtx("GET", "/");
    await site.resources[0].handler(rootCtx);
    assert.equal(rootCtx.res.statusCode, 200);
    assert.equal(rootCtx.res.body.toString(), "<h1>home</h1>");
    const aboutCtx = mockCtx("GET", "/about");
    await site.resources[0].handler(aboutCtx);
    assert.equal(aboutCtx.res.statusCode, 200);
    assert.equal(aboutCtx.res.body.toString(), "<h1>about</h1>");
});
test("pagesSite falls back to a custom 404.html when a path resolves to nothing, else plain text 404", async (t)=>{
    const dir = await makeDir(t, {
        "index.html": "home",
        "404.html": "<p>custom not found</p>"
    });
    const site = pagesSite({
        dir
    });
    const ctx = mockCtx("GET", "/does-not-exist");
    await site.resources[0].handler(ctx);
    assert.equal(ctx.res.statusCode, 404);
    assert.equal(ctx.res.body.toString(), "<p>custom not found</p>");
    const dirNo404 = await makeDir(t, {
        "index.html": "home"
    });
    const siteNo404 = pagesSite({
        dir: dirNo404
    });
    const ctx2 = mockCtx("GET", "/nope");
    await siteNo404.resources[0].handler(ctx2);
    assert.equal(ctx2.res.statusCode, 404);
    assert.equal(ctx2.res.body, "Not Found");
});
test("pagesSite's redirect middleware honors a `_redirects` rule and short-circuits with a Location header", async (t)=>{
    const dir = await makeDir(t, {
        "index.html": "home",
        "_redirects": "/old /new 301\n"
    });
    const site = pagesSite({
        dir
    });
    const redirectMiddleware = site.middlewares[1];
    const ctx = mockCtx("GET", "/old");
    const handled = await redirectMiddleware(ctx);
    assert.equal(handled, true);
    assert.equal(ctx.res.statusCode, 301);
    assert.equal(ctx.res._headers.location, "/new");
});
test("pagesSite's headers middleware applies extra headers from a `_headers` file matching the request path", async (t)=>{
    const dir = await makeDir(t, {
        "index.html": "home",
        "_headers": "/\n  X-Frame-Options: DENY\n"
    });
    const site = pagesSite({
        dir
    });
    const headersMiddleware = site.middlewares[0];
    const ctx = mockCtx("GET", "/");
    await headersMiddleware(ctx);
    assert.equal(ctx.res._headers["x-frame-options"], "DENY");
});
