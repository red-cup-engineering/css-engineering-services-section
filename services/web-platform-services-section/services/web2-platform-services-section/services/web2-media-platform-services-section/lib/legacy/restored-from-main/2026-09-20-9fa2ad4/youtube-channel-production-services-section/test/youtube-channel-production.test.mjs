import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { validateChannelSpec, selectNextTopic, nextReleaseSlot } from "../src/youtube-channel-production.mjs";

const FIXTURE_SPEC_PATH = fileURLToPath(new URL("./fixtures/channel-spec.json", import.meta.url));
async function loadSpec() { return JSON.parse(await readFile(FIXTURE_SPEC_PATH, "utf8")); }

test("validateChannelSpec accepts the fixture spec and freezes it", async () => {
  const spec = validateChannelSpec(await loadSpec());
  assert.equal(spec.id, "urn:ame:fixture-youtube-channel-enterprise");
  assert.ok(Object.isFrozen(spec));
  assert.deepEqual(spec.cadence.releaseWeekdays, ["Tuesday", "Thursday", "Saturday"]);
});

test("validateChannelSpec rejects a missing cadence", async () => {
  const spec = await loadSpec();
  delete spec.cadence;
  assert.throws(() => validateChannelSpec(spec), TypeError);
});

test("validateChannelSpec rejects an unrecognized timezone", async () => {
  const spec = await loadSpec();
  spec.timezone = "Not/A_Zone";
  assert.throws(() => validateChannelSpec(spec), /timezone/);
});

test("validateChannelSpec rejects a malformed youtubeChannelId", async () => {
  const spec = await loadSpec();
  spec.youtubeChannelId = "not-a-channel-id";
  assert.throws(() => validateChannelSpec(spec), /youtubeChannelId/);
});

test("validateChannelSpec accepts an optional titleSuffix and carries it through", async () => {
  const spec = await loadSpec();
  spec.titleSuffix = " | Fixture Channel";
  const validated = validateChannelSpec(spec);
  assert.equal(validated.titleSuffix, " | Fixture Channel");
});

test("validateChannelSpec omits titleSuffix when the spec supplies none", async () => {
  const validated = validateChannelSpec(await loadSpec());
  assert.equal(validated.titleSuffix, undefined);
});

test("validateChannelSpec rejects an empty titleSuffix", async () => {
  const spec = await loadSpec();
  spec.titleSuffix = "   ";
  assert.throws(() => validateChannelSpec(spec), /titleSuffix/);
});

function ledgerWith(entries) {
  return { screened: entries };
}

test("selectNextTopic picks the highest-scoring uncovered included candidate", async () => {
  const spec = await loadSpec();
  const ledger = ledgerWith([
    { dedupeKey: "doi:a", item: { title: "A" }, status: "included" },
    { dedupeKey: "doi:b", item: { title: "B" }, status: "included" },
    { dedupeKey: "doi:c", item: { title: "C" }, status: "excluded" },
  ]);
  const result = selectNextTopic(spec, { ledger, demand: { "doi:a": 1, "doi:b": 5 }, inventory: [], now: "2026-09-02T00:00:00.000Z" });
  assert.equal(result.chosen.dedupeKey, "doi:b");
  assert.equal(result.ranked.length, 2);
});

test("selectNextTopic skips candidates already in inventory", async () => {
  const spec = await loadSpec();
  const ledger = ledgerWith([
    { dedupeKey: "doi:a", item: { title: "A" }, status: "included" },
    { dedupeKey: "doi:b", item: { title: "B" }, status: "included" },
  ]);
  const result = selectNextTopic(spec, { ledger, demand: { "doi:a": 5, "doi:b": 1 }, inventory: [{ dedupeKey: "doi:a" }], now: "2026-09-02T00:00:00.000Z" });
  assert.equal(result.chosen.dedupeKey, "doi:b");
});

test("selectNextTopic throws when no eligible candidate remains", async () => {
  const spec = await loadSpec();
  const ledger = ledgerWith([{ dedupeKey: "doi:a", item: {}, status: "included" }]);
  assert.throws(() => selectNextTopic(spec, { ledger, inventory: [{ dedupeKey: "doi:a" }], now: "2026-09-02T00:00:00.000Z" }), TypeError);
});

test("nextReleaseSlot finds the earliest matching future weekday not already claimed", async () => {
  const spec = await loadSpec();
  // 2026-09-02 is a Wednesday; the fixture's weekdays are Tue/Thu/Sat, so the next slot is Thursday 2026-09-03.
  const slot = nextReleaseSlot(spec, [], "2026-09-02T12:00:00.000Z");
  assert.equal(slot.civilDay, "2026-09-03");
  assert.equal(new Date(slot.plannedPublishAt).getUTCHours(), 15);
});

test("nextReleaseSlot skips an already-claimed civil day", async () => {
  const spec = await loadSpec();
  const slot = nextReleaseSlot(spec, ["2026-09-03"], "2026-09-02T12:00:00.000Z");
  assert.equal(slot.civilDay, "2026-09-05");
});
