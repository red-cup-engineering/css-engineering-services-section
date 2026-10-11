// broadcast-hub — the set of live clients and the per-tick push. LIFTED from
// apps/games/ruinfold/server/sse.mjs (the createHub over node:http responses) and generalized away
// from SSE: a "client" here is anything with a `send(obj) -> boolean` (a write that returns false /
// throws when the client is dead). The canonical SSE application route and the WebSocket transport
// each wrap their connection into that shape. So the hub
// is the one place that owns the client SET and the broadcast loop, independent of wire.
//
// BEST-EFFORT, NEVER-AWAITED writes (ruinfold's discipline preserved): a dead/slow client is
// dropped on the spot, never awaited — one stuck client must not stall the world's per-tick push.
//
// INTEREST. The plain broadcast(obj) sends the same object to everyone (chat, a world banner). For
// the per-tick interest-filtered delta, the tick-driver does NOT broadcast a shared object — it
// asks each client's bound snapshot subscriber for ITS delta and sends that. So the hub exposes
// `each(fn)` to drive a per-client send, and `bind(client, subscriber)` to associate a client with
// its snapshot-manager handle. broadcast() stays for the shared events.
//
//   const hub = createBroadcastHub()
//   const remove = hub.add(client)         // client: { send(obj):bool, [bind a subscriber later] }
//   hub.bind(client, subscriber)           // associate a snapshot-manager subscriber handle
//   hub.broadcast(obj)                     // one shared object to everyone (best-effort)
//   hub.each((client) => {...})            // run fn per live client (for per-client deltas)
//   hub.heartbeat()                        // keep idle/half-open clients alive (transport pings)
//   hub.size()                             // live client count

export function createBroadcastHub() {
  const clients = new Set();
  const bound = new Map(); // client -> snapshot-manager subscriber handle (its interest view)

  // add — register a client. Returns a remove() to call on disconnect (drops it from the set AND
  // its bound subscriber). The client object owns its own wire (send/heartbeat); the hub only holds.
  function add(client) {
    clients.add(client);
    return () => remove(client);
  }

  function remove(client) {
    clients.delete(client);
    const sub = bound.get(client);
    if (sub) {
      try { sub.drop(); } catch {}
      bound.delete(client);
    }
  }

  // bind — associate a client with its snapshot-manager subscriber handle (its interest-filtered
  // view). The tick-driver reads this through subscriberOf() to send each client ITS own delta.
  function bind(client, subscriber) {
    bound.set(client, subscriber);
  }
  const subscriberOf = (client) => bound.get(client) ?? null;

  // send — one object to one client, best-effort. A falsy/thrown write drops the client.
  function send(client, obj) {
    try {
      const ok = client.send(obj);
      if (ok === false) remove(client);
      return ok !== false;
    } catch {
      remove(client);
      return false;
    }
  }

  // broadcast — one shared object to everyone (a chat line, a world banner). The per-tick world push
  // of discrete events; the interest-filtered delta goes through each() instead.
  function broadcast(obj) {
    for (const client of [...clients]) send(client, obj);
  }

  // each — run fn(client, subscriber) for every live client. The tick-driver uses this to send each
  // client its own interest-filtered delta (subscriber.delta(tick) -> client.send). Iterates a copy
  // so a drop mid-loop is safe.
  function each(fn) {
    for (const client of [...clients]) fn(client, bound.get(client) ?? null);
  }

  // heartbeat — ask every client to keep its connection alive (an SSE comment, a WS ping). A client
  // that has no heartbeat method is left alone; a throwing one is dropped.
  function heartbeat() {
    for (const client of [...clients]) {
      if (typeof client.heartbeat !== "function") continue;
      try { client.heartbeat(); } catch { remove(client); }
    }
  }

  return { add, remove, bind, subscriberOf, send, broadcast, each, heartbeat, size: () => clients.size };
}
