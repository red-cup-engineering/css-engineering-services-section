import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";

export const ACTOR = "urn:ame:youtube-public-channel-feed-observation-cell";
const CHANNEL = /^UC[A-Za-z0-9_-]{20,}$/u;

function exact(value, fields, label) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError(`${label} must be a plain record`);
  const keys = Object.keys(value);
  for (const field of fields) if (!Object.hasOwn(value, field)) throw new TypeError(`${label} is missing ${field}`);
  for (const field of keys) if (!fields.includes(field)) throw new TypeError(`${label} has unexpected ${field}`);
}

function xmlText(xml, localName) {
  const match = xml.match(new RegExp(`<(?:[A-Za-z0-9_-]+:)?${localName}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</(?:[A-Za-z0-9_-]+:)?${localName}>`, "u"));
  if (!match) return null;
  return match[1].trim().replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&#39;", "'");
}

function alternateUrl(xml) {
  return xml.match(/<link\s+[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*\/?\s*>/u)?.[1]
    ?? xml.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']alternate["'][^>]*\/?\s*>/u)?.[1]
    ?? null;
}

export function parseYouTubePublicFeed(xml, expectedChannelId) {
  if (typeof xml !== "string" || !xml.startsWith("<?xml") || !xml.includes("<feed")) throw new TypeError("YouTube public feed is malformed XML");
  const firstEntryAt = xml.indexOf("<entry>"), feedHeader = firstEntryAt === -1 ? xml : xml.slice(0, firstEntryAt);
  const advertisedChannelId = xmlText(feedHeader, "channelId");
  const selfUrl = feedHeader.match(/<link\s+[^>]*rel=["']self["'][^>]*href=["']([^"']+)["'][^>]*\/?\s*>/u)?.[1] ?? null;
  const channelUrl = alternateUrl(feedHeader);
  let selfChannelId = null;
  try { selfChannelId = new URL(selfUrl).searchParams.get("channel_id"); } catch {}
  if (selfChannelId !== expectedChannelId || channelUrl !== `https://www.youtube.com/channel/${expectedChannelId}`
      || ![expectedChannelId, expectedChannelId.slice(2)].includes(advertisedChannelId)) {
    throw new TypeError("YouTube public feed changed the requested channel identity");
  }
  const channelId = expectedChannelId;
  const feedTitle = xmlText(feedHeader, "title");
  if (!feedTitle) throw new TypeError("YouTube public feed lacks a title");
  const firstEntry = xml.match(/<entry>[\s\S]*?<\/entry>/u)?.[0] ?? null;
  let latest = null;
  if (firstEntry) {
    const videoId = xmlText(firstEntry, "videoId"), publishedAt = xmlText(firstEntry, "published"), title = xmlText(firstEntry, "title"), publicUrl = alternateUrl(firstEntry);
    if (!/^[A-Za-z0-9_-]{6,}$/u.test(videoId ?? "") || !Number.isFinite(Date.parse(publishedAt ?? "")) || !title || !/^https:\/\/www\.youtube\.com\/watch\?/u.test(publicUrl ?? "")) throw new TypeError("YouTube public feed latest entry is malformed");
    latest = { videoId, title, publicUrl, publishedAt };
  }
  return { channelId, feedTitle, channelUrl: `https://www.youtube.com/channel/${channelId}`, latest };
}

export async function observeYouTubePublicChannelFeed(request, providers, options = {}) {
  exact(request, ["kind", "requestId", "channelId"], "request");
  if (request.kind !== "org.emsenn.youtube-public-channel-feed-observation.request.v1") throw new TypeError("wrong YouTube public-feed request kind");
  if (typeof request.requestId !== "string" || request.requestId.trim() === "") throw new TypeError("requestId must be nonempty text");
  if (!CHANNEL.test(request.channelId)) throw new TypeError("channelId must be one immutable YouTube UC identity");
  if (!providers || typeof providers.observe !== "function" || typeof providers.record !== "function") throw new TypeError("public-web observation and WitnessJournal providers are required");
  const requestId = identifyJsonSemanticContent({ objectKind: "youtube.public-channel-feed-observation-request", value: request, witnessRoot: EMPTY_WITNESS_ROOT }).token;
  const sourceUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(request.channelId)}`;
  const venue = await providers.observe({ sourceUrl, channelId: request.channelId });
  exact(venue, ["sourceUrl", "observedAt", "xml"], "venue observation");
  if (venue.sourceUrl !== sourceUrl || !Number.isFinite(Date.parse(venue.observedAt))) throw new TypeError("venue observation does not bind the exact request");
  const feed = parseYouTubePublicFeed(venue.xml, request.channelId);
  const result = Object.freeze({
    kind: "org.emsenn.youtube-public-channel-feed-observation.result.v1",
    provider: ACTOR,
    request: requestId,
    sourceUrl,
    observedAt: venue.observedAt,
    ...feed,
    authorityWithheld: ["youtube-credentials", "youtube-private-state", "search", "ranking", "interpretation", "analytics", "publication", "scheduling", "youtube-write"],
  });
  await providers.record({ category: "youtube-public-channel-feed-observation", recordedAt: options.now ?? venue.observedAt, record: result });
  return result;
}
