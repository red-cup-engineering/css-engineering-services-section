import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { CONTENT_READER_CONTRACT_VERSION, createFilesystemContentReader } from "../src/filesystem-content-reader.mjs";

async function fixture() {
  return mkdtemp(join(tmpdir(), "filesystem-content-reader-"));
}

test("lists supported source records in deterministic path order with provenance and dependencies", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "notes"));
  await writeFile(join(root, "z.md"), "z");
  await writeFile(join(root, "notes", "a.MD"), "alpha");
  await writeFile(join(root, "skip.txt"), "not a source");

  const reader = await createFilesystemContentReader({ root, extensions: [".md"] });
  const records = await reader.listRecords();
  assert.equal(reader.contractVersion, CONTENT_READER_CONTRACT_VERSION);
  assert.deepEqual(records.map((record) => record.id), ["notes/a.MD", "z.md"]);
  assert.equal(records[0].extension, ".md");
  assert.equal(records[0].provenance.sha256, createHash("sha256").update("alpha").digest("base64url"));
  assert.deepEqual(records[0].dependencies.map((dependency) => dependency.kind), ["filesystem-directory", "filesystem-file"]);
  assert.ok(records[0].provenance.href.startsWith("file:"));
  assert.equal(Object.isFrozen(records[0]), true);

  const loaded = await reader.readRecord(records[0]);
  assert.equal(new TextDecoder().decode(loaded.bytes), "alpha");
  assert.equal(loaded.provenance.sha256, records[0].provenance.sha256);
});

test("rejects malformed roots, unsupported record ids, and invalid extension configuration", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "note.md"), "ok");
  await assert.rejects(createFilesystemContentReader({ root: "relative" }), /absolute/);
  await assert.rejects(createFilesystemContentReader({ root, extensions: [] }), /non-empty/);
  await assert.rejects(createFilesystemContentReader({ root, extensions: ["md"] }), /dot-prefixed/);
  const reader = await createFilesystemContentReader({ root });
  await assert.rejects(reader.readRecord("../secret.md"), /supported/);
  await assert.rejects(reader.readRecord("note.txt"), /supported/);
});

test("rejects symlinks rather than following ambiguous or escaping source paths", async (t) => {
  const root = await fixture();
  const outside = await fixture();
  t.after(() => Promise.all([rm(root, { recursive: true, force: true }), rm(outside, { recursive: true, force: true })]));
  await writeFile(join(outside, "secret.md"), "secret");
  await symlink(join(outside, "secret.md"), join(root, "linked.md"));
  const reader = await createFilesystemContentReader({ root });
  await assert.rejects(reader.listRecords(), /symbolic links/);
});

test("rejects a symbolic-link root", async (t) => {
  const parent = await fixture();
  const source = join(parent, "source");
  const linked = join(parent, "linked");
  t.after(() => rm(parent, { recursive: true, force: true }));
  await mkdir(source);
  await symlink(source, linked);
  await assert.rejects(createFilesystemContentReader({ root: linked }), /symbolic link/);
});

test("composes the canonical Markdown document reader without changing source identity", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const text = [
    "---",
    "title: Integrated note",
    "tags:",
    "  - living-web",
    "nested:",
    "  enabled: true",
    "---",
    "# Integrated note",
    "",
    "See [[another-note]] and [the web](https://example.test/).",
    "",
  ].join("\n");
  await writeFile(join(root, "note.md"), text);

  const reader = await createFilesystemContentReader({ root });
  const opaque = await reader.readRecord("note.md");
  const parsed = await reader.readMarkdownRecord("note.md");

  assert.equal(parsed.contractVersion, CONTENT_READER_CONTRACT_VERSION);
  assert.equal(parsed.provenance.sha256, opaque.provenance.sha256);
  assert.deepEqual(parsed.bytes, opaque.bytes);
  assert.equal(parsed.document.subject, "note.md");
  assert.equal(parsed.document.format, "yaml");
  assert.deepEqual(parsed.document.frontmatter, {
    title: "Integrated note",
    tags: ["living-web"],
    nested: { enabled: true },
  });
  assert.match(parsed.document.body, /^# Integrated note/u);
  assert.deepEqual(parsed.document.features.map((feature) => feature.type), ["wikilink", "markdown-link"]);
  assert.equal(parsed.document.assertions.some((entry) => entry.a === "body"), true);
  assert.equal(Object.isFrozen(parsed.document), true);
});

test("Markdown integration rejects non-Markdown records and invalid UTF-8", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "record.json"), "{}\n");
  await writeFile(join(root, "broken.md"), Buffer.from([0xc3, 0x28]));
  const reader = await createFilesystemContentReader({ root, extensions: [".json", ".md"] });

  await assert.rejects(reader.readMarkdownRecord("record.json"), /Markdown source file/);
  await assert.rejects(reader.readMarkdownRecord("broken.md"), /valid UTF-8/);
});
