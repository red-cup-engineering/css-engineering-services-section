/**
 * analysis/settling-local-constancy - finite executable shadow of
 * RelMath.Cohomology.SettlingLocalConstancy.
 *
 * Lean's strict-regime model treats restriction isomorphisms as equality of
 * section maps. We reuse the KZ sheaf carrier and the finite bitopological site:
 * predicate-local constancy is KZ coherence plus pinned identity restrictions,
 * and settling-local constancy is equality along same predicate-leg routes.
 */
import {
  aperiodicClosureRegime,
  finiteClosureRegime,
  scottClosureRegime,
  transfiniteClosureRegime,
} from "../closure.mjs";
import { cohomologyVanishesInRegime } from "../value-category.mjs";
import { receipt as bitopologicalSiteReceipt, type BitopologicalSettlingSiteReceipt } from "./bitopological-settling-site.mjs";
import {
  defaultSheaf,
  kzCoherenceReceipt,
  oneCell,
  oneCellKey,
  sheaf,
  type KZCoherenceReceipt,
  type OneCellCarrier,
  type SheafCarrier,
} from "./kz-coherent-sheaf.mjs";

export interface SectionIsoReceipt {
  readonly kind: "settlingLocalConstancy.sectionIso:witness";
  readonly left: string;
  readonly right: string;
  readonly equal: true;
  readonly reflexive: true;
  readonly symmetric: true;
  readonly transitiveOnSample: true;
}

export interface PredicateLocalConstancyReceipt {
  readonly kind: "settlingLocalConstancy.predicate:witness";
  readonly sheaf: SheafCarrier;
  readonly coherence: KZCoherenceReceipt;
  readonly identityPinned: true;
  readonly predicateUniform: true;
  readonly predicateLocallyConstantIffUniform: true;
}

export interface SettlingLocalConstancyReceipt {
  readonly kind: "settlingLocalConstancy.settling:witness";
  readonly sheaf: SheafCarrier;
  readonly samePredicateLegPairs: readonly (readonly [OneCellCarrier, OneCellCarrier])[];
  readonly sectionMapsEqual: true;
  readonly everySheafSettlingLocallyConstantStrict: true;
  readonly temporalLegProofIrrelevant: true;
}

export interface ConstantSheafLocalConstancyReceipt {
  readonly kind: "settlingLocalConstancy.constantSheaf:witness";
  readonly sheaf: SheafCarrier;
  readonly value: string;
  readonly predicateLocallyConstant: PredicateLocalConstancyReceipt;
  readonly settlingLocallyConstant: SettlingLocalConstancyReceipt;
  readonly restrictionsAreIdentityIsomorphisms: true;
}

export interface VanishingRegimeLocalConstancyReceipt {
  readonly kind: "settlingLocalConstancy.vanishingRegime:witness";
  readonly h1VanishesInStrict: true;
  readonly h1VanishesInScott: true;
  readonly h1VanishesInTransfinite: false;
  readonly h1VanishesInAperiodic: false;
  readonly vanishingRegimeIsStrictOrScott: true;
  readonly h1VanishingUnconditionalInStrictModel: true;
  readonly aperiodicDichotomyFrontier: "aperiodic non-local-constancy is not witnessed by the Nat-indexed strict runtime model";
}

export interface SettlingLocalConstancyModuleReceipt {
  readonly kind: "settlingLocalConstancy.receipt:witness";
  readonly site: BitopologicalSettlingSiteReceipt;
  readonly predicate: PredicateLocalConstancyReceipt;
  readonly settling: SettlingLocalConstancyReceipt;
  readonly constantSheaf: ConstantSheafLocalConstancyReceipt;
  readonly regime: VanishingRegimeLocalConstancyReceipt;
  readonly frontier: readonly string[];
}

const sectionOf = (carrier: SheafCarrier, cell: OneCellCarrier): string =>
  carrier.sections[oneCellKey(cell)] ?? "";

const identityPinned = (carrier: SheafCarrier): boolean =>
  carrier.zeroCells.every((cell) => {
    const restId = carrier.restId[cell.name];
    return typeof restId === "string" && restId.length > 0;
  });

const samePredicateLeg = (left: OneCellCarrier, right: OneCellCarrier): boolean =>
  left.source === right.source && left.target === right.target && left.predicateLeg === right.predicateLeg;

const samePredicateLegPairs = (carrier: SheafCarrier): readonly (readonly [OneCellCarrier, OneCellCarrier])[] =>
  Object.freeze(carrier.oneCells.flatMap((left) =>
    carrier.oneCells
      .filter((right) => samePredicateLeg(left, right))
      .map((right) => Object.freeze([left, right] as const))));

export function sectionIso(left: string, right: string): SectionIsoReceipt {
  if (left !== right) throw new TypeError("sectionIso: strict-regime section isomorphism requires equality");
  return Object.freeze({
    kind: "settlingLocalConstancy.sectionIso:witness" as const,
    left,
    right,
    equal: true as const,
    reflexive: true as const,
    symmetric: true as const,
    transitiveOnSample: true as const,
  });
}

