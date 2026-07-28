#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { contentRecord, digest } from "../../../lib/canonical.mjs";
import { ACTOR, executeGoogleDriveUseOperation } from "../src/contract-google-drive-use.mjs";
import { obtainGoogleAccessToken } from "../src/google-oauth-refresh.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const has = (flag) => args.includes(flag);
const required = (flag) => {
  const found = value(flag);
  if (!found) throw new Error(`${flag} is required`);
  return found;
};

function requestInput(purpose) {
  if (purpose === "list") {
    const input = {};
    if (value("--query")) input.query = value("--query");
    if (value("--page-size")) input.pageSize = Number(value("--page-size"));
    return { purpose: "list Google Drive files", input };
  }
  if (purpose === "retrieve") return {
    purpose: "retrieve one file from Google Drive",
    input: { fileId: required("--file-id") },
  };
  if (purpose === "store") {
    const contentPath = resolve(required("--content-file"));
    const input = { name: required("--name"), contentBase64: readFileSync(contentPath).toString("base64") };
    if (value("--mime-type")) input.mimeType = value("--mime-type");
    if (value("--parent-folder-id")) input.parentFolderId = value("--parent-folder-id");
    return { purpose: "store one new file in Google Drive", input };
  }
  throw new Error("--purpose must be list, retrieve, or store");
}

async function main() {
  const now = new Date().toISOString();
  const customer = required("--customer");
  const credentialGrantId = required("--credential-grant-id");
  const executionMode = has("--live") ? "live" : "dry-run";
  const selected = requestInput(required("--purpose"));
  const request = {
    type: "GoogleDriveUseRequest",
    purpose: selected.purpose,
    executionMode,
    credentialGrantId,
    maximumWallMilliseconds: Number(value("--maximum-wall-ms") ?? 30000),
    maximumBytes: Number(value("--maximum-bytes") ?? 1048576),
    input: selected.input,
  };
  const sourceActivity = contentRecord({ type: "Create", actor: customer, target: ACTOR, object: request, recordedAt: now });
  const solicitation = contentRecord({ type: "Offer", actor: customer, target: ACTOR,
    object: contentRecord({ type: "ServiceSolicitation", contract: "ni:///sha-256;j88skmtaZYqLQVHaJjd5bwYiTzwUYneGtgd4NlFrio4", sourceActivity, recordedAt: now }),
    recordedAt: now });
  const childDataRoot = resolve(process.env.GOOGLE_DRIVE_USE_DATA_ROOT ?? join(ROOT, "data"));
  const offer = await executeGoogleDriveUseOperation({ operation: "solicit-service", input: solicitation, now, dataRoot: childDataRoot });
  if (offer.type === "Reject") return offer;
  const capability = contentRecord({ type: "PurposeBoundCapability", issuer: customer, holder: ACTOR,
    invocationTarget: ACTOR, requestDigest: offer.object.requestDigest, providerOfferDigest: digest(offer),
    credentialGrantId, effects: offer.object.effects, singleUse: true,
    expiresAt: new Date(Date.parse(now) + request.maximumWallMilliseconds + 60000).toISOString() });
  const invocation = contentRecord({ type: "Accept", actor: customer, target: ACTOR, object: offer, capability, recordedAt: now });
  let accessToken;
  if (executionMode === "live") {
    if (process.env.GOOGLE_DRIVE_CREDENTIAL_GRANT_ID !== credentialGrantId) {
      throw new Error("GOOGLE_DRIVE_CREDENTIAL_GRANT_ID must match --credential-grant-id before credential use");
    }
    const credential = await obtainGoogleAccessToken({
      accessToken: process.env.GOOGLE_DRIVE_ACCESS_TOKEN ?? process.env.GOOGLE_OAUTH_ACCESS_TOKEN ?? process.env.DRIVE_ACCESS_TOKEN,
      clientId: process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN,
      maximumWallMilliseconds: request.maximumWallMilliseconds,
    });
    accessToken = credential.accessToken;
  }
  return executeGoogleDriveUseOperation({ operation: "invoke-service", input: invocation, now, dataRoot: childDataRoot,
    accessToken,
    configuredCredentialGrantId: process.env.GOOGLE_DRIVE_CREDENTIAL_GRANT_ID });
}

try {
  const result = await main();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.type === "Reject") process.exitCode = 2;
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 2;
}
