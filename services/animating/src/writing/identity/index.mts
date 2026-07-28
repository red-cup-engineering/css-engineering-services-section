/**
 * writing/identity — UNIFIED AGENT IDENTITY: one identity, five coherent facets.
 *
 * Bridge #5 of the cross-protocol coherence slate. The agent already projects onto
 * five identity surfaces — an ActivityPub `Actor`, a `did:web` DID document, an A2A
 * `AgentCard`, a Verifiable Credential `credentialSubject`, and (new here) a
 * WebAuthn/passkey credential. Before this brick those were five slightly-divergent
 * carriers: each derived its id by its own ad-hoc rule keyed off a different input
 * (the agent's bare `identity`, the Actor IRI, a caller-supplied `url`, a free-form
 * credential subject), and a key rotation or revocation had to be re-applied to each
 * one by hand with nothing tying them together.
 *
 * This module proves they are ONE identity. A single `AgentIdentity` carrier holds the
 * root — the agent's identity label, its IRI base, its public key, a key id derived
 * from that key, a rotation `epoch`, and a `revoked` flag. Every facet is a functorial
 * VIEW of that one root, computed by REUSING the already-shipped functors
 * (`actorOfAgent`, `didFromActor`, `agentCardOfAgent`, `issueCredential`), never a
 * re-authored identity. Each facet is exposed as an RWIL `Reading<Wire>` over one
 * witness row that encodes the identity, so the coherence kernel's `cohere` proves any
 * two facets commute through the shared identity pivot — the same law the
 * `outbox ≅ log` proof established, now over the five identity surfaces.
 *
 * Because all five derive from one root, a single `rotate` (bump the epoch, swap the
 * key — the corpus's `rotated-from` discipline on the identity record) changes every
 * facet's key-bound id consistently, and a single `revoke` makes every facet fail
 * verification. One operation, five coherent reflections.
 *
 * Layering: consumes relating's stable apex (`carrierFrom`, `FromSchema`, `mark`,
 * `claim`, the `eavtRecord` witness row, the `Reading`/`cohere` kernel) and animating's
 * own sibling bricks (the Actor / DID / AgentCard / VC functors, the HTTP-Signature
 * crypto). It re-models nothing and imports no relating internal subpath. relating is
 * read-only. See dev/docs/notes/2026-06-26-unified-agent-identity.md.
 */
import { carrierFrom, codecs, type FromSchema } from "@red-cup-engineering/relating";
import type { Reading, RWILWitness } from "@red-cup-engineering/relating/ledger";
import { createHash } from "node:crypto";

import { agent, type Agent } from "../../becoming/doing/working/governing/agent.mjs";
import { actorOfAgent, type Actor } from "../activitypub/actor.mjs";
import { didFromActor, didOfIri, type DIDDocument } from "../did/index.mjs";
import { agentCardOfAgent, type AgentCard } from "../a2a/index.mjs";

// ────────────────────────────────────────────────────────────────────────────
// the single root: AgentIdentity
// ────────────────────────────────────────────────────────────────────────────

/** The single agent-identity root. Every protocol facet is a view of this record:
 *  `identity` names the subject, `base` locates its endpoints, `publicKeyPem` is the
 *  key all facets bind to, `keyId` is the rotation-stamped thumbprint of that key, and
 *  `revoked` withdraws the whole identity at once. Single-source carrier (schema = type
 *  = `$id` = validator), bare descent-path `$id`. */
const { eavtRecord } = codecs.text.json.jsonl.eavt;
type EAVTRecord = codecs.text.json.jsonl.eavt.EAVTRecord;

