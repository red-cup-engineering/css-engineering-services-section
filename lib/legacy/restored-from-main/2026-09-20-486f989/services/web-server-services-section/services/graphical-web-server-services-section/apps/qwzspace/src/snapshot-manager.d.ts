// Type declarations for @red-cup-engineering/qwzspace/snapshot-manager.

export interface FullFrame<E = unknown> {
  type: "full";
  tick: number;
  entities: E[];
}
export interface DeltaFrame<E = unknown> {
  type: "delta";
  tick: number;
  entities: E[];
  removed: string[];
}
export interface AckedDeltaFrame<E = unknown> extends DeltaFrame<E> {
  ack: number;
}

export interface SnapshotSubscriber<E = unknown> {
  id: unknown;
  full(tick: number): FullFrame<E>;
  delta(tick: number, ack?: number): AckedDeltaFrame<E>;
  drop(): void;
}

export interface SnapshotManager<E = unknown> {
  bootstrap(tick: number): Promise<FullFrame<E>>;
  resettle(dirty: Iterable<string>, tick: number): Promise<DeltaFrame<E>>;
  full(tick: number): FullFrame<E>;
  subscribe(subscriberId: unknown): SnapshotSubscriber<E>;
  has(id: string): boolean;
  size(): number;
}

export function createSnapshotManager<E = unknown>(options: {
  subjectsOf: (tick: number) => Iterable<string> | Promise<Iterable<string>>;
  snapOf: (id: string, tick: number) => E | null | Promise<E | null>;
  interest?: ((id: string, subscriberId: unknown) => boolean) | null;
}): SnapshotManager<E>;
