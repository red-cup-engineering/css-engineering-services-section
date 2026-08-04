import { x402Facilitator } from "@x402/core/facilitator";
import { ExactEvmScheme } from "@x402/evm/exact/facilitator";
import { BatchSettlementEvmScheme } from "@x402/evm/batch-settlement/facilitator";

function networks(value) {
  const values = Array.isArray(value) ? value : [value];
  if (values.length === 0 || values.some((item) => !/^eip155:[1-9][0-9]*$/u.test(item ?? ""))) {
    throw new TypeError("facilitator networks must be explicit EVM CAIP-2 identifiers");
  }
  return Object.freeze([...new Set(values)]);
}

function officialSigner(value) {
  const methods = ["getAddresses", "readContract", "verifyTypedData", "writeContract", "sendTransaction", "waitForTransactionReceipt", "getCode"];
  if (value === null || typeof value !== "object" || methods.some((method) => typeof value[method] !== "function")) {
    throw new TypeError("x402 facilitator signer must implement the official EVM signer interface");
  }
  const addresses = value.getAddresses();
  if (!Array.isArray(addresses) || addresses.length !== 1 || !/^0x[0-9a-fA-F]{40}$/u.test(addresses[0])) {
    throw new TypeError("x402 facilitator signer must expose exactly one settlement account");
  }
  return value;
}

/**
 * Compose the official x402 facilitator. Exact EVM settlement is the minimal
 * default; batch settlement is opt-in because it has separate receiver and
 * channel-state requirements.
 */
export function createEvmFacilitator({ network, signer, batchSettlement = false, authorizerSigner, eip6492AllowedFactories = [] }) {
  const selectedNetworks = networks(network);
  const selectedSigner = officialSigner(signer);
  const facilitator = new x402Facilitator();
  facilitator.register(selectedNetworks, new ExactEvmScheme(selectedSigner, { eip6492AllowedFactories }));
  if (batchSettlement) {
    facilitator.register(selectedNetworks, new BatchSettlementEvmScheme(selectedSigner, authorizerSigner, { eip6492AllowedFactories }));
  }
  return facilitator;
}
