export interface TufteLink { href: string; label?: string; current?: boolean; }
/** A display string is intentionally opaque: callers must not route exact
 * amounts or account identifiers through floating-point parsing. */
export interface TufteTableCell { text: string; href?: string; align?: "start" | "end"; }
export interface TufteTableColumn { id?: string; label: string; rowHeader?: boolean; align?: "start" | "end"; }
export interface TufteTable {
  caption?: string;
  columns: readonly (string | TufteTableColumn)[];
  rows: readonly (readonly (string | TufteTableCell)[])[];
  /** Rendered when rows are empty; it describes the result set rather than a blank grid. */
  empty?: string;
}
export interface NormalizedTufteTable {
  readonly caption?: string;
  readonly columns: ReadonlyArray<Readonly<Required<Pick<TufteTableColumn, "id" | "label">> & TufteTableColumn>>;
  readonly rows: ReadonlyArray<ReadonlyArray<Readonly<TufteTableCell>>>;
  readonly empty?: string;
}

/** An ordinary, domain-neutral living-interface tile. */
export interface TufteTile {
  id?: string;
  role?: string;
  /** `"pending"` is a documented third lifecycle token (Wave1 item 3): it shares `[data-confidence=low]`'s dashed/reduced-opacity CSS, see `withPendingLifecycle`. */
  lifecycle?: string;
  confidence?: string;
  side?: string;
  span?: number;
  title?: string;
  eyebrow?: string;
  /** A trusted HTML fragment. Escaped labels should use `content` instead. */
  html?: string;
  links?: readonly TufteLink[];
  table?: TufteTable;
  data?: unknown;
  content?: string;
  /** Opt-in aria-live convention (Wave1 item 5): only `"polite"`/`"assertive"` render an `aria-live`/`aria-atomic` pair on `.tufte-tile-body`; any other value coerces to absent. */
  live?: "polite" | "assertive";
  /**
   * The documented field-level validation convention (Wave1 item 2, not a
   * value TUFTE itself reads anywhere except `applyTufteFieldErrors`):
   * `{[formFieldName]: "error message"}` on a `tufte:refusal`'s
   * `detail.tile`. An ordinary extra property -- normalizeTufteModel
   * carries it through untouched, the same as any other `[extra: string]`.
   */
  fields?: Record<string, string>;
  /** Declarative native form. Its controls are escaped/SSR'd by TUFTE. */
  form?: TufteForm;
  component?: TufteComponent;
  [extra: string]: unknown;
}

export interface TufteFormOption { value: string; label?: string; selected?: boolean; }
export interface TufteFormField {
  id?: string; name: string; kind?: "hidden" | "text" | "search" | "email" | "url" | "password" | "number" | "checkbox" | "radio" | "textarea" | "select" | "file" | "date" | "time" | "datetime-local" | "range" | "color" | "tel";
  multiple?: boolean; accept?: string; autocomplete?: string;
  label?: string; value?: string; description?: string; required?: boolean; disabled?: boolean; checked?: boolean; options?: TufteFormOption[];
  min?: string; max?: string; step?: string; pattern?: string; minLength?: number; maxLength?: number; placeholder?: string;
}
export type TufteFormEncoding = "application/x-www-form-urlencoded" | "multipart/form-data" | "text/plain";
export interface TufteFormSubmitter { id?: string; label?: string; kind?: "submit" | "button"; action?: string; name?: string; value?: string; formAction?: string; formMethod?: "get" | "post" | "dialog"; formEnctype?: TufteFormEncoding; formTarget?: string; formNoValidate?: boolean; }
export interface TufteForm { id?: string; action: string; method?: "get" | "post"; revision?: string; fields?: TufteFormField[]; submitters?: TufteFormSubmitter[]; enhance?: boolean; enctype?: TufteFormEncoding; target?: string; errors?: Readonly<Record<string, string>>; noValidate?: boolean; }
export interface NormalizedTufteForm extends Omit<TufteForm, "fields" | "submitters"> { readonly id: string; readonly action: string; readonly method: "get" | "post"; readonly revision: string; readonly enhance: boolean | undefined; readonly fields: ReadonlyArray<Readonly<TufteFormField & { id: string; kind: NonNullable<TufteFormField["kind"]>; value: string; options: ReadonlyArray<Readonly<TufteFormOption & { label: string }>> }>>; readonly submitters: ReadonlyArray<Readonly<TufteFormSubmitter & { id: string; label: string; kind: "submit" | "button" }>>; }

