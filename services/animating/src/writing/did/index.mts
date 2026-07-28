/**
 * writing/did — DIDs + Verifiable Credentials: identity UNDER WMAP.
 *
 * WMAP gave the agent an ActivityPub Actor — but an Actor `id` is a server-bound
 * IRI: it names where the agent's endpoints live, so it dies when the server does
 * (the account-portability gap the C2S memo flagged). A **DID** (Decentralized
 * Identifier, W3C) is the same identity made PORTABLE: a `did:` URI that resolves to
 * a DID document carrying the agent's public keys and its service endpoints. The
 * simplest, no-registry method — `did:web` — derives the identifier from the host +
 * path the Actor already has, so it is not a second identity at all but a re-reading
 * of the Actor's own address. `did:web:dev.bare-cedar-fog.emsenn.net:agents:sol` ⇄ the Actor at
 * `https://dev.bare-cedar-fog.emsenn.net/agents/sol`.
 *
 * A **Verifiable Credential** (W3C VC) is, for us, exactly what relating already
 * has: a CHARGED CLAIM with provenance. relating's `claim` is the `credentialSubject`
 * (what is asserted, about whom); the `charge` is the FOUR bilattice value the
 * credential carries (the issuer's truth-lean on the claim, with evidence); and the
 * `proof` is an RSA signature over the canonical credential — the provenance that
 * makes the charged claim *verifiable* rather than merely stated. We sign with the
 * exact `signRequest`/`verifyRequest` crypto the S2S brick uses (draft-cavage RSA-
 * SHA256 over a signing string), so a VC's proof is the same primitive as an HTTP
 * Signature, not a new crypto stack.
 *
 * No second ontology (the gate):
 *   - a DID is a VIEW of the Actor's `id` (host + path), not a parallel identity;
 *   - `credentialSubject` is relating's `claim` (token = who, claim = what);
 *   - the credential's value is relating's FOUR `charge` (issuer's evidenced lean);
 *   - a credential-as-capability REUSES the activitypub `Capability` carrier verbatim
 *     (issue a VC whose subject IS a `grant` — authority by a charged, signed claim
 *     that names a move), never a re-modeled permission.
 *
 * Layering: consumes only relating's stable root apex (`carrier`, `mark`, `claim`,
 * `charge`, `asChargeValue`, `ChargeValueName`) and animating's own sibling bricks
 * (the `Actor` carrier, the `signatures` crypto, the `Capability` carrier) — never a
 * relating internal subpath. This brick is a PURE VALUE LAYER: carriers plus
 * resolve/issue/verify. DID-document key rotation, status lists / revocation
 * registries, JSON-LD data-integrity proofs, and BBS+ selective disclosure are later
 * bricks — recorded as frontiers in dev/docs/notes/2026-06-25-dids-vcs-as-communicating.md.
 */
import { carrierFrom, codecs, mark, claim, type Claim, type ChargeValueName, type FromSchema, type JsonValue } from "@red-cup-engineering/relating";
import type { LogReading, RWILWitnessLog } from "@red-cup-engineering/relating/ledger";
import type { Actor } from "../activitypub/actor.mjs";
import type { Capability } from "../activitypub/capability.mjs";
import { signingString, signRequest, verifyRequest } from "../activitypub/signatures.mjs";

// ────────────────────────────────────────────────────────────────────────────
// did:web — a portable Actor id (host + path), not server-bound to an endpoint IRI
// ────────────────────────────────────────────────────────────────────────────

/** The W3C DID-core JSON-LD context — emitted as a literal constant so this codec
 *  needs no JSON-LD processor (the agent only emits the DID-core vocabulary it uses). */
const { eavtRecord, foldJson, unfoldJson } = codecs.text.json.jsonl.eavt;
type EAVTRecord = codecs.text.json.jsonl.eavt.EAVTRecord;

export const DID_CONTEXT = "https://www.w3.org/ns/did/v1" as const;

const verificationMethodSchema = {
  type: "object",
  additionalProperties: true,
  required: ["id", "type", "controller"],
  properties: {
    id: { type: "string" },
    type: { type: "string" },
    controller: { type: "string" },
    publicKeyPem: { type: "string" },
  },
} as const;

