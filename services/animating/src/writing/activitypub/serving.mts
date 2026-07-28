/**
 * writing/activitypub/serving — the LIVE transport for the agent's across face: the
 * ActivityPub HTTP surface, in lib (NOT in a site). Same separation as relating's
 * `running/serving`: pure routing here; the `node:http` binding (`serve`) and the
 * per-instance config live downstream (a site parameterizes this; it does not define it).
 *
 * The agent IS a perceive→act loop, and that loop's two legs are the AP endpoints:
 *   GET  {actor}            → the Actor document            (who the agent is)
 *   GET  {actor}/outbox     → the outbox OrderedCollection  (the act leg, published)
 *   GET  {actor}/inbox      → the inbox OrderedCollection   (received)
 *   POST {actor}/inbox      → accept a delivered Activity    (the perceive leg) → 202
 *   GET  /.well-known/webfinger?resource=acct:user@host → the WebFinger JRD
 *
 * Pure: `routeActor` maps a `ServedRequest` to a `ServedResponse` and never performs
 * I/O. Folding a posted Activity into the agent is the caller's `perceiveInbox`; the
 * route acknowledges receipt (202). Responses carry `application/activity+json`.
 */
import type { ServedRequest, ServedResponse } from "@red-cup-engineering/relating";
import type { Actor } from "./actor.mjs";
import { orderedCollection, type OrderedCollection } from "./collections.mjs";
import { ACTIVITYSTREAMS_CONTEXT, type Activity } from "./index.mjs";
import { canInvoke, type Capability } from "./capability.mjs";

/** The ActivityPub content type — AS2 over JSON-LD. */
export const ACTIVITY_JSON = 'application/activity+json' as const;

/** An AS2 JSON response. */
function apJson(value: unknown, status = 200): ServedResponse {
  return { status, type: `${ACTIVITY_JSON}; charset=utf-8`, body: `${JSON.stringify(value, null, 2)}\n` };
}

/** The last path segment (the AP endpoint selector), trailing slashes trimmed. */
function endpoint(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  const slash = trimmed.lastIndexOf("/");
  return slash === -1 ? trimmed : trimmed.slice(slash + 1);
}

/**
 * routeActor — the pure ActivityPub HTTP surface for one agent. Reads serve the Actor,
 * its inbox, and its outbox; a POST to the inbox is the perceive leg and is
 * acknowledged with 202 (the caller folds the parsed Activity via `perceiveInbox`).
 * `inbox` defaults to the empty collection.
 */
export function routeActor(
  actor: Actor,
  outbox: OrderedCollection,
  request: ServedRequest,
  inbox: OrderedCollection = orderedCollection([]),
): ServedResponse {
  const seg = endpoint(request.path);
  if (request.method === "POST" && seg === "inbox") {
    return { status: 202, type: `${ACTIVITY_JSON}; charset=utf-8`, body: "" }; // accepted; caller perceives
  }
  if (request.method === "GET" && seg === "outbox") return apJson(outbox);
  if (request.method === "GET" && seg === "inbox") return apJson(inbox);
  if (request.method === "GET") return apJson(actor); // the actor document (/, /actor, /users/:name)
  return { status: 405, type: `${ACTIVITY_JSON}; charset=utf-8`, body: `{"error":"method not allowed"}\n` };
}

// ── the C2S write path: capability-gated outbox POST (auth by move, not OAuth scope) ──

/** The locus a capability must grant to write an actor's outbox. Holding (and being able
 *  to invoke) this capability authorizes acting as the actor over C2S — delegable and
 *  attenuable like any capability, no credential sharing. */
export function outboxWriteLocus(actorId: string): string {
  return `${actorId}|outbox:write`;
}

/** The AS2 activity types (a submitted object of any other type is wrapped in Create). */
const ACTIVITY_TYPES: ReadonlySet<string> = new Set([
  "Create", "Update", "Delete", "Follow", "Accept", "Reject", "Add", "Remove",
  "Like", "Announce", "Block", "Undo", "Offer", "Invite", "Invoke", "Question",
]);

