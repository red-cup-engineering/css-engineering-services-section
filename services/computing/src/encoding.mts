/**
 * encoding - JSON boundary for the lightweight operating observation face.
 */

import { requireJsonValue, type JsonValue } from "@red-cup-engineering/relating";
import type { DerivationProvenance, Observation } from "./operating.mjs";

export type Json = JsonValue;

export function encodeObservation(observation: Observation): Json {
  return requireJsonValue(observation, "computing observation");
}

export function encodeProvenance(provenance: DerivationProvenance): Json {
  return requireJsonValue(provenance, "computing derivation provenance");
}
