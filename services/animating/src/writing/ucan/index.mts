/** Standards-clean UCAN invocation admission using canonical ucanto DAG-CBOR/CID carriers. */
import { relationalRwilDocument } from "@lenticule-science/rwil-rdf-projection-service/client";
// @ts-expect-error The canonical RMN package is JavaScript and does not yet publish declarations.
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import type { API } from "@ucanto/core";
import { Schema } from "@ucanto/core";
import { ed25519 } from "@ucanto/principal";
import { Revoked, access, capability } from "@ucanto/validator";

export interface UcanCapability {
  readonly with: `did:pkh:eip155:${string}:0x${string}`;
  readonly can: API.Ability;
  readonly nb: API.Caveats;
}

export interface VerifyUcanInvocationOptions {
  readonly invocation: API.Invocation<API.Capability<API.Ability, UcanCapability["with"], API.Caveats>>;
  readonly authority: API.Verifier;
  readonly controller: `did:key:${string}`;
  readonly actor: `did:key:${string}`;
  readonly capability: UcanCapability;
  readonly isRevoked: (cid: string) => boolean | Promise<boolean>;
}

export interface UcanInvocationVerificationReceipt {
  readonly id: string;
  readonly type: "UcanInvocationVerificationReceipt";
  readonly version: 1;
  readonly protocol: "UCAN";
  readonly ucanVersion: "0.9.1";
  readonly implementation: Readonly<{ core: "@ucanto/core@10.4.6"; validator: "@ucanto/validator@10.0.1"; principal: "@ucanto/principal@9.0.3" }>;
  readonly disposition: "authorized";
  readonly revocationStatus: "active";
  readonly controller: string;
  readonly actor: string;
  readonly audience: string;
  readonly delegationCid: string;
  readonly invocationCid: string;
  readonly capability: UcanCapability;
  readonly capabilityNi: string;
  readonly proofChain: readonly string[];
  readonly temporalBounds: Readonly<{ notBefore: number | null; expiration: number; nonce: string | null }>;
}

const DID_KEY = /^did:key:z[1-9A-HJ-NP-Za-km-z]{16,512}$/u;
const RESOURCE = /^did:pkh:eip155:[1-9][0-9]*:0x[0-9a-fA-F]{40}$/u;
const ABILITY = /^[a-z][a-z0-9-]*(?:\/[a-zA-Z][a-zA-Z0-9-]*)+$/u;

function identify(value: unknown): string {
  return semanticId(relationalRwilDocument(value));
}

function exactCapability(value: UcanCapability): UcanCapability {
  if (!RESOURCE.test(value?.with ?? "")) throw new TypeError("capability.with must be an EnterpriseAccount did:pkh resource");
  if (!ABILITY.test(value?.can ?? "")) throw new TypeError("capability.can must be one exact namespaced ability");
  if (value.nb === null || typeof value.nb !== "object" || Array.isArray(value.nb)) throw new TypeError("capability.nb must be an object");
  return Object.freeze({ with: value.with.toLowerCase() as UcanCapability["with"], can: value.can,
    nb: Object.freeze(structuredClone(value.nb)) });
}

function authorizationCids(authorization: API.Authorization): readonly string[] {
  const found: string[] = [];
  const visit = (entry: API.Authorization): void => {
    for (const proof of entry.proofs) visit(proof);
    const cid = entry.delegation.cid.toString();
    if (!found.includes(cid)) found.push(cid);
  };
  visit(authorization);
  return Object.freeze(found);
}

/**
 * Verify one canonical ucanto Invocation and its proof DAG, including signature,
 * audience, attenuation, time bounds, and caller-supplied live revocation state.
 * The EnterpriseAccount controller binding remains a separate ERC-1271 receipt.
 */
export async function verifyUcanInvocation(options: VerifyUcanInvocationOptions): Promise<UcanInvocationVerificationReceipt> {
  const { invocation, authority, isRevoked } = options;
  if (invocation === null || typeof invocation !== "object" || typeof invocation.cid?.toString !== "function") throw new TypeError("invocation must be an official ucanto Invocation view");
  if (typeof authority?.did !== "function" || !DID_KEY.test(authority.did())) throw new TypeError("authority must be a did:key verifier");
  if (!DID_KEY.test(options.controller) || !DID_KEY.test(options.actor) || options.controller === options.actor) throw new TypeError("controller and actor must be distinct did:key principals");
  if (typeof isRevoked !== "function") throw new TypeError("isRevoked must be an injected current-status observer");
  if (invocation.issuer.did() !== options.actor) throw new TypeError("invocation issuer differs from the pairwise actor");
  if (invocation.audience.did() !== authority.did()) throw new TypeError("invocation audience differs from the executing authority");
  if (invocation.version !== "0.9.1") throw new TypeError("invocation is not the admitted ucanto UCAN 0.9.1 carrier");
  if (!Number.isInteger(invocation.expiration) || invocation.notBefore !== undefined && !Number.isInteger(invocation.notBefore)) throw new TypeError("UCAN time bounds must be integers");

  const expected = exactCapability(options.capability);
  const parser = capability({ can: expected.can, with: Schema.literal(expected.with),
    nb: Schema.dictionary({ key: Schema.string(), value: Schema.unknown() }) });
  const result = await access(invocation, {
    authority,
    principal: ed25519.Verifier,
    capability: parser,
    canIssue: (claim, issuer) => issuer === options.controller && claim.with === expected.with
      && claim.can === expected.can && identify(claim.nb) === identify(expected.nb),
    validateAuthorization: async (authorization): Promise<API.Result<API.Unit, API.Revoked>> => {
      if (await isRevoked(authorization.delegation.cid.toString())) return { error: new Revoked(authorization.delegation) };
      return { ok: {} } as API.Result<API.Unit, API.Revoked>;
    },
  });
  if (result.error) throw Object.assign(new Error(`UCAN invocation is unauthorized: ${result.error.message}`), { cause: result.error });

  const proofChain = authorizationCids(result.ok);
  for (const cid of proofChain) {
    if (await isRevoked(cid)) throw new TypeError(`UCAN proof ${cid} is revoked`);
  }
  const delegationCid = proofChain.find((cid) => cid !== invocation.cid.toString());
  if (delegationCid === undefined) throw new TypeError("UCAN invocation has no controller delegation proof");
  if (result.ok.capability.with !== expected.with || result.ok.capability.can !== expected.can
    || identify(result.ok.capability.nb) !== identify(expected.nb)) throw new TypeError("authorized capability differs from the requested exact capability");
  const capabilityNi = identify(expected);
  const body = Object.freeze({ type: "UcanInvocationVerificationReceipt" as const, version: 1 as const,
    protocol: "UCAN" as const, ucanVersion: "0.9.1" as const,
    implementation: Object.freeze({ core: "@ucanto/core@10.4.6" as const,
      validator: "@ucanto/validator@10.0.1" as const, principal: "@ucanto/principal@9.0.3" as const }),
    disposition: "authorized" as const, revocationStatus: "active" as const,
    controller: options.controller, actor: options.actor, audience: authority.did(), delegationCid,
    invocationCid: invocation.cid.toString(), capability: expected, capabilityNi, proofChain,
    temporalBounds: Object.freeze({ notBefore: invocation.notBefore ?? null, expiration: invocation.expiration,
      nonce: invocation.nonce ?? null }),
  });
  return Object.freeze({ id: identify(body), ...body });
}
