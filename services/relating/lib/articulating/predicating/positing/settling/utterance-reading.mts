/**
 * utterance-reading - ergonomic readers over the lawful utterance descent.
 */
import type { UtteranceCarrier } from "../../../utterance.mjs";
import { freePredicationSite } from "../../predication.mjs";
import { posit } from "../fiber.mjs";
import { fixedPoints } from "./fixed-point.mjs";
import { fixedPointReadings, type MemeTopologyFixedPointReadings } from "./fixed-point-reading.mjs";
import { freeSettlementFiltration, type SettlementFiltrationGenerators } from "./valuation-closure.mjs";
import type { SettlementFiltration } from "./object.mjs";
import { induceRelation, relateRelations } from "./topology.mjs";

function generatorsOfUtterances(utterances: readonly UtteranceCarrier[]): SettlementFiltrationGenerators {
  if (utterances.length === 0) throw new TypeError("expected at least one utterance");
  return utterances
    .map(induceRelation)
    .reduce((left, right) => relateRelations(left, right));
}

export function settleUtterances(utterances: readonly UtteranceCarrier[]): SettlementFiltration {
  return freeSettlementFiltration(generatorsOfUtterances(utterances));
}

export function fixedPointReadingsOfUtterances(utterances: readonly UtteranceCarrier[]): MemeTopologyFixedPointReadings {
  const generators = generatorsOfUtterances(utterances);
  const site = freePredicationSite({
    kind: "predication.site",
    cells: generators.cells,
    specializations: generators.specializations,
  });
  return fixedPointReadings(fixedPoints(posit(site)));
}
