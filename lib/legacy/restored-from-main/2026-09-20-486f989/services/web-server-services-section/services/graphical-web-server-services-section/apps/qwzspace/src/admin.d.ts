// Type declarations for @red-cup-engineering/qwzspace/admin.

import type { IncomingMessage, ServerResponse } from "node:http";
import type { TufteModel } from "@red-cup-engineering/web-tufte-gui-services-section";
import type { Room } from "./room.d.ts";

export interface TickJitterStats {
  samples: number;
  meanMs: number | null;
  stddevMs: number | null;
  minMs: number | null;
  maxMs: number | null;
}
export interface RoomMeterSummary {
  wire: { messages: number; bytes: number };
  tickJitter: TickJitterStats;
}
export interface RoomMeter {
  summary(): RoomMeterSummary;
  reset(): void;
  stop(): void;
}
export function attachRoomMeters(room: Room, options?: { jitterWindow?: number; pollMs?: number }): RoomMeter;

export interface AdminRoomSummary extends RoomMeterSummary {
  id: string;
  tick: number;
  memberCount: number;
  members: { actorId: string; name: string | null; joinedAtTick: number }[];
  queueDepth: number;
  logLength: number;
  checkpoints: ReturnType<Room["checkpoints"]>;
  auditResults: ReturnType<Room["auditResults"]>;
}
export interface AdminPayload {
  generatedAt: number;
  rooms: AdminRoomSummary[];
}

/** The TUFTE document model the `?html` view renders: a rooms table plus per-room members, checkpoints, and self-audit tables. */
export function adminTufteModel(payload: AdminPayload, options?: { path?: string }): TufteModel;

export function createAdminHandler(options: {
  rooms: Map<string, Room> | { entries(): IterableIterator<[string, Room]> };
  meters?: Map<string, RoomMeter>;
  path?: string;
}): (req: IncomingMessage, res: ServerResponse) => boolean;
