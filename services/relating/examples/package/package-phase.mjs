import { actions } from "@red-cup-engineering/relating/actions";
import { utteranceCarrier } from "@red-cup-engineering/relating/carriers";
import { wireCodec } from "@red-cup-engineering/relating/codecs/boundary/wire";
import { mark, utterance } from "@red-cup-engineering/relating/articulating";
import { induceBins } from "@red-cup-engineering/relating/running";

const admitted = utterance(mark("token"), mark("claim"));
const apex = induceBins(actions, { packageName: "@red-cup-engineering/relating" });

console.log(JSON.stringify({
  carrier: {
    id: utteranceCarrier.id,
    validates: utteranceCarrier.validate(admitted),
  },
  actions: {
    count: actions.length,
    firstDescentVerbs: apex.discovery.bins.slice(0, 6).map((bin) => bin.name),
  },
  codecs: {
    jsonMediaType: wireCodec("json").mediaType,
    rmnMediaType: wireCodec("rmn").mediaType,
  },
}, null, 2));
