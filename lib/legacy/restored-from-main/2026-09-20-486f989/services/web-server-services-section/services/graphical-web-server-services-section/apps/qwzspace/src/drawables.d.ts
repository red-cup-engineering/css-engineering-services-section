// Type declarations for @red-cup-engineering/qwzspace/drawables.

export type ColorOrGradient =
  | string
  | { type: "linear" | "radial"; stops: readonly (readonly [number, string])[]; x1?: number; y1?: number; x2?: number; y2?: number; r?: number };

export type ShapeOp =
  | { type: "circle"; cx: number; cy: number; r: number; fill?: ColorOrGradient; stroke?: ColorOrGradient; lineWidth?: number; dash?: readonly number[] }
  | { type: "rect"; x: number; y: number; w: number; h: number; rx?: number; fill?: ColorOrGradient; stroke?: ColorOrGradient; lineWidth?: number; dash?: readonly number[] }
  | { type: "polygon"; points: readonly (readonly [number, number])[]; closed?: boolean; fill?: ColorOrGradient; stroke?: ColorOrGradient; lineWidth?: number }
  | { type: "path"; ops: readonly (readonly [string, ...number[]])[]; fill?: ColorOrGradient; stroke?: ColorOrGradient; lineWidth?: number }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; stroke?: ColorOrGradient; lineWidth?: number; dash?: readonly number[] };

export interface DrawableSpec {
  defaults?: Record<string, unknown>;
  build(params: Record<string, unknown>): ShapeOp[];
}

export interface DrawableRegistry {
  register(name: string, spec: DrawableSpec): string;
  get(name: string): DrawableSpec | null;
  has(name: string): boolean;
  list(): string[];
  resolveSprite(name: string, params?: Record<string, unknown>, tint?: string): ShapeOp[];
}

export function createDrawableRegistry(): DrawableRegistry;
export function registerDrawable(name: string, spec: DrawableSpec): string;
export function getDrawable(name: string): DrawableSpec | null;
export function hasDrawable(name: string): boolean;
export function listDrawables(): string[];
export function resolveSprite(name: string, params?: Record<string, unknown>, tint?: string): ShapeOp[];
export function getDefaultDrawableRegistry(): DrawableRegistry;
