import type { TufteModel, TufteTile, NormalizedTufteForm } from "./tufte-browser.mjs";
import type { TufteTheme } from "./tufte-theme.mjs";

export type {
  TufteMetadata,
  TufteComponent,
  TufteFormEncoding,
  TufteModel,
  TufteTile,
  TufteProjection,
  NormalizedTufteTile,
  TuftePatchableFields,
  TufteProjectionPatch,
  TufteForm,
  TufteFormField,
  TufteFormOption,
  TufteFormSubmitter,
  NormalizedTufteForm,
  TufteTable,
  TufteTableCell,
  TufteTableColumn,
  NormalizedTufteTable,
} from "./tufte-browser.mjs";
export { normalizeTufteModel, normalizeTufteForm, normalizeTufteTable, renderTufteTable, diffTufteProjection } from "./tufte-browser.mjs";
export { EARLY_MAC_THEME, EARLY_MAC_THEME_STYLES, resolveTufteTheme, type TufteTheme } from "./tufte-theme.mjs";
export {
  normalizeTufteWorkspace,
  computeTufteWorkspaceGeometry,
  describeTufteWorkspace,
  reduceTufteWorkspace,
  TUFTE_WORKSPACE_MIN_SHARE,
  type TufteWorkspace,
  type TufteWorkspaceInput,
  type TufteWorkspaceNode,
  type TufteWorkspaceGeometry,
  type TufteWorkspaceTopology,
  type TufteWorkspaceOperation,
  type TufteWorkspaceResult,
} from "./tufte-topology.mjs";

export interface RenderTufteDocumentOptions {
  /** CSP nonce supplied by the HTTP shell; authorizes generated styles and inline bootstrap. */
  nonce?: string;
  stylesheets?: ReadonlyArray<{ href: string; integrity?: string }>;
  scripts?: ReadonlyArray<{ src: string; integrity?: string }>;
  /** Domain-neutral visual treatment applied by the document renderer. */
  theme?: TufteTheme["name"];
  documentTitle?: string;
  language?: string;
  themeColor?: string;
  /** Trusted markup injected into <head>, after BASE_STYLES/options.styles. */
  headHtml?: string;
  /** Additional CSS appended after TUFTE's own BASE_STYLES. */
  styles?: string;
  /** Fetched once on connectTufteDocument() to emit the first tufte:projection. */
  source?: string;
  /** POST endpoint connectTufteDocument() calls for every tufte:action. */
  actionEndpoint?: string;
  /** Trusted JavaScript inlined as a `<script type="module">`. */
  clientScript?: string;
}

/** Render one accessible living-interface document from ordinary tile data. */
export function renderTufteDocument(model?: TufteModel, options?: RenderTufteDocumentOptions): string;

export function renderTuftePacket(
  dataform: import("@red-cup-engineering/html-structural-projection-service").ShpDataform,
  declaration: import("@red-cup-engineering/html-structural-projection-service").PackDeclaration,
  model?: TufteModel,
  options?: RenderTufteDocumentOptions,
): import("@red-cup-engineering/html-structural-projection-service").ShpPacket;

/**
 * Render just the tile grid -- `<div class="tufte-grid">...</div>`, no
 * `<html>`/`<head>`/masthead. A caller can compose a nested grid into one
 * tile's own `html` field in their own code (ordinary string
 * interpolation) without TUFTE growing a nested-document schema.
 */
export function renderTufteFragment(model?: TufteModel): string;

/** Render TUFTE's declarative native-form record as escaped semantic HTML. */
export function renderTufteForm(form: NormalizedTufteForm): string;

export interface ConfidenceBadgeTileOptions {
  id?: string;
  title?: string;
  label?: string;
  confidence?: string;
  detail?: string;
}

/** Tile-shape helper: a ready-to-use tile object for the confidence-badge pattern. Optional composition sugar, deletable without migration. */
export function confidenceBadgeTile(options?: ConfidenceBadgeTileOptions): TufteTile;

export interface DisclosurePanelTileOptions {
  id?: string;
  title?: string;
  summary?: string;
  html?: string;
  content?: string;
  role?: string;
  lifecycle?: string;
  confidence?: string;
  side?: string;
  span?: number;
}

/** Tile-shape helper: wraps its body in a native `<details>` when `summary` is given. */
export function disclosurePanelTile(options?: DisclosurePanelTileOptions): TufteTile;

/** Render reusable theme CSS for stylesheet delivery. */
export function renderTufteStyles(options?: Pick<RenderTufteDocumentOptions, "theme" | "styles">): string;
