/**
 * writing/ucan — User-Controlled Authorization Networks as portable OCap.
 *
 * A UCAN token is the wire twin of the in-process object-capability: the token's
 * authority IS the ActivityPub OCap `Capability` carrier, and its proof is RSA
 * over the delegation payload using the same HTTP-Signature primitive the S2S
 * brick uses. Delegation chains are checked as capability attenuation: each child
 * must narrow, never widen, the parent's grant, and each child issuer must be the
 * previous audience.
 */
import { carrierFrom, type FromSchema } from "@red-cup-engineering/relating";
import {
  type Capability,
  revoke,
} from "../activitypub/capability.mjs";
import {
  parseSignatureHeader,
  signRequest,
  verifyRequest,
} from "../activitypub/signatures.mjs";

const UCAN_SIGNED_FIELDS = [
  "ucan",
  "issuer",
  "audience",
  "capability",
  "grants",
  "holder",
  "capability-parent",
  "parent",
  "date",
] as const;

const ucanProofSchema = {
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

const ucanCapabilitySchema = {
  type: "object",
  additionalProperties: false,
  required: ["@context", "id", "type", "grants", "holder"],
  properties: {
    "@context": { const: "https://www.w3.org/ns/activitystreams" },
    id: { type: "string" },
    type: { const: "Capability" },
    grants: { type: "string" },
    holder: { type: "string" },
    parent: { type: "string" },
  },
} as const;

/** A signed UCAN delegation record. Its `authority` is the Capability carrier. */
export const ucanSchema = {
  $id: "animating/writing/ucan/token",
  title: "UCAN",
  description:
    "A User-Controlled Authorization Network token: a signed portable envelope for the existing Capability carrier. `authority` is the OCap grant itself, `parent` links to the prior UCAN in the delegation chain, and `proof` is an RSA-SHA256 proof produced with the same HTTP-Signature primitive used for ActivityPub S2S.",
  type: "object",
  additionalProperties: false,
  required: ["id", "type", "issuer", "audience", "authority", "proof"],
  properties: {
    id: { type: "string" },
    type: { const: "UCAN" },
    issuer: { type: "string" },
    audience: { type: "string" },
    authority: ucanCapabilitySchema,
    parent: { type: "string" },
    proof: ucanProofSchema,
  },
} as const;
export type UcanToken = FromSchema<typeof ucanSchema>;
export const ucanCarrier = carrierFrom(ucanSchema);

export interface IssueUcanOptions {
  /** stable token id; defaults to a deterministic capability-rooted urn. */
  readonly id?: string;
  /** parent token in the delegation chain, if this UCAN delegates/attenuates. */
  readonly parent?: UcanToken;
  /** proof timestamp; defaults to now. */
  readonly created?: string;
  /** proof verification method; defaults to `${issuer}#keys-1`. */
  readonly verificationMethod?: string;
}

export interface UcanVerification {
  readonly valid: boolean;
  readonly token: UcanToken;
  readonly checked: readonly UcanToken[];
  readonly failures: readonly string[];
}

export type UcanKeyring =
  | Readonly<Record<string, string>>
  | ((token: UcanToken) => string | undefined);

let UCAN_SEQ = 0;

function freshUcanId(authority: Capability): string {
  UCAN_SEQ += 1;
  return `urn:ucan:${encodeURIComponent(authority.id)}:${UCAN_SEQ}`;
}

function ucanPath(id: string): string {
  return `/ucan/${encodeURIComponent(id)}`;
}

function proofHeaders(token: Omit<UcanToken, "proof">): Readonly<Record<string, string>> {
  return {
    ucan: token.id,
    issuer: token.issuer,
    audience: token.audience,
    capability: token.authority.id,
    grants: token.authority.grants,
    holder: token.authority.holder,
    "capability-parent": token.authority.parent ?? "",
    parent: token.parent ?? "",
    date: "",
  };
}

function signedHeaders(token: Omit<UcanToken, "proof">, created: string): Readonly<Record<string, string>> {
  return { ...proofHeaders(token), date: created };
}

function signatureValue(header: string): string {
  return parseSignatureHeader(header)["signature"] ?? "";
}

function publicKeyFor(token: UcanToken, keyring: UcanKeyring): string | undefined {
  if (typeof keyring === "function") return keyring(token);
  return keyring[token.proof.verificationMethod] ?? keyring[token.issuer];
}

/**
 * capabilityFromUcan — forget the portable envelope and recover the exact
 * authority it carries. This is the UCAN→Capability map: no permission ontology is
 * introduced between the token and the local OCap carrier.
 */
export function capabilityFromUcan(token: UcanToken): Capability {
  return token.authority;
}

/**
 * ucanFromCapability — form the unsigned UCAN payload for an existing Capability.
 * `issueUcan` signs this payload; this helper exposes the Capability→UCAN map.
 */
export function ucanFromCapability(
  issuer: string,
  authority: Capability,
  options: IssueUcanOptions = {},
): Omit<UcanToken, "proof"> {
  return {
    id: options.id ?? freshUcanId(authority),
    type: "UCAN",
    issuer,
    audience: authority.holder,
    authority,
    ...(options.parent === undefined ? {} : { parent: options.parent.id }),
  };
}

/**
 * issueUcan — sign an existing Capability into a portable UCAN token. If a parent
 * UCAN is supplied, the new token records it as provenance; verification later
 * checks both the RSA proof and the attenuation relation against that parent.
 */
export function issueUcan(
  issuer: string,
  authority: Capability,
  privateKeyPem: string,
  options: IssueUcanOptions = {},
): UcanToken {
  const unsigned = ucanFromCapability(issuer, authority, options);
  const created = options.created ?? new Date().toISOString();
  const verificationMethod = options.verificationMethod ?? `${issuer}#keys-1`;
  const { signature } = signRequest(
    "post",
    ucanPath(unsigned.id),
    signedHeaders(unsigned, created),
    verificationMethod,
    privateKeyPem,
    UCAN_SIGNED_FIELDS,
  );
  return {
    ...unsigned,
    proof: {
      type: "RsaSignature2018",
      created,
      verificationMethod,
      signatureValue: signatureValue(signature),
    },
  };
}

/** The grant order used by the first green brick: exact grants and wildcard
 * prefix grants may attenuate; unrelated grants never do. */
export function attenuatesGrant(parent: string, child: string): boolean {
  if (parent === child) return true;
  if (parent === "*") return true;
  if (!parent.endsWith("*")) return false;
  return child.startsWith(parent.slice(0, -1));
}

/** Check whether a child Capability is an attenuation of its parent Capability. */
export function attenuatesCapability(parent: Capability, child: Capability): boolean {
  return attenuatesGrant(parent.grants, child.grants);
}

function verifyProof(token: UcanToken, keyring: UcanKeyring): boolean {
  const publicKeyPem = publicKeyFor(token, keyring);
  if (publicKeyPem === undefined || token.proof.signatureValue === "") return false;
  const unsigned = {
    id: token.id,
    type: token.type,
    issuer: token.issuer,
    audience: token.audience,
    authority: token.authority,
    ...(token.parent === undefined ? {} : { parent: token.parent }),
  } satisfies Omit<UcanToken, "proof">;
  const header = `keyId="${token.proof.verificationMethod}",algorithm="rsa-sha256",headers="${UCAN_SIGNED_FIELDS.join(" ")}",signature="${token.proof.signatureValue}"`;
  return verifyRequest("post", ucanPath(token.id), signedHeaders(unsigned, token.proof.created), header, publicKeyPem);
}

function ancestryOf(token: UcanToken, chain: readonly UcanToken[]): readonly UcanToken[] {
  const byId = new Map(chain.map((entry) => [entry.id, entry]));
  const out: UcanToken[] = [];
  let cursor: UcanToken | undefined = token;
  while (cursor !== undefined) {
    out.unshift(cursor);
    cursor = cursor.parent === undefined ? undefined : byId.get(cursor.parent);
  }
  return out;
}

/**
 * verifyUcan — verify the UCAN's RSA proof chain and its capability order.
 *
 * Every token in the chain must verify against the supplied keyring. Every child
 * must be issued by the previous audience, held by its own audience, and attenuate
 * the previous Capability's grant. A child that widens authority fails even when
 * its RSA signature is valid.
 */
export function verifyUcan(
  token: UcanToken,
  keyring: UcanKeyring,
  chain: readonly UcanToken[] = [],
): UcanVerification {
  const checked = ancestryOf(token, chain);
  const failures: string[] = [];

  if (checked[checked.length - 1]?.id !== token.id) {
    failures.push(`missing target token ${token.id}`);
  }

  for (const entry of checked) {
    if (entry.audience !== entry.authority.holder) {
      failures.push(`${entry.id}: audience must be the authority holder`);
    }
    if (!verifyProof(entry, keyring)) {
      failures.push(`${entry.id}: bad proof`);
    }
  }

  for (let i = 1; i < checked.length; i += 1) {
    const parent = checked[i - 1];
    const child = checked[i];
    if (parent === undefined || child === undefined) continue;
    if (child.parent !== parent.id) {
      failures.push(`${child.id}: parent pointer does not match chain`);
    }
    if (child.issuer !== parent.audience) {
      failures.push(`${child.id}: issuer must be the parent audience`);
    }
    if (!attenuatesCapability(parent.authority, child.authority)) {
      failures.push(`${child.id}: authority widens parent grant`);
    }
  }

  return { valid: failures.length === 0, token, checked, failures };
}

/** revokeUcan — read UCAN revocation through the existing Capability revocation. */
export function revokeUcan(token: UcanToken, by?: string) {
  return revoke(token.authority, by);
}
