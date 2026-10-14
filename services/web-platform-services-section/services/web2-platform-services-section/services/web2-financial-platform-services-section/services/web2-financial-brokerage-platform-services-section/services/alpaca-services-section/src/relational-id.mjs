import {
  EMPTY_WITNESS_ROOT,
  IDENTITY_SETTLEMENT_PROFILE,
  SEN_NORMALIZATION_PROFILE,
  identifyJsonSemanticContent,
} from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";

const requiredObjectKind = (value) => {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError("semantic-object-kind-required");
  return value;
};

const requiredProfile = (actual, expected, label) => {
  if (actual !== expected) throw new TypeError(`${label}-unsupported`);
  return actual;
};

/** Admit one brokerage JSON carrier to the current typed SEN identity boundary.
 * The caller declares its object kind and profiles; this boundary does not infer
 * evidence, polarity, FOUR charge, or evidential settlement from JSON shape. */
export function identifyRelationalContent(value, {
  objectKind,
  witnessRoot = EMPTY_WITNESS_ROOT,
  normalizationProfile = SEN_NORMALIZATION_PROFILE,
  settlementProfile = IDENTITY_SETTLEMENT_PROFILE,
} = {}) {
  requiredProfile(normalizationProfile, SEN_NORMALIZATION_PROFILE, "normalization-profile");
  requiredProfile(settlementProfile, IDENTITY_SETTLEMENT_PROFILE, "settlement-profile");
  return identifyJsonSemanticContent({ objectKind: requiredObjectKind(objectKind), value, witnessRoot });
}

export function relationalId(value, options) {
  return identifyRelationalContent(value, options).token;
}

/** Temporary source-compatible face for consumers still crossing this package's
 * pre-v2 surface. New code must call relationalId with an explicit objectKind. */
export const semanticId = (value) => relationalId(value, { objectKind: "brokerage-control.compatibility-record" });

export function identified(value, options) {
  return Object.freeze({ id: relationalId(value, options), ...value });
}
