import { createRelationalOperationProtocol } from "@red-cup-engineering/a2a-sovereign-operation-boundary-service";

export const observationProtocol = createRelationalOperationProtocol({
  requestKind: "org.emsenn.youtube-public-channel-feed-observation.a2a-request.v1",
  responseKind: "org.emsenn.youtube-public-channel-feed-observation.a2a-response.v1",
  label: "YouTube public channel feed observation",
});

