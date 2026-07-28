/**
 * analysis/formats-four - finite executable shadow of RelMath.Computing.FormatsFour.
 *
 * Serialization formats are classified by two independent FOUR-valued coordinates:
 * a content-commitment corner and a completion regime. The small table here is the
 * finite runtime counterpart of the Lean `Format.all` census.
 */
import {
  charge,
  chargeValue,
  leqKnowledge,
  type ChargeValueName,
} from "../../bilattice-charge.mjs";

export type FormatName =
  | "bytes"
  | "plaintext"
  | "json"
  | "rdf"
  | "markdown"
  | "html"
  | "tex"
  | "rmnHtml";

export type FormatRegime =
  | "ordinal.closure.regime.finite"
  | "ordinal.closure.regime.scott"
  | "ordinal.closure.regime.transfinite"
  | "ordinal.closure.regime.aperiodic";

export interface FormatFourRow {
  readonly name: FormatName;
  readonly corner: ChargeValueName;
  readonly regime: FormatRegime;
  readonly cost: 0 | 1 | 2 | 3;
  readonly decidable: boolean;
}

export interface FormatsClosureHierarchyReceipt {
  readonly kind: "formatsFour.closureHierarchy:witness";
  readonly formats: readonly FormatFourRow[];
  readonly cardinality: 8;
  readonly cornersOnto: true;
  readonly costRises: readonly [FormatName, FormatName];
  readonly costFalls: readonly [FormatName, FormatName];
  readonly topCornerMultiRegime: readonly FormatName[];
  readonly rmnHtmlRecoversDecidability: true;
}

export const formatRows: readonly FormatFourRow[] = Object.freeze([
  Object.freeze({ name: "bytes", corner: "absurd", regime: "ordinal.closure.regime.finite", cost: 0, decidable: true }),
  Object.freeze({ name: "plaintext", corner: "active", regime: "ordinal.closure.regime.finite", cost: 0, decidable: true }),
  Object.freeze({ name: "json", corner: "potential", regime: "ordinal.closure.regime.transfinite", cost: 2, decidable: false }),
  Object.freeze({ name: "rdf", corner: "stable", regime: "ordinal.closure.regime.scott", cost: 1, decidable: true }),
  Object.freeze({ name: "markdown", corner: "stable", regime: "ordinal.closure.regime.finite", cost: 0, decidable: true }),
  Object.freeze({ name: "html", corner: "stable", regime: "ordinal.closure.regime.aperiodic", cost: 3, decidable: false }),
  Object.freeze({ name: "tex", corner: "stable", regime: "ordinal.closure.regime.aperiodic", cost: 3, decidable: false }),
  Object.freeze({ name: "rmnHtml", corner: "stable", regime: "ordinal.closure.regime.scott", cost: 1, decidable: true }),
]);

const rowOf = (name: FormatName): FormatFourRow => {
  const row = formatRows.find((candidate) => candidate.name === name);
  if (row === undefined) throw new RangeError(`unknown format ${name}`);
  return row;
};

const knowledgeLeq = (left: FormatFourRow, right: FormatFourRow): boolean =>
  leqKnowledge(charge(chargeValue(left.corner)), charge(chargeValue(right.corner)));

/** The finite `FormatsClosureHierarchy` bundle: FOUR x FOUR and non-monotone cost. */
export function formatsClosureHierarchy(): FormatsClosureHierarchyReceipt {
  const bytes = rowOf("bytes");
  const json = rowOf("json");
  const rdf = rowOf("rdf");
  const markdown = rowOf("markdown");
  const html = rowOf("html");
  const rmnHtml = rowOf("rmnHtml");
  const cornerNames = new Set(formatRows.map((row) => row.corner));

  if (!knowledgeLeq(bytes, json) || !(bytes.cost < json.cost)) {
    throw new Error("FormatsFour invariant failed: bytes <=K json must raise cost");
  }
  if (!knowledgeLeq(json, rdf) || !(rdf.cost < json.cost)) {
    throw new Error("FormatsFour invariant failed: json <=K rdf must lower cost");
  }
  if (rmnHtml.corner !== html.corner || rmnHtml.decidable !== true || html.decidable !== false) {
    throw new Error("FormatsFour invariant failed: RMN-in-HTML decidability");
  }
  if (cornerNames.size !== 4) {
    throw new Error("FormatsFour invariant failed: corner projection is not onto FOUR");
  }

  return Object.freeze({
    kind: "formatsFour.closureHierarchy:witness" as const,
    formats: formatRows,
    cardinality: 8 as const,
    cornersOnto: true as const,
    costRises: Object.freeze(["bytes", "json"]) as readonly [FormatName, FormatName],
    costFalls: Object.freeze(["json", "rdf"]) as readonly [FormatName, FormatName],
    topCornerMultiRegime: Object.freeze([markdown.name, rdf.name, html.name]),
    rmnHtmlRecoversDecidability: true as const,
  });
}
