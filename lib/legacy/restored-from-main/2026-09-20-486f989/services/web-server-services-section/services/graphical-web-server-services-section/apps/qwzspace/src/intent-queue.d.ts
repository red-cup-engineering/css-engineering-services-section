// Type declarations for @red-cup-engineering/qwzspace/intent-queue.

export function id(v: unknown): string | null;
export function num(v: unknown): number | null;

export interface IntentQueue<T = unknown> {
  push(raw: unknown): T | null;
  drain(): T[];
  depth(): number;
}

export function createIntentQueue<T = unknown>(options?: {
  validate?: (raw: unknown) => T | null;
}): IntentQueue<T>;
