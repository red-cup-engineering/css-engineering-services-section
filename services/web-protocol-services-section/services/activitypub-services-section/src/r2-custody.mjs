import { createHash } from "node:crypto";
import { createR2RestClient, r2RestConfiguration } from "@red-cup-engineering/immutable-content-custody-service/r2-rest";

const encode = (value) => new TextEncoder().encode(JSON.stringify(value));
const digest = (value) => createHash("sha256").update(value).digest("hex");
const keyId = (key) => digest(JSON.stringify(key));

function canonicalJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("ActivityPub custody records must be JSON values");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  throw new TypeError("ActivityPub custody records must be JSON values");
}

function decode(remote, label) {
  try { return JSON.parse(Buffer.from(remote.body).toString("utf8")); }
  catch (error) { throw new Error(`${label} is not JSON: ${error.message}`); }
}

async function list(client, prefix, label) {
  const rows = [];
  let cursor;
  do {
    const result = await client.list(prefix, cursor);
    for (let offset = 0; offset < result.keys.length; offset += 8) {
      const batch = await Promise.all(result.keys.slice(offset, offset + 8).map(async (key) => {
        const remote = await client.get(key);
        return remote === null ? null : { key, value: decode(remote, label) };
      }));
      rows.push(...batch.filter(Boolean));
    }
    cursor = result.continuationToken;
  } while (cursor !== undefined);
  return rows;
}

function kv(client, prefix) {
  let writes = Promise.resolve();
  const path = (key) => `${prefix}/kv/${keyId(key)}.json`;
  const serial = (operation) => {
    const next = writes.then(operation, operation);
    writes = next.then(() => undefined, () => undefined);
    return next;
  };
  const read = async (key) => {
    const remote = await client.get(path(key));
    return remote === null ? null : decode(remote, "ActivityPub KV");
  };
  return Object.freeze({
    async get(key) {
      const row = await read(key);
      return row === null || row.deleted === true || (row.expiresAt !== null && Date.now() >= row.expiresAt)
        ? undefined
        : row.value;
    },
    async set(key, value, options = {}) {
      const milliseconds = options.ttl === undefined ? null : Number(options.ttl.total({ unit: "milliseconds" }));
      if (milliseconds !== null && (!Number.isFinite(milliseconds) || milliseconds < 0)) throw new TypeError("ActivityPub KV TTL is invalid");
      await serial(() => client.putCurrent(path(key), {
        body: encode({ key, value, deleted: false, expiresAt: milliseconds === null ? null : Date.now() + milliseconds }),
        mediaType: "application/json",
      }));
    },
    async delete(key) {
      await serial(() => client.putCurrent(path(key), {
        body: encode({ key, value: null, deleted: true, expiresAt: null }),
        mediaType: "application/json",
      }));
    },
    async cas(key, expectedValue, newValue, options = {}) {
      return serial(async () => {
        const row = await read(key);
        const current = row === null || row.deleted === true || (row.expiresAt !== null && Date.now() >= row.expiresAt) ? undefined : row.value;
        if (JSON.stringify(current) !== JSON.stringify(expectedValue)) return false;
        const milliseconds = options.ttl === undefined ? null : Number(options.ttl.total({ unit: "milliseconds" }));
        if (milliseconds !== null && (!Number.isFinite(milliseconds) || milliseconds < 0)) throw new TypeError("ActivityPub KV TTL is invalid");
        await client.putCurrent(path(key), {
          body: encode({ key, value: newValue, deleted: false, expiresAt: milliseconds === null ? null : Date.now() + milliseconds }),
          mediaType: "application/json",
        });
        return true;
      });
    },
    async *list(prefixKey = undefined) {
      for (const { value } of await list(client, `${prefix}/kv/`, "ActivityPub KV")) {
        if (value.deleted === true || (value.expiresAt !== null && Date.now() >= value.expiresAt)) continue;
        if (prefixKey !== undefined && !prefixKey.every((part, index) => value.key[index] === part)) continue;
        yield { key: value.key, value: value.value };
      }
    },
  });
}

function verifiedArrival(client, prefix) {
  const root = `${prefix}/verified-arrivals/sha256/`;
  const receiptKey = (receipt) => `${root}${digest(canonicalJson(receipt))}.json`;
  const validReceipt = (receipt) => receipt !== null && typeof receipt === "object"
    && receipt.type === "ActivityPubVerifiedArrivalReceipt"
    && receipt.version === 1
    && /^[a-f0-9]{64}$/u.test(receipt.bodySha256)
    && (typeof receipt.recipient === "string" || receipt.recipient === null);
  return Object.freeze({
    async retain(arrival) {
      const activity = arrival?.jsonLd;
      if (activity === null || typeof activity !== "object" || Array.isArray(activity)) {
        throw new TypeError("verified ActivityPub arrival is required");
      }
      const body = canonicalJson(activity);
      const bodySha256 = digest(body);
      const receipt = Object.freeze({
        type: "ActivityPubVerifiedArrivalReceipt",
        version: 1,
        bodySha256,
        recipient: arrival.recipient ?? null,
      });
      const record = Object.freeze({ activity, receipt });
      const bytes = new TextEncoder().encode(canonicalJson(record));
      const key = receiptKey(receipt);
      const existing = await client.get(key);
      if (existing !== null) {
        if (!Buffer.from(existing.body).equals(Buffer.from(bytes))) {
          throw new Error("immutable ActivityPub custody record differs from the verified arrival");
        }
      } else {
        await client.putCurrent(key, { body: bytes, mediaType: "application/json" });
      }
      const observed = await client.get(key);
      if (observed === null || !Buffer.from(observed.body).equals(Buffer.from(bytes))) {
        throw new Error("immutable ActivityPub custody read-back differs from the verified arrival");
      }
      return receipt;
    },
    async get(receipt) {
      if (!validReceipt(receipt)) throw new TypeError("ActivityPub verified-arrival receipt is invalid");
      const observed = await client.get(receiptKey(receipt));
      if (observed === null) return null;
      const record = decode(observed, "ActivityPub verified-arrival custody");
      const expected = new TextEncoder().encode(canonicalJson(record));
      if (!Buffer.from(observed.body).equals(Buffer.from(expected))
          || !validReceipt(record.receipt)
          || canonicalJson(record.receipt) !== canonicalJson(receipt)
          || digest(canonicalJson(record.activity)) !== receipt.bodySha256) {
        throw new Error("immutable ActivityPub custody record does not match its receipt");
      }
      return Object.freeze({ activity: record.activity, receipt: Object.freeze(record.receipt) });
    },
  });
}

/**
 * R2 has no conditional create, atomic claim, or leased dequeue operation.
 * This boundary therefore owns only mutable KV and content-addressed verified
 * arrival records. It intentionally exports neither a MessageQueue nor a
 * history scan: callers must inject a scheduler and history index with the
 * required exclusive-claim and bounded-query semantics.
 */
export function createActivityPubR2Custody({
  actor,
  client = createR2RestClient(r2RestConfiguration()),
}) {
  if (typeof actor !== "string" || !actor) throw new TypeError("ActivityPub R2 custody actor is required");
  const prefix = `activitypub/v1/${digest(actor)}`;
  return Object.freeze({ kv: kv(client, prefix), inbox: verifiedArrival(client, prefix) });
}