const serviceSchema = {
  type: "object",
  additionalProperties: true,
  required: ["id", "type", "serviceEndpoint"],
  properties: {
    id: { type: "string" },
    type: { type: "string" },
    serviceEndpoint: { type: "string" },
  },
} as const;

/** A DID document — the portable identity record a DID resolves to. Single-source
 *  carrier (schema = type = `$id` = validator), bare descent-path `$id`. */
export const didDocumentSchema = {
  $id: "animating/writing/did/document",
  title: "DIDDocument",
  description:
    "A W3C DID document: the portable identity a DID resolves to, carrying the subject's public keys and service endpoints. For did:web it is a pure re-reading of the Actor's own host+path — `alsoKnownAs` links back to the Actor IRI, `service` carries the inbox/outbox. $id is the bare package-rooted path.",
  type: "object",
  additionalProperties: false,
  required: ["@context", "id"],
  properties: {
    "@context": { anyOf: [{ const: DID_CONTEXT }, { type: "array", items: { type: "string" } }] },
    id: { type: "string" },
    alsoKnownAs: { type: "array", items: { type: "string" } },
    verificationMethod: { type: "array", items: verificationMethodSchema },
    service: { type: "array", items: serviceSchema },
  },
} as const;
export type DIDDocument = FromSchema<typeof didDocumentSchema>;
export const didDocumentCarrier = carrierFrom(didDocumentSchema);

const IS_HTTPS = /^https:\/\//i;

/** Options for resolving an Actor as a DID document. */
export interface DidOptions {
  /** an RSA public key (PEM) to publish as the DID's verification method (the key the
   *  subject's credentials/HTTP-Signatures are verified against). */
  readonly publicKeyPem?: string;
}

/**
 * didFromActor — re-read an Actor's `id` as a portable `did:web` DID document. The
 * Actor IRI's host + path become the DID method-specific identifier (`did:web:host`
 * for a host-root actor, `did:web:host:seg:seg…` for a path actor, per the did:web
 * spec); the Actor itself is linked via `alsoKnownAs`, and its inbox/outbox become
 * `service` endpoints. A pure VIEW — it reads only the Actor's address and re-models
 * nothing. The DID outlives the server because it names the *subject*, not the
 * endpoint: rehost the agent and the DID document moves with it.
 */
export function didFromActor(actor: Actor, options: DidOptions = {}): DIDDocument {
  const did = didOfIri(actor.id);
  const service = [
    { id: `${did}#inbox`, type: "ActivityPubInbox", serviceEndpoint: actor.inbox },
    { id: `${did}#outbox`, type: "ActivityPubOutbox", serviceEndpoint: actor.outbox },
  ];
  return {
    "@context": DID_CONTEXT,
    id: did,
    alsoKnownAs: [actor.id],
    ...(options.publicKeyPem === undefined
      ? {}
      : { verificationMethod: [{ id: `${did}#keys-1`, type: "RsaVerificationKey2018", controller: did, publicKeyPem: options.publicKeyPem }] }),
    service,
  };
}

/** didOfIri — the `did:web` identifier for an https IRI: host (port colon → `%3A`)
 *  then the path segments, colon-joined; a bare host yields `did:web:host`. */
export function didOfIri(iri: string): string {
  if (!IS_HTTPS.test(iri)) throw new TypeError(`did:web requires an https IRI, got ${JSON.stringify(iri)}`);
  const url = new URL(iri);
  const host = url.host.replace(/:/g, "%3A");
  const segments = url.pathname.split("/").filter((s) => s.length > 0).map((s) => encodeURIComponent(s));
  return ["did:web", host, ...segments].join(":");
}

/** iriOfDid — the inverse: the https URL a `did:web` resolves its document at. Per
 *  spec, a bare `did:web:host` resolves at `https://host/.well-known/did.json`; a
 *  path DID at `https://host/seg/seg/did.json`. */
export function iriOfDid(did: string): string {
  const [scheme, method, host, ...segments] = did.split(":");
  if (scheme !== "did" || method !== "web" || host === undefined) {
    throw new TypeError(`not a did:web identifier: ${JSON.stringify(did)}`);
  }
  const decodedHost = host.replace(/%3A/gi, ":");
  const path = segments.length === 0 ? "/.well-known/did.json" : `/${segments.map(decodeURIComponent).join("/")}/did.json`;
  return `https://${decodedHost}${path}`;
}

