/**
 * css-style-resolution — resolves the CSS cascade over a node tree
 * into one settled per-node style valuation, certifies that closure is
 * idempotent and that class tokens are a finite factor map/proper coloring,
 * and serializes a settled valuation back to CSS text.
 *
 * Extracted from @red-cup-engineering/html-engine (src/html/index.mts),
 * which now re-exports this surface unchanged. `html-document-render-service`
 * depends on this package by name for its carrier/CSS-system types.
 */
import {
  coloringFactorMap,
} from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/coloring";
import { closureModeName } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/closure";
import { ofNat, modeOfOrdinal } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/ordinal-closure";

/* ── carrier shape ──────────────────────────────────────────────────────────
 * A minimal structural carrier shape, not the full `HtmlCarrierOf` witness
 * (that stays in html-document-render-service, which depends on this package —
 * not the other way around). `HtmlCarrierOf` satisfies `CssCarrier`
 * structurally, so `CssSystem<HtmlCarrierOf>` type-checks there unchanged.
 */

/**
 * The carrier a CSS system styles: nodes addressed by id.
 * @typedef {{ readonly kind: string, readonly nodes: readonly { readonly nodeId: string }[] }} CssCarrier
 */

/**
 * @typedef {{
 *   readonly kind: "rendering.css.declaration",
 *   readonly nodeId: string,
 *   readonly property: string,
 *   readonly value: string,
 *   readonly priority?: number,
 *   readonly sourceOrder?: number,
 * }} CssDeclaration
 */

/**
 * Structural class tokens as a finite factor map over a constraint graph.
 * @typedef {{
 *   readonly kind: "rendering.css.classFactorMap",
 *   readonly nodeIds: readonly string[],
 *   readonly classes: readonly number[],
 *   readonly alphabet: readonly string[],
 *   readonly constraintGraph: readonly (readonly unknown[])[],
 * }} CssClassFactorMap
 */

/**
 * @template {CssCarrier} [H=CssCarrier]
 * @typedef {{
 *   readonly kind: "rendering.css.system",
 *   readonly carrier: H,
 *   readonly declarations: readonly CssDeclaration[],
 *   readonly classFactorMap?: CssClassFactorMap,
 * }} CssSystem
 */

/**
 * @typedef {{
 *   readonly kind: "rendering.css.visualSite",
 *   readonly nodeId: string,
 *   readonly property: string,
 *   readonly value: string,
 *   readonly declaration: CssDeclaration,
 * }} CssVisualSite
 */

/**
 * @template {CssCarrier} [H=CssCarrier]
 * @typedef {{
 *   readonly kind: "rendering.css.visualValuation",
 *   readonly carrier: H,
 *   readonly sites: readonly CssVisualSite[],
 * }} CssVisualValuation
 */

/**
 * @typedef {import("@red-cup-engineering/metrologic/closure/regime").ClosureRegimeName} ClosureRegimeName
 */

/**
 * @template {CssCarrier} [H=CssCarrier]
 * @typedef {{
 *   readonly kind: "rendering.css_settles_to_valuation:witness",
 *   readonly system: CssSystem<H>,
 *   readonly valuation: CssVisualValuation<H>,
 *   readonly cascadeClosed: true,
 *   readonly idempotent: true,
 *   readonly completionRegime: ClosureRegimeName,
 * }} CssSettleWitness
 */

/**
 * @typedef {{
 *   readonly kind: "rendering.css_classes_are_factor_maps:witness",
 *   readonly classes: CssClassFactorMap,
 *   readonly factorMap: unknown,
 *   readonly finiteAlphabet: true,
 * }} CssClassFactorMapWitness
 */

/**
 * @typedef {{
 *   readonly kind: "rendering.css_classes_are_factor_maps-obstruction",
 *   readonly classes: CssClassFactorMap,
 *   readonly reason: string,
 *   readonly key: string,
 *   readonly factorMap?: unknown,
 * }} CssClassFactorMapObstruction
 */

/** @typedef {CssClassFactorMapWitness | CssClassFactorMapObstruction} CssClassFactorMapJudgment */

/* ── shared helpers ─────────────────────────────────────────────────────────
 * Exported because html-document-render-service needs the same finite-set
 * checks over its own (structurally wider) carrier nodes.
 */

/**
 * @param {readonly { readonly nodeId: string }[]} nodes
 * @returns {Set<string>}
 */
export const nodeIdSet = (nodes) => new Set(nodes.map((node) => node.nodeId));

/**
 * @template T
 * @param {Iterable<T>} values
 * @returns {T | undefined}
 */
export const firstDuplicate = (values) => {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return undefined;
};

/* ── cascade closure ────────────────────────────────────────────────────── */

const declarationRank = (decl) =>
  Object.freeze([decl.priority ?? 0, decl.sourceOrder ?? 0]);

const declarationKey = (decl) => `${decl.nodeId}${String.fromCharCode(0)}${decl.property}`;

const chooseDeclaration = (left, right) => {
  const [leftPriority, leftOrder] = declarationRank(left);
  const [rightPriority, rightOrder] = declarationRank(right);
  if (rightPriority > leftPriority) return right;
  if (rightPriority < leftPriority) return left;
  return rightOrder >= leftOrder ? right : left;
};

/**
 * Compute the finite cascade closure as one visual valuation per node/property.
 * @template {CssCarrier} H
 * @param {CssSystem<H>} system
 * @returns {CssVisualValuation<H>}
 */
