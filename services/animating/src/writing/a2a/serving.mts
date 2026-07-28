/**
 * writing/a2a/serving — pure A2A HTTP projection for discovery and task send.
 *
 * Like ActivityPub's `routeActor`/`webfinger`, this is value-level routing only. A
 * downstream site/server supplies the actual socket, auth ingress, and persistence.
 */
import type { ServedRequest, ServedResponse } from "@red-cup-engineering/relating";
import { canInvoke, type Capability } from "../activitypub/capability.mjs";
import {
  A2A_AGENT_CARD_LEGACY_PATH,
  A2A_AGENT_CARD_PATH,
  a2aTaskFromCapability,
  type A2ATask,
  type AgentCard,
} from "./index.mjs";

export const A2A_JSON = "application/json" as const;

function json(value: unknown, status = 200): ServedResponse {
  return { status, type: `${A2A_JSON}; charset=utf-8`, body: `${JSON.stringify(value, null, 2)}\n` };
}

function normalizedPath(path: string): string {
  const noQuery = path.split("?", 1)[0] ?? path;
  return noQuery.replace(/\/+$/, "") || "/";
}

/** Route the public Agent Card at the current well-known path and the legacy alias. */
export function routeAgentCard(card: AgentCard, request: ServedRequest): ServedResponse {
  if (request.method !== "GET") return json({ error: "method not allowed" }, 405);
  const path = normalizedPath(request.path);
  if (path === A2A_AGENT_CARD_PATH || path === A2A_AGENT_CARD_LEGACY_PATH || path.endsWith(A2A_AGENT_CARD_PATH) || path.endsWith(A2A_AGENT_CARD_LEGACY_PATH)) {
    return json(card);
  }
  return json({ error: "not found" }, 404);
}

export interface A2ATaskPost {
  readonly response: ServedResponse;
  readonly task?: A2ATask;
}

/**
 * postA2aTask — accept an A2A task/message only when the presented capability names
 * a move the receiving agent actually holds. On success this produces the A2A Task
 * envelope; execution is the caller's skill/capability runner.
 */
export function postA2aTask(
  request: ServedRequest,
  capability: Capability,
  affordances: readonly string[],
): A2ATaskPost {
  if (request.method !== "POST") return { response: json({ error: "method not allowed" }, 405) };
  if (!canInvoke(affordances, capability)) {
    return { response: json({ error: `capability does not authorize ${capability.grants}` }, 403) };
  }
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = request.body.trim() === "" ? {} : JSON.parse(request.body);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return { response: json({ error: "body is not a JSON object" }, 400) };
  }
  const id = typeof body.id === "string" ? body.id : undefined;
  const contextId = typeof body.contextId === "string" ? body.contextId : undefined;
  const skillId = typeof body.skillId === "string" ? body.skillId : undefined;
  const prompt = typeof body.prompt === "string" ? body.prompt : undefined;
  const task = a2aTaskFromCapability(capability, {
    ...(id === undefined ? {} : { id }),
    ...(contextId === undefined ? {} : { contextId }),
    ...(skillId === undefined ? {} : { skillId }),
    ...(prompt === undefined ? {} : { prompt }),
  });
  return { response: json(task, 202), task };
}
