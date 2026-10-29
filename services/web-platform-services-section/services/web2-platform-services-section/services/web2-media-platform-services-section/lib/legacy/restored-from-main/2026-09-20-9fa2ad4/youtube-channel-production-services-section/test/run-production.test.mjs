import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runChannelProduction } from "../scripts/run-production.mjs";

const spec = JSON.parse(await readFile(fileURLToPath(new URL("./fixtures/channel-spec.json", import.meta.url)), "utf8"));
const activation = { youtubeWrites: "granted" };
const ledger = {
  screened: [
    { dedupeKey: "title:a-great-fixture-topic", item: { title: "A Great Fixture Topic", abstract: "An abstract for testing." }, status: "included" },
    { dedupeKey: "title:a-second-fixture-topic", item: { title: "A Second Fixture Topic", abstract: "A second abstract for testing." }, status: "included" },
  ],
};
const environment = { FIXTURE_OAUTH_CLIENT_ID: "id", FIXTURE_OAUTH_CLIENT_SECRET: "secret", FIXTURE_REFRESH_TOKEN: "refresh" };

function jsonResponse(body, { ok = true, headers = {} } = {}) {
  return { ok, headers: { get: (key) => headers[key.toLowerCase()] ?? null }, text: async () => JSON.stringify(body), json: async () => body };
}

const GRANTED_SCOPE = "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/yt-analytics.readonly";

function fakeGoogleFetch() {
  const videoId = "fixturevid1";
  const uploadLocation = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=fake";
  let insertedStatus = null;
  const fetchImpl = async (url, init = {}) => {
    const target = new URL(url);
    if (target.href === "https://oauth2.googleapis.com/token") return jsonResponse({ access_token: "at-1", scope: GRANTED_SCOPE });
    if (target.pathname === "/youtube/v3/channels") return jsonResponse({ items: [{ id: spec.youtubeChannelId, snippet: { title: "Fixture Channel" } }] });
    if (target.pathname === "/upload/youtube/v3/videos" && init.method === "POST") {
      insertedStatus = JSON.parse(init.body).status;
      return jsonResponse({}, { headers: { location: uploadLocation } });
    }
    if (target.pathname === "/youtube/v3/videos" && init.method === "GET") {
      return jsonResponse({ items: [{
        id: videoId, snippet: { channelId: spec.youtubeChannelId },
        status: { privacyStatus: insertedStatus?.privacyStatus ?? "private", publishAt: insertedStatus?.publishAt ?? null, uploadStatus: "processed", license: "youtube", embeddable: true, publicStatsViewable: true, selfDeclaredMadeForKids: false, containsSyntheticMedia: true },
        processingDetails: { processingStatus: "succeeded" },
      }] });
    }
    if (target.pathname === "/youtube/v3/videos" && init.method === "PUT") {
      throw new Error("videos.update must never be called on the run path");
    }
    if (target.pathname === "/upload/youtube/v3/thumbnails/set") return jsonResponse({ items: [{}] });
    throw new Error(`unhandled fake google request: ${init.method ?? "GET"} ${target.href}`);
  };
  const uploadFetch = async () => jsonResponse({ id: videoId });
  return { fetchImpl, uploadFetch, videoId };
}

function fakeGenerateExecute() {
  const text = [
    "TITLE: Fixture Video Title",
    "DESCRIPTION: A fixture description.",
    "TAGS: fixture, test",
    "",
    "### Segment 1: Intro",
    "LINES:",
    "- A line",
    "NARRATION: Narration text.",
  ].join("\n");
  return async () => ({ code: 0, stdout: JSON.stringify({ admitted: true, provider: "fake-provider", exchange: { completion: { text } } }) });
}

function fakeRenderExecute() {
  return async (command) => {
    if (command.program === "ffprobe") return { code: 0, stdout: "1.5" };
    const outputFile = command.args.at(-1);
    await writeFile(outputFile, Buffer.concat([Buffer.alloc(4), Buffer.from("ftyp"), Buffer.from("fake mp4 bytes")]));
    return { code: 0, stdout: "" };
  };
}

test("run-production dry run: plan -> acquire -> generate -> render -> thumbnail -> publish -> receipt", async () => {
  const dataRoot = await mkdtemp(join(tmpdir(), "run-production-data-"));
  const workRoot = await mkdtemp(join(tmpdir(), "run-production-work-"));
  try {
    const { fetchImpl, uploadFetch, videoId } = fakeGoogleFetch();
    const result = await runChannelProduction({
      spec, activation, ledger, dataRoot, workRoot, environment, fetchImpl, uploadFetch,
      generateExecute: fakeGenerateExecute(), renderExecute: fakeRenderExecute(),
      thumbnailGenerate: async () => { throw new Error("no generative provider in the dry run"); },
      now: "2026-09-02T00:00:00.000Z",
    });
    assert.equal(result.status, "published");
    assert.equal(result.plannedItem.dedupeKey, "title:a-great-fixture-topic");
    assert.equal(result.script.title, "Fixture Video Title");
    assert.equal(result.publicationReceipt.youtubeVideoId, videoId);
    assert.equal(result.thumbnail.provider, "deterministic-solid-branded-fallback");

    // Re-running against the same journal must plan the OTHER ledger topic:
    // the just-published dedupeKey is now in inventory and never re-chosen.
    const second = fakeGoogleFetch();
    const secondResult = await runChannelProduction({
      spec, activation, ledger, dataRoot, workRoot, environment, fetchImpl: second.fetchImpl, uploadFetch: second.uploadFetch,
      generateExecute: fakeGenerateExecute(), renderExecute: fakeRenderExecute(),
      thumbnailGenerate: async () => { throw new Error("no generative provider in the dry run"); },
      now: "2026-09-02T00:00:00.000Z",
    });
    assert.equal(secondResult.status, "published");
    assert.notEqual(secondResult.plannedItem.dedupeKey, result.plannedItem.dedupeKey);
    assert.equal(secondResult.plannedItem.dedupeKey, "title:a-second-fixture-topic");
  } finally {
    await rm(dataRoot, { recursive: true, force: true });
    await rm(workRoot, { recursive: true, force: true });
  }
});

test("run-production refuses when activation withholds writes", async () => {
  const dataRoot = await mkdtemp(join(tmpdir(), "run-production-data-"));
  const workRoot = await mkdtemp(join(tmpdir(), "run-production-work-"));
  try {
    await assert.rejects(
      runChannelProduction({ spec, activation: { youtubeWrites: "withheld" }, ledger, dataRoot, workRoot, environment }),
      /activation\.youtubeWrites/,
    );
  } finally {
    await rm(dataRoot, { recursive: true, force: true });
    await rm(workRoot, { recursive: true, force: true });
  }
});

test("run-production refuses when an OAuth secret is absent", async () => {
  const dataRoot = await mkdtemp(join(tmpdir(), "run-production-data-"));
  const workRoot = await mkdtemp(join(tmpdir(), "run-production-work-"));
  try {
    await assert.rejects(
      runChannelProduction({ spec, activation, ledger, dataRoot, workRoot, environment: {} }),
      TypeError,
    );
  } finally {
    await rm(dataRoot, { recursive: true, force: true });
    await rm(workRoot, { recursive: true, force: true });
  }
});
