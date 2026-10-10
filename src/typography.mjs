/**
 * typography holds pure typographic reads of syntax, fiber, told evidence, scale, weight, style, and spacing.
 * It may import values, schema, records, logic, fixpoint, math, codecs, capability, contracts, and sibling rendering modules, but it must not import search, runtime, integrations, interfaces, or apps.
 */

import {
  quadraticFromInts,
  quadraticMultiply,
  quadraticRational,
} from "@red-cup-engineering/computer-data-engineering-services-section/number/quadratic";
import { knowledgeNameOf } from "@red-cup-engineering/xml-document-rendering-service/svg/visual-valuation";

import { finiteOrdinal, finiteOrdinalJudgment } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/closure";
import {
  fromCount,
  fromRatio,
  toCount,
} from "@red-cup-engineering/computer-data-engineering-services-section/number/exact-number";

const roleType = {
  subject: Object.freeze({ weight: 700, case: "preserve" }),
  predicate: Object.freeze({ weight: 600, case: "preserve" }),
  object: Object.freeze({ weight: 400, case: "preserve" }),
};

const orderHeight = {
  knowledge: Object.freeze({
    absurd: 0,
    potential: 1,
    active: 1,
    stable: 2,
  }),
  truth: Object.freeze({
    active: 0,
    absurd: 1,
    stable: 1,
    potential: 2,
  }),
};

/** The exact identity scale in the same quadratic field as the type step. */
export const TYPE_SCALE_UNIT = quadraticFromInts(5, 1, 0);

/** Golden quadratic unit (1 + sqrt(5)) / 2, represented in the spatial geometry field. */
export const TYPE_SCALE_STEP = quadraticRational(5, fromRatio(1, 2), fromRatio(1, 2));

/** The type-scale ordinal of a point (named in the knowledge family) in an order. */
export function typeScaleOrdinalForReading(value, order) {
  return finiteOrdinal(fromCount(orderHeight[order][value]));
}

export function scaleStepForOrdinal(ordinal) {
  const finite = finiteOrdinalJudgment(ordinal);
  if (finite.kind !== "ordinal.closure.finiteOrdinal:witness") {
    throw new TypeError("scaleStepForOrdinal: typography scale requires a finite ordinal");
  }
  let scale = TYPE_SCALE_UNIT;
  const rank = toCount(finite.value);
  for (let index = 0; index < rank; index += 1) scale = quadraticMultiply(scale, TYPE_SCALE_STEP);
  return scale;
}

function locusElement(cell, role) {
  switch (role) {
    case "subject": return cell.subject;
    case "predicate": return cell.predicate;
    case "object": return cell.object;
  }
}

export function typographyLocus(cell, role) {
  return Object.freeze({
    kind: "metroplat.projections.typography.locus",
    cell,
    role,
    element: locusElement(cell, role),
  });
}

export function typographyLociForCell(cell) {
  return Object.freeze([
    typographyLocus(cell, "subject"),
    typographyLocus(cell, "predicate"),
    typographyLocus(cell, "object"),
  ]);
}

function styleOf(value) {
  return value === "active" ? "italic" : "roman";
}

/** A typography fiber: a locus with its point (told evidence, or a reading's name), scaled in an order. */
export function typographyFiber(
  locus,
  point,
  order = "knowledge",
) {
  return Object.freeze({
    kind: "metroplat.projections.typography.fiber",
    locus,
    point,
    order,
    ordinal: typeScaleOrdinalForReading(knowledgeNameOf(point), order),
  });
}

/** The typography fibers of a cell: one per role, each with the cell's evidence. */
export function typographyFibersForCell(at, order = "knowledge") {
  return Object.freeze(typographyLociForCell(at).map((locus) => typographyFiber(locus, at, order)));
}

/** The typography fibers of a valuation (a cell list). */
export function typographyFibersForValuation(valuation, order = "knowledge") {
  return Object.freeze(valuation.flatMap((at) => typographyFibersForCell(at, order)));
}

export function fiberToType(fiber) {
  const roleProjection = roleType[fiber.locus.role];
  const value = knowledgeNameOf(fiber.point);
  const ordinal = typeScaleOrdinalForReading(value, fiber.order);
  return Object.freeze({
    weight: roleProjection.weight,
    case: roleProjection.case,
    style: styleOf(value),
    scaleStep: scaleStepForOrdinal(ordinal),
  });
}

export function deriveTypographyFiber(fiber) {
  return Object.freeze({
    kind: "metroplat.projections.typography.derivation",
    fiber,
    type: fiberToType(fiber),
  });
}

export function deriveTypographyValuation(valuation, order = "knowledge") {
  return Object.freeze(typographyFibersForValuation(valuation, order).map(deriveTypographyFiber));
}
