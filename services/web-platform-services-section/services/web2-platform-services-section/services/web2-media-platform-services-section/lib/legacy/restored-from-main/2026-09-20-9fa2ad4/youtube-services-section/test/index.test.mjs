import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { addVideoToPlaylist, buildAudienceAttentionQuery, buildSearchVideosQuery, buildVideoInsertBody, collectAudienceAttentionAnalytics, createAudienceAttentionAuthorizedFetch, createPlaylist, defaultClosedAudienceAttentionWindow, demandSignal, fetchAudienceAttentionReport, normalizeAudienceAttentionReport, observeAuthorizedChannel, observeVideo, schedulePrivateVideo, searchVideos, uploadVideo, videoStatistics, YOUTUBE_PROTOCOL_LAW } from "../src/index.mjs";

// Recorded fixture: one search.list item shape, trimmed to the fields this
// service reads (https://developers.google.com/youtube/v3/docs/search/list).
const SEARCH_RESULT_FIXTURE = {
  kind: "youtube#searchResult",
  id: { kind: "youtube#video", videoId: "abcDEF_1234" },
  snippet: {
    publishedAt: "2026-07-21T15:00:00Z",
    channelTitle: "Causal Kinematics",
    title: "Why light cones matter",
  },
};

// Recorded fixture: one videos.list item shape with part=statistics,snippet
// (https://developers.google.com/youtube/v3/docs/videos/list).
const VIDEO_STATISTICS_FIXTURE = {
  kind: "youtube#video",
  id: "abcDEF_1234",
  snippet: { publishedAt: "2026-07-21T15:00:00Z", channelTitle: "Causal Kinematics", title: "Why light cones matter" },
  statistics: { viewCount: "12345", likeCount: "678", commentCount: "9" },
};

test("the credential-blind protocol law has the established canonical profile identity", () => {
  const profile = "google.youtube.data-api.v3.credential-blind-video-protocol.v1";
  assert.deepEqual(YOUTUBE_PROTOCOL_LAW, {
    id: `ni:///sha-256;${createHash("sha256").update(Buffer.from(profile, "utf8")).digest("base64url")}`,
    profile,
  });
  assert.equal(Object.isFrozen(YOUTUBE_PROTOCOL_LAW), true);
});

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

