import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { admitCloudComputeTerm, cloudComputeTermBytes, cloudComputeTermId } from "./semantic-content.mjs";
import { forageImprovementBoards } from "./improvement-board-forager-service.mjs";
import { ACTOR } from "./improvement-board-forager.mjs";

function rmnId(value) { return cloudComputeTermId(value, "cloud-compute.supplier-operation"); }
function record(body) { return Object.freeze({ id: rmnId(body), ...body }); }
export function operationBytes(value) { return cloudComputeTermBytes(value, "cloud-compute.supplier-operation"); }
export function operationFromBytes(bytes, token) { return admitCloudComputeTerm(bytes, "cloud-compute.supplier-operation", token); }
function exact(value) {
  if (!value || typeof value !== "object") return false;
  const body = Object.fromEntries(Object.entries(value).filter(([key]) => key !== "id"));
  return value.id === rmnId(body);
}

export async function executeOperation(request, options = {}) {
  if (!exact(request) || request.provider !== ACTOR || request.type !== "ImprovementMarketSupplierIncitementRequest" || !request.incitement) throw new Error("exact provider-addressed canonical RMN supplier incitement is required");
  const result = await (options.forageImprovementBoards ?? forageImprovementBoards)(request.incitement, options.foraging ?? {});
  return record({ type: "ImprovementMarketSupplierIncitementResult", provider: ACTOR, request: request.id, incitement: request.incitement.id, result });
}

export async function executeA2aMessage(source, options = {}) {
  const message = Message.fromJSON(source);
  if (message.role !== Role.ROLE_USER) throw new Error("supplier executor requires an A2A user Message");
  const input = extractRmnPart(message.parts);
  const response = await executeOperation(operationFromBytes(input.bytes, input.ni), options);
  return Message.toJSON({ messageId: "", contextId: message.contextId ?? "", taskId: message.taskId ?? "", role: Role.ROLE_AGENT, parts: [rmnPart(operationBytes(response))], metadata: { inputNi: input.ni, outputNi: response.id, provider: ACTOR }, extensions: [], referenceTaskIds: [] });
}
