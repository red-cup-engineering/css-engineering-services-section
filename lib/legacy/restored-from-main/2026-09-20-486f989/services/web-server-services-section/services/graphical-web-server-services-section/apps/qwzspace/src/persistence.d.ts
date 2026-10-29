// Type declarations for @red-cup-engineering/qwzspace/persistence.

import type { Room, Checkpoint } from "./room.d.ts";

export interface IntentLogRecord {
  tick: number;
  seq: number;
  actorId: string;
  kind: string;
  args: Record<string, unknown>;
}

// Store — the persistence adapter SEAM. Any object satisfying this shape works with
// attachPersistence/restoreRoom/verifyStoredHistory; createFileStore is the one reference
// implementation this package ships.
export interface Store {
  appendRecords(roomId: string, records: IntentLogRecord[]): Promise<void>;
  readAllRecords(roomId: string): Promise<IntentLogRecord[]>;
  saveCheckpoint(roomId: string, checkpoint: Checkpoint): Promise<void>;
  loadCheckpoint(roomId: string): Promise<Checkpoint | null>;
  clear(roomId: string): Promise<void>;
}

export interface FileStore extends Store {
  writeFileRaw(relPath: string, text: string): Promise<void>;
}
export function createFileStore(options: { dir: string }): FileStore;

export interface PersistenceHandle {
  flushNow(): Promise<void>;
  stop(): void;
}
export function attachPersistence(room: Room, store: Store, options?: { flushEveryMs?: number }): PersistenceHandle;

export interface RestoreResult {
  tick: number;
  restoredTicks: number;
  integrity: { atTick: number; ok: boolean; expectedLogHash: string; actualLogHash: string } | null;
}
export function restoreRoom(room: Room, store: Store): Promise<RestoreResult>;

export interface VerifyStoredHistoryResult {
  tick: number;
  ok: boolean | null;
  checkpoint: Checkpoint | null;
  replayedStateHash?: string;
}
export function verifyStoredHistory(options: {
  store: Store;
  roomId: string;
  subjectsOf: (tick: number) => Iterable<string> | Promise<Iterable<string>>;
  snapOf: (id: string, tick: number) => unknown | null | Promise<unknown | null>;
  runTick: (tick: number, intents: unknown[]) => unknown;
}): Promise<VerifyStoredHistoryResult>;