test("analytics admission normalizes the exact bounded carrier without owning channel policy", () => {
  const identify = (value) => `id:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
  const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
  const query = defaultClosedAudienceAttentionWindow(new Date("2026-07-22T23:00:00.000Z"));
  const report = { columnHeaders: [{ name: "video" }, { name: "views" }, { name: "estimatedMinutesWatched" }, { name: "averageViewDuration" }], rows: [["abcDEF_1234", "12", 34, 56]] };
  const result = normalizeAudienceAttentionReport({ report, query, observedAt: "2026-07-22T23:00:00.000Z", channel: "urn:channel:one", identify, digest });
  assert.deepEqual(query, { startDate: "2026-06-24", endDate: "2026-07-21" });
  assert.equal(result.rawReport.channel, "urn:channel:one");
  assert.deepEqual(result.observations[0].measures.map(({ value }) => value), [12, 34, 56]);
  assert.equal("carrier" in result.observations[0], false);
  assert.throws(() => normalizeAudienceAttentionReport({ report: { ...report, rows: [["bad", 1, 2, 3]] }, query, observedAt: "2026-07-22T23:00:00.000Z", channel: "urn:channel:one", identify, digest }), /malformed video row/u);
});

test("analytics authorization and journal orchestration preserve attenuation and replay", async () => {
  const query = buildAudienceAttentionQuery({ startDate: "2026-06-24", endDate: "2026-07-21" });
  const target = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
  for (const [key, value] of Object.entries(query)) target.searchParams.set(key, String(value));
  let calls = 0;
  const authorizedFetch = createAudienceAttentionAuthorizedFetch("token", async (_url, init) => {
    calls++;
    assert.equal(new Headers(init.headers).get("authorization"), "Bearer token");
    return new Response(JSON.stringify({ columnHeaders: [{ name: "video" }, { name: "views" }, { name: "estimatedMinutesWatched" }, { name: "averageViewDuration" }], rows: [["abcDEF_1234", 1, 2, 3]] }));
  });
  assert.throws(() => authorizedFetch("https://example.com/v2/reports"), /foreign or mutating/u);
  assert.throws(() => authorizedFetch(target, { headers: { authorization: "foreign" } }), /may not supply/u);
  const rows = [];
  const identify = (value) => `id:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
  let clockCalls = 0;
  const options = { activation: { analyticsCollection: "granted-read-only" }, window: query, authorizedFetch, clock: () => { clockCalls++; return "2026-07-22T23:00:00.000Z"; }, channel: "urn:channel:one", identify, digest: identify, rawCategory: "raw", observationCategory: "observation", queryRecords: async (category) => rows.filter((entry) => entry.category === category).map(({ record }) => record), createStore: () => ({ record: async (entry) => rows.push(entry) }) };
  const first = await collectAudienceAttentionAnalytics(options);
  const replay = await collectAudienceAttentionAnalytics(options);
  assert.equal(first.status, "observed");
  assert.equal(replay.status, "already-observed");
  assert.equal(replay.observations.length, 1);
  assert.equal(calls, 1);
  assert.equal(clockCalls, 1);
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

test("videos.update schedules a video whose observed status omits containsSyntheticMedia (the live API does not always echo it back)", async () => {
  const calls = [], publishAt = "2096-07-23T15:00:00.000Z", state = { privacyStatus: "private", uploadStatus: "processed", publishAt: null, license: "youtube", embeddable: true, publicStatsViewable: true, madeForKids: false, selfDeclaredMadeForKids: false };
  const result = await schedulePrivateVideo({ videoId: "abcDEF_1234", publishAt, authorizedFetch: async (url, init) => { calls.push({ url, init }); if (init.method === "GET") return new Response(JSON.stringify({ items: [{ id: "abcDEF_1234", status: state, processingDetails: { processingStatus: "succeeded" } }] }), { status: 200 }); const body = JSON.parse(init.body); assert.deepEqual(body, { id: "abcDEF_1234", status: { privacyStatus: "private", publishAt, license: "youtube", embeddable: true, publicStatsViewable: true, selfDeclaredMadeForKids: false } }); return new Response(JSON.stringify({ id: "abcDEF_1234", status: body.status }), { status: 200 }); } });
  assert.equal(result.publishAt, publishAt);
  assert.equal("containsSyntheticMedia" in JSON.parse(calls[1].init.body).status, false);
});

test("videos.update refuses a previously scheduled or incompletely observed draft", async () => {
  const response = (status, processingStatus = "succeeded") => async () => new Response(JSON.stringify({ items: [{ id: "abcDEF_1234", status, processingDetails: { processingStatus } }] }), { status: 200 });
  const base = { privacyStatus: "private", uploadStatus: "processed", publishAt: null, license: "youtube", embeddable: true, publicStatsViewable: true, selfDeclaredMadeForKids: false, containsSyntheticMedia: true };
  await assert.rejects(schedulePrivateVideo({ videoId: "abcDEF_1234", publishAt: "2096-07-23T15:00:00Z", authorizedFetch: response({ ...base, publishAt: "2096-07-22T15:00:00Z" }) }), /never-scheduled/u);
  await assert.rejects(schedulePrivateVideo({ videoId: "abcDEF_1234", publishAt: "2096-07-23T15:00:00Z", authorizedFetch: response({ ...base, license: undefined }) }), /erase unobserved/u);
});

test("search demand query is bounded and rejects malformed input", () => {
  const admitted = buildSearchVideosQuery({ query: "kinematic causality", maxResults: 10, publishedAfter: "2026-07-01T00:00:00Z" });
  assert.deepEqual(admitted, { part: "snippet", type: "video", q: "kinematic causality", maxResults: 10, order: "relevance", publishedAfter: "2026-07-01T00:00:00.000Z" });
  assert.throws(() => buildSearchVideosQuery({ query: "  " }), /nonempty query/u);
  assert.throws(() => buildSearchVideosQuery({ query: "x", maxResults: 51 }), /1 through 50/u);
  assert.throws(() => buildSearchVideosQuery({ query: "x", publishedAfter: "not-a-date" }), /valid instant/u);
});

test("searchVideos issues one bounded search.list call and normalizes to demand records", async () => {
  let request;
  const records = await searchVideos({
    query: "kinematic causality", maxResults: 5,
    authorizedFetch: async (url, init) => {
      request = { url: new URL(url), init };
      return new Response(JSON.stringify({ items: [SEARCH_RESULT_FIXTURE] }), { status: 200 });
    },
  });
  assert.equal(request.url.pathname, "/youtube/v3/search");
  assert.equal(request.url.searchParams.get("q"), "kinematic causality");
  assert.equal(request.url.searchParams.get("type"), "video");
  assert.equal(Object.keys(request.init.headers).some((name) => name.toLowerCase() === "authorization"), false);
  assert.deepEqual(records, [{
    videoId: "abcDEF_1234", title: "Why light cones matter", channelTitle: "Causal Kinematics",
    publishedAt: "2026-07-21T15:00:00.000Z", viewCount: null, likeCount: null, commentCount: null,
  }]);
});

test("searchVideos refuses a malformed or unbounded response", async () => {
  await assert.rejects(searchVideos({ query: "x", authorizedFetch: async () => new Response(JSON.stringify({ items: [{ id: {}, snippet: {} }] }), { status: 200 }) }), /no valid video ID/u);
  await assert.rejects(searchVideos({ query: "x", maxResults: 1, authorizedFetch: async () => new Response(JSON.stringify({ items: [SEARCH_RESULT_FIXTURE, SEARCH_RESULT_FIXTURE] }), { status: 200 }) }), /exceeds the requested bound/u);
});

test("videoStatistics issues one bounded videos.list call and normalizes counts to numbers", async () => {
  let request;
  const records = await videoStatistics({
    videoIds: ["abcDEF_1234"],
    authorizedFetch: async (url, init) => {
      request = { url: new URL(url), init };
      return new Response(JSON.stringify({ items: [VIDEO_STATISTICS_FIXTURE] }), { status: 200 });
    },
  });
  assert.equal(request.url.pathname, "/youtube/v3/videos");
  assert.equal(request.url.searchParams.get("part"), "statistics,snippet");
  assert.equal(request.url.searchParams.get("id"), "abcDEF_1234");
  assert.equal(Object.keys(request.init.headers).some((name) => name.toLowerCase() === "authorization"), false);
  assert.deepEqual(records, [{
    videoId: "abcDEF_1234", title: "Why light cones matter", channelTitle: "Causal Kinematics",
    publishedAt: "2026-07-21T15:00:00.000Z", viewCount: 12345, likeCount: 678, commentCount: 9,
  }]);
});

test("videoStatistics rejects an out-of-bound ID list and a malformed response", async () => {
  const unusedAuthorizedFetch = async () => { throw new Error("must not run"); };
  await assert.rejects(videoStatistics({ videoIds: [], authorizedFetch: unusedAuthorizedFetch }), /1 through 50/u);
  await assert.rejects(videoStatistics({ videoIds: Array.from({ length: 51 }, (_, index) => `abcDEF_${String(index).padStart(4, "0")}`), authorizedFetch: unusedAuthorizedFetch }), /1 through 50/u);
  await assert.rejects(videoStatistics({ videoIds: ["abcDEF_1234"], authorizedFetch: async () => new Response(JSON.stringify({ items: [{ ...VIDEO_STATISTICS_FIXTURE, statistics: { viewCount: "-1" } }] }), { status: 200 }) }), /invalid statistics count/u);
});

test("demandSignal is a pure aggregation over records, tolerating untagged and mixed-source rows", () => {
  const records = [
    { query: "kinematic causality", channelTitle: "Causal Kinematics", viewCount: 100 },
    { query: "kinematic causality", channelTitle: "Causal Kinematics", viewCount: 300 },
    { query: "light cones", channelTitle: "Other Channel", viewCount: 200 },
    { channelTitle: "Causal Kinematics", viewCount: null },
  ];
  assert.deepEqual(demandSignal(records), {
    queries: ["kinematic causality", "light cones"],
    medianViews: 200,
    topChannels: [{ channelTitle: "Causal Kinematics", count: 3 }, { channelTitle: "Other Channel", count: 1 }],
    sampleSize: 4,
  });
  assert.deepEqual(demandSignal([]), { queries: [], medianViews: null, topChannels: [], sampleSize: 0 });
  assert.throws(() => demandSignal("not-an-array"), /array of video records/u);
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
