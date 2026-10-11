import { MessageDecoder, acceptKey, encodeFrame } from "@red-cup-engineering/code-websocket-frame-service";
import { encode } from "@red-cup-engineering/computer-networking-engineering-services-section/qwzspace/protocol";

const MAX_PAYLOAD = 1024 * 1024;

export function attach(server, onConnection) {
  server.on("upgrade", (req, socket, head) => {
    const key = req.headers["sec-websocket-key"];
    if (req.headers.upgrade?.toLowerCase() !== "websocket" || typeof key !== "string") {
      socket.destroy();
      return;
    }
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`,
    );
    const conn = new Conn(socket);
    onConnection(conn);
    if (head.length) conn._onData(head);
  });
}

class Conn {
  constructor(socket) {
    this.socket = socket;
    this.onMessage = null;
    this.onClose = null;
    this._decoder = new MessageDecoder({ maxPayload: MAX_PAYLOAD, requireMasked: true });
    this._open = true;
    socket.on("data", (chunk) => this._onData(chunk));
    socket.on("close", () => this._fireClose());
    socket.on("error", () => this._fireClose());
    socket.setNoDelay(true);
  }

  send(value) {
    if (!this._open) return false;
    try {
      const text = typeof value === "string" ? value : JSON.stringify(value);
      this.socket.write(encodeFrame(0x1, Buffer.from(text, "utf8")));
      return true;
    } catch {
      this._fireClose();
      return false;
    }
  }

  close(code = 1000) {
    if (!this._open) return;
    try {
      const payload = Buffer.allocUnsafe(2);
      payload.writeUInt16BE(code);
      this.socket.write(encodeFrame(0x8, payload));
      this.socket.end();
    } catch {}
    this._fireClose();
  }

  _fireClose() {
    if (!this._open) return;
    this._open = false;
    this.onClose?.();
  }

  _protocolClose(code) {
    this.close(code);
  }

  _onData(chunk) {
    for (const message of this._decoder.push(chunk)) {
      if (message.kind === "too-large") return this._protocolClose(1009);
      if (message.kind === "protocol-error") return this._protocolClose(1002);
      if (message.kind === "close") return this.close();
      if (message.kind === "ping") {
        this.socket.write(encodeFrame(0xA, message.payload));
        continue;
      }
      if (message.kind === "data" && message.opcode === 1) this._message(message.payload);
    }
  }

  _message(payload) {
    this.onMessage?.(payload.toString("utf8"));
  }
}

// wsClient — wrap a Conn into the broadcast-hub's client shape. Objects are serialized through
// protocol.mjs's `encode` (so `pack` applies the entry-packing seam); a pre-encoded string is sent as-is.
export function wsClient(conn, { pack = false } = {}) {
  return {
    conn,
    lastSeq: 0,
    send(obj) { return conn.send(typeof obj === "string" ? obj : encode(obj, { pack })); },
    heartbeat() { return true; },
  };
}
