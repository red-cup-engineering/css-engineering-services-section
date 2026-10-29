// Type declarations for @red-cup-engineering/qwzspace/broadcast-hub.

export interface HubClient {
  send(obj: unknown): boolean;
  heartbeat?(): unknown;
  [key: string]: unknown;
}

export interface BroadcastHub<C extends HubClient = HubClient, S = unknown> {
  add(client: C): () => void;
  remove(client: C): void;
  bind(client: C, subscriber: S): void;
  subscriberOf(client: C): S | null;
  send(client: C, obj: unknown): boolean;
  broadcast(obj: unknown): void;
  each(fn: (client: C, subscriber: S | null) => void): void;
  heartbeat(): void;
  size(): number;
}

export function createBroadcastHub<C extends HubClient = HubClient, S = unknown>(): BroadcastHub<C, S>;
