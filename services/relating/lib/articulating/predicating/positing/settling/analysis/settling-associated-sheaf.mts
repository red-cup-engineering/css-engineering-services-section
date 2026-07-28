/**
 * analysis/settling-associated-sheaf - finite executable shadow of
 * RelMath.Cohomology.SettlingAssociatedSheaf.
 *
 * Lean proves the settling-associated sheaf masks, restriction laws, and the
 * designated short exact sequence. This module exposes the finite mask/cochain
 * operations over charge-valued cells, plus bounded sample receipts for the
 * all-integer proof obligations.
 */
import { asChargeValueName, type ChargeValueName } from "../../bilattice-charge.mjs";

export interface ChargedCell {
  readonly kind: "settlingAssociatedSheaf.chargedCell";
  readonly cell: string;
  readonly charge: ChargeValueName;
}

export interface MaskCarrier {
  readonly kind: "settlingAssociatedSheaf.mask";
  readonly name: "dT" | "dK" | "dTop" | "custom";
  readonly cells: readonly string[];
}

export interface CochainEntry {
  readonly cell: string;
  readonly coefficient: number;
}

export interface CochainCarrier {
  readonly kind: "settlingAssociatedSheaf.cochain";
  readonly coefficients: readonly CochainEntry[];
}

export interface MaskSplitReceipt {
  readonly kind: "settlingAssociatedSheaf.maskSplit:witness";
  readonly valuation: readonly ChargedCell[];
  readonly dT: MaskCarrier;
  readonly dTop: MaskCarrier;
  readonly dK: MaskCarrier;
  readonly dTDisjointDTop: true;
  readonly dKEqualsUnion: true;
  readonly dTIncludedInDK: true;
  readonly dTopIncludedInDK: true;
}

export interface RestrictionReceipt {
  readonly kind: "settlingAssociatedSheaf.restriction:witness";
  readonly cochain: CochainCarrier;
  readonly fullMask: MaskCarrier;
  readonly subMask: MaskCarrier;
  readonly restricted: CochainCarrier;
  readonly fullRestrictionIdentity: true;
  readonly restrictedVanishesOffMask: true;
  readonly restrictionComposesByMeet: true;
}

export interface ShortExactSequenceReceipt {
  readonly kind: "settlingAssociatedSheaf.shortExactSequence:witness";
  readonly cochain: CochainCarrier;
  readonly iota: CochainCarrier;
  readonly pi: CochainCarrier;
  readonly truthPart: CochainCarrier;
  readonly topPart: CochainCarrier;
  readonly reconstructed: CochainCarrier;
  readonly iotaImageVanishesOnTop: true;
  readonly piSurjectiveOnTopPart: true;
  readonly kernelPiIffVanishesOnTopOnSample: true;
  readonly splitReconstructs: true;
  readonly splitUniqueOnSample: true;
  readonly sampleSize: number;
}

export interface SettlingAssociatedSheafReceipt {
  readonly kind: "settlingAssociatedSheaf.receipt:witness";
  readonly masks: MaskSplitReceipt;
  readonly restriction: RestrictionReceipt;
  readonly ses: ShortExactSequenceReceipt;
  readonly supportReading: Readonly<Record<ChargeValueName, {
    readonly dT: boolean;
    readonly dK: boolean;
    readonly dTop: boolean;
  }>>;
  readonly openFrontier: readonly string[];
}

const canonicalCells = (valuation: readonly ChargedCell[]): readonly string[] =>
  Object.freeze(valuation.map((entry) => entry.cell));

const unique = (cells: readonly string[]): readonly string[] => {
  const out: string[] = [];
  for (const cell of cells) if (!out.includes(cell)) out.push(cell);
  return Object.freeze(out);
};

const assertSafeInteger = (value: number): number => {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`cochain coefficient must be a safe integer: ${value}`);
  }
  return value;
};

export function chargedCell(cell: string, charge: string): ChargedCell {
  if (cell.length === 0) throw new TypeError("chargedCell: cell id must be nonempty");
  return Object.freeze({
    kind: "settlingAssociatedSheaf.chargedCell" as const,
    cell,
    charge: asChargeValueName(charge),
  });
}

export function mask(name: MaskCarrier["name"], cells: readonly string[]): MaskCarrier {
  return Object.freeze({
    kind: "settlingAssociatedSheaf.mask" as const,
    name,
    cells: unique(cells),
  });
}

export function cochain(coefficients: readonly CochainEntry[]): CochainCarrier {
  const merged = new Map<string, number>();
  for (const entry of coefficients) {
    if (entry.cell.length === 0) throw new TypeError("cochain: cell id must be nonempty");
    merged.set(entry.cell, (merged.get(entry.cell) ?? 0) + assertSafeInteger(entry.coefficient));
  }
  return Object.freeze({
    kind: "settlingAssociatedSheaf.cochain" as const,
    coefficients: Object.freeze([...merged.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([cell, coefficient]) => Object.freeze({ cell, coefficient: assertSafeInteger(coefficient) }))),
  });
}

