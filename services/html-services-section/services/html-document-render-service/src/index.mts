/**
 * html-document-render-service — the carrier/document-render engine: admits
 * HTML only as a semantic carrier of a settled document spine, selects the
 * valid document plan of carrier/CSS-system pairs for a render profile, and
 * serializes the result to a complete HTML document string.
 *
 * Extracted from @red-cup-engineering/html-file-codec-service (src/html/index.mts),
 * which now re-exports this surface unchanged. Depends on
 * @red-cup-engineering/css-style-resolution-service by package name for the CSS system
 * and valuation it renders.
 */
import {
  checkStyleResolutionSettled,
  checkClassMapsValid,
  classByNodeId,
  cssTextFromResolvedStyles,
  firstDuplicate,
  nodeIdSet,
  type CssSystem,
  type CssVisualValuation,
  type CssClassFactorMap,
  type CssSettleWitness,
} from "@red-cup-engineering/css-style-resolution-service";
import type { FormatRegime } from "@lenticule-science/articulating/predicating/positing/settling/analysis/formats-four";
import {
  html_is_carrier_not_document,
  type Document,
  type DocumentAddress,
  type DocumentOrder,
  type DocumentReference,
  type DocumentValuationSite,
  type HtmlIsCarrierNotDocumentWitness,
} from "@lenticule-science/articulating/predicating/positing/settling/document";
import { canonical, type JsonValue } from "@red-cup-engineering/json-file-codec-service";

/* ── escape (local copy) ────────────────────────────────────────────────────
 * html-file-codec-service keeps the canonical escaping/SHP-value surface;
 * this package cannot depend back on it (it re-exports this package's
 * symbols), so it carries its own minimal copy for the values a carrier node
 * can hold. Splitting escaping into its own package is a later job.
 */

/** Values a document-render carrier is allowed to inspect and stringify at its boundary. */
export type HtmlValue = JsonValue | { readonly const: JsonValue } | { readonly ref: string };

const REF_PREFIX = "shp-ref:";

function isRef(value: HtmlValue | undefined): value is { readonly ref: string } {
  return value !== null && typeof value === "object" && !Array.isArray(value) && "ref" in value;
}

function unmark(value: HtmlValue | undefined): JsonValue | { readonly ref: string } | undefined {
  if (isRef(value)) return value;
  return value !== null && typeof value === "object" && "const" in value
    ? value.const
    : value;
}

function htmlText(value: HtmlValue): string {
  if (isRef(value)) return `${REF_PREFIX}${value.ref}`;
  const unmarked = unmark(value);
  return unmarked !== null && typeof unmarked === "object" ? canonical(unmarked) : String(unmarked);
}

