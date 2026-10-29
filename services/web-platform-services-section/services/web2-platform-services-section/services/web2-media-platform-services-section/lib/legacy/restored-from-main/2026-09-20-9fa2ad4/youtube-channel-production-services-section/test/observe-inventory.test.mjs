import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  resolveUploadsPlaylist, listAllPlaylistItems, fetchVideoStatuses,
  observeYouTubeInventory, parseAtomFeedInventory, fetchPublicChannelInventory, observeInventory,
} from "../scripts/observe-inventory.mjs";

const spec = JSON.parse(await readFile(fileURLToPath(new URL("./fixtures/channel-spec.json", import.meta.url)), "utf8"));

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, text: async () => JSON.stringify(body), json: async () => body };
}

test("resolveUploadsPlaylist reads the uploads playlist id from channels.list", async () => {
  const authorizedFetch = async (url) => {
    assert.match(url, /\/youtube\/v3\/channels\?part=contentDetails&mine=true$/u);
    return jsonResponse({ items: [{ id: "UCabc", contentDetails: { relatedPlaylists: { uploads: "UUabc" } } }] });
  };
  const result = await resolveUploadsPlaylist({ authorizedFetch });
  assert.deepEqual(result, { channelId: "UCabc", uploadsPlaylistId: "UUabc" });
});

test("resolveUploadsPlaylist throws when no uploads playlist is returned", async () => {
  const authorizedFetch = async () => jsonResponse({ items: [{ id: "UCabc", contentDetails: {} }] });
  await assert.rejects(resolveUploadsPlaylist({ authorizedFetch }), TypeError);
});

test("listAllPlaylistItems paginates through every page", async () => {
  const calls = [];
  const authorizedFetch = async (url) => {
    calls.push(url);
    const parsed = new URL(url);
    if (!parsed.searchParams.has("pageToken")) {
      return jsonResponse({ items: [{ snippet: { title: "Lesson One", resourceId: { videoId: "v1" } } }], nextPageToken: "page2" });
    }
    return jsonResponse({ items: [{ snippet: { title: "Lesson Two", resourceId: { videoId: "v2" } } }] });
  };
  const rows = await listAllPlaylistItems({ authorizedFetch, playlistId: "UUabc" });
  assert.equal(calls.length, 2);
  assert.deepEqual(rows, [{ videoId: "v1", title: "Lesson One" }, { videoId: "v2", title: "Lesson Two" }]);
});

test("fetchVideoStatuses batches videos.list at 50 ids per request", async () => {
  const videoIds = Array.from({ length: 120 }, (_value, index) => `v${index}`);
  const calls = [];
  const authorizedFetch = async (url) => {
    calls.push(url);
    const ids = new URL(url).searchParams.get("id").split(",");
    return jsonResponse({ items: ids.map((id) => ({ id, status: { privacyStatus: "private", publishAt: null } })) });
  };
  const statuses = await fetchVideoStatuses({ authorizedFetch, videoIds });
  assert.equal(calls.length, 3);
  assert.equal(statuses.size, 120);
  assert.deepEqual(statuses.get("v0"), { privacyStatus: "private", publishAt: null });
});

test("observeYouTubeInventory composes token refresh, playlist resolution, item listing, and status lookup", async () => {
  const environment = { FIXTURE_OAUTH_CLIENT_ID: "id", FIXTURE_OAUTH_CLIENT_SECRET: "secret", FIXTURE_REFRESH_TOKEN: "refresh" };
  const fetchImpl = async (url, init = {}) => {
    const target = new URL(url);
    if (target.href === "https://oauth2.googleapis.com/token") return jsonResponse({ access_token: "at-1", scope: "" });
    if (target.pathname === "/youtube/v3/channels") return jsonResponse({ items: [{ id: "UCabc", contentDetails: { relatedPlaylists: { uploads: "UUabc" } } }] });
    if (target.pathname === "/youtube/v3/playlistItems") {
      return jsonResponse({ items: [{ snippet: { title: "Lorentzian geometry | Fixture Channel", resourceId: { videoId: "v1" } } }] });
    }
    if (target.pathname === "/youtube/v3/videos") {
      return jsonResponse({ items: [{ id: "v1", status: { privacyStatus: "private", publishAt: "2026-09-10T15:00:00.000Z" } }] });
    }
    throw new Error(`unhandled fake google request: ${init.method ?? "GET"} ${target.href}`);
  };
  const inventory = await observeYouTubeInventory({ spec, environment, fetchImpl });
  assert.deepEqual(inventory, [{ videoId: "v1", title: "Lorentzian geometry | Fixture Channel", privacyStatus: "private", publishAt: "2026-09-10T15:00:00.000Z" }]);
});

test("parseAtomFeedInventory extracts videoId, title, and unescapes entities from every entry", () => {
  const xml = `<?xml version="1.0"?><feed>
    <entry><yt:videoId>abc123</yt:videoId><title>Fairbanks &amp; Beyond</title></entry>
    <entry><yt:videoId>def456</yt:videoId><title>Second Video</title></entry>
  </feed>`;
  const rows = parseAtomFeedInventory(xml);
  assert.deepEqual(rows, [
    { videoId: "abc123", title: "Fairbanks & Beyond", privacyStatus: "public", publishAt: null },
    { videoId: "def456", title: "Second Video", privacyStatus: "public", publishAt: null },
  ]);
});

test("fetchPublicChannelInventory fetches the channel's Atom feed by youtubeChannelId", async () => {
  const fetchImpl = async (url) => {
    assert.equal(url, `https://www.youtube.com/feeds/videos.xml?channel_id=${spec.youtubeChannelId}`);
    return { ok: true, text: async () => `<feed><entry><yt:videoId>abc</yt:videoId><title>T</title></entry></feed>` };
  };
  const rows = await fetchPublicChannelInventory({ spec, fetchImpl });
  assert.deepEqual(rows, [{ videoId: "abc", title: "T", privacyStatus: "public", publishAt: null }]);
});

test("observeInventory falls back to the public feed when OAuth secrets are absent", async () => {
  const fetchImpl = async (url) => {
    assert.match(url, /feeds\/videos\.xml/u);
    return { ok: true, text: async () => `<feed><entry><yt:videoId>abc</yt:videoId><title>T</title></entry></feed>` };
  };
  const rows = await observeInventory({ spec, environment: {}, fetchImpl });
  assert.deepEqual(rows, [{ videoId: "abc", title: "T", privacyStatus: "public", publishAt: null }]);
});

test("observeInventory uses OAuth playlistItems when secrets are present", async () => {
  const environment = { FIXTURE_OAUTH_CLIENT_ID: "id", FIXTURE_OAUTH_CLIENT_SECRET: "secret", FIXTURE_REFRESH_TOKEN: "refresh" };
  const fetchImpl = async (url, init = {}) => {
    const target = new URL(url);
    if (target.href === "https://oauth2.googleapis.com/token") return jsonResponse({ access_token: "at-1", scope: "" });
    if (target.pathname === "/youtube/v3/channels") return jsonResponse({ items: [{ id: "UCabc", contentDetails: { relatedPlaylists: { uploads: "UUabc" } } }] });
    if (target.pathname === "/youtube/v3/playlistItems") return jsonResponse({ items: [] });
    throw new Error(`unhandled fake google request: ${init.method ?? "GET"} ${target.href}`);
  };
  const rows = await observeInventory({ spec, environment, fetchImpl });
  assert.deepEqual(rows, []);
});
