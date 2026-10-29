// Type declarations for @red-cup-engineering/qwzspace/lobby.

import type { Room } from "./room.d.ts";
import type { RoomRegistry } from "./room-registry.d.ts";
import type { World } from "./room.d.ts";

export interface LobbyEntry {
  id: string;
  name: string;
  capacity: number;
  memberCount: number;
  joinable: boolean;
  metadata: Record<string, unknown>;
}

export interface LobbyRegistry extends Pick<RoomRegistry, "get" | "has" | "size" | "destroyAll"> {
  create(name: string, opts?: unknown, meta?: { id?: string; capacity?: number; metadata?: Record<string, unknown> }): Room;
  list(): LobbyEntry[];
  destroy(id: string): boolean;
  findByName(name: string): string | null;
  join(name: string): Room | null;
  entry(id: string): LobbyEntry | null;
}

export function createLobbyRegistry(options: {
  factory: (id: string, opts?: unknown) => Record<string, unknown>;
  defaultCapacity?: number;
}): LobbyRegistry;

export function createLobbyWorld(lobby: LobbyRegistry): () => World;

export function lobbyValidate(raw: unknown, actorId?: string): { kind: string; args: Record<string, unknown> } | null;
