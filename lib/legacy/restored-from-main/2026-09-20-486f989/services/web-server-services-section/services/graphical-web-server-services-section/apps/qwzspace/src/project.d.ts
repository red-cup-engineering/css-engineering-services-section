// Type declarations for @red-cup-engineering/qwzspace/project.

export interface SceneEntry {
  id: string;
  kind: string;
  role: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  label: string;
  // v2 presentation fields — present only when the source entity specified them.
  layer?: string;
  scale?: number;
  rotation?: number;
  opacity?: number;
  tint?: string;
  sprite?: string;
  spriteParams?: Record<string, unknown>;
  text?: string;
  textStyle?: Record<string, unknown>;
}
export interface SceneDescription {
  tick: number;
  entries: SceneEntry[];
  version: number;
}

export const SCENE_VERSION: number;
export const LAYER_ORDER: Readonly<{ backdrop: number; board: number; pieces: number; fx: number; overlay: number }>;

export function project(roomState: { entities?: readonly unknown[] } | readonly unknown[], tick: number): SceneDescription;
export function sceneEquals(a: SceneDescription, b: SceneDescription): boolean;
export function mergeSceneLayer(scene: SceneDescription, extraEntries?: readonly Partial<SceneEntry>[]): SceneDescription;
