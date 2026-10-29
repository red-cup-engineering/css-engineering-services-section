import type { TufteModel, TufteProjection } from "./tufte-browser.mjs";

export interface TufteTopologyNode {
  readonly id: string;
  readonly index: number;
  readonly role: string;
  readonly side: string;
  readonly span: number;
  readonly formId?: string;
  readonly previousId: string | null;
  readonly nextId: string | null;
}

export interface TufteTopologyEdge {
  readonly kind: "reading-next";
  readonly from: string;
  readonly to: string;
}

export interface TufteTopology {
  readonly kind: "tufte.topology";
  readonly revision: string;
  readonly tick?: number;
  readonly nodes: ReadonlyArray<TufteTopologyNode>;
  readonly edges: ReadonlyArray<TufteTopologyEdge>;
}

export type TufteTopologyOperation =
  | { readonly kind: "move"; readonly id: string; readonly afterId: string | null }
  | { readonly kind: "resize"; readonly id: string; readonly span: number };

export type TufteTopologyResult = Readonly<{
  kind: "tufte.topology.receipt" | "tufte.topology.refusal";
  operation: Readonly<TufteTopologyOperation>;
  reason?: "unknown-tile" | "invalid-span" | "invalid-anchor" | "self-anchor" | "unknown-anchor" | "unsupported-operation";
  projection: TufteProjection;
  topology: TufteTopology;
}>;

/** Describe viewport-independent, authored tile and reading-order topology. */
export function describeTufteTopology(model?: TufteModel | TufteProjection): TufteTopology;

/** Apply one deterministic user-authored move or resize operation. */
export function reduceTufteTopology(model: TufteModel | TufteProjection, operation: TufteTopologyOperation): TufteTopologyResult;

// ---- Workspace: the split-tree tiling layout ----

export const TUFTE_WORKSPACE_MIN_SHARE: number;

export interface TuftePane {
  readonly kind: "pane";
  readonly tile: string;
}

export interface TufteSplit {
  readonly kind: "split";
  readonly direction: "row" | "column";
  readonly children: ReadonlyArray<TufteWorkspaceNode>;
  readonly sizes: ReadonlyArray<number>;
}

export type TufteWorkspaceNode = TuftePane | TufteSplit;

/** Authored shorthand: pane as a tile-id string, split as `{split, children, sizes}`. */
export type TufteWorkspaceInput =
  | string
  | { tile: string }
  | { split?: "row" | "column"; direction?: "row" | "column"; children?: ReadonlyArray<TufteWorkspaceInput>; sizes?: ReadonlyArray<number>; fullscreen?: string }
  | { root?: TufteWorkspaceInput | null; fullscreen?: string }
  | TufteWorkspace
  | TufteWorkspaceNode;

export interface TufteWorkspace {
  readonly kind: "tufte.workspace";
  readonly root: TufteWorkspaceNode | null;
  /** The tile currently covering the whole surface; an overlay on the value, the tree beneath is untouched. */
  readonly fullscreen?: string;
}

export interface TufteWorkspaceRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface TufteWorkspacePane {
  readonly tile: string;
  readonly path: ReadonlyArray<number>;
  readonly rect: TufteWorkspaceRect;
  readonly area: {
    readonly column: ReadonlyArray<number>;
    readonly row: ReadonlyArray<number>;
  };
}

export interface TufteWorkspaceSplitter {
  readonly id: string;
  readonly path: ReadonlyArray<number>;
  readonly index: number;
  readonly axis: "row" | "column";
  readonly boundary: number;
  readonly min: number;
  readonly max: number;
  readonly parentRect: TufteWorkspaceRect;
  readonly rect: TufteWorkspaceRect;
}

export interface TufteWorkspaceGeometry {
  readonly kind: "tufte.workspace.geometry";
  readonly workspace: TufteWorkspace;
  readonly fullscreen?: string;
  readonly columns: ReadonlyArray<number>;
  readonly rows: ReadonlyArray<number>;
  /** Placed panes; under fullscreen, exactly the one covering the surface. */
  readonly panes: ReadonlyArray<TufteWorkspacePane>;
  /** Tiles a fullscreen pane covers; they keep their DOM order and gain `hidden`. */
  readonly hidden: ReadonlyArray<string>;
  readonly splitters: ReadonlyArray<TufteWorkspaceSplitter>;
}

export interface TufteWorkspaceEdge {
  readonly kind: "adjacent";
  readonly axis: "row" | "column";
  readonly from: string;
  readonly to: string;
}

export interface TufteWorkspaceTopology {
  readonly kind: "tufte.workspace.topology";
  readonly revision: string;
  readonly workspace: TufteWorkspace;
  readonly panes: ReadonlyArray<TufteWorkspacePane>;
  readonly edges: ReadonlyArray<TufteWorkspaceEdge>;
}

export type TufteWorkspaceOperation =
  | { readonly kind: "resize"; readonly path: ReadonlyArray<number>; readonly index: number; readonly boundary: number }
  | { readonly kind: "swap"; readonly id: string; readonly withId: string }
  | { readonly kind: "move"; readonly id: string; readonly targetId: string; readonly edge: "left" | "right" | "top" | "bottom" }
  | { readonly kind: "fullscreen"; readonly id: string }
  | { readonly kind: "restore" };