let MINTED = 0;
/** Mint a server-canonical activity id under the actor (the server owns local ids). */
function mintActivityId(actorId: string): string {
  MINTED += 1;
  return `${actorId}/activities/${MINTED}`;
}

/** Wrap a non-Activity object in a `Create`, carrying its addressing up (AP §6). */
function wrapInCreate(object: Activity["object"], actorId: string, id: string, addressing: { to?: readonly string[] | undefined; cc?: readonly string[] | undefined }): Activity {
  return {
    "@context": ACTIVITYSTREAMS_CONTEXT,
    id,
    type: "Create",
    actor: actorId,
    object,
    ...(addressing.to === undefined ? {} : { to: [...addressing.to] }),
    ...(addressing.cc === undefined ? {} : { cc: [...addressing.cc] }),
  };
}

/** The outcome of a C2S outbox write: the response, and (on success) the canonical
 *  `Create`/Activity the server minted — the caller runs `act`/`deliver` over it and the
 *  serve-binding sets `Location: created.id` (ServedResponse carries no header map). */
export interface OutboxWrite {
  readonly response: ServedResponse;
  readonly created?: Activity;
}

/**
 * postOutbox — the C2S write path, authorized WMAP-native by CAPABILITY. The requester
 * presents a `capability`; it must grant this actor's `outboxWriteLocus` and be
 * exercisable against `affordances` (`canInvoke` — authority by move, not by token
 * bearing). On success the server is authority: it wraps a non-Activity object in
 * `Create`, sets the actor, mints a canonical id, and returns `201` with the created
 * Activity (the binding sets `Location`). A bad capability is `403`; a bad body `400`.
 */
export function postOutbox(
  actor: Actor,
  request: ServedRequest,
  capability: Capability,
  affordances: readonly string[],
): OutboxWrite {
  const locus = outboxWriteLocus(actor.id);
  if (capability.grants !== locus || !canInvoke(affordances, capability)) {
    return { response: { status: 403, type: `${ACTIVITY_JSON}; charset=utf-8`, body: `{"error":"capability does not authorize outbox:write for ${actor.id}"}\n` } };
  }
  let body: Record<string, unknown>;
  try {
    const value: unknown = JSON.parse(request.body);
    if (typeof value !== "object" || value === null) throw new Error("not an object");
    body = value as Record<string, unknown>;
  } catch {
    return { response: { status: 400, type: `${ACTIVITY_JSON}; charset=utf-8`, body: `{"error":"body is not a JSON object"}\n` } };
  }
  const id = mintActivityId(actor.id);
  const type = typeof body["type"] === "string" ? (body["type"] as string) : "";
  const to = Array.isArray(body["to"]) ? (body["to"] as string[]) : undefined;
  const cc = Array.isArray(body["cc"]) ? (body["cc"] as string[]) : undefined;
  // Server is authority: ignore any client id, bind the actor, wrap bare objects in Create.
  const created: Activity = ACTIVITY_TYPES.has(type)
    ? ({ ...body, id, actor: actor.id } as unknown as Activity)
    : wrapInCreate(body as unknown as Activity["object"], actor.id, id, { to, cc });
  return {
    response: { status: 201, type: `${ACTIVITY_JSON}; charset=utf-8`, body: `${JSON.stringify(created, null, 2)}\n` },
    created,
  };
}

/** Parse a posted inbox Activity from a request body (null if it is not valid JSON). */
export function parseInboxActivity(request: ServedRequest): Activity | null {
  try {
    const value = JSON.parse(request.body) as Activity;
    return typeof value === "object" && value !== null ? value : null;
  } catch {
    return null;
  }
}

/** A WebFinger JRD resolving `acct:user@host` to the Actor's id — the discovery leg
 *  that lets a remote instance find this agent's Actor from a handle. */
export function webfinger(actor: Actor, resource: string): ServedResponse {
  return {
    status: 200,
    type: "application/jrd+json; charset=utf-8",
    body: `${JSON.stringify({
      subject: resource,
      links: [{ rel: "self", type: ACTIVITY_JSON, href: actor.id }],
    }, null, 2)}\n`,
  };
}
