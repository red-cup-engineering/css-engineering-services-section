/**
 * codecs/text/xml/svg/radial - the radial codec: charged relational data ⇄ a
 * deterministic concentric-ring SVG.
 *
 * A carrier holds a FINITE element-set that varies with the settling ordinal, so
 * each concentric ring is one ordinal's element-set and each radial segment one
 * charged cell — filled by its charge value and seated by its orbit. The
 * orbit-coloring distinction is diagonal (Δ, a self-pair `(s,p,s)`) versus
 * off-diagonal (Δᶜ, a cross-pair `(s,p,o)`), read directly off the cell. The
 * encoding is deterministic: segments are key-sorted and there is no randomness,
 * so equal input yields equal bytes.
 *
 * A restriction of ./.. (svg), which itself restricts ../../ (xml); it reuses the
 * SVG root, the charge helpers, and the holography projector. Layout IS here — a
 * radial diagram has one canonical polar layout — unlike the layout-agnostic svg
 * codec.
 *
 * @packageDocumentation
 */
import { restrict, type Projector } from "../../../../../projections/kernel.mjs";
import {
  affirmedCharge,
  background,
  chargeAttributes,
  chargeValueOf,
  group,
  svgProjector,
  svgRoot,
} from "../index.mjs";
import { document, element, serialize, type XmlElement, type XmlNode } from "../../core.mjs";
import type { ChargeCarrier, ChargeValueName } from "../../../../../../lib/articulating/predicating/positing/bilattice-charge.mjs";
import { termCoincides } from "../../../../../../lib/articulating/predicating/predication.mjs";
import type { Valuation } from "../../../../../../lib/articulating/predicating/positing/fiber.mjs";
import type { Meme } from "../../../../../../lib/articulating/predicating/positing/fiber.mjs";
import type { PredicationValuationClosureStageCarrier } from "../../../../../../lib/articulating/predicating/positing/settling/valuation-closure.mjs";

/* ── palette ────────────────────────────────────────────────────────────── */

/** The orbit class of a cell: Δ (self-pair) or Δᶜ (cross-pair). */
export type Orbit = "diagonal" | "off-diagonal";

/**
 * A fill color per bilattice charge value, plus the center disc and the segment
 * outline stroke. The default is neutral and editable.
 */
export interface ChargePalette {
  readonly absurd: string;
  readonly potential: string;
  readonly active: string;
  readonly stable: string;
  readonly center: string;
  readonly stroke: string;
}

/** A neutral default palette: one distinct fill per FOUR-valued charge. */
export const chargePalette: ChargePalette = Object.freeze({
  absurd: "#4b5563",
  potential: "#2f7dd1",
  active: "#d98a2b",
  stable: "#b3202c",
  center: "#1f2937",
  stroke: "#cbd2da",
});

const colorOf = (palette: ChargePalette, value: ChargeValueName): string => palette[value];

/* ── dataform ───────────────────────────────────────────────────────────── */

/** One segment of a ring: a charged cell, its orbit, an optional label and weight. */
export interface RadialSegment {
  readonly e: string;
  readonly a?: string;
  readonly v?: string;
  readonly label?: string;
  readonly title?: string;
  readonly orbit?: Orbit;
  readonly charge: ChargeCarrier;
  readonly weight?: number;
}

/** One concentric ring: the carrier's finite element-set at one settling ordinal. */
export interface RadialRing {
  readonly ordinal: number;
  readonly label?: string;
  readonly segments: readonly RadialSegment[];
}

/** The normalized form the projector renders. */
export interface RadialDataform {
  readonly rings: readonly RadialRing[];
  readonly title?: string;
  readonly desc?: string;
  readonly size?: number;
  readonly background?: string;
}

/** Where ordinal 0 sits: at the center (apex) or at the rim (base). */
export type RadialCenter = "apex" | "base";

export interface ProjectRadialOptions {
  readonly palette?: ChargePalette;
  readonly center?: RadialCenter;
  readonly margin?: number;
  readonly holeRatio?: number;
  readonly declaration?: boolean;
}

/* ── geometry ───────────────────────────────────────────────────────────── */

const TAU = Math.PI * 2;
const START = -Math.PI / 2; // segments begin at the top
const fixed = (value: number): string => value.toFixed(2);
const pointX = (cx: number, r: number, a: number): number => cx + r * Math.cos(a);
const pointY = (cy: number, r: number, a: number): number => cy + r * Math.sin(a);

/** An annular sector path from (ri,a0)→(ro,a1): the shape of one segment. */
function annularSector(cx: number, cy: number, ri: number, ro: number, a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const ox0 = fixed(pointX(cx, ro, a0)), oy0 = fixed(pointY(cy, ro, a0));
  const ox1 = fixed(pointX(cx, ro, a1)), oy1 = fixed(pointY(cy, ro, a1));
  const ix1 = fixed(pointX(cx, ri, a1)), iy1 = fixed(pointY(cy, ri, a1));
  const ix0 = fixed(pointX(cx, ri, a0)), iy0 = fixed(pointY(cy, ri, a0));
  return `M${ox0},${oy0} A${fixed(ro)},${fixed(ro)} 0 ${large} 1 ${ox1},${oy1} L${ix1},${iy1} A${fixed(ri)},${fixed(ri)} 0 ${large} 0 ${ix0},${iy0} Z`;
}

