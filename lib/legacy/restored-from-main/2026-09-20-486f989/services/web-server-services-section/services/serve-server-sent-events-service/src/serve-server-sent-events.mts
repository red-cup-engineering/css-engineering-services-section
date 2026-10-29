import type { IncomingMessage, ServerResponse } from "node:http";
import {
  sseCommentFrame,
  sseFrame,
  sseHeaders,
} from "@red-cup-engineering/code-server-sent-event-service";

export type SseWriter = {
  send(event: string, data: unknown, id?: string): void;
  comment(text: string): void;
  close(): void;
};

export function sse(req: IncomingMessage, res: ServerResponse, onClose?: () => void): SseWriter {
  res.writeHead(200, sseHeaders());
  res.flushHeaders?.();
  req.socket.setTimeout(0);
  req.socket.setNoDelay(true);
  res.on("close", () => onClose?.());
  return {
    send(event, data, id) { res.write(sseFrame(event, data, id)); },
    comment(text) { res.write(sseCommentFrame(text)); },
    close() { res.end(); },
  };
}
