import assert from "node:assert/strict";
import { mkdtemp, mkdir, symlink, writeFile, appendFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createMigrationCensus } from "../src/migration-census.mjs";

test("census inventories all regular files, exact duplicates, exclusions, and symlinks deterministically", async (t) => {
  const workspace = await mkdtemp(join(tmpdir(), "migration-census-"));
  t.after(async () => {
    const { rm } = await import("node:fs/promises");
    await rm(workspace, { recursive: true, force: true });
  });
  const source = join(workspace, "source");
  await mkdir(join(source, "excluded"), { recursive: true });
  await writeFile(join(source, "b.mp4"), "same bytes");
  await writeFile(join(source, "a.mp4"), "same bytes");
  await writeFile(join(source, "empty"), "");
  await writeFile(join(source, "excluded", "secret.bin"), "do not hash");
  await symlink("a.mp4", join(source, "friendly-link.mp4"));

  const census = await createMigrationCensus({
    sourceRoots: [source],
    pathMode: "workspace-relative",
    workspaceRoot: workspace,
    exclusions: ["source/excluded"],
  });

  assert.equal(census.schemaVersion, "migration-census/v1");
  assert.deepEqual(census.files.map(({ path }) => path), [
    "source/a.mp4",
    "source/b.mp4",
    "source/empty",
  ]);
  assert.equal(census.files[0].extension, ".mp4");
  assert.equal(census.files[0].mediaTypeHint, "video/mp4");
  assert.equal(census.files[2].byteLength, 0);
  assert.equal(census.files[2].extension, null);
  assert.equal(census.exactDuplicateGroups.length, 1);
  assert.deepEqual(census.exactDuplicateGroups[0].paths, ["source/a.mp4", "source/b.mp4"]);
  assert.equal(census.exactDuplicateGroups[0].redundantBytes, 10);
  assert.equal(census.summary.totalBytes, 20);
  assert.equal(census.summary.uniquePayloadBytes, 10);
  assert.deepEqual(census.nonRegularEntries, [{
    path: "source/friendly-link.mp4",
    kind: "symbolic-link",
    target: "a.mp4",
  }]);
  assert.deepEqual(census.excludedEntries, [{ path: "source/excluded", kind: "directory" }]);
  assert.doesNotThrow(() => JSON.stringify(census));
});

test("absolute path mode is explicit and near-duplicates remain separate", async (t) => {
  const source = await mkdtemp(join(tmpdir(), "migration-census-absolute-"));
  t.after(async () => {
    const { rm } = await import("node:fs/promises");
    await rm(source, { recursive: true, force: true });
  });
  await writeFile(join(source, "one.txt"), "almost same A");
  await writeFile(join(source, "two.txt"), "almost same B");

  const census = await createMigrationCensus({ sourceRoots: [source] });

  assert.ok(census.files.every(({ path }) => path.startsWith(source)));
  assert.equal(census.exactDuplicateGroups.length, 0);
  assert.equal(census.summary.redundantBytes, 0);
});

test("a file changed after hashing is marked unstable and withheld from payload accounting", async (t) => {
  const source = await mkdtemp(join(tmpdir(), "migration-census-unstable-"));
  t.after(async () => {
    const { rm } = await import("node:fs/promises");
    await rm(source, { recursive: true, force: true });
  });
  const changingPath = join(source, "changing.bin");
  await writeFile(changingPath, "before");
  let changed = false;

  const census = await createMigrationCensus({
    sourceRoots: [source],
    onFileHashed: async ({ path }) => {
      if (path === changingPath && !changed) {
        changed = true;
        await appendFile(path, "-after");
      }
    },
  });

  assert.deepEqual(census.files, []);
  assert.equal(census.unstableFiles.length, 1);
  assert.equal(census.unstableFiles[0].path, changingPath);
  assert.equal(census.unstableFiles[0].reason, "changed-during-hashing");
  assert.notEqual(census.unstableFiles[0].before.byteLength, census.unstableFiles[0].afterPath.byteLength);
  assert.equal(census.summary.unstableFileCount, 1);
  assert.equal(census.summary.totalBytes, 0);
});

test("workspace-relative mode refuses roots outside its workspace", async () => {
  await assert.rejects(
    createMigrationCensus({
      sourceRoots: [tmpdir()],
      pathMode: "workspace-relative",
      workspaceRoot: join(tmpdir(), "not-the-parent"),
    }),
    /outside workspaceRoot/,
  );
});

test("overlapping source roots do not inventory a pathname twice", async (t) => {
  const source = await mkdtemp(join(tmpdir(), "migration-census-overlap-"));
  t.after(async () => {
    const { rm } = await import("node:fs/promises");
    await rm(source, { recursive: true, force: true });
  });
  const nested = join(source, "nested");
  await mkdir(nested);
  await writeFile(join(nested, "only-once.bin"), "payload");

  const census = await createMigrationCensus({ sourceRoots: [nested, source] });

  assert.equal(census.files.length, 1);
  assert.equal(census.exactDuplicateGroups.length, 0);
});
