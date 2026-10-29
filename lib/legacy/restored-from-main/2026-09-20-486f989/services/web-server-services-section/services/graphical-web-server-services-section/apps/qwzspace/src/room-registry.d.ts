// Type declarations for @red-cup-engineering/qwzspace/room-registry.

import type { Room } from "./room.d.ts";

export interface RoomRegistry {
  create(id: string, opts?: unknown): Room;
  get(id: string): Room | null;
  has(id: string): boolean;
  list(): string[];
  size(): number;
  destroy(id: string): boolean;
  destroyAll(): void;
}

export function createRoomRegistry(options: {
  factory: (id: string, opts?: unknown) => Record<string, unknown>;
}): RoomRegistry;
