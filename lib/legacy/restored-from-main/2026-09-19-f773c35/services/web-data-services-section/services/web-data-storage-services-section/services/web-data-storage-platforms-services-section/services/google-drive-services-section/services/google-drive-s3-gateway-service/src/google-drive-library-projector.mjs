import { createHash } from "node:crypto";

const DISPLAY_LIMIT_BYTES = 240;
const REVERSIBLE_LIMIT_BYTES = 120;
const RESERVED_PREFIX = "⟦rce:";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const identityDigest = (...parts) => digest(Buffer.from(JSON.stringify(parts)));

function bytePrefix(value, maximumBytes) {
  let output = "", bytes = 0;
  for (const character of value) {
    const width = Buffer.byteLength(character);
    if (bytes + width > maximumBytes) break;
    output += character;
    bytes += width;
  }
  return output;
}

function readablePrefix(value) {
  const visible = value.replace(/[\u0000-\u001f\u007f-\u009f]/gu, "�").trim();
  return bytePrefix(visible || "segment", 175);
}

/**
 * Produces a deterministic Drive display name without using that name as identity.
 * Ordinary segments survive verbatim. Exceptional short segments are reversibly
 * encoded; exceptional long segments retain a readable prefix and a hash suffix.
 */
export function googleDriveLibraryDisplayName(segment) {
  if (typeof segment !== "string") throw new TypeError("key segment must be a string");
  const bytes = Buffer.byteLength(segment);
  const ordinary = segment.length > 0 && segment !== "." && segment !== ".."
    && !segment.startsWith(RESERVED_PREFIX)
    && !/^[\s]|[\s]$/u.test(segment)
    && !/[\u0000-\u001f\u007f-\u009f]/u.test(segment)
    && bytes <= DISPLAY_LIMIT_BYTES;
  if (ordinary) return segment;
  if (segment === "") return "⟦rce:empty⟧";
  if (segment === ".") return "⟦rce:dot⟧";
  if (segment === "..") return "⟦rce:dot-dot⟧";
  if (bytes <= REVERSIBLE_LIMIT_BYTES) {
    return `⟦rce:utf8:${Buffer.from(segment).toString("base64url")}⟧`;
  }
  return `${readablePrefix(segment)}…⟦rce:sha256:${digest(Buffer.from(segment)).slice(0, 16)}⟧`;
}

function requireDependency(value, name, operations) {
  if (!value || typeof value !== "object") throw new TypeError(`${name} is required`);
  for (const operation of operations) {
    if (typeof value[operation] !== "function") throw new TypeError(`${name}.${operation} is required`);
  }
  return value;
}

function requiredText(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${label} is required`);
  return value;
}

function projectionKey(kind, bucket = "", key = "") {
  return `library/${kind}/sha256/${identityDigest("org.red-cup-engineering.drive-library.v1", kind, bucket, key)}`;
}

export function createGoogleDriveLibraryProjector({ custody: offeredCustody, storage: offeredStorage,
  rootFolderId: offeredRootFolderId } = {}) {
  const custody = requireDependency(offeredCustody, "custody",
    ["reconcileFolder", "reconcileShortcut", "findPayload"]);
  const storage = requireDependency(offeredStorage, "storage", ["headObject", "listObjects"]);
  const rootFolderId = requiredText(offeredRootFolderId, "rootFolderId");

  async function ensureFolderPath(bucket, key) {
    const folders = [];
    const library = await custody.reconcileFolder({ projectionKey: projectionKey("root"),
      name: "library", parentFolderId: rootFolderId });
    folders.push(library);
    const bucketFolder = await custody.reconcileFolder({ projectionKey: projectionKey("bucket", bucket),
      name: googleDriveLibraryDisplayName(bucket), parentFolderId: library.id });
    folders.push(bucketFolder);

    const segments = key.split("/");
    let parentFolderId = bucketFolder.id, exactPrefix = "";
    for (const segment of segments.slice(0, -1)) {
      exactPrefix += `${segment}/`;
      const folder = await custody.reconcileFolder({
        projectionKey: projectionKey("prefix", bucket, exactPrefix),
        name: googleDriveLibraryDisplayName(segment), parentFolderId,
      });
      folders.push(folder);
      parentFolderId = folder.id;
    }
    return Object.freeze({ folders: Object.freeze(folders), parentFolderId, leaf: segments.at(-1) });
  }

  async function reconcileObject({ bucket: offeredBucket, key: offeredKey } = {}) {
    const bucket = requiredText(offeredBucket, "bucket");
    if (typeof offeredKey !== "string") throw new TypeError("key is required");
    const key = offeredKey;
    const head = await storage.headObject({ bucket, key });
    if (!head || head.deleted) return Object.freeze({ status: "missing", bucket, key, projected: false });
    if (typeof head.sha256 !== "string" || !Number.isSafeInteger(head.byteLength) || head.byteLength < 0) {
      throw new Error(`catalog head for ${bucket}/${key} lacks a valid payload commitment`);
    }
    const payload = await custody.findPayload({ sha256: head.sha256, byteLength: head.byteLength });
    if (!payload) return Object.freeze({ status: "payload-missing", bucket, key, projected: false,
      sha256: head.sha256, byteLength: head.byteLength });
    if (typeof payload.id !== "string" || payload.id.length === 0
      || (payload.sha256 !== undefined && payload.sha256 !== head.sha256)
      || (payload.byteLength !== undefined && payload.byteLength !== head.byteLength)) {
      throw new Error(`custody returned invalid canonical payload evidence for ${bucket}/${key}`);
    }

    const path = await ensureFolderPath(bucket, key);
    const shortcut = await custody.reconcileShortcut({
      projectionKey: projectionKey("object", bucket, key),
      name: googleDriveLibraryDisplayName(path.leaf),
      parentFolderId: path.parentFolderId,
      targetFileId: payload.id,
    });
    return Object.freeze({ status: "projected", bucket, key, projected: true, sha256: head.sha256,
      byteLength: head.byteLength, targetFileId: payload.id, shortcut, folders: path.folders });
  }

  async function reconcileBucket({ bucket: offeredBucket, prefix = "" } = {}) {
    const bucket = requiredText(offeredBucket, "bucket");
    if (typeof prefix !== "string") throw new TypeError("prefix must be a string");
    const results = [];
    let startAfter = "";
    for (;;) {
      const page = await storage.listObjects({ bucket, prefix, startAfter, maximum: 1000 });
      if (!page || !Array.isArray(page.objects)) throw new Error("storage.listObjects returned an invalid page");
      for (const object of page.objects) results.push(await reconcileObject({ bucket, key: object.key }));
      if (!page.truncated) break;
      const next = page.nextStartAfter ?? page.objects.at(-1)?.key;
      if (typeof next !== "string" || next.length === 0 || next === startAfter) {
        throw new Error("storage.listObjects returned a non-advancing truncated page");
      }
      startAfter = next;
    }
    return Object.freeze({ bucket, prefix, results: Object.freeze(results), projected:
      results.filter(({ status }) => status === "projected").length });
  }

  return Object.freeze({ reconcileObject, reconcileBucket });
}
