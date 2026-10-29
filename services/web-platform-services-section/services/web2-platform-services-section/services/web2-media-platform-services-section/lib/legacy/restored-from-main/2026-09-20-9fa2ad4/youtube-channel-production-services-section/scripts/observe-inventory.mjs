#!/usr/bin/env node
/**
 * @module observe-inventory
 * The one stateful read a curriculum channel run performs from YouTube
 * itself, never from a git branch or local journal: refreshes the
 * channel's OAuth token, resolves its uploads playlist, and lists every
 * playlistItem -- including private and scheduled videos -- paginating
 * through every page. Falls back to the channel's public Atom feed
 * (public videos only) when no OAuth credentials are configured, so a
 * channel can still be planned against before its secrets are wired.
 *
 * `@red-cup-engineering/youtube-services-section` (0.2.2) has no
 * playlistItems/uploads-playlist observation of its own -- it stops at
 * `observeAuthorizedChannel` (id/title only) and single-video
 * `observeVideo` -- so this module calls the same `youtube/v3` surface
 * directly through the section's own bounded `authorizedFetch`.
 */
import { readFile, writeFile } from "node:fs/promises";
import { runJsonMain } from "@red-cup-engineering/javascript-file-main-guard-service";
import { validateChannelSpec } from "../src/youtube-channel-production.mjs";
import { authorizedFetch as buildAuthorizedFetch, refreshAccessToken, resolveChannelSecrets } from "../src/google-oauth.mjs";
import { argument } from "@red-cup-engineering/javascript-node-services-section/argv";

const API_ORIGIN = "https://www.googleapis.com";
const PLAYLIST_ITEMS_PAGE_SIZE = 50;
const VIDEOS_BATCH_SIZE = 50;

function requiredText(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

async function json(response, operation) {
  const text = await response.text();
  if (!response.ok) throw new Error(`${operation} ${response.status}: ${text.slice(0, 300)}`);
  try { return JSON.parse(text); } catch { throw new TypeError(`${operation} returned malformed JSON`); }
}

/**
 * Resolves the authorized channel's uploads playlist id.
 * @param {{authorizedFetch: Function}} options
 * @returns {Promise<{channelId: string, uploadsPlaylistId: string}>}
 * @throws {TypeError} when the channel carries no uploads playlist
 */
export async function resolveUploadsPlaylist({ authorizedFetch } = {}) {
  const url = `${API_ORIGIN}/youtube/v3/channels?part=contentDetails&mine=true`;
  const payload = await json(await authorizedFetch(url, { method: "GET", headers: { accept: "application/json" }, redirect: "error" }), "channels.list contentDetails");
  const item = payload.items?.[0];
  const uploadsPlaylistId = item?.contentDetails?.relatedPlaylists?.uploads;
  if (typeof uploadsPlaylistId !== "string" || !uploadsPlaylistId) throw new TypeError("channels.list returned no uploads playlist");
  return { channelId: item.id, uploadsPlaylistId };
}

/**
 * Lists every item of one playlist, paginating through every page. The
 * authenticated owner's own uploads playlist includes private and
 * scheduled videos, not only public ones.
 * @param {{authorizedFetch: Function, playlistId: string}} options
 * @returns {Promise<Array<{videoId: string, title: string}>>}
 */
export async function listAllPlaylistItems({ authorizedFetch, playlistId } = {}) {
  requiredText(playlistId, "playlistId");
  const rows = [];
  let pageToken;
  do {
    const url = new URL(`${API_ORIGIN}/youtube/v3/playlistItems`);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", String(PLAYLIST_ITEMS_PAGE_SIZE));
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const payload = await json(await authorizedFetch(url.href, { method: "GET", headers: { accept: "application/json" }, redirect: "error" }), "playlistItems.list");
    for (const item of payload.items ?? []) {
      const videoId = item?.snippet?.resourceId?.videoId;
      if (typeof videoId === "string" && videoId) rows.push({ videoId, title: String(item?.snippet?.title ?? "") });
    }
    pageToken = typeof payload.nextPageToken === "string" && payload.nextPageToken ? payload.nextPageToken : undefined;
  } while (pageToken);
  return rows;
}

/**
 * Fetches privacyStatus/publishAt for a set of video ids, batching
 * `videos.list` calls at {@link VIDEOS_BATCH_SIZE} ids per request.
 * @param {{authorizedFetch: Function, videoIds: string[]}} options
 * @returns {Promise<Map<string, {privacyStatus: string, publishAt: string|null}>>}
 */
export async function fetchVideoStatuses({ authorizedFetch, videoIds } = {}) {
  if (!Array.isArray(videoIds)) throw new TypeError("fetchVideoStatuses requires an array of videoIds");
  const statuses = new Map();
  for (let start = 0; start < videoIds.length; start += VIDEOS_BATCH_SIZE) {
    const batch = videoIds.slice(start, start + VIDEOS_BATCH_SIZE);
    const url = `${API_ORIGIN}/youtube/v3/videos?part=status&id=${batch.map(encodeURIComponent).join(",")}`;
    const payload = await json(await authorizedFetch(url, { method: "GET", headers: { accept: "application/json" }, redirect: "error" }), "videos.list status");
    for (const item of payload.items ?? []) {
      statuses.set(item.id, { privacyStatus: item?.status?.privacyStatus ?? "private", publishAt: item?.status?.publishAt ?? null });
    }
  }
  return statuses;
}

/**
 * Observes one channel's complete uploads inventory straight from
 * YouTube via OAuth -- sees private and scheduled videos.
 * @param {{spec: object, environment?: NodeJS.ProcessEnv, fetchImpl?: typeof fetch}} options
 * @returns {Promise<Array<{videoId: string, title: string, privacyStatus: string, publishAt: string|null}>>}
 */
export async function observeYouTubeInventory({ spec, environment = process.env, fetchImpl = fetch } = {}) {
  const validSpec = validateChannelSpec(spec);
  const credentials = resolveChannelSecrets(validSpec.secrets, environment);
  const accessToken = await refreshAccessToken(credentials, { fetchImpl });
  const authorizedFetch = buildAuthorizedFetch(accessToken, fetchImpl);
  const { uploadsPlaylistId } = await resolveUploadsPlaylist({ authorizedFetch });
  const items = await listAllPlaylistItems({ authorizedFetch, playlistId: uploadsPlaylistId });
  const statuses = await fetchVideoStatuses({ authorizedFetch, videoIds: items.map((row) => row.videoId) });
  return items.map((row) => {
    const status = statuses.get(row.videoId) ?? { privacyStatus: "private", publishAt: null };
    return { videoId: row.videoId, title: row.title, privacyStatus: status.privacyStatus, publishAt: status.publishAt };
  });
}

/**
 * Parses a public YouTube channel Atom feed into an inventory listing.
 * Pure text parsing; no I/O. The feed carries only public videos, so
 * `privacyStatus` is always `"public"` and `publishAt` is always `null`
 * (the feed carries no scheduled-publish information).
 * @param {string} xmlText
 * @returns {Array<{videoId: string, title: string, privacyStatus: "public", publishAt: null}>}
 */
export function parseAtomFeedInventory(xmlText) {
  requiredText(xmlText, "xmlText");
  const rows = [];
  for (const match of xmlText.matchAll(/<entry>([\s\S]*?)<\/entry>/gu)) {
    const entry = match[1];
    const videoId = /<yt:videoId>([^<]+)<\/yt:videoId>/u.exec(entry)?.[1];
    const rawTitle = /<title>([\s\S]*?)<\/title>/u.exec(entry)?.[1];
    if (typeof videoId === "string" && videoId && typeof rawTitle === "string") {
      const title = rawTitle.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", "\"").replaceAll("&#39;", "'");
      rows.push({ videoId, title, privacyStatus: "public", publishAt: null });
    }
  }
  return rows;
}

