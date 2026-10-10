/**
 * codecs/text/css - CSS as visual valuation closure.
 *
 * A specified CSS assignment set supplies semantic loci, predicate fibers, and each
 * assignment's told evidence. This codec applies the T1 visual-valuation bundle to
 * the fibers by the reading of that evidence, admits authored/profile declarations at the same boundary, and closes
 * the result under the CSS cascade. The closure stage order is CSS precedence:
 * origin/importance, layer, specificity, scope proximity, then source order.
 * Inheritance and custom-property propagation over the locus parent graph are
 * part of the same ordinal closure process.
 *
 * @packageDocumentation
 */
import { define } from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";
import { count } from "@red-cup-engineering/computer-data-engineering-services-section/number/exact-number";
import { closeOrdinalProcess, closureProcess, closureStabilizationSearchHorizon, stabilizingSup } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/closure";
import { coincides } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import { knowledgeNameOf, readingToVisual, readingVisualCssBundle } from "@red-cup-engineering/xml-document-rendering-service/svg/visual-valuation";

/** A CSS specificity vector `[ids, classes/attributes/pseudo-classes, types/pseudo-elements]`. */

/** The cascade origins this projection models. */

/** Conditional CSS contexts kept separate until browser evaluation time. */

/** A settled semantic locus to be valued visually. */

/** Shared cascade placement fields for T1 and authored declarations. */

/** One assignment in an assignment fiber, with its point: told `evidence`, or a `reading`'s name. */
const pointOf = (value) => value.evidence ?? value.reading;

/** An assignment fiber whose assignments are projected by the T1 visual bundle. */

/** An authored declaration rule admitted alongside the visual valuation bundle. */

/** The specified CSS assignment set expected by this codec. */

/** Input accepted by the CSS projection. */

/** A thin target-regime profile for the projection lens. */

/** One visual declaration before and during cascade closure. */

/** The cascade closure state used as the ordinal closure value. */

/** The closed stylesheet. */

const defaultRegime = "living-Web/IndieWeb";
const defaultLayers = Object.freeze(["base", "relations", "overrides"]);
const defaultInheritedProperties = Object.freeze([
  "color",
  "cursor",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "letter-spacing",
  "line-height",
  "text-align",
  "text-decoration-color",
  "text-decoration-style",
  "visibility",
]);

/** Living-Web / IndieWeb defaults for the target regime. */
export const livingWebIndieWebProfile = Object.freeze({
  kind: "rendering.css.profile",
  regime: defaultRegime,
  rootSelector: ":root",
  layers: defaultLayers,
  defaultLayer: "relations",
  emitLayerPrelude: true,
  inheritedProperties: defaultInheritedProperties,
});

const CSS_IDENTIFIER = /^-?[_a-zA-Z][-_a-zA-Z0-9]*$/u;
const CSS_LAYER_NAME = /^[_a-zA-Z][-_a-zA-Z0-9]*(?:\.[_a-zA-Z][-_a-zA-Z0-9]*)*$/u;

const cssString = (value) =>
  `"${value.replace(/\\/gu, "\\\\").replace(/"/gu, "\\\"").replace(/\n/gu, "\\a ")}"`;

const defaultSelectorForLocus = (locus) => `[data-metroplat-locus=${cssString(locus)}]`;

const normalizeLocus = (locus) =>
  typeof locus === "string" ? Object.freeze({ id: locus }) : locus;

const locusKey = (locus) => locus.id;
const labelOf = (value) => (typeof value === "string" ? value : JSON.stringify(value));
/** A valuation: a list of SignCell cells. */
const isValuation = (value) => Array.isArray(value);

