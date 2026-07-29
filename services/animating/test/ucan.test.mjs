import assert from "node:assert/strict";
import test from "node:test";
import { delegate, invoke } from "@ucanto/core";
import { ed25519 } from "@ucanto/principal";
import { relationalRwilDocument } from "@lenticule-science/rwil-rdf-projection-service/client";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { verifyUcanInvocation } from "../dist/index.mjs";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const RESOURCE = `did:pkh:eip155:5615610:${ACCOUNT}`;
const CAPABILITY = Object.freeze({ with: RESOURCE, can: "semiotic-exchange/settle-demand",
  nb: Object.freeze({ demand: `0x${"22".repeat(32)}` }) });

async function fixture(capability = CAPABILITY) {
  const controller = await ed25519.generate();
  const actor = await ed25519.generate();
  const executor = await ed25519.generate();
  const now = Math.floor(Date.now() / 1000);
  const delegation = await delegate({ issuer: controller, audience: actor, capabilities: [capability],
    notBefore: now - 1, expiration: now + 300, nonce: "delegation-1" });
  const invocation = await invoke({ issuer: actor, audience: executor, capability, proofs: [delegation],
    notBefore: now - 1, expiration: now + 60, nonce: "invocation-1" }).delegate();
  return { controller, actor, executor, delegation, invocation };
}

test("official ucanto proof DAG emits one content-addressed invocation verification receipt", async () => {
  const value = await fixture();
  const receipt = await verifyUcanInvocation({ invocation: value.invocation, authority: value.executor,
    controller: value.controller.did(), actor: value.actor.did(), capability: CAPABILITY,
    isRevoked: async () => false });
  assert.equal(receipt.type, "UcanInvocationVerificationReceipt");
  assert.equal(receipt.protocol, "UCAN");
  assert.equal(receipt.ucanVersion, "0.9.1");
  assert.equal(receipt.disposition, "authorized");
  assert.equal(receipt.revocationStatus, "active");
  assert.equal(receipt.controller, value.controller.did());
  assert.equal(receipt.actor, value.actor.did());
  assert.equal(receipt.audience, value.executor.did());
  assert.equal(receipt.delegationCid, value.delegation.cid.toString());
  assert.equal(receipt.invocationCid, value.invocation.cid.toString());
  assert.deepEqual(receipt.proofChain, [value.delegation.cid.toString(), value.invocation.cid.toString()]);
  assert.match(receipt.id, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
  assert.match(receipt.capabilityNi, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
  const { id, ...body } = receipt;
  assert.equal(id, semanticId(relationalRwilDocument(body)));
  assert.equal(receipt.capabilityNi, semanticId(relationalRwilDocument(CAPABILITY)));
});

test("revoked proof cannot produce an authorized receipt", async () => {
  const value = await fixture();
  await assert.rejects(() => verifyUcanInvocation({ invocation: value.invocation, authority: value.executor,
    controller: value.controller.did(), actor: value.actor.did(), capability: CAPABILITY,
    isRevoked: async (cid) => cid === value.delegation.cid.toString() }), /revoked/u);
});

test("capability widening and displaced actor are refused", async () => {
  const value = await fixture();
  await assert.rejects(() => verifyUcanInvocation({ invocation: value.invocation, authority: value.executor,
    controller: value.controller.did(), actor: value.actor.did(),
    capability: { ...CAPABILITY, can: "semiotic-exchange/raise-demand" }, isRevoked: async () => false }), /unauthorized/u);
  const stranger = await ed25519.generate();
  await assert.rejects(() => verifyUcanInvocation({ invocation: value.invocation, authority: value.executor,
    controller: value.controller.did(), actor: stranger.did(), capability: CAPABILITY,
    isRevoked: async () => false }), /issuer differs/u);
});
