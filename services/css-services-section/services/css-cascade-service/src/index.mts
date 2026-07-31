/**
 * css-cascade-service — computes the CSS cascade over a node tree into one
 * settled per-node style valuation, certifies that closure is idempotent and
 * that class tokens are a finite factor map/proper coloring, and serializes
 * a settled valuation back to CSS text.
 *
 * Extracted from @red-cup-engineering/html-file-codec-service (src/html/index.mts),
 * which now re-exports this surface unchanged. `html-render-fiber-service`
 * depends on this package by name for its carrier/CSS-system types.
 */
import {
  coloringFactorMap,
  type ColoringFactorMapJudgment,
} from "@lenticule-science/articulating/predicating/positing/settling/analysis/coloring";
import type { Matrix } from "@lenticule-science/articulating/predicating/positing/settling/analysis/exact-number";
import type { FormatRegime } from "@lenticule-science/articulating/predicating/positing/settling/analysis/formats-four";

/* ── carrier shape ──────────────────────────────────────────────────────────
 * A minimal structural carrier shape, not the full `HtmlCarrierOf` witness
 * (that stays in html-render-fiber-service, which depends on this package —
 * not the other way around). `HtmlCarrierOf` satisfies `CssCarrier`
 * structurally, so `CssSystem<HtmlCarrierOf>` type-checks there unchanged.
 */

export interface CssCarrierNode {
  readonly nodeId: string;
}

export interface CssCarrier {
  readonly nodes: readonly CssCarrierNode[];
}

/* ── types ──────────────────────────────────────────────────────────────── */

export interface CssDeclaration {
  readonly kind: "rendering.css.declaration";
  readonly nodeId: string;
  readonly property: string;
  readonly value: string;
  readonly priority?: number;
  readonly sourceOrder?: number;
}

export interface CssClassFactorMap {
  readonly kind: "rendering.css.classFactorMap";
  readonly constraintGraph: Matrix;
  readonly nodeIds: readonly string[];
  readonly classes: readonly number[];
  readonly alphabet: readonly string[];
}

export interface CssSystem<H extends CssCarrier = CssCarrier> {
  readonly kind: "rendering.css.system";
  readonly carrier: H;
  readonly completionRegime: FormatRegime;
  readonly declarations: readonly CssDeclaration[];
  readonly classFactorMap?: CssClassFactorMap;
}

export interface CssVisualSite {
  readonly kind: "rendering.css.visualSite";
  readonly nodeId: string;
  readonly property: string;
  readonly value: string;
  readonly declaration: CssDeclaration;
}

export interface CssVisualValuation<H extends CssCarrier = CssCarrier> {
  readonly kind: "rendering.css.visualValuation";
  readonly carrier: H;
  readonly completionRegime: FormatRegime;
  readonly sites: readonly CssVisualSite[];
}

export interface CssSettleWitness<H extends CssCarrier = CssCarrier> {
  readonly kind: "rendering.css_settles_to_valuation:witness";
  readonly system: CssSystem<H>;
  readonly valuation: CssVisualValuation<H>;
  readonly cascadeClosed: true;
  readonly idempotent: true;
}

export interface CssClassFactorMapWitness {
  readonly kind: "rendering.css_classes_are_factor_maps:witness";
  readonly classes: CssClassFactorMap;
  readonly factorMap: ColoringFactorMapJudgment & { readonly kind: "meme-analysis.coloring.factorMap:witness" };
  readonly finiteAlphabet: true;
}

export interface CssClassFactorMapObstruction {
  readonly kind: "rendering.css_classes_are_factor_maps-obstruction";
  readonly classes: CssClassFactorMap;
  readonly reason:
    | "length-mismatch"
    | "matrix-size-mismatch"
    | "non-finite-alphabet"
    | "class-outside-alphabet"
    | "not-factor-map";
  readonly key: string;
  readonly factorMap?: ColoringFactorMapJudgment;
}

export type CssClassFactorMapJudgment = CssClassFactorMapWitness | CssClassFactorMapObstruction;

/* ── shared helpers ─────────────────────────────────────────────────────────
 * Exported because html-render-fiber-service needs the same finite-set
 * checks over its own (structurally wider) carrier nodes.
 */

export const nodeIdSet = (nodes: readonly CssCarrierNode[]): Set<string> => new Set(nodes.map((node) => node.nodeId));

export const firstDuplicate = (values: readonly string[]): string | undefined => {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return undefined;
};

/* ── cascade closure ────────────────────────────────────────────────────── */

const declarationRank = (decl: CssDeclaration): readonly [number, number] =>
  Object.freeze([decl.priority ?? 0, decl.sourceOrder ?? 0] as const);

const declarationKey = (decl: CssDeclaration): string => `${decl.nodeId}${String.fromCharCode(0)}${decl.property}`;

const chooseDeclaration = (left: CssDeclaration, right: CssDeclaration): CssDeclaration => {
  const [leftPriority, leftOrder] = declarationRank(left);
  const [rightPriority, rightOrder] = declarationRank(right);
  if (rightPriority > leftPriority) return right;
  if (rightPriority < leftPriority) return left;
  return rightOrder >= leftOrder ? right : left;
};

