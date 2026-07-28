import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { canonical, contentRecord, digest } from "../src/records.mjs";
import { querySettlementRecords } from "@lenticule-science/rwil-rdf-projection-service/client";
import { startRwilProviderProcess } from "@lenticule-science/rwil-rdf-projection-service/test-provider";
import { ACTOR, executeGoogleDriveUseOperation, handleGoogleDriveUseOperation } from "../src/contract-google-drive-use.mjs";

const CUSTOMER = "urn:ame:test-customer";
const NOW = "2026-07-19T05:20:00.000Z";
let rwil;
test.before(async () => { rwil = await startRwilProviderProcess(); });
test.after(async () => { await rwil.close(); });

function request(purpose, input = {}, executionMode = "dry-run") {
  return {
    type: "GoogleDriveUseRequest",
    purpose,
    executionMode,
    credentialGrantId: "urn:grant:test-google-drive",
    maximumWallMilliseconds: 1000,
    maximumBytes: 4096,
    input,
  };
}

function solicitation(value) {
  const sourceActivity = contentRecord({ type: "Create", actor: CUSTOMER, target: ACTOR, object: value, recordedAt: NOW });
  return contentRecord({ type: "Offer", actor: CUSTOMER, target: ACTOR,
    object: contentRecord({ type: "ServiceSolicitation", contract: "ni:///sha-256;j88skmtaZYqLQVHaJjd5bwYiTzwUYneGtgd4NlFrio4", sourceActivity, recordedAt: NOW }), recordedAt: NOW });
}

function capability(offer, overrides = {}) {
  return contentRecord({
    type: "PurposeBoundCapability",
    issuer: CUSTOMER,
    holder: ACTOR,
    invocationTarget: ACTOR,
    requestDigest: offer.object.requestDigest,
    providerOfferDigest: digest(offer),
    credentialGrantId: offer.object.credentialGrantId,
    effects: offer.object.effects,
    singleUse: true,
    expiresAt: "2026-07-19T06:00:00.000Z",
    ...overrides,
  });
}

function invocation(offer, cap = capability(offer)) {
  return contentRecord({ type: "Accept", actor: CUSTOMER, target: ACTOR, object: offer, capability: cap, recordedAt: NOW });
}

async function contract(value) {
  const source = solicitation(value);
  const offer = await handleGoogleDriveUseOperation("solicit-service", source, NOW);
  return { source, offer, cap: capability(offer) };
}

test("purpose fixes the operation and caller-selected provider mechanics refuse", async () => {
  for (const field of ["operation", "executable", "endpoint", "method", "headers", "environment", "retry", "token"]) {
    const bad = request("list Google Drive files");
    bad[field] = field === "retry" ? true : "caller-choice";
    await assert.rejects(() => handleGoogleDriveUseOperation("solicit-service", solicitation(bad), NOW),
      new RegExp(`caller-selected ${field} is forbidden`, "u"));
  }
  const { offer } = await contract(request("store one new file in Google Drive", { name: "one.txt", content: "one" }));
  assert.equal(offer.object.fixedOperation, "store");
  assert.equal(Object.hasOwn(offer.object.request, "operation"), false);
  assert.equal(offer.object.maximumProviderRequests, 1);
});

test("dry-run closes through an exact single-use capability without network or credential material", async () => {
  const { offer, cap } = await contract(request("list Google Drive files"));
  let called = false;
  const result = await handleGoogleDriveUseOperation("invoke-service", invocation(offer, cap), NOW, {
    fetchImpl: async () => { called = true; throw new Error("must not call"); },
    usedCapabilityIds: new Set(),
  });
  assert.equal(result.type, "Accept");
  assert.equal(result.object.fixedOperation, "list");
  assert.equal(result.object.externalNetworkPerformed, false);
  assert.equal(result.object.credentialMaterialObserved, false);
  assert.equal(called, false);
  assert.equal(canonical(result).includes("Bearer"), false);
});