export const agentIdentitySchema = {
  $id: "animating/writing/identity/agent-identity",
  title: "AgentIdentity",
  description:
    "The single root of an agent's identity: its label, IRI base, public key, the rotation-stamped key id derived from that key, and a revoked flag. The ActivityPub Actor, did:web DID, A2A Agent Card, VC subject, and WebAuthn credential are all coherent views of this one record. $id is the bare package-rooted path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "identity", "base", "publicKeyPem", "keyId", "epoch", "revoked"],
  properties: {
    kind: { const: "animating.agent-identity" },
    identity: { type: "string", minLength: 1 },
    base: { type: "string" },
    publicKeyPem: { type: "string" },
    keyId: { type: "string", minLength: 1 },
    epoch: { type: "integer", minimum: 0 },
    revoked: { type: "boolean" },
  },
} as const;
export type AgentIdentity = FromSchema<typeof agentIdentitySchema>;
export const agentIdentityCarrier = carrierFrom(agentIdentitySchema);

/** The thumbprint that binds a facet's id to the current key at the current epoch: a
 *  short sha256 over the public key and the rotation counter. A rotation (new key
 *  and/or bumped epoch) changes this string, so every facet that carries it changes
 *  consistently in one operation. */
export function keyIdOf(publicKeyPem: string, epoch: number): string {
  const digest = createHash("sha256").update(`${epoch}\n${publicKeyPem}`).digest("hex").slice(0, 32);
  return `keys-${epoch}-${digest}`;
}

/** Options for minting a fresh agent identity. */
export interface AgentIdentityOptions {
  /** the IRI base under which the agent's endpoints live, e.g. `https://dev.bare-cedar-fog.emsenn.net/agents`. */
  readonly base?: string;
  /** the agent's RSA public key (PEM). Empty when the identity is keyless (no facet verifies). */
  readonly publicKeyPem?: string;
  /** the initial rotation epoch — defaults to 0. */
  readonly epoch?: number;
}

/** mintIdentity — build the single agent-identity root for `identity`. The `keyId` is
 *  derived from the key and epoch so it is never set independently of the key it names. */
export function mintIdentity(identity: string, options: AgentIdentityOptions = {}): AgentIdentity {
  const publicKeyPem = options.publicKeyPem ?? "";
  const epoch = options.epoch ?? 0;
  return agentIdentityCarrier.assert({
    kind: "animating.agent-identity" as const,
    identity,
    base: (options.base ?? "").replace(/\/+$/, ""),
    publicKeyPem,
    keyId: keyIdOf(publicKeyPem, epoch),
    epoch,
    revoked: false,
  }, "mintIdentity") as AgentIdentity;
}

/** The agent whose interior these identity facets project. Built once from the root's
 *  `identity` so the Actor/Card derive from the same label, never a divergent seed. */
export function agentOfIdentity(root: AgentIdentity): Agent {
  return agent(`${root.identity}|identity`, { identity: root.identity });
}

/** The canonical Actor IRI for an identity — the single id every other facet keys off. */
export function actorIriOf(root: AgentIdentity): string {
  return actorOfAgent(agentOfIdentity(root), { base: root.base }).id;
}

// ────────────────────────────────────────────────────────────────────────────
// rotation and revocation — one operation, every facet reflects it
// ────────────────────────────────────────────────────────────────────────────

/** rotate — install a new key (and bump the epoch). The `keyId` is recomputed, so every
 *  facet's key-bound id changes in this one operation. Per the corpus's identity-record
 *  rotation discipline, the chain is monotone: the epoch only increases. */
export function rotate(root: AgentIdentity, publicKeyPem: string): AgentIdentity {
  const epoch = root.epoch + 1;
  return agentIdentityCarrier.assert({
    ...root,
    publicKeyPem,
    epoch,
    keyId: keyIdOf(publicKeyPem, epoch),
  }, "rotate") as AgentIdentity;
}

/** revokeIdentity — withdraw the whole identity. Every facet's `verifyFacet` then fails;
 *  the single flag is the truth-axis negation of the agent's authority across all five. */
export function revokeIdentity(root: AgentIdentity): AgentIdentity {
  return agentIdentityCarrier.assert({ ...root, revoked: true }, "revokeIdentity") as AgentIdentity;
}

// ────────────────────────────────────────────────────────────────────────────
// the five facets — coherent views of the one identity
// ────────────────────────────────────────────────────────────────────────────

