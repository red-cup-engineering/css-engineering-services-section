import { createHash } from "node:crypto";

async function bytes(body) {
  if (body instanceof Uint8Array) return Buffer.from(body);
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

const hash = (algorithm, value) => createHash(algorithm).update(value).digest("hex");
const digest = (value) => hash("sha256", value);

export function createMemoryObjectCustody() {
  const entries = new Map(), stages = new Map(); let nextStage = 0;

  async function putImmutable(key, value) {
    const body = await bytes(value.body), sha256 = digest(body);
    if (value.byteLength !== body.length || value.sha256 !== sha256)
      throw new Error("immutable custody declaration does not match its bytes");
    const present = entries.get(key);
    if (present) {
      if (!present.body.equals(body)) throw new Error("immutable custody key collision");
      return Object.freeze({ conflict: false, etag: present.etag, existed: true });
    }
    const entry = Object.freeze({ body, mediaType: value.mediaType, sha256, etag: sha256 });
    entries.set(key, entry);
    return Object.freeze({ conflict: false, etag: entry.etag, existed: false });
  }

  async function get(key, { range } = {}) {
    const entry = entries.get(key);
    if (!entry) return null;
    const body = range ? entry.body.subarray(range.start, Math.min(range.endExclusive, entry.body.length)) : entry.body;
    return Object.freeze({ ...entry, body: Buffer.from(body), byteLength: body.length });
  }

  async function head(key) {
    const entry = entries.get(key);
    if (!entry) return null;
    return Object.freeze({ etag: entry.etag, byteLength: entry.body.length, mediaType: entry.mediaType, sha256: entry.sha256 });
  }

  async function putCurrent(key, value, { expectedEtag, ifNoneMatch = false } = {}) {
    const present = entries.get(key);
    if ((ifNoneMatch && present) || (expectedEtag !== undefined && present?.etag !== expectedEtag))
      return Object.freeze({ conflict: true, etag: present?.etag ?? null });
    const body = await bytes(value.body);
    if (value.byteLength !== body.length || value.sha256 !== digest(body))
      throw new Error("current custody declaration does not match its bytes");
    const revision = Number(present?.revision ?? 0) + 1;
    const etag = digest(Buffer.concat([body, Buffer.from(`\0${revision}`)]));
    entries.set(key, Object.freeze({ body, byteLength: body.length, mediaType: value.mediaType,
      sha256: value.sha256, etag, revision }));
    return Object.freeze({ conflict: false, etag });
  }

  async function deleteCurrent(key, { expectedEtag } = {}) {
    const present = entries.get(key);
    if (!present) return Object.freeze({ conflict: false, deleted: false });
    if (expectedEtag !== undefined && present.etag !== expectedEtag)
      return Object.freeze({ conflict: true, deleted: false, etag: present.etag });
    entries.delete(key);
    return Object.freeze({ conflict: false, deleted: true });
  }

  async function list(prefix = "") {
    return [...entries.entries()].filter(([key]) => key.startsWith(prefix)).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => Object.freeze({ key, etag: value.etag, byteLength: value.body.length,
        mediaType: value.mediaType, sha256: value.sha256 }));
  }

  async function stage({ body, mediaType = "application/octet-stream" }) {
    const retained = await bytes(body), stageId = `stage_${String(++nextStage).padStart(8, "0")}`;
    const value = Object.freeze({ body: retained, mediaType, sha256: digest(retained),
      md5: hash("md5", retained), byteLength: retained.length });
    stages.set(stageId, value);
    return Object.freeze({ stageId, mediaType, sha256: value.sha256, md5: value.md5, byteLength: value.byteLength });
  }

  async function getStaged(stageId, { range } = {}) {
    const retained = stages.get(stageId);
    if (!retained) return null;
    const body = range ? retained.body.subarray(range.start, Math.min(range.endExclusive, retained.body.length)) : retained.body;
    return Object.freeze({ ...retained, body: Buffer.from(body), byteLength: body.length });
  }

  async function promoteStaged(stageId, declaration) {
    const retained = stages.get(stageId);
    if (!retained) throw new Error("staging object is absent");
    if (retained.sha256 !== declaration.sha256 || retained.md5 !== declaration.md5
      || retained.byteLength !== declaration.byteLength) throw new Error("staging declaration does not match its bytes");
    return putImmutable(declaration.key, { body: retained.body, byteLength: retained.byteLength,
      sha256: retained.sha256, mediaType: declaration.mediaType });
  }

  async function deleteStaged(stageId) { return stages.delete(stageId); }

  return Object.freeze({ putImmutable, get, head, putCurrent, deleteCurrent, list,
    stage, getStaged, promoteStaged, deleteStaged,
    inspect: () => new Map(entries), inspectStages: () => new Map(stages) });
}
