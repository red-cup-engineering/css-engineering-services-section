import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { Contract, JsonRpcProvider, Wallet, getAddress } from "ethers";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ABI = [
  "function describe(string[] resource) view returns ((bytes32 sha256Digest,address controller,uint64 version,bool externalBody,string mediaType,string body,string locator))",
  "function publishInline(string[] resource,string mediaType,string body) payable returns (bytes32 key,bytes32 digest,uint64 version)",
  "function writePrice() view returns (uint256)",
];

function requiredText(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

function pathOf(value, label = "resource path") {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError(`${label} must be a nonempty string array`);
  return value.map((part, index) => requiredText(part, `${label} segment ${index}`));
}

function identifier(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("base64url");
}

async function privateFile(path, label) {
  const metadata = await stat(path);
  if (!metadata.isFile() || (metadata.mode & 0o077) !== 0) throw new TypeError(`${label} must be one private regular file`);
  return readFile(path, "utf8");
}

export async function loadOnchainWallet({ rpcUrl, keystorePath, passwordPath }) {
  const provider = new JsonRpcProvider(requiredText(rpcUrl, "EVM RPC URL"), undefined, { staticNetwork: true });
  const [keystore, password] = await Promise.all([
    privateFile(requiredText(keystorePath, "EVM keystore path"), "EVM keystore"),
    privateFile(requiredText(passwordPath, "EVM password path"), "EVM password"),
  ]);
  return (await Wallet.fromEncryptedJson(keystore, password.trim())).connect(provider);
}

export class OnchainResourceClient {
  constructor({ contractAddress, wallet }) {
    if (wallet === null || typeof wallet !== "object" || wallet.provider === null) {
      throw new TypeError("an EVM wallet connected to a provider is required");
    }
    this.contract = new Contract(getAddress(requiredText(contractAddress, "ERC-5219 contract address")), ABI, wallet);
    this.serial = Promise.resolve();
  }

  async get(resource) {
    const selected = await this.contract.describe(pathOf(resource));
    if (selected.controller.toLowerCase() === ZERO_ADDRESS) return undefined;
    if (selected.externalBody) throw new Error("ActivityPub custody requires an inline ERC-5219 resource");
    return Object.freeze({
      body: selected.body,
      mediaType: selected.mediaType,
      digest: selected.sha256Digest,
      controller: selected.controller,
      version: Number(selected.version),
    });
  }

  put(resource, value, mediaType = "application/json") {
    const operation = async () => {
      const price = await this.contract.writePrice();
      const transaction = await this.contract.publishInline(pathOf(resource), requiredText(mediaType, "media type"), value, { value: price });
      const receipt = await transaction.wait();
      if (receipt?.status !== 1) throw new Error("ERC-5219 write did not finalize successfully");
      return Object.freeze({
        transaction: transaction.hash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        transactionIndex: receipt.index,
        digest: `0x${createHash("sha256").update(value).digest("hex")}`,
      });
    };
    const result = this.serial.then(operation, operation);
    this.serial = result.then(() => undefined, () => undefined);
    return result;
  }
}

class OnchainCollection {
  constructor(client, base) {
    this.client = client;
    this.base = pathOf(base, "collection base");
  }

  async index() {
    const stored = await this.client.get([...this.base, "index"]);
    if (stored === undefined) return [];
    const parsed = JSON.parse(stored.body);
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) throw new Error("onchain collection index is malformed");
    return parsed;
  }

  async get(id) {
    const stored = await this.client.get([...this.base, "items", requiredText(id, "collection item ID")]);
    return stored === undefined ? undefined : JSON.parse(stored.body);
  }

  async put(id, value) {
    const itemId = requiredText(id, "collection item ID");
    const prior = await this.get(itemId);
    const settlement = await this.client.put([...this.base, "items", itemId], JSON.stringify(value));
    if (prior === undefined) {
      const current = await this.index();
      if (!current.includes(itemId)) await this.client.put([...this.base, "index"], JSON.stringify([...current, itemId]));
    }
    return settlement;
  }

  async list({ cursor, limit }) {
    const ids = (await this.index()).toReversed();
    const offset = cursor === undefined ? 0 : Number(cursor);
    if (!Number.isSafeInteger(offset) || offset < 0) throw new TypeError("ActivityPub collection cursor is invalid");
    const selected = ids.slice(offset, offset + limit);
    const items = (await Promise.all(selected.map((id) => this.get(id)))).filter((item) => item !== undefined);
    const next = offset + selected.length;
    return { items, totalItems: ids.length, ...(next < ids.length ? { nextCursor: String(next) } : {}) };
  }
}

