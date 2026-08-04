/**
 * WebSocket claim-session service binding.
 *
 * The pure transfinite claim exchange lives in `src/running/ws-session`. This
 * module binds it to `node:http` upgrade sockets.
 */
import type { Server } from "node:http";
import type { Duplex } from "node:stream";
import { acceptKey, FrameDecoder } from "../../src/writing/http/ws/index.mjs";
import { openSession, type Session } from "../../src/running/session.mjs";
import { exchangeClaim, judgementFrame } from "../../src/running/ws-session.mjs";

/** Attach a transfinite claim-session WebSocket endpoint to an HTTP server. */
export function attachClaimSession(server: Server): Server {
  server.on("upgrade", (req, socket: Duplex) => {
    const key = req.headers["sec-websocket-key"];
    if (typeof key !== "string") {
      socket.destroy();
      return;
    }
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\nConnection: Upgrade\r\n" +
        `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`,
    );
    let session: Session = openSession();
    const decoder = new FrameDecoder();
    socket.on("data", (chunk: Buffer) => {
      for (const frame of decoder.push(chunk)) {
        if (frame.opcode === 0x8) {
          socket.end();
          return;
        }
        if (frame.opcode !== 0x1) continue;
        try {
          const exchanged = exchangeClaim(session, frame.payload.toString("utf-8"));
          session = exchanged.session;
          socket.write(judgementFrame(exchanged.reply));
        } catch (error) {
          socket.write(judgementFrame(JSON.stringify({ error: String(error) })));
        }
      }
    });
    socket.on("error", () => {
      /* client reset; drop the session */
    });
  });
  return server;
}
