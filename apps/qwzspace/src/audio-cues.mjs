// audio-cues — a small, PURE mapping layer from a wire event kind (protocol.mjs's `event(t, payload)`
// — the one extension point a game already rides chat/banners/whatever through, per protocol.mjs's
// own header) to an audio cue id + intensity, plus a tiny dispatcher that calls an INJECTED player.
//
// Deliberately does NOT depend on `@561-group/resonator` (the house's own game-audio kit, being built
// concurrently by another agent) — this module defines the SEAM (`{ play(cueId, opts) }`), the same
// way `spatial-backend.mjs` defines a seam without depending on abrash. Resonator (or a `<audio>` tag,
// or a test double) conforms to that one method later; this module never imports it.

const registry = new Map(); // eventKind -> { cueId, intensity }

export function registerCue(eventKind, cueId, intensity = 1) {
  if (typeof eventKind !== "string" || !eventKind) throw new TypeError("audio-cues: registerCue(eventKind, cueId, intensity) requires a non-empty eventKind");
  if (typeof cueId !== "string" || !cueId) throw new TypeError(`audio-cues: registerCue("${eventKind}", cueId, ...) requires a non-empty cueId`);
  registry.set(eventKind, { cueId, intensity: Number(intensity) || 1 });
  return eventKind;
}
export function unregisterCue(eventKind) {
  return registry.delete(eventKind);
}
export function cueFor(eventKind) {
  return registry.get(eventKind) ?? null;
}
export function listCues() {
  return [...registry.keys()].sort();
}

// createDispatcher(player) — `player` is the injected `{ play(cueId, opts) }` seam. `dispatch(frame)`
// reads EXACTLY the shape protocol.mjs's `event()` produces (`{k:"event", t, ...payload}`) or a raw
// `{k, ...}` frame for anything else client.mjs's WorldView already passes through generically —
// see client.mjs's `apply()`, the `MSG.event` and final generic-passthrough branches. Returns
// whether a cue actually fired (false for an event kind with no registered cue — a silent no-op, not
// an error, since most wire events carry no sound at all).
export function createDispatcher(player) {
  if (!player || typeof player.play !== "function") throw new TypeError("audio-cues: createDispatcher(player) requires player.play(cueId, opts)");
  return {
    dispatch(frame) {
      const kind = typeof frame?.t === "string" ? frame.t : typeof frame?.k === "string" ? frame.k : null;
      if (!kind) return false;
      const cue = registry.get(kind);
      if (!cue) return false;
      player.play(cue.cueId, { intensity: cue.intensity, source: frame });
      return true;
    },
  };
}
