import { createHash } from "node:crypto";

import {
  agentCardSignatureEvidence,
  discoverSignedAgentCard,
} from "@red-cup-engineering/a2a-agent-card-discovery-service";

import { observeX402Resource, publicHttpsUrl } from "./resource-observation.mjs";

const PROFILE = "org.emsenn.x402.public-service-market-listing.v1";
const SOVEREIGN_PROFILE = "org.emsenn.rmn.sovereign-circuit-interface.v1";
const AGENT_CARD_SUFFIX = "/.well-known/agent-card.json";
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/u;
const EVM_NETWORK = /^eip155:[1-9][0-9]*$/u;
const NI_SHA256 = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const MAX_A2A_DISCOVERY_BYTES = 1_048_576;

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function digest(value) {
  return `ni:///sha-256;${createHash("sha256").update(JSON.stringify(stableValue(value))).digest("base64url")}`;
}

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

async function boundedA2aFetch(fetchImpl, url, init) {
  const response = await fetchImpl(url, { ...init, redirect: "manual" });
  if (response.redirected || (response.status >= 300 && response.status < 400)) {
    throw new Error("market Agent Card discovery refuses redirects");
  }
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null && (!/^(?:0|[1-9][0-9]*)$/u.test(declaredLength)
    || BigInt(declaredLength) > BigInt(MAX_A2A_DISCOVERY_BYTES))) {
    throw new Error("market Agent Card discovery response exceeds its byte bound");
  }
  if (response.body === null) return response;
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_A2A_DISCOVERY_BYTES) {
      await reader.cancel();
      throw new Error("market Agent Card discovery response exceeds its byte bound");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Response(bytes, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function boundedString(value, label, maximum = 256) {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum) {
    throw new TypeError(`${label} must be one non-empty bounded string`);
  }
  return value;
}

function normalizedAddress(value, label) {
  if (typeof value !== "string" || !EVM_ADDRESS.test(value)) {
    throw new TypeError(`${label} must be one public EVM address`);
  }
  return value.toLowerCase();
}

function sellerPolicy(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("sellerPolicy must be one exact EVM settlement policy");
  }
  if (!EVM_NETWORK.test(value.network)) throw new TypeError("sellerPolicy.network must be one EVM CAIP-2 network");
  const asset = value.asset === "native" ? "native" : normalizedAddress(value.asset, "sellerPolicy.asset");
  return Object.freeze({
    payTo: normalizedAddress(value.payTo, "sellerPolicy.payTo"),
    network: value.network,
    asset,
  });
}

function agentCardUrl(value) {
  const normalized = publicHttpsUrl(value, "agentCardUrl");
  const url = new URL(normalized);
  if (!url.pathname.endsWith(AGENT_CARD_SUFFIX) || url.search !== "") {
    throw new TypeError(`agentCardUrl must name the standard ${AGENT_CARD_SUFFIX} resource without a query`);
  }
  return normalized;
}

function selectedSkill(card, expectedSkillId) {
  const matches = (card.skills ?? []).filter((skill) => skill?.id === expectedSkillId);
  if (matches.length !== 1) throw new Error("signed Agent Card must expose exactly one matching skill id");
  return matches[0];
}

function selectedLaw(card, expectedLaw) {
  const extensions = card.capabilities?.extensions ?? [];
  const sovereign = extensions.filter((extension) => extension?.params?.profile === SOVEREIGN_PROFILE);
  if (sovereign.length !== 1) throw new Error("signed Agent Card must expose exactly one sovereign circuit extension");
  const law = sovereign[0]?.params?.component?.law;
  if (law !== expectedLaw) throw new Error("signed Agent Card sovereign circuit law does not match the expected law");
  return law;
}

function publicInterfaces(card) {
  const interfaces = card.supportedInterfaces ?? [];
  if (interfaces.length === 0) throw new Error("signed Agent Card exposes no interface");
  return interfaces.map((face, index) => Object.freeze({
    url: publicHttpsUrl(face?.url, `signed Agent Card interface[${index}].url`),
    protocolBinding: boundedString(face?.protocolBinding, `signed Agent Card interface[${index}].protocolBinding`, 32),
    protocolVersion: boundedString(face?.protocolVersion, `signed Agent Card interface[${index}].protocolVersion`, 16),
  }));
}

