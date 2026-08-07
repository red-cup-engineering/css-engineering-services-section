import { randomUUID } from "node:crypto";
import { Message, Role } from "@a2a-js/sdk";
import {
  EMPTY_WITNESS_ROOT,
  identifyBytesSemanticContent,
  isCanonicalSha256NiUri,
} from "@red-cup-engineering/semantic-content-identify-service";

export const RMN_MEDIA_TYPE = "application/rmn+cbor";

/** Compatibility name for callers which already treat this as raw byte identity. */
export const rawNi = (bytes) => identifyBytesSemanticContent({ objectKind: "a2a-rmn-part.carrier", bytes: Buffer.from(bytes), mediaType: RMN_MEDIA_TYPE, witnessRoot: EMPTY_WITNESS_ROOT }).token;

export function rmnPart(bytes, filename = "operation.rmn.cbor") {
  const body = Buffer.from(bytes), ni = rawNi(body);
  return {
    content: { $case: "raw", value: body },
    metadata: { ni },
    filename,
    mediaType: RMN_MEDIA_TYPE
  };
}

export function extractRmnPart(parts) {
  const candidates = (Array.isArray(parts) ? parts : []).filter((part) => part?.mediaType === RMN_MEDIA_TYPE && part?.content?.$case === "raw");
  if (candidates.length !== 1) throw new Error("an A2A RMN operation must carry exactly one application/rmn+cbor raw part");
  const part = candidates[0], bytes = Buffer.from(part.content.value ?? []), claimed = part.metadata?.ni;
  if (!isCanonicalSha256NiUri(claimed)) throw new Error("the RMN part must carry a canonical RFC 6920 SHA-256 ni identity");
  if (rawNi(bytes) !== claimed) throw new Error("the RMN part bytes do not match their semantic carrier identity");
  return { bytes, ni: claimed, filename: part.filename || "operation.rmn.cbor" };
}

export function userRmnMessage(bytes, filename = "operation.rmn.cbor", messageId = randomUUID()) {
  return Message.toJSON({ messageId, contextId: "", taskId: "", role: Role.ROLE_USER, parts: [rmnPart(bytes, filename)], metadata: {}, extensions: [], referenceTaskIds: [] });
}

export function agentRmnMessage(bytes, filename = "result.rmn.cbor", messageId = randomUUID()) {
  return Message.toJSON({ messageId, contextId: "", taskId: "", role: Role.ROLE_AGENT, parts: [rmnPart(bytes, filename)], metadata: {}, extensions: [], referenceTaskIds: [] });
}

export function parseA2aMessage(source) { return Message.fromJSON(source); }
