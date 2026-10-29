// Type declarations for @red-cup-engineering/qwzspace/intent-log.

export interface IntentRecord {
  tick: number;
  seq: number;
  actorId: string;
  kind: string;
  args: Record<string, unknown>;
}
export type RawIntentRecord = Partial<IntentRecord> & { tick: unknown; seq: unknown; actorId: unknown; kind: unknown };

export function canonicalRecord(rec: RawIntentRecord): IntentRecord;
export function canonicalJSON(rec: RawIntentRecord): string;
export function roomHash(log: readonly RawIntentRecord[], seed?: unknown): string;

export interface IntentLog {
  append(rec: RawIntentRecord): IntentRecord;
  all(): IntentRecord[];
  since(tick: number): IntentRecord[];
  upto(tick: number): IntentRecord[];
  length(): number;
  hash(uptoTick?: number): string;
  readonly seed: unknown;
}

export function createIntentLog(seed?: unknown): IntentLog;
