import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { decodeRelationalValue } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { relationalWitnessJournalDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { ACTOR, judgeCarrierComposition } from "./judgment.mjs";

const id = (value) => semanticId(relationalWitnessJournalDocument(value));
const record = (body) => Object.freeze({ id: id(body), ...body });
const exact = (value) => value?.id === id(Object.fromEntries(Object.entries(value ?? {}).filter(([key]) => key !== "id")));
export const operationBytes = (value) => semanticBytes(relationalWitnessJournalDocument(value));
export function operationFromBytes(bytes) {
  const term = decodeSemantic(bytes);
  if (term?.[0] !== "ascribe" || term.length !== 3) throw new Error("composition judgment is not one typed relational RMN document");
  return decodeRelationalValue(term[1], term[2]);
}
export async function executeOperation(request, options = {}) {
  if (!exact(request) || request.type !== "CarrierCompositionJudgmentOperation" || request.provider !== ACTOR) {
    throw new Error("exact provider-addressed canonical RMN composition judgment is required");
  }
  const judgment = (options.judgeCarrierComposition ?? judgeCarrierComposition)(request.producer, request.consumer);
  return record({ type: "CarrierCompositionJudgmentOperationResult", provider: ACTOR, request: request.id, judgment });
}
export async function executeA2aMessage(source, options = {}) {
  const message = Message.fromJSON(source);
  if (message.role !== Role.ROLE_USER) throw new Error("composition judgment requires an A2A user Message");
  const input = extractRmnPart(message.parts);
  const response = await executeOperation(operationFromBytes(input.bytes), options);
  return Message.toJSON({
    messageId: "", contextId: message.contextId ?? "", taskId: message.taskId ?? "",
    role: Role.ROLE_AGENT, parts: [rmnPart(operationBytes(response))],
    metadata: { inputNi: input.ni, outputNi: response.id, provider: ACTOR },
    extensions: [], referenceTaskIds: [],
  });
}
