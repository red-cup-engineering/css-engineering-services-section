import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import { a2aResultParts, sendRmnTask } from "@red-cup-engineering/a2a-rmn-task-client-service";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { relationalRwilDocument } from "@lenticule-science/rwil-rdf-projection-service/client";
import { operationBytes, operationFromBytes } from "./a2a-executor.mjs";
import { ACTOR } from "./improvement-board-forager.mjs";

function rmnId(value) { return semanticId(relationalRwilDocument(value)); }
function record(body) { return Object.freeze({ id: rmnId(body), ...body }); }
const responseParts = a2aResultParts;

export async function inciteImprovementMarketSupplier(incitement, { agentCardUrl = process.env.IMPROVEMENT_MARKET_SUPPLIER_AGENT_CARD_URL, bearerTokenFile = process.env.IMPROVEMENT_MARKET_SUPPLIER_BEARER_TOKEN_FILE, send = sendRmnTask, signal } = {}) {
  if (typeof agentCardUrl !== "string" || !agentCardUrl) throw new Error("IMPROVEMENT_MARKET_SUPPLIER_AGENT_CARD_URL is required");
  const request = record({ type: "ImprovementMarketSupplierIncitementRequest", provider: ACTOR, incitement });
  const message = Message.toJSON({ messageId: randomUUID(), contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(operationBytes(request))], metadata: {}, extensions: [], referenceTaskIds: [] });
  const transport = await send({ agentUrl: agentCardUrl, message, requireSignature: true, bearerTokenFile, signal });
  const response = operationFromBytes(extractRmnPart(responseParts(transport.result)).bytes);
  if (response?.type !== "ImprovementMarketSupplierIncitementResult" || response.provider !== ACTOR || response.request !== request.id || response.incitement !== incitement.id) throw new Error("improvement supplier returned a foreign incitement result");
  return Object.freeze({ ...response.result, supplierProvider: ACTOR, supplierReceipt: { inputNi: transport.inputNi, outputNi: transport.outputNi, agentCard: transport.agentCard } });
}