/** A valuation's assignment set: one fiber per predicate, each cell's subject its locus. */
const assignmentSetFromValuation = (valuation) => {
  const loci = new Map();
  const predicates = [];
  for (const at of valuation) if (!predicates.some((p) => coincides(p, at.predicate))) predicates.push(at.predicate);
  const fibers = predicates.map((predicate) => {
    const assignments = valuation.filter((at) => coincides(at.predicate, predicate)).map((at) => {
      const locus = labelOf(at.subject);
      loci.set(locus, Object.freeze({ id: locus }));
      return Object.freeze({ locus, evidence: Object.freeze({ for: at.for, against: at.against }) });
    });
    return Object.freeze({ id: labelOf(predicate), assignments: Object.freeze(assignments) });
  });
  return Object.freeze({
    kind: "rendering.css.assignmentSet",
    loci: Object.freeze([...loci.values()].sort((left, right) => left.id.localeCompare(right.id))),
    fibers: Object.freeze(fibers),
  });
};

/** T1 visual valuation for one point (evidence or a reading's name) as CSS declarations. */
export function t1VisualValuationBundle(point) {
  return readingToVisual(point).cssDeclarations;
}

/**
 * T1 visual valuation: one compact, inspectable visual bundle per point, keyed by its knowledge name.
 *
 * The custom properties carry the valuation witness; ordinary properties give a
 * browser-readable default without forcing a full design system on callers.
 */
export const T1_VISUAL_VALUATION_BUNDLE = readingVisualCssBundle();

const normalizeProfile = (profile = livingWebIndieWebProfile

) => {
  const layers = Object.freeze([...(profile.layers ?? defaultLayers)]);
  return Object.freeze({
    kind: "rendering.css.profile",
    regime: profile.regime ?? defaultRegime,
    rootSelector: profile.rootSelector ?? ":root",
    layers,
    defaultLayer: profile.defaultLayer ?? "relations",
    emitLayerPrelude: profile.emitLayerPrelude ?? true,
    inheritedProperties: Object.freeze([...(profile.inheritedProperties ?? defaultInheritedProperties)]),
    ...(profile.bundle === undefined ? {} : { bundle: profile.bundle }),
    ...(profile.selectorForLocus === undefined ? {} : { selectorForLocus: profile.selectorForLocus }),
    ...(profile.rules === undefined ? {} : { rules: profile.rules }),
  });
};

const visualBundle = (profile) => {
  const overlay = profile.bundle ?? {};
  return Object.freeze(Object.fromEntries(Object.entries(T1_VISUAL_VALUATION_BUNDLE).map(([value, declarations]) => [value, Object.freeze({ ...declarations, ...overlay[value] })])));
};

/** Compute CSS selector specificity for the selector subset this codec emits. */
export function cssSpecificity(selector) {
  const stripped = selector
    .replace(/:where\([^)]*\)/gu, "")
    .replace(/"[^"]*"|'[^']*'/gu, "");
  const ids = stripped.match(/#[\w-]+/gu)?.length ?? 0;
  const classes = (stripped.match(/\.[\w-]+/gu)?.length ?? 0)
    + (stripped.match(/\[[^\]]+\]/gu)?.length ?? 0)
    + (stripped.match(/:(?!:)[\w-]+(?:\([^)]*\))?/gu)?.length ?? 0);
  const typeTokens = stripped
    .replace(/#[\w-]+/gu, " ")
    .replace(/\.[\w-]+/gu, " ")
    .replace(/\[[^\]]+\]/gu, " ")
    .replace(/::[\w-]+/gu, " type ")
    .split(/[\s>+~*,]+/u)
    .filter((token) => /^[A-Za-z][\w-]*$/u.test(token) && token !== "type");
  const pseudoElements = stripped.match(/::[\w-]+/gu)?.length ?? 0;
  return Object.freeze([ids, classes, typeTokens.length + pseudoElements]);
}

const compareSpecificity = (left, right) =>
  left[0] - right[0] || left[1] - right[1] || left[2] - right[2];

const normalizeCondition = (condition) => {
  const media = condition?.media?.trim();
  const supports = condition?.supports?.trim();
  if (!media && !supports) return undefined;
  return Object.freeze({
    ...(media ? { media } : {}),
    ...(supports ? { supports } : {}),
  });
};

const conditionKey = (condition) => {
  const normalized = normalizeCondition(condition);
  return normalized === undefined ? "" : `${normalized.media ?? ""}\u0000${normalized.supports ?? ""}`;
};

