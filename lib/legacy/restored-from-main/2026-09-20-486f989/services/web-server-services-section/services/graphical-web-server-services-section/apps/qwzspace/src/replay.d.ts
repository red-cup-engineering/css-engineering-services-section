// Type declarations for @red-cup-engineering/qwzspace/replay.

import type { IntentRecord } from "./intent-log.d.ts";
import type { FullFrame, SnapshotManager } from "./snapshot-manager.d.ts";
import type { TickResult } from "./tick-driver.d.ts";

export function stateHash(fullFrame: FullFrame): string;

export interface ReplayResult<E = unknown> {
  tick: number;
  snapshot: SnapshotManager<E>;
  full(atTick?: number): FullFrame<E>;
}

export function replay<E = unknown>(
  log: readonly IntentRecord[],
  options: {
    subjectsOf: (tick: number) => Iterable<string> | Promise<Iterable<string>>;
    snapOf: (id: string, tick: number) => E | null | Promise<E | null>;
    runTick: (tick: number, intents: unknown[]) => TickResult | void | Promise<TickResult | void>;
    totalTicks: number;
    onTick?: ((tick: number, fullFrame: FullFrame<E>) => void) | null;
  },
): Promise<ReplayResult<E>>;

export interface VerifyResult {
  ok: boolean | undefined;
  replayedStateHash: string;
  replayedLogHash: string;
  liveStateHash: string | null;
  tick: number;
}

export function verifyRoomHistory(options: {
  seed: unknown;
  log: readonly IntentRecord[];
  totalTicks: number;
  subjectsOf: (tick: number) => Iterable<string> | Promise<Iterable<string>>;
  snapOf: (id: string, tick: number) => unknown | null | Promise<unknown | null>;
  runTick: (tick: number, intents: unknown[]) => TickResult | void | Promise<TickResult | void>;
  liveStateHash?: string;
}): Promise<VerifyResult>;
