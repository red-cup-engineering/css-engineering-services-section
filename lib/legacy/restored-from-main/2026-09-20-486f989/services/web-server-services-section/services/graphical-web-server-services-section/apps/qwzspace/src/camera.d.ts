// Type declarations for @red-cup-engineering/qwzspace/camera.

export interface CameraPose {
  x: number;
  z: number;
  angle: number;
  zoom: number;
}

export interface CameraKeyframe {
  from?: number;
  to: number;
  startTick?: number;
  durationTicks?: number;
  easing?: string;
}

export interface CameraSpec {
  x?: number;
  z?: number;
  angle?: number;
  zoom?: number;
  pan?: { from?: { x?: number; z?: number }; to: { x?: number; z?: number }; startTick?: number; durationTicks?: number; easing?: string };
  zoomTo?: CameraKeyframe;
  rotateTo?: CameraKeyframe;
  shake?: { seed?: number; startTick?: number; durationTicks?: number; magnitude?: number; frequency?: number; decay?: "linear" | "exp" };
}

export function resolveCamera(spec?: CameraSpec, tick?: number): CameraPose;
export const DEFAULT_CAMERA_POSE: Readonly<CameraPose>;