const declarationSlotKey = (declaration) =>
  `${declaration.locus}\u0000${declaration.property}\u0000${conditionKey(declaration.condition)}`;

const declarationSortKey = (declaration) =>
  [
    declarationSlotKey(declaration),
    declaration.selector,
    declaration.layer ?? "",
    declaration.fiber,
    declaration.reading,
    declaration.inherited ? "1" : "0",
    declaration.inheritedFrom ?? "",
    String(declaration.priority).padStart(8, "0"),
    declaration.specificity.map((part) => String(part).padStart(8, "0")).join("."),
    String(declaration.scopeDistance).padStart(8, "0"),
    String(declaration.sourceOrder).padStart(8, "0"),
    declaration.value,
  ].join("\u0000");

const originRank = (origin, important) => {
  if (origin === "transition") return 7;
  if (origin === "animation") return important ? 4 : 3;
  if (!important) {
    if (origin === "user-agent") return 0;
    if (origin === "user") return 1;
    return 2;
  }
  if (origin === "author") return 4;
  if (origin === "user") return 5;
  return 6;
};

const layerRank = (layer, important, profile) => {
  const index = layer === undefined ? -1 : profile.layers.indexOf(layer);
  if (!important) {
    if (layer === undefined) return profile.layers.length + 2;
    return index < 0 ? profile.layers.length + 1 : index + 1;
  }
  if (layer === undefined) return 0;
  return index < 0 ? 1 : profile.layers.length - index + 1;
};

const cascadeRank = (
  declaration,
  profile,
) =>
  Object.freeze([
    originRank(declaration.origin, declaration.important),
    layerRank(declaration.layer, declaration.important, profile),
    declaration.priority,
    declaration.specificity[0],
    declaration.specificity[1],
    declaration.specificity[2],
    -declaration.scopeDistance,
    declaration.sourceOrder,
  ]);

const compareCascadeRank = (
  left,
  right,
  profile,
) => {
  const l = cascadeRank(left, profile);
  const r = cascadeRank(right, profile);
  return l[0] - r[0] || l[1] - r[1] || l[2] - r[2] || l[3] - r[3] || l[4] - r[4]
    || l[5] - r[5] || l[6] - r[6] || l[7] - r[7]
    || declarationSortKey(left).localeCompare(declarationSortKey(right));
};

const chooseDeclaration = (
  left,
  right,
  profile,
) => {
  if (left.inherited !== right.inherited) return left.inherited ? right : left;
  return compareCascadeRank(left, right, profile) <= 0 ? right : left;
};

const sortedDeclarations = (declarations) =>
  Object.freeze([...declarations].sort((left, right) => declarationSortKey(left).localeCompare(declarationSortKey(right))));

const sameDeclarations = (left, right) => {
  if (left.length !== right.length) return false;
  return left.every((declaration, index) => {
    const other = right[index];
    return other !== undefined
      && declaration.id === other.id
      && declaration.locus === other.locus
      && declaration.fiber === other.fiber
      && declaration.selector === other.selector
      && declaration.property === other.property
      && declaration.value === other.value
      && declaration.reading === other.reading
      && declaration.origin === other.origin
      && declaration.important === other.important
      && declaration.inherited === other.inherited
      && declaration.layer === other.layer
      && declaration.scopeDistance === other.scopeDistance
      && declaration.priority === other.priority
      && declaration.sourceOrder === other.sourceOrder
      && declaration.inheritedFrom === other.inheritedFrom
      && conditionKey(declaration.condition) === conditionKey(other.condition)
      && compareSpecificity(declaration.specificity, other.specificity) === 0;
  });
};

const sameState = (left, right) =>
  left.processed === right.processed && sameDeclarations(left.declarations, right.declarations);

const state = (processed, declarations) =>
  Object.freeze({
    kind: "rendering.css.cascadeState",
    processed,
    declarations: sortedDeclarations(declarations),
  });

