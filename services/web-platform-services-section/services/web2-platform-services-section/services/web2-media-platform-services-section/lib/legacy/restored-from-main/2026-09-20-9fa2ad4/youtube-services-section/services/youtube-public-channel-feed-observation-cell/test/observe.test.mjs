import assert from "node:assert/strict";
import test from "node:test";
import { observeYouTubePublicChannelFeed, parseYouTubePublicFeed, parseYouTubePublicFeedEntries } from "../lib/observe.mjs";
import { fetchExactFeed } from "../src/adapter.mjs";

const CHANNEL = `UC${"g".repeat(22)}`;
const DIFFERENT_CHANNEL = `UC${"h".repeat(22)}`;
const XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">
  <link rel="self" href="http://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL}"/>
  <yt:channelId>${CHANNEL.slice(2)}</yt:channelId><title>MathematicsInRelation</title>
  <link rel="alternate" href="https://www.youtube.com/channel/${CHANNEL}"/>
  <entry><yt:videoId>mqJcRksvgDQ</yt:videoId><title>Relations &amp; proofs</title><link rel="alternate" href="https://www.youtube.com/watch?v=mqJcRksvgDQ"/><published>2026-07-24T15:00:15+00:00</published></entry>
</feed>`;
const XML_TWO_ENTRIES = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">
  <link rel="self" href="http://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL}"/>
  <yt:channelId>${CHANNEL.slice(2)}</yt:channelId><title>MathematicsInRelation</title>
  <link rel="alternate" href="https://www.youtube.com/channel/${CHANNEL}"/>
  <entry><yt:videoId>mqJcRksvgDQ</yt:videoId><title>Relations &amp; proofs</title><link rel="alternate" href="https://www.youtube.com/watch?v=mqJcRksvgDQ"/><published>2026-07-24T15:00:15+00:00</published></entry>
  <entry><yt:videoId>aBcDeFgHiJk</yt:videoId><title>Sheaves, gently</title><link rel="alternate" href="https://www.youtube.com/watch?v=aBcDeFgHiJk"/><published>2026-07-23T15:00:10+00:00</published></entry>
</feed>`;

test("parses one exact public YouTube feed without inferring authority", () => {
  assert.deepEqual(parseYouTubePublicFeed(XML, CHANNEL), {
    channelId: CHANNEL,
    feedTitle: "MathematicsInRelation",
    channelUrl: `https://www.youtube.com/channel/${CHANNEL}`,
    latest: { videoId: "mqJcRksvgDQ", title: "Relations & proofs", publicUrl: "https://www.youtube.com/watch?v=mqJcRksvgDQ", publishedAt: "2026-07-24T15:00:15+00:00" },
  });
});

test("observes, identifies, and records one atomic result", async () => {
  const records = [], sourceUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL}`;
  const result = await observeYouTubePublicChannelFeed({ kind: "org.emsenn.youtube-public-channel-feed-observation.request.v1", requestId: "customer-one", channelId: CHANNEL }, {
    observe: async (input) => { assert.deepEqual(input, { sourceUrl, channelId: CHANNEL }); return { sourceUrl, observedAt: "2026-07-26T22:00:00.000Z", xml: XML }; },
    record: async (record) => records.push(record),
  });
  assert.equal(result.provider, "urn:ame:youtube-public-channel-feed-observation-cell");
  assert.equal(result.channelId, CHANNEL);
  assert.equal(records.length, 1);
  assert.equal(records[0].record, result);
  assert.ok(result.authorityWithheld.includes("youtube-write"));
});

test("parses every entry in a multi-entry public YouTube feed, most recent first", () => {
  assert.deepEqual(parseYouTubePublicFeedEntries(XML_TWO_ENTRIES, CHANNEL), {
    channelId: CHANNEL,
    feedTitle: "MathematicsInRelation",
    channelUrl: `https://www.youtube.com/channel/${CHANNEL}`,
    entries: [
      { videoId: "mqJcRksvgDQ", title: "Relations & proofs", publicUrl: "https://www.youtube.com/watch?v=mqJcRksvgDQ", publishedAt: "2026-07-24T15:00:15+00:00" },
      { videoId: "aBcDeFgHiJk", title: "Sheaves, gently", publicUrl: "https://www.youtube.com/watch?v=aBcDeFgHiJk", publishedAt: "2026-07-23T15:00:10+00:00" },
    ],
  });
  assert.deepEqual(parseYouTubePublicFeedEntries(XML, CHANNEL).entries, [parseYouTubePublicFeed(XML, CHANNEL).latest]);
});

test("refuses identity drift and compound operations", async () => {
  assert.throws(() => parseYouTubePublicFeed(XML, DIFFERENT_CHANNEL), /changed the requested channel identity/u);
  assert.throws(() => parseYouTubePublicFeed(XML.replace(`channel_id=${CHANNEL}`, `channel_id=${DIFFERENT_CHANNEL}`), CHANNEL), /changed the requested channel identity/u);
  assert.throws(() => parseYouTubePublicFeedEntries(XML, DIFFERENT_CHANNEL), /changed the requested channel identity/u);
  await assert.rejects(() => observeYouTubePublicChannelFeed({ kind: "org.emsenn.youtube-public-channel-feed-observation.request.v1", requestId: "x", channelId: CHANNEL, search: "trends" }, {}), /unexpected search/u);
});

test("the public-web membrane closes each venue connection and retries only transient refusal", async () => {
  const calls = [];
  const result = await fetchExactFeed({ sourceUrl: `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL}` }, async (url, options) => {
    calls.push({ url: url.href, options });
    return calls.length === 1 ? new Response("busy", { status: 503 }) : new Response(XML, { status: 200 });
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.headers.connection, "close");
  assert.equal(result.xml, XML);
});
