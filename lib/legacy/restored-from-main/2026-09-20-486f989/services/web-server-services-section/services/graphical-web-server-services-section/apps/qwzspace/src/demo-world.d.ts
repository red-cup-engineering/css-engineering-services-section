export interface DemoEntity {
  id: string;
  x: number;
  y: number;
  name: string;
  joinedTick?: number;
}

export interface DemoWorld {
  runTick(tick: number, intents: { actorId: string; kind: string; args?: Record<string, unknown> }[]): Promise<{ dirty: string[] }>;
  subjectsOf(): Promise<string[]>;
  snapOf(id: string): Promise<{ id: string; kind: string; x: number; y: number; name: string } | null>;
  validate(raw: unknown): { kind: "move"; args: { dx: number; dy: number } } | null;
  peek(): Map<string, DemoEntity>;
}

export function createDemoWorld(options?: {
  positionLimit?: number;
  entityKind?: string;
  includeJoinedTick?: boolean;
}): DemoWorld;