/** Escape a value for HTML text content (`&`, `<`, `>`). */
function escapeText(value: HtmlValue): string {
  return htmlText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Escape a value for a quoted HTML attribute (text escaping plus `"` and `'`). */
function escapeAttr(value: HtmlValue): string {
  return escapeText(value)
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ── carrier ────────────────────────────────────────────────────────────── */

export interface HtmlCarrierNode {
  readonly kind: "rendering.htmlCarrier.node";
  readonly nodeId: string;
  readonly element: string;
  readonly semanticAddress: string;
  readonly valuationSite?: string;
  readonly attributes?: Readonly<Record<string, HtmlValue>>;
  readonly text?: HtmlValue;
  /** Trusted HTML from a named codec boundary, appended after escaped text. */
  readonly html?: string;
  readonly children?: readonly string[];
}

export interface HtmlCarrierOf<D extends Document = Document> {
  readonly kind: "rendering.htmlCarrier";
  readonly document: D;
  readonly nodes: readonly HtmlCarrierNode[];
  readonly carriedAddresses: readonly DocumentAddress[];
  readonly carriedOrder: readonly DocumentOrder[];
  readonly carriedReferences: readonly DocumentReference[];
  readonly carriedValuationSites: readonly DocumentValuationSite[];
  readonly carrierNotDocument: HtmlIsCarrierNotDocumentWitness;
}

export interface HtmlCarrierObstruction {
  readonly kind: "rendering.htmlCarrier-obstruction";
  readonly reason:
    | "missing-address"
    | "missing-order"
    | "missing-reference"
    | "missing-valuation-site"
    | "duplicate-node";
  readonly key: string;
}

export type HtmlCarrierJudgment<D extends Document = Document> = HtmlCarrierOf<D> | HtmlCarrierObstruction;

const addressSet = (nodes: readonly HtmlCarrierNode[]): Set<string> => new Set(nodes.map((node) => node.semanticAddress));

const carrierObstruction = (reason: HtmlCarrierObstruction["reason"], key: string): HtmlCarrierObstruction =>
  Object.freeze({ kind: "rendering.htmlCarrier-obstruction" as const, reason, key });

/** Admit HTML only as a semantic carrier of the settled document spine. */
export function htmlCarrierOf<D extends Document>(
  document: D,
  nodes: readonly HtmlCarrierNode[],
): HtmlCarrierJudgment<D> {
  const duplicate = firstDuplicate(nodes.map((node) => node.nodeId));
  if (duplicate !== undefined) return carrierObstruction("duplicate-node", duplicate);
  const addresses = addressSet(nodes);
  for (const address of document.addresses) {
    if (!addresses.has(address.key)) return carrierObstruction("missing-address", address.key);
  }
  for (const edge of document.order) {
    if (!addresses.has(edge.before) || !addresses.has(edge.after)) {
      return carrierObstruction("missing-order", `${edge.before}->${edge.after}`);
    }
  }
  for (const reference of document.references) {
    if (!addresses.has(reference.from) || !addresses.has(reference.to)) {
      return carrierObstruction("missing-reference", `${reference.from}->${reference.to}`);
    }
  }
  const valuationSites = new Set(nodes.map((node) => node.valuationSite ?? node.semanticAddress));
  for (const site of document.valuationSites) {
    if (!valuationSites.has(site.address)) return carrierObstruction("missing-valuation-site", site.address);
  }
  return Object.freeze({
    kind: "rendering.htmlCarrier" as const,
    document,
    nodes: Object.freeze([...nodes]),
    carriedAddresses: document.addresses,
    carriedOrder: document.order,
    carriedReferences: document.references,
    carriedValuationSites: document.valuationSites,
    carrierNotDocument: html_is_carrier_not_document(document, "rendering.htmlCarrier"),
  });
}

/* ── render profile / document plan ──────────────────────────────────────── */

export type StyleBehavior = "none" | "static" | "settled-interactive";
export type PreservationLaw =
  | "preserve-addresses"
  | "preserve-order"
  | "preserve-references"
  | "preserve-valuation-sites"
  | "carrier-not-document"
  | "css-settles";

export interface RenderProfile {
  readonly kind: "rendering.profile";
  readonly name: string;
  readonly allowedElements: readonly string[];
  readonly allowedStyleBehavior: readonly StyleBehavior[];
  readonly allowedCompletionRegimes: readonly FormatRegime[];
  readonly obligations: readonly string[];
  readonly preservationLaws: readonly PreservationLaw[];
}

export interface RenderDocumentPlan<H extends HtmlCarrierOf = HtmlCarrierOf> {
  readonly kind: "rendering.profile.fiber";
  readonly profile: RenderProfile;
  readonly carrier: H;
  readonly system: CssSystem<H>;
  readonly valuation: CssVisualValuation<H>;
  readonly styleBehavior: StyleBehavior;
}

export interface RenderDocumentPlanWitness<H extends HtmlCarrierOf = HtmlCarrierOf> {
  readonly kind: "rendering.profile_forms_render_fiber:witness";
  readonly fiber: RenderDocumentPlan<H>;
  readonly cssSettled: CssSettleWitness<H>;
  readonly carrierPreservesDocument: true;
  readonly profileConstrainsFiber: true;
}

export interface RenderDocumentPlanObstruction {
  readonly kind: "rendering.profile_forms_render_fiber-obstruction";
  readonly reason:
    | "carrier-system-mismatch"
    | "element-not-allowed"
    | "style-behavior-not-allowed"
    | "completion-regime-not-allowed"
    | "missing-preservation-law"
    | "class-factor-map-carrier-mismatch"
    | "class-factor-map-obstructed";
  readonly key: string;
}

export type RenderDocumentPlanJudgment<H extends HtmlCarrierOf = HtmlCarrierOf> = RenderDocumentPlanWitness<H> | RenderDocumentPlanObstruction;

const requiredLaws: readonly PreservationLaw[] = Object.freeze([
  "preserve-addresses",
  "preserve-order",
  "preserve-references",
  "preserve-valuation-sites",
  "carrier-not-document",
  "css-settles",
]);

const renderFiberObstruction = (
  reason: RenderDocumentPlanObstruction["reason"],
  key: string,
): RenderDocumentPlanObstruction => Object.freeze({ kind: "rendering.profile_forms_render_fiber-obstruction" as const, reason, key });

/** A profile selects the valid document plan of carrier/CSS-system pairs for a use regime. */
export function buildHtmlDocumentPlan<H extends HtmlCarrierOf>(
  profile: RenderProfile,
  carrier: H,
  system: CssSystem<H>,
  styleBehavior: StyleBehavior,
): RenderDocumentPlanJudgment<H> {
  if (system.carrier !== carrier) return renderFiberObstruction("carrier-system-mismatch", system.carrier.kind);
  const allowedElements = new Set(profile.allowedElements);
  for (const node of carrier.nodes) {
    if (!allowedElements.has(node.element)) return renderFiberObstruction("element-not-allowed", node.element);
  }
  if (!profile.allowedStyleBehavior.includes(styleBehavior)) {
    return renderFiberObstruction("style-behavior-not-allowed", styleBehavior);
  }
  if (!profile.allowedCompletionRegimes.includes(system.completionRegime)) {
    return renderFiberObstruction("completion-regime-not-allowed", system.completionRegime);
  }
  for (const law of requiredLaws) {
    if (!profile.preservationLaws.includes(law)) return renderFiberObstruction("missing-preservation-law", law);
  }
  if (system.classFactorMap !== undefined) {
    const carrierNodes = nodeIdSet(carrier.nodes);
    for (const nodeId of system.classFactorMap.nodeIds) {
      if (!carrierNodes.has(nodeId)) return renderFiberObstruction("class-factor-map-carrier-mismatch", nodeId);
    }
    const factor = checkClassMapsValid(system.classFactorMap);
    if (factor.kind !== "rendering.css_classes_are_factor_maps:witness") {
      return renderFiberObstruction("class-factor-map-obstructed", factor.reason);
    }
  }
  const cssSettled = checkStyleResolutionSettled(system);
  return Object.freeze({
    kind: "rendering.profile_forms_render_fiber:witness" as const,
    fiber: Object.freeze({
      kind: "rendering.profile.fiber" as const,
      profile,
      carrier,
      system,
      valuation: cssSettled.valuation,
      styleBehavior,
    }),
    cssSettled,
    carrierPreservesDocument: true as const,
    profileConstrainsFiber: true as const,
  });
}

/* ── projector ──────────────────────────────────────────────────────────── */

export interface HtmlDocumentPlanOptions {
  readonly title?: HtmlValue;
  readonly lang?: string;
  readonly roots?: readonly string[];
  readonly metadata?: Readonly<Record<string, HtmlValue>>;
  readonly bodyAttributes?: Readonly<Record<string, HtmlValue>>;
  /** Trusted head fragments from named codecs, such as schema.org JSON-LD. */
  readonly head?: readonly string[];
}

export interface HtmlDocumentPlan<H extends HtmlCarrierOf = HtmlCarrierOf> {
  readonly kind: "rendering.htmlFiber.document";
  readonly fiber: RenderDocumentPlanWitness<H>;
  readonly html: string;
}

const renderHtmlAttr = ([key, value]: readonly [string, HtmlValue]): string =>
  value === "" ? ` ${key}` : ` ${key}="${escapeAttr(value)}"`;

function renderCarrierNode(
  node: HtmlCarrierNode,
  byId: ReadonlyMap<string, HtmlCarrierNode>,
  classNames: ReadonlyMap<string, string>,
  seen: ReadonlySet<string>,
): string {
  if (seen.has(node.nodeId)) throw new TypeError(`renderHtmlDocument: cyclic carrier node ${node.nodeId}`);
  const nextSeen = new Set(seen);
  nextSeen.add(node.nodeId);
  const className = classNames.get(node.nodeId);
  const ownClass = node.attributes?.class;
  const attributes: Record<string, HtmlValue> = {
    ...(node.attributes ?? {}),
    "data-render-node": node.nodeId,
    ...(className === undefined
      ? {}
      : { class: ownClass === undefined || ownClass === "" ? className : `${ownClass} ${className}` }),
  };
  const body = `${node.text === undefined ? "" : escapeText(node.text)}${node.html ?? ""}${(node.children ?? []).map((childId) => {
    const child = byId.get(childId);
    if (child === undefined) throw new TypeError(`renderHtmlDocument: missing child carrier node ${childId}`);
    return renderCarrierNode(child, byId, classNames, nextSeen);
  }).join("")}`;
  return `<${node.element}${Object.entries(attributes).map(renderHtmlAttr).join("")}>${body}</${node.element}>`;
}

function rootNodeIds(nodes: readonly HtmlCarrierNode[], requested: readonly string[] | undefined): readonly string[] {
  if (requested !== undefined) return requested;
  const childIds = new Set(nodes.flatMap((node) => node.children ?? []));
  return Object.freeze(nodes.filter((node) => !childIds.has(node.nodeId)).map((node) => node.nodeId));
}

/** Serialize the single admitted render codomain: a document plan over an HTML carrier and settled CSS valuation. */
export function renderHtmlDocument<H extends HtmlCarrierOf>(
  fiber: RenderDocumentPlanWitness<H>,
  options: HtmlDocumentPlanOptions = {},
): HtmlDocumentPlan<H> {
  const byId = new Map(fiber.fiber.carrier.nodes.map((node) => [node.nodeId, node] as const));
  const roots = rootNodeIds(fiber.fiber.carrier.nodes, options.roots);
  const classes: CssClassFactorMap | undefined = fiber.fiber.system.classFactorMap;
  const classNames = classByNodeId(classes);
  const body = roots.map((rootId) => {
    const root = byId.get(rootId);
    if (root === undefined) throw new TypeError(`renderHtmlDocument: missing root carrier node ${rootId}`);
    return renderCarrierNode(root, byId, classNames, new Set());
  }).join("\n");
  const metadata = Object.entries(options.metadata ?? {})
    .map(([key, value]) => `    <meta name="${escapeAttr(key)}" content="${escapeAttr(value)}">`)
    .join("\n");
  const head = (options.head ?? []).map((fragment) => `    ${fragment}`).join("\n");
  const css = cssTextFromResolvedStyles(fiber.fiber.valuation, classes);
  const title = options.title ?? fiber.fiber.profile.name;
  const bodyAttributes = Object.entries(options.bodyAttributes ?? {}).map(renderHtmlAttr).join("");
  const html = `<!DOCTYPE html>
<html lang="${escapeAttr(options.lang ?? "en")}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="render-profile" content="${escapeAttr(fiber.fiber.profile.name)}">${metadata ? "\n" + metadata : ""}
    <title>${escapeText(title)}</title>${head ? "\n" + head : ""}
    <style>${css}</style>
</head>
<body${bodyAttributes}>
${body}
</body>
</html>
`;
  return Object.freeze({
    kind: "rendering.htmlFiber.document" as const,
    fiber,
    html,
  });
}
