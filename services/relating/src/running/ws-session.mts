// running/ws-session — the transfinite transport over a WebSocket frame loop.
//
// A WebSocket carries the bounded interactive claim session: each text frame is a
// claim `{cell, charge}` advancing the monotone log, and the reply frame is the
// settled judgement (per-cell verdict, contested cells, regime). The pure core
// (`exchangeClaim`, text → text) is split from the ws-frame encoder and the
// node-socket binding, exactly as `routeRequest` is split from `serve`. Nothing is
// overwritten: a contradicting claim flips a cell's verdict to ⊤ (`stable`) with no
// retraction.

import { encodeFrame } from "../writing/http/ws/index.mjs";
import {
  isChargeValueName,
  type ChargeValueName,
} from "../../lib/articulating/predicating/positing/bilattice-charge.mjs";
import { claim, conflicts, judge, sessionRegime, type Session } from "./session.mjs";

/** One claim carried on a frame: a charged predication about a cell. */
export interface ClaimMessage {
  readonly cell: string;
  readonly charge: ChargeValueName;
}

/** Parse and validate a claim message from frame text; throws on a malformed claim. */
export function parseClaimMessage(text: string): ClaimMessage {
  const value: unknown = JSON.parse(text);
  const cell = (value as { cell?: unknown })?.cell;
  const charge = (value as { charge?: unknown })?.charge;
  if (typeof cell !== "string" || typeof charge !== "string" || !isChargeValueName(charge)) {
    throw new TypeError("ws-session: not a {cell:string, charge:ChargeValueName} claim");
  }
  return { cell, charge };
}

/** The settled judgement reply for a session: per-cell verdict, contested cells, and
 *  the regime (`scott` until a cell conflicts, then `transfinite`). */
export function judgementReply(session: Session): string {
  return JSON.stringify({
    judgement: Object.fromEntries(judge(session)),
    conflicts: conflicts(session),
    regime: sessionRegime(session),
  });
}

/** Apply one claim message (frame text) to the session, returning the advanced
 *  session and the judgement reply text — the pure core of the WS loop. */
export function exchangeClaim(
  session: Session,
  messageText: string,
): { readonly session: Session; readonly reply: string } {
  const message = parseClaimMessage(messageText);
  const next = claim(session, message.cell, message.charge);
  return { session: next, reply: judgementReply(next) };
}

/** Encode a judgement reply as a WebSocket text frame (opcode 0x1, fin). */
export function judgementFrame(reply: string): Buffer {
  return encodeFrame(0x1, Buffer.from(reply, "utf-8"));
}
