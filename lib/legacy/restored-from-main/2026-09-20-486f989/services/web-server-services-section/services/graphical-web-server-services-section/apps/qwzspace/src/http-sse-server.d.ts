// Type declarations for @red-cup-engineering/qwzspace/http-sse-server.

import type { IncomingMessage, ServerResponse } from "node:http";
import type { BroadcastHub } from "./broadcast-hub.d.ts";
import type { IntentQueue } from "./intent-queue.d.ts";
import type { SnapshotManager } from "./snapshot-manager.d.ts";

export interface SseHubClient {
  res: ServerResponse;
  lastSeq: number;
  send(obj: unknown): boolean;
  heartbeat(): boolean;
}
export function sseClient(res: ServerResponse, options?: { pack?: boolean }): SseHubClient;

export function createSseHandler(options: {
  hub: BroadcastHub;
  queue: IntentQueue;
  snapshot: SnapshotManager;
  tickNow: () => number;
  clientDir?: string | null;
  eventsPath?: string;
  actPath?: string;
  /** Opt-in entry packing on the event stream (protocol.mjs packEntries). */
  pack?: boolean;
}): (req: IncomingMessage, res: ServerResponse) => Promise<void>;