const coefficientAt = (value: CochainCarrier, cell: string): number =>
  value.coefficients.find((entry) => entry.cell === cell)?.coefficient ?? 0;

const sameCochain = (cells: readonly string[], left: CochainCarrier, right: CochainCarrier): boolean =>
  cells.every((cell) => coefficientAt(left, cell) === coefficientAt(right, cell));

const subset = (left: MaskCarrier, right: MaskCarrier): boolean =>
  left.cells.every((cell) => right.cells.includes(cell));

const sameMask = (left: MaskCarrier, right: MaskCarrier): boolean =>
  subset(left, right) && subset(right, left);

const meetMask = (left: MaskCarrier, right: MaskCarrier): MaskCarrier =>
  mask("custom", left.cells.filter((cell) => right.cells.includes(cell)));

export function dT(valuation: readonly ChargedCell[]): MaskCarrier {
  return mask("dT", valuation.filter((entry) => entry.charge === "potential").map((entry) => entry.cell));
}

export function dTop(valuation: readonly ChargedCell[]): MaskCarrier {
  return mask("dTop", valuation.filter((entry) => entry.charge === "stable").map((entry) => entry.cell));
}

export function dK(valuation: readonly ChargedCell[]): MaskCarrier {
  return mask("dK", valuation
    .filter((entry) => entry.charge === "potential" || entry.charge === "stable")
    .map((entry) => entry.cell));
}

export function restrict(support: MaskCarrier, value: CochainCarrier): CochainCarrier {
  return cochain(value.coefficients.map((entry) => Object.freeze({
    cell: entry.cell,
    coefficient: support.cells.includes(entry.cell) ? entry.coefficient : 0,
  })));
}

export const iota = (valuation: readonly ChargedCell[], value: CochainCarrier): CochainCarrier =>
  restrict(dT(valuation), value);

export const pi = (valuation: readonly ChargedCell[], value: CochainCarrier): CochainCarrier =>
  restrict(dTop(valuation), value);

export const projT = iota;
export const projTop = pi;

export function combine(left: CochainCarrier, right: CochainCarrier): CochainCarrier {
  return cochain([
    ...left.coefficients,
    ...right.coefficients,
  ]);
}

export function vanishesOff(support: MaskCarrier, value: CochainCarrier, cells: readonly string[]): boolean {
  return cells.every((cell) => support.cells.includes(cell) || coefficientAt(value, cell) === 0);
}

export function vanishesOnTop(valuation: readonly ChargedCell[], value: CochainCarrier): boolean {
  const top = dTop(valuation);
  return top.cells.every((cell) => coefficientAt(value, cell) === 0);
}

export function maskSplitReceipt(valuationInput: readonly ChargedCell[] = defaultValuation): MaskSplitReceipt {
  const valuation = Object.freeze([...valuationInput]);
  const truth = dT(valuation);
  const topOnly = dTop(valuation);
  const belnap = dK(valuation);
  const dTDisjointDTop = truth.cells.every((cell) => !topOnly.cells.includes(cell));
  const union = mask("custom", [...truth.cells, ...topOnly.cells]);
  const dKEqualsUnion = sameMask(belnap, union);
  const dTIncludedInDK = subset(truth, belnap);
  const dTopIncludedInDK = subset(topOnly, belnap);

  if (!dTDisjointDTop || !dKEqualsUnion || !dTIncludedInDK || !dTopIncludedInDK) {
    throw new TypeError("maskSplitReceipt: dT/dK/dTop split laws failed");
  }

  return Object.freeze({
    kind: "settlingAssociatedSheaf.maskSplit:witness" as const,
    valuation,
    dT: truth,
    dTop: topOnly,
    dK: belnap,
    dTDisjointDTop: true as const,
    dKEqualsUnion: true as const,
    dTIncludedInDK: true as const,
    dTopIncludedInDK: true as const,
  });
}

export function restrictionReceipt(
  valuationInput: readonly ChargedCell[] = defaultValuation,
  value: CochainCarrier = defaultCochain,
): RestrictionReceipt {
  const cells = canonicalCells(valuationInput);
  const fullMask = mask("custom", cells);
  const subMask = dT(valuationInput);
  const restricted = restrict(subMask, value);
  const fullRestrictionIdentity = sameCochain(cells, restrict(fullMask, value), value);
  const restrictedVanishesOffMask = vanishesOff(subMask, restricted, cells);
  const m1 = dK(valuationInput);
  const m2 = dTop(valuationInput);
  const restrictionComposesByMeet = sameCochain(
    cells,
    restrict(m2, restrict(m1, value)),
    restrict(meetMask(m2, m1), value),
  );

  if (!fullRestrictionIdentity || !restrictedVanishesOffMask || !restrictionComposesByMeet) {
    throw new TypeError("restrictionReceipt: masked cochain restriction laws failed");
  }

  return Object.freeze({
    kind: "settlingAssociatedSheaf.restriction:witness" as const,
    cochain: value,
    fullMask,
    subMask,
    restricted,
    fullRestrictionIdentity: true as const,
    restrictedVanishesOffMask: true as const,
    restrictionComposesByMeet: true as const,
  });
}

