// Type declarations for @red-cup-engineering/qwzspace/room.

import type { Server } from "node:http";
import type { IntentQueue } from "./intent-queue.d.ts";
import type { SnapshotManager } from "./snapshot-manager.d.ts";
import type { BroadcastHub } from "./broadcast-hub.d.ts";
import type { IntentLog } from "./intent-log.d.ts";
import type { TickResult } from "./tick-driver.d.ts";
import type { VerifyResult } from "./replay.d.ts";

export interface World {
  runTick: (tick: number, intents: { actorId: string; kind: string; args: Record<string, unknown> }[]) => TickResult | void | Promise<TickResult | void>;
  subjectsOf: (tick: number) => Iterable<string> | Promise<Iterable<string>>;
  snapOf: (id: string, tick: number) => unknown | null | Promise<unknown | null>;
}
export type WorldFactory = () => World;

export interface Checkpoint {
  tick: number;
  stateHash: string;
  logHash: string;
}
export interface AuditResult {
  tick: number;
  ok: boolean;
  liveHash?: string;
  replayedHash?: string;
  error?: string;
  at: number;
}
export interface Member {
  name: string | null;
  joinedAtTick: number;
  [key: string]: unknown;
}

export interface Room {
  readonly id: string;
  readonly seed: unknown;
  attach(httpServer: Server): void;
  start(): void;
  stop(): void;
  destroy(): void;
  stepOnce(): Promise<void>;
  tickNow(): number;
  queue: IntentQueue;
  snapshot: SnapshotManager;
  hub: BroadcastHub;
  ready: Promise<void>;
  log: IntentLog;
  ring: unknown;
  checkpoints(): Checkpoint[];
  auditResults(): AuditResult[];
  verify(): Promise<VerifyResult & { logHash: string }>;
  members(): Map<string, Member>;
  readonly resumeTokenSecret: string;
  /** Whether this room's frames use entry packing (see createRoom's `pack`). */
  readonly pack: boolean;
}

export function createRoom(options: {
  id: string;
  seed?: unknown;
  world: WorldFactory;
  validate: (raw: unknown, actorId: string) => { kind: string; args?: Record<string, unknown> } | null;
  interest?: ((id: string, subscriberId: unknown) => boolean) | null;
  bootstrap?: (() => number | Promise<number>) | null;
  intervalMs?: number;
  heartbeatMs?: number;
  ringBufferTicks?: number;
  resumeGraceTicks?: number;
  checkpointEvery?: number;
  selfAuditEvery?: number;
  secret?: string;
  authenticate?: ((raw: unknown, conn: unknown) => Promise<string | null> | string | null) | null;
  /** Opt-in entry packing on every snapshot/delta this room sends. The packaged client SDK decodes both shapes; a hand-written raw-JSON client must be updated first. Off by default. */
  pack?: boolean;
}): Room;
