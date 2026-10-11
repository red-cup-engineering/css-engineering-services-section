import assert from "node:assert/strict";
import test from "node:test";
import { addVideoToPlaylist, buildAudienceAttentionQuery, buildVideoInsertBody, createPlaylist, fetchAudienceAttentionReport, observeAuthorizedChannel, observeVideo, schedulePrivateVideo, uploadVideo } from "../src/index.mjs";

test("analytics protocol forms only one bounded closed-window report", async () => {
  const query = buildAudienceAttentionQuery({ startDate: "2026-06-24", endDate: "2026-07-21" });
  let request;
  const response = await fetchAudienceAttentionReport({
    query,
    authorizedFetch: async (url, init) => {
      request = { url: new URL(url), init };
      return new Response(JSON.stringify({ columnHeaders: [], rows: [] }), { status: 200 });
    },
  });
  assert.deepEqual(response.rows, []);
  assert.equal(request.url.origin, "https://youtubeanalytics.googleapis.com");
  assert.equal(request.url.pathname, "/v2/reports");
  assert.equal(request.url.searchParams.get("ids"), "channel==MINE");
  assert.equal(request.url.searchParams.get("metrics"), "views,estimatedMinutesWatched,averageViewDuration");
  assert.equal(request.init.method, "GET");
  assert.equal(Object.keys(request.init.headers).some((name) => name.toLowerCase() === "authorization"), false);
  assert.throws(() => buildAudienceAttentionQuery({ startDate: "2026-07-22", endDate: "2026-07-21" }), /closed/u);
  assert.throws(() => buildAudienceAttentionQuery({ startDate: "2026-06-24", endDate: "2026-07-21", maxResults: 201 }), /200/u);
});

test("private drafts cannot accidentally schedule public release", () => {
  const body = buildVideoInsertBody({ metadata: { title: "Lesson", description: "A lesson", tags: ["math"] }, publishMode: "private-draft" });
  assert.equal(body.status.privacyStatus, "private");
  assert.equal("publishAt" in body.status, false);
  assert.throws(() => buildVideoInsertBody({ metadata: { title: "x", description: "y" }, publishMode: "private-draft", plannedPublishAt: "2096-01-01T00:00:00Z" }), /refuses plannedPublishAt/u);
});

test("scheduled publication is an explicit distinct request", () => {
  const body = buildVideoInsertBody({ metadata: { title: "Lesson", description: "A lesson" }, publishMode: "scheduled-public", plannedPublishAt: "2096-01-01T00:00:00Z" });
  assert.equal(body.status.publishAt, "2096-01-01T00:00:00.000Z");
});

test("authorized capability receives no credential data from the provider", async () => {
  const seen = [];
  const authorizedFetch = async (url, init) => {
    seen.push({ url, init });
    assert.equal(Object.keys(init.headers).some((name) => name.toLowerCase() === "authorization"), false);
    return new Response(JSON.stringify({ items: [{ id: "UC04l4oe3ZgkgM8H63Pvp9Kg", snippet: { title: "emsenn0" } }] }), { status: 200 });
  };
  assert.deepEqual(await observeAuthorizedChannel({ authorizedFetch }), { id: "UC04l4oe3ZgkgM8H63Pvp9Kg", title: "emsenn0" });
  assert.equal(seen.length, 1);
});

test("video observation returns bounded venue state without publication attestation", async () => {
  let request;
  const state = await observeVideo({ videoId: "abcDEF_1234", authorizedFetch: async (url, init) => {
    request = { url, init };
    return new Response(JSON.stringify({ items: [{ id: "abcDEF_1234", snippet: { channelId: "UC04l4oe3ZgkgM8H63Pvp9Kg", title: "A lesson", description: "A bounded lesson.", tags: ["math"], categoryId: "27", publishedAt: "2096-07-21T15:00:00Z" }, status: { privacyStatus: "public", uploadStatus: "processed" }, processingDetails: { processingStatus: "succeeded" } }] }), { status: 200 });
  } });
  assert.equal(state.privacyStatus, "public"); assert.equal(state.uploadStatus, "processed"); assert.equal(state.channelId, "UC04l4oe3ZgkgM8H63Pvp9Kg"); assert.equal(state.description, "A bounded lesson."); assert.deepEqual(state.tags, ["math"]); assert.equal(state.categoryId, "27");
  assert.match(request.url, /videos\?part=snippet%2Cstatus%2CprocessingDetails&id=abcDEF_1234/u);
  assert.equal(Object.keys(request.init.headers).some((name) => name.toLowerCase() === "authorization"), false);
});

