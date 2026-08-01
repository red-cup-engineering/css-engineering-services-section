const API_ORIGIN = "https://www.googleapis.com";
const VIDEO_INSERT = `${API_ORIGIN}/upload/youtube/v3/videos?uploadType=resumable&part=snippet%2Cstatus`;
const CHANNEL_MINE = `${API_ORIGIN}/youtube/v3/channels?part=id%2Csnippet&mine=true`;
const MAX_JSON_BYTES = 1_000_000;
const ANALYTICS_REPORT = "https://youtubeanalytics.googleapis.com/v2/reports";
export const YOUTUBE_ANALYTICS_METRICS = Object.freeze(["views", "estimatedMinutesWatched", "averageViewDuration"]);

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
  if (typeof current.license !== "string" || typeof current.embeddable !== "boolean" || typeof current.publicStatsViewable !== "boolean" || typeof current.selfDeclaredMadeForKids !== "boolean" || typeof current.containsSyntheticMedia !== "boolean") throw new TypeError("videos.update scheduling refuses to erase unobserved mutable status properties");
  const status = { privacyStatus: "private", publishAt: exactPublishAt, license: current.license, embeddable: current.embeddable, publicStatsViewable: current.publicStatsViewable, selfDeclaredMadeForKids: current.selfDeclaredMadeForKids, containsSyntheticMedia: current.containsSyntheticMedia };
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
