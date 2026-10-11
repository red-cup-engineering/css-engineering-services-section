

/**
 * Node HTTP request admission for the pure running served-request shape.
 */

import { readTextBody } from "@red-cup-engineering/http-services-section/body";

export function lastEventIdOf(req) {
  const id = req.headers["last-event-id"];
  return typeof id === "string" ? id : undefined;
}

export async function servedRequestBody(req) {
  if (req.method !== "POST") return "";
  return readTextBody(req, {});
}

export async function servedRequest(req) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const query = {};
  for (const [key, value] of url.searchParams) query[key] = value;
  const accept = req.headers["accept"];
  const idempotencyKey = req.headers["idempotency-key"];
  return {
    method: req.method ?? "GET",
    path: url.pathname,
    query,
    body: await servedRequestBody(req),
    accept: typeof accept === "string" ? accept : undefined,
    lastEventId: lastEventIdOf(req),
    idempotencyKey: typeof idempotencyKey === "string" ? idempotencyKey : undefined,
  };
}