export type TufteWorkspaceResult = Readonly<{
  kind: "tufte.workspace.receipt" | "tufte.workspace.refusal";
  operation: Readonly<Record<string, unknown>>;
  reason?: string;
  workspace: TufteWorkspace;
  geometry: TufteWorkspaceGeometry;
}>;

/** Normalize an authored workspace against a projection into the frozen normal form. */
export function normalizeTufteWorkspace(workspace?: TufteWorkspaceInput | null, model?: TufteModel | TufteProjection): TufteWorkspace;

/** Flatten a workspace into one grid's tracks, per-tile areas, and splitters. */
export function computeTufteWorkspaceGeometry(workspace?: TufteWorkspaceInput | null, model?: TufteModel | TufteProjection): TufteWorkspaceGeometry;

/** Describe the spatial adjacency (real shared edges) a workspace realizes. */
export function describeTufteWorkspace(workspace?: TufteWorkspaceInput | null, model?: TufteModel | TufteProjection): TufteWorkspaceTopology;

/** Apply one deterministic user tiling operation; refusals are data. */
export function reduceTufteWorkspace(workspace: TufteWorkspaceInput | null | undefined, model: TufteModel | TufteProjection, operation: TufteWorkspaceOperation | Record<string, unknown>): TufteWorkspaceResult;

export interface TufteWorkspaceApplication {
  readonly workspace: TufteWorkspace;
  readonly geometry: TufteWorkspaceGeometry;
}

// ---- Workspace history: undo/redo over workspace values ----

export interface TufteWorkspaceHistory {
  /** Record the value being left behind by an accepted change; clears the redo branch. */
  record(workspace: TufteWorkspace): void;
  /** The value to return to, or null when nothing is recorded; `current` becomes redo-able. */
  undo(current: TufteWorkspace | null): TufteWorkspace | null;
  /** The value to advance to, or null when nothing was undone; `current` becomes undo-able again. */
  redo(current: TufteWorkspace | null): TufteWorkspace | null;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
  depth(): Readonly<{ past: number; future: number }>;
}

/** A bounded, DOM-free undo/redo history of workspace values (default limit 50). */
export function createTufteWorkspaceHistory(options?: { limit?: number }): TufteWorkspaceHistory;

// ---- Workspaces: a named, switchable set of workspace split-trees ----

export interface TufteWorkspaces {
  readonly kind: "tufte.workspaces";
  readonly active: string;
  readonly workspaces: Readonly<Record<string, TufteWorkspace>>;
}

/** Authored shorthand: each named entry accepts a bare node, `{root}`, or a full `TufteWorkspace`. */
export type TufteWorkspacesInput = {
  active?: string;
  workspaces?: Readonly<Record<string, TufteWorkspaceInput>>;
};

export type TufteWorkspacesOperation =
  | { readonly kind: "switch"; readonly name: string }
  | { readonly kind: "move"; readonly id: string; readonly to: string };

export type TufteWorkspacesResult = Readonly<{
  kind: "tufte.workspaces.receipt" | "tufte.workspaces.refusal";
  operation: Readonly<Record<string, unknown>>;
  reason?: "invalid-name" | "invalid-target" | "unknown-tile" | "already-there" | "unsupported-operation";
  workspaceSet: TufteWorkspaces;
  geometry: TufteWorkspaceGeometry;
}>;

/** Normalize an authored named set of workspaces against a projection into the frozen normal form. */
export function normalizeTufteWorkspaces(set?: TufteWorkspacesInput | null, model?: TufteModel | TufteProjection): TufteWorkspaces;

/** Apply one deterministic user operation (`switch` the active workspace, `move` a tile to a named workspace); refusals are data. */
export function reduceTufteWorkspaces(set: TufteWorkspacesInput | null | undefined, model: TufteModel | TufteProjection, operation: TufteWorkspacesOperation | Record<string, unknown>): TufteWorkspacesResult;

/** Realize a workspace on the live grid (tracks, grid-areas, splitter elements). */
export function applyTufteWorkspace(root: Element | null, workspace?: TufteWorkspaceInput | null): TufteWorkspaceApplication | null;

export interface ConnectTufteWorkspaceOptions {
  workspace?: TufteWorkspaceInput | null;
  storageKey?: string;
  /** Undo history: on by default with a 50-entry limit; `false` disables it. */
  history?: false | { limit?: number };
  onArrange?: (result: TufteWorkspaceResult) => void;
}

export interface TufteWorkspaceConnection {
  arrange?: (operation: TufteWorkspaceOperation | Record<string, unknown>) => TufteWorkspaceResult;
  /** Replay the previous workspace value; a refusal (`nothing-to-undo`, `history-disabled`) is data. */
  undo?: () => TufteWorkspaceResult;
  redo?: () => TufteWorkspaceResult;
  history?: () => Readonly<{ past: number; future: number }> | null;
  refresh?: () => TufteWorkspaceApplication | null;
  workspace?: () => TufteWorkspace | null;
  topology?: () => TufteWorkspaceTopology;
  disconnect: () => void;
}

/** Connect pointer, keyboard, persistence, and event seams for user-driven tiling. */
export function connectTufteWorkspace(root?: Element | null, options?: ConnectTufteWorkspaceOptions): TufteWorkspaceConnection;
