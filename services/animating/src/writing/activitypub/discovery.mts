/**
 * writing/activitypub/discovery — the capability-discovery endpoint (memo §13): a client
 * needs to know what the server supports BEFORE it acts. WMAP-native, this also advertises
 * the capability LOCI a client may request (authority by move), not OAuth scopes.
 */
import type { ServedRequest, ServedResponse } from "@red-cup-engineering/relating";
import type { Actor } from "./actor.mjs";
import { outboxWriteLocus } from "./serving.mjs";
import { mediaUploadLocus } from "./media.mjs";

/** What a WMAP server supports, and the capability loci a client may request for an actor. */
export interface ServerCapabilities {
  readonly activityTypes: readonly string[];
  readonly objectTypes: readonly string[];
  readonly features: Readonly<Record<string, boolean>>;
  readonly limits: Readonly<Record<string, number>>;
  /** the capability loci a client requests to act (authority by move, not OAuth scope). */
  readonly loci: readonly string[];
}

/** The capability-discovery document for an actor: feature flags plus the loci a client
 *  may request (broad and kind-attenuated media, outbox-write). */
export function activityPubApi(actor: Actor): ServerCapabilities {
  return {
    activityTypes: ["Create", "Update", "Delete", "Follow", "Accept", "Reject", "Like", "Announce", "Block", "Undo", "Add", "Remove", "Offer"],
    objectTypes: ["Note", "Article", "Image", "Audio", "Video", "Document", "Page"],
    features: { outboxWrite: true, mediaUpload: true, eventStream: true, webfinger: true, capabilityAuth: true, oauthScopeAuth: false },
    limits: { maxRecipients: 5000 },
    loci: [
      outboxWriteLocus(actor.id),
      mediaUploadLocus(actor.id),
      mediaUploadLocus(actor.id, "Image"),
      mediaUploadLocus(actor.id, "Audio"),
      mediaUploadLocus(actor.id, "Video"),
    ],
  };
}

/** Route `GET /.well-known/activitypub-api` (or any GET) to the capabilities document. */
export function routeCapabilities(actor: Actor, request: ServedRequest): ServedResponse {
  if (request.method !== "GET") {
    return { status: 405, type: "application/json; charset=utf-8", body: `{"error":"method not allowed"}\n` };
  }
  return { status: 200, type: "application/json; charset=utf-8", body: `${JSON.stringify(activityPubApi(actor), null, 2)}\n` };
}
