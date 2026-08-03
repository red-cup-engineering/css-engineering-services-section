import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { admitOperationTerm, identifyOperationTerm } from "./semantic-content.mjs";
import { decodeRelationalValue } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { relationalWitnessJournalDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { ACTOR, deriveOperationsManifoldForest } from "./forest.mjs";

const id = (value) => identifyOperationTerm(relationalWitnessJournalDocument(value)).token;
const record = (body) => Object.freeze({ id: id(body), ...body });
const exact = (value) => value?.id === id(Object.fromEntries(Object.entries(value ?? {}).filter(([key]) => key !== "id")));
export const operationBytes = (value) => identifyOperationTerm(relationalWitnessJournalDocument(value)).bytes;
export function operationFromBytes(bytes) {
  const term = admitOperationTerm(bytes);
  if (term?.[0] !== "ascribe" || term.length !== 3) throw new Error("operations forest is not one typed relational RMN document");
  return decodeRelationalValue(term[1], term[2]);
}
export async function executeOperation(request, options = {}) {
  if (!exact(request) || request.type !== "OperationsManifoldForestOperation" || request.provider !== ACTOR) {
    throw new Error("exact provider-addressed canonical RMN operations-forest request is required");
  }
  const forest = await (options.deriveOperationsManifoldForest ?? deriveOperationsManifoldForest)(
    request.manifolds,
    options.forestOptions,
  );
  return record({ type: "OperationsManifoldForestOperationResult", provider: ACTOR, request: request.id, forest });
}
export async function executeA2aMessage(source, options = {}) {
  const message = Message.fromJSON(source);
  if (message.role !== Role.ROLE_USER) throw new Error("operations forest requires an A2A user Message");
  const input = extractRmnPart(message.parts);
  const response = await executeOperation(operationFromBytes(input.bytes), options);
  return Message.toJSON({
    messageId: "", contextId: message.contextId ?? "", taskId: message.taskId ?? "",
    role: Role.ROLE_AGENT, parts: [rmnPart(operationBytes(response))],
    metadata: { inputNi: input.ni, outputNi: response.id, provider: ACTOR },
    extensions: [], referenceTaskIds: [],
  });
}
