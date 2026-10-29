// Type declarations for @red-cup-engineering/qwzspace/client-browser.

import type { RealtimeClient, RealtimeConnectionPolicyOptions, ConnectionState, OptimisticOverlay } from "./client.d.ts";

export * from "./client.d.ts";

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
