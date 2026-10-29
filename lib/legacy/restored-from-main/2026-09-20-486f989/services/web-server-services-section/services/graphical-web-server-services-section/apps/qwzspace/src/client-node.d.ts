// Type declarations for @red-cup-engineering/qwzspace/client-node.

import type { RealtimeClient, RealtimeConnectionPolicyOptions, ConnectionState, WebSocketLike, OptimisticOverlay } from "./client.d.ts";

export * from "./client.d.ts";

export class NodeWebSocket implements WebSocketLike {
  constructor(url: string);
  readonly readyState: number;
  onopen: ((event?: unknown) => void) | null;
  onclose: ((event?: { code?: number; reason?: string }) => void) | null;
  onerror: ((event?: { message?: string }) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  send(data: string | unknown): void;
  close(): void;
}

export function createNodeClient(url: string): NodeWebSocket;

export function connectRoom(
  url: string,
  options?: {
    name?: string;
    onState?: ((state: ConnectionState) => void) | null;
    policyOptions?: RealtimeConnectionPolicyOptions;
    localId?: string;
    overlay?: OptimisticOverlay | null;
  },
): RealtimeClient;
