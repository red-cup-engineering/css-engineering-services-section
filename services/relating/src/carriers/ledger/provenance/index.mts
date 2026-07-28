import { carrierFrom } from "../../kernel/carrier.mjs";

export const structuralProvenanceSignatureSchema = {
  $id: "relating/ledger/provenance/structural-signature",
  title: "Structural Provenance Signature",
  description: "A deterministic canonical-json commitment standing in for a Sigstore signature.",
  type: "object",
  required: ["kind", "scheme", "signer", "digest"],
  properties: {
    kind: { const: "relating.ledger.provenance.structural-signature" },
    scheme: { const: "sigstore.structural" },
    signer: { type: "string", minLength: 1 },
    digest: { type: "string", minLength: 1 },
  },
  additionalProperties: false,
} as const;

export const structuralProvenanceSignatureCarrier = carrierFrom(structuralProvenanceSignatureSchema);

export const signedProvenanceSourceSchema = {
  $id: "relating/ledger/provenance/signed-source",
  title: "Signed Provenance Source",
  description: "The source payload plus its structural signature.",
  type: "object",
  required: ["kind", "source", "signature"],
  properties: {
    kind: { const: "relating.ledger.provenance.signed-source" },
    source: {},
    signature: { $ref: "relating/ledger/provenance/structural-signature" },
  },
  additionalProperties: false,
} as const;

export const signedProvenanceSourceCarrier = carrierFrom(signedProvenanceSourceSchema);

export const attestationLinkSchema = {
  $id: "relating/ledger/provenance/attestation-link",
  title: "RWIL Provenance Attestation Link",
  description: "An in-toto/SLSA link carried as one RWIL record-tier provenance witness.",
  type: "object",
  required: ["kind", "name", "subject", "predicateType", "predicate", "materials", "products", "source", "signature", "t"],
  properties: {
    kind: { const: "relating.ledger.provenance.attestation-link" },
    name: { type: "string", minLength: 1 },
    subject: {},
    predicateType: { type: "string", minLength: 1 },
    predicate: {},
    materials: { type: "array", items: {} },
    products: { type: "array", items: {} },
    source: {},
    signature: { $ref: "relating/ledger/provenance/structural-signature" },
    t: {},
  },
  additionalProperties: false,
} as const;

export const attestationLinkCarrier = carrierFrom(attestationLinkSchema);

export const provenanceReadingSchema = {
  $id: "relating/ledger/provenance/reading",
  title: "RWIL Provenance Reading",
  description: "The fifth Datom slot for a settled provenance judgement.",
  type: "object",
  required: ["kind", "standard", "linkName", "signedSource", "verified"],
  properties: {
    kind: { const: "relating.ledger.provenance.reading" },
    standard: { const: "in-toto/slsa/sigstore.structural" },
    linkName: { type: "string", minLength: 1 },
    signedSource: { $ref: "relating/ledger/provenance/signed-source" },
    verified: { type: "boolean" },
  },
  additionalProperties: false,
} as const;

export const provenanceReadingCarrier = carrierFrom(provenanceReadingSchema);
