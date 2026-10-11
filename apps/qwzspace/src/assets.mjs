// assets — meshes, textures and terrain named by what they are. A scene never points at a file: it
// names bytes by their RFC 6920 `ni:///sha-256;…` content address, and a resolver fetches those
// bytes from wherever they are kept and refuses any that do not hash to their name. The same
// address therefore draws the same terrain on every client, from any mirror, forever.

import { isNiUri, makeNiUri, niUriName, niWellKnownPath, verifyNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";

/** The content address of some bytes. */
export const addressOf = (bytes) => makeNiUri(bytes);

/** A resolver: `resolve(address)` returns the verified bytes the address names, fetched once.
 *  `fetchBytes(name)` returns the bytes (or a promise of them) from any store. */
export function createAssetResolver({ fetchBytes } = {}) {
  if (typeof fetchBytes !== "function") throw new TypeError("assets: createAssetResolver({ fetchBytes }) requires fetchBytes(address)");
  const resolved = new Map();
  return {
    resolve(address) {
      const name = niUriName(address);
      if (name === null || !isNiUri(name)) return Promise.reject(new TypeError(`assets: not a content address: ${JSON.stringify(address)}`));
      if (!resolved.has(name)) {
        const pending = Promise.resolve(fetchBytes(name)).then((raw) => {
          const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
          if (!verifyNiUri(bytes, name)) throw new Error(`assets: bytes fetched for ${name} do not hash to it`);
          return bytes;
        });
        pending.catch(() => resolved.delete(name));
        resolved.set(name, pending);
      }
      return resolved.get(name);
    },
  };
}

/** Fetch from an origin's RFC 6920 well-known path: `<base>/.well-known/ni/sha-256/<digest>`. */
export function wellKnownFetch(base, fetchImpl = globalThis.fetch) {
  return async (address) => {
    const response = await fetchImpl(new URL(niWellKnownPath(address), base));
    if (!response.ok) throw new Error(`assets: ${address} is not served at ${base} (${response.status})`);
    return new Uint8Array(await response.arrayBuffer());
  };
}

/** An in-memory store of some bytes, keyed by their addresses. */
export function memoryAssets(blobs = []) {
  const store = new Map(blobs.map((bytes) => [addressOf(bytes), bytes]));
  return {
    store,
    add(bytes) {
      const address = addressOf(bytes);
      store.set(address, bytes);
      return address;
    },
    fetchBytes(address) {
      const bytes = store.get(address);
      if (bytes === undefined) throw new Error(`assets: ${address} is not in this store`);
      return bytes;
    },
  };
}

const json = (bytes) => JSON.parse(new TextDecoder().decode(bytes));

/** A mesh asset: JSON `{ kind: "qwzspace.mesh.v1", positions, indices, colors? }` in the world's
 *  frame (x east, y north, z up, metres about the subject's pose). */
export function decodeMesh(bytes) {
  const mesh = json(bytes);
  if (mesh?.kind !== "qwzspace.mesh.v1" || !Array.isArray(mesh.positions) || !Array.isArray(mesh.indices)) {
    throw new TypeError("assets: a mesh is { kind: \"qwzspace.mesh.v1\", positions, indices }");
  }
  return mesh;
}

/** The bytes of a mesh, ready to be named. */
export const encodeMesh = (mesh) => new TextEncoder().encode(JSON.stringify({ kind: "qwzspace.mesh.v1", ...mesh }));