/**
 * actorIdFromDid — recover the Actor IRI a `did:web` DID re-reads: the host + path
 * with no `did.json` / well-known suffix (the inverse of `didFromActor`'s id step).
 * This is the round-trip witness — `actorIdFromDid(didOfIri(actor.id)) === actor.id`.
 */
export function actorIdFromDid(did: string): string {
  const [scheme, method, host, ...segments] = did.split(":");
  if (scheme !== "did" || method !== "web" || host === undefined) {
    throw new TypeError(`not a did:web identifier: ${JSON.stringify(did)}`);
  }
  const decodedHost = host.replace(/%3A/gi, ":");
  const path = segments.length === 0 ? "" : `/${segments.map(decodeURIComponent).join("/")}`;
  return `https://${decodedHost}${path}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Verifiable Credentials — a charged claim with provenance (claim + charge + proof)
// ────────────────────────────────────────────────────────────────────────────

/** The W3C VC JSON-LD contexts — credentials/v1 plus the DID-core context. */
export const VC_CONTEXT = ["https://www.w3.org/2018/credentials/v1", DID_CONTEXT] as const;

const proofSchema = {
  type: "object",
  additionalProperties: false,
  required: ["type", "created", "verificationMethod", "signatureValue"],
  properties: {
    type: { const: "RsaSignature2018" },
    created: { type: "string" },
    verificationMethod: { type: "string" },
    signatureValue: { type: "string" },
  },
} as const;

const credentialSubjectSchema = {
  type: "object",
  additionalProperties: true,
  required: ["id", "claim"],
  properties: {
    id: { type: "string" },
    claim: { type: "string" },
    capability: { type: "string" },
    grants: { type: "string" },
  },
} as const;

/** A Verifiable Credential — a charged claim with provenance. The `credentialSubject`
 *  IS relating's `claim`, the `charge` IS relating's FOUR value, and `proof` is the
 *  RSA signature making it verifiable. Single-source carrier, bare descent-path `$id`. */
export const credentialSchema = {
  $id: "animating/writing/did/credential",
  title: "VerifiableCredential",
  description:
    "A W3C Verifiable Credential: a charged claim with provenance. `credentialSubject` is relating's claim (token=subject who, claim=what is attested), `charge` is the issuer's FOUR bilattice lean on it, `proof` is an RSA-SHA256 signature (the same primitive as HTTP Signatures) over the canonical credential. $id is the bare package-rooted path.",
  type: "object",
  additionalProperties: false,
  required: ["@context", "type", "issuer", "issuanceDate", "credentialSubject", "charge"],
  properties: {
    "@context": { anyOf: [{ type: "array", items: { type: "string" } }, { type: "string" }] },
    id: { type: "string" },
    type: { type: "array", items: { type: "string" } },
    issuer: { type: "string" },
    issuanceDate: { type: "string" },
    credentialSubject: credentialSubjectSchema,
    charge: { enum: ["absurd", "potential", "active", "stable"] },
    proof: proofSchema,
  },
} as const;
export type VerifiableCredential = FromSchema<typeof credentialSchema>;
export const credentialCarrier = carrierFrom(credentialSchema);

/** Options for issuing a credential. */
export interface CredentialOptions {
  /** the credential IRI, if minted. */
  readonly id?: string;
  /** extra credential type tags beyond `VerifiableCredential`. */
  readonly types?: readonly string[];
  /** the ISO-8601 issuance date — defaults to now. */
  readonly issuanceDate?: string;
}

export interface CredentialWitnessOptions {
  readonly id?: string;
  readonly issuer?: string;
  readonly subject?: string;
  readonly claim?: string;
  readonly charge?: ChargeValueName;
  readonly issuanceDate?: string;
}

/** The signing-method path: the issuer DID resolved to its document URL — the stable
 *  string the proof's signing string is built over (so it binds the proof to the
 *  issuer's resolvable DID, not to a transient endpoint). */
function proofPath(issuerDid: string): string {
  return new URL(iriOfDid(issuerDid)).pathname;
}

/** The canonical headers a credential's proof commits to: the issuer, the subject,
 *  the claim text, the charge, and the issuance date — the charged claim made into a
 *  stable signing string via the same draft-cavage builder HTTP Signatures use. */
function credentialHeaders(credential: VerifiableCredential): Readonly<Record<string, string>> {
  return {
    issuer: credential.issuer,
    subject: credential.credentialSubject.id,
    claim: credential.credentialSubject.claim,
    charge: credential.charge,
    date: credential.issuanceDate,
  };
}

const SIGNED_FIELDS = ["issuer", "subject", "claim", "charge", "date"] as const;

/**
 * issueCredential — sign a charged claim into a Verifiable Credential. The `subject`
 * (who) and the relating `claim` (what) become the `credentialSubject`; the FOUR
 * `charge` (the issuer's evidenced truth-lean) is carried verbatim; and the `proof`
 * is an RSA-SHA256 signature over the canonical credential, produced by the SAME
 * `signRequest` crypto the S2S HTTP-Signatures brick uses — a VC proof is an HTTP
 * Signature over the claim, not a new stack. No second ontology: the credential is a
 * relating claim, charged and signed.
 */
export function issueCredential(
  issuerDid: string,
  subjectId: string,
  subjectClaim: Claim,
  charge: ChargeValueName,
  privateKeyPem: string,
  options: CredentialOptions = {},
): VerifiableCredential {
  const issuanceDate = options.issuanceDate ?? new Date().toISOString();
  const verificationMethod = `${issuerDid}#keys-1`;
  const unsigned: VerifiableCredential = {
    "@context": [...VC_CONTEXT],
    ...(options.id === undefined ? {} : { id: options.id }),
    type: ["VerifiableCredential", ...(options.types ?? [])],
    issuer: issuerDid,
    issuanceDate,
    credentialSubject: { id: subjectId, claim: String(subjectClaim.mark.value) },
    charge,
  };
  const { signature } = signRequest("post", proofPath(issuerDid), credentialHeaders(unsigned), verificationMethod, privateKeyPem, SIGNED_FIELDS);
  // signRequest returns a full Signature header; the VC proof keeps the bare base64
  // signatureValue (re-derivable from the canonical credential at verify time).
  const signatureValue = parseSignatureValue(signature);
  return {
    ...unsigned,
    proof: { type: "RsaSignature2018", created: issuanceDate, verificationMethod, signatureValue },
  };
}