/**
 * Public fallback: reads a channel's uploads from its Atom feed when no
 * OAuth credentials are configured. Sees only public videos.
 * @param {{spec: object, fetchImpl?: typeof fetch}} options
 * @returns {Promise<Array<{videoId: string, title: string, privacyStatus: "public", publishAt: null}>>}
 * @throws {TypeError} when the spec carries no `youtubeChannelId`
 */
export async function fetchPublicChannelInventory({ spec, fetchImpl = fetch } = {}) {
  const validSpec = validateChannelSpec(spec);
  if (!validSpec.youtubeChannelId) throw new TypeError("fetchPublicChannelInventory requires spec.youtubeChannelId");
  const response = await fetchImpl(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(validSpec.youtubeChannelId)}`);
  if (!response.ok) throw new Error(`public channel feed fetch failed ${response.status}`);
  return parseAtomFeedInventory(await response.text());
}

/**
 * Observes a channel's inventory: OAuth playlistItems (sees private and
 * scheduled videos) when the spec's three secret env vars are present,
 * else the public Atom feed fallback.
 * @param {{spec: object, environment?: NodeJS.ProcessEnv, fetchImpl?: typeof fetch}} options
 * @returns {Promise<Array<{videoId: string, title: string, privacyStatus: string, publishAt: string|null}>>}
 */
export async function observeInventory({ spec, environment = process.env, fetchImpl = fetch } = {}) {
  const validSpec = validateChannelSpec(spec);
  try {
    resolveChannelSecrets(validSpec.secrets, environment);
  } catch {
    return fetchPublicChannelInventory({ spec: validSpec, fetchImpl });
  }
  return observeYouTubeInventory({ spec: validSpec, environment, fetchImpl });
}


async function main({ argv }) {
  const specPath = argument("--spec", argv);
  const outPath = argument("--out", argv);
  if (!specPath) throw new Error("usage: observe-inventory.mjs --spec <path> [--out <path>]");
  const spec = JSON.parse(await readFile(specPath, "utf8"));
  const inventory = await observeInventory({ spec });
  if (outPath) await writeFile(outPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
  return inventory;
}

runJsonMain(main, import.meta.url);
