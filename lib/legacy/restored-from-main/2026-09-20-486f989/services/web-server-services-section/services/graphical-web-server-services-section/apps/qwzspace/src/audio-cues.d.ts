// Type declarations for @red-cup-engineering/qwzspace/audio-cues.

export interface AudioCue {
  cueId: string;
  intensity: number;
}

export function registerCue(eventKind: string, cueId: string, intensity?: number): string;
export function unregisterCue(eventKind: string): boolean;
export function cueFor(eventKind: string): AudioCue | null;
export function listCues(): string[];

export interface CuePlayer {
  play(cueId: string, opts?: { intensity?: number; source?: unknown }): void;
}
export interface CueDispatcher {
  dispatch(frame: { k?: string; t?: string; [key: string]: unknown }): boolean;
}
export function createDispatcher(player: CuePlayer): CueDispatcher;
