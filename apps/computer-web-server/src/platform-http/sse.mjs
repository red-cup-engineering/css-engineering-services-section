

/**
 * Live Node SSE socket binding for the pure HTTP SSE transport projection.
 */

import { sseCommentFrame, sseFrame, sseHeaders } from "@red-cup-engineering/computer-serialized-content-engineering-services-section/services/http-data-services-section/src/server-sent-event";
import {
  observeSseTransport,

} from "./sse-transport.mjs";

export function sse(req, res, onClose) {
  res.writeHead(200, sseHeaders());
  res.flushHeaders?.();

  req.socket.setTimeout(0);
  req.socket.setNoDelay(true);
  res.on("close", () => onClose?.());

  const observation = observeSseTransport(Object.freeze({
    method: req.method ?? null,
    url: req.url ?? null,
    contentType: "text/event-stream",
    cacheControl: "no-cache",
    connection: "keep-alive",
    lastEventId: typeof req.headers["last-event-id"] === "string" ? req.headers["last-event-id"] : null,
  }));

  return {
    ...observation,
    send(event, data, id) { res.write(sseFrame(event, data, id)); },
    comment(text) { res.write(sseCommentFrame(text)); },
    close() { res.end(); },
  };
}
