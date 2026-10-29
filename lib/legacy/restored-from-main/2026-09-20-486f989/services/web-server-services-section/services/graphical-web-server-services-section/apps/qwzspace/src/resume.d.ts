// Type declarations for @red-cup-engineering/qwzspace/resume.

export interface ResumeTokenPayload {
  roomId: string;
  actorId: string;
  issuedAtTick: number;
}

export interface ResumeTokens {
  readonly secret: string;
  issue(payload: ResumeTokenPayload): string;
  verify(token: unknown): ResumeTokenPayload | null;
}

export function createResumeTokens(secret?: string): ResumeTokens;

export interface RingBufferEntry<T = unknown> {
  tick: number;
  ack: number;
  delta: T;
}

export interface RingBuffer<T = unknown> {
  push(key: string, entry: RingBufferEntry<T>): void;
  since(key: string, sinceTick: number): RingBufferEntry<T>[] | null;
  drop(key: string): void;
  size(key: string): number;
}

export function createRingBuffer<T = unknown>(capacity: number): RingBuffer<T>;