/** Compute the finite cascade closure as one visual valuation per node/property. */
export function cssVisualValuation<H extends CssCarrier>(system: CssSystem<H>): CssVisualValuation<H> {
  const carrierNodeIds = nodeIdSet(system.carrier.nodes);
  const bySite = new Map<string, CssDeclaration>();
  for (const declaration of system.declarations) {
    if (!carrierNodeIds.has(declaration.nodeId)) continue;
    const key = declarationKey(declaration);
    const prior = bySite.get(key);
    bySite.set(key, prior === undefined ? declaration : chooseDeclaration(prior, declaration));
  }
  const sites = [...bySite.values()]
    .sort((left, right) => declarationKey(left).localeCompare(declarationKey(right)))
    .map((declaration) => Object.freeze({
      kind: "rendering.css.visualSite" as const,
      nodeId: declaration.nodeId,
      property: declaration.property,
      value: declaration.value,
      declaration,
    }));
  return Object.freeze({
    kind: "rendering.css.visualValuation" as const,
    carrier: system.carrier,
    completionRegime: system.completionRegime,
    sites: Object.freeze(sites),
  });
}

const sameVisualValuation = (left: CssVisualValuation, right: CssVisualValuation): boolean =>
  JSON.stringify(left.sites.map(({ nodeId, property, value }) => [nodeId, property, value]))
  === JSON.stringify(right.sites.map(({ nodeId, property, value }) => [nodeId, property, value]));

/** The cascade settles to an idempotent visual valuation over carrier nodes. */
export function css_settles_to_valuation<H extends CssCarrier>(system: CssSystem<H>): CssSettleWitness<H> {
  const valuation = cssVisualValuation(system);
  const declarations = Object.freeze(valuation.sites.map((site, sourceOrder) => Object.freeze({
    kind: "rendering.css.declaration" as const,
    nodeId: site.nodeId,
    property: site.property,
    value: site.value,
    priority: 0,
    sourceOrder,
  })));
  const closedSystem: CssSystem<H> = system.classFactorMap === undefined
    ? Object.freeze({
      kind: "rendering.css.system" as const,
      carrier: system.carrier,
      completionRegime: system.completionRegime,
      declarations,
    })
    : Object.freeze({
      kind: "rendering.css.system" as const,
      carrier: system.carrier,
      completionRegime: system.completionRegime,
      declarations,
      classFactorMap: system.classFactorMap,
    });
  if (!sameVisualValuation(valuation, cssVisualValuation(closedSystem))) {
    throw new TypeError("css_settles_to_valuation: cascade closure is not idempotent");
  }
  return Object.freeze({
    kind: "rendering.css_settles_to_valuation:witness" as const,
    system,
    valuation,
    cascadeClosed: true as const,
    idempotent: true as const,
  });
}

const cssClassFactorMapObstruction = (
  classes: CssClassFactorMap,
  reason: CssClassFactorMapObstruction["reason"],
  key: string,
  factorMap?: ColoringFactorMapJudgment,
): CssClassFactorMapObstruction => factorMap === undefined
  ? Object.freeze({ kind: "rendering.css_classes_are_factor_maps-obstruction" as const, classes, reason, key })
  : Object.freeze({ kind: "rendering.css_classes_are_factor_maps-obstruction" as const, classes, reason, key, factorMap });

/** CSS class tokens are admitted as a finite factor map/proper coloring. */
export function css_classes_are_factor_maps(classes: CssClassFactorMap): CssClassFactorMapJudgment {
  if (classes.nodeIds.length !== classes.classes.length) {
    return cssClassFactorMapObstruction(classes, "length-mismatch", `${classes.nodeIds.length}/${classes.classes.length}`);
  }
  if (classes.constraintGraph.length !== classes.nodeIds.length) {
    return cssClassFactorMapObstruction(classes, "matrix-size-mismatch", `${classes.constraintGraph.length}/${classes.nodeIds.length}`);
  }
  if (classes.alphabet.length === 0 || firstDuplicate(classes.alphabet) !== undefined) {
    return cssClassFactorMapObstruction(classes, "non-finite-alphabet", String(classes.alphabet.length));
  }
  const invalid = classes.classes.find((color) => !Number.isInteger(color) || color < 0 || color >= classes.alphabet.length);
  if (invalid !== undefined) return cssClassFactorMapObstruction(classes, "class-outside-alphabet", String(invalid));
  const factorMap = coloringFactorMap(classes.constraintGraph, classes.classes);
  if (factorMap.kind !== "meme-analysis.coloring.factorMap:witness") {
    return cssClassFactorMapObstruction(classes, "not-factor-map", factorMap.reason, factorMap);
  }
  return Object.freeze({
    kind: "rendering.css_classes_are_factor_maps:witness" as const,
    classes,
    factorMap,
    finiteAlphabet: true as const,
  });
}

/* ── CSS text serialization ─────────────────────────────────────────────── */

/** Map each carrier node id to the structural class name its factor map assigns, if any. */
export function classByNodeId(classes: CssClassFactorMap | undefined): ReadonlyMap<string, string> {
  if (classes === undefined) return new Map();
  return new Map(classes.nodeIds.map((nodeId, index) => [
    nodeId,
    classes.alphabet[classes.classes[index] ?? 0] ?? "render-node",
  ] as const));
}

/** Escape a plain string for an HTML attribute value (matches the SHP codec's `escapeAttr` on string input). */
function escapeAttrText(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Serialize a settled visual valuation to CSS text, one rule per site, selecting by structural class where assigned. */
export function cssTextFromVisualValuation(
  valuation: CssVisualValuation,
  classes?: CssClassFactorMap,
): string {
  const classNames = classByNodeId(classes);
  return valuation.sites
    .map((site) => {
      const className = classNames.get(site.nodeId);
      const selector = className === undefined ? `[data-render-node="${escapeAttrText(site.nodeId)}"]` : `.${className}`;
      return `${selector}{${site.property}:${site.value}}`;
    })
    .join("\n");
}
