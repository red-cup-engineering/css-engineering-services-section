import { articulate, mark, utterance } from "@lenticule-science/articulating";
import { predicate, presentPredicationSite } from "@lenticule-science/articulating/predicating";

const aperture = utterance(mark("support"), mark("relation can land"));
const lens = articulate(aperture);
const sensor = presentPredicationSite(predicate(lens));
const exposureLedgerHandle = {
  specimen: "support/relation can land",
  obstruction: "no admitted valuation; predication is exposed without positing or settlement",
};

console.log(JSON.stringify({
  aperture: aperture.kind,
  lens: lens.kind,
  sensor: sensor.kind,
  projection: sensor.cells.length,
  exposureLedgerHandle,
}, null, 2));
