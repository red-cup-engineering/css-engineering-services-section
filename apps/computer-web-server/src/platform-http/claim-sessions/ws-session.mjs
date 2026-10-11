
// running/ws-session — the transfinite transport over a WebSocket frame loop.
//
// A WebSocket carries the bounded interactive claim session: each text frame is a
// claim `{cell, reading}` advancing the monotone log, and the reply frame is the
// settled judgement (per-cell verdict, contested cells, regime). The pure core
// (`exchangeClaim`, text → text) is split from the ws-frame encoder and the
// node-socket binding, exactly as `routeRequest` is split from `serve`. Nothing is
// overwritten: a contradicting claim flips a cell's verdict to ⊤ (`contested`) with no
// retraction.

import { parse as parseJson } from "@red-cup-engineering/json-services-section";
import { address, utteranceCell } from "@red-cup-engineering/signcell/cell";
import { judgementFrame } from "./ws-frame.mjs";
import { claim, claimSessionObservation, isSessionReading, sessionJudgement } from "@red-cup-engineering/relating/running/session";

/** An uttered claim's reflexive SignCell and its address. */
const utteredCell = (token, claim) => { const told = utteranceCell(token, claim); return Object.freeze({ cell: told, address: address(told) }); };


/** One claim carried on a frame: a read predication about a cell. */

/** Parse and validate a claim message from frame text; throws on a malformed claim.
 *
 *  Two frame shapes are admitted. `{token, claim, reading}` is the properly
 *  admitted form — the sender's own identity and its assertion, the minimal
 *  principled pair `Utterance` needs — and this function derives the real
 *  predication cell and its canonical address (`core/persistence`'s
 *  `utteredCell`) rather than trusting a caller-invented `cell`
 *  string. `{cell, reading}` is still admitted unchanged for senders that
 *  already have a real address (e.g. one derived from a `JuralRelation`). */
export function parseClaimMessage(text) {
  const value = parseJson(text);
  const record = value;
  const reading = record?.reading;
  if (typeof reading !== "string" || !isSessionReading(reading)) {
    throw new TypeError("ws-session: not a {cell:string, reading:ReadingName} or {token, claim, reading:ReadingName} claim");
  }
  if (record.token !== undefined && record.claim !== undefined) {
    const identity = utteredCell(record.token, record.claim);
    return { cell: identity.address, reading };
  }
  if (typeof record.cell !== "string") {
    throw new TypeError("ws-session: not a {cell:string, reading:ReadingName} or {token, claim, reading:ReadingName} claim");
  }
  return { cell: record.cell, reading };
}

/** The settled judgement reply for a session: per-cell verdict, contested cells, and
 *  the regime (`scott` until a cell conflicts, then `transfinite`). */
export function judgementReply(session) {
  return JSON.stringify(sessionJudgement(session));
}

/** Apply one claim message (frame text) to the session, returning the advanced
 *  session and the judgement reply text — the pure core of the WS loop. */
export function exchangeClaim(
  session,
  messageText,
) {
  const message = parseClaimMessage(messageText);
  const next = claim(session, message.cell, message.reading);
  return { session: next, reply: judgementReply(next) };
}

export { judgementFrame } from "./ws-frame.mjs";

/** Construct the carried claim-session event represented by one accepted WebSocket text frame. */
export function websocketClaimSessionObservation(input) {
  return claimSessionObservation({
    sessionId: input.sessionId,
    transport: "websocket-session",
    claim: input.message,
    session: input.session,
    judgement: parseJson(input.reply),
    at: input.at,
    boundary: Object.freeze({ transport: "websocket-session", frame: "text", operation: "claim" }),
    caller: Object.freeze({ transport: "websocket-session", session: input.sessionId }),
  });
}
