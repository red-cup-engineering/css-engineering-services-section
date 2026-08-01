import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { a2aResultParts, sendRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { relationalWitnessJournalDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { ACTOR } from "./judgment.mjs";
import { operationBytes, operationFromBytes } from "./a2a-executor.mjs";

const id = (value) => semanticId(relationalWitnessJournalDocument(value));
const record = (body) => Object.freeze({ id: id(body), ...body });
export async function purchaseCarrierCompositionJudgment(producer, consumer, {
  agentCardUrl = process.env.CARRIER_COMPOSITION_JUDGMENT_AGENT_CARD_URL,
  send = sendRmnTask,
  signal,
} = {}) {
  if (typeof agentCardUrl !== "string" || !agentCardUrl) throw new Error("CARRIER_COMPOSITION_JUDGMENT_AGENT_CARD_URL is required");
  const operation = record({ type: "CarrierCompositionJudgmentOperation", provider: ACTOR, producer, consumer });
  const message = Message.toJSON({ messageId: randomUUID(), contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(operationBytes(operation))], metadata: {}, extensions: [], referenceTaskIds: [] });
  const exchange = await send({ agentUrl: agentCardUrl, message, requireSignature: true, signal });
  const response = operationFromBytes(extractRmnPart(a2aResultParts(exchange.result)).bytes);
  if (response?.type !== "CarrierCompositionJudgmentOperationResult" || response.provider !== ACTOR || response.request !== operation.id) {
    throw new Error("composition judgment Actor returned a foreign result");
  }
  return Object.freeze({
    ...response.judgment,
    judgmentProvider: ACTOR,
    judgmentReceipt: Object.freeze({ inputNi: exchange.inputNi, outputNi: exchange.outputNi, agentCard: exchange.agentCard }),
  });
}
