import { isDeepStrictEqual } from "node:util";
import { tm } from "@red-cup-engineering/relation-model-notation";
import { jsonToTerm, termToJson } from "@red-cup-engineering/relation-model-notation-json-codec";
import { inferTy } from "@red-cup-engineering/relation-model-notation-typing";
import {
  admitNormalizedSemanticContent,
  EMPTY_WITNESS_ROOT,
  identifyNormalizedSemanticContent,
} from "@red-cup-engineering/semantic-content-identify-service";
import { agentRmnMessage, extractRmnPart, parseA2aMessage } from "@red-cup-engineering/a2a-rmn-part-service";

export const EMSWEB_VIDEO_FEDERATION = "urn:ame:emsweb-video-federation";

const RECORD_KIND = Object.freeze({
  ChannelPortfolioStatusRequest: "org.emsenn.a2a.channel-portfolio-status.request-record.v1",
  ChannelPortfolioStatus: "org.emsenn.a2a.channel-portfolio-status.status-record.v1",
  Accept: "org.emsenn.a2a.channel-portfolio-status.accept-record.v1",
});
const REQUEST_OPERATION = "org.emsenn.a2a.channel-portfolio-status.request-operation.v1";
const RESULT_OPERATION = "org.emsenn.a2a.channel-portfolio-status.result-operation.v1";

function typedClaim(kind, value) {
  const bodyTerm = jsonToTerm(value);
  if (!isDeepStrictEqual(termToJson(bodyTerm), value)) {
    throw new TypeError("channel portfolio JSON must round trip through RMN without implicit Boolean-to-FOUR or numeric normalization");
  }
  const term = tm.pair(tm.mark(kind), bodyTerm);
  const semanticType = inferTy([], term);
  if (semanticType === null) throw new TypeError(`channel portfolio ${kind} did not derive an RMN type`);
  return { semanticType, term };
}

function identify(kind, value) {
  const claim = typedClaim(kind, value);
  return identifyNormalizedSemanticContent({
    objectKind: kind,
    semanticType: claim.semanticType,
    term: claim.term,
    witnessRoot: EMPTY_WITNESS_ROOT,
  });
}

export function addressChannelPortfolioRecord(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body) || RECORD_KIND[body.type] === undefined) {
    throw new TypeError("channel portfolio record requires a known record type");
  }
  const token = identify(RECORD_KIND[body.type], body).token;
  return Object.freeze({ id: token, ...structuredClone(body) });
}

function exact(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const { id, ...body } = value;
  try {
    return id === addressChannelPortfolioRecord(body).id;
  } catch {
    return false;
  }
}

function day(value) {
  return /^\d{4}-\d{2}-\d{2}$/u.test(value ?? "")
    && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

function operationBytes(kind, value) {
  return identify(kind, value).bytes;
}

function operationFromPart(part, expectedKind) {
  const addressed = admitNormalizedSemanticContent(part.bytes, part.ni);
  const term = addressed.envelope.settledBody;
  if (addressed.envelope.objectKind !== expectedKind || term?.[0] !== "pair" || term[1]?.[0] !== "mark" || term[1][1] !== expectedKind) {
    throw new TypeError(`portfolio-status operation requires the ${expectedKind} typed RMN claim`);
  }
  return termToJson(term[2]);
}

export async function formChannelPortfolioStatusResult({ request, actor, formStatus } = {}) {
  if (typeof actor !== "string" || actor.trim() === "" || typeof formStatus !== "function") {
    throw new TypeError("portfolio-status provider requires a sovereign channel actor and local callback");
  }
  if (!exact(request) || request.type !== "ChannelPortfolioStatusRequest" || request.federation !== EMSWEB_VIDEO_FEDERATION || request.channel !== actor || !day(request.civilDay) || request.timezone !== "America/Chicago") {
    throw new TypeError("portfolio-status request is noncanonical, foreign, or malformed");
  }
  const status = await formStatus({ civilDay: request.civilDay });
  if (!exact(status) || status.type !== "ChannelPortfolioStatus" || status.channel !== actor || status.civilDay !== request.civilDay || status.timezone !== request.timezone) {
    throw new TypeError("channel callback returned a changed or foreign portfolio status");
  }
  const body = { type: "Accept", actor, target: EMSWEB_VIDEO_FEDERATION, object: status };
  const delivery = addressChannelPortfolioRecord(body);
  return { disposition: "status", request: request.id, delivery };
}

export async function executeChannelPortfolioStatusMessage({ message, actor, formStatus } = {}) {
  const parsed = parseA2aMessage(message);
  const part = extractRmnPart(parsed.parts);
  const request = operationFromPart(part, REQUEST_OPERATION);
  const result = await formChannelPortfolioStatusResult({ request, actor, formStatus });
  return agentRmnMessage(operationBytes(RESULT_OPERATION, result), "channel-portfolio-status-result.rmn.cbor");
}

export function channelPortfolioStatusRequestBytes(request) {
  return operationBytes(REQUEST_OPERATION, request);
}

export function channelPortfolioStatusResultFromPart(part) {
  return operationFromPart(part, RESULT_OPERATION);
}
