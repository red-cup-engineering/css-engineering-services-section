import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { admitJsonSemanticContent, EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

const credential = /^(?:authorization|api[-_]?key(?:[-_]?id)?|api[-_]?secret(?:[-_]?key)?|secret|token|password|private[-_]?key|mnemonic)$/iu;
function refuseCredentials(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  for (const [key, member] of Object.entries(value)) {
    if (credential.test(key)) throw new TypeError("credential-bearing-dataset-refused");
    refuseCredentials(member, seen);
  }
}

export function createContentAddressedDatasetStore({ root, maximumBytes = 64 * 1024 * 1024 } = {}) {
  if (typeof root !== "string" || !root.trim() || !Number.isInteger(maximumBytes) || maximumBytes < 1024) throw new TypeError("dataset-store-root-and-bound-required");
  const ownedRoot = resolve(root);
  const storeDataset = async ({ dataset, mediaType = "application/rmn+cbor", observedAt, provenance = [] } = {}) => {
    refuseCredentials(dataset);
    if (!Number.isFinite(Date.parse(observedAt)) || !Array.isArray(provenance) || provenance.some((value) => typeof value !== "string")) throw new TypeError("dataset-metadata-invalid");
    const content = identifyJsonSemanticContent({ objectKind: "brokerage-control.dataset", value: dataset, witnessRoot: EMPTY_WITNESS_ROOT });
    const { bytes, token: id } = content;
    if (bytes.length > maximumBytes) throw new RangeError("dataset-byte-bound-exceeded");
    await mkdir(ownedRoot, { recursive: true, mode: 0o700 });
    const filename = `${id.split(";")[1]}.rmn.cbor`, path = resolve(ownedRoot, filename);
    if (!path.startsWith(`${ownedRoot}${sep}`)) throw new TypeError("dataset-path-escape-refused");
    try { await writeFile(path, bytes, { flag: "wx", mode: 0o600 }); } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const existing = await readFile(path);
      if (!existing.equals(bytes)) throw new TypeError("content-address-collision-refused");
    }
    return Object.freeze({ type: "ContentAddressedDatasetManifest", version: 1, id, mediaType, byteLength: bytes.length, observedAt: new Date(observedAt).toISOString(), provenance: Object.freeze([...provenance]), immutable: true });
  };
  const readDataset = async (manifest) => {
    if (manifest?.type !== "ContentAddressedDatasetManifest" || typeof manifest.id !== "string") throw new TypeError("dataset-manifest-required");
    const bytes = await readFile(resolve(ownedRoot, `${manifest.id.split(";")[1]}.rmn.cbor`));
    return admitJsonSemanticContent({ bytes, token: manifest.id, objectKind: "brokerage-control.dataset" }).value;
  };
  return Object.freeze({ storeDataset, readDataset });
}