const sampleCochains = (cells: readonly string[]): readonly CochainCarrier[] => {
  const values = [-1, 0, 1] as const;
  let samples: readonly CochainCarrier[] = Object.freeze([cochain([])]);
  for (const cell of cells) {
    samples = Object.freeze(samples.flatMap((existing) =>
      values.map((coefficient) => cochain([...existing.coefficients, { cell, coefficient }]))));
  }
  return samples;
};

export function shortExactSequenceReceipt(
  valuationInput: readonly ChargedCell[] = defaultValuation,
  value: CochainCarrier = defaultCochain,
): ShortExactSequenceReceipt {
  const cells = canonicalCells(valuationInput);
  const belnap = dK(valuationInput);
  const topOnly = dTop(valuationInput);
  const truthPart = projT(valuationInput, value);
  const topPart = projTop(valuationInput, value);
  const reconstructed = combine(truthPart, topPart);
  const included = iota(valuationInput, value);
  const projected = pi(valuationInput, value);
  const samples = sampleCochains(cells);
  const supportedSamples = samples.filter((sample) => vanishesOff(belnap, sample, cells));

  const iotaImageVanishesOnTop = supportedSamples.every((sample) => vanishesOnTop(valuationInput, iota(valuationInput, sample)));
  const piSurjectiveOnTopPart = samples
    .filter((sample) => vanishesOff(topOnly, sample, cells))
    .every((sample) => sameCochain(cells, pi(valuationInput, sample), sample));
  const kernelPiIffVanishesOnTopOnSample = supportedSamples.every((sample) =>
    sameCochain(cells, pi(valuationInput, sample), cochain([])) === vanishesOnTop(valuationInput, sample),
  );
  const splitReconstructs = supportedSamples.every((sample) =>
    sameCochain(cells, combine(projT(valuationInput, sample), projTop(valuationInput, sample)), sample),
  );
  const splitUniqueOnSample = supportedSamples.every((left) => supportedSamples.every((right) => {
    const sameParts = sameCochain(cells, projT(valuationInput, left), projT(valuationInput, right))
      && sameCochain(cells, projTop(valuationInput, left), projTop(valuationInput, right));
    return !sameParts || sameCochain(cells, left, right);
  }));

  if (!iotaImageVanishesOnTop || !piSurjectiveOnTopPart || !kernelPiIffVanishesOnTopOnSample || !splitReconstructs || !splitUniqueOnSample) {
    throw new TypeError("shortExactSequenceReceipt: designated SES sample laws failed");
  }

  return Object.freeze({
    kind: "settlingAssociatedSheaf.shortExactSequence:witness" as const,
    cochain: value,
    iota: included,
    pi: projected,
    truthPart,
    topPart,
    reconstructed,
    iotaImageVanishesOnTop: true as const,
    piSurjectiveOnTopPart: true as const,
    kernelPiIffVanishesOnTopOnSample: true as const,
    splitReconstructs: true as const,
    splitUniqueOnSample: true as const,
    sampleSize: supportedSamples.length,
  });
}

export const defaultValuation: readonly ChargedCell[] = Object.freeze([
  chargedCell("truth-cell", "potential"),
  chargedCell("both-cell", "stable"),
  chargedCell("false-cell", "active"),
  chargedCell("empty-cell", "absurd"),
]);

export const defaultCochain: CochainCarrier = cochain([
  { cell: "truth-cell", coefficient: 2 },
  { cell: "both-cell", coefficient: 5 },
  { cell: "false-cell", coefficient: 0 },
  { cell: "empty-cell", coefficient: 0 },
]);

export function receipt(): SettlingAssociatedSheafReceipt {
  return Object.freeze({
    kind: "settlingAssociatedSheaf.receipt:witness" as const,
    masks: maskSplitReceipt(defaultValuation),
    restriction: restrictionReceipt(defaultValuation, defaultCochain),
    ses: shortExactSequenceReceipt(defaultValuation, defaultCochain),
    supportReading: Object.freeze({
      absurd: Object.freeze({ dT: false, dK: false, dTop: false }),
      potential: Object.freeze({ dT: true, dK: true, dTop: false }),
      active: Object.freeze({ dT: false, dK: false, dTop: false }),
      stable: Object.freeze({ dT: false, dK: true, dTop: true }),
    }),
    openFrontier: Object.freeze([
      "Lean proves the restriction and SES laws for arbitrary integer cochains; RMN carries finite executable samples and operations.",
      "Sheaf gluing and H1=0 are reused from existing finite cohomology/sheaf surfaces, not reconstructed as arbitrary cover proof objects.",
      "General bitopological site semantics and non-finite clopen covers remain proof/kernel obligations.",
    ]),
  });
}
