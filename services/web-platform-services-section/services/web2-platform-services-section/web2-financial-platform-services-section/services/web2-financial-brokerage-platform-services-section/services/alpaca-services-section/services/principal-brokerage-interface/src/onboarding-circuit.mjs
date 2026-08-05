import { acceptPrincipalOnboardingOffer, formPrincipalOnboardingOffer, formPrincipalPaperAccountObservationAuthorization, grantBrokerageAuthority, revokeBrokerageAuthority, revokePrincipalPaperAccountObservationAuthorization } from "./principal-contract.mjs";

export const PRINCIPAL_INTERFACE_ACTOR = "urn:ame:principal-brokerage-interface";
export const INDEPENDENT_BOOKS_ACTOR = "urn:ame:brokerage-independent-witness-and-books";
const time = (value, label) => { if (!Number.isFinite(Date.parse(value))) throw new TypeError(`${label}-required`); return value; };

export function createPrincipalOnboardingCircuit({ recordEvent, now = () => new Date().toISOString() }) {
  if (typeof recordEvent !== "function" || recordEvent.originatingActor !== PRINCIPAL_INTERFACE_ACTOR || recordEvent.witnessActor !== INDEPENDENT_BOOKS_ACTOR) throw new TypeError("principal-onboarding-independent-recorder-contract-required");
  const record = async (type, value) => { const recordedAt = time(now(), "onboarding-record-time"), receipt = await recordEvent({ type, value, recordedAt });
    if (!receipt?.id && !receipt?.graph && !receipt?.recordReceipt) throw new TypeError("principal-onboarding-record-receipt-required"); return Object.freeze({ value, recordReceipt: receipt }); };
  return Object.freeze({
    async prepare(input) { return record("principal-brokerage-onboarding-offer-formed", formPrincipalOnboardingOffer(input)); },
    async accept(input) { return record("principal-brokerage-onboarding-offer-accepted", acceptPrincipalOnboardingOffer(input)); },
    async authorizePaperObservation(input) { return record("principal-paper-account-observation-authorized", formPrincipalPaperAccountObservationAuthorization({ ...input, now: input.now ?? now() })); },
    async revokePaperObservation({ authorization, reason, revokedAt = now() }) { return record("principal-paper-account-observation-revoked", revokePrincipalPaperAccountObservationAuthorization(authorization, time(revokedAt, "revocation-time"), reason)); },
    async grant(input) { return record("principal-brokerage-authority-granted", grantBrokerageAuthority(input)); },
    async revoke({ grant, reason, revokedAt = now() }) { return record("principal-brokerage-authority-revoked", revokeBrokerageAuthority(grant, time(revokedAt, "revocation-time"), reason)); },
  });
}
