// Type declarations for @red-cup-engineering/qwzspace/tick-driver.

import type { BroadcastHub } from "./broadcast-hub.d.ts";
import type { SnapshotManager } from "./snapshot-manager.d.ts";
import type { IntentQueue } from "./intent-queue.d.ts";

export interface TickResult {
  dirty?: Iterable<string>;
  events?: unknown[];
}

export interface TickDriverHandle {
  stop(): void;
  tickNow(): number;
}

export function startTickDriver(options: {
  hub: BroadcastHub;
  snapshot: SnapshotManager;
  queue: IntentQueue;
  runTick: (tick: number, intents: unknown[]) => TickResult | void | Promise<TickResult | void>;
  bootstrap?: (() => number | Promise<number>) | null;
  intervalMs?: number;
  heartbeatMs?: number;
  perSubscriber?: boolean | null;
}): Promise<TickDriverHandle>;
