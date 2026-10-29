import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { publishChannelVideo, finishChannelVideo, readThumbnailNotEligible } from "../scripts/publish-video.mjs";

const spec = JSON.parse(await readFile(fileURLToPath(new URL("./fixtures/channel-spec.json", import.meta.url)), "utf8"));

const GRANTED_SCOPE = "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/yt-analytics.readonly";

function jsonResponse(body, { ok = true, status = 200, headers = {} } = {}) {
  return { ok, status, headers: { get: (key) => headers[key.toLowerCase()] ?? null }, text: async () => JSON.stringify(body), json: async () => body };
}

function fakeGoogleEnvironment({ processingStatus = "succeeded", grantedScope = GRANTED_SCOPE, thumbnailResponse } = {}) {
  const videoId = "abcdefghijk9";
  const uploadLocation = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status&upload_id=fake";
  let insertedStatus = null;
  let manuallyScheduled = false;
  const calls = [];
  const environment = { FIXTURE_OAUTH_CLIENT_ID: "id", FIXTURE_OAUTH_CLIENT_SECRET: "secret", FIXTURE_REFRESH_TOKEN: "refresh" };
  const fetchImpl = async (url, init = {}) => {
    const target = new URL(url);
    calls.push({ pathname: target.pathname, method: init.method ?? "GET" });
    if (target.href === "https://oauth2.googleapis.com/token") return jsonResponse({ access_token: "at-1", scope: grantedScope });
    if (target.pathname === "/youtube/v3/channels") return jsonResponse({ items: [{ id: spec.youtubeChannelId, snippet: { title: "Fixture Channel" } }] });
    if (target.pathname === "/upload/youtube/v3/videos" && init.method === "POST") {
      insertedStatus = JSON.parse(init.body).status;
      return jsonResponse({}, { headers: { location: uploadLocation } });
    }
    if (target.pathname === "/youtube/v3/videos" && init.method === "GET") {
      const status = manuallyScheduled
        ? { privacyStatus: "private", publishAt: "2026-09-05T15:00:00.000Z", uploadStatus: "processed", license: "youtube", embeddable: true, publicStatsViewable: true, selfDeclaredMadeForKids: false, containsSyntheticMedia: true }
        : { privacyStatus: insertedStatus?.privacyStatus ?? "private", publishAt: insertedStatus?.publishAt ?? null, uploadStatus: "processed", license: "youtube", embeddable: true, publicStatsViewable: true, selfDeclaredMadeForKids: false, containsSyntheticMedia: true };
      return jsonResponse({ items: [{ id: videoId, snippet: { channelId: spec.youtubeChannelId }, status, processingDetails: { processingStatus } }] });
    }
    if (target.pathname === "/youtube/v3/videos" && init.method === "PUT") {
      manuallyScheduled = true;
      return jsonResponse({ id: videoId, status: { privacyStatus: "private", publishAt: "2026-09-05T15:00:00.000Z" } });
    }
    if (target.pathname === "/upload/youtube/v3/thumbnails/set") return thumbnailResponse ? thumbnailResponse() : jsonResponse({ items: [{}] });
    throw new Error(`unhandled fake google request: ${init.method ?? "GET"} ${target.href}`);
  };
  const uploadFetch = async (url) => { assert.equal(url, uploadLocation); return jsonResponse({ id: videoId }); };
  return { fetchImpl, uploadFetch, environment, videoId, calls, insertedStatus: () => insertedStatus };
}

test("publishChannelVideo carries publishAt and privacyStatus in the insert body, never calls videos.update, and sets the thumbnail", async () => {
  const { fetchImpl, uploadFetch, environment, videoId, calls, insertedStatus } = fakeGoogleEnvironment();
  const receipt = await publishChannelVideo({
    spec, environment, fetchImpl, uploadFetch,
    videoBytes: Buffer.concat([Buffer.alloc(4), Buffer.from("ftyp"), Buffer.from("fake mp4")]),
    metadata: { title: "T", description: "D", tags: ["a"] },
    plannedPublishAt: "2026-09-05T15:00:00.000Z",
    thumbnailBytes: Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]),
    poll: { attempts: 3, intervalMs: 0, sleep: async () => {} },
  });
  assert.equal(insertedStatus().privacyStatus, "private");
  assert.equal(insertedStatus().publishAt, "2026-09-05T15:00:00.000Z");
  assert.equal(calls.some((call) => call.pathname === "/youtube/v3/videos" && call.method === "PUT"), false);
  assert.equal(receipt.youtubeVideoId, videoId);
  assert.equal(receipt.youtubeChannelId, spec.youtubeChannelId);
  assert.equal(receipt.privacyStatus, "private");
  assert.equal(receipt.publishAt, "2026-09-05T15:00:00.000Z");
  assert.equal(receipt.thumbnail.status, "set");
});

test("publishChannelVideo records a not-eligible thumbnail datum and still completes when thumbnails.set 403s for channel eligibility", async () => {
  const { fetchImpl, uploadFetch, environment, videoId } = fakeGoogleEnvironment({
    thumbnailResponse: () => jsonResponse(
      { error: { code: 403, message: "The authenticated user doesn't have permissions to upload and set custom video thumbnails.", errors: [{ message: "The authenticated user doesn't have permissions to upload and set custom video thumbnails.", domain: "youtube.thumbnail", reason: "forbidden" }] } },
      { ok: false, status: 403 },
    ),
  });
  const receipt = await publishChannelVideo({
    spec, environment, fetchImpl, uploadFetch,
    videoBytes: Buffer.concat([Buffer.alloc(4), Buffer.from("ftyp"), Buffer.from("fake mp4")]),
    metadata: { title: "T", description: "D", tags: ["a"] },
    plannedPublishAt: "2026-09-05T15:00:00.000Z",
    thumbnailBytes: Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]),
    poll: { attempts: 3, intervalMs: 0, sleep: async () => {} },
  });
  assert.equal(receipt.youtubeVideoId, videoId);
  assert.equal(receipt.publishAt, "2026-09-05T15:00:00.000Z");
  assert.deepEqual(receipt.thumbnail, { status: "not-eligible", reason: "The authenticated user doesn't have permissions to upload and set custom video thumbnails." });
});

