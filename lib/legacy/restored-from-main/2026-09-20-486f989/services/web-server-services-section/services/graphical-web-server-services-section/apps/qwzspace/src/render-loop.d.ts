// Type declarations for @red-cup-engineering/qwzspace/render-loop.

import type { SceneDescription } from "./project.d.ts";
import type { InterpolationBracket, ClientEntity } from "./client.d.ts";
import type { TweenOptions } from "./tween.d.ts";
import type { CameraPose, CameraSpec } from "./camera.d.ts";
import type { CelebrationPlan } from "./celebration.d.ts";
import type { RenderBackend } from "./render-2d.d.ts";

export interface ComposedFrame {
  scene: SceneDescription;
  cameraPose: CameraPose | null;
  tick: number;
}

export function composeFrame(options: {
  bracket: InterpolationBracket | null;
  positions?: readonly ClientEntity[];
  tick?: number;
  tweenOptions?: TweenOptions;
  celebrations?: readonly CelebrationPlan[];
  cameraSpec?: CameraSpec | null;
}): ComposedFrame | null;

export interface InterpolationBufferLike {
  sampleBrackets(renderTimeMs?: number): InterpolationBracket | null;
  sample(renderTimeMs?: number): readonly ClientEntity[];
}

export interface RenderLoop {
  start(): void;
  stop(): void;
  tickOnce(): ComposedFrame | null;
  isRunning(): boolean;
}

export function createRenderLoop(options: {
  backend: Partial<RenderBackend> & { render: RenderBackend["render"] };
  buffer: InterpolationBufferLike;
  tweenOptions?: TweenOptions;
  getCameraSpec?: () => CameraSpec | null;
  getCelebrations?: () => readonly CelebrationPlan[];
  requestFrame?: (cb: (t?: number) => void) => number | NodeJS.Timeout;
  cancelFrame?: (handle: number | NodeJS.Timeout) => void;
}): RenderLoop;