export function createOnchainKvStore({ client, actor }) {
  const collection = new OnchainCollection(client, ["activitypub", requiredText(actor, "ActivityPub actor namespace"), "fedify-kv"]);
  const keyId = (key) => Buffer.from(JSON.stringify(pathOf(key, "Fedify KV key"))).toString("base64url");
  return Object.freeze({
    async get(key) {
      const record = await collection.get(keyId(key));
      if (record?.present !== true) return undefined;
      if (record.expiresAt !== null && Date.now() >= record.expiresAt) return undefined;
      return record.value;
    },
    async set(key, value, options = {}) {
      const milliseconds = options.ttl === undefined ? null : options.ttl.total({ unit: "milliseconds" });
      await collection.put(keyId(key), { key: [...key], present: true, value, expiresAt: milliseconds === null ? null : Date.now() + milliseconds });
    },
    async delete(key) {
      await collection.put(keyId(key), { key: [...key], present: false, value: null, expiresAt: null });
    },
    async cas(key, expectedValue, newValue, options = {}) {
      const observed = await this.get(key);
      if (!isDeepStrictEqual(observed, expectedValue)) return false;
      await this.set(key, newValue, options);
      return true;
    },
    async *list(prefix = undefined) {
      const wanted = prefix === undefined ? undefined : pathOf(prefix, "Fedify KV prefix");
      for (const id of await collection.index()) {
        const record = await collection.get(id);
        if (record?.present !== true || (record.expiresAt !== null && Date.now() >= record.expiresAt)) continue;
        if (wanted !== undefined && !wanted.every((part, index) => record.key[index] === part)) continue;
        yield { key: record.key, value: record.value };
      }
    },
  });
}

export function createOnchainInbox({ client, actor }) {
  const collection = new OnchainCollection(client, ["activitypub", requiredText(actor, "ActivityPub actor namespace"), "inbox"]);
  return Object.freeze({
    async retain(arrival) {
      const activity = arrival?.jsonLd;
      if (activity === null || typeof activity !== "object") throw new TypeError("verified ActivityPub arrival is required");
      return collection.put(identifier(activity), activity);
    },
    list({ cursor, limit }) {
      return collection.list({ cursor, limit });
    },
  });
}

export function createOnchainOutbox({ client, actor }) {
  const collection = new OnchainCollection(client, ["activitypub", requiredText(actor, "ActivityPub actor namespace"), "outbox"]);
  return Object.freeze({
    async publish(activity) {
      if (activity === null || typeof activity !== "object" || typeof activity.id !== "string" || activity.id === "") {
        throw new TypeError("one identified ActivityStreams activity is required");
      }
      return collection.put(identifier(activity.id), activity);
    },
    list({ cursor, limit }) {
      return collection.list({ cursor, limit });
    },
  });
}

function delayMilliseconds(delay) {
  return delay === undefined ? 0 : Number(delay.total({ unit: "milliseconds" }));
}

export function createOnchainMessageQueue({ client, actor, name, pollMilliseconds = 1000 }) {
  const collection = new OnchainCollection(client, ["activitypub", requiredText(actor, "ActivityPub actor namespace"), "queue", requiredText(name, "queue name")]);
  let sequence = 0;
  return Object.freeze({
    nativeRetrial: true,
    async enqueue(message, options = {}) {
      const id = identifier({ message, sequence: sequence++ });
      await collection.put(id, { message, status: "pending", attempts: 0, availableAt: Date.now() + delayMilliseconds(options.delay) });
    },
    async listen(handler, options = {}) {
      while (!options.signal?.aborted) {
        for (const id of await collection.index()) {
          const record = await collection.get(id);
          if (record?.status !== "pending" || record.availableAt > Date.now()) continue;
          try {
            await handler(record.message);
            await collection.put(id, { ...record, status: "done", completedAt: Date.now() });
          } catch {
            await collection.put(id, { ...record, attempts: record.attempts + 1, availableAt: Date.now() + Math.min(60_000, 1000 * 2 ** record.attempts) });
          }
        }
        await new Promise((resolve) => setTimeout(resolve, pollMilliseconds));
      }
    },
    async getDepth() {
      let queued = 0, ready = 0, delayed = 0;
      for (const id of await collection.index()) {
        const record = await collection.get(id);
        if (record?.status !== "pending") continue;
        queued += 1;
        if (record.availableAt <= Date.now()) ready += 1;
        else delayed += 1;
      }
      return { queued, ready, delayed };
    },
  });
}

export function createOnchainActivityPubAdapters({ client, actor }) {
  return Object.freeze({
    kv: createOnchainKvStore({ client, actor }),
    inbox: createOnchainInbox({ client, actor }),
    outbox: createOnchainOutbox({ client, actor }),
    queue: Object.freeze({
      inbox: createOnchainMessageQueue({ client, actor, name: "inbox" }),
      outbox: createOnchainMessageQueue({ client, actor, name: "outbox" }),
      fanout: createOnchainMessageQueue({ client, actor, name: "fanout" }),
    }),
  });
}
