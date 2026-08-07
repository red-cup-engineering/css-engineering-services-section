import { resolve } from "node:path";
import { createSettlementStore } from "@lenticule-science/witness-journal-rdf-projection-service/client";

const MAX_FEED_BYTES = 2 * 1024 * 1024;

export async function fetchExactFeed({ sourceUrl }, fetchImpl = fetch) {
  const url = new URL(sourceUrl);
  if (url.origin !== "https://www.youtube.com" || url.pathname !== "/feeds/videos.xml" || [...url.searchParams.keys()].join(",") !== "channel_id") throw new TypeError("public-feed observer accepts only one exact YouTube channel feed URL");
  let response, lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await fetchImpl(url, { method: "GET", headers: { accept: "application/atom+xml, application/xml;q=0.9", connection: "close" }, redirect: "error", signal: AbortSignal.timeout(15_000) });
      if (response.status !== 429 && response.status < 500) break;
    } catch (error) { lastError = error; }
  }
  if (!response) throw lastError;
  if (!response.ok) throw new Error(`YouTube public feed refused with HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_FEED_BYTES) throw new TypeError("YouTube public feed has an inadmissible size");
  return { sourceUrl: url.href, observedAt: new Date().toISOString(), xml: bytes.toString("utf8") };
}

export function createYouTubePublicFeedObservationRuntime({ root }) {
  const store = createSettlementStore({
    settlementRoot: root,
    agentUrl: process.env.WITNESS_JOURNAL_RDF_AGENT ?? "http://127.0.0.1:19764/.well-known/agent-card.json",
    caip2: process.env.SETTLEMENT_CAIP2 ?? "eip155:5615611",
  });
  return Object.freeze({ providers: Object.freeze({ observe: fetchExactFeed, record: (input) => store.record(input) }) });
}
