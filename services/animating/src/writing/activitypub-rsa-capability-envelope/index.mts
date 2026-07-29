/**
 * Historical ActivityPub RSA capability envelope.
 *
 * This is an application-specific carrier signed with the repository's HTTP
 * Signature primitive. It is not UCAN and confers no UCAN conformance result.
 */
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";
import type { Capability } from "../activitypub/capability.mjs";

const rsaProofSchema = { type: "object", additionalProperties: false,
  required: ["type", "created", "verificationMethod", "signatureValue"],
  properties: { type: { const: "RsaSignature2018" }, created: { type: "string" },
    verificationMethod: { type: "string" }, signatureValue: { type: "string" } } } as const;
const capabilitySchema = { type: "object", additionalProperties: false,
  required: ["@context", "id", "type", "grants", "holder"], properties: {
    "@context": { const: "https://www.w3.org/ns/activitystreams" }, id: { type: "string" },
    type: { const: "Capability" }, grants: { type: "string" }, holder: { type: "string" },
    parent: { type: "string" } } } as const;

export const activityPubRsaCapabilityEnvelopeSchema = {
  $id: "animating/writing/activitypub-rsa-capability-envelope",
  title: "ActivityPubRsaCapabilityEnvelope",
  description: "Application-specific RSA-signed envelope for an ActivityStreams Capability; explicitly not UCAN.",
  type: "object", additionalProperties: false,
  required: ["id", "type", "issuer", "audience", "authority", "proof"], properties: {
    id: { type: "string" }, type: { const: "ActivityPubRsaCapabilityEnvelope" }, issuer: { type: "string" },
    audience: { type: "string" }, authority: capabilitySchema, parent: { type: "string" }, proof: rsaProofSchema,
  },
} as const;

export type ActivityPubRsaCapabilityEnvelope = FromSchema<typeof activityPubRsaCapabilityEnvelopeSchema>;
export const activityPubRsaCapabilityEnvelopeCarrier = carrierFrom(activityPubRsaCapabilityEnvelopeSchema);

export function activityPubRsaEnvelopeFromCapability(
  issuer: string,
  authority: Capability,
  options: Readonly<{ id: string; parent?: ActivityPubRsaCapabilityEnvelope }>,
): Omit<ActivityPubRsaCapabilityEnvelope, "proof"> {
  return { id: options.id, type: "ActivityPubRsaCapabilityEnvelope", issuer,
    audience: authority.holder, authority,
    ...(options.parent === undefined ? {} : { parent: options.parent.id }) };
}

export function capabilityFromActivityPubRsaEnvelope(envelope: ActivityPubRsaCapabilityEnvelope): Capability {
  return envelope.authority;
}
