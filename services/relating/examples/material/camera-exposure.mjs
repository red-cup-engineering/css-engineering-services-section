import { articulate, mark, predicating, utterance } from "@red-cup-engineering/relating/articulating";
import { freeSettlementFiltration, induceRelation, settle } from "@red-cup-engineering/relating/settling";

const aperture = utterance(mark("support"), mark("relation can land"));
const lens = articulate(aperture);
const sensor = predicating.positing.posit(predicating.predicate(lens));
const developmentBath = settle(sensor);
const exposureLedgerHandle = {
  specimen: "support/relation can land",
  descentEqualsNamedInduction: JSON.stringify(developmentBath) === JSON.stringify(freeSettlementFiltration(induceRelation(aperture))),
};

console.log(JSON.stringify({
  aperture: aperture.kind,
  lens: lens.kind,
  sensor: sensor.kind,
  developmentBath: developmentBath.kind,
  phasePlate: developmentBath.kind,
  projection: developmentBath.stages[0].designated.cells.length,
  exposureLedgerHandle,
}, null, 2));
