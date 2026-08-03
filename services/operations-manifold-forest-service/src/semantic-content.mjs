import { admitNormalizedSemanticContent, EMPTY_WITNESS_ROOT, identifyNormalizedSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { inferTy } from "@red-cup-engineering/relation-model-notation-typing";
export const identifyOperationTerm = (term) => identifyNormalizedSemanticContent({ objectKind: "operations-manifold-forest.operation", semanticType: inferTy([], term), term, witnessRoot: EMPTY_WITNESS_ROOT });
export const admitOperationTerm = (bytes) => admitNormalizedSemanticContent(bytes).envelope.settledBody;