test("video observation refuses missing, changed, or malformed venue identity", async () => {
  await assert.rejects(observeVideo({ videoId: "abcDEF_1234", authorizedFetch: async () => new Response(JSON.stringify({ items: [] }), { status: 200 }) }), /exact requested/u);
  await assert.rejects(observeVideo({ videoId: "abcDEF_1234", authorizedFetch: async () => new Response(JSON.stringify({ items: [{ id: "otherVID_1", snippet: { channelId: "UC04l4oe3ZgkgM8H63Pvp9Kg" }, status: { privacyStatus: "public", uploadStatus: "processed" } }] }), { status: 200 }) }), /exact requested/u);
});

test("resumable video upload validates the Google carrier and response", async () => {
  const bytes = Buffer.from("0000000000000000");
  const body = buildVideoInsertBody({ metadata: { title: "Lesson", description: "A lesson" }, publishMode: "private-draft" });
  const authorizedFetch = async (_url, init) => {
    assert.equal(init.method, "POST");
    return new Response("", { status: 200, headers: { location: "https://www.googleapis.com/upload/youtube/v3/videos?upload_id=one" } });
  };
  const result = await uploadVideo({ authorizedFetch, bytes, body, uploadFetch: async (url, init) => {
    assert.equal(url, "https://www.googleapis.com/upload/youtube/v3/videos?upload_id=one");
    assert.equal(init.method, "PUT");
    return new Response(JSON.stringify({ kind: "youtube#video", id: "abcDEF_1234" }), { status: 200 });
  } });
  assert.equal(result.videoId, "abcDEF_1234");
});

test("resumable upload refuses a foreign carrier", async () => {
  const body = buildVideoInsertBody({ metadata: { title: "Lesson", description: "A lesson" }, publishMode: "private-draft" });
  await assert.rejects(uploadVideo({
    authorizedFetch: async () => new Response("", { status: 200, headers: { location: "https://evil.example/upload/youtube/v3/videos?id=one" } }),
    uploadFetch: async () => { throw new Error("must not run"); }, bytes: Buffer.from("000000000000"), body,
  }), /unsafe resumable/u);
});

test("videos.update schedules only the exact processed private draft and preserves mutable status", async () => {
  const calls = [], publishAt = "2096-07-23T15:00:00.000Z", state = { privacyStatus: "private", uploadStatus: "processed", publishAt: null, license: "youtube", embeddable: true, publicStatsViewable: true, selfDeclaredMadeForKids: false, containsSyntheticMedia: true };
  const result = await schedulePrivateVideo({ videoId: "abcDEF_1234", publishAt, authorizedFetch: async (url, init) => { calls.push({ url, init }); if (init.method === "GET") return new Response(JSON.stringify({ items: [{ id: "abcDEF_1234", status: state, processingDetails: { processingStatus: "succeeded" } }] }), { status: 200 }); const body = JSON.parse(init.body); assert.deepEqual(body, { id: "abcDEF_1234", status: { privacyStatus: "private", publishAt, license: "youtube", embeddable: true, publicStatsViewable: true, selfDeclaredMadeForKids: false, containsSyntheticMedia: true } }); return new Response(JSON.stringify({ id: "abcDEF_1234", status: body.status }), { status: 200 }); } });
  assert.equal(result.publishAt, publishAt); assert.equal(calls[1].init.method, "PUT"); assert.match(calls[1].url, /videos\?part=status$/u);
});

test("videos.update refuses a previously scheduled or incompletely observed draft", async () => {
  const response = (status, processingStatus = "succeeded") => async () => new Response(JSON.stringify({ items: [{ id: "abcDEF_1234", status, processingDetails: { processingStatus } }] }), { status: 200 });
  const base = { privacyStatus: "private", uploadStatus: "processed", publishAt: null, license: "youtube", embeddable: true, publicStatsViewable: true, selfDeclaredMadeForKids: false, containsSyntheticMedia: true };
  await assert.rejects(schedulePrivateVideo({ videoId: "abcDEF_1234", publishAt: "2096-07-23T15:00:00Z", authorizedFetch: response({ ...base, publishAt: "2096-07-22T15:00:00Z" }) }), /never-scheduled/u);
  await assert.rejects(schedulePrivateVideo({ videoId: "abcDEF_1234", publishAt: "2096-07-23T15:00:00Z", authorizedFetch: response({ ...base, license: undefined }) }), /erase unobserved/u);
});

test("playlist operations preserve course order without claiming Course designation", async () => {
  const requests = [];
  const authorizedFetch = async (url, init) => {
    requests.push({ url, body: JSON.parse(init.body) });
    if (String(url).includes("playlistItems")) return new Response(JSON.stringify({ id: "PLI_item_123" }), { status: 200 });
    return new Response(JSON.stringify({ id: "PL_course_123" }), { status: 200 });
  };
  const playlist = await createPlaylist({ authorizedFetch, title: "Causality and Kinematic Space" });
  const item = await addVideoToPlaylist({ authorizedFetch, playlistId: playlist.playlistId, videoId: "abcDEF_1234", position: 0 });
  assert.equal(item.playlistItemId, "PLI_item_123");
  assert.equal(requests[1].body.snippet.position, 0);
});