/** A full annulus (a ring of exactly one element, spanning the whole circle). */
function annulus(cx: number, cy: number, ri: number, ro: number): string {
  const ox = fixed(cx + ro), oxb = fixed(cx - ro);
  const ix = fixed(cx + ri), ixb = fixed(cx - ri);
  const yc = fixed(cy);
  return (
    `M${ox},${yc} A${fixed(ro)},${fixed(ro)} 0 1 1 ${oxb},${yc} A${fixed(ro)},${fixed(ro)} 0 1 1 ${ox},${yc} Z ` +
    `M${ix},${yc} A${fixed(ri)},${fixed(ri)} 0 1 0 ${ixb},${yc} A${fixed(ri)},${fixed(ri)} 0 1 0 ${ix},${yc} Z`
  );
}

/* ── project ────────────────────────────────────────────────────────────── */

type AttrBag = Record<string, string | number | null | undefined>;

const segmentKey = (s: RadialSegment): string => `${s.e} ${s.a ?? ""} ${s.v ?? ""}`;

function describe(dataform: RadialDataform): string {
  const charges = new Map<string, number>();
  let segments = 0;
  let diagonal = 0;
  for (const ring of dataform.rings) {
    for (const segment of ring.segments) {
      segments += 1;
      if ((segment.orbit ?? "off-diagonal") === "diagonal") diagonal += 1;
      const name = chargeValueOf(segment.charge);
      charges.set(name, (charges.get(name) ?? 0) + 1);
    }
  }
  const byCharge = [...charges]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, count]) => `${name} ${count}`)
    .join(", ");
  return `${dataform.rings.length} rings, ${segments} segments (${diagonal} diagonal). By charge: ${byCharge}.`;
}

function renderSegment(
  segment: RadialSegment,
  palette: ChargePalette,
  cx: number,
  cy: number,
  ri: number,
  ro: number,
  a0: number,
  a1: number,
  full: boolean,
): XmlNode {
  // Off-diagonal (cross-pair) segments are seated on the OUTER part of the lane,
  // so diagonal and off-diagonal orbits read as tall versus short segments.
  const orbit: Orbit = segment.orbit ?? "off-diagonal";
  const seat = orbit === "off-diagonal" ? ri + (ro - ri) * 0.42 : ri;
  const apad = full ? 0 : (a1 - a0) * 0.04;
  const d = full ? annulus(cx, cy, seat, ro) : annularSector(cx, cy, seat, ro, a0 + apad, a1 - apad);
  const attrs: AttrBag = {
    d,
    fill: colorOf(palette, chargeValueOf(segment.charge)),
    stroke: palette.stroke,
    "stroke-width": 1,
    ...(full ? { "fill-rule": "evenodd" } : {}),
    "data-e": segment.e,
    "data-orbit": orbit,
    ...chargeAttributes(segment.charge),
  };
  if (segment.a !== undefined) attrs["data-a"] = segment.a;
  if (segment.v !== undefined) attrs["data-v"] = segment.v;
  const path = element("path", attrs);
  const label = segment.title ?? (segment.label ?? segment.e).replace(/\n/g, " ");
  return group({}, [element("title", {}, [label]), path]);
}

function renderRing(ring: RadialRing, palette: ChargePalette, cx: number, cy: number, ri: number, ro: number): XmlNode {
  const segments = [...ring.segments].sort((left, right) => segmentKey(left).localeCompare(segmentKey(right)));
  const totalWeight = segments.reduce((sum, segment) => sum + (segment.weight ?? 1), 0) || 1;
  const full = segments.length === 1;
  let accumulated = 0;
  const cells = segments.map((segment) => {
    const weight = segment.weight ?? 1;
    const a0 = START + (TAU * accumulated) / totalWeight;
    accumulated += weight;
    const a1 = START + (TAU * accumulated) / totalWeight;
    return renderSegment(segment, palette, cx, cy, ri, ro, a0, a1, full);
  });
  return group({ "data-ordinal": ring.ordinal, ...(ring.label === undefined ? {} : { "data-ring": ring.label }) }, cells);
}

/**
 * Project a charged radial dataform into a deterministic, self-describing SVG.
 *
 * @example
 * ```js
 * import { charge, chargeValue } from "@red-cup-engineering/relating";
 * import { projectRadial, radialProjector } from "@red-cup-engineering/relating";
 *
 * const svg = projectRadial({
 *   rings: [{
 *     ordinal: 0,
 *     segments: [{
 *       e: "json",
 *       a: "canonicalizes",
 *       v: "bytes",
 *       orbit: "diagonal",
 *       charge: charge(chargeValue("potential")),
 *     }],
 *   }],
 * });
 *
 * radialProjector.recognize({ path: "codec.svg", content: svg }); // true
 * ```
 */
