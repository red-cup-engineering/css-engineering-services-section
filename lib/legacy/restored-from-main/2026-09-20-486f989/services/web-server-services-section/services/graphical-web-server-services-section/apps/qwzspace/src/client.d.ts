// Type declarations for @red-cup-engineering/qwzspace/client.

export type ClientEntity = Record<string, unknown> & {
  id: string;
  x?: number;
  y?: number;
  z?: number;
  yaw?: number;
  tx?: number;
  ty?: number;
  tz?: number;
  tyaw?: number;
};
export type ClientFrame =
  | { type: "full"; tick?: number; entities?: readonly ClientEntity[] }
  | { type: "delta"; tick?: number; entities?: readonly ClientEntity[]; removed?: readonly string[] }
  | Record<string, unknown>;

export interface InterpolationBufferOptions {
  delayMs?: number;
  maxSamples?: number;
  extrapolateMs?: number;
  now?: () => number;
}
export interface InterpolationBracket {
  left: { tick: number; entities: readonly ClientEntity[] };
  right: { tick: number; entities: readonly ClientEntity[] };
  alpha: number;
  mode: "before" | "between" | "extrapolate" | "after";
}
export interface InterpolationBuffer {
  push(frame: ClientFrame, receivedAtMs?: number): boolean;
  sample(renderTimeMs?: number): readonly ClientEntity[];
  sampleBrackets(renderTimeMs?: number): InterpolationBracket | null;
  latestTick(): number;
  latestSample(): { timeMs: number; tick: number; entities: readonly ClientEntity[] } | null;
  size(): number;
  clear(): void;
}
export function createInterpolationBuffer(options?: InterpolationBufferOptions): InterpolationBuffer;

export type RealtimeConnectionState = "unknown" | "up" | "stale" | "down" | "contested" | "exhausted";
export interface RealtimeConnectionSnapshot {
  state: RealtimeConnectionState;
  attempts: number;
  reconnectDelayMs: number | null;
  nextReconnectAtMs: number | null;
  lastOpenAtMs: number | null;
  lastCloseAtMs: number | null;
  lastHeartbeatAtMs: number | null;
  latencyMs: number | null;
  lastError: string | null;
}
export interface RealtimeConnectionPolicyOptions {
  baseDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  jitterRatio?: number;
  staleMs?: number;
  maxAttempts?: number;
  now?: () => number;
  random?: () => number;
}
export interface RealtimeConnectionPolicy {
  opened(atMs?: number): RealtimeConnectionSnapshot;
  heartbeat(sentAtMs?: number, receivedAtMs?: number): RealtimeConnectionSnapshot;
  closed(reason?: unknown, atMs?: number): RealtimeConnectionSnapshot;
  failed(error?: unknown, atMs?: number): RealtimeConnectionSnapshot;
  snapshot(atMs?: number): RealtimeConnectionSnapshot;
  shouldReconnect(atMs?: number): boolean;
  reset(): RealtimeConnectionSnapshot;
}
export function createRealtimeConnectionPolicy(options?: RealtimeConnectionPolicyOptions): RealtimeConnectionPolicy;

export type Listener<P = unknown> = (payload: P) => void;
export interface WorldView {
  on(event: string, listener: Listener): () => void;
  emit(event: string, payload?: unknown): void;
  apply(frame: ClientFrame): void;
  me(): ClientEntity | undefined;
  get(id: string): ClientEntity | undefined;
  zone(id: string): ClientEntity | undefined;
  currentZone(): string | null;
  target(): string | null;
  setTarget(id: string | null): void;
  tick(): number;
  myId(): string;
  setLocalId(id: string): void;
  interpolate(dtSeconds: number, options?: { localRate?: number; remoteRate?: number }): void;
  inZone(): ClientEntity[];
  nameOf(id: string): string;
  entities(): ClientEntity[];
  zones(): ClientEntity[];
}
export function createWorldView(localId: string): WorldView;

export interface WebSocketLike {
  readonly readyState: number;
  send(data: string): void;
  close?(): void;
  onopen?: ((event?: unknown) => void) | null;
  onclose?: ((event?: { code?: number; reason?: string }) => void) | null;
  onerror?: ((event?: { message?: string }) => void) | null;
  onmessage?: ((event: { data: unknown }) => void) | null;
}

export function sendJoin(socket: WebSocketLike, name: unknown): void;
export function sendIntent(socket: WebSocketLike, seq: number, kind: string, args?: Record<string, unknown>): void;
export function sendResume(socket: WebSocketLike, token: string, sinceTick: number): void;

export interface OptimisticOverlay {
  register(seq: number, kind: string, args?: Record<string, unknown>): void;
  reconcile(ack: number): void;
  apply<T>(baseEntity: T): T;
  pendingCount(): number;
  clear(): void;
}
export function createOptimisticOverlay(options: {
  predict: <T>(entity: T, kind: string, args: Record<string, unknown>) => T;
}): OptimisticOverlay;

export type ConnectionState =
  | "open"
  | "joining"
  | "resuming"
  | "playing"
  | "disconnected"
  | "error"
  | "resumed"
  | "resume-failed"
  | "authenticated"
  | "join-failed";

export interface RealtimeClient {
  view: WorldView;
  policy: RealtimeConnectionPolicy;
  overlay: OptimisticOverlay | null;
  sendIntent(kind: string, args?: Record<string, unknown>): void;
  predictedMe(): ClientEntity | undefined;
  close(): void;
  resumeToken(): string | null;
  lastKnownTick(): number;
}

export function createRealtimeClient(options: {
  connect: () => WebSocketLike;
  view: WorldView;
  name?: string;
  onState?: ((state: ConnectionState) => void) | null;
  policyOptions?: RealtimeConnectionPolicyOptions;
  overlay?: OptimisticOverlay | null;
}): RealtimeClient;