function routeTemplateMatches(resourceUrl, routeTemplate) {
  if (routeTemplate === undefined) return true;
  const path = new URL(resourceUrl).pathname;
  const actual = path.split("/");
  const declared = routeTemplate.split("/");
  if (actual.length !== declared.length) return false;
  return declared.every((part, index) => {
    if (/^:[A-Za-z_][A-Za-z0-9_]*$/u.test(part)) return actual[index].length > 0;
    return part === actual[index];
  });
}

function selectedAcceptance(accepts, policy) {
  const matches = accepts.filter((entry) => entry.payTo.toLowerCase() === policy.payTo
    && entry.network === policy.network
    && (entry.asset === "native" ? "native" : entry.asset.toLowerCase()) === policy.asset);
  if (matches.length !== 1) throw new Error("x402 challenge must expose exactly one payment alternative matching sellerPolicy");
  return matches[0];
}

/**
 * Observe and admit one public x402 service listing. This circuit only reads
 * public identity and payment-challenge material; it never pays or calls the
 * protected service.
 */
export async function observePublicServiceMarketListing({
  agentCardUrl: rawAgentCardUrl,
  resourceUrl: rawResourceUrl,
  method = "GET",
  expectedSkillId,
  expectedLaw,
  sellerPolicy: rawSellerPolicy,
  fetchImpl = globalThis.fetch,
  timeoutMs = 10_000,
  signal,
} = {}) {
  const cardUrl = agentCardUrl(rawAgentCardUrl);
  const resourceUrl = publicHttpsUrl(rawResourceUrl, "resourceUrl");
  const skillId = boundedString(expectedSkillId, "expectedSkillId");
  if (typeof expectedLaw !== "string" || !NI_SHA256.test(expectedLaw)) {
    throw new TypeError("expectedLaw must be one sha-256 ni URI");
  }
  const policy = sellerPolicy(rawSellerPolicy);
  if (typeof fetchImpl !== "function") throw new TypeError("market observation requires one fetch implementation");
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 250 || timeoutMs > 30_000) {
    throw new TypeError("market observation timeoutMs must be an integer from 250 through 30000");
  }
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const requestSignal = signal === undefined ? timeoutSignal : AbortSignal.any([signal, timeoutSignal]);

  const card = await discoverSignedAgentCard({
    agentUrl: cardUrl,
    fetch: (url, init) => boundedA2aFetch(fetchImpl, url, init),
    signal: requestSignal,
  });
  const skill = selectedSkill(card, skillId);
  const law = selectedLaw(card, expectedLaw);
  const interfaces = publicInterfaces(card);
  const signature = agentCardSignatureEvidence(card);
  const x402 = await observeX402Resource({
    resourceUrl,
    method,
    fetchImpl,
    timeoutMs,
    signal: requestSignal,
  });
  if (!x402.bazaar.present) throw new Error("x402 challenge must expose a valid Bazaar extension");
  if (x402.catalogResource.url !== resourceUrl) throw new Error("x402 catalog resource URL drifted from the observed resource");
  if (!routeTemplateMatches(resourceUrl, x402.bazaar.routeTemplate)) {
    throw new Error("x402 Bazaar routeTemplate does not match the observed resource path");
  }
  const acceptance = selectedAcceptance(x402.paymentRequired.accepts, policy);

  const listing = stableValue({
    profile: PROFILE,
    agent: {
      agentCardUrl: cardUrl,
      cardDigest: signature.card,
      name: boundedString(card.name, "signed Agent Card name"),
      version: boundedString(card.version, "signed Agent Card version", 64),
      interfaces,
      skill: {
        id: skillId,
        name: boundedString(skill.name, "signed Agent Card skill name"),
      },
      law,
    },
    service: {
      resourceUrl,
      method: x402.method,
      catalogResource: x402.catalogResource,
      bazaar: x402.bazaar,
      acceptance,
    },
    sellerPolicy: policy,
    evidence: {
      agentCardSignature: signature,
      x402Observation: x402.observationDigest,
    },
    verification: {
      agentCardSignature: "verified",
      x402Challenge: "validated",
      x402SignedOffers: "not-performed",
    },
    authority: {
      publicReadOnly: true,
      paymentAttempted: false,
      signingAttempted: false,
      settlementAttempted: false,
      deploymentAttempted: false,
      protectedResourceConsumed: false,
    },
  });
  return deepFreeze({ ...listing, listingDigest: digest(listing) });
}