export function predicateLocalConstancyReceipt(carrier: SheafCarrier = defaultSheaf): PredicateLocalConstancyReceipt {
  const coherence = kzCoherenceReceipt(carrier);
  const pinned = identityPinned(carrier);
  if (!pinned || !coherence.identifiesParallel) {
    throw new TypeError("predicateLocalConstancyReceipt: KZ coherence or identity pinning failed");
  }
  return Object.freeze({
    kind: "settlingLocalConstancy.predicate:witness" as const,
    sheaf: carrier,
    coherence,
    identityPinned: true as const,
    predicateUniform: true as const,
    predicateLocallyConstantIffUniform: true as const,
  });
}

export function settlingLocalConstancyReceipt(carrier: SheafCarrier = defaultSheaf): SettlingLocalConstancyReceipt {
  const pairs = samePredicateLegPairs(carrier);
  const sectionMapsEqual = pairs.every(([left, right]) => sectionOf(carrier, left) === sectionOf(carrier, right));
  if (!sectionMapsEqual) {
    throw new TypeError("settlingLocalConstancyReceipt: same-predicate-leg section maps diverged");
  }
  return Object.freeze({
    kind: "settlingLocalConstancy.settling:witness" as const,
    sheaf: carrier,
    samePredicateLegPairs: pairs,
    sectionMapsEqual: true as const,
    everySheafSettlingLocallyConstantStrict: true as const,
    temporalLegProofIrrelevant: true as const,
  });
}

export function constantSheaf(value = "constant:section"): SheafCarrier {
  const idStart = oneCell("id:start", "start", "start", "id");
  const idDone = oneCell("id:done", "done", "done", "id");
  const advanceA = oneCell("constant:advance-a", "start", "done", "advance");
  const advanceB = oneCell("constant:advance-b", "start", "done", "advance");
  return sheaf(
    ["start", "done"],
    [idStart, idDone, advanceA, advanceB],
    {
      [oneCellKey(idStart)]: value,
      [oneCellKey(idDone)]: value,
      [oneCellKey(advanceA)]: value,
      [oneCellKey(advanceB)]: value,
    },
    { start: value, done: value },
  );
}

export function constantSheafLocalConstancyReceipt(value = "constant:section"): ConstantSheafLocalConstancyReceipt {
  const carrier = constantSheaf(value);
  return Object.freeze({
    kind: "settlingLocalConstancy.constantSheaf:witness" as const,
    sheaf: carrier,
    value,
    predicateLocallyConstant: predicateLocalConstancyReceipt(carrier),
    settlingLocallyConstant: settlingLocalConstancyReceipt(carrier),
    restrictionsAreIdentityIsomorphisms: true as const,
  });
}

export function vanishingRegimeLocalConstancyReceipt(): VanishingRegimeLocalConstancyReceipt {
  const strict = cohomologyVanishesInRegime(finiteClosureRegime);
  const scott = cohomologyVanishesInRegime(scottClosureRegime);
  const transfinite = cohomologyVanishesInRegime(transfiniteClosureRegime);
  const aperiodic = cohomologyVanishesInRegime(aperiodicClosureRegime);
  if (!strict || !scott || transfinite || aperiodic) {
    throw new TypeError("vanishingRegimeLocalConstancyReceipt: regime cohomology table drifted");
  }
  return Object.freeze({
    kind: "settlingLocalConstancy.vanishingRegime:witness" as const,
    h1VanishesInStrict: true as const,
    h1VanishesInScott: true as const,
    h1VanishesInTransfinite: false as const,
    h1VanishesInAperiodic: false as const,
    vanishingRegimeIsStrictOrScott: true as const,
    h1VanishingUnconditionalInStrictModel: true as const,
    aperiodicDichotomyFrontier: "aperiodic non-local-constancy is not witnessed by the Nat-indexed strict runtime model" as const,
  });
}

export function receipt(carrier: SheafCarrier = defaultSheaf): SettlingLocalConstancyModuleReceipt {
  return Object.freeze({
    kind: "settlingLocalConstancy.receipt:witness" as const,
    site: bitopologicalSiteReceipt(),
    predicate: predicateLocalConstancyReceipt(carrier),
    settling: settlingLocalConstancyReceipt(carrier),
    constantSheaf: constantSheafLocalConstancyReceipt(),
    regime: vanishingRegimeLocalConstancyReceipt(),
    frontier: Object.freeze([
      "The runtime model treats section isomorphism as equality, matching the strict-regime Lean shadow.",
      "Aperiodic failure of local constancy at every countable tau0 remains proof-side; this Nat-indexed model records the boundary.",
      "General sheaves over arbitrary bitopological Grothendieck sites are not synthesized by this finite receipt.",
    ]),
  });
}
