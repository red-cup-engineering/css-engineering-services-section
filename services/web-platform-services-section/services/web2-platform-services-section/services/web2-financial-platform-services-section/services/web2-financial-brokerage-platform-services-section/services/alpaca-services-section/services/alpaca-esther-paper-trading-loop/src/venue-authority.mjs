import { createBrokerageAuthorityCustody } from "@red-cup-engineering/brokerage-authority-custody-service";
import { createBrokerageOutcomeWitnessRecorder } from "@red-cup-engineering/brokerage-independent-witness-and-books";
import { createAlpacaAdapter } from "@red-cup-engineering/pluggable-venue-adapter-service/alpaca";

/**
 * Wraps a raw `fetch`-shaped transport in the plain
 * `{status, headers, body}` shape `createBrokerageAuthorityCustody`'s
 * `transport` expects, matching the house pattern (same shape as the
 * production Alpaca adapter composition elsewhere in this section).
 * @param {typeof fetch} fetchImpl
 * @returns {(request: {method: string, url: string, headers: object, body?: object}) => Promise<{status: number, headers: object, body: object|null}>}
 */
function safeTransport(fetchImpl) {
  return async ({ method, url, headers, body }) => {
    const response = await fetchImpl(url, {
      method,
      headers: body === undefined ? headers : { ...headers, "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const raw = response.status === 204 ? "" : await response.text();
    let parsed = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        throw new TypeError(`alpaca-json-response-required:${error.message}`);
      }
    }
    return { status: response.status, headers: { "x-request-id": response.headers?.get?.("x-request-id") ?? null }, body: parsed };
  };
}

const required = (value, label) => {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label}-required`);
  return value.trim();
};

/**
 * Composes `pluggable-venue-adapter-service` (the venue adapter),
 * `brokerage-authority-custody-service` (credential custody bound to one
 * exact `contract`/`authorityGrant` pair, and
 * `brokerage-independent-witness-and-books` (the recordable outcome
 * witness) into one bound-to-this-cycle authority, following the same
 * composition already proven in this section's own
 * `alpaca-engineering-services-section/src/alpaca-production-adapter.mjs`
 * (a private, unpublished app package this loop cannot depend on, so the
 * composition is repeated here rather than imported).
 * @param {object} params
 * @param {"paper"|"live"} params.mode Explicit Alpaca trading environment.
 * @param {string} params.key Alpaca API key id for that environment.
 * @param {string} params.secret Alpaca API secret for that environment.
 * @param {string} params.principal
 * @param {string} params.accountReference
 * @param {Readonly<object>} params.contract A `PrincipalBrokerageServiceContract` bound to the selected Alpaca venue.
 * @param {Readonly<object>} params.authorityGrant A `RevocableBrokerageAuthorityGrant` bound to `contract`.
 * @param {string} params.booksDataRoot Directory `brokerage-independent-witness-and-books` journals into.
 * @param {typeof fetch} [params.fetchImpl]
 * @param {() => string} [params.clock]
 * @returns {{adapter: object, registerExecutionRecords: (records: object) => void, recordOutcomeWitness: (input: object) => Promise<object>}}
 * @throws {TypeError} when a required field is missing or the contract/grant are not bound to the selected venue.
 */
export function createAlpacaVenueAuthority({ mode, key, secret, principal, accountReference, contract, authorityGrant, booksDataRoot, fetchImpl = fetch, clock = () => new Date().toISOString() }) {
  if (!["paper", "live"].includes(mode)) throw new TypeError("alpaca-trading-mode-required");
  required(key, `alpaca-${mode}-key`);
  required(secret, `alpaca-${mode}-secret`);
  required(principal, "principal");
  required(accountReference, "account-reference");
  required(booksDataRoot, "books-data-root");
  const venue = `alpaca-trading-${mode}`;
  if (contract?.type !== "PrincipalBrokerageServiceContract" || contract.venue !== venue) throw new TypeError(`${mode}-contract-required`);
  if (authorityGrant?.type !== "RevocableBrokerageAuthorityGrant" || authorityGrant.venue !== venue || authorityGrant.adapter !== venue || authorityGrant.principalContract !== contract.id) throw new TypeError(`${mode}-authority-grant-required`);

  const credentialRecord = Object.freeze({ kind: mode === "live" ? "alpaca-trading-api-key-live" : "alpaca-trading-api-key", environment: mode, venue, principal, accountReference, credential: Object.freeze({ apiKeyId: key, apiSecret: secret }) });
  const authorityCustody = Object.freeze({
    async store() { throw new TypeError("runtime-credential-store-refused"); },
    async retrieve(reference) { return reference === authorityGrant.credentialReference ? credentialRecord : undefined; },
    async revoke() { throw new TypeError("runtime-credential-revoke-refused"); },
  });
  const executionRecords = new Map();
  const resolveAuthorityGrant = async (reference) => (reference === authorityGrant.id ? authorityGrant : undefined);
  const resolveOperationAuthorization = async (reference) => executionRecords.get(reference);
  const transport = safeTransport(fetchImpl);
  const custody = createBrokerageAuthorityCustody({
    authorityCustody,
    transport,
    resolveAuthorityGrant,
    resolvePaperOperationAuthorization: resolveOperationAuthorization,
    resolveLiveOperationAuthorization: resolveOperationAuthorization,
    clock,
  });
  const adapter = createAlpacaAdapter({ product: venue, baseUrl: mode === "live" ? "https://api.alpaca.markets/" : "https://paper-api.alpaca.markets/", authorityClient: custody });
  const recordOutcomeWitness = createBrokerageOutcomeWitnessRecorder({ BROKERAGE_BOOKS_DATA_ROOT: booksDataRoot }, { now: clock });

  return Object.freeze({
    adapter,
    // The legacy loop keeps this narrowly-scoped, in-memory key custody for
    // an operator-owned credential.  Its execution now composes through the
    // section-level principal system rather than a leaf-local provider.
    authorityCustody,
    transport,
    resolveAuthorityGrant,
    registerExecutionRecords(records) {
      executionRecords.set(records.intent.id, records);
    },
    recordOutcomeWitness,
  });
}

/** @deprecated Use `createAlpacaVenueAuthority({ mode: "paper", ... })`. */
export function createPaperVenueAuthority(params) {
  return createAlpacaVenueAuthority({ ...params, mode: "paper" });
}
