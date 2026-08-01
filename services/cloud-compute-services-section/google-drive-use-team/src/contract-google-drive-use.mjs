#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
import {
  activityObject,
  assertContentRecord,
  canonical,
  contentRecord,
  digest,
  resourceObservations,
} from "./records.mjs";
import { createSettlementStore } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { GOOGLE_DRIVE_USE_SERVICE_LAW } from "./law.mjs";

export const ACTOR = "urn:ame:google-drive-use-team";
const NODE_ID = "google-drive-use-team";
const ROOT = new URL("..", import.meta.url).pathname;
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const FILE_FIELDS = "id,name,mimeType,size,parents,modifiedTime";
const MAXIMUM_BYTES = 10 * 1024 * 1024;
export const CONTRACT = GOOGLE_DRIVE_USE_SERVICE_LAW.id;

export const PURPOSES = Object.freeze({
  "store one new file in Google Drive": Object.freeze({
    operation: "store",
    maximumProviderRequests: 1,
    effect: "create-one-google-drive-file",
  }),
  "retrieve one file from Google Drive": Object.freeze({
    operation: "retrieve",
    maximumProviderRequests: 2,
    effect: "read-one-google-drive-file",
  }),
  "list Google Drive files": Object.freeze({
    operation: "list",
    maximumProviderRequests: 1,
    effect: "read-one-bounded-google-drive-file-page",
  }),
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function finiteString(value, maximum = 4096) {
  return typeof value === "string" && value.length > 0 && value.length <= maximum && !value.includes("\0");
}

function exactKeys(value, allowed, label) {
  for (const key of Object.keys(value)) assert(allowed.includes(key), `${label}.${key} is not admitted`);
}

export function validateRequest(request) {
  assert(request?.type === "GoogleDriveUseRequest", "request type must be GoogleDriveUseRequest");
  const selected = PURPOSES[request.purpose];
  assert(selected, "request purpose is not offered");
  assert(["dry-run", "live"].includes(request.executionMode), "executionMode must be dry-run or live");
  assert(finiteString(request.credentialGrantId, 512), "credentialGrantId must be a finite non-secret identifier");
  assert(request.maximumWallMilliseconds === undefined, "maximumWallMilliseconds is retired; cancellation is an explicit capability");
  assert(Number.isInteger(request.maximumBytes) && request.maximumBytes >= 1
    && request.maximumBytes <= MAXIMUM_BYTES, `maximumBytes must be 1..${MAXIMUM_BYTES}`);
  for (const forbidden of ["operation", "executable", "command", "argv", "endpoint", "url", "method", "headers", "environment", "retry", "fallback", "accessToken", "token"]) {
    assert(!Object.hasOwn(request, forbidden), `caller-selected ${forbidden} is forbidden`);
  }
  exactKeys(request, ["type", "purpose", "executionMode", "credentialGrantId", "maximumBytes", "input"], "request");
  assert(request.input && typeof request.input === "object" && !Array.isArray(request.input), "request.input must be an object");
  const input = request.input;
  if (selected.operation === "store") {
    exactKeys(input, ["name", "content", "contentBase64", "mimeType", "parentFolderId"], "request.input");
    assert(finiteString(input.name, 1024), "store name must be finite");
    const hasText = Object.hasOwn(input, "content"), hasBase64 = Object.hasOwn(input, "contentBase64");
    assert(hasText !== hasBase64, "store requires exactly one of content or contentBase64");
    assert(!hasText || typeof input.content === "string", "content must be a string");
    assert(!hasBase64 || (finiteString(input.contentBase64, MAXIMUM_BYTES * 2)
      && /^[A-Za-z0-9+/]+={0,2}$/u.test(input.contentBase64)), "contentBase64 must be canonical base64 text");
    if (input.mimeType !== undefined) assert(finiteString(input.mimeType, 255), "mimeType must be finite");
    if (input.parentFolderId !== undefined) assert(finiteString(input.parentFolderId, 512), "parentFolderId must be finite");
    const bytes = hasText ? Buffer.byteLength(input.content) : Buffer.from(input.contentBase64, "base64").length;
    assert(bytes <= request.maximumBytes, "store content exceeds maximumBytes");
  } else if (selected.operation === "retrieve") {
    exactKeys(input, ["fileId"], "request.input");
    assert(finiteString(input.fileId, 512), "retrieve fileId must be finite");
  } else {
    exactKeys(input, ["query", "pageSize"], "request.input");
    if (input.query !== undefined) assert(finiteString(input.query, 2048), "list query must be finite");
    if (input.pageSize !== undefined) assert(Number.isInteger(input.pageSize) && input.pageSize >= 1 && input.pageSize <= 100,
      "list pageSize must be 1..100");
  }
  return selected;
}

function requestFrom(activity) {
  assert(activity?.type === "Offer" && activity.target === ACTOR, "Offer targeted to this child is required");
  const solicitation = activityObject(activity, "ServiceSolicitation");
  assert(solicitation, "ServiceSolicitation is required");
  const source = solicitation.sourceActivity?.object;
  const request = source?.type === "GoogleDriveUseRequest" ? source : solicitation.request;
  validateRequest(request);
  return request;
}

function effectsFor(request) {
  const selected = PURPOSES[request.purpose];
  return [selected.effect, "contract-google-drive-v3", "provider-local-witness-journal-rdf-evidence"];
}

function solicit(activity, now) {
  const request = requestFrom(activity);
  const selected = PURPOSES[request.purpose];
  const object = contentRecord({
    type: "GoogleDriveUseOffer",
    contract: CONTRACT,
    providerContract: "google-drive-v3-bounded-use",
    request,
    requestDigest: digest(request),
    fixedOperation: selected.operation,
    maximumProviderRequests: selected.maximumProviderRequests,
    credentialGrantId: request.credentialGrantId,
    effects: effectsFor(request),
    credentialMaterialAcceptedInActivity: false,
    customerMutation: false,
    recordedAt: now,
  });
  return contentRecord({ type: "Offer", actor: ACTOR, target: activity.actor, inReplyTo: activity.id, object, recordedAt: now });
}

function validateCapability(capability, offer, customer, now, usedCapabilityIds) {
  assertContentRecord(capability, "capability");
  assert(capability.type === "PurposeBoundCapability", "PurposeBoundCapability is required");
  assert(capability.issuer === customer && capability.holder === ACTOR && capability.invocationTarget === ACTOR,
    "capability parties mismatch");
  assert(capability.requestDigest === offer.object.requestDigest && capability.providerOfferDigest === digest(offer),
    "capability binding mismatch");
  assert(capability.credentialGrantId === offer.object.credentialGrantId, "credential grant binding mismatch");
  assert(capability.singleUse === true && Date.parse(capability.expiresAt) >= Date.parse(now), "capability is expired or reusable");
  assert(canonical(capability.effects) === canonical(offer.object.effects), "capability effects mismatch");
  assert(!usedCapabilityIds.has(capability.id), "capability replay");
}

function normalizeFile(value) {
  const output = { id: value.id };
  if (typeof value.name === "string") output.name = value.name;
  if (typeof value.mimeType === "string") output.mimeType = value.mimeType;
  if (Number.isFinite(Number(value.size))) output.size = Number(value.size);
  if (Array.isArray(value.parents)) output.parents = value.parents;
  if (typeof value.modifiedTime === "string") output.modifiedTime = value.modifiedTime;
  return output;
}

async function readBounded(response, maximumBytes) {
  const declared = Number(response.headers?.get?.("content-length"));
  if (Number.isFinite(declared) && declared > maximumBytes) throw new Error("provider response exceeds maximumBytes");
  if (!response.body?.getReader) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > maximumBytes) throw new Error("provider response exceeds maximumBytes");
    return bytes;
  }
  const reader = response.body.getReader(), chunks = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maximumBytes) {
      await reader.cancel();
      throw new Error("provider response exceeds maximumBytes");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, length);
}

