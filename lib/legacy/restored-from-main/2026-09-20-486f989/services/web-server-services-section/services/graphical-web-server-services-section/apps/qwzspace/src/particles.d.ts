// Type declarations for @red-cup-engineering/qwzspace/particles.

import type { SceneEntry } from "./project.d.ts";

export type EmitterType = "burst" | "fountain" | "confetti" | "trail" | "shockwave" | "glowPulse";

export interface EmitterSpec {
  type: EmitterType;
  origin?: { x: number; y: number };
  count?: number;
  durationTicks?: number;
  cycleTicks?: number;
  lifeTicks?: number;
  totalTicks?: number;
  staggerTicks?: number;
  periodTicks?: number;
  trailTicks?: number;
  minSpeed?: number;
  maxSpeed?: number;
  angleRange?: readonly [number, number];
  gravity?: number;
  scale?: number;
  startScale?: number;
  endScale?: number;
  minScale?: number;
  maxScale?: number;
  minOpacity?: number;
  maxOpacity?: number;
  sprite?: string;
  tint?: string;
  colors?: readonly string[];
  positions?: readonly { tick: number; x: number; y: number }[];
  [key: string]: unknown;
}

export interface ParticleEffect {
  readonly id: string;
  readonly seed: number;
  readonly spec: Readonly<EmitterSpec>;
  readonly startTick: number;
}

export function createEffect(options: { id?: string; seed: number; spec: EmitterSpec; startTick?: number }): ParticleEffect;
export function sampleEffect(effect: ParticleEffect, tick: number): { done: boolean; entries: SceneEntry[] };
export function listEmitterTypes(): EmitterType[];

export type PresetName = "coin-fountain" | "confetti-burst" | "win-glow" | "sparkle-trail";
export const PRESETS: Readonly<Record<PresetName, (overrides?: Partial<EmitterSpec>) => EmitterSpec>>;
export function presetSpec(name: PresetName | string, overrides?: Partial<EmitterSpec>): EmitterSpec;
export function listPresets(): PresetName[];