/** Extract the bare base64 signature from a draft-cavage `Signature` header value. */
function parseSignatureValue(header: string): string {
  const match = /signature="([^"]*)"/.exec(header);
  return match === null ? "" : (match[1] ?? "");
}

/**
 * verifyCredential — check a Verifiable Credential's proof against the issuer's RSA
 * public key. Re-derives the canonical signing string from the credential's own
 * fields (issuer/subject/claim/charge/date) and verifies the RSA-SHA256 signature
 * with the SAME `verifyRequest` crypto the S2S brick uses. A tampered field (any of
 * the charged-claim's components) changes the signing string and fails verification —
 * the provenance binds the whole charged claim, not a part of it.
 */
export function verifyCredential(credential: VerifiableCredential, publicKeyPem: string): boolean {
  const proof = credential.proof;
  if (proof === undefined || proof.signatureValue === "") return false;
  const header = `keyId="${proof.verificationMethod}",algorithm="rsa-sha256",headers="${SIGNED_FIELDS.join(" ")}",signature="${proof.signatureValue}"`;
  return verifyRequest("post", proofPath(credential.issuer), credentialHeaders(credential), header, publicKeyPem);
}

/** Read a verified credential back as its relating `claim` — the charged claim the
 *  VC was a signed envelope for. The inverse of the `claim`→credentialSubject step. */
export function claimOfCredential(credential: VerifiableCredential): Claim {
  return claim(mark(credential.credentialSubject.claim));
}

function credentialWitnessBase(credential: VerifiableCredential): string {
  return `urn:rwil:animating:did:credential:${credential.id ?? `${credential.issuer}:${credential.credentialSubject.id}:${credential.issuanceDate}`}`;
}

function credentialSubjectRecord(credential: VerifiableCredential): Record<string, unknown> {
  return credential.credentialSubject as unknown as Record<string, unknown>;
}

function witnessLogOfSubject(credential: VerifiableCredential): RWILWitnessLog | undefined {
  const witnessLog = credentialSubjectRecord(credential)["witnessLog"];
  if (!Array.isArray(witnessLog)) return undefined;
  return Object.freeze(witnessLog.map((row) => eavtRecord(row as EAVTRecord)));
}

