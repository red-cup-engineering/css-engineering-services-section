import assert from "node:assert/strict";
import test from "node:test";
import { Message, Role } from "@a2a-js/sdk";
import { extractRmnPart, rmnPart } from "@red-cup-engineering/a2a-rmn-part-service";
import { googleDriveTermId } from "../src/semantic-content.mjs";
import { ACTOR } from "../src/contract-google-drive-use.mjs";
import { executeA2aMessage, operationBytes, operationFromBytes } from "../src/a2a-executor.mjs";

const exact = (body) => ({ id: googleDriveTermId(body, "cloud-compute.google-drive-operation"), ...body });

test("the Google Drive die admits one semantic operation through A2A", async () => {
  const input = exact({ type: "Offer", actor: "urn:customer", target: ACTOR, object: { type: "ServiceSolicitation" } });
  const request = exact({ type: "GoogleDriveUseOperation", provider: ACTOR, operation: "solicit-service", input });
  const message = Message.toJSON({ messageId: "1", contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(operationBytes(request))], metadata: {}, extensions: [], referenceTaskIds: [] });
  const output = await executeA2aMessage(message, { executeGoogleDriveUseOperation: async () => exact({ type: "Offer", actor: ACTOR, target: "urn:customer" }) });
  const part = extractRmnPart(Message.fromJSON(output).parts);
  const response = operationFromBytes(part.bytes, part.ni);
  assert.equal(response.request, request.id);
  assert.equal(response.result.actor, ACTOR);
});
