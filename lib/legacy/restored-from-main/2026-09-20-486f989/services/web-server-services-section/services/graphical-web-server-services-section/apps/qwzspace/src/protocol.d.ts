// Type declarations for @red-cup-engineering/qwzspace/protocol.

export const PROTOCOL_VERSION: 1;

export const MSG: Readonly<{
  hello: "hello";
  join: "join";
  intent: "intent";
  snapshot: "snapshot";
  delta: "delta";
  event: "event";
  bye: "bye";
}>;

export type ViewEntry = Record<string, unknown> & { id: string };

export interface HelloMessage {
  k: "hello";
  v: number;
  id: string | null;
  world: unknown;
}
export interface SnapshotMessage {
  k: "snapshot";
  tick: number;
  you: string | null;
  e: ViewEntry[];
}
export interface DeltaMessage {
  k: "delta";
  tick: number;
  ack: number;
  c: ViewEntry[];
  g: string[];
}
export interface EventMessage {
  k: "event";
  t: string;
  [key: string]: unknown;
}
export interface ByeMessage {
  k: "bye";
  id: string;
}
export interface JoinMessage {
  k: "join";
  name: string;
}
export interface IntentMessage {
  k: "intent";
  seq: number;
  [key: string]: unknown;
}
export type WireMessage = HelloMessage | SnapshotMessage | DeltaMessage | EventMessage | ByeMessage | JoinMessage | IntentMessage;

export function hello(id: string | null, world?: unknown): HelloMessage;
export function snapshot(tick: number, you: string | null, entries: ViewEntry[]): SnapshotMessage;
export function delta(tick: number, ack: number, changed: ViewEntry[], gone: string[]): DeltaMessage;
export function event(t: string, payload?: Record<string, unknown>): EventMessage;
export function chat(from: string, line: string): EventMessage;
export function bye(id: string): ByeMessage;
export function join(name: unknown): JoinMessage;
export function intent(seq: number, body: Record<string, unknown>): IntentMessage;

/** The marker key under which packed entry groups travel: `{ "$p": [[keys, rows], ...] }`. */
export const PACKED_ENTRIES: "$p";
export interface PackedEntries { "$p": Array<[string[], unknown[][]]>; }

/** Group entries by exact key signature; returns the same array when packing would not pay. */
export function packEntries(entries: ViewEntry[]): ViewEntry[] | PackedEntries;
/** Restore entries from a packed group set; a plain array is returned as-is, garbage yields []. */
export function unpackEntries(value: unknown): ViewEntry[];
/** Pack a snapshot's `e` or a delta's `c`; any other message is returned unchanged (same object). */
export function packMessage<T>(msg: T): T | (SnapshotMessage & { e: PackedEntries }) | (DeltaMessage & { c: PackedEntries });
export function unpackMessage<T>(msg: T): T | SnapshotMessage | DeltaMessage;

/** `pack: true` applies entry packing to snapshot/delta frames; `decode` always understands both shapes. */
export function encode(msg: unknown, options?: { pack?: boolean }): string;
export function decode(text: unknown): WireMessage | null;
