// Type declarations for @red-cup-engineering/qwzspace/render-2d.

import type { SceneDescription } from "./project.d.ts";
import type { DrawableRegistry, ShapeOp } from "./drawables.d.ts";
import type { CameraPose } from "./camera.d.ts";

export type DrawOp =
  | { type: "clear"; width: number; height: number }
  | { type: "transform"; x: number; y: number; angle: number; zoom: number; width: number; height: number }
  | { type: "transformEnd" }
  | { type: "circle"; id: string; x: number; y: number; radius: number; color: string; label: string; scale?: number; opacity?: number }
  | { type: "sprite"; id: string; drawableId: string; x: number; y: number; scale: number; rotation: number; opacity: number; shapes: ShapeOp[] }
  | { type: "text"; id: string; x: number; y: number; text: string; font: string; color: string; align: string; opacity?: number };

export function frameOps(
  sceneDescription: SceneDescription,
  options?: { width?: number; height?: number; radius?: number; drawableRegistry?: DrawableRegistry; camera?: CameraPose | null },
): DrawOp[];

export interface Canvas2DLike {
  getContext(kind: "2d"): Record<string, unknown>;
}

export interface RenderBackend {
  render(sceneDescription: SceneDescription, tick?: number): void;
  // NOT followEntity — see render-2d.mjs's own header for why this backend deliberately omits it.
  setCamera(pose: CameraPose | null): void;
}

export function createBackend(options: {
  mount: Canvas2DLike;
  width?: number;
  height?: number;
  radius?: number;
  drawableRegistry?: DrawableRegistry;
}): RenderBackend;