function typedRefusal(source, offer, capability, code, detail, evidence, now, observations) {
  const object = contentRecord({
    type: "GoogleDriveUseRefusal",
    contract: CONTRACT,
    code,
    detail,
    requestDigest: offer?.object?.requestDigest ?? null,
    capabilityId: capability?.id ?? null,
    evidence,
    credentialMaterialRecorded: false,
    customerMutation: false,
    resourceObservations: observations,
    recordedAt: now,
  });
  return contentRecord({ type: "Reject", actor: ACTOR, target: source.actor, inReplyTo: source.id, object, recordedAt: now });
}

async function invoke(activity, now, options) {
  assert(activity?.type === "Accept" && activity.target === ACTOR, "Accept targeted to this child is required");
  const offer = activity.object?.offer ?? activity.object;
  assertContentRecord(offer, "offer");
  assert(offer.type === "Offer" && offer.actor === ACTOR && offer.target === activity.actor, "exact provider offer is required");
  const request = offer.object?.request;
  const selected = validateRequest(request);
  assert(offer.object.requestDigest === digest(request) && offer.object.fixedOperation === selected.operation,
    "offer request or fixed operation drifted");
  assert(canonical(offer.object.effects) === canonical(effectsFor(request)), "offer effects drifted");
  const capability = activity.capability ?? activity.object?.capability;
  validateCapability(capability, offer, activity.actor, now, options.usedCapabilityIds);
  const started = process.hrtime.bigint();
  const observations = (providerRequests = 0) => ({
    ...resourceObservations({ elapsedMilliseconds: Number(process.hrtime.bigint() - started) / 1e6 }),
    providerRequests: { state: "measured", value: providerRequests, unit: "request" },
  });
  if (request.executionMode === "dry-run") {
    const product = contentRecord({
      type: "GoogleDriveUseProduct",
      contract: CONTRACT,
      disposition: "ready",
      requestDigest: offer.object.requestDigest,
      capabilityId: capability.id,
      purpose: request.purpose,
      fixedOperation: selected.operation,
      maximumProviderRequests: selected.maximumProviderRequests,
      externalNetworkPerformed: false,
      credentialMaterialObserved: false,
      credentialMaterialRecorded: false,
      customerMutation: false,
      customerUsefulnessClaimed: false,
      resourceObservations: observations(0),
      recordedAt: now,
    });
    return contentRecord({ type: "Accept", actor: ACTOR, target: activity.actor, inReplyTo: activity.id, object: product, recordedAt: now });
  }
  if (!finiteString(options.accessToken, 16384) || options.configuredCredentialGrantId !== request.credentialGrantId) {
    return typedRefusal(activity, offer, capability, "credential-grant-unavailable-or-mismatched",
      "the configured credential and non-secret grant identity did not match the exact invocation",
      { networkRequests: 0 }, now, observations(0));
  }
  let providerRequests = 0;
  async function boundedFetch(url, init = {}) {
    providerRequests += 1;
    assert(providerRequests <= selected.maximumProviderRequests, "fixed provider request ceiling exceeded");
    return await options.fetchImpl(url, {
      ...init,
      headers: { Authorization: `Bearer ${options.accessToken}`, ...(init.headers ?? {}) },
      ...(options.signal ? { signal: options.signal } : {}),
    });
  }
  async function providerJson(url, init) {
    const response = await boundedFetch(url, init);
    const bytes = await readBounded(response, request.maximumBytes);
    if (!response.ok) return { refusal: { status: response.status, statusText: response.statusText,
      bodyDigest: `sha256:${createHash("sha256").update(bytes).digest("hex")}` } };
    try { return { value: JSON.parse(bytes.toString("utf8")) }; }
    catch { return { refusal: { status: response.status, statusText: response.statusText, code: "provider-json-invalid",
      bodyDigest: `sha256:${createHash("sha256").update(bytes).digest("hex")}` } }; }
  }
  try {
    let providerResult;
    if (selected.operation === "store") {
      const input = request.input;
      const bytes = Object.hasOwn(input, "content") ? Buffer.from(input.content) : Buffer.from(input.contentBase64, "base64");
      const metadata = { name: input.name };
      if (input.mimeType) metadata.mimeType = input.mimeType;
      if (input.parentFolderId) metadata.parents = [input.parentFolderId];
      const boundary = `sdss-${randomBytes(12).toString("hex")}`;
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${input.mimeType ?? "application/octet-stream"}\r\nContent-Transfer-Encoding: base64\r\n\r\n`),
        Buffer.from(bytes.toString("base64")),
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);
      const result = await providerJson(`${DRIVE_UPLOAD_API}/files?uploadType=multipart&supportsAllDrives=true&fields=${encodeURIComponent(FILE_FIELDS)}`,
        { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body });
      if (result.refusal) return typedRefusal(activity, offer, capability, "google-drive-provider-refused",
        "Google Drive did not accept the fixed store operation", result.refusal, now, observations(providerRequests));
      assert(finiteString(result.value?.id, 512), "provider store result lacks a file id");
      providerResult = { operation: "store", file: normalizeFile(result.value) };
    } else if (selected.operation === "retrieve") {
      const fileId = encodeURIComponent(request.input.fileId);
      const metadata = await providerJson(`${DRIVE_API}/files/${fileId}?supportsAllDrives=true&fields=${encodeURIComponent(FILE_FIELDS)}`);
      if (metadata.refusal) return typedRefusal(activity, offer, capability, "google-drive-provider-refused",
        "Google Drive did not accept the fixed retrieve metadata operation", metadata.refusal, now, observations(providerRequests));
      const response = await boundedFetch(`${DRIVE_API}/files/${fileId}?alt=media&supportsAllDrives=true`);
      const bytes = await readBounded(response, request.maximumBytes);
      if (!response.ok) return typedRefusal(activity, offer, capability, "google-drive-provider-refused",
        "Google Drive did not accept the fixed retrieve media operation",
        { status: response.status, statusText: response.statusText, bodyDigest: `sha256:${createHash("sha256").update(bytes).digest("hex")}` },
        now, observations(providerRequests));
      providerResult = { operation: "retrieve", file: normalizeFile(metadata.value), contentBase64: bytes.toString("base64"),
        contentDigest: `sha256:${createHash("sha256").update(bytes).digest("hex")}`, byteLength: bytes.length };
    } else {
      const params = new URLSearchParams({ pageSize: String(request.input.pageSize ?? 25),
        fields: `nextPageToken,files(${FILE_FIELDS})`, supportsAllDrives: "true", includeItemsFromAllDrives: "true" });
      if (request.input.query) params.set("q", request.input.query);
      const result = await providerJson(`${DRIVE_API}/files?${params}`);
      if (result.refusal) return typedRefusal(activity, offer, capability, "google-drive-provider-refused",
        "Google Drive did not accept the fixed list operation", result.refusal, now, observations(providerRequests));
      assert(Array.isArray(result.value?.files), "provider list result lacks files");
      providerResult = { operation: "list", files: result.value.files.map(normalizeFile), nextPageAvailable: finiteString(result.value.nextPageToken, 2048) };
    }
    const product = contentRecord({
      type: "GoogleDriveUseProduct",
      contract: CONTRACT,
      disposition: "completed",
      requestDigest: offer.object.requestDigest,
      capabilityId: capability.id,
      purpose: request.purpose,
      fixedOperation: selected.operation,
      providerResult,
      externalNetworkPerformed: true,
      credentialMaterialObserved: true,
      credentialMaterialRecorded: false,
      customerMutation: false,
      customerUsefulnessClaimed: false,
      resourceObservations: observations(providerRequests),
      recordedAt: now,
    });
    return contentRecord({ type: "Accept", actor: ACTOR, target: activity.actor, inReplyTo: activity.id, object: product, recordedAt: now });
  } catch (error) {
    return typedRefusal(activity, offer, capability,
      error.code === "provider-timeout" || error.name === "AbortError" ? "google-drive-provider-timeout" : "google-drive-use-failed",
      error.code === "provider-timeout" || error.name === "AbortError" ? "the fixed provider use exceeded its wall bound" : error.message,
      { networkRequests: providerRequests }, now, observations(providerRequests));
  }
}

export async function handleGoogleDriveUseOperation(operation, input, now, options = {}) {
  const normalized = {
    fetchImpl: options.fetchImpl ?? globalThis.fetch,
    accessToken: options.accessToken,
    configuredCredentialGrantId: options.configuredCredentialGrantId,
    usedCapabilityIds: options.usedCapabilityIds ?? new Set(),
  };
  if (operation === "solicit-service") return solicit(input, now);
  if (operation === "invoke-service") return invoke(input, now, normalized);
  throw new Error(`unsupported operation ${operation}`);
}

export async function executeGoogleDriveUseOperation({ operation, input, now, dataRoot, witnessJournalAgentUrl,
  settlementRoot = ROOT, accessToken, configuredCredentialGrantId, fetchImpl }) {
  const evidence = createSettlementStore({ settlementRoot, agentUrl: witnessJournalAgentUrl });
  let result, capabilityId = null;
  try {
    capabilityId = input?.capability?.id ?? input?.object?.capability?.id ?? null;
    result = await handleGoogleDriveUseOperation(operation, input, now, {
      accessToken, configuredCredentialGrantId, fetchImpl,
      usedCapabilityIds: usedCapabilityIds(evidence),
    });
  } catch (error) {
    const object = contentRecord({ type: "GoogleDriveUseRefusal", contract: CONTRACT,
      code: "google-drive-use-contract-refused", detail: error.message, credentialMaterialRecorded: false,
      customerMutation: false, recordedAt: now });
    result = contentRecord({ type: "Reject", actor: ACTOR, target: input?.actor ?? "urn:ame:unidentified-customer",
      inReplyTo: input?.id ?? "urn:activity:unidentified", object, recordedAt: now });
  }
  await evidence.record({ category: "service-outcomes", recordedAt: now,
    record: contentRecord({ type: "GoogleDriveUseServiceOutcome", operation, requestActivity: input?.id ?? null,
      capabilityId, result, credentialMaterialRecorded: false, recordedAt: now }) });
  return result;
}

function usedCapabilityIds(evidence) {
  return new Set(evidence.records("service-outcomes")
    .map((record) => record.capabilityId)
    .filter((capabilityId) => finiteString(capabilityId, 256)));
}