export function resolveNodeStyles(system) {
  const carrierNodeIds = nodeIdSet(system.carrier.nodes);
  const bySite = new Map();
  for (const declaration of system.declarations) {
    if (!carrierNodeIds.has(declaration.nodeId)) continue;
    const key = declarationKey(declaration);
    const prior = bySite.get(key);
    bySite.set(key, prior === undefined ? declaration : chooseDeclaration(prior, declaration));
  }
  const sites = [...bySite.values()]
    .sort((left, right) => declarationKey(left).localeCompare(declarationKey(right)))
    .map((declaration) => Object.freeze({
      kind: "rendering.css.visualSite",
      nodeId: declaration.nodeId,
      property: declaration.property,
      value: declaration.value,
      declaration,
    }));
  return Object.freeze({
    kind: "rendering.css.visualValuation",
    carrier: system.carrier,
    sites: Object.freeze(sites),
  });
}

const sameVisualValuation = (left, right) =>
  JSON.stringify(left.sites.map(({ nodeId, property, value }) => [nodeId, property, value]))
  === JSON.stringify(right.sites.map(({ nodeId, property, value }) => [nodeId, property, value]));

/** The system the cascade's resolved sites declare: each settled site, at equal priority, in order. */
function resolvedSystemOf(system, valuation) {
  const declarations = Object.freeze(valuation.sites.map((site, sourceOrder) => Object.freeze({
    kind: "rendering.css.declaration",
    nodeId: site.nodeId,
    property: site.property,
    value: site.value,
    priority: 0,
    sourceOrder,
  })));
  return Object.freeze({
    kind: "rendering.css.system",
    carrier: system.carrier,
    declarations,
    ...(system.classFactorMap === undefined ? {} : { classFactorMap: system.classFactorMap }),
  });
}

/**
 * The cascade's closure, observed: resolve the declarations, declare what resolved and resolve again,
 * until the valuation repeats. `settledAt` is the stage at which it did, and the system's completion
 * regime is read off that closure ordinal (Obsmetrologia `regimeOfOrd`), never declared. The house
 * cascade picks one declaration per site in one pass, so it settles at stage 1 and its regime is
 * strict; a cascade that has not repeated by `bound` stages is refused.
 * @template {CssCarrier} H
 * @param {CssSystem<H>} system
 * @param {number} [bound]
 * @returns {{ readonly valuation: CssVisualValuation<H>, readonly settledAt: number, readonly regime: ClosureRegimeName }}
 */
export function cascadeSettling(system, bound = 8) {
  let current = system;
  let valuation = resolveNodeStyles(current);
  for (let stage = 1; stage <= bound; stage += 1) {
    current = resolvedSystemOf(current, valuation);
    const next = resolveNodeStyles(current);
    if (sameVisualValuation(valuation, next)) {
      return Object.freeze({ valuation, settledAt: stage, regime: closureModeName(modeOfOrdinal(ofNat(stage), true, true)) });
    }
    valuation = next;
  }
  throw new TypeError(`cascadeSettling: the cascade did not settle within ${bound} stages`);
}

/**
 * A CSS system's completion regime: the regime of its cascade's closure.
 * @param {CssSystem} system
 * @returns {ClosureRegimeName}
 */
export const completionModeOf = (system) => cascadeSettling(system).regime;

/**
 * The cascade settles to an idempotent visual valuation over carrier nodes.
 * @template {CssCarrier} H
 * @param {CssSystem<H>} system
 * @returns {CssSettleWitness<H>}
 */
export function checkStyleResolutionSettled(system) {
  let settling;
  try {
    settling = cascadeSettling(system, 1);
  } catch {
    throw new TypeError("checkStyleResolutionSettled: cascade closure is not idempotent");
  }
  return Object.freeze({
    kind: "rendering.css_settles_to_valuation:witness",
    system,
    valuation: settling.valuation,
    cascadeClosed: true,
    idempotent: true,
    completionRegime: settling.regime,
  });
}

const cssClassFactorMapObstruction = (
  classes,
  reason,
  key,
  factorMap,
) => factorMap === undefined
  ? Object.freeze({ kind: "rendering.css_classes_are_factor_maps-obstruction", classes, reason, key })
  : Object.freeze({ kind: "rendering.css_classes_are_factor_maps-obstruction", classes, reason, key, factorMap });

/**
 * CSS class tokens are admitted as a finite factor map/proper coloring.
 * @param {CssClassFactorMap} classes
 * @returns {CssClassFactorMapJudgment}
 */
export function checkClassMapsValid(classes) {
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
    kind: "rendering.css_classes_are_factor_maps:witness",
    classes,
    factorMap,
    finiteAlphabet: true,
  });
}

/* ── CSS text serialization ─────────────────────────────────────────────── */

/**
 * Map each carrier node id to the structural class name its factor map assigns, if any.
 * @param {CssClassFactorMap | undefined} classes
 * @returns {Map<string, string>}
 */
export function classByNodeId(classes) {
  if (classes === undefined) return new Map();
  return new Map(classes.nodeIds.map((nodeId, index) => [
    nodeId,
    classes.alphabet[classes.classes[index] ?? 0] ?? "render-node",
  ]));
}

/** Escape a plain string for an HTML attribute value (matches the SHP codec's `escapeAttr` on string input). */
function escapeAttrText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Serialize a settled visual valuation to CSS text, one rule per site, selecting by structural class where assigned.
 * @param {CssVisualValuation} valuation
 * @param {CssClassFactorMap} [classes]
 * @returns {string}
 */
export function cssTextFromResolvedStyles(
  valuation,
  classes,
) {
  const classNames = classByNodeId(classes);
  return valuation.sites
    .map((site) => {
      const className = classNames.get(site.nodeId);
      const selector = className === undefined ? `[data-render-node="${escapeAttrText(site.nodeId)}"]` : `.${className}`;
      return `${selector}{${site.property}:${site.value}}`;
    })
    .join("\n");
}
