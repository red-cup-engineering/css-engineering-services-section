import { createHash } from "node:crypto";
import {
  createR2RestClient,
  r2RestConfiguration,
} from "@red-cup-engineering/resource-brokerage-service-section/src/r2-rest.js";

const SHA256 = /^0x[a-f0-9]{64}$/u;
const PREFIX = "activitypub-services-section/onchain-data-resource-service/external-bodies/sha256";

function digestBytes(bytes) {
  return `0x${createHash("sha256").update(bytes).digest("hex")}`;
}

function objectKey(digest) {
  if (!SHA256.test(digest ?? "")) throw new TypeError("external body requires one lowercase bytes32 SHA-256 digest");
  return `${PREFIX}/${digest.slice(2)}`;
}

function locatorFor(configuration, key) {
  return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(configuration.accountId)}/r2/buckets/${encodeURIComponent(configuration.bucket)}/objects/${encodeURIComponent(key)}`;
}

function keyFromLocator(configuration, locator) {
  const prefix = locatorFor(configuration, "");
  if (typeof locator !== "string" || !locator.startsWith(prefix)) {
    throw new TypeError("external body locator is outside the configured R2 custody boundary");
  }
  const encoded = locator.slice(prefix.length);
  if (encoded === "") throw new TypeError("external body locator names no R2 object");
  let key;
  try { key = decodeURIComponent(encoded); }
  catch { throw new TypeError("external body locator has invalid URL encoding"); }
  if (encodeURIComponent(key) !== encoded || !key.startsWith(`${PREFIX}/`)) {
    throw new TypeError("external body locator is not one canonical ActivityPub custody path");
  }
  return key;
}

export function createR2OnchainExternalBodyStore(configuration = r2RestConfiguration(), options = {}) {
  const client = options.client ?? createR2RestClient(configuration);
  return Object.freeze({
    async put({ body, digest, mediaType }) {
      const bytes = Buffer.from(body ?? []);
      if (digestBytes(bytes) !== digest) throw new Error("external body bytes do not match their proposed onchain digest");
      const key = objectKey(digest);
      const existing = await client.get(key);
      if (existing === null) {
        await client.putCurrent(key, { body: bytes, mediaType });
      } else if (!Buffer.from(existing.body).equals(bytes)) {
        throw new Error("content-addressed R2 external body differs from the proposed bytes");
      }
      const observed = await client.get(key);
      if (observed === null || !Buffer.from(observed.body).equals(bytes)) {
        throw new Error("R2 external body read-back differs from the proposed bytes");
      }
      return Object.freeze({ locator: locatorFor(configuration, key) });
    },
    async get({ locator, digest }) {
      const key = keyFromLocator(configuration, locator);
      if (key !== objectKey(digest)) throw new Error("external body locator path does not match its onchain digest");
      const observed = await client.get(key);
      if (observed === null) throw new Error("onchain external body is absent from R2 custody");
      const body = Buffer.from(observed.body);
      if (digestBytes(body) !== digest) throw new Error("R2 external body does not match its onchain digest");
      return Object.freeze({ body });
    },
  });
}

export const internals = Object.freeze({ PREFIX, digestBytes, keyFromLocator, locatorFor, objectKey });
