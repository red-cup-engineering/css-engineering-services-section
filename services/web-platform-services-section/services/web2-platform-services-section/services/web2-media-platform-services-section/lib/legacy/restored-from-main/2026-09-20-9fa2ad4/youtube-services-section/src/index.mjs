import { createHash } from "node:crypto";

const API_ORIGIN = "https://www.googleapis.com";
const VIDEO_INSERT = `${API_ORIGIN}/upload/youtube/v3/videos?uploadType=resumable&part=snippet%2Cstatus`;
const CHANNEL_MINE = `${API_ORIGIN}/youtube/v3/channels?part=id%2Csnippet&mine=true`;
const SEARCH_LIST = `${API_ORIGIN}/youtube/v3/search`;
const VIDEOS_LIST = `${API_ORIGIN}/youtube/v3/videos`;
const SEARCH_VIDEO_IDS_MAX = 50;
const MAX_JSON_BYTES = 1_000_000;
const ANALYTICS_REPORT = "https://youtubeanalytics.googleapis.com/v2/reports";
export const YOUTUBE_ANALYTICS_METRICS = Object.freeze(["views", "estimatedMinutesWatched", "averageViewDuration"]);
const YOUTUBE_ANALYTICS_QUERY_KEYS = new Set(["ids", "startDate", "endDate", "metrics", "dimensions", "sort", "maxResults"]);
const YOUTUBE_ANALYTICS_COLUMNS = Object.freeze(["video", ...YOUTUBE_ANALYTICS_METRICS]);
const YOUTUBE_PROTOCOL_PROFILE = "google.youtube.data-api.v3.credential-blind-video-protocol.v1";
export const YOUTUBE_PROTOCOL_LAW = Object.freeze({
  id: `ni:///sha-256;${createHash("sha256").update(Buffer.from(YOUTUBE_PROTOCOL_PROFILE, "utf8")).digest("base64url")}`,
  profile: YOUTUBE_PROTOCOL_PROFILE,
});

function capability(value) {
  if (typeof value !== "function") throw new TypeError("YouTube protocol operation requires an attenuated authorizedFetch capability");
  return value;
}

function noAuthorization(headers = {}) {
  const names = headers instanceof Headers ? [...headers.keys()] : Object.keys(headers);
  if (names.some((name) => name.toLowerCase() === "authorization")) {
    throw new TypeError("authorization must be added by the customer capability, not supplied to the provider");
  }
}

function civilDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/u.test(value ?? "") && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`));
}

export function buildAudienceAttentionQuery({ startDate, endDate, maxResults = 200 } = {}) {
  if (!civilDate(startDate) || !civilDate(endDate) || startDate > endDate) throw new TypeError("analytics query requires a closed civil-date window");
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 200) throw new TypeError("analytics query maxResults must be an integer from 1 through 200");
  return {
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics: YOUTUBE_ANALYTICS_METRICS.join(","),
    dimensions: "video",
    sort: "-estimatedMinutesWatched",
    maxResults,
  };
}

export function defaultClosedAudienceAttentionWindow(now = new Date()) {
  const through = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const from = new Date(through);
  from.setUTCDate(from.getUTCDate() - 27);
  return { startDate: from.toISOString().slice(0, 10), endDate: through.toISOString().slice(0, 10) };
}

export function createAudienceAttentionAuthorizedFetch(token, fetchImpl = fetch) {
  if (typeof token !== "string" || !token) throw new TypeError("analytics capability requires a token");
  return (url, init = {}) => {
    const target = new URL(url);
    const method = String(init.method ?? "GET").toUpperCase();
    if (target.origin !== "https://youtubeanalytics.googleapis.com" || target.pathname !== "/v2/reports" || method !== "GET" || target.username || target.password) throw new TypeError("analytics capability refuses foreign or mutating carrier");
    if ([...target.searchParams.keys()].some((key) => !YOUTUBE_ANALYTICS_QUERY_KEYS.has(key)) || target.searchParams.get("ids") !== "channel==MINE" || target.searchParams.get("dimensions") !== "video" || target.searchParams.get("metrics") !== YOUTUBE_ANALYTICS_METRICS.join(",")) throw new TypeError("analytics capability refuses an unattenuated query");
    const headers = new Headers(init.headers);
    if (headers.has("authorization")) throw new TypeError("caller may not supply authorization");
    headers.set("authorization", `Bearer ${token}`);
    return fetchImpl(target.href, { ...init, method: "GET", redirect: "error", headers });
  };
}

function audienceAttentionCarrier(report, maximum) {
  const headers = report?.columnHeaders;
  const rows = report?.rows ?? [];
  if (!Array.isArray(headers) || headers.map((entry) => entry?.name).join("\u0000") !== YOUTUBE_ANALYTICS_COLUMNS.join("\u0000")) throw new TypeError("analytics response columns changed");
  if (!Array.isArray(rows) || rows.length > maximum) throw new TypeError("analytics response exceeds the row bound");
  return {
    columnHeaders: headers.map(({ name, columnType, dataType }) => ({ name, columnType, dataType })),
    rows: rows.map((row) => {
      if (!Array.isArray(row) || row.length !== 4 || !/^[A-Za-z0-9_-]{11}$/u.test(row[0] ?? "")) throw new TypeError("analytics response contains malformed video row");
      const values = row.slice(1).map(Number);
      if (values.some((value) => !Number.isFinite(value) || value < 0)) throw new TypeError("analytics response contains invalid measure");
      return [row[0], ...values];
    }),
  };
}

export function normalizeAudienceAttentionReport({ report, query, observedAt, channel, identify, digest, legalPrincipal = "emsenn" } = {}) {
  if (typeof channel !== "string" || !channel || typeof identify !== "function" || typeof digest !== "function") throw new TypeError("analytics normalization requires channel identity operations");
  const admitted = buildAudienceAttentionQuery(query);
  const exactCarrier = audienceAttentionCarrier(report, admitted.maxResults);
  const sourceDataDigest = digest(exactCarrier);
  const queryIdentity = identify({ type: "YouTubeAnalyticsClosedQuery", channel, query: admitted });
  const rawBody = { type: "YouTubeAnalyticsRawReport", channel, legalPrincipal, source: "YouTubeAnalyticsAPI", queryIdentity, query: admitted, sourceDataDigest, carrier: exactCarrier, custody: "channel-only-no-egress", observedAt };
  const rawReport = { id: identify(rawBody), ...rawBody };
  const observations = exactCarrier.rows.map(([youtubeVideoId, views, estimatedMinutesWatched, averageViewDuration]) => {
    const body = { type: "AudienceAttentionObservation", channel, legalPrincipal, source: "YouTubeAnalyticsAPI", window: { from: admitted.startDate, through: admitted.endDate }, sourceDataDigest, subject: { type: "YouTubeVideo", youtubeVideoId }, dimensions: ["video"], measures: [{ name: "views", value: views }, { name: "estimatedMinutesWatched", value: estimatedMinutesWatched }, { name: "averageViewDurationSeconds", value: averageViewDuration }], method: "Exact admitted per-video YouTube Analytics row; no outside join or advanced derived metric.", limitations: ["YouTube may revise the window.", "Attention does not establish comprehension, causation, or research truth."], rawReport: rawReport.id, rawDataHeldByChannel: true, platformPolicyStatus: "processing-permitted-for-exact-contract", observedAt };
    return { id: identify(body), ...body };
  });
  return { rawReport, observations };
}

export async function collectAudienceAttentionAnalytics({ activation, window, now = new Date(), authorizedFetch, at, clock = () => new Date().toISOString(), channel, identify, digest, rawCategory, observationCategory, queryRecords, store, createStore } = {}) {
  if (activation?.analyticsCollection !== "granted-read-only") throw new TypeError("analytics collection is not active");
  if (typeof queryRecords !== "function" || (!store && typeof createStore !== "function")) throw new TypeError("analytics collection requires journal capabilities");
  const query = buildAudienceAttentionQuery(window ?? defaultClosedAudienceAttentionWindow(now));
  const queryIdentity = identify({ type: "YouTubeAnalyticsClosedQuery", channel, query });
  const prior = (await queryRecords(rawCategory)).find((row) => row.queryIdentity === queryIdentity);
  if (prior) return { status: "already-observed", rawReport: prior, observations: (await queryRecords(observationCategory)).filter((row) => row.rawReport === prior.id) };
  const report = await fetchAudienceAttentionReport({ authorizedFetch, query });
  const observedAt = at ?? clock();
  const result = normalizeAudienceAttentionReport({ report, query, observedAt, channel, identify, digest });
  const journal = store ?? createStore();
  await journal.record({ category: rawCategory, recordedAt: observedAt, record: { ...result.rawReport } });
  for (const row of result.observations) await journal.record({ category: observationCategory, recordedAt: observedAt, record: { ...row } });
  return { status: "observed", ...result };
}

async function json(res, operation) {
  const text = await res.text();
  if (Buffer.byteLength(text) > MAX_JSON_BYTES) throw new TypeError(`${operation} response exceeds the bounded JSON limit`);
  if (!res.ok) throw new Error(`${operation} ${res.status}: ${text.slice(0, 300)}`);
  try { return JSON.parse(text); } catch { throw new TypeError(`${operation} returned malformed JSON`); }
}

export async function fetchAudienceAttentionReport({ authorizedFetch, query } = {}) {
  const call = capability(authorizedFetch);
  const admitted = buildAudienceAttentionQuery(query);
  const target = new URL(ANALYTICS_REPORT);
  for (const [key, value] of Object.entries(admitted)) target.searchParams.set(key, String(value));
  const init = { method: "GET", headers: { accept: "application/json" }, redirect: "error" };
  noAuthorization(init.headers);
  return json(await call(target.href, init), "reports.query");
}

function videoId(value) {
  if (!/^[A-Za-z0-9_-]{6,64}$/u.test(value ?? "")) throw new TypeError("YouTube response has no valid video ID");
  return value;
}

function playlistId(value) {
  if (!/^[A-Za-z0-9_-]{8,128}$/u.test(value ?? "")) throw new TypeError("YouTube response has no valid playlist ID");
  return value;
}

export function buildVideoInsertBody({ metadata, publishMode, plannedPublishAt, categoryId = "27", selfDeclaredMadeForKids = false, containsSyntheticMedia = true } = {}) {
  if (!metadata || typeof metadata.title !== "string" || !metadata.title.trim() || typeof metadata.description !== "string") {
    throw new TypeError("video insertion requires nonempty title and string description");
  }
  if (!/^\d{1,3}$/u.test(categoryId)) throw new TypeError("video categoryId must be numeric text");
  if (typeof selfDeclaredMadeForKids !== "boolean" || typeof containsSyntheticMedia !== "boolean") {
    throw new TypeError("video audience and synthetic-media declarations must be explicit booleans");
  }
  if (!['private-draft', 'scheduled-public'].includes(publishMode)) throw new TypeError("publishMode must be private-draft or scheduled-public");
  if (publishMode === "scheduled-public" && !Number.isFinite(Date.parse(plannedPublishAt ?? ""))) {
    throw new TypeError("scheduled-public mode requires an exact plannedPublishAt instant");
  }
  if (publishMode === "private-draft" && plannedPublishAt !== undefined && plannedPublishAt !== null) {
    throw new TypeError("private-draft mode refuses plannedPublishAt");
  }
  const status = { privacyStatus: "private", selfDeclaredMadeForKids, containsSyntheticMedia };
  if (publishMode === "scheduled-public") status.publishAt = new Date(plannedPublishAt).toISOString();
  return {
    snippet: {
      title: metadata.title.slice(0, 100), description: metadata.description.slice(0, 5000),
      tags: Array.isArray(metadata.tags) ? metadata.tags.map(String).slice(0, 30) : [], categoryId,
    },
    status,
  };
}

export async function observeAuthorizedChannel({ authorizedFetch } = {}) {
  const call = capability(authorizedFetch);
  const init = { method: "GET", headers: { accept: "application/json" }, redirect: "error" };
  noAuthorization(init.headers);
  const payload = await json(await call(CHANNEL_MINE, init), "channels.list");
  if (!Array.isArray(payload.items) || payload.items.length !== 1 || typeof payload.items[0]?.id !== "string") {
    throw new TypeError(`channels.list returned ${Array.isArray(payload.items) ? payload.items.length : 0} identities; exactly one is required`);
  }
  return { id: payload.items[0].id, title: String(payload.items[0]?.snippet?.title ?? "") };
}

export async function observeVideo({ authorizedFetch, videoId: id } = {}) {
  const call = capability(authorizedFetch); videoId(id);
  const url = `${API_ORIGIN}/youtube/v3/videos?part=snippet%2Cstatus%2CprocessingDetails&id=${encodeURIComponent(id)}`;
  const init = { method: "GET", headers: { accept: "application/json" }, redirect: "error" };
  noAuthorization(init.headers);
  const payload = await json(await call(url, init), "videos.list");
  if (!Array.isArray(payload.items) || payload.items.length !== 1 || payload.items[0]?.id !== id) {
    throw new TypeError(`videos.list did not return the exact requested video ${id}`);
  }
  const item = payload.items[0], channelId = item?.snippet?.channelId;
  if (!/^UC[A-Za-z0-9_-]{20,}$/u.test(channelId ?? "")) throw new TypeError("videos.list returned no valid channel ID");
  const privacyStatus = item?.status?.privacyStatus, uploadStatus = item?.status?.uploadStatus;
  if (!["private", "unlisted", "public"].includes(privacyStatus)) throw new TypeError("videos.list returned no valid privacy status");
  if (!["deleted", "failed", "processed", "rejected", "uploaded"].includes(uploadStatus)) throw new TypeError("videos.list returned no valid upload status");
  const processingStatus = item?.processingDetails?.processingStatus ?? null;
  if (processingStatus !== null && !["failed", "processing", "succeeded", "terminated"].includes(processingStatus)) throw new TypeError("videos.list returned no valid processing status");
  const publishedAt = item?.snippet?.publishedAt ?? null, publishAt = item?.status?.publishAt ?? null, description = String(item?.snippet?.description ?? ""), tags = Array.isArray(item?.snippet?.tags) ? item.snippet.tags.map(String) : [], categoryId = item?.snippet?.categoryId == null ? null : String(item.snippet.categoryId);
  if (publishedAt !== null && !Number.isFinite(Date.parse(publishedAt))) throw new TypeError("videos.list returned malformed publishedAt");
  if (publishAt !== null && !Number.isFinite(Date.parse(publishAt))) throw new TypeError("videos.list returned malformed publishAt");
  if (Buffer.byteLength(description) > 20_000 || tags.length > 500 || tags.some((tag) => Buffer.byteLength(tag) > 1_000) || (categoryId !== null && !/^\d{1,3}$/u.test(categoryId))) throw new TypeError("videos.list returned unbounded or malformed snippet metadata");
  return {
    videoId: id, channelId, title: String(item?.snippet?.title ?? ""), description, tags, categoryId,
    privacyStatus, uploadStatus, processingStatus,
    publishedAt: publishedAt === null ? null : new Date(publishedAt).toISOString(),
    publishAt: publishAt === null ? null : new Date(publishAt).toISOString(),
  };
}

export async function schedulePrivateVideo({ authorizedFetch, videoId: id, publishAt } = {}) {
  const call = capability(authorizedFetch); videoId(id);
  if (!Number.isFinite(Date.parse(publishAt ?? ""))) throw new TypeError("videos.update scheduling requires a finite publishAt");
  const exactPublishAt = new Date(publishAt).toISOString();
  const listUrl = `${API_ORIGIN}/youtube/v3/videos?part=snippet%2Cstatus%2CprocessingDetails&id=${encodeURIComponent(id)}`;
  const observed = await json(await call(listUrl, { method: "GET", headers: { accept: "application/json" }, redirect: "error" }), "videos.list before update");
  if (!Array.isArray(observed.items) || observed.items.length !== 1 || observed.items[0]?.id !== id) throw new TypeError("videos.update precondition did not resolve the exact video");
  const item = observed.items[0], current = item.status, processing = item.processingDetails?.processingStatus;
  if (current?.privacyStatus !== "private" || current.publishAt != null || current.uploadStatus !== "processed" || processing !== "succeeded") throw new TypeError("videos.update scheduling requires one processed, never-scheduled private video");
  if (typeof current.license !== "string" || typeof current.embeddable !== "boolean" || typeof current.publicStatsViewable !== "boolean" || typeof current.selfDeclaredMadeForKids !== "boolean") throw new TypeError("videos.update scheduling refuses to erase unobserved mutable status properties");
  const status = { privacyStatus: "private", publishAt: exactPublishAt, license: current.license, embeddable: current.embeddable, publicStatsViewable: current.publicStatsViewable, selfDeclaredMadeForKids: current.selfDeclaredMadeForKids };
  if (typeof current.containsSyntheticMedia === "boolean") status.containsSyntheticMedia = current.containsSyntheticMedia;
  const init = { method: "PUT", redirect: "error", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status }) }; noAuthorization(init.headers);
  const updated = await json(await call(`${API_ORIGIN}/youtube/v3/videos?part=status`, init), "videos.update");
  if (updated?.id !== id || updated.status?.privacyStatus !== "private" || !Number.isFinite(Date.parse(updated.status?.publishAt ?? "")) || new Date(updated.status.publishAt).toISOString() !== exactPublishAt) throw new TypeError("videos.update did not retain the exact private schedule");
  return { videoId: id, privacyStatus: "private", publishAt: exactPublishAt, response: updated };
}

function safeUploadLocation(value) {
  let url;
  try { url = new URL(value); } catch { throw new TypeError("videos.insert returned a malformed resumable upload location"); }
  if (url.protocol !== "https:" || url.hostname !== "www.googleapis.com" || url.username || url.password || !url.pathname.startsWith("/upload/youtube/v3/videos")) {
    throw new TypeError("videos.insert returned an unsafe resumable upload location");
  }
  return url.href;
}

export async function uploadVideo({ authorizedFetch, uploadFetch = fetch, bytes, body, mediaType = "video/mp4" } = {}) {
  const call = capability(authorizedFetch);
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 12) throw new TypeError("video upload requires bounded nonempty bytes");
  if (mediaType !== "video/mp4") throw new TypeError("this YouTube service admits video/mp4 only");
  if (!body?.snippet || body?.status?.privacyStatus !== "private") throw new TypeError("video upload requires a validated private insertion body");
  const startInit = {
    method: "POST", redirect: "error",
    headers: {
      "content-type": "application/json", "x-upload-content-type": mediaType,
      "x-upload-content-length": String(bytes.byteLength),
    },
    body: JSON.stringify(body),
  };
  noAuthorization(startInit.headers);
  const start = await call(VIDEO_INSERT, startInit);
  if (!start.ok) throw new Error(`videos.insert start ${start.status}: ${(await start.text()).slice(0, 300)}`);
  const location = safeUploadLocation(start.headers.get("location"));
  const uploaded = await uploadFetch(location, {
    method: "PUT", redirect: "error",
    headers: { "content-type": mediaType, "content-length": String(bytes.byteLength) }, body: bytes,
  });
  const payload = await json(uploaded, "videos.insert upload");
  return { videoId: videoId(payload.id), response: payload };
}

export async function setThumbnail({ authorizedFetch, videoId: id, bytes, mediaType = "image/png" } = {}) {
  const call = capability(authorizedFetch); videoId(id);
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 8) throw new TypeError("thumbnail operation requires nonempty bytes");
  if (!['image/png', 'image/jpeg'].includes(mediaType)) throw new TypeError("thumbnail media type must be image/png or image/jpeg");
  const url = `${API_ORIGIN}/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(id)}`;
  const init = { method: "POST", redirect: "error", headers: { "content-type": mediaType }, body: bytes };
  noAuthorization(init.headers);
  return json(await call(url, init), "thumbnails.set");
}

export async function createPlaylist({ authorizedFetch, title, description = "", privacyStatus = "private" } = {}) {
  const call = capability(authorizedFetch);
  if (typeof title !== "string" || !title.trim()) throw new TypeError("playlist creation requires a title");
  if (!['private', 'unlisted', 'public'].includes(privacyStatus)) throw new TypeError("playlist privacy is invalid");
  const init = {
    method: "POST", redirect: "error", headers: { "content-type": "application/json" },
    body: JSON.stringify({ snippet: { title: title.slice(0, 150), description: String(description).slice(0, 5000) }, status: { privacyStatus } }),
  };
  noAuthorization(init.headers);
  const payload = await json(await call(`${API_ORIGIN}/youtube/v3/playlists?part=snippet%2Cstatus`, init), "playlists.insert");
  return { playlistId: playlistId(payload.id), response: payload };
}

export async function addVideoToPlaylist({ authorizedFetch, playlistId: listId, videoId: id, position } = {}) {
  const call = capability(authorizedFetch); playlistId(listId); videoId(id);
  if (position !== undefined && (!Number.isInteger(position) || position < 0)) throw new TypeError("playlist position must be a nonnegative integer");
  const snippet = { playlistId: listId, resourceId: { kind: "youtube#video", videoId: id } };
  if (position !== undefined) snippet.position = position;
  const init = { method: "POST", redirect: "error", headers: { "content-type": "application/json" }, body: JSON.stringify({ snippet }) };
  noAuthorization(init.headers);
  const payload = await json(await call(`${API_ORIGIN}/youtube/v3/playlistItems?part=snippet`, init), "playlistItems.insert");
  if (!/^[A-Za-z0-9_-]{8,128}$/u.test(payload.id ?? "")) throw new TypeError("playlistItems.insert returned no valid item ID");
  return { playlistItemId: payload.id, response: payload };
}

/**
 * Builds the bounded search.list query for one public keyword demand search.
 * @param {object} params
 * @param {string} params.query - nonempty keyword search text (the `q` parameter)
 * @param {number} [params.maxResults=25] - result page size, 1 through 50
 * @param {string} [params.publishedAfter] - RFC3339 instant lower bound on publish time
 * @returns {{part:"snippet",type:"video",q:string,maxResults:number,order:"relevance",publishedAfter?:string}}
 * @throws {TypeError} if query is empty, maxResults is out of 1-50, or publishedAfter is not a finite instant
 */
export function buildSearchVideosQuery({ query, maxResults = 25, publishedAfter } = {}) {
  if (typeof query !== "string" || !query.trim()) throw new TypeError("search requires nonempty query text");
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 50) throw new TypeError("search maxResults must be an integer from 1 through 50");
  const admitted = { part: "snippet", type: "video", q: query.trim().slice(0, 500), maxResults, order: "relevance" };
  if (publishedAfter !== undefined) {
    if (!Number.isFinite(Date.parse(publishedAfter))) throw new TypeError("search publishedAfter must be a valid instant");
    admitted.publishedAfter = new Date(publishedAfter).toISOString();
  }
  return admitted;
}

function normalizeSearchResultItem(item) {
  const id = item?.id?.videoId;
  if (!/^[A-Za-z0-9_-]{6,64}$/u.test(id ?? "")) throw new TypeError("search.list returned no valid video ID");
  const snippet = item?.snippet ?? {};
  const publishedAt = snippet.publishedAt;
  if (!Number.isFinite(Date.parse(publishedAt ?? ""))) throw new TypeError("search.list returned no valid publishedAt");
  return {
    videoId: id,
    title: String(snippet.title ?? ""),
    channelTitle: String(snippet.channelTitle ?? ""),
    publishedAt: new Date(publishedAt).toISOString(),
    viewCount: null,
    likeCount: null,
    commentCount: null,
  };
}

/**
 * Runs one bounded YouTube search.list keyword search, credential-blind.
 *
 * Quota cost: search.list costs 100 units per call regardless of maxResults
 * (YouTube Data API v3 quota calculator, the most expensive listed operation).
 * search.list carries no view/like/comment counts; pass the returned video
 * IDs to {@link videoStatistics} for those measures.
 * @param {object} params
 * @param {Function} params.authorizedFetch - credential-blind capability that attaches authorization
 * @param {string} params.query - nonempty keyword search text
 * @param {number} [params.maxResults=25] - result page size, 1 through 50
 * @param {string} [params.publishedAfter] - RFC3339 instant lower bound on publish time
 * @returns {Promise<Array<{videoId:string,title:string,channelTitle:string,publishedAt:string,viewCount:null,likeCount:null,commentCount:null}>>}
 * @throws {TypeError} on an invalid query or a malformed/unbounded search.list response
 */
export async function searchVideos({ authorizedFetch, query, maxResults = 25, publishedAfter } = {}) {
  const call = capability(authorizedFetch);
  const admitted = buildSearchVideosQuery({ query, maxResults, publishedAfter });
  const target = new URL(SEARCH_LIST);
  for (const [key, value] of Object.entries(admitted)) target.searchParams.set(key, String(value));
  const init = { method: "GET", headers: { accept: "application/json" }, redirect: "error" };
  noAuthorization(init.headers);
  const payload = await json(await call(target.href, init), "search.list");
  if (!Array.isArray(payload.items)) throw new TypeError("search.list returned no items array");
  if (payload.items.length > admitted.maxResults) throw new TypeError("search.list response exceeds the requested bound");
  return payload.items.map((item) => normalizeSearchResultItem(item));
}

function nonNegativeCount(value) {
  if (value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new TypeError("videos.list returned an invalid statistics count");
  return number;
}

function normalizeVideoStatisticsItem(item) {
  const id = videoId(item?.id);
  const snippet = item?.snippet ?? {}, statistics = item?.statistics ?? {};
  const publishedAt = snippet.publishedAt;
  if (!Number.isFinite(Date.parse(publishedAt ?? ""))) throw new TypeError("videos.list returned no valid publishedAt");
  return {
    videoId: id,
    title: String(snippet.title ?? ""),
    channelTitle: String(snippet.channelTitle ?? ""),
    publishedAt: new Date(publishedAt).toISOString(),
    viewCount: nonNegativeCount(statistics.viewCount),
    likeCount: nonNegativeCount(statistics.likeCount),
    commentCount: nonNegativeCount(statistics.commentCount),
  };
}

/**
 * Fetches statistics and snippet for up to 50 video IDs in one bounded
 * videos.list call, credential-blind.
 *
 * Quota cost: videos.list costs 1 unit per call regardless of how many IDs
 * or parts are requested (YouTube Data API v3 quota calculator).
 * @param {object} params
 * @param {Function} params.authorizedFetch - credential-blind capability that attaches authorization
 * @param {string[]} params.videoIds - 1 through 50 YouTube video IDs
 * @returns {Promise<Array<{videoId:string,title:string,channelTitle:string,publishedAt:string,viewCount:?number,likeCount:?number,commentCount:?number}>>}
 * @throws {TypeError} on an invalid videoIds list or a malformed/unbounded videos.list response
 */
export async function videoStatistics({ authorizedFetch, videoIds } = {}) {
  const call = capability(authorizedFetch);
  if (!Array.isArray(videoIds) || videoIds.length < 1 || videoIds.length > SEARCH_VIDEO_IDS_MAX) throw new TypeError("videoStatistics requires 1 through 50 video IDs");
  const ids = videoIds.map((id) => videoId(id));
  const target = new URL(VIDEOS_LIST);
  target.searchParams.set("part", "statistics,snippet");
  target.searchParams.set("id", ids.join(","));
  const init = { method: "GET", headers: { accept: "application/json" }, redirect: "error" };
  noAuthorization(init.headers);
  const payload = await json(await call(target.href, init), "videos.list");
  if (!Array.isArray(payload.items)) throw new TypeError("videos.list returned no items array");
  if (payload.items.length > ids.length) throw new TypeError("videos.list response exceeds the requested bound");
  return payload.items.map((item) => normalizeVideoStatisticsItem(item));
}

function median(numbers) {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/**
 * Pure aggregation of normalized video records into one demand-research
 * signal. Records may optionally carry a `query` tag (the search term that
 * produced them, attached by the caller when merging results from several
 * {@link searchVideos} calls) so demand can be compared across queries;
 * untagged records still contribute to medianViews, topChannels, and
 * sampleSize. Performs no I/O.
 * @param {Array<{query?:string,videoId:string,title:string,channelTitle:string,publishedAt:string,viewCount:?number,likeCount:?number,commentCount:?number}>} records
 * @returns {{queries:string[],medianViews:?number,topChannels:Array<{channelTitle:string,count:number}>,sampleSize:number}}
 * @throws {TypeError} if records is not an array
 */
export function demandSignal(records) {
  if (!Array.isArray(records)) throw new TypeError("demandSignal requires an array of video records");
  const queries = [...new Set(records.map((record) => record?.query).filter((value) => typeof value === "string" && value.trim()))].sort();
  const views = records.map((record) => record?.viewCount).filter((value) => typeof value === "number" && Number.isFinite(value));
  const channelCounts = new Map();
  for (const record of records) {
    const channelTitle = typeof record?.channelTitle === "string" ? record.channelTitle : "";
    if (!channelTitle) continue;
    channelCounts.set(channelTitle, (channelCounts.get(channelTitle) ?? 0) + 1);
  }
  const topChannels = [...channelCounts.entries()]
    .sort(([aName, aCount], [bName, bCount]) => bCount - aCount || aName.localeCompare(bName))
    .slice(0, 5)
    .map(([channelTitle, count]) => ({ channelTitle, count }));
  return { queries, medianViews: median(views), topChannels, sampleSize: records.length };
}
