import { admitJsonSemanticContent, EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

export function identifyCloudComputeTerm(value, objectKind) {
  if (typeof objectKind !== "string" || objectKind.length === 0) throw new TypeError("cloud-compute semantic content requires an explicit local object kind");
  return identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT });
}

export function cloudComputeTermId(term, objectKind) {
  return identifyCloudComputeTerm(term, objectKind).token;
}

export function cloudComputeTermBytes(term, objectKind) {
  return identifyCloudComputeTerm(term, objectKind).bytes;
}

export function admitCloudComputeTerm(bytes, objectKind, token) {
  if (typeof objectKind !== "string" || objectKind.length === 0) throw new TypeError("cloud-compute semantic content requires an explicit local object kind");
  return admitJsonSemanticContent({ bytes, token, objectKind }).value;
}
