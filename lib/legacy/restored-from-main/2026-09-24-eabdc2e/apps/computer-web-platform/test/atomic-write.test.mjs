import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { atomicWrite, atomicWriteSync } from "../src/emulation/atomic-write.mjs";
test("atomicWrite creates missing parent directories and writes the final content, leaving no temp file behind", async ()=>{
    const dir = await mkdtemp(join(tmpdir(), "http-server-core-atomic-"));
    try {
        const dest = join(dir, "nested", "deep", "file.txt");
        await atomicWrite(dest, "hello");
        assert.equal(await readFile(dest, "utf8"), "hello");
        const siblings = await readdir(join(dir, "nested", "deep"));
        assert.deepEqual(siblings, [
            "file.txt"
        ]);
    } finally{
        await rm(dir, {
            recursive: true,
            force: true
        });
    }
});
test("atomicWrite overwrites an existing file's content", async ()=>{
    const dir = await mkdtemp(join(tmpdir(), "http-server-core-atomic-"));
    try {
        const dest = join(dir, "file.txt");
        await atomicWrite(dest, "first");
        await atomicWrite(dest, "second");
        assert.equal(await readFile(dest, "utf8"), "second");
    } finally{
        await rm(dir, {
            recursive: true,
            force: true
        });
    }
});
test("atomicWrite accepts Buffer content", async ()=>{
    const dir = await mkdtemp(join(tmpdir(), "http-server-core-atomic-"));
    try {
        const dest = join(dir, "file.bin");
        await atomicWrite(dest, Buffer.from([
            1,
            2,
            3
        ]));
        assert.deepEqual(await readFile(dest), Buffer.from([
            1,
            2,
            3
        ]));
    } finally{
        await rm(dir, {
            recursive: true,
            force: true
        });
    }
});
test("atomicWriteSync writes synchronously and leaves no temp file behind", async ()=>{
    const dir = await mkdtemp(join(tmpdir(), "http-server-core-atomic-"));
    try {
        const dest = join(dir, "sync.txt");
        atomicWriteSync(dest, "sync content");
        assert.equal(await readFile(dest, "utf8"), "sync content");
        const siblings = await readdir(dir);
        assert.deepEqual(siblings, [
            "sync.txt"
        ]);
    } finally{
        await rm(dir, {
            recursive: true,
            force: true
        });
    }
});
