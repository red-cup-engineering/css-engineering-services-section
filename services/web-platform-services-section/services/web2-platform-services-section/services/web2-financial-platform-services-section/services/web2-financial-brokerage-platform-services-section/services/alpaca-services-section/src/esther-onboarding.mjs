import { createBrokerageMarketEventRecorder } from "@red-cup-engineering/brokerage-independent-witness-and-books";
import { createPrincipalOnboardingCircuit } from "@red-cup-engineering/principal-brokerage-interface/onboarding-circuit";

export const ESTHER_PRINCIPAL = "urn:principal:esther-davis";
export const ESTHER_INITIAL_POLICY = Object.freeze({ maximumLossFraction: 1, maximumOrderFraction: 1, maximumAggregateMultiple: 1,
  concentrationLimit: 1, leverageLimit: 1, shorting: false, options: false });
export const ESTHER_INITIAL_SCOPES = Object.freeze(["account:read", "activities:read", "orders:intent", "orders:paper", "orders:read", "positions:read", "strategy:obsmetrologia-paper-promotion"]);

export function estherSponsoredOnboardingInput({ validUntil }) {
  return Object.freeze({ principal: ESTHER_PRINCIPAL, venue: "alpaca-trading-paper", expectedCapital: { amount: 100, currency: "USD" },
    riskPolicy: ESTHER_INITIAL_POLICY, scopes: ESTHER_INITIAL_SCOPES, validUntil, sponsored: true });
}

export function createEstherOnboardingRuntime(env = process.env, dependencies = {}) {
  const recordEvent = dependencies.recordEvent ?? createBrokerageMarketEventRecorder({ originatingActor: "urn:ame:principal-brokerage-interface", nodeId: "principal-brokerage-interface" }, env, dependencies.recordDependencies);
  const circuit = createPrincipalOnboardingCircuit({ recordEvent, now: dependencies.now });
  return Object.freeze({ ...circuit, prepareSponsoredOffer: ({ validUntil }) => circuit.prepare(estherSponsoredOnboardingInput({ validUntil })) });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const validUntil = process.env.ESTHER_ONBOARDING_OFFER_VALID_UNTIL;
  if (!validUntil) throw new Error("ESTHER_ONBOARDING_OFFER_VALID_UNTIL is required");
  const result = await createEstherOnboardingRuntime().prepareSponsoredOffer({ validUntil });
  console.log(JSON.stringify(result, null, 2));
}
