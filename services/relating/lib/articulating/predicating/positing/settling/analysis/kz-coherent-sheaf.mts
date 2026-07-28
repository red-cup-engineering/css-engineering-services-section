/**
 * analysis/kz-coherent-sheaf - finite executable shadow of
 * RelMath.Cohomology.KZCoherentSheaf.
 *
 * Lean defines KZ-coherence as a sheaf-level descent condition equating section
 * maps along KZ-connected parallel 1-cells. In the strict/Scott runtime slice,
 * those KZ 2-cells collapse extensional 1-cells, so every sheaf is coherent.
 */

export interface ZeroCellCarrier {
  readonly kind: "kzSheaf.zeroCell";
  readonly name: string;
}

export interface OneCellCarrier {
  readonly kind: "kzSheaf.oneCell";
  readonly label: string;
  readonly source: string;
  readonly target: string;
  readonly predicateLeg: string;
}

export interface KZ2CellReceipt {
  readonly kind: "kzSheaf.2cell:witness";
  readonly left: OneCellCarrier;
  readonly right: OneCellCarrier;
  readonly parallel: true;
  readonly extensionalEquality: true;
  readonly invertible: true;
}

export interface SheafCarrier {
  readonly kind: "kzSheaf.sheaf";
  readonly zeroCells: readonly ZeroCellCarrier[];
  readonly oneCells: readonly OneCellCarrier[];
  readonly sections: Readonly<Record<string, string>>;
  readonly restId: Readonly<Record<string, string>>;
}

export interface KZCoherenceReceipt {
  readonly kind: "kzSheaf.coherence:witness";
  readonly sheaf: SheafCarrier;
  readonly kzCells: readonly KZ2CellReceipt[];
  readonly identifiesParallel: true;
  readonly everySheafCoherentStrict: true;
}

export interface KZDescentReceipt {
  readonly kind: "kzSheaf.descent:witness";
  readonly source: SheafCarrier;
  readonly restricted: SheafCarrier;
  readonly sourceCoherent: KZCoherenceReceipt;
  readonly restrictedCoherent: KZCoherenceReceipt;
  readonly closedUnderRestriction: true;
  readonly strictRegimeUniversality: true;
}

export interface KZCoherentSheafReceipt {
  readonly kind: "kzSheaf.receipt:witness";
  readonly coherence: KZCoherenceReceipt;
  readonly descent: KZDescentReceipt;
  readonly aperiodicFrontier: "non-trivial aperiodic 2-cells remain proof-side";
  readonly openFrontier: readonly string[];
}

const uniqueSorted = (values: readonly string[]): readonly string[] =>
  Object.freeze([...new Set(values)].sort((left, right) => left.localeCompare(right)));

export const zeroCell = (name: string): ZeroCellCarrier => {
  if (name.length === 0) throw new TypeError("zeroCell: name must be nonempty");
  return Object.freeze({ kind: "kzSheaf.zeroCell" as const, name });
};

export const oneCell = (label: string, source: string, target: string, predicateLeg: string): OneCellCarrier => {
  if ([label, source, target, predicateLeg].some((value) => value.length === 0)) {
    throw new TypeError("oneCell: label/source/target/predicateLeg must be nonempty");
  }
  return Object.freeze({ kind: "kzSheaf.oneCell" as const, label, source, target, predicateLeg });
};

export const oneCellKey = (cell: OneCellCarrier): string =>
  `${cell.source}\u0000${cell.target}\u0000${cell.predicateLeg}`;

export const parallel = (left: OneCellCarrier, right: OneCellCarrier): boolean =>
  left.source === right.source && left.target === right.target;

export const kzConnected = (left: OneCellCarrier, right: OneCellCarrier): boolean =>
  parallel(left, right) && oneCellKey(left) === oneCellKey(right);

export function kz2Cell(left: OneCellCarrier, right: OneCellCarrier): KZ2CellReceipt {
  if (!kzConnected(left, right)) throw new TypeError("kz2Cell: cells are not KZ-connected in the strict runtime slice");
  return Object.freeze({
    kind: "kzSheaf.2cell:witness" as const,
    left,
    right,
    parallel: true as const,
    extensionalEquality: true as const,
    invertible: true as const,
  });
}

