// ledger/stream — the Scott transport: an append-only EAVT witness log
// streamed as Server-Sent Events.
//
// The witness log is monotone (append-only), so streaming it is the κ=ω Scott
// session: each new row is one SSE event, the row's content identity is its event
// id, and `Last-Event-ID` resumes from the next row. Appending rows only appends
// frames — coordination-free, the same CALM property the log itself has. Pure: no
// I/O (the caller reads the log via ./store and binds the HTTP response).

import { eavtId, type EAVTRecord } from "../codecs/text/json/jsonl/eavt/index.mjs";
import { sseFrame, sseHeaders } from "../writing/http/sse/index.mjs";
import type { JsonValue } from "../codecs/text/json/core.mjs";

/** The SSE event name carrying one witnessed EAVT row. */
export const EAVT_EVENT = "datom";

/** The index of the first row to send after `lastEventId` (0 if absent/unknown). */
function resumeIndex(log: readonly EAVTRecord[], lastEventId?: string): number {
  if (lastEventId === undefined) return 0;
  const at = log.findIndex((row) => eavtId(row) === lastEventId);
  return at < 0 ? 0 : at + 1;
}

/** Project an append-only EAVT witness log into SSE frames, resuming after
 *  `lastEventId`. Each row becomes one `datom` event whose id is the row's content
 *  identity, so a reconnecting client replays from exactly where it left off.
 *  Monotone: extending the log only extends the output (the Scott/CALM property). */
export function streamWitnessLog(log: readonly EAVTRecord[], lastEventId?: string): string {
  return log
    .slice(resumeIndex(log, lastEventId))
    .map((row) => sseFrame(EAVT_EVENT, row as unknown as JsonValue, eavtId(row)))
    .join("");
}

/** A served SSE response: a status, the event-stream headers, and the resumable
 *  frame body. Kept separate from the running `ServedResponse` because SSE needs
 *  its own headers (no-cache, keep-alive). */
export interface FeedResponse {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body: string;
}

/** Project a witness log into the full SSE response — the Scott transport as a
 *  served value. A route is the thin glue: read the log, then
 *  `feedResponse(log, request.headers["last-event-id"])`. */
export function feedResponse(log: readonly EAVTRecord[], lastEventId?: string): FeedResponse {
  return { status: 200, headers: sseHeaders(), body: streamWitnessLog(log, lastEventId) };
}
