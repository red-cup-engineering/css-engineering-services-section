// Type declarations for @red-cup-engineering/qwzspace/http-ws-server.

import type { Server } from "node:http";

export class Conn {
  onMessage: ((text: string) => void) | null;
  onClose: (() => void) | null;
  send(text: string | unknown): boolean;
  close(): void;
}

export function attach(server: Server, onConnection: (conn: Conn) => void): void;

export interface WsHubClient {
  conn: Conn;
  lastSeq: number;
  send(obj: unknown): boolean;
  heartbeat(): true;
}
/** `pack` routes object sends through protocol.mjs's entry packing; a pre-encoded string is sent as-is. */
export function wsClient(conn: Conn, options?: { pack?: boolean }): WsHubClient;

export function staticHandler(root: string, index?: string): (req: unknown, res: unknown) => Promise<void>;