function firstWitnessTime(log: RWILWitnessLog): string {
  const time = log[0]?.t;
  return typeof time === "string" && time.length > 0 ? time : new Date(0).toISOString();
}

/**
 * credentialFromWitness — wrap an ordered RWIL log as a VC envelope.
 *
 * The log is carried inside the credential subject so the envelope, not only the
 * subject claim text, is a reversible wire for higher-block coherence.
 */
export function credentialFromWitness(log: RWILWitnessLog, options: CredentialWitnessOptions = {}): VerifiableCredential {
  const witnessLog = Object.freeze(log.map((row) => eavtRecord(row)));
  const issuanceDate = options.issuanceDate ?? firstWitnessTime(witnessLog);
  return credentialCarrier.assert(Object.freeze({
    "@context": [...VC_CONTEXT],
    ...(options.id === undefined ? {} : { id: options.id }),
    type: ["VerifiableCredential", "RWILLogCredential"],
    issuer: options.issuer ?? "did:web:dev.bare-cedar-fog.emsenn.net:agents:codex",
    issuanceDate,
    credentialSubject: Object.freeze({
      id: options.subject ?? "urn:rwil:shared-log",
      claim: options.claim ?? "carries-rwil-witness-log",
      witnessLog,
    }),
    charge: options.charge ?? "potential",
  }), "credential from witness log") as VerifiableCredential;
}

/**
 * witnessFromCredential — recover the ordered RWIL log carried by a VC envelope.
 *
 * Credentials minted by `credentialFromWitness` return their embedded shared
 * log. Other credentials still admit a witness: the whole VC envelope unfolded
 * as JSON EAVT rows, so signed credentials are read as envelope evidence rather
 * than collapsed to only `credentialSubject.claim`.
 */
export function witnessFromCredential(credential: VerifiableCredential): RWILWitnessLog {
  const admitted = credentialCarrier.assert(credential, "credential witness") as VerifiableCredential;
  const embedded = witnessLogOfSubject(admitted);
  if (embedded !== undefined) return embedded;
  return Object.freeze(unfoldJson(admitted as unknown as JsonValue, {
    base: credentialWitnessBase(admitted),
    t: admitted.issuanceDate,
  }));
}

export const credentialLogReading: LogReading<VerifiableCredential> = Object.freeze({
  id: "animating.did.credential-envelope",
  toWire: credentialFromWitness,
  fromWire: witnessFromCredential,
});

export function credentialEnvelopeFromWitnessLog(log: RWILWitnessLog): VerifiableCredential {
  return credentialCarrier.assert(foldJson(log), "credential envelope witness log") as VerifiableCredential;
}

// ────────────────────────────────────────────────────────────────────────────
// credential-as-capability — a VC whose subject IS a capability grant (OCap, signed)
// ────────────────────────────────────────────────────────────────────────────

/**
 * issueCapabilityCredential — issue a VC that conveys an object-capability: the
 * credential's `credentialSubject` IS the activitypub `Capability` (its `holder` =
 * the subject, its `grants` = the asserted move), tagged `CapabilityCredential`. The
 * charge is fixed `potential` (a granted-and-unchallenged authority on the truth
 * axis). This REUSES the `Capability` carrier verbatim — the VC is a signed,
 * portable envelope for an existing capability, not a re-modeled permission. The
 * holder's authority is still gated by `canInvoke` (a signed VC for a move you do not
 * hold is still unexercisable — authority by move, not by paper).
 */
export function issueCapabilityCredential(
  issuerDid: string,
  capability: Capability,
  privateKeyPem: string,
  options: CredentialOptions = {},
): VerifiableCredential {
  const credential = issueCredential(
    issuerDid,
    capability.holder,
    claim(mark(capability.grants)),
    "potential",
    privateKeyPem,
    { ...options, types: ["CapabilityCredential", ...(options.types ?? [])] },
  );
  // attach the capability id + grant onto the subject so the carrier round-trips the
  // exact reference (additionalProperties: true on credentialSubject permits it).
  return {
    ...credential,
    credentialSubject: { ...credential.credentialSubject, capability: capability.id, grants: capability.grants },
  };
}
