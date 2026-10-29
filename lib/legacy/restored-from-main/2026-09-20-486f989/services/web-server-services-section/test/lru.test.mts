import assert from "node:assert/strict";
import { test } from "node:test";
import { LruMap, lruMap, boundedMap } from "../src/internal/lru.mts";

test("LruMap evicts the oldest entry once the max size is exceeded", () => {
  const evicted: Array<[string, number]> = [];
  const map = new LruMap<string, number>({ max: 2, onEvict: (k, v) => evicted.push([k, v]) });
  map.set("a", 1);
  map.set("b", 2);
  map.set("c", 3); // evicts "a", the oldest
  assert.equal(map.size, 2);
  assert.equal(map.has("a"), false);
  assert.deepEqual(evicted, [["a", 1]]);
  assert.equal(map.get("b"), 2);
  assert.equal(map.get("c"), 3);
});

test("LruMap.get marks a key as recently used, so it survives the next eviction", () => {
  const map = new LruMap<string, number>({ max: 2 });
  map.set("a", 1);
  map.set("b", 2);
  map.get("a"); // "a" becomes most-recently-used; "b" is now the oldest
  map.set("c", 3); // evicts "b"
  assert.equal(map.has("a"), true);
  assert.equal(map.has("b"), false);
  assert.equal(map.has("c"), true);
});

test("LruMap.peek reads a value without affecting recency order", () => {
  const map = new LruMap<string, number>({ max: 2 });
  map.set("a", 1);
  map.set("b", 2);
  assert.equal(map.peek("a"), 1);
  map.set("c", 3); // "a" is still the oldest since peek did not touch recency
  assert.equal(map.has("a"), false);
  assert.equal(map.has("b"), true);
});

test("LruMap re-setting an existing key updates its value and refreshes recency without evicting", () => {
  const map = new LruMap<string, number>({ max: 2 });
  map.set("a", 1);
  map.set("b", 2);
  map.set("a", 99); // refresh "a"; "b" becomes oldest
  assert.equal(map.size, 2);
  assert.equal(map.get("a"), 99);
  map.set("c", 3); // evicts "b"
  assert.equal(map.has("b"), false);
  assert.equal(map.has("a"), true);
});

test("LruMap delete, clear, keys/values/entries iterate current contents", () => {
  const map = new LruMap<string, number>({ max: 5 });
  map.set("a", 1);
  map.set("b", 2);
  assert.equal(map.delete("a"), true);
  assert.equal(map.delete("a"), false);
  assert.deepEqual([...map.keys()], ["b"]);
  assert.deepEqual([...map.values()], [2]);
  assert.deepEqual([...map.entries()], [["b", 2]]);
  map.clear();
  assert.equal(map.size, 0);
});

test("lruMap() factory returns an equivalent LruMap instance", () => {
  const map = lruMap<string, number>({ max: 1 });
  map.set("a", 1);
  map.set("b", 2);
  assert.equal(map.has("a"), false);
  assert.equal(map.has("b"), true);
});

test("boundedMap defaults to max=0, meaning unbounded (never evicts)", () => {
  const map = boundedMap<string, number>();
  for (let i = 0; i < 50; i++) map.set(`k${i}`, i);
  assert.equal(map.size, 50);
});

test("boundedMap honors an explicit max and onEvict", () => {
  const evicted: string[] = [];
  const map = boundedMap<string, number>({ max: 1, onEvict: (k) => evicted.push(k) });
  map.set("a", 1);
  map.set("b", 2);
  assert.deepEqual(evicted, ["a"]);
});
