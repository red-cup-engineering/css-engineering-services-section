/** Read an observed section for any drawing tier. This is a view of SignCells,
 *  never another evidence store, settlement engine, or joint truth value. */
import { sectionReading } from "@red-cup-engineering/signcell/cell";

/** Native elements expose the same section to sight, keyboard, and text-tier
 *  players. Objects and witnesses are text, never trusted HTML or commands. */
export function cellEvidenceNodes(cells, element) {
  const view = sectionReading(cells);
  return [
    element("p", { className: "qz-meta" }, Object.entries(view.readings).map(([name, count]) => `${count} ${name}`).join(" · ")),
    view.alternatives.length ? element("p", { className: "qz-meta" }, `Multiple values: ${view.alternatives.join(", ")}. A functional reading requires one unopposed cell.`) : null,
    ...view.entries.map(({ cell, address, reading, presence, witnesses }) => element("details", { className: "qz-cell" },
      element("summary", {}, `${cell.predicate} · ${reading}`),
      element("p", { className: "qz-meta" }, `Witness presence: ${presence}; ${witnesses.pos} for, ${witnesses.neg} against.`),
      element("pre", {}, JSON.stringify(cell.object, null, 2)),
      element("code", {}, address),
      element("details", {}, element("summary", {}, "Witnesses"), element("pre", {}, JSON.stringify({ for: cell.for, against: cell.against }, null, 2))),
    )),
    view.entries.length ? null : element("p", { className: "qz-meta" }, "No perceived cells. Map scenery supplies no evidence."),
  ];
}
