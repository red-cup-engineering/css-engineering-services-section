// resume — the two small load-bearing pieces of §4's reconnection design: a signed resume token (so
// a client cannot forge another actor's identity to steal their resume, closing the same provenance
// hole §2 closes for intents), and a bounded per-actor ring buffer of the deltas a room already
// computed (the "log is the resume mechanism" — resuming is delivery of what was already produced,
// not a special-cased recomputation).
//
// Uses node:crypto's HMAC (Node core, not an external runtime dependency).

import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { createKeyedNumberedHistory } from "@red-cup-engineering/computer-content-graph-engineering-services-section/event-stream";

// createResumeTokens — one signer/verifier pair bound to one room's secret. `secret` should be stable
// for the room's lifetime (regenerating it invalidates every outstanding resume token, which is the
// correct behavior on a restart with no persisted secret — the honest edge, not a bug).
export function createResumeTokens(secret = randomBytes(32).toString("hex")) {
  function sign(payload) {
    return createHmac("sha256", secret).update(payload).digest("hex");
  }

  return {
    secret,
    // issue — a token binding { roomId, actorId, issuedAtTick }. Opaque to the client: base64 payload
    // + hex HMAC, dot-joined. A client cannot edit the payload without invalidating the signature, so
    // it cannot claim to be a different actorId on resume (the same provenance discipline as §2).
    issue({ roomId, actorId, issuedAtTick }) {
      const payload = Buffer.from(JSON.stringify({ roomId, actorId, issuedAtTick })).toString("base64url");
      return `${payload}.${sign(payload)}`;
    },
    // verify — returns the { roomId, actorId, issuedAtTick } payload, or null if the token is
    // malformed, was signed with a different secret, or has been tampered with. Uses a
    // timing-safe compare so token verification is not a timing oracle for the HMAC.
    verify(token) {
      if (typeof token !== "string") return null;
      const dot = token.indexOf(".");
      if (dot < 0) return null;
      const payload = token.slice(0, dot);
      const mac = token.slice(dot + 1);
      // STRICT hex shape check first: Buffer.from(str, "hex") silently STOPS at the first invalid hex
      // character instead of throwing (a Node quirk) — without this check, a tampered token with
      // garbage appended after a still-valid-prefix mac would decode to the SAME bytes as the
      // genuine mac and wrongly verify. sha256 hex digests are always exactly 64 lowercase hex chars.
      if (!/^[0-9a-f]{64}$/.test(mac)) return null;
      const expected = sign(payload);
      const a = Buffer.from(mac, "hex");
      const b = Buffer.from(expected, "hex");
      if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
      try {
        const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        if (typeof parsed?.roomId !== "string" || typeof parsed?.actorId !== "string") return null;
        return parsed;
      } catch {
        return null;
      }
    },
  };
}

// createRingBuffer — a bounded, per-key (per-actor) FIFO of the last `capacity` entries. Room uses
// this to hold each subscriber's last N ticks of already-computed deltas, so a resuming client within
// the window is served exactly what it would have received had it never dropped — no recomputation.
export function createRingBuffer(capacity) {
  return createKeyedNumberedHistory(capacity, { numberOf: (entry) => entry.tick });
}
