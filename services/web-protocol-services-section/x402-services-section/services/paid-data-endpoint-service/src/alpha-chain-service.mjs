#!/usr/bin/env node

import { readFile, stat } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { x402Facilitator } from "@x402/core/facilitator";
import { parsePaymentPayload, parsePaymentRequirements } from "@x402/core/schemas";
import { x402ResourceServer } from "@x402/core/server";
import { ExactEvmScheme as FacilitatorExactEvmScheme } from "@x402/evm/exact/facilitator";
import { ExactEvmScheme as ServerExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware } from "@x402/express";
import { Wallet } from "ethers";
import express from "express";
import {
  concat,
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeFunctionData,
  getAddress,
  http,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { canonicalEavtDatomJsonl, EAVT_DATOM_JSONL_MEDIA_TYPE } from "./eavt-datom-carrier.mjs";

export { canonicalEavtDatomJsonl, EAVT_DATOM_JSONL_MEDIA_TYPE } from "./eavt-datom-carrier.mjs";

export const ALPHA_NETWORK = "eip155:5615610";
export const ALPHA_CHAIN_ID = 5_615_610;
export const TOKEN_NAME = "Union Integration Credit";
export const TOKEN_VERSION = "1";

const RESOURCE_ABI = parseAbi([
  "function describe(string[] resource) view returns ((bytes32 sha256Digest,address controller,uint64 version,bool externalBody,string mediaType,string body,string locator))",
  "function publishInline(string[] resource,string mediaType,string body) payable returns (bytes32 key,bytes32 digest,uint64 version)",
  "function writePrice() view returns (uint256)",
]);
const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

function required(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

function address(value, name) {
  try { return getAddress(required(value, name)); }
  catch (error) { throw new TypeError(`${name} must be an EVM address`, { cause: error }); }
}

async function privateText(path, name) {
  const selected = required(path, name);
  const metadata = await stat(selected);
  if (!metadata.isFile() || (metadata.mode & 0o077) !== 0) {
    throw new TypeError(`${name} must be one private regular file`);
  }
  return readFile(selected, "utf8");
}

export function marketResource(value) {
  const parts = Array.isArray(value) ? value : String(value ?? "").split("/").filter(Boolean);
  if (parts.length === 0 || parts.length > 8 || parts.some((part) => !SEGMENT.test(part))) {
    throw new TypeError("resource must contain 1-8 bounded portable path segments");
  }
  return ["paid-data", ...parts];
}

export async function loadAlphaAccount({ keystorePath, passwordPath }) {
  const [keystore, password] = await Promise.all([
    privateText(keystorePath, "EVM keystore"),
    privateText(passwordPath, "EVM keystore password"),
  ]);
  const wallet = await Wallet.fromEncryptedJson(keystore, password.trim());
  return privateKeyToAccount(wallet.privateKey);
}

export function createAlphaClients({ rpcUrl, account }) {
  const chain = defineChain({
    id: ALPHA_CHAIN_ID,
    name: "Union Alpha Chain",
    nativeCurrency: { name: "Alpha Ether", symbol: "AETH", decimals: 18 },
    rpcUrls: { default: { http: [required(rpcUrl, "EVM RPC URL")] } },
  });
  const transport = http(rpcUrl);
  const publicClient = createPublicClient({ chain, transport });
  const walletClient = createWalletClient({ account, chain, transport });
  return Object.freeze({ chain, publicClient, walletClient });
}

export function createAlphaFacilitatorSigner({ account, publicClient, walletClient }) {
  return Object.freeze({
    getAddresses: () => [account.address],
    readContract: (args) => publicClient.readContract(args),
    verifyTypedData: (args) => publicClient.verifyTypedData(args),
    getCode: (args) => publicClient.getCode(args),
    waitForTransactionReceipt: (args) => publicClient.waitForTransactionReceipt(args),
    sendTransaction: (args) => walletClient.sendTransaction({ account, ...args }),
    writeContract: ({ dataSuffix, ...args }) => dataSuffix
      ? walletClient.sendTransaction({
          account,
          to: args.address,
          data: concat([encodeFunctionData(args), dataSuffix]),
        })
      : walletClient.writeContract({ account, ...args }),
  });
}

export function createOnchainDataClient({ contractAddress, account, publicClient, walletClient }) {
  const contract = address(contractAddress, "ERC-5219 contract address");
  let serial = Promise.resolve();
  async function read(resource) {
    const described = await publicClient.readContract({
      address: contract,
      abi: RESOURCE_ABI,
      functionName: "describe",
      args: [marketResource(resource)],
    });
    if (/^0x0{64}$/u.test(described.sha256Digest)) return undefined;
    return Object.freeze({
      resource: marketResource(resource),
      digest: described.sha256Digest,
      controller: described.controller,
      version: Number(described.version),
      externalBody: described.externalBody,
      mediaType: described.mediaType,
      body: described.body,
      locator: described.locator,
    });
  }
  function write({ resource, mediaType, body }) {
    const operation = async () => {
      const carrier = canonicalEavtDatomJsonl({ mediaType, body });
      const content = carrier.body;
      if (Buffer.byteLength(content) > 16_384) throw new RangeError("inline chain body exceeds 16384 bytes");
      const price = await publicClient.readContract({ address: contract, abi: RESOURCE_ABI, functionName: "writePrice" });
      const hash = await walletClient.writeContract({
        account,
        address: contract,
        abi: RESOURCE_ABI,
        functionName: "publishInline",
        args: [marketResource(resource), carrier.mediaType, content],
        value: price,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("ERC-5219 write failed");
      const stored = await read(resource);
      return Object.freeze({ transaction: hash, blockNumber: Number(receipt.blockNumber), stored });
    };
    const result = serial.then(operation, operation);
    serial = result.then(() => undefined, () => undefined);
    return result;
  }
  return Object.freeze({ read, write });
}

function paymentTerms({ amount, asset, payTo }) {
  if (!/^[1-9][0-9]*$/u.test(amount ?? "")) throw new TypeError("x402 amount must be positive atomic units");
  return Object.freeze({
    scheme: "exact",
    network: ALPHA_NETWORK,
    price: {
      amount,
      asset: address(asset, "x402 asset"),
      extra: { name: TOKEN_NAME, version: TOKEN_VERSION },
    },
    payTo: address(payTo, "x402 payee"),
  });
}

export function createAlphaDataMarket({ account, publicClient, walletClient, resourceContract, token, payTo, writeAmount = "1000", readAmount = "100" }) {
  const signer = createAlphaFacilitatorSigner({ account, publicClient, walletClient });
  const facilitator = new x402Facilitator().register(
    [ALPHA_NETWORK],
    new FacilitatorExactEvmScheme(signer),
  );
  const resourceServer = new x402ResourceServer(facilitator).register(ALPHA_NETWORK, new ServerExactEvmScheme());
  const writeTerms = paymentTerms({ amount: writeAmount, asset: token, payTo });
  const readTerms = paymentTerms({ amount: readAmount, asset: token, payTo });
  const protect = paymentMiddleware({
    "POST /x402/data/write": { accepts: [writeTerms], description: "Write one canonical EAVT Datom JSONL/RDF ERC-5219 resource" },
    "GET /x402/data/read": { accepts: [readTerms], description: "Read one ERC-5219 resource" },
  }, resourceServer);
  const data = createOnchainDataClient({ contractAddress: resourceContract, account, publicClient, walletClient });
  const app = express();
  app.set("trust proxy", "loopback");
  app.use(express.json({ limit: "24kb" }));
  app.get("/healthz", (_request, response) => response.json({ ok: true, network: ALPHA_NETWORK, account: account.address }));
  app.get("/x402/facilitator/supported", (_request, response) => response.json(facilitator.getSupported()));
  for (const [route, operation] of [["/x402/facilitator/verify", "verify"], ["/x402/facilitator/settle", "settle"]]) {
    app.post(route, async (request, response) => {
      try {
        if (request.body?.x402Version !== 2) throw new Error("only x402 v2 is admitted");
        const payload = parsePaymentPayload(request.body.paymentPayload);
        const requirements = parsePaymentRequirements(request.body.paymentRequirements);
        response.json(await facilitator[operation](payload, requirements));
      } catch (error) {
        response.status(400).json({ error: error instanceof Error ? error.message : String(error) });
      }
    });
  }
  app.get("/x402/data/offer", (_request, response) => response.json({
    type: "UnionAlphaPaidDataOffer",
    network: ALPHA_NETWORK,
    asset: token,
    payTo,
    operations: { write: writeTerms, read: readTerms },
    storage: { standard: "ERC-5219", contract: resourceContract, inlineLimit: 16_384, mediaType: EAVT_DATOM_JSONL_MEDIA_TYPE, carrier: "EAVT-Datom JSONL/RDF" },
  }));
  app.post("/x402/data/write", protect, async (request, response) => {
    try { response.status(201).json({ ok: true, result: await data.write(request.body) }); }
    catch (error) { response.status(400).json({ ok: false, error: error instanceof Error ? error.message : String(error) }); }
  });
  app.get("/x402/data/read", protect, async (request, response) => {
    try {
      const result = await data.read(request.query.resource);
      if (result === undefined) response.status(404).json({ ok: false, error: "resource not found" });
      else response.json({ ok: true, result });
    } catch (error) { response.status(400).json({ ok: false, error: error instanceof Error ? error.message : String(error) }); }
  });
  return Object.freeze({ app, facilitator, resourceServer, signer, data, account: account.address });
}

async function main() {
  const rpcUrl = required(process.env.EVM_RPC_URL, "EVM_RPC_URL");
  const account = await loadAlphaAccount({
    keystorePath: required(process.env.EVM_KEYSTORE_PATH, "EVM_KEYSTORE_PATH"),
    passwordPath: required(process.env.EVM_KEYSTORE_PASSWORD_PATH, "EVM_KEYSTORE_PASSWORD_PATH"),
  });
  const clients = createAlphaClients({ rpcUrl, account });
  const market = createAlphaDataMarket({
    account,
    ...clients,
    resourceContract: required(process.env.ONCHAIN_RESOURCE_CONTRACT, "ONCHAIN_RESOURCE_CONTRACT"),
    token: required(process.env.X402_ASSET, "X402_ASSET"),
    payTo: process.env.X402_PAY_TO ?? account.address,
    writeAmount: process.env.X402_WRITE_AMOUNT ?? "1000",
    readAmount: process.env.X402_READ_AMOUNT ?? "100",
  });
  const host = process.env.HOST ?? "127.0.0.1";
  const port = Number(process.env.PORT ?? 15626);
  market.app.listen(port, host, () => process.stdout.write(`${JSON.stringify({ type: "UnionAlphaDataMarketListening", host, port, network: ALPHA_NETWORK, account: account.address })}\n`));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
