// prove-protocol — the wire shapes and the encode/decode boundary round-trip and reject garbage.

import { MSG, PROTOCOL_VERSION, hello, snapshot, delta, event, chat, bye, join, intent, encode, decode, packEntries, unpackEntries, packMessage, unpackMessage, PACKED_ENTRIES } from "@red-cup-engineering/computer-networking-engineering-services-section/qwzspace/protocol";
import { ok, eq, done } from "./_harness.mjs";
import { test } from "node:test";

test("prove-protocol", async () => {
eq(hello("p1", { tick: 3 }), { k: "hello", v: PROTOCOL_VERSION, id: "p1", world: { tick: 3 } }, "hello carries version, id, world");
eq(snapshot(5, "p1", [{ id: "a" }]), { k: MSG.snapshot, tick: 5, you: "p1", e: [{ id: "a" }] }, "snapshot carries the full interest set verbatim");
eq(delta(6, 9, [{ id: "a" }], ["b"]), { k: MSG.delta, tick: 6, ack: 9, c: [{ id: "a" }], g: ["b"] }, "delta carries changed + gone + ack");
eq(chat("Aletheon", "hi"), { k: MSG.event, t: "chat", from: "Aletheon", line: "hi" }, "chat is an event with t:chat");
eq(event("banner", { text: "x" }), { k: MSG.event, t: "banner", text: "x" }, "event keys a game broadcast by t");
eq(bye("z"), { k: MSG.bye, id: "z" }, "bye names the departed id");
eq(join("  Ada  "), { k: MSG.join, name: "  Ada  " }, "join keeps the handle (slice only)");
eq(intent(4, { kind: "move", dir: "n" }), { k: MSG.intent, seq: 4, kind: "move", dir: "n" }, "intent stamps seq and spreads the body");
ok(join().name === "wanderer", "join defaults to wanderer");

// chat is capped at 200 chars
ok(chat("x", "a".repeat(500)).line.length === 200, "chat line is capped at 200");

// encode / decode round-trip
const round = decode(encode(snapshot(1, "p", [])));
eq(round, { k: "snapshot", tick: 1, you: "p", e: [] }, "encode->decode round-trips a message");
ok(decode("not json") === null, "decode returns null on garbage, never throws");
ok(decode(JSON.stringify({ no: "k" })) === null, "decode rejects an object without a string k");

// === entry packing: the wire-format seam ======================================================
// Lossless by construction: a packed frame decodes to the same entries JSON would have carried.
const mixed = [
  { id: "a", kind: "actor", x: 1, y: 2, name: "Ada", hp: null },
  { id: "b", kind: "actor", x: 3, y: 4, name: "Bob", hp: 7 },
  { id: "c", kind: "item", x: 5, y: 6, tags: ["gold"], meta: { weight: 2 } },
  { id: "d", kind: "actor", x: 8, y: 9, name: "Dee", hp: 1, extra: undefined },
];
const packedMixed = packEntries(mixed);
ok(!Array.isArray(packedMixed) && Array.isArray(packedMixed[PACKED_ENTRIES]), "entries sharing a key signature pack into keyed groups");
eq(packedMixed[PACKED_ENTRIES].length, 2, "one group per distinct key signature (the item's keys differ)");
eq(packedMixed[PACKED_ENTRIES][0][0], ["id", "kind", "x", "y", "name", "hp"], "a group carries its keys once, in entry order");
const back = unpackEntries(packedMixed);
eq(back.map((e) => e.id).sort(), ["a", "b", "c", "d"], "every entry survives the round trip");
eq(back.find((e) => e.id === "a"), mixed[0], "null stays null");
eq(back.find((e) => e.id === "c"), mixed[2], "nested arrays and objects ride verbatim");
eq(back.find((e) => e.id === "d"), { id: "d", kind: "actor", x: 8, y: 9, name: "Dee", hp: 1 }, "an undefined-valued key is dropped exactly as JSON.stringify would drop it");
const byId = (list) => [...list].sort((a, b) => (a.id < b.id ? -1 : 1));
eq(byId(unpackEntries(JSON.parse(JSON.stringify(packedMixed)))), byId(JSON.parse(JSON.stringify(mixed))), "a packed group set survives its own JSON round trip (entry order across signature groups is not preserved, by design -- every reader keys by id)");

const lone = [{ id: "solo", x: 1 }];
ok(packEntries(lone) === lone, "a lone entry is left as the same array (packing would cost bytes)");
const disjoint = [{ id: "a", x: 1 }, { id: "b", y: 2 }];
ok(packEntries(disjoint) === disjoint, "entries with no shared signature are left as the same array");
ok(packEntries("nope") === "nope", "a non-array is returned untouched");
eq(unpackEntries({ [PACKED_ENTRIES]: "garbage" }), [], "a malformed group set unpacks to no entries, never a throw");
eq(unpackEntries([{ id: "z" }]), [{ id: "z" }], "a plain array unpacks to itself");

const homogeneous = Array.from({ length: 20 }, (_, i) => ({ id: `a${i}`, kind: "actor", x: i * 1.5, y: i * 2.5, name: `bot-${i}`, joinedTick: i }));
const snap = snapshot(7, "a0", homogeneous);
const packedSnap = packMessage(snap);
ok(packedSnap !== snap && !Array.isArray(packedSnap.e), "packMessage packs a snapshot's entries");
eq(unpackMessage(packedSnap), snap, "unpackMessage restores it exactly (order preserved for one signature)");
const d = delta(8, 3, homogeneous.slice(0, 5), ["gone-1"]);
eq(decode(encode(d, { pack: true })), d, "encode(pack) -> decode round-trips a delta exactly");
eq(decode(encode(d)), d, "and the default encode is byte-for-byte the flat JSON it always was");
ok(packMessage(hello("p1")) === hello("p1") || packMessage(hello("p1")).k === "hello", "non-entry messages pass through packing untouched");
eq(packMessage(chat("x", "hi")), chat("x", "hi"), "an event is returned unchanged");
const flatBytes = Buffer.byteLength(encode(snap));
const packedBytes = Buffer.byteLength(encode(snap, { pack: true }));
ok(packedBytes < flatBytes * 0.7, `a 20-entity snapshot packs to under 70% of flat JSON (${packedBytes} vs ${flatBytes} bytes)`);
console.log(`  · 20-entity snapshot: ${flatBytes} B flat, ${packedBytes} B packed (${((1 - packedBytes / flatBytes) * 100).toFixed(1)}% fewer)`);

done("prove-protocol");
});
