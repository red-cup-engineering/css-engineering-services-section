import { createRealtimeClient, createWorldView } from "./client.mjs";

export * from "./client.mjs";

/** Node's standards-compliant WebSocket with the historical object-send convenience. */
export class NodeWebSocket extends globalThis.WebSocket {
  send(data) {
    super.send(typeof data === "string" ? data : JSON.stringify(data));
  }
}

export function createNodeClient(url) {
  return new NodeWebSocket(url);
}

export function connectRoom(url, { name = "wanderer", onState = null, policyOptions = {}, localId = "me", overlay = null } = {}) {
  const view = createWorldView(localId);
  return createRealtimeClient({
    connect: () => createNodeClient(url), view, name, onState, policyOptions, overlay,
  });
}