const joinState = (
  left,
  right,
  profile,
) => {
  const bySlot = new Map();
  for (const declaration of [...left.declarations, ...right.declarations]) {
    const key = declarationSlotKey(declaration);
    const prior = bySlot.get(key);
    bySlot.set(key, prior === undefined ? declaration : chooseDeclaration(prior, declaration, profile));
  }
  return state(Math.max(left.processed, right.processed), [...bySlot.values()]);
};

const leqState = (
  left,
  right,
  profile,
) =>
  left.processed <= right.processed
  && left.declarations.every((declaration) => {
    const other = right.declarations.find((candidate) => declarationSlotKey(candidate) === declarationSlotKey(declaration));
    return other !== undefined && chooseDeclaration(declaration, other, profile) === other;
  });

const toNatural = (value) => count(Array.from({ length: Math.max(0, value) }));

const cssPropertyName = (property) => {
  if (!/^--[-_a-zA-Z0-9]+$/u.test(property) && !/^-?[_a-zA-Z][-_a-zA-Z0-9]*$/u.test(property)) {
    throw new TypeError(`css: invalid property name ${JSON.stringify(property)}`);
  }
  return property;
};

const cssLayerName = (layer) => {
  if (!CSS_LAYER_NAME.test(layer)) throw new TypeError(`css: invalid layer name ${JSON.stringify(layer)}`);
  return layer;
};

const isInheritedProperty = (property, profile) =>
  property.startsWith("--") || profile.inheritedProperties.includes(property);

const normalizeAssignmentSet = (input) =>
  isValuation(input) ? assignmentSetFromValuation(input) : input;

const isLocusList = (
  value,
) => Array.isArray(value);

const normalizedLoci = (assignmentSet) =>
  Object.freeze([...assignmentSet.loci].map(normalizeLocus).sort((left, right) => locusKey(left).localeCompare(locusKey(right))));

const selectorByLocus = (
  loci,
  profile,
) => {
  const selectorForLocus = profile.selectorForLocus ?? defaultSelectorForLocus;
  return new Map(loci.map((locus) => [locus.id, locus.selector ?? selectorForLocus(locus.id)]));
};

const assignmentSortKey = (assignment) =>
  [
    assignment.id ?? "",
    assignment.locus ?? "",
    assignment.selector ?? "",
    knowledgeNameOf(pointOf(assignment)),
    String(assignment.sourceOrder ?? -1).padStart(8, "0"),
    conditionKey(assignment.condition),
  ].join("\u0000");

const ruleSortKey = (rule) =>
  [
    rule.id ?? "",
    rule.locus ?? "",
    rule.selector,
    rule.fiber ?? "",
    pointOf(rule) === undefined ? "" : knowledgeNameOf(pointOf(rule)),
    String(rule.sourceOrder ?? -1).padStart(8, "0"),
    conditionKey(rule.condition),
  ].join("\u0000");

const declarationFromSeed = (
  seed,
  property,
  value,
  generatedOrder,
  profile,
) => {
  const condition = normalizeCondition(seed.condition);
  const layer = seed.layer === undefined ? profile.defaultLayer : seed.layer === null ? undefined : seed.layer;
  return Object.freeze({
    kind: "rendering.css.visualDeclaration",
    id: seed.id ?? `${seed.locus}:${seed.fiber}:${property}:${generatedOrder}`,
    locus: seed.locus,
    fiber: seed.fiber,
    selector: seed.selector,
    property: cssPropertyName(property),
    value,
    reading: seed.reading,
    specificity: seed.specificity ?? cssSpecificity(seed.selector),
    sourceOrder: seed.sourceOrder ?? generatedOrder,
    origin: seed.origin ?? "author",
    important: seed.important ?? false,
    scopeDistance: seed.scopeDistance ?? 0,
    priority: seed.priority ?? 0,
    inherited: false,
    ...(layer === undefined ? {} : { layer }),
    ...(condition === undefined ? {} : { condition }),
  });
};

