// Type declarations for @red-cup-engineering/qwzspace/tween.

import type { SceneDescription } from "./project.d.ts";

export type EasingName = "linear" | "easeInCubic" | "easeOutCubic" | "easeInOutCubic" | "easeOutElastic" | "easeOutBack" | "easeOutBounce";

export const easings: Readonly<Record<EasingName, (t: number) => number>>;
export function listEasings(): EasingName[];
export function easingFn(name: string): (t: number) => number;
export function ease(name: string, t: number): number;
export function lerpColor(a: string | undefined, b: string | undefined, t: number): string | undefined;

export interface TweenOptions {
  easing?: EasingName | string;
  perEntityEasing?: Record<string, EasingName | string>;
  enter?: { easing?: EasingName | string; from?: { scale?: number; opacity?: number; rotation?: number } };
  exit?: { easing?: EasingName | string; to?: { scale?: number; opacity?: number } };
}

export function interpolateScene(prevScene: SceneDescription, nextScene: SceneDescription, alpha: number, opts?: TweenOptions): SceneDescription;
export function applyPositions(
  scene: SceneDescription,
  positionEntities: readonly { id: string; x?: number; y?: number; z?: number; yaw?: number }[],
): SceneDescription;
