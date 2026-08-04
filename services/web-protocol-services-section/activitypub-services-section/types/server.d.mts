import type { Server } from "node:http";
import type { KvStore, MessageQueue } from "@fedify/fedify";
import type { Activity } from "@fedify/vocab";
import type { ActivityPubArrival, ActivityPubProvider } from "./provider.d.mts";

export interface ServeActivityPubProviderOptions {
  readonly origin?: string;
  readonly identifier?: string;
  readonly actorName?: string;
  readonly summary?: string;
  /** Stable canonical RMN cell identity, projected together with controller when supplied. */
  readonly cell?: `ni:///sha-256;${string}`;
  /** Sovereign controller of the projected stable cell identity. */
  readonly controller?: `did:pkh:eip155:${string}:0x${string}`;
  readonly keyPath?: string;
  readonly bearerTokenPath?: string;
  /** Bounded-test credential injection. Live services must use bearerTokenPath. */
  readonly bearerToken?: string;
  readonly port?: number;
  readonly hostname?: string;
  /** Test-only Fedify private-address lookup allowance. Never enable in production. */
  readonly allowPrivateAddress?: boolean;
  /** Purchased network state and custody services are mandatory. */
  readonly kv: KvStore;
  readonly queue?: MessageQueue;
  readonly inbox: Readonly<{
    retain: (arrival: ActivityPubArrival) => void | Promise<void>;
  }>;
  /** Explicit bounded index for the optional private inbox-history projection. */
  readonly inboxIndex?: Readonly<{
    list: (input: Readonly<{ identifier: string; cursor?: string; limit: number }>) => Readonly<{ items: readonly unknown[]; totalItems: number; nextCursor?: string }> | Promise<Readonly<{ items: readonly unknown[]; totalItems: number; nextCursor?: string }>>;
  }>;
  /** A non-public worker trigger. The injected queue owns request authentication and returns its HTTP response unchanged. */
  readonly workerRoute?: Readonly<{ path: `/_private/${string}`; consume: (request: Request) => Response | Promise<Response> }>;
  readonly listOutbox?: (input: Readonly<{ identifier: string; cursor?: string }>) =>
    Readonly<{ items: readonly Activity[]; nextCursor?: string }> |
    Promise<Readonly<{ items: readonly Activity[]; nextCursor?: string }>>;
  /** Called only after Fedify verifies and the provider durably retains the arrival. Customer admission remains outside this provider. */
  readonly onActivity?: (arrival: ActivityPubArrival) => void | Promise<void>;
  /** Tests only: permits synchronous Fedify processing without a durable queue. */
  readonly testOnlyInProcess?: boolean;
}

export function serveActivityPubProvider(options?: ServeActivityPubProviderOptions): Promise<Readonly<{
  provider: ActivityPubProvider;
  server: Server;
  close: () => Promise<void>;
}>>;
