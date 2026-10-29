// Type declarations for @red-cup-engineering/qwzspace/spatial-backend.

import type { SceneDescription } from "./project.d.ts";

export interface CameraPose {
  x: number;
  z: number;
  angle: number;
}

export interface SpatialBackendCapabilities {
  camera: boolean;
  followEntity: boolean;
  dims: 2 | 3;
}

export interface SpatialBackend {
  render(sceneDescription: SceneDescription, tick?: number): void;
  setCamera?(pose: CameraPose): void;
  followEntity?(id: string | null): void;
  capabilities?: { camera?: boolean; dims?: 2 | 3 };
}

export function capabilitiesOf(backend: SpatialBackend): SpatialBackendCapabilities;
export function assertBackendConformance(
  backend: SpatialBackend,
  scene: SceneDescription,
  tick?: number,
): { ok: true; capabilities: SpatialBackendCapabilities };

export const SPATIAL_BACKEND_CONTRACT: {
  required: readonly string[];
  optional: readonly string[];
};