export function projectRadial(dataform: RadialDataform, options: ProjectRadialOptions = {}): string {
  const palette = options.palette ?? chargePalette;
  const center = options.center ?? "apex";
  const size = dataform.size ?? 480;
  const margin = options.margin ?? 24;
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size / 2 - margin;
  const hole = outerRadius * (options.holeRatio ?? 0.14);

  // Rings are laid by ordinal. center=apex seats the highest ordinal at the
  // center; center=base seats ordinal 0 at the center.
  const byOrdinal = [...dataform.rings].sort((left, right) => left.ordinal - right.ordinal);
  const ordered = center === "apex" ? [...byOrdinal].reverse() : byOrdinal;
  const count = ordered.length || 1;
  const thickness = (outerRadius - hole) / count;
  const gap = Math.min(1.5, thickness * 0.12);

  const ringElements = ordered.map((ring, index) => {
    const ri = hole + index * thickness + gap;
    const ro = hole + (index + 1) * thickness - gap;
    return renderRing(ring, palette, cx, cy, ri, ro);
  });

  const centerDisc = element("circle", { cx, cy, r: fixed(hole), fill: palette.center, stroke: palette.stroke, "stroke-width": 1 });
  const backgroundColor = dataform.background ?? "#1c1c1e";

  const root: XmlElement = svgRoot(
    {
      width: size,
      height: size,
      title: dataform.title ?? "radial diagram",
      desc: dataform.desc ?? describe(dataform),
    },
    [
      background(size, size, backgroundColor),
      group({ "data-codec": "radial" }, [centerDisc, ...ringElements]),
    ],
  );

  return document(root, { ...(options.declaration ? { declaration: true } : {}) }).trimEnd();
}

export { serialize };

/* ── adapters ───────────────────────────────────────────────────────────── */

const termLabel = (term: { readonly mark: { readonly value: unknown } }): string => String(term.mark.value);
const predicateLabel = (predicate: { readonly claim: { readonly mark: { readonly value: unknown } } }): string =>
  String(predicate.claim.mark.value);

/** A charged cell (Meme) as a segment: orbit from subject↔object identity. */
export function segmentOfMeme(meme: Meme): RadialSegment {
  const subject = termLabel(meme.cell.subject);
  const object = termLabel(meme.cell.object);
  const predicate = predicateLabel(meme.cell.predicate);
  const orbit: Orbit = termCoincides(meme.cell.subject, meme.cell.object) ? "diagonal" : "off-diagonal";
  return Object.freeze({
    e: `${subject} ${predicate} ${object}`,
    a: predicate,
    v: object,
    label: orbit === "diagonal" ? `${subject} ${predicate}` : `${subject} ${predicate} ${object}`,
    orbit,
    charge: meme.charge,
  });
}

/**
 * A radial diagram of one valuation: one concentric ring PER predicate fiber,
 * each ring's segments the fiber's charged `(subject, object)` cells.
 */
export function radialFromValuation(valuation: Valuation, dataform: Partial<RadialDataform> = {}): RadialDataform {
  const rings = valuation.fibers.map((fiber, index) =>
    Object.freeze({
      ordinal: index,
      label: predicateLabel(fiber.predicate),
      segments: Object.freeze(fiber.assignments.map(segmentOfMeme)),
    }) satisfies RadialRing);
  return Object.freeze({ ...dataform, rings: Object.freeze(rings) });
}

/**
 * A radial diagram of a valuation-closure: one concentric ring PER ordinal stage,
 * each ring's segments that stage's charged cells. The "finite element-set that
 * varies with the settling ordinal" reading. The ring's ordinal is its position
 * in the closure sequence (stage 0 first).
 */
export function radialFromClosureStages(
  stages: readonly PredicationValuationClosureStageCarrier[],
  dataform: Partial<RadialDataform> = {},
): RadialDataform {
  const rings = stages.map((stage, index) =>
    Object.freeze({
      ordinal: index,
      segments: Object.freeze(stage.valuation.fibers.flatMap((fiber) => fiber.assignments.map(segmentOfMeme))),
    }) satisfies RadialRing);
  return Object.freeze({ ...dataform, rings: Object.freeze(rings) });
}

/** The neutral fallback charge for a plainly-asserted segment: re-exported from svg. */
export { affirmedCharge };

/* ── projector ──────────────────────────────────────────────────────────── */

/** The radial vocabulary as a holography projector restricting the SVG codec. */
export const radialProjector: Projector<XmlNode> = restrict<XmlNode>(svgProjector, {
  type: "svg.radial",
  recognize: (resource) => /data-codec="radial"/.test(resource.content),
});
