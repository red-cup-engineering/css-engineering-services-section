// Type declarations for @red-cup-engineering/qwzspace/create-server.

import type { Server, IncomingMessage, ServerResponse } from "node:http";
import type { IntentQueue } from "./intent-queue.d.ts";
import type { SnapshotManager } from "./snapshot-manager.d.ts";
import type { BroadcastHub } from "./broadcast-hub.d.ts";
import type { Conn } from "./http-ws-server.d.ts";
import type { TickResult } from "./tick-driver.d.ts";

export interface CreateServerOptions {
  transport?: "sse" | "ws";
  runTick: (tick: number, intents: unknown[]) => TickResult | void | Promise<TickResult | void>;
  subjectsOf: (tick: number) => Iterable<string> | Promise<Iterable<string>>;
  snapOf: (id: string, tick: number) => unknown | null | Promise<unknown | null>;
  validate?: (raw: unknown) => unknown | null;
  interest?: ((id: string, subscriberId: unknown) => boolean) | null;
  bootstrap?: (() => number | Promise<number>) | null;
  clientDir?: string | null;
  intervalMs?: number;
  heartbeatMs?: number;
  onJoin?: ((conn: Conn, ctx: { hub: BroadcastHub; queue: IntentQueue; snapshot: SnapshotManager; client: unknown; tickNow: () => number }) => void) | null;
  /** Opt-in entry packing on the wire for snapshot/delta frames; off by default. */
  pack?: boolean;
}

export interface QwzServer {
  queue: IntentQueue;
  snapshot: SnapshotManager;
  hub: BroadcastHub;
  step(): Promise<TickResult>;
  start(): Promise<{ stop(): void; tickNow(): number }>;
  tickNow(): number;
  ready: Promise<void>;
  handler?: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
  attach?: (httpServer: Server) => void;
  staticHandlerFor?: string | null;
  readonly pack: boolean;
}

export function createServer(options: CreateServerOptions): QwzServer;
