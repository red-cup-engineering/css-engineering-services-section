
import {
  httpSseTransportObservationContract,
} from "./schema.mjs";

export {

  writeSseEvent,
  writeSseComment,
  createProjectedEventHub,
} from "@red-cup-engineering/computer-web-server/events";

/** The SSE transport observation: the declared framing, no ceremony. */
export function observeSseTransport(boundary) {
  void boundary;
  return Object.freeze({ kind: "metroplat.http.sse-transport-observation", operation: "write-sse-frames" });
}
