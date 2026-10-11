import { createBrokerageMarketEventRecorder, createBrokerageOutcomeWitnessRecorder } from "@red-cup-engineering/brokerage-independent-witness-and-books";
import { startVirtualsBrokerageRuntime } from "@red-cup-engineering/virtuals-brokerage-products-border/lite-runtime";
import { createBrokerageProductProviders, indexBrokerageProvidersByService } from "./market-runtime.mjs";

const required = (env, name) => { const value = env[name]; if (typeof value !== "string" || value.trim() === "") throw new Error(`${name} is required`); return value; };
export async function createFederationVirtualsRuntime(env = process.env, dependencies = {}) {
  const products = dependencies.providers ?? createBrokerageProductProviders({ alpacaRead: dependencies.alpacaRead, alpacaReadPreflight: dependencies.alpacaReadPreflight,
    resolveExecutionRecords: dependencies.resolveExecutionRecords, executionAdapter: dependencies.executionAdapter, executionClock: dependencies.executionClock });
  const providers = indexBrokerageProvidersByService(products);
  const recordDelivery = dependencies.recordDelivery ?? createBrokerageOutcomeWitnessRecorder(env);
  const onEvent = dependencies.onEvent ?? createBrokerageMarketEventRecorder({ originatingActor: "urn:ame:virtuals-brokerage-products-border", nodeId: "virtuals-brokerage-products-border" }, env);
  return startVirtualsBrokerageRuntime({ apiKey: required(env, "VIRTUALS_LITE_API_KEY"), operatorName: required(env, "BROKERAGE_VIRTUALS_OPERATOR_NAME"),
    operatorWallet: required(env, "BROKERAGE_VIRTUALS_OPERATOR_WALLET"), stateRoot: required(env, "BROKERAGE_VIRTUALS_STATE_ROOT"), providers, recordDelivery, onEvent,
    fetchImpl: dependencies.fetchImpl ?? fetch, ioFactory: dependencies.ioFactory });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await createFederationVirtualsRuntime();
  console.log("brokerage-control Virtuals runtime connected");
}
