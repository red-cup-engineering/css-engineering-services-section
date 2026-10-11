// prove-audio-cues — the pure event-kind -> cue mapping + dispatcher, exercised against a fake
// player (never a real audio engine, and never `@561-group/resonator` — see audio-cues.mjs's header
// on why this module defines the seam rather than depending on a concrete implementation).

import { ok, eq, done } from "./_harness.mjs";
import { registerCue, unregisterCue, cueFor, listCues, createDispatcher } from "../src/audio-cues.mjs";
import { test } from "node:test";

test("prove-audio-cues", async () => {

registerCue("test-chat", "cue.chat", 0.5);
registerCue("test-jackpot", "cue.jackpot", 1);

eq(cueFor("test-chat"), { cueId: "cue.chat", intensity: 0.5 }, "registerCue stores cueId + intensity, retrievable via cueFor");
ok(listCues().includes("test-jackpot"), "listCues enumerates registered event kinds");
eq(cueFor("no-such-event"), null, "an unregistered event kind resolves to null, not a throw");

// === createDispatcher validates its player ==========================================================
{
  let threw = false;
  try {
    createDispatcher({});
  } catch {
    threw = true;
  }
  ok(threw, "createDispatcher rejects a player with no play() method");
}

// === dispatch: protocol.mjs's event(t, payload) shape ({k:"event", t, ...payload}) ================
{
  const played = [];
  const dispatcher = createDispatcher({ play: (cueId, opts) => played.push({ cueId, opts }) });
  const fired = dispatcher.dispatch({ k: "event", t: "test-jackpot", amount: 500 });
  ok(fired, "dispatch returns true when a cue actually fires");
  eq(played.length, 1, "the injected player's play() was called exactly once");
  eq(played[0].cueId, "cue.jackpot", "the correct cueId is played for the event kind");
  eq(played[0].opts.intensity, 1, "the registered intensity is passed through in opts");
  eq(played[0].opts.source, { k: "event", t: "test-jackpot", amount: 500 }, "the original frame is passed through as opts.source");
}

// === dispatch: a generic passthrough frame keyed only by `k` (no `t`) still resolves ===============
{
  const played = [];
  const dispatcher = createDispatcher({ play: (cueId) => played.push(cueId) });
  registerCue("resumed", "cue.reconnect");
  dispatcher.dispatch({ k: "resumed" });
  eq(played, ["cue.reconnect"], "a frame with no `t` falls back to `k` as the event kind");
}

// === dispatch: an event kind with no registered cue is a silent no-op, not an error ================
{
  const played = [];
  const dispatcher = createDispatcher({ play: () => played.push(1) });
  const fired = dispatcher.dispatch({ k: "event", t: "no-cue-for-this" });
  eq(fired, false, "dispatch returns false when no cue is registered for the event kind");
  eq(played.length, 0, "the player's play() is never called for an unmapped event kind");
}

// === unregisterCue removes a mapping =================================================================
{
  unregisterCue("test-chat");
  eq(cueFor("test-chat"), null, "unregisterCue removes the mapping");
}

done("prove-audio-cues");
});