/** Apply the T1 visual-valuation bundle to assignment fibers before cascade closure. */
export function visualValuationDeclarations(
  input,
  profile = livingWebIndieWebProfile,
) {
  const normalizedProfile = normalizeProfile(profile);
  const assignmentSet = normalizeAssignmentSet(input);
  const loci = normalizedLoci(assignmentSet);
  const selectors = selectorByLocus(loci, normalizedProfile);
  const bundle = visualBundle(normalizedProfile);
  const declarations = [];
  let generatedOrder = 0;

  for (const fiber of [...assignmentSet.fibers].sort((left, right) => left.id.localeCompare(right.id))) {
    for (const assignment of [...fiber.assignments].sort((left, right) => assignmentSortKey(left).localeCompare(assignmentSortKey(right)))) {
      const locus = assignment.locus ?? fiber.id;
      const selector = assignment.selector ?? selectors.get(locus) ?? (normalizedProfile.selectorForLocus ?? defaultSelectorForLocus)(locus);
      const reading = knowledgeNameOf(pointOf(assignment));
      const seed = {
        ...assignment,
        locus,
        selector,
        fiber: fiber.id,
        reading,
        declarations: assignment.declarations ?? bundle[reading],
      };
      for (const [property, value] of Object.entries(seed.declarations).sort(([left], [right]) => left.localeCompare(right))) {
        declarations.push(declarationFromSeed(seed, property, value, generatedOrder, normalizedProfile));
        generatedOrder += 1;
      }
    }
  }

  for (const rule of [...(assignmentSet.rules ?? []), ...(normalizedProfile.rules ?? [])].sort((left, right) => ruleSortKey(left).localeCompare(ruleSortKey(right)))) {
    const locus = rule.locus ?? rule.selector;
    const seed = {
      ...rule,
      locus,
      selector: rule.selector,
      fiber: rule.fiber ?? "authored",
      reading: pointOf(rule) === undefined ? "authored" : knowledgeNameOf(pointOf(rule)),
      declarations: rule.declarations,
    };
    for (const [property, value] of Object.entries(rule.declarations).sort(([left], [right]) => left.localeCompare(right))) {
      declarations.push(declarationFromSeed(seed, property, value, generatedOrder, normalizedProfile));
      generatedOrder += 1;
    }
  }

  return sortedDeclarations(declarations);
}

const inheritedDeclaration = (
  declaration,
  child,
  childSelector,
) => Object.freeze({
  ...declaration,
  id: `inherit:${child.id}:${declaration.id}`,
  locus: child.id,
  selector: childSelector,
  specificity: cssSpecificity(childSelector),
  inherited: true,
  inheritedFrom: declaration.locus,
});

const inheritOnce = (
  current,
  loci,
  selectors,
  profile,
) => {
  const inherited = [];
  for (const child of loci) {
    if (child.parent === undefined) continue;
    const childSelector = selectors.get(child.id) ?? defaultSelectorForLocus(child.id);
    for (const declaration of current.declarations) {
      if (declaration.locus !== child.parent) continue;
      if (!isInheritedProperty(declaration.property, profile)) continue;
      inherited.push(inheritedDeclaration(declaration, child, childSelector));
    }
  }
  return inherited.length === 0 ? current : joinState(current, state(current.processed, inherited), profile);
};

/** Close visual declarations under the CSS cascade using the ordinal closure workbench. */
export function closeCascade(
  declarations,
  input = Object.freeze([]),
  profile = livingWebIndieWebProfile,
) {
  const normalizedProfile = normalizeProfile(profile);
  const assignmentSet = isLocusList(input)
    ? Object.freeze({ kind: "rendering.css.assignmentSet", loci: input, fibers: Object.freeze([]) })
    : normalizeAssignmentSet(input);
  const loci = normalizedLoci(assignmentSet);
  const selectors = selectorByLocus(loci, normalizedProfile);
  const ordered = [...declarations].sort((left, right) => compareCascadeRank(left, right, normalizedProfile));
  const bottom = state(0, []);
  const lattice = {
    bottom,
    leq: (left, right) => leqState(left, right, normalizedProfile),
    join: (left, right) => joinState(left, right, normalizedProfile),
    eq: sameState,
    sup: stabilizingSup({ eq: sameState }),
  };
  const endomorphism = (current) => {
    const next = ordered[current.processed];
    const stepped = next === undefined
      ? current
      : joinState(current, state(current.processed + 1, [next]), normalizedProfile);
    return inheritOnce(stepped, loci, selectors, normalizedProfile);
  };
  const inheritanceBound = Math.max(1, loci.length) * Math.max(1, normalizedProfile.inheritedProperties.length + 8);
  return closeOrdinalProcess(closureProcess(
    lattice,
    endomorphism,
    closureStabilizationSearchHorizon(toNatural(ordered.length + inheritanceBound + 2), toNatural(0)),
  ));
}