export function sheaf(
  zeroNames: readonly string[],
  oneCells: readonly OneCellCarrier[],
  sections: Readonly<Record<string, string>>,
  restId: Readonly<Record<string, string>>,
): SheafCarrier {
  const zeroCells = uniqueSorted(zeroNames).map(zeroCell);
  for (const cell of oneCells) {
    if (!zeroNames.includes(cell.source) || !zeroNames.includes(cell.target)) {
      throw new TypeError(`sheaf: one-cell ${cell.label} mentions an unknown zero-cell`);
    }
  }
  const sectionRecord: Record<string, string> = {};
  for (const cell of oneCells) {
    const key = oneCellKey(cell);
    const section = sections[key];
    if (section === undefined) throw new TypeError(`sheaf: missing section for ${cell.label}`);
    sectionRecord[key] = section;
  }
  const idRecord: Record<string, string> = {};
  for (const cell of zeroCells) idRecord[cell.name] = restId[cell.name] ?? `id:${cell.name}`;
  return Object.freeze({
    kind: "kzSheaf.sheaf" as const,
    zeroCells: Object.freeze(zeroCells),
    oneCells: Object.freeze([...oneCells]),
    sections: Object.freeze(sectionRecord),
    restId: Object.freeze(idRecord),
  });
}

const sectionOf = (carrier: SheafCarrier, cell: OneCellCarrier): string =>
  carrier.sections[oneCellKey(cell)] ?? "";

const allKzCells = (carrier: SheafCarrier): readonly KZ2CellReceipt[] =>
  Object.freeze(carrier.oneCells.flatMap((left) =>
    carrier.oneCells.filter((right) => kzConnected(left, right)).map((right) => kz2Cell(left, right))));

export function kzCoherenceReceipt(carrier: SheafCarrier): KZCoherenceReceipt {
  const kzCells = allKzCells(carrier);
  const identifiesParallel = kzCells.every((cell) => sectionOf(carrier, cell.left) === sectionOf(carrier, cell.right));
  if (!identifiesParallel) throw new TypeError("kzCoherenceReceipt: KZ-connected routes had different section maps");
  return Object.freeze({
    kind: "kzSheaf.coherence:witness" as const,
    sheaf: carrier,
    kzCells,
    identifiesParallel: true as const,
    everySheafCoherentStrict: true as const,
  });
}

export function postcompose(
  carrier: SheafCarrier,
  transform: Readonly<Record<string, string>>,
): SheafCarrier {
  const sections = Object.fromEntries(Object.entries(carrier.sections).map(([key, value]) => [key, transform[value] ?? value]));
  const restId = Object.fromEntries(Object.entries(carrier.restId).map(([key, value]) => [key, transform[value] ?? value]));
  return sheaf(carrier.zeroCells.map((cell) => cell.name), carrier.oneCells, sections, restId);
}

export function descentReceipt(carrier: SheafCarrier = defaultSheaf): KZDescentReceipt {
  const restricted = postcompose(carrier, {
    "section:advance": "restricted:advance",
    "id:start": "restricted:id:start",
    "id:done": "restricted:id:done",
  });
  return Object.freeze({
    kind: "kzSheaf.descent:witness" as const,
    source: carrier,
    restricted,
    sourceCoherent: kzCoherenceReceipt(carrier),
    restrictedCoherent: kzCoherenceReceipt(restricted),
    closedUnderRestriction: true as const,
    strictRegimeUniversality: true as const,
  });
}

const routeA = oneCell("route-a", "start", "done", "advance");
const routeB = oneCell("route-b", "start", "done", "advance");

export const defaultSheaf: SheafCarrier = sheaf(
  ["start", "done"],
  [routeA, routeB],
  { [oneCellKey(routeA)]: "section:advance" },
  { start: "id:start", done: "id:done" },
);

export function receipt(): KZCoherentSheafReceipt {
  return Object.freeze({
    kind: "kzSheaf.receipt:witness" as const,
    coherence: kzCoherenceReceipt(defaultSheaf),
    descent: descentReceipt(defaultSheaf),
    aperiodicFrontier: "non-trivial aperiodic 2-cells remain proof-side" as const,
    openFrontier: Object.freeze([
      "The runtime KZ 2-cell is the strict/Scott extensional equality of parallel 1-cells.",
      "Aperiodic non-identity 2-cells, where coherence is a genuine restriction, remain proof-side.",
      "The site-layer sheaf gluing is inherited from existing finite sheaf/cohomology surfaces, not rebuilt as a 2-site.",
    ]),
  });
}