/** The five identity surfaces an agent presents, each a coherent view of one root. */
export type FacetName = "actor" | "did" | "agent-card" | "vc-subject" | "webauthn";

/** A WebAuthn / passkey credential — the agent's public-key authenticator bound to one
 *  identity. Modeled on the corpus's authentication-method-record (`method-kind:
 *  public-key`, `rotated-from` chain): `id` is the credential id, `publicKey` the
 *  registered key, and `keyId` the rotation-stamped thumbprint binding it to the current
 *  epoch. Single-source carrier, bare descent-path `$id`. */
export const webauthnCredentialSchema = {
  $id: "animating/writing/identity/webauthn-credential",
  title: "WebAuthnCredential",
  description:
    "A WebAuthn/passkey public-key credential bound to one agent identity: `id` the credential id (the agent's did + key thumbprint), `rpId` the relying-party host, `publicKey` the registered key, `keyId` the rotation-stamped thumbprint. The corpus's public-key authentication-method-record, made a coherent facet. $id is the bare package-rooted path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "id", "rpId", "publicKey", "keyId"],
  properties: {
    kind: { const: "animating.webauthn-credential" },
    id: { type: "string", minLength: 1 },
    rpId: { type: "string" },
    publicKey: { type: "string" },
    keyId: { type: "string", minLength: 1 },
  },
} as const;
export type WebAuthnCredential = FromSchema<typeof webauthnCredentialSchema>;
export const webauthnCredentialCarrier = carrierFrom(webauthnCredentialSchema);

/** webauthnOfIdentity — the agent's passkey facet: a public-key credential whose id is
 *  the agent's DID stamped with the current key id, whose relying-party host is the
 *  Actor IRI's host, and which carries the identity's current key. A rotation changes the
 *  `keyId` and hence the credential id; a fresh registration after rotation, exactly as a
 *  rotated authentication-method-record. */
export function webauthnOfIdentity(root: AgentIdentity): WebAuthnCredential {
  const did = didFromActor(actorOfAgent(agentOfIdentity(root), { base: root.base })).id;
  const rpId = new URL(actorIriOf(root)).host;
  return webauthnCredentialCarrier.assert({
    kind: "animating.webauthn-credential" as const,
    id: `${did}#${root.keyId}`,
    rpId,
    publicKey: root.publicKeyPem,
    keyId: root.keyId,
  }, "webauthnOfIdentity") as WebAuthnCredential;
}

/** The Actor facet — the agent's outward identity document. */
export function actorFacet(root: AgentIdentity): Actor {
  return actorOfAgent(agentOfIdentity(root), { base: root.base });
}

/** The DID facet — the portable did:web re-reading of the Actor's host+path, carrying
 *  the identity's current key as its verification method. */
export function didFacet(root: AgentIdentity): DIDDocument {
  return didFromActor(
    actorFacet(root),
    root.publicKeyPem === "" ? {} : { publicKeyPem: root.publicKeyPem },
  );
}

/** The A2A Agent Card facet — the agent's affordance projection, addressed at its own
 *  Actor IRI (not a caller-supplied url, so it stays bound to the one identity). */
export function agentCardFacet(root: AgentIdentity): AgentCard {
  return agentCardOfAgent(agentOfIdentity(root), { url: actorIriOf(root) });
}

/** The VC-subject facet — the `credentialSubject.id` a Verifiable Credential about this
 *  agent must name: its DID, the portable subject id every credential binds to. */
export function vcSubjectFacet(root: AgentIdentity): string {
  return didOfIri(actorIriOf(root));
}

/** facetIdOf — the canonical id a facet presents, for the projections-commute law: all
 *  five reduce to one DID-rooted identity (the Actor IRI's DID), with the key-bound
 *  facets stamped by the current key id. */