test("publishChannelVideo still throws when thumbnails.set 500s", async () => {
  const { fetchImpl, uploadFetch, environment } = fakeGoogleEnvironment({
    thumbnailResponse: () => jsonResponse({ error: { code: 500, message: "Backend Error" } }, { ok: false, status: 500 }),
  });
  await assert.rejects(
    publishChannelVideo({
      spec, environment, fetchImpl, uploadFetch,
      videoBytes: Buffer.concat([Buffer.alloc(4), Buffer.from("ftyp"), Buffer.from("fake mp4")]),
      metadata: { title: "T", description: "D", tags: ["a"] },
      plannedPublishAt: "2026-09-05T15:00:00.000Z",
      thumbnailBytes: Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]),
      poll: { attempts: 3, intervalMs: 0, sleep: async () => {} },
    }),
    /thumbnails\.set 500/,
  );
});

test("readThumbnailNotEligible names the API message for a channel-eligibility 403 and returns null for any other status or reason", () => {
  assert.equal(
    readThumbnailNotEligible(new Error('thumbnails.set 403: {"error":{"message":"The authenticated user doesn\'t have permissions to upload and set custom video thumbnails."}}')),
    "The authenticated user doesn't have permissions to upload and set custom video thumbnails.",
  );
  assert.equal(readThumbnailNotEligible(new Error("thumbnails.set 500: {\"error\":{\"message\":\"Backend Error\"}}")), null);
  assert.equal(readThumbnailNotEligible(new Error('thumbnails.set 403: {"error":{"message":"insufficient permission"}}')), null);
  assert.equal(readThumbnailNotEligible(new Error("video x failed processing")), null);
});

test("publishChannelVideo throws when video processing fails", async () => {
  const { fetchImpl, uploadFetch, environment } = fakeGoogleEnvironment({ processingStatus: "failed" });
  await assert.rejects(
    publishChannelVideo({
      spec, environment, fetchImpl, uploadFetch,
      videoBytes: Buffer.concat([Buffer.alloc(4), Buffer.from("ftyp"), Buffer.from("fake mp4")]),
      metadata: { title: "T", description: "D", tags: ["a"] },
      plannedPublishAt: "2026-09-05T15:00:00.000Z",
      thumbnailBytes: Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]),
      poll: { attempts: 3, intervalMs: 0, sleep: async () => {} },
    }),
    /failed processing/,
  );
});

test("publishChannelVideo refuses a token that lacks the youtube.upload scope", async () => {
  const { fetchImpl, uploadFetch, environment } = fakeGoogleEnvironment({ grantedScope: "https://www.googleapis.com/auth/youtube.readonly" });
  await assert.rejects(
    publishChannelVideo({
      spec, environment, fetchImpl, uploadFetch,
      videoBytes: Buffer.concat([Buffer.alloc(4), Buffer.from("ftyp"), Buffer.from("fake mp4")]),
      metadata: { title: "T", description: "D", tags: ["a"] },
      plannedPublishAt: "2026-09-05T15:00:00.000Z",
      thumbnailBytes: Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]),
      poll: { attempts: 3, intervalMs: 0, sleep: async () => {} },
    }),
    /youtube\.upload/,
  );
});

test("finishChannelVideo skips upload and processing-wait, scheduling and setting the thumbnail for an already-processed video", async () => {
  const { fetchImpl, environment, videoId } = fakeGoogleEnvironment();
  const receipt = await finishChannelVideo({
    spec, environment, fetchImpl,
    videoId,
    plannedPublishAt: "2026-09-05T15:00:00.000Z",
    thumbnailBytes: Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]),
  });
  assert.equal(receipt.youtubeVideoId, videoId);
  assert.equal(receipt.youtubeChannelId, spec.youtubeChannelId);
  assert.equal(receipt.publishAt, "2026-09-05T15:00:00.000Z");
  assert.equal(receipt.privacyStatus, "private");
  assert.equal(receipt.thumbnail.status, "set");
});

test("finishChannelVideo refuses a video that has not finished processing", async () => {
  const { fetchImpl, environment, videoId } = fakeGoogleEnvironment({ processingStatus: "processing" });
  await assert.rejects(
    finishChannelVideo({
      spec, environment, fetchImpl,
      videoId,
      plannedPublishAt: "2026-09-05T15:00:00.000Z",
      thumbnailBytes: Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]),
    }),
    /not ready to finish/,
  );
});

test("publishChannelVideo refuses when a required OAuth secret is absent", async () => {
  const { fetchImpl, uploadFetch } = fakeGoogleEnvironment();
  await assert.rejects(
    publishChannelVideo({
      spec, environment: {}, fetchImpl, uploadFetch,
      videoBytes: Buffer.concat([Buffer.alloc(4), Buffer.from("ftyp"), Buffer.from("fake mp4")]),
      metadata: { title: "T", description: "D", tags: ["a"] },
      plannedPublishAt: "2026-09-05T15:00:00.000Z",
      thumbnailBytes: Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]),
    }),
    TypeError,
  );
});
