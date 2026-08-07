import assert from "node:assert/strict";
import test from "node:test";

import { createEvmFacilitator } from "../src/facilitator.mjs";

const ADDRESS = "0x0000000000000000000000000000000000000001";
const signer = {
  getAddresses: () => [ADDRESS],
  async readContract() { throw new Error("not exercised"); },
  async verifyTypedData() { throw new Error("not exercised"); },
  async writeContract() { throw new Error("not exercised"); },
  async sendTransaction() { throw new Error("not exercised"); },
  async waitForTransactionReceipt() { throw new Error("not exercised"); },
  async getCode() { throw new Error("not exercised"); },
};

test("facilitator advertises only official exact v2 by default", () => {
  const supported = createEvmFacilitator({ network: "eip155:84532", signer }).getSupported();
  assert.deepEqual(supported.kinds.map(({ x402Version, scheme, network }) => ({ x402Version, scheme, network })), [
    { x402Version: 2, scheme: "exact", network: "eip155:84532" },
  ]);
});

test("batch settlement is an explicit separately configured capability", () => {
  const supported = createEvmFacilitator({ network: "eip155:84532", signer, batchSettlement: true }).getSupported();
  assert.deepEqual(supported.kinds.map(({ scheme }) => scheme), ["exact", "batch-settlement"]);
});

test("facilitator rejects a partial nonstandard signer", () => {
  assert.throws(() => createEvmFacilitator({ network: "eip155:84532", signer: { getAddresses: () => [ADDRESS] } }), /official EVM signer/u);
});
