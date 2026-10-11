import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { memoryStore, diskStore } from "../src/emulation/store.mjs";
test("memoryStore roundtrips values and reports has/delete/clear correctly", async ()=>{
    const store = memoryStore();
    assert.equal(await store.has("k"), false);
    await store.set("k", {
        n: 1
    });
    assert.deepEqual(await store.get("k"), {
        n: 1
    });
    assert.equal(await store.has("k"), true);
    assert.equal(await store.delete("k"), true);
    assert.equal(await store.delete("k"), false);
    await store.set("a", {
        n: 1
    });
    await store.set("b", {
        n: 2
    });
    await store.clear();
    assert.equal(await store.has("a"), false);
});
test("memoryStore clones values on set/get so external mutation cannot leak into or out of the store", async ()=>{
    const store = memoryStore();
    const original = {
        n: 1
    };
    await store.set("k", original);
    original.n = 999;
    const stored = await store.get("k");
    assert.deepEqual(stored, {
        n: 1
    });
    stored.n = 12345;
    assert.deepEqual(await store.get("k"), {
        n: 1
    });
});
test("memoryStore.entries yields all [key, value] pairs", async ()=>{
    const store = memoryStore();
    await store.set("a", 1);
    await store.set("b", 2);
    const collected = [];
    for await (const entry of store.entries())collected.push(entry);
    collected.sort((x, y)=>x[0].localeCompare(y[0]));
    assert.deepEqual(collected, [
        [
            "a",
            1
        ],
        [
            "b",
            2
        ]
    ]);
});
test("diskStore persists JSON-serialized values to files under its directory and roundtrips them", async ()=>{
    const dir = await mkdtemp(join(tmpdir(), "http-server-core-store-"));
    try {
        const store = diskStore({
            dir
        });
        assert.equal(await store.has("k"), false);
        assert.equal(await store.get("k"), undefined);
        await store.set("k", {
            n: 7
        });
        assert.equal(await store.has("k"), true);
        assert.deepEqual(await store.get("k"), {
            n: 7
        });
        assert.equal(await store.delete("k"), true);
        assert.equal(await store.delete("k"), false);
        await store.close();
    } finally{
        await rm(dir, {
            recursive: true,
            force: true
        });
    }
});
test("diskStore encodes keys safely for the filesystem and entries() enumerates all stored pairs", async ()=>{
    const dir = await mkdtemp(join(tmpdir(), "http-server-core-store-"));
    try {
        const store = diskStore({
            dir
        });
        await store.set("weird/key with spaces", 1);
        await store.set("plain", 2);
        const collected = [];
        for await (const entry of store.entries())collected.push(entry);
        collected.sort((a, b)=>a[0].localeCompare(b[0]));
        assert.deepEqual(collected, [
            [
                "plain",
                2
            ],
            [
                "weird/key with spaces",
                1
            ]
        ]);
    } finally{
        await rm(dir, {
            recursive: true,
            force: true
        });
    }
});
test("diskStore.clear removes and recreates the store directory, leaving it empty", async ()=>{
    const dir = await mkdtemp(join(tmpdir(), "http-server-core-store-"));
    try {
        const store = diskStore({
            dir
        });
        await store.set("a", 1);
        await store.clear();
        assert.equal(await store.has("a"), false);
        await store.set("b", 2);
        assert.deepEqual(await store.get("b"), 2);
    } finally{
        await rm(dir, {
            recursive: true,
            force: true
        });
    }
});