export function facetIdOf(root: AgentIdentity, facet: FacetName): string {
  const did = vcSubjectFacet(root);
  switch (facet) {
    case "actor": return actorIriOf(root);
    case "did": return did;
    case "agent-card": return actorIriOf(root);
    case "vc-subject": return did;
    case "webauthn": return `${did}#${root.keyId}`;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// verification — a revoked identity fails on every facet; a rotation is detected
// ────────────────────────────────────────────────────────────────────────────

/** verifyFacet — is this facet a live, current view of the identity? False when the
 *  identity is revoked (every facet fails at once), or when the facet's key-bound id no
 *  longer matches the identity's current epoch (a stale, pre-rotation facet). The one
 *  predicate every surface answers through. */
export function verifyFacet(root: AgentIdentity, facet: FacetName, presentedId: string): boolean {
  if (root.revoked) return false;
  return presentedId === facetIdOf(root, facet);
}

// ────────────────────────────────────────────────────────────────────────────
// the RWIL readings — each facet as a Reading over one identity witness row
// ────────────────────────────────────────────────────────────────────────────

/** The RWIL witness row that encodes one agent identity: entity = the DID, attribute =
 *  the identity label + epoch, value = the key id, time = derived from the epoch. This is
 *  the shared pivot all five facet readings round-trip through, the way the protocol-wave
 *  readings round-trip the AP-shaped witness. */
export function identityWitness(root: AgentIdentity): RWILWitness {
  return eavtRecord({
    e: vcSubjectFacet(root),
    a: `agent-identity|${root.identity}|epoch=${root.epoch}`,
    v: root.keyId,
    t: `urn:agent-identity:epoch:${root.epoch}`,
  });
}

/** Recover the identity root from its witness row (the inverse of `identityWitness`). */
export function identityFromWitness(witness: RWILWitness, template: AgentIdentity): AgentIdentity {
  const row = eavtRecord(witness) as EAVTRecord;
  const attribute = String(row.a);
  const epochMatch = /epoch=(\d+)$/.exec(attribute);
  const identityMatch = /^agent-identity\|(.*)\|epoch=\d+$/.exec(attribute);
  const epoch = epochMatch ? Number(epochMatch[1]) : template.epoch;
  const identity = identityMatch ? (identityMatch[1] ?? template.identity) : template.identity;
  return agentIdentityCarrier.assert({
    ...template,
    identity,
    epoch,
    keyId: String(row.v),
  }, "identityFromWitness") as AgentIdentity;
}

/** A facet reading: the wire side is the facet's canonical id, recovered back to the
 *  identity witness through the shared pivot. Two facet readings cohere exactly because
 *  both round-trip the one identity — the unified-identity instance of the coherence law. */
function facetReading(facet: FacetName, template: AgentIdentity): Reading<string> {
  return Object.freeze({
    id: `animating.identity.${facet}`,
    toWire: (witness: RWILWitness): string => facetIdOf(identityFromWitness(witness, template), facet),
    fromWire: (id: string): RWILWitness => {
      // The facet id carries the DID and (for key-bound facets) the key id after `#`.
      const hash = id.indexOf("#");
      const did = hash < 0 ? id : id.slice(0, hash);
      const keyId = hash < 0 ? template.keyId : id.slice(hash + 1);
      return identityWitness(agentIdentityCarrier.assert({
        ...template,
        keyId,
      }, "facetReading.fromWire") as AgentIdentity);
    },
  });
}

/** The five facet readings of one identity, for the coherence-kernel law. Each is a
 *  `Reading<string>` over the shared identity witness; `cohere(a, b, identityWitness(root))`
 *  proves any two commute. The `did` / `vc-subject` / `agent-card` / `actor` readings are
 *  DID-rooted (the projections-commute facets); `webauthn` carries the key id too. */
export function identityReadings(root: AgentIdentity): readonly Reading<string>[] {
  const facets: readonly FacetName[] = ["actor", "did", "agent-card", "vc-subject", "webauthn"];
  return Object.freeze(facets.map((facet) => facetReading(facet, root)));
}

/** The reading for one named facet (for targeted `cohere` calls). */
export function identityReading(root: AgentIdentity, facet: FacetName): Reading<string> {
  return facetReading(facet, root);
}
