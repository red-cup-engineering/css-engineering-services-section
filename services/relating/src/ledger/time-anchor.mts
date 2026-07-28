/**
 * ledger/time-anchor - OpenTimestamps/RFC-3161 as externally verifiable T.
 *
 * This is a structural model, not an OpenTimestamps calendar client and not an
 * RFC-3161 TSA implementation. The attestation is a deterministic commitment
 * over the witness hash, calendar, authority, and attested time.
 */
import type { FromSchema } from "../carriers/kernel/carrier.mjs";
import {
  timeAnchorCarrier,
  timeAnchorReadingCarrier,
  timeAnchorReadingSchema,
  timeAnchorSchema,
  timestampedWitnessCarrier,
  timestampedWitnessSchema,
} from "../carriers/ledger/time-anchor/index.mjs";
import { eavtId, eavtRecord, type Datom, type EAVT, type EAVTRecord } from "../codecs/text/json/jsonl/eavt/index.mjs";
import { canonical, requireJsonValue, type JsonValue } from "../codecs/text/json/core.mjs";
import { sha256Hex } from "../codecs/host/javascript/crypto/index.mjs";

export {
  timeAnchorCarrier,
  timeAnchorReadingCarrier,
  timeAnchorReadingSchema,
  timeAnchorSchema,
  timestampedWitnessCarrier,
  timestampedWitnessSchema,
} from "../carriers/ledger/time-anchor/index.mjs";

type TimeAnchorBase = FromSchema<typeof timeAnchorSchema>;
export type TimeAnchor = Omit<TimeAnchorBase, "witnessTime"> & { readonly witnessTime: JsonValue };

type TimestampedWitnessBase = FromSchema<typeof timestampedWitnessSchema>;
export type TimestampedWitness = Omit<TimestampedWitnessBase, "witness" | "anchor"> & {
  readonly witness: EAVTRecord;
  readonly anchor: TimeAnchor;
};

type TimeAnchorReadingBase = FromSchema<typeof timeAnchorReadingSchema>;
export type TimeAnchorReading = Omit<TimeAnchorReadingBase, "anchor"> & { readonly anchor: TimeAnchor };

function digest(value: JsonValue): string {
  return sha256Hex(canonical(value));
}

function commitmentPayload(witnessHash: string): JsonValue {
  return requireJsonValue({ kind: "relating.ledger.time-anchor.commitment", witnessHash }, "time-anchor commitment");
}

function attestationPayload(anchor: Omit<TimeAnchor, "digest">): JsonValue {
  return requireJsonValue({
    kind: anchor.kind,
    standard: anchor.standard,
    calendar: anchor.calendar,
    authority: anchor.authority,
    witnessHash: anchor.witnessHash,
    witnessTime: anchor.witnessTime,
    attestedTime: anchor.attestedTime,
    commitment: anchor.commitment,
  }, "time-anchor attestation payload");
}

export type TimeAnchorInput = {
  readonly calendar: string;
  readonly authority: string;
  readonly attestedTime: string;
};

export function anchorWitnessTime(row: EAVT | EAVTRecord, input: TimeAnchorInput): TimestampedWitness {
  const witness = eavtRecord(row);
  const witnessHash = eavtId(witness);
  const base = Object.freeze({
    kind: "relating.ledger.time-anchor.anchor" as const,
    standard: "opentimestamps/rfc3161.structural" as const,
    calendar: input.calendar,
    authority: input.authority,
    witnessHash,
    witnessTime: witness.t,
    attestedTime: input.attestedTime,
    commitment: digest(commitmentPayload(witnessHash)),
  });
  const anchor = timeAnchorCarrier.assert(Object.freeze({
    ...base,
    digest: digest(attestationPayload(base)),
  }), "time anchor") as TimeAnchor;
  return timestampedWitnessCarrier.assert(Object.freeze({
    kind: "relating.ledger.time-anchor.timestamped-witness" as const,
    witness,
    anchor,
  }), "timestamped witness") as TimestampedWitness;
}

export function verifyTimestampedWitness(value: TimestampedWitness): boolean {
  try {
    timestampedWitnessCarrier.assert(value, "timestamped witness");
    const witnessHash = eavtId(value.witness);
    const anchor = value.anchor;
    const expectedBase = Object.freeze({
      kind: anchor.kind,
      standard: anchor.standard,
      calendar: anchor.calendar,
      authority: anchor.authority,
      witnessHash: anchor.witnessHash,
      witnessTime: anchor.witnessTime,
      attestedTime: anchor.attestedTime,
      commitment: anchor.commitment,
    });
    return anchor.witnessHash === witnessHash &&
      canonical(anchor.witnessTime) === canonical(value.witness.t) &&
      anchor.commitment === digest(commitmentPayload(witnessHash)) &&
      anchor.digest === digest(attestationPayload(expectedBase));
  } catch {
    return false;
  }
}

export function timestampedWitnessToDatom(value: TimestampedWitness): Datom {
  const reading = timeAnchorReadingCarrier.assert(Object.freeze({
    kind: "relating.ledger.time-anchor.reading" as const,
    standard: "opentimestamps/rfc3161.structural" as const,
    anchor: value.anchor,
    verified: verifyTimestampedWitness(value),
  }), "time-anchor reading") as TimeAnchorReading;
  return Object.freeze([value.witness.e, value.witness.a, value.witness.v, value.witness.t, reading as unknown as JsonValue]);
}

export function externallyAnchoredTime(value: TimestampedWitness): string {
  if (!verifyTimestampedWitness(value)) throw new Error("externallyAnchoredTime: invalid time anchor");
  return value.anchor.attestedTime;
}

function compareDatetime(left: string, right: string): number {
  const l = Date.parse(left);
  const r = Date.parse(right);
  if (Number.isFinite(l) && Number.isFinite(r)) return l - r;
  return left.localeCompare(right);
}

export function anchoredTimeMonotone(values: readonly TimestampedWitness[]): boolean {
  let prior: string | undefined;
  for (const value of values) {
    if (!verifyTimestampedWitness(value)) return false;
    const current = value.anchor.attestedTime;
    if (prior !== undefined && compareDatetime(prior, current) > 0) return false;
    prior = current;
  }
  return true;
}
