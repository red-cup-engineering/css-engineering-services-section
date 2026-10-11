import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { tryFiles } from "../../src/edge/tryfiles.mjs";
import { startMiddlewareServer } from "./helpers/server.mjs";
async function withFixtureRoot(run) {
    const root = await mkdtemp(join(tmpdir(), "http-edge-tryfiles-"));
    try {
        await writeFile(join(root, "index.html"), "<h1>home</h1>");
        await run(root);
    } finally{
        await rm(root, {
            recursive: true,
            force: true
        });
    }
}
test("tryFiles: serves the first existing candidate via the static handler", async ()=>{
    await withFixtureRoot(async (root)=>{
        const server = await startMiddlewareServer(tryFiles({
            root,
            files: [
                "$uri",
                "/index.html"
            ]
        }));
        try {
            const res = await fetch(`${server.url}/missing`);
            assert.equal(res.status, 200);
            assert.equal(await res.text(), "<h1>home</h1>");
        } finally{
            await server.close();
        }
    });
});
test("tryFiles: fallback 'next' falls through to the next middleware when nothing matches", async ()=>{
    await withFixtureRoot(async (root)=>{
        let ran = false;
        const server = await startMiddlewareServer([
            tryFiles({
                root,
                files: [
                    "$uri"
                ],
                fallback: "next"
            }),
            (ctx)=>{
                ran = true;
                ctx.res.writeHead(200).end("fell through");
            }
        ]);
        try {
            const res = await fetch(`${server.url}/nope`);
            assert.equal(ran, true);
            assert.equal(await res.text(), "fell through");
        } finally{
            await server.close();
        }
    });
});
test("tryFiles: fallback '404' responds Not Found when nothing matches", async ()=>{
    await withFixtureRoot(async (root)=>{
        const server = await startMiddlewareServer(tryFiles({
            root,
            files: [
                "$uri"
            ],
            fallback: "404"
        }));
        try {
            const res = await fetch(`${server.url}/nope`);
            assert.equal(res.status, 404);
        } finally{
            await server.close();
        }
    });
});
test("tryFiles: a fixed fallback path is served when the primary candidates all miss", async ()=>{
    await withFixtureRoot(async (root)=>{
        const server = await startMiddlewareServer(tryFiles({
            root,
            files: [
                "$uri"
            ],
            fallback: "/index.html"
        }));
        try {
            const res = await fetch(`${server.url}/anything`);
            assert.equal(res.status, 200);
            assert.equal(await res.text(), "<h1>home</h1>");
        } finally{
            await server.close();
        }
    });
});
