import assert from "node:assert/strict";
import test from "node:test";
import { createGoogleDriveLibraryProjector, googleDriveLibraryDisplayName } from "../src/google-drive-library-projector.mjs";

const sha = (character) => character.repeat(64);

function fixtures(entries) {
  const heads = new Map(entries.map((entry) => [`${entry.bucket}/${entry.key}`, entry]));
  const payloads = new Map(entries.filter(({ payloadId }) => payloadId).map((entry) =>
    [`${entry.sha256}/${entry.byteLength}`, { id: entry.payloadId, sha256: entry.sha256, byteLength: entry.byteLength }]));
  const folders = new Map(), shortcuts = new Map(), calls = [];
  const custody = {
    async findPayload(query) { calls.push(["findPayload", query]); return payloads.get(`${query.sha256}/${query.byteLength}`) ?? null; },
    async reconcileFolder(input) {
      calls.push(["reconcileFolder", input]);
      let folder = folders.get(input.projectionKey);
      if (!folder) {
        folder = { id: `folder-${folders.size + 1}`, ...input, created: true };
        folders.set(input.projectionKey, folder);
      } else Object.assign(folder, input, { created: false });
      return { id: folder.id, created: folder.created };
    },
    async reconcileShortcut(input) {
      calls.push(["reconcileShortcut", input]);
      let shortcut = shortcuts.get(input.projectionKey);
      if (!shortcut) {
        shortcut = { id: `shortcut-${shortcuts.size + 1}`, ...input, created: true };
        shortcuts.set(input.projectionKey, shortcut);
      } else Object.assign(shortcut, input, { created: false });
      return { id: shortcut.id, created: shortcut.created, targetFileId: shortcut.targetFileId };
    },
  };
  const storage = {
    async headObject({ bucket, key }) { calls.push(["headObject", { bucket, key }]); return heads.get(`${bucket}/${key}`) ?? null; },
    async listObjects({ bucket, prefix, startAfter, maximum }) {
      calls.push(["listObjects", { bucket, prefix, startAfter, maximum }]);
      const objects = [...heads.values()].filter((entry) => entry.bucket === bucket && entry.key.startsWith(prefix)
        && entry.key > startAfter).sort((a, b) => a.key.localeCompare(b.key)).slice(0, maximum);
      return { objects, truncated: false };
    },
  };
  return { custody, storage, folders, shortcuts, calls };
}

const projectorFor = (state) => createGoogleDriveLibraryProjector({ ...state, rootFolderId: "drive-root" });

test("projects nested object paths beneath managed library and bucket folders", async () => {
  const state = fixtures([{ bucket: "media.example", key: "video/2026/picnic.mp4", sha256: sha("a"),
    byteLength: 42, payloadId: "payload-a" }]);
  const result = await projectorFor(state).reconcileObject({ bucket: "media.example", key: "video/2026/picnic.mp4" });
  assert.equal(result.status, "projected");
  assert.deepEqual([...state.folders.values()].map(({ name, parentFolderId }) => [name, parentFolderId]), [
    ["library", "drive-root"], ["media.example", "folder-1"], ["video", "folder-2"], ["2026", "folder-3"],
  ]);
  assert.deepEqual([...state.shortcuts.values()].map(({ name, parentFolderId, targetFileId }) =>
    [name, parentFolderId, targetFileId]), [["picnic.mp4", "folder-4", "payload-a"]]);
});

test("projects exact duplicate logical objects as distinct shortcuts to one canonical payload", async () => {
  const state = fixtures([
    { bucket: "media.example", key: "first.mp4", sha256: sha("b"), byteLength: 9, payloadId: "payload-shared" },
    { bucket: "media.example", key: "archive/second.mp4", sha256: sha("b"), byteLength: 9, payloadId: "payload-shared" },
  ]);
  const result = await projectorFor(state).reconcileBucket({ bucket: "media.example" });
  assert.equal(result.projected, 2);
  assert.equal(state.shortcuts.size, 2);
  assert.deepEqual(new Set([...state.shortcuts.values()].map(({ targetFileId }) => targetFileId)), new Set(["payload-shared"]));
  assert.equal(new Set(state.shortcuts.keys()).size, 2);
});

test("a rebuild is idempotent because exact identities, not names, drive reconciliation", async () => {
  const state = fixtures([{ bucket: "media.example", key: "photos/crow.jpg", sha256: sha("c"),
    byteLength: 17, payloadId: "payload-c" }]);
  const projector = projectorFor(state);
  const first = await projector.reconcileObject({ bucket: "media.example", key: "photos/crow.jpg" });
  const second = await projector.reconcileObject({ bucket: "media.example", key: "photos/crow.jpg" });
  assert.equal(first.shortcut.id, second.shortcut.id);
  assert.equal(state.folders.size, 3);
  assert.equal(state.shortcuts.size, 1);
  assert.equal(second.shortcut.created, false);
});

test("empty, trailing, unsafe, reserved, and overlong segments have deterministic bounded display names", async () => {
  const long = "a".repeat(300);
  const key = `top// bad\nname/⟦rce:foreign⟧/${long}/`;
  const state = fixtures([{ bucket: "media.example", key, sha256: sha("d"), byteLength: 1, payloadId: "payload-d" }]);
  await projectorFor(state).reconcileObject({ bucket: "media.example", key });
  const names = [...state.folders.values()].map(({ name }) => name);
  assert.ok(names.includes(googleDriveLibraryDisplayName("")));
  assert.ok(names.includes(googleDriveLibraryDisplayName(" bad\nname")));
  assert.ok(names.includes(googleDriveLibraryDisplayName("⟦rce:foreign⟧")));
  const longName = names.find((name) => name.includes("⟦rce:sha256:"));
  assert.ok(longName.startsWith("a"));
  assert.ok(Buffer.byteLength(longName) <= 240);
  assert.equal([...state.shortcuts.values()][0].name, "⟦rce:empty⟧");
});

test("missing and tombstoned logical objects are reported without creating Drive projections", async () => {
  const state = fixtures([]);
  const result = await projectorFor(state).reconcileObject({ bucket: "media.example", key: "gone.mp4" });
  assert.deepEqual(result, { status: "missing", bucket: "media.example", key: "gone.mp4", projected: false });
  assert.equal(state.folders.size, 0);
  assert.equal(state.shortcuts.size, 0);
  assert.deepEqual(state.calls.map(([operation]) => operation), ["headObject"]);
});

test("a missing canonical payload is reported before any folder is created", async () => {
  const state = fixtures([{ bucket: "media.example", key: "lost.mp4", sha256: sha("e"), byteLength: 99 }]);
  const result = await projectorFor(state).reconcileObject({ bucket: "media.example", key: "lost.mp4" });
  assert.equal(result.status, "payload-missing");
  assert.equal(state.folders.size, 0);
  assert.equal(state.shortcuts.size, 0);
});