const emitDeclaration = (declaration) => {
  const important = declaration.important && !declaration.inherited ? " !important" : "";
  return `  ${cssPropertyName(declaration.property)}: ${declaration.value}${important};`;
};

const emitRule = (selector, declarations, indent = "") => {
  const body = [...declarations]
    .sort((left, right) => left.property.localeCompare(right.property))
    .map((declaration) => `${indent}${emitDeclaration(declaration)}`)
    .join("\n");
  return `${indent}${selector} {\n${body}\n${indent}}`;
};

const indentBlock = (body) => body.split("\n").map((line) => line === "" ? line : `  ${line}`).join("\n");

const wrapCondition = (condition, body) => {
  const normalized = normalizeCondition(condition);
  if (normalized === undefined) return body;
  let out = body;
  if (normalized.supports !== undefined) out = `@supports ${normalized.supports} {\n${indentBlock(out)}\n}`;
  if (normalized.media !== undefined) out = `@media ${normalized.media} {\n${indentBlock(out)}\n}`;
  return out;
};

const emitLayer = (layer, body) =>
  layer === undefined ? body : `@layer ${cssLayerName(layer)} {\n${indentBlock(body)}\n}`;

const groupKey = (condition, layer, selector) =>
  `${conditionKey(condition)}\u0000${layer ?? ""}\u0000${selector}`;

const emitStylesheet = (
  declarations,
  profile,
) => {
  const byRule = new Map();
  for (const declaration of declarations) {
    const key = groupKey(declaration.condition, declaration.layer, declaration.selector);
    const bucket = byRule.get(key);
    if (bucket === undefined) {
      byRule.set(key, {
        condition: declaration.condition,
        layer: declaration.layer,
        selector: declaration.selector,
        declarations: [declaration],
      });
    } else {
      bucket.declarations.push(declaration);
    }
  }

  const chunks = [
    `${profile.rootSelector} {\n  --metroplat-css-profile: ${cssString(profile.regime)};\n}`,
  ];
  if (profile.emitLayerPrelude && profile.layers.length > 0) {
    chunks.push(`@layer ${profile.layers.map(cssLayerName).join(", ")};`);
  }
  for (const bucket of [...byRule.values()].sort((left, right) =>
    groupKey(left.condition, left.layer, left.selector).localeCompare(groupKey(right.condition, right.layer, right.selector)))) {
    chunks.push(wrapCondition(bucket.condition, emitLayer(bucket.layer, emitRule(bucket.selector, bucket.declarations))));
  }
  return `${chunks.join("\n\n")}\n`;
};

/** Project settled input to deterministic CSS text: CSS = visual valuation closure. */
export function assignmentSetToStylesheet(
  input,
  profile = livingWebIndieWebProfile,
) {
  const normalizedProfile = normalizeProfile(profile);
  const assignmentSet = normalizeAssignmentSet(input);
  const declarations = visualValuationDeclarations(assignmentSet, normalizedProfile);
  const closure = closeCascade(declarations, assignmentSet, normalizedProfile);
  return emitStylesheet(closure.value.declarations, normalizedProfile);
}

/** The CSS textual boundary as a filesystem projector. */
export const cssProjector = define({
  type: "css",
  corner: "data",
  rung: "scott",
  recognize: (resource) => resource.path.endsWith(".css") || /--metroplat-css-profile:/u.test(resource.content),
  write: (items) => items.map((item) => assignmentSetToStylesheet(item.input, item.profile)).join("\n"),
});
