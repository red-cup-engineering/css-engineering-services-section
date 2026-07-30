import type { Federation, KvStore, MessageQueue } from "@fedify/fedify";
import type { Activity } from "@fedify/vocab";

export const ACTIVITYPUB_MEDIA_TYPE: "application/activity+json";
export const ACTIVITYSTREAMS_CONTEXT: "https://www.w3.org/ns/activitystreams";

export type ImportedActorKeyPair = Readonly<{ publicKey: CryptoKey; privateKey: CryptoKey }>;
export type ActorKeyMaterial = Readonly<{ publicKey: JsonWebKey; privateKey: JsonWebKey }>;

export function importActorKeyPairs(material: readonly ActorKeyMaterial[]): Promise<readonly ImportedActorKeyPair[]>;

export interface ActivityPubArrival {
  readonly recipient: string | null;
  readonly activity: Activity;
  readonly jsonLd: unknown;
}

export interface ActivityPubProviderOptions {
  readonly origin?: string;
  readonly identifier: string;
  readonly actorName: string;
  readonly summary: string;
  readonly keyPairs: readonly ImportedActorKeyPair[];
  readonly kv?: KvStore;
  readonly queue?: MessageQueue;
  readonly allowPrivateAddress?: boolean;
  readonly onActivity: (arrival: ActivityPubArrival) => void | Promise<void>;
  readonly authorizeInbox: (input: Readonly<{ identifier: string; request: Request }>) => boolean | Promise<boolean>;
  /** Optional customer-owned bounded history index. Custody is never scanned as an inbox history source. */
  readonly inboxIndex?: Readonly<{
    list: (input: Readonly<{ identifier: string; cursor?: string; limit: number }>) =>
      Readonly<{ items: readonly unknown[]; totalItems: number; nextCursor?: string }> |
      Promise<Readonly<{ items: readonly unknown[]; totalItems: number; nextCursor?: string }>>;
  }>;
  readonly listOutbox: (input: Readonly<{ identifier: string; cursor?: string }>) =>
    Readonly<{ items: readonly Activity[]; nextCursor?: string }> |
    Promise<Readonly<{ items: readonly Activity[]; nextCursor?: string }>>;
  readonly localPosts?: number;
  readonly localComments?: number;
}

export interface ActivityPubProvider {
  readonly origin?: string;
  readonly identifier: string;
  readonly federation: Federation<void>;
  readonly fetch: (request: Request) => Promise<Response>;
}

export function createActivityPubProvider(options: ActivityPubProviderOptions): ActivityPubProvider;
export function deliverActivity(provider: ActivityPubProvider, input: Readonly<{
  activity: unknown;
  recipient: string;
  inbox: string;
}>): Promise<Readonly<{
  type: "Accept";
  actor: string;
  object: Readonly<{ type: "ActivityPubDeliveryReceipt"; activity: string | null; recipient: string; inbox: string; delivered: true }>;
}>>;
