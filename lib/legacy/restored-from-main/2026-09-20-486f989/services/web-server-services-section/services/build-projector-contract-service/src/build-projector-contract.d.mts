export type ArtifactBody = string | Uint8Array;

export type ProjectedArtifact = Readonly<{
  path: string;
  body: ArtifactBody;
  mediaType?: string;
  cacheControl?: string;
  source?: string;
}>;

export type BuildDiagnostic = Readonly<{
  severity?: "error" | "warning" | "info";
  code: string;
  message: string;
  subject?: string;
  details?: unknown;
}>;

export type BuildProjector<Context extends object = object> = Readonly<{
  name: string;
  priority?: number;
  project(context: Context): BuildProjectorContribution | Promise<BuildProjectorContribution>;
}>;

export type BuildProjectorContribution = Readonly<{
  artifacts?: ReadonlyMap<string, ArtifactBody> | Iterable<ProjectedArtifact | readonly [string, ArtifactBody]>;
  diagnostics?: Iterable<BuildDiagnostic>;
}>;

export type ProjectedArtifactRecord = Readonly<ProjectedArtifact & {
  provenance: Readonly<{ projector: string; priority: number; source?: string }>;
}>;

export type BuildProjection = Readonly<{
  artifacts: ReadonlyMap<string, ProjectedArtifactRecord>;
  diagnostics: readonly (BuildDiagnostic & { severity: "error" | "warning" | "info"; projector?: string })[];
  report: Readonly<{
    projectorOrder: readonly Readonly<{ name: string; priority: number }>[];
    artifactCount: number;
    errors: readonly BuildDiagnostic[];
    warnings: readonly BuildDiagnostic[];
    releasable: boolean;
  }>;
}>;

/** Run projectors in priority/name order and combine their artifact contributions. */
export declare function projectArtifacts<Context extends object = object>(
  projectors: readonly BuildProjector<Context>[],
  context?: Context,
): Promise<BuildProjection>;
