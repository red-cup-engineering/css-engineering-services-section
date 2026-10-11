// client-browser — the browser-side transport wrapper. NEW glue only (per §7): a browser's native
// `WebSocket` already implements the WebSocketLike surface `client.mjs`'s createRealtimeClient
// expects (readyState/send/close/onopen/onclose/onerror/onmessage) — there is nothing to hand-roll
// here, unlike client-node.mjs. This file exists to give a browser consumer a one-line `connectRoom`
// entry point instead of wiring createRealtimeClient + createWorldView by hand, and to re-export the
// isomorphic core so a single import covers everything a browser client needs.
//
// No `node:` imports; this file is meant to ship as-is to a browser (a native ESM `<script type=
// "module">` import, matching this package's existing zero-bundler discipline — see
// the canonical computer web server static capability).

import { createRealtimeClient, createWorldView } from "./client.mjs";

export * from "./client.mjs";

// connectRoom — open a room connection over the browser's native WebSocket. `localId` is a
// placeholder until the server's `hello` assigns the real one (see client.mjs's WorldView.setLocalId,
// which createRealtimeClient calls automatically on a fresh, non-resuming connection).
export function connectRoom(url, { name = "wanderer", onState = null, policyOptions = {}, localId = "me", overlay = null } = {}) {
  const view = createWorldView(localId);
  return createRealtimeClient({
    connect: () => new WebSocket(url),
    view,
    name,
    onState,
    policyOptions,
    overlay,
  });
}
