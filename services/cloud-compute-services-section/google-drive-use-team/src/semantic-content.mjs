import { admitJsonSemanticContent, EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

export function identifyGoogleDriveTerm(value, objectKind) {
  if (typeof objectKind !== "string" || objectKind.length === 0) throw new TypeError("Google Drive semantic content requires an explicit local object kind");
  return identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT });
}

export const googleDriveTermId = (value, objectKind) => identifyGoogleDriveTerm(value, objectKind).token;
export const googleDriveTermBytes = (value, objectKind) => identifyGoogleDriveTerm(value, objectKind).bytes;
export const admitGoogleDriveTerm = (bytes, objectKind, token) => admitJsonSemanticContent({ bytes, token, objectKind }).value;
