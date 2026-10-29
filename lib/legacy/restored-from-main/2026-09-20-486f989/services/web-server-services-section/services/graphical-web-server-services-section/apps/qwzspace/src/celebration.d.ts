// Type declarations for @red-cup-engineering/qwzspace/celebration.

import type { SceneEntry } from "./project.d.ts";
import type { CameraPose, CameraSpec } from "./camera.d.ts";
import type { ParticleEffect, EmitterSpec } from "./particles.d.ts";

export type Tier = "minor" | "major" | "epic";

export function tierScale(tier: Tier | string): number;
export function listTiers(): Tier[];

export interface CelebrationRawPlan {
  durationTicks?: number;
  camera?: CameraSpec;
  particles?: readonly { id?: string; offsetTicks?: number; spec: EmitterSpec }[];
  overlay?: readonly Record<string, unknown>[];
}

export type CelebrationFactory = (tier: Tier | string, overrides: Record<string, unknown>) => CelebrationRawPlan;

export function registerCelebration(name: string, factory: CelebrationFactory): string;
export function getCelebration(name: string): CelebrationFactory | null;
export function listCelebrations(): string[];

export interface CelebrationPlan {
  readonly name: string;
  readonly tier: Tier | string;
  readonly seed: number;
  readonly startTick: number;
  readonly durationTicks: number;
  readonly camera: CameraSpec | null;
  readonly particles: readonly ParticleEffect[];
  readonly overlay: readonly Record<string, unknown>[];
}

export function celebrate(
  name: string,
  options?: { tier?: Tier | string; seed?: number; startTick?: number; overrides?: Record<string, unknown> },
): CelebrationPlan;

export interface CelebrationFrame {
  active: boolean;
  cameraPose: CameraPose | null;
  particleEntries: SceneEntry[];
  overlayEntries: SceneEntry[];
}
export function sampleCelebration(plan: CelebrationPlan, tick: number): CelebrationFrame;
