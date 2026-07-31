import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { a2aResultParts, sendRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { relationalRwilDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { ACTOR } from "./forest.mjs";
import { operationBytes, operationFromBytes } from "./a2a-executor.mjs";

const id = (value) => semanticId(relationalRwilDocument(value));
const record = (body) => Object.freeze({ id: id(body), ...body });
export async function purchaseOperationsManifoldForest(manifolds, {
  agentCardUrl = process.env.OPERATIONS_MANIFOLD_FOREST_AGENT_CARD_URL,
  send = sendRmnTask,
  signal,
} = {}) {
  if (typeof agentCardUrl !== "string" || !agentCardUrl) throw new Error("OPERATIONS_MANIFOLD_FOREST_AGENT_CARD_URL is required");
  const operation = record({ type: "OperationsManifoldForestOperation", provider: ACTOR, manifolds });
  const message = Message.toJSON({ messageId: randomUUID(), contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(operationBytes(operation))], metadata: {}, extensions: [], referenceTaskIds: [] });
  const exchange = await send({ agentUrl: agentCardUrl, message, requireSignature: true, signal });
  const response = operationFromBytes(extractRmnPart(a2aResultParts(exchange.result)).bytes);
  if (response?.type !== "OperationsManifoldForestOperationResult" || response.provider !== ACTOR || response.request !== operation.id) {
    throw new Error("operations-manifold forest Actor returned a foreign result");
  }
  return Object.freeze({
    ...response.forest,
    forestProvider: ACTOR,
    forestReceipt: Object.freeze({ inputNi: exchange.inputNi, outputNi: exchange.outputNi, agentCard: exchange.agentCard }),
  });
}
