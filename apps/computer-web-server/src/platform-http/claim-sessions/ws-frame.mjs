
import { encodeFrame } from "@red-cup-engineering/code-websocket-frame-service";

/** Encode a judgement reply as a WebSocket text frame (opcode 0x1, fin). */
export function judgementFrame(reply) {
  return encodeFrame(0x1, Buffer.from(reply, "utf-8"));
}