export interface TufteMetadata { title?: string; description?: string; language?: string; themeColor?: string; robots?: string; canonical?: string; }
export interface TufteComponent { name: string; props?: unknown; /** Trusted server-rendered fallback; never sanitized by TUFTE. */ html?: string; }
export interface TufteComponentInstance { update?(props: unknown): void; dispose?(): void; }
export type TufteComponentFactory = (element: HTMLElement, props: unknown) => TufteComponentInstance | void;
export function connectTufteComponents(root: Element | null, factories?: Record<string, TufteComponentFactory>): TufteDocumentConnection;
export function admitTufteUrl(value: string): string;
export function normalizeTufteMetadata(value?: TufteMetadata): Readonly<TufteMetadata>;
export function renderTufteMetadata(value?: TufteMetadata): string;
export function applyTufteDocumentMetadata(root: Element | null, model: TufteModel | TufteProjection): void;
export function renderTufteNavigation(links?: readonly TufteLink[]): string;

/** Normalize the portable declarative portion of an HTML form. */
export function normalizeTufteForm(value?: TufteForm | null): NormalizedTufteForm;
export function normalizeTufteTable(value?: TufteTable | null): NormalizedTufteTable;
export function renderTufteTable(value: TufteTable): string;

/** The ordinary, unnormalized input to normalizeTufteModel/renderTufteDocument. */
export interface TufteModel {
  /** Framework shell signature; differing assets/components/workspaces require a full document load. */
  shell?: string;
  metadata?: TufteMetadata;
  navigation?: readonly TufteLink[];
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  revision?: string;
  /** Opaque ordering/idempotency token from a tick-driven caller (e.g. QwzSpace). TUFTE never interprets it beyond ordering. */
  tick?: number;
  tiles?: TufteTile[];
  mastheadHtml?: string;
  footerHtml?: string;
}

export type NormalizedTufteTile = TufteTile & {
  id: string;
  role: string;
  lifecycle: string;
  confidence: string;
  side: string;
  span: number;
  title: string;
};

export interface TufteProjection {
  readonly navigation?: readonly Readonly<TufteLink>[];
  readonly kind: "tufte.projection";
  readonly metadata: Readonly<TufteMetadata>;
  readonly shell?: string;
  readonly title: string;
  readonly subtitle: string;
  readonly eyebrow: string;
  readonly revision: string;
  readonly tick?: number;
  readonly tiles: ReadonlyArray<Readonly<NormalizedTufteTile>>;
}

/** Normalize an ordinary, domain-neutral living-interface projection. */
export function normalizeTufteModel(value?: TufteModel): TufteProjection;

export type TuftePatchableFields = Pick<
  NormalizedTufteTile,
  "role" | "lifecycle" | "confidence" | "side" | "span" | "title" | "eyebrow" | "html" | "content" | "live" | "form" | "links" | "table" | "data" | "component"
>;

export type TufteProjectionPatch =
  | { op: "update"; id: string; changed: Partial<TuftePatchableFields> }
  | { op: "insert"; id: string; afterId: string | null; tile: NormalizedTufteTile }
  | { op: "remove"; id: string }
  | { op: "reorder"; id: string; afterId: string | null };

/**
 * Diff two normalizeTufteModel outputs down to TUFTE's typed vocabulary.
 * Body updates reconcile DOM identity and preserve mounted components and dirty controls. When both projections
 * carry a finite `tick`, a patch computed against a stale-or-repeated tick
 * is `[]` (a no-op), not a silent overwrite.
 */
export function diffTufteProjection(previous?: TufteModel | TufteProjection | null, next?: TufteModel | TufteProjection | null): TufteProjectionPatch[];

export interface ApplyTufteProjectionPatchOptions {
  /** Wave1 item 5. Default false. When true and this patch list inserts at least one tile, moves focus to the first inserted tile's own heading after the patch runs. */
  focusOnInsert?: boolean;
  /** Wave1 item 6. Default false. When true and this patch list contains a structural op, wraps the mutation in `document.startViewTransition(...)` when the platform supports it (feature-detected; a silent synchronous no-op fallback otherwise). Enabling this trades away the synchronous "patched by the time this call returns" guarantee -- see the JSDoc on the implementation. */
  transition?: boolean;
}

/**
 * Apply an ordered diffTufteProjection patch list to the live DOM. `root`
 * may be the `[data-tufte]` document root or its `.tufte-grid` directly.
 * Returns the grid element the patches were applied to, or null.
 */
export function applyTufteProjectionPatch(root: Element | null, patches?: TufteProjectionPatch[], options?: ApplyTufteProjectionPatchOptions): Element | null;

/**
 * Wave1 item 3: mark one or more tiles `lifecycle="pending"` for the
 * duration of `action`, then revert to each tile's prior lifecycle -- but
 * only if that tile is still `"pending"` when `action` settles, so a
 * receipt that already moved a tile on is never clobbered back.
 */