test("credential-grant mismatch and capability replay refuse before provider use", async () => {
  const { offer, cap } = await contract(request("list Google Drive files", {}, "live"));
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return new Response(JSON.stringify({ files: [] })); };
  const mismatched = await handleGoogleDriveUseOperation("invoke-service", invocation(offer, cap), NOW, {
    fetchImpl, accessToken: "test-secret", configuredCredentialGrantId: "urn:grant:different", usedCapabilityIds: new Set(),
  });
  assert.equal(mismatched.type, "Reject");
  assert.equal(mismatched.object.code, "credential-grant-unavailable-or-mismatched");
  assert.equal(calls, 0);
  await assert.rejects(() => handleGoogleDriveUseOperation("invoke-service", invocation(offer, cap), NOW, {
    fetchImpl, accessToken: "test-secret", configuredCredentialGrantId: cap.credentialGrantId, usedCapabilityIds: new Set([cap.id]),
  }), /capability replay/u);
  assert.equal(calls, 0);
});

test("simulated list use is bounded and provider refusal never returns credential bytes", async () => {
  const { offer, cap } = await contract(request("list Google Drive files", { pageSize: 2 }, "live"));
  let authorization;
  const successful = await handleGoogleDriveUseOperation("invoke-service", invocation(offer, cap), NOW, {
    accessToken: "test-secret",
    configuredCredentialGrantId: cap.credentialGrantId,
    usedCapabilityIds: new Set(),
    fetchImpl: async (url, init) => {
      authorization = init.headers.Authorization;
      assert.match(url, /^https:\/\/www\.googleapis\.com\/drive\/v3\/files\?/u);
      return new Response(JSON.stringify({ files: [{ id: "one", name: "One" }] }), { status: 200,
        headers: { "content-type": "application/json" } });
    },
  });
  assert.equal(authorization, "Bearer test-secret");
  assert.equal(successful.type, "Accept");
  assert.equal(successful.object.providerResult.operation, "list");
  assert.equal(successful.object.resourceObservations.providerRequests.value, 1);
  assert.equal(canonical(successful).includes("test-secret"), false);

  const { offer: refusedOffer, cap: refusedCap } = await contract(request("list Google Drive files", {}, "live"));
  const refused = await handleGoogleDriveUseOperation("invoke-service", invocation(refusedOffer, refusedCap), NOW, {
    accessToken: "another-secret",
    configuredCredentialGrantId: refusedCap.credentialGrantId,
    usedCapabilityIds: new Set(),
    fetchImpl: async () => new Response(JSON.stringify({ error: { status: "UNAUTHENTICATED", message: "not accepted" } }),
      { status: 401, statusText: "Unauthorized" }),
  });
  assert.equal(refused.type, "Reject");
  assert.equal(refused.object.code, "google-drive-provider-refused");
  assert.equal(refused.object.evidence.status, 401);
  assert.match(refused.object.evidence.bodyDigest, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(canonical(refused).includes("another-secret"), false);
  assert.equal(Object.hasOwn(refused.object.evidence, "body"), false);
});

test("advertised provider entry records canonical RWIL/RDF and rejects a replayed capability", async () => {
  const dataRoot = mkdtempSync(join(tmpdir(), "google-drive-use-data-"));
  const requestValue = request("retrieve one file from Google Drive", { fileId: "one" });
  const source = solicitation(requestValue);
  const offered = await executeGoogleDriveUseOperation({ operation: "solicit-service", input: source, now: NOW, dataRoot, rwilAgentUrl: rwil.agentCardUrl });
  const cap = capability(offered);
  const invoke = invocation(offered, cap);
  const first = await executeGoogleDriveUseOperation({ operation: "invoke-service", input: invoke, now: NOW, dataRoot, rwilAgentUrl: rwil.agentCardUrl });
  assert.equal(first.type, "Accept");
  const second = await executeGoogleDriveUseOperation({ operation: "invoke-service", input: invoke, now: NOW, dataRoot, rwilAgentUrl: rwil.agentCardUrl });
  assert.equal(second.type, "Reject");
  assert.match(second.object.detail, /capability replay/u);
  const records = await querySettlementRecords("service-outcomes");
  assert.equal(records.length, 3);
  assert.equal(records.every((record) => record.credentialMaterialRecorded === false), true);
});
