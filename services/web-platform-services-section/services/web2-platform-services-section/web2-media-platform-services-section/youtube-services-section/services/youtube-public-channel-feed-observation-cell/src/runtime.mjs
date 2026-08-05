import { resolve } from "node:path";
import { loadBoundRuntime } from "@red-cup-engineering/a2a-sovereign-operation-boundary-service";

const ROOT = resolve(import.meta.dirname, "..");

export function loadObservationRuntime(boundaryPath = process.env.YOUTUBE_PUBLIC_FEED_OBSERVATION_BOUNDARY ?? resolve(ROOT, "content/deployment/runtime-boundary.json")) {
  return loadBoundRuntime({
    boundaryPath,
    boundaryType: "DeploymentBoundary",
    factoryExport: "createYouTubePublicFeedObservationRuntime",
    root: ROOT,
    inactiveMessage: "YouTube public-feed observation deployment is not activated",
  });
}

