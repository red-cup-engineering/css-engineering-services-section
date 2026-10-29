// Type declarations for @red-cup-engineering/qwzspace/deterministic-random.

export function hash32(seed: number, index: number, salt?: number): number;
export function rand01(seed: number, index: number, salt?: number): number;
export function randRange(seed: number, index: number, min: number, max: number, salt?: number): number;
export function smoothNoise1D(seed: number, t: number, salt?: number): number;