export function withPendingLifecycle<T>(root: Element | null, ids: string | string[], action: () => Promise<T> | T): Promise<T>;

/**
 * Wave1 item 2: apply the field-error convention -- reads `tile.fields`
 * (`{[formFieldName]: "message"}`) and writes/clears the matching
 * `aria-invalid`/`aria-describedby`/`.tufte-field-error` state on `form`'s
 * own named controls. Validation logic itself stays entirely app-owned.
 */
export function applyTufteFieldErrors(form: HTMLFormElement | null, tile: TufteTile | NormalizedTufteTile | null | undefined): HTMLFormElement | null;

/**
 * Fragment-swap convenience for a `tufte:receipt` handler. `body` may be a
 * partial or full `{tiles:[...]}` projection (each listed tile is upserted;
 * tiles it does not mention are left alone), or a single tile object (only
 * the fields actually present are touched on an existing tile; an
 * unrecognized id is inserted as a new tile with normal defaults).
 */
export function applyTufteReceipt(root: Element | null, body: { tiles: TufteTile[] } | TufteTile): Element | null;

export interface TufteActionDetail {
  action: string | null | undefined;
  value: string | null | Record<string, string | string[]>;
  revision: string;
  form?: string;
  submitter?: string;
}

/** Observation emitted before an enhanced native submission; data includes File entries. */
export interface TufteSubmitDetail { readonly form: HTMLFormElement; readonly submitter: HTMLElement | null; readonly data: FormData; readonly action: string; readonly method: "GET" | "POST"; }

export interface TufteRefusalDetail {
  message: string;
  tile?: NormalizedTufteTile;
  projection?: TufteProjection;
}

export interface ConnectTufteDocumentOptions {
  /** Compose enhanced GET forms with the existing navigation connection. */
  navigate?: (href: string) => void | Promise<void>;
  /** Opt in native form submissions to JSON receipt/projection responses. Otherwise use each form.enhance. */
  enhanceForms?: boolean;
  actionEndpoint?: string;
  source?: string;
  /** Opt-in: diff+patch the DOM automatically on every `tufte:projection` event this root receives (the one this call emits from `source`, and any a caller dispatches itself, e.g. from a QwzSpace tick). Off by default. */
  autoPatch?: boolean;
  /** Seed the autoPatch baseline when the DOM was already server-rendered from a known model, so the first projection diffs correctly instead of being treated as the baseline. */
  projection?: TufteModel | TufteProjection;
}

export interface TufteDocumentConnection {
  disconnect(): void;
}

/** Connect the neutral action, receipt, refusal, and projection event seams. */
export function connectTufteDocument(root?: Element | null, options?: ConnectTufteDocumentOptions): TufteDocumentConnection;

export interface TufteNavigateDetail {
  href: string;
  replace: boolean;
}

export interface ConnectTufteNavigationOptions {
  /** Default true: focus the destination fragment or document heading. */
  focus?: boolean;
  /** Default `"a[data-tufte-nav]"`. */
  selector?: string;
  /** Seed the diff baseline, same as `ConnectTufteDocumentOptions.projection`. */
  projection?: TufteModel | TufteProjection;
  /** Forwarded to every navigation's `applyTufteProjectionPatch` call. */
  focusOnInsert?: boolean;
  /** Forwarded to every navigation's `applyTufteProjectionPatch` call. */
  transition?: boolean;
  /** Default true: also react to browser back/forward via `popstate`. */
  popState?: boolean;
  /** Test-only: inject a fake `window` (`history`/`location`/`addEventListener`). Real usage never sets this. */
  window?: unknown;
}

export interface TufteNavigationConnection {
  /** Navigate programmatically, exactly as if a matching `<a>` had been clicked. */
  navigate(href: string, options?: { replace?: boolean; addressHref?: string }): Promise<void>;
  disconnect(): void;
}

/**
 * Wave1 item 1: documents-as-routes navigation with no router dependency.
 * Delegates `click` on `a[data-tufte-nav]` (an undecorated `<a href>` is
 * left alone and navigates normally -- the zero-JS floor is the href
 * itself), fetches `data-tufte-nav-source ?? href` as a projection, diffs
 * and patches it via the same primitives `connectTufteDocument` uses, and
 * calls `history.pushState`.
 */
export function connectTufteNavigation(root?: Element | null, options?: ConnectTufteNavigationOptions): TufteNavigationConnection;

export function escapeHtml(value: unknown): string;
export function renderTufteForm(form: NormalizedTufteForm): string;
export function renderTufteValue(value: unknown): string;
export function renderTufteTileBody(tile: TufteTile): string;
