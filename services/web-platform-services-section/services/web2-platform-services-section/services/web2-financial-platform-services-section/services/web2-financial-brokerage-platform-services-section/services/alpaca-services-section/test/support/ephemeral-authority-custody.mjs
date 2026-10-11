/**
 * A test-only, in-memory authority custody actuator satisfying the
 * {store, retrieve, revoke} contract that
 * @red-cup-engineering/brokerage-authority-custody-service requires of its
 * `authorityCustody` dependency. Several suites in this package used to import
 * this shape from a package that was never built
 * (`.../authority-custody-actuator`); rather than fabricate a production
 * package around a test fixture, it lives here as the ephemeral double these
 * tests actually need: no persistence, no network, deterministic references.
 */
export function createEphemeralAuthorityCustodySubstrate() {
  return new Map();
}

/**
 * @param {{substrate?: Map, clock?: () => string}} [options]
 * @returns {{store: Function, retrieve: Function, revoke: Function}}
 */
export function createAuthorityCustodyActuator({ substrate = createEphemeralAuthorityCustodySubstrate(), clock = () => new Date().toISOString() } = {}) {
  let sequence = 0;
  return Object.freeze({
    async store({ provider, subject, secret }) {
      if (typeof provider !== "string" || provider === "") throw new TypeError("authority-custody-provider-required");
      if (secret === null || typeof secret !== "object") throw new TypeError("authority-custody-secret-required");
      const storedAt = clock();
      if (!Number.isFinite(Date.parse(storedAt))) throw new TypeError("authority-custody-clock-invalid");
      sequence += 1;
      const reference = `urn:authority:${provider}:${subject}:${sequence}`;
      substrate.set(reference, Object.freeze({ ...secret, storedAt }));
      return Object.freeze({ reference, provider, secretBytesReturned: false });
    },
    async retrieve(reference) {
      const record = substrate.get(reference);
      return record ? { ...record, credential: { ...record.credential } } : null;
    },
    async revoke(reference) {
      return substrate.delete(reference);
    },
  });
}
